from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
import re
from typing import List, Set, Dict, Optional
import logging
from contextlib import asynccontextmanager
from advice_service import AdviceService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration class for better organization
class Config:
    CORS_ORIGINS = ["http://localhost:3000", "http://localhost:3001"]
    MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
    MAX_SHARED_KEYWORDS = 15
    MAX_MISSING_KEYWORDS = 12
    MIN_KEYWORD_LENGTH = 3

# Global instances (will be initialized in lifespan)
class AppState:
    model: Optional[SentenceTransformer] = None
    lemmatizer: Optional[WordNetLemmatizer] = None
    stop_words: Optional[Set[str]] = None
    advice_service: Optional[AdviceService] = None
    tech_skills: Set[str] = set()
    business_skills: Set[str] = set()
    generic_words: Set[str] = set()

state = AppState()

# Lifespan context manager (modern replacement for startup/shutdown events)
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup resources"""
    logger.info("Starting ATS Similarity Service...")
    
    # Startup
    initialize_skill_sets()
    initialize_nltk()
    load_model()
    
    state.advice_service = AdviceService()
    await state.advice_service.initialize_model()
    
    logger.info("Service initialized successfully")
    
    yield
    
    # Shutdown (if needed)
    logger.info("Shutting down service...")

app = FastAPI(
    title="ATS Similarity Service",
    version="1.0.0",
    description="Analyze resume-job description similarity using NLP",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def initialize_skill_sets():
    """Initialize skill sets once at startup"""
    state.tech_skills = {
        # Programming Languages
        'java', 'python', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust', 'swift', 'kotlin',
        'scala', 'ruby', 'php', 'perl', 'r', 'matlab', 'sql', 'html', 'css', 'bash', 'powershell',
        
        # Frameworks & Libraries
        'react', 'angular', 'vue', 'nodejs', 'express', 'django', 'flask', 'fastapi', 'spring',
        'springboot', 'hibernate', 'laravel', 'rails', 'tensorflow', 'pytorch', 'keras', 
        'scikit-learn', 'pandas', 'numpy', 'matplotlib', 'jquery', 'bootstrap', 'tailwind',
        'nextjs', 'vuejs', 'reactjs', 'angularjs',
        
        # Databases
        'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb',
        'oracle', 'sqlite', 'mariadb', 'neo4j', 'influxdb', 'couchdb', 'firestore',
        
        # Cloud & DevOps
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'github', 
        'terraform', 'ansible', 'chef', 'puppet', 'vagrant', 'helm', 'istio', 
        'prometheus', 'grafana', 'circleci', 'travis',
        
        # Tools & Technologies
        'git', 'svn', 'jira', 'confluence', 'slack', 'postman', 'swagger', 'api',
        'rest', 'graphql', 'soap', 'json', 'xml', 'yaml', 'nginx', 'apache', 'tomcat',
        'webpack', 'vite', 'babel', 'eslint',
        
        # Methodologies & Concepts
        'agile', 'scrum', 'kanban', 'devops', 'cicd', 'tdd', 'bdd', 'microservices',
        'algorithms', 'blockchain', 'cybersecurity', 'authentication', 'authorization',
        'oauth', 'jwt', 'saml', 'encryption'
    }
    
    state.business_skills = {
        'leadership', 'stakeholder', 'debugging', 'optimization', 
        'performance', 'scalability', 'security', 'compliance', 'architecture'
    }
    
    state.generic_words = {
        'ability', 'additional', 'add', 'adding', 'address', 'addressing', 'age',
        'application', 'approach', 'area', 'base', 'based', 'build', 'building', 
        'business', 'case', 'company', 'complete', 'component', 'content', 
        'create', 'creating', 'current', 'data', 'day', 'development', 'different',
        'effort', 'enable', 'enabled', 'enabling', 'end', 'ensure', 'environment',
        'example', 'experience', 'following', 'focus', 'focused', 'focusing',
        'functional', 'general', 'good', 'great', 'help', 'high', 'implement',
        'important', 'include', 'including', 'information', 'integration', 'large',
        'law', 'level', 'line', 'make', 'making', 'new', 'number', 'opportunity',
        'organization', 'part', 'place', 'platform', 'process', 'product', 'program',
        'project', 'provide', 'providing', 'quality', 'related', 'required',
        'requirements', 'responsible', 'role', 'service', 'services', 'set',
        'solution', 'solutions', 'strong', 'support', 'supporting', 'system',
        'systems', 'team', 'teams', 'technical', 'technology', 'time', 'tool',
        'tools', 'type', 'understanding', 'use', 'using', 'value', 'various',
        'way', 'well', 'work', 'working', 'world', 'year', 'years',
        'looking', 'seeking', 'candidate', 'position', 'location', 'salary',
        'benefits', 'insurance', 'health', 'dental', 'vision', 'policy',
        'description', 'responsibilities', 'skills', 'preferred', 'minimum',
        'maximum', 'overview', 'summary', 'duties', 'tasks', 'activities',
        'successful', 'ideal', 'excellent', 'proven', 'demonstrated', 'knowledge',
        'proficiency', 'deliver', 'delivering', 'drive', 'driving', 'lead',
        'leading', 'develop', 'developing', 'maintain', 'maintaining', 'coordinate',
        'execute', 'perform', 'conduct', 'establish', 'identify', 'evaluate',
        'define', 'determine', 'assess', 'review', 'monitor', 'track', 'report',
        'document', 'participate', 'contribute', 'improve', 'enhance', 'streamline',
        'deploy', 'operate', 'administer', 'facilitate', 'organize', 'prepare',
        'present', 'train', 'mentor', 'guide', 'assist', 'manage', 'managing'
    }

def initialize_nltk():
    """Initialize NLTK resources with better error handling"""
    required_packages = [
        'punkt',
        'punkt_tab',  # Required for newer NLTK versions
        'stopwords',
        'wordnet',
        'omw-1.4'
    ]
    
    try:
        for package in required_packages:
            try:
                logger.info(f"Downloading {package}...")
                nltk.download(package, quiet=True)
            except Exception as e:
                logger.warning(f"Could not download {package}: {e}")
        
        state.lemmatizer = WordNetLemmatizer()
        state.stop_words = set(stopwords.words('english'))
        logger.info("NLTK initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize NLTK: {e}")
        # Fallback to basic stop words and no lemmatizer
        state.lemmatizer = None
        state.stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 
            'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 
            'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
            'this', 'that', 'these', 'those', 'it', 'its', 'they', 'their',
            'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must'
        }

def load_model():
    """Load the sentence transformer model with error handling"""
    try:
        state.model = SentenceTransformer(Config.MODEL_NAME)
        logger.info(f"Model '{Config.MODEL_NAME}' loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise RuntimeError(f"Could not load model: {e}")

# Request/Response Models with better validation
class SimilarityRequest(BaseModel):
    resume_text: str = Field(..., min_length=10, description="Resume text content")
    job_description: str = Field(..., min_length=10, description="Job description content")

class SimilarityResponse(BaseModel):
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    shared_keywords: List[str]
    missing_keywords: List[str]

class AdviceRequest(BaseModel):
    resume_text: str
    job_description: str
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    shared_keywords: List[str]
    missing_keywords: List[str]

class AdviceResponse(BaseModel):
    advice: Optional[Dict]
    llm_available: bool

@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    llm_healthy = await state.advice_service.health_check() if state.advice_service else False
    
    return {
        "status": "healthy",
        "model_loaded": state.model is not None,
        "nltk_initialized": state.lemmatizer is not None,
        "llm_available": llm_healthy,
        "version": "1.0.0"
    }

def is_pure_number(word: str) -> bool:
    """Check if a word is a pure number or number-like pattern"""
    patterns = [
        r'^[\d,\.\$€£¥%]+$',  # Pure numbers with formatting
        r'^\d+[kKmMbB]$',      # Salary abbreviations
        r'^\d+[-/]\d+$',       # Date ranges
        r'^\d{4}$',            # Years
        r'^\d+$'               # Any pure number
    ]
    return word.isdigit() or any(re.match(pattern, word) for pattern in patterns)

def has_technical_pattern(word: str) -> bool:
    """Check if word has clear technical indicators"""
    if len(word) < 3 or not re.search(r'[a-zA-Z]', word):
        return False
    
    # Special characters that indicate tech terms
    if re.match(r'.*[+#].*', word):
        return True
    
    # Framework patterns
    if word.endswith(('js', 'sql', 'db', 'py', 'rb', 'go', 'rs', 'ts')):
        return True
    
    # API related
    if word.startswith('api'):
        return True
    
    # Version numbers with known tech (python3, vue2)
    if re.match(r'^[a-zA-Z]+\d+$', word):
        letter_part = re.match(r'^([a-zA-Z]+)\d+$', word).group(1)
        if letter_part in state.tech_skills:
            return True
    
    # Acronyms (not roman numerals)
    if len(word) >= 3 and word.isupper() and not re.match(r'^[IVXLCDM]+$', word):
        return True
    
    return False

def extract_skills_and_keywords(text: str) -> Set[str]:
    """Extract skills, technologies, and relevant professional keywords from text"""
    
    if not text or not text.strip():
        return set()
    
    try:
        # Clean and normalize text
        text = re.sub(r'[^\w\s+#.-]', ' ', text.lower())
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Extract multi-word technical terms
        multi_word_terms = set()
        tech_phrases = [
            'machine learning', 'artificial intelligence', 'data science', 
            'software engineering', 'web development', 'mobile development',
            'full stack', 'front end', 'back end', 'database design',
            'system design', 'network security', 'cloud computing',
            'project management', 'product management', 'quality assurance',
            'user experience', 'user interface', 'business intelligence',
            'data analytics', 'software architecture', 'design patterns',
            'data structures', 'computer science', 'information technology'
        ]
        
        for phrase in tech_phrases:
            if phrase in text:
                multi_word_terms.add(phrase.replace(' ', '_'))
        
        # Tokenize
        if state.lemmatizer:
            try:
                tokens = word_tokenize(text)
                single_words = set()
                for token in tokens:
                    if (len(token) > Config.MIN_KEYWORD_LENGTH and 
                        re.search(r'[a-zA-Z]', token) and 
                        not is_pure_number(token)):
                        lemmatized = state.lemmatizer.lemmatize(token.lower())
                        if lemmatized not in state.stop_words:
                            single_words.add(lemmatized)
            except Exception as e:
                logger.warning(f"Tokenization failed, falling back to regex: {e}")
                # Fallback to regex tokenization
                words = re.findall(r'\b[a-zA-Z0-9+#.-]+\b', text.lower())
                single_words = {
                    word for word in words 
                    if len(word) > Config.MIN_KEYWORD_LENGTH 
                    and re.search(r'[a-zA-Z]', word) 
                    and not is_pure_number(word)
                    and word not in state.stop_words
                }
        else:
            words = re.findall(r'\b[a-zA-Z0-9+#.-]+\b', text.lower())
            single_words = {
                word for word in words 
                if len(word) > Config.MIN_KEYWORD_LENGTH 
                and re.search(r'[a-zA-Z]', word) 
                and not is_pure_number(word)
                and word not in state.stop_words
            }
        
        # Collect relevant keywords
        relevant_keywords = set()
        
        # Add words from curated skill sets
        for word in single_words:
            word_clean = word.replace('.', '').replace('-', '').replace('+', '').replace('#', '')
            
            if (word in state.tech_skills or word_clean in state.tech_skills or
                word in state.business_skills or word_clean in state.business_skills):
                relevant_keywords.add(word)
        
        # Add words with clear technical patterns
        for word in single_words:
            if (word not in relevant_keywords and 
                word not in state.generic_words and 
                word not in state.stop_words and
                has_technical_pattern(word)):
                relevant_keywords.add(word)
        
        # Final filtering
        relevant_keywords = relevant_keywords - state.generic_words - state.stop_words
        
        # Add multi-word terms
        relevant_keywords.update(multi_word_terms)
        
        return relevant_keywords
        
    except Exception as e:
        logger.error(f"Error extracting keywords: {e}", exc_info=True)
        return set()

def is_technical_skill(keyword: str) -> bool:
    """Determine if a keyword is a technical skill for sorting"""
    tech_indicators = [
        'java', 'python', 'javascript', 'react', 'aws', 'docker',
        'kubernetes', 'sql', 'api', 'framework', 'database'
    ]
    
    return (any(tech in keyword.lower() for tech in tech_indicators) or
            re.match(r'.*[0-9+#].*', keyword) or
            keyword.endswith(('js', 'sql', 'db')) or
            (len(keyword) >= 3 and keyword.isupper()))

@app.post("/similarity", response_model=SimilarityResponse)
async def calculate_similarity(request: SimilarityRequest):
    """Calculate similarity between resume and job description"""
    
    if not state.model:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        resume_text = request.resume_text.strip()
        job_text = request.job_description.strip()
        
        logger.info(f"Processing similarity - Resume: {len(resume_text)} chars, Job: {len(job_text)} chars")
        
        # Generate embeddings
        embeddings = state.model.encode([resume_text, job_text])
        
        # Calculate cosine similarity
        similarity_score = float(cosine_similarity([embeddings[0]], [embeddings[1]])[0][0])
        
        # Extract keywords
        resume_keywords = extract_skills_and_keywords(resume_text)
        job_keywords = extract_skills_and_keywords(job_text)
        
        # Find shared and missing keywords
        shared = list(resume_keywords.intersection(job_keywords))
        missing = list(job_keywords - resume_keywords)
        
        # Sort by technical relevance
        shared.sort(key=lambda x: (not is_technical_skill(x), x.lower()))
        missing.sort(key=lambda x: (not is_technical_skill(x), x.lower()))
        
        # Limit results
        shared_keywords = shared[:Config.MAX_SHARED_KEYWORDS]
        missing_keywords = missing[:Config.MAX_MISSING_KEYWORDS]
        
        logger.info(f"Similarity: {similarity_score:.4f}, Shared: {len(shared_keywords)}, Missing: {len(missing_keywords)}")
        
        return SimilarityResponse(
            similarity_score=similarity_score,
            shared_keywords=shared_keywords,
            missing_keywords=missing_keywords,
            metadata={
                "total_resume_keywords": len(resume_keywords),
                "total_job_keywords": len(job_keywords),
                "match_percentage": round(len(shared) / len(job_keywords) * 100, 2) if job_keywords else 0
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating similarity: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/advice", response_model=AdviceResponse)
async def get_resume_advice(request: AdviceRequest):
    """Generate AI-powered resume advice based on similarity analysis"""
    
    if not state.advice_service:
        logger.warning("Advice service not initialized")
        return AdviceResponse(advice=None, llm_available=False)
    
    try:
        logger.info("Generating resume advice...")
        
        advice_data = await state.advice_service.generate_advice(
            resume_text=request.resume_text,
            job_description=request.job_description,
            similarity_score=request.similarity_score,
            shared_keywords=request.shared_keywords,
            missing_keywords=request.missing_keywords
        )
        
        llm_available = await state.advice_service.health_check()
        
        return AdviceResponse(advice=advice_data, llm_available=llm_available)
        
    except Exception as e:
        logger.error(f"Error generating advice: {e}", exc_info=True)
        
        fallback_advice = (state.advice_service._fallback_advice(
            request.missing_keywords, request.shared_keywords
        ) if state.advice_service else None)
        
        return AdviceResponse(advice=fallback_advice, llm_available=False)

@app.get("/")
async def root():
    """Root endpoint with service info"""
    return {
        "service": "ATS Similarity Service",
        "version": "1.0.0",
        "model": Config.MODEL_NAME,
        "endpoints": {
            "GET /": "Service information",
            "GET /health": "Health check",
            "POST /similarity": "Calculate resume-job similarity",
            "POST /advice": "Get AI-powered resume advice"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info"
    )