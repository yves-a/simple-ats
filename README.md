# Simple Java ATS with AI Connection

A simple Applicant Tracking System (ATS) that compares resumes to job descriptions using AI embeddings.

## ATS Project Startup Guide

This project supports both local development and production deployment using Docker Compose. The Python AI service can connect to Ollama either running locally (for development) or as a container (for production).

### Local Development (uses local Ollama)

1. **Start Ollama locally**
   - Install Ollama: https://ollama.com/download
   - Start Ollama: `ollama serve`
  - Pull the required model: `ollama pull qwen2.5:3b-instruct-q4_K_M`

2. **Start the stack in development mode**
   - Run:
     ```bash
     ./start-dev.sh
     # or
     ./start.sh dev
     ```
   - This will:
     - Use your local Ollama at `localhost:11434`
     - Start only the Python, Java, and frontend services (no Ollama container)
     - Set up the Python service to connect to your local Ollama

3. **Access the services**
   - Python API: http://localhost:8000
   - Java API: http://localhost:8080
   - Frontend: http://localhost:3000

### Production Deployment (uses Docker Ollama)

1. **Start the stack in production mode**
   - Run:
     ```bash
     ./start.sh prod
     # or
     docker-compose up --build
     ```
   - This will:
     - Start all services, including Ollama as a container
     - Python service connects to Ollama at `http://ollama:11434`
     - All services are isolated in Docker network

2. **Access the services**
   - Python API: http://localhost:8000
   - Java API: http://localhost:8080
   - Frontend: http://localhost:3000
   - (Optional) Nginx reverse proxy: http://localhost

### Key Differences: Local vs Production

| Feature         | Development (Local Ollama)         | Production (Docker Ollama)         |
|-----------------|-------------------------------------|------------------------------------|
| Ollama Model    | Runs on host (localhost:11434)      | Runs in Docker container           |
| Startup Script  | `./start-dev.sh` or `./start.sh dev`| `./start.sh prod` or `docker-compose up` |
| Python Service  | Connects to host Ollama             | Connects to container Ollama       |
| Docker Compose  | Skips Ollama container              | Includes Ollama container          |
| Hot Reload      | Easier for local Python/JS changes  | Standard Docker workflow           |
| Nginx           | Optional, for production only       | Used for HTTPS/SSL, reverse proxy  |

### Troubleshooting
- If using development mode, make sure Ollama is running locally before starting the stack.
- For production, all dependencies are managed in Docker.
- If you see connection errors to Ollama, check the environment variable `OLLAMA_URL` in the Python service.

## Project Structure

```
simple-ats/
├── java-ats/                  # Java backend application
│   ├── src/main/java/com/ats/
│   │   ├── ATSApplication.java        # Main application
│   │   ├── model/
│   │   │   ├── SimilarityRequest.java # Request model
│   │   │   └── SimilarityResult.java  # Response model
│   │   └── service/
│   │       ├── DocumentProcessor.java # Document text extraction
│   │       └── SimilarityService.java # HTTP client for Python service
│   └── pom.xml                        # Maven configuration
└── python-service/            # Python FastAPI microservice
    ├── main.py               # FastAPI application
    └── requirements.txt      # Python dependencies
```

## Features

- **Document Processing**: Extract text from PDF and DOCX files using Apache Tika
- **AI-Powered Similarity**: Calculate semantic similarity using sentence transformers
- **Keyword Analysis**: Highlight shared and missing keywords between resume and job
- **RESTful Communication**: Java HTTP client communicates with Python FastAPI service
- **Command Line Interface**: Simple CLI for easy testing

## Prerequisites

- **Java 11+** (with Maven)
- **Python 3.8+** (with pip)
- Internet connection (for downloading AI models on first run)

## Quick Start

### 1. Start Python Service

```bash
cd python-service
pip3 install -r requirements.txt
python3 main.py
```

The service will start on `http://localhost:8000`

### 2. Run Java Application

```bash
cd java-ats
mvn compile exec:java
```

### 3. Test the Application

When prompted, provide:
- **Resume file path**: Path to a PDF or DOCX file
- **Job description**: Text describing the job requirements

## Example Usage

```bash
# Option 1: Interactive mode
mvn compile exec:java

# Option 2: Command line with resume file and job description text
mvn compile exec:java -Dexec.args="resume.pdf 'Software Engineer with Java and Python experience'"

# Option 3: Command line with both resume and job description files
mvn compile exec:java -Dexec.args="sample-resume-detailed.txt sample-job-description.txt"

# Option 4: Mixed - resume file with job text
mvn compile exec:java -Dexec.args="resume.pdf job-description.txt"
```

### Supported File Types

**Resume Files:**
- PDF (`.pdf`) - Portable Document Format
- Word Documents (`.docx`, `.doc`) - Microsoft Word
- Plain Text (`.txt`) - Simple text files
- Rich Text (`.rtf`) - Rich Text Format
- OpenDocument (`.odt`) - OpenOffice/LibreOffice

**Job Description:**
- **Text input**: Direct text string in quotes
- **File input**: Text file ending with `.txt`

## Sample Output

```
=== Simple ATS - Resume Job Matcher ===
Enter resume file path (PDF/DOCX): /path/to/resume.pdf
Enter job description: Senior Java Developer with Spring Boot experience

Processing resume...
✓ Resume text extracted (2847 characters)
Calculating similarity...

=== RESULTS ===
Resume vs Job Match: 0.82 (82%)

Shared Keywords:
  ✓ java
  ✓ spring
  ✓ developer
  ✓ experience
  ✓ software

Missing Keywords:
  ✗ boot
  ✗ senior
  ✗ framework

Processing completed successfully!
```

## API Documentation

### Python Service Endpoints

- **POST /similarity**: Calculate similarity between texts
- **GET /health**: Health check
- **GET /**: Service information

### Request Format

```json
{
  "resume_text": "Software engineer with 5 years experience...",
  "job_description": "Looking for Java developer with Spring Boot..."
}
```

### Response Format

```json
{
  "similarity_score": 0.82,
  "shared_keywords": ["java", "spring", "developer"],
  "missing_keywords": ["boot", "senior", "framework"]
}
```

## Technology Stack

### Java Backend
- **Java 11+**: Core language
- **Apache Tika**: Document text extraction
- **Jackson**: JSON processing
- **java.net.http**: HTTP client (Java 11+)
- **Maven**: Build tool

### Python Service
- **FastAPI**: Web framework
- **sentence-transformers**: AI embeddings (all-MiniLM-L6-v2)
- **scikit-learn**: Cosine similarity calculation
- **NLTK**: Natural language processing
- **Uvicorn**: ASGI server

## Troubleshooting

### Common Issues

1. **"Python service is not running"**
   - Make sure Python service is started first
   - Check that port 8000 is available

2. **"File not found" error**
   - Verify the resume file path is correct
   - Ensure the file is readable

3. **Model download slow on first run**
   - The sentence transformer model (~90MB) downloads on first use
   - Subsequent runs will be faster

### Development Notes

- The Java application uses Java 11+ HttpClient for REST calls
- The Python service automatically downloads required NLTK data
- Similarity scores range from 0.0 (no similarity) to 1.0 (identical)
- Keywords are extracted using NLTK tokenization and lemmatization

## License

This is a simple demonstration project. Use at your own discretion.