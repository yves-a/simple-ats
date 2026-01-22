# Simple ATS - Applicant Tracking System

A modern ATS that compares resumes to job descriptions using AI embeddings and LLMs, plus a mock interview practice feature.

## Quick Start with Docker

### Prerequisites
- Docker & Docker Compose
- (For dev mode) [Ollama](https://ollama.com/download) installed locally

### Development Mode (Local Ollama)

```bash
# 1. Start Ollama locally
ollama serve
ollama pull qwen2.5:3b-instruct-q4_K_M

# 2. Start the stack
./run.sh dev
```

### Production Mode (Everything in Docker)

```bash
./run.sh prod
```

### Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Java API | http://localhost:8080 |
| Python AI | http://localhost:8000 |
| Interview | http://localhost:8001 |
| Nginx (prod) | http://localhost:80 |

### Docker Commands

```bash
./run.sh dev      # Start in development mode
./run.sh prod     # Start in production mode
./run.sh stop     # Stop all services
./run.sh logs     # View logs
./run.sh status   # Check service status
./run.sh clean    # Remove everything
./run.sh help     # Show all commands
```

## Features

### Resume Analyzer
- Upload your resume (PDF or TXT)
- Paste or fetch job descriptions from URLs
- Get AI-powered similarity scoring
- See matching and missing keywords
- Receive personalized improvement advice

### Mock Interview Practice
- Behavioral interview questions across 6 categories
- Voice input - speak your answers naturally
- AI evaluation using the STAR method
- Real-time feedback with scores and improvements
- Text-to-speech for interviewer questions
- Follow-up questions for deeper practice

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Java API  │────▶│  Python AI  │
│   (Next.js) │     │(Spring Boot)│     │  (FastAPI)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │            ┌─────────────┐            │
       └───────────▶│  Interview  │◀───────────┘
                    │  Service    │
                    └─────────────┘
                           │
                    ┌─────────────┐
                    │   Ollama    │
                    │    (LLM)    │
                    └─────────────┘
```

## Project Structure

```
simple-ats/
├── frontend/           # Next.js frontend
├── java-ats/           # Spring Boot API gateway
├── python-service/     # FastAPI AI service
├── interview-service/  # WebSocket interview service
├── nginx/              # Reverse proxy config
├── docker-compose.yml  # Docker configuration
└── run.sh              # Management script
```

## Local Development (Without Docker)

### Python Service
```bash
cd python-service
pip install -r requirements.txt
python main.py
```

### Java API
```bash
cd java-ats
mvn spring-boot:run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Interview Service
```bash
cd interview-service
pip install -r requirements.txt
python main.py
```

## License

MIT
