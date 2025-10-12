"""
AI-powered resume advice service using Ollama LLM
"""

import json
import logging
import os
from typing import Dict, List, Optional
import httpx
import ollama

logger = logging.getLogger(__name__)

class AdviceService:
    def __init__(self):
        # Environment-based configuration
        self.environment = os.getenv('ENVIRONMENT', 'development')  # 'development' or 'production'
        
        if self.environment == 'production':
            # Production: Use Docker Ollama service
            self.ollama_url = os.getenv('OLLAMA_URL', 'http://ollama:11434')
            self.model_name = 'qwen2.5:3b-instruct-q4_K_M'  # Qwen2.5 model in Docker
        else:
            # Development: Use local Ollama installation
            # Use environment variable first, fallback to host.docker.internal for container access to host
            self.ollama_url = os.getenv('OLLAMA_URL', 'http://host.docker.internal:11434')
            self.model_name = 'qwen2.5:3b-instruct-q4_K_M'  # Qwen2.5 model locally
            
        self.client = None
        logger.info(f"Initializing AdviceService for {self.environment} environment")
        logger.info(f"Ollama URL: {self.ollama_url}, Model: {self.model_name}")
        
    async def initialize_model(self):
        """Initialize Ollama client and ensure model is available"""
        try:
            # Check if Ollama is available
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.ollama_url}/api/tags")
                if response.status_code != 200:
                    raise Exception(f"Ollama not available: {response.status_code}")
            
            # Initialize Ollama client
            self.client = ollama.AsyncClient(host=self.ollama_url)
            
            # Check if model exists, if not pull it
            try:
                await self.client.show(self.model_name)
                logger.info(f"Model {self.model_name} already available")
            except:
                logger.info(f"Pulling model {self.model_name}...")
                await self.client.pull(self.model_name)
                logger.info(f"Model {self.model_name} pulled successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize Ollama model: {e}")
            self.client = None

    def _create_advice_prompt(self, resume_text: str, job_description: str, 
                            similarity_score: float, shared_keywords: List[str], 
                            missing_keywords: List[str]) -> str:
        """Create structured prompt for LLM advice generation"""
        
        prompt = f"""You are an expert ATS (Applicant Tracking System) resume consultant helping candidates optimize their resumes for specific job postings.

**Resume Analysis:**
- Match Score: {similarity_score:.1%}
- Missing Keywords: {', '.join(missing_keywords[:8]) if missing_keywords else 'None'}
- Shared Keywords: {', '.join(shared_keywords[:8]) if shared_keywords else 'None'}

**Your Task:**
Provide actionable, specific resume advice in JSON format. Focus on concrete improvements that will increase the ATS match score.

**Requirements:**
1. Respond with ONLY valid JSON (no additional text before or after)
2. Use this exact structure:

{{
  "skills_to_add": ["skill1", "skill2", "skill3"],
  "skills_to_emphasize": ["existing_skill1", "existing_skill2"],
  "resume_structure": ["tip1", "tip2", "tip3"],
  "content_optimization": ["tip1", "tip2", "tip3"],
  "keyword_strategy": "One clear paragraph explaining how to naturally integrate missing keywords",
  "overall_priority": ["top_priority1", "top_priority2", "top_priority3"]
}}

**Guidelines:**
- skills_to_add: Select 3-5 most critical missing keywords/skills from the job description
- skills_to_emphasize: Identify 2-4 existing skills that match the job and should be highlighted more prominently
- resume_structure: Provide 2-4 specific formatting/organization tips for ATS optimization
- content_optimization: Give 2-4 specific tips for improving bullet points and descriptions
- keyword_strategy: Write one clear, actionable paragraph (2-3 sentences) explaining how to naturally incorporate missing keywords
- overall_priority: List 2-4 most important actions to take immediately, ordered by impact

Respond with valid JSON only."""

        return prompt

    async def generate_advice(self, resume_text: str, job_description: str,
                            similarity_score: float, shared_keywords: List[str],
                            missing_keywords: List[str]) -> Optional[Dict]:
        """Generate AI-powered resume advice"""
        
        if not self.client:
            logger.error("Ollama client not initialized")
            return self._fallback_advice(missing_keywords, shared_keywords)
            
        try:
            prompt = self._create_advice_prompt(
                resume_text, job_description, similarity_score, 
                shared_keywords, missing_keywords
            )
            
            logger.info("Generating AI advice with Ollama...")
            
            response = await self.client.generate(
                model=self.model_name,
                prompt=prompt,
                options={
                    'temperature': 0.7,
                    'num_predict': 1000,  # Increased for more complete responses
                    'top_p': 0.9,
                    'top_k': 40,
                    'repeat_penalty': 1.1
                },
                format='json'  # Request JSON format from Ollama
            )
            
            advice_text = response['response'].strip()
            logger.info(f"Generated advice length: {len(advice_text)} chars")
            logger.debug(f"Raw response: {advice_text[:500]}...")
            
            # Parse JSON response
            try:
                # Try direct JSON parse first
                advice_data = json.loads(advice_text)
                
                # Validate required fields
                required_fields = [
                    'skills_to_add', 'skills_to_emphasize', 'resume_structure',
                    'content_optimization', 'keyword_strategy', 'overall_priority'
                ]
                
                if all(field in advice_data for field in required_fields):
                    logger.info("Successfully generated structured advice")
                    return advice_data
                else:
                    missing = [f for f in required_fields if f not in advice_data]
                    logger.warning(f"LLM response missing fields: {missing}")
                    return self._fallback_advice(missing_keywords, shared_keywords)
                    
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse LLM JSON response: {e}")
                
                # Try to extract JSON from response
                try:
                    start = advice_text.find('{')
                    end = advice_text.rfind('}') + 1
                    if start >= 0 and end > start:
                        json_str = advice_text[start:end]
                        advice_data = json.loads(json_str)
                        logger.info("Successfully extracted JSON from response")
                        return advice_data
                except:
                    pass
                
                logger.warning("Falling back to default advice")
                return self._fallback_advice(missing_keywords, shared_keywords)
                
        except Exception as e:
            logger.error(f"LLM failed to generate advice: {e}", exc_info=True)
            logger.info("Returning fallback advice")
            return self._fallback_advice(missing_keywords, shared_keywords)

    def _fallback_advice(self, missing_keywords: List[str], 
                        shared_keywords: List[str]) -> Dict:
        """Provide fallback advice when LLM is unavailable"""
        
        skills_to_add = missing_keywords[:5] if missing_keywords else ["Review job requirements carefully"]
        skills_to_emphasize = shared_keywords[:5] if shared_keywords else ["Highlight your relevant experience"]
        
        return {
            "skills_to_add": skills_to_add,
            "skills_to_emphasize": skills_to_emphasize,
            "resume_structure": [
                "Use clear section headers: Summary, Experience, Skills, Education",
                "Use bullet points with strong action verbs (developed, implemented, led)",
                "Keep formatting simple and ATS-friendly (avoid tables, text boxes, headers/footers)",
                "Include a dedicated 'Technical Skills' or 'Core Competencies' section"
            ],
            "content_optimization": [
                "Quantify achievements with specific metrics and results (e.g., 'Increased efficiency by 30%')",
                "Tailor experience descriptions to match job requirements and use similar language",
                "Use industry-standard terminology and avoid uncommon abbreviations",
                "Start each bullet point with a strong action verb in past tense"
            ],
            "keyword_strategy": "Naturally integrate the missing keywords throughout your resume, especially in your skills section and experience descriptions. Focus on incorporating them in context rather than simply listing them. Use variations of the keywords where appropriate to demonstrate comprehensive understanding.",
            "overall_priority": [
                "Add the top 3-5 missing technical skills to your resume if you have them",
                "Quantify your achievements with specific numbers, percentages, or outcomes",
                "Tailor your professional summary to highlight experience relevant to this role",
                "Ensure your skills section prominently features keywords from the job description"
            ]
        }

    async def health_check(self) -> bool:
        """Check if Ollama service is healthy"""
        try:
            if not self.client:
                return False
            await self.client.list()
            return True
        except:
            return False