#!/bin/bash

# Development Mode Startup Script
# This runs the services without Ollama container, expecting local Ollama

echo "🚀 Starting ATS in DEVELOPMENT mode..."
echo "📝 Using local Ollama at localhost:11434"
echo "📝 Make sure Ollama is running: ollama serve"
echo "📝 Make sure qwen2.5:3b-instruct-q4_K_M model is available: ollama pull qwen2.5:3b-instruct-q4_K_M"
echo ""

# Check if local Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "❌ Local Ollama is not running!"
    echo "Please start it with: ollama serve"
    exit 1
fi

echo "✅ Local Ollama is running"

# Create a temporary docker-compose override for development
cat > docker-compose.dev.override.yml << EOF
services:
  python-ai:
    environment:
      - PYTHONUNBUFFERED=1
      - MODEL_CACHE_DIR=/app/models
      - OLLAMA_URL=http://host.docker.internal:11434
      - ENVIRONMENT=development
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on: []
EOF

# Start services without Ollama
docker-compose -f docker-compose.yml -f docker-compose.dev.override.yml up --build java-api python-ai frontend