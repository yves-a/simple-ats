#!/bin/bash

# ATS Environment Manager
# Usage: ./start.sh [dev|prod]

ENVIRONMENT=${1:-dev}

case $ENVIRONMENT in
  dev|development)
    echo "🚀 Starting ATS in DEVELOPMENT mode..."
    echo "📝 Make sure you have Ollama running locally: ollama serve"
  echo "📝 Make sure you have the qwen2.5:3b-instruct-q4_K_M model: ollama pull qwen2.5:3b-instruct-q4_K_M"
    echo ""
    
    # Start services with development override
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
    ;;
    
  prod|production)
    echo "🏭 Starting ATS in PRODUCTION mode..."
    echo "📦 Using containerized Ollama service"
    echo ""
    
    # Start all services including Ollama
    docker-compose up --build
    ;;
    
  *)
    echo "Usage: $0 [dev|prod]"
    echo ""
    echo "  dev   - Development mode (uses local Ollama)"
    echo "  prod  - Production mode (uses Docker Ollama)"
    exit 1
    ;;
esac