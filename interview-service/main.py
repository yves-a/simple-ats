"""
Behavioral Interview Service with WebSocket streaming
Fast, real-time mock interviews powered by Ollama
"""

import asyncio
import json
import logging
import os
import random
from typing import List, Dict, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import ollama

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Interview Service", version="2.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Behavioral interview questions by category
BEHAVIORAL_QUESTIONS = {
    "leadership": [
        "Tell me about a time when you had to lead a team through a difficult project.",
        "Describe a situation where you had to motivate a struggling team member.",
        "Give me an example of when you took initiative without being asked.",
    ],
    "problem_solving": [
        "Describe a complex problem you solved at work. Walk me through your approach.",
        "Tell me about a time when you had to make a decision with incomplete information.",
        "Give an example of when you identified a problem before it became urgent.",
    ],
    "teamwork": [
        "Tell me about a time you had a conflict with a coworker. How did you handle it?",
        "Describe a situation where you had to work with someone difficult.",
        "Give an example of a successful team project and your contribution to it.",
    ],
    "adaptability": [
        "Tell me about a time when you had to adapt to a major change at work.",
        "Describe a situation where you failed. What did you learn from it?",
        "Give an example of when you had to learn something new quickly.",
    ],
    "communication": [
        "Tell me about a time you had to explain something complex to a non-technical person.",
        "Describe a situation where miscommunication caused a problem. How did you fix it?",
        "Give an example of when you had to deliver difficult feedback.",
    ],
    "pressure": [
        "Tell me about a time you worked under a tight deadline.",
        "Describe a high-pressure situation and how you managed it.",
        "Give an example of when you had to handle multiple priorities at once.",
    ],
}


class InterviewService:
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.ollama_url = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434")
        self.model_name = "qwen2.5:3b-instruct-q4_K_M"
        self.client: Optional[ollama.AsyncClient] = None
        logger.info(
            f"Interview Service: {self.environment} mode, Ollama: {self.ollama_url}"
        )

    async def initialize(self):
        """Initialize Ollama connection"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.ollama_url}/api/tags")
                if response.status_code != 200:
                    raise Exception(f"Ollama not available: {response.status_code}")

            self.client = ollama.AsyncClient(host=self.ollama_url)
            logger.info("Ollama client initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Ollama: {e}")
            return False

    def get_random_question(self, category: Optional[str] = None) -> Dict[str, str]:
        """Get a random behavioral question"""
        if category and category in BEHAVIORAL_QUESTIONS:
            questions = BEHAVIORAL_QUESTIONS[category]
        else:
            category = random.choice(list(BEHAVIORAL_QUESTIONS.keys()))
            questions = BEHAVIORAL_QUESTIONS[category]

        return {"category": category, "question": random.choice(questions)}

    def get_all_categories(self) -> List[str]:
        """Get all available question categories"""
        return list(BEHAVIORAL_QUESTIONS.keys())

    async def evaluate_answer_stream(
        self, question: str, answer: str, websocket: WebSocket
    ):
        """Stream evaluation of interview answer using STAR method"""
        if not self.client:
            await websocket.send_json(
                {"type": "error", "message": "AI service not available"}
            )
            return

        prompt = f"""You are an expert behavioral interview coach. Evaluate this interview response using the STAR method.

**Question Asked:** {question}

**Candidate's Answer:** {answer}

**Your Task:** Provide constructive feedback in this EXACT JSON format:

{{
  "star_analysis": {{
    "situation": {{ "present": true/false, "feedback": "brief feedback" }},
    "task": {{ "present": true/false, "feedback": "brief feedback" }},
    "action": {{ "present": true/false, "feedback": "brief feedback" }},
    "result": {{ "present": true/false, "feedback": "brief feedback" }}
  }},
  "score": 1-10,
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "improved_answer_snippet": "A brief example of how to improve one part of their answer"
}}

Be encouraging but honest. Focus on actionable improvements. Respond with ONLY valid JSON."""

        try:
            # Stream the response for faster perceived performance
            full_response = ""
            async for chunk in await self.client.generate(
                model=self.model_name,
                prompt=prompt,
                options={
                    "temperature": 0.7,
                    "num_predict": 800,
                },
                stream=True,
            ):
                if "response" in chunk:
                    full_response += chunk["response"]
                    # Send progress updates
                    await websocket.send_json(
                        {
                            "type": "evaluation_progress",
                            "partial": (
                                full_response[-50:]
                                if len(full_response) > 50
                                else full_response
                            ),
                        }
                    )

            # Parse the complete response
            try:
                # Find JSON in response
                start = full_response.find("{")
                end = full_response.rfind("}") + 1
                if start >= 0 and end > start:
                    json_str = full_response[start:end]
                    evaluation = json.loads(json_str)
                    await websocket.send_json(
                        {"type": "evaluation_complete", "data": evaluation}
                    )
                else:
                    raise ValueError("No JSON found")
            except (json.JSONDecodeError, ValueError):
                # Fallback evaluation
                await websocket.send_json(
                    {
                        "type": "evaluation_complete",
                        "data": self._fallback_evaluation(answer),
                    }
                )

        except Exception as e:
            logger.error(f"Evaluation error: {e}")
            await websocket.send_json({"type": "error", "message": str(e)})

    def _fallback_evaluation(self, answer: str) -> Dict:
        """Provide basic feedback when AI is unavailable"""
        word_count = len(answer.split())
        has_details = word_count > 50

        return {
            "star_analysis": {
                "situation": {
                    "present": has_details,
                    "feedback": "Consider adding more context about the situation.",
                },
                "task": {
                    "present": has_details,
                    "feedback": "Clarify your specific responsibility.",
                },
                "action": {
                    "present": True,
                    "feedback": "Good - you described actions taken.",
                },
                "result": {
                    "present": word_count > 100,
                    "feedback": "Include measurable outcomes if possible.",
                },
            },
            "score": 5 + min(word_count // 30, 3),
            "strengths": [
                "You provided a response",
                "Shows engagement with the question",
            ],
            "improvements": [
                "Add more specific details",
                "Include quantifiable results",
            ],
            "improved_answer_snippet": "Consider starting with: 'In my role as [position], I faced [specific situation]...'",
        }

    async def generate_followup_stream(
        self, question: str, answer: str, websocket: WebSocket
    ):
        """Generate a follow-up question based on the answer"""
        if not self.client:
            await websocket.send_json(
                {
                    "type": "followup",
                    "question": "Can you tell me more about the specific results you achieved?",
                }
            )
            return

        prompt = f"""You are conducting a behavioral interview. Based on this exchange, generate ONE brief follow-up question.

Original Question: {question}
Candidate's Answer: {answer}

Generate a natural follow-up question that:
1. Digs deeper into a specific part of their answer
2. Asks for more details or clarification
3. Is concise (under 20 words)

Respond with ONLY the follow-up question, nothing else."""

        try:
            response = await self.client.generate(
                model=self.model_name,
                prompt=prompt,
                options={"temperature": 0.8, "num_predict": 50},
            )

            followup = response["response"].strip().strip('"')
            await websocket.send_json({"type": "followup", "question": followup})
        except Exception as e:
            logger.error(f"Follow-up generation error: {e}")
            await websocket.send_json(
                {
                    "type": "followup",
                    "question": "Can you elaborate on the specific impact of your actions?",
                }
            )


# Global service instance
interview_service = InterviewService()


@app.on_event("startup")
async def startup():
    await interview_service.initialize()


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "interview"}


@app.get("/categories")
async def get_categories():
    """Get all question categories"""
    return {"categories": interview_service.get_all_categories()}


@app.get("/question")
async def get_question(category: Optional[str] = None):
    """Get a random interview question"""
    return interview_service.get_random_question(category)


@app.get("/questions/{category}")
async def get_category_questions(category: str):
    """Get all questions for a category"""
    if category not in BEHAVIORAL_QUESTIONS:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"category": category, "questions": BEHAVIORAL_QUESTIONS[category]}


@app.websocket("/ws/interview")
async def interview_websocket(websocket: WebSocket):
    """WebSocket endpoint for real-time interview interaction"""
    await websocket.accept()
    logger.info("Interview WebSocket connected")

    current_question = None

    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")

            if message_type == "get_question":
                # Get a new question
                category = data.get("category")
                q = interview_service.get_random_question(category)
                current_question = q["question"]
                await websocket.send_json(
                    {
                        "type": "question",
                        "category": q["category"],
                        "question": current_question,
                    }
                )

            elif message_type == "submit_answer":
                # Evaluate the answer
                answer = data.get("answer", "")
                question = data.get("question") or current_question

                if not answer.strip():
                    await websocket.send_json(
                        {"type": "error", "message": "Please provide an answer"}
                    )
                    continue

                if not question:
                    await websocket.send_json(
                        {"type": "error", "message": "No question context available"}
                    )
                    continue

                # Send acknowledgment
                await websocket.send_json(
                    {"type": "evaluating", "message": "Analyzing your response..."}
                )

                # Stream evaluation
                await interview_service.evaluate_answer_stream(
                    question, answer, websocket
                )

            elif message_type == "get_followup":
                # Generate follow-up question
                answer = data.get("answer", "")
                question = data.get("question") or current_question

                if question and answer:
                    await interview_service.generate_followup_stream(
                        question, answer, websocket
                    )

            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        logger.info("Interview WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
