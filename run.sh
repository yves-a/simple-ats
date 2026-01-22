#!/bin/bash

# =============================================
# Simple ATS - Docker Management Script
# =============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_help() {
    echo ""
    echo "Simple ATS - Docker Management"
    echo "=============================="
    echo ""
    echo "Usage: ./run.sh <command>"
    echo ""
    echo "Commands:"
    echo "  dev       Start in development mode (requires local Ollama)"
    echo "  prod      Start in production mode (Ollama runs in Docker)"
    echo "  stop      Stop all services"
    echo "  logs      Show logs (use: ./run.sh logs [service])"
    echo "  status    Show service status"
    echo "  clean     Remove all containers, images, and volumes"
    echo "  build     Build all images without starting"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./run.sh dev              # Start development mode"
    echo "  ./run.sh prod             # Start production mode"
    echo "  ./run.sh logs             # View all logs"
    echo "  ./run.sh logs java-api-dev   # View specific service logs"
    echo ""
}

check_ollama() {
    echo -e "${BLUE}[INFO]${NC} Checking local Ollama..."
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}[OK]${NC} Ollama is running"
        return 0
    else
        echo -e "${RED}[ERROR]${NC} Ollama is not running!"
        echo ""
        echo "Please start Ollama first:"
        echo "  1. Install: https://ollama.com/download"
        echo "  2. Run: ollama serve"
        echo "  3. Pull model: ollama pull qwen2.5:3b-instruct-q4_K_M"
        echo ""
        return 1
    fi
}

start_dev() {
    echo ""
    echo -e "${BLUE}🚀 Starting ATS in DEVELOPMENT mode${NC}"
    echo ""
    
    check_ollama || exit 1
    
    echo ""
    echo -e "${BLUE}[INFO]${NC} Building and starting services..."
    docker compose --profile dev up --build -d
    
    echo ""
    echo -e "${GREEN}[SUCCESS]${NC} Services started!"
    echo ""
    echo "Access the application:"
    echo "  Frontend:   http://localhost:3000"
    echo "  Java API:   http://localhost:8080"
    echo "  Python AI:  http://localhost:8000"
    echo "  Interview:  http://localhost:8001"
    echo ""
    echo "View logs: ./run.sh logs"
    echo ""
}

start_prod() {
    echo ""
    echo -e "${BLUE}🏭 Starting ATS in PRODUCTION mode${NC}"
    echo ""
    echo -e "${BLUE}[INFO]${NC} Building and starting all services (including Ollama)..."
    docker compose --profile prod up --build -d
    
    echo ""
    echo -e "${GREEN}[SUCCESS]${NC} Services started!"
    echo ""
    echo "Access the application:"
    echo "  Frontend:   http://localhost:3000"
    echo "  Java API:   http://localhost:8080"
    echo "  Python AI:  http://localhost:8000"
    echo "  Interview:  http://localhost:8001"
    echo "  Nginx:      http://localhost:80"
    echo ""
    echo "View logs: ./run.sh logs"
    echo ""
}

stop_services() {
    echo -e "${BLUE}[INFO]${NC} Stopping all services..."
    docker compose --profile dev --profile prod down
    echo -e "${GREEN}[SUCCESS]${NC} All services stopped"
}

show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        docker compose --profile dev --profile prod logs -f
    else
        docker compose --profile dev --profile prod logs -f "$service"
    fi
}

show_status() {
    echo ""
    echo "Service Status:"
    echo "==============="
    docker compose --profile dev --profile prod ps
    echo ""
}

clean_all() {
    echo ""
    echo -e "${YELLOW}[WARNING]${NC} This will remove all ATS containers, images, and volumes."
    read -p "Are you sure? (y/N): " confirm
    
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}[INFO]${NC} Stopping containers..."
        docker compose --profile dev --profile prod down -v --remove-orphans 2>/dev/null || true
        
        echo -e "${BLUE}[INFO]${NC} Removing images..."
        docker compose --profile dev --profile prod down --rmi all 2>/dev/null || true
        
        echo -e "${BLUE}[INFO]${NC} Pruning unused resources..."
        docker system prune -f
        
        echo -e "${GREEN}[SUCCESS]${NC} Cleanup complete!"
    else
        echo "Cancelled."
    fi
    echo ""
}

build_images() {
    echo -e "${BLUE}[INFO]${NC} Building all images..."
    docker compose --profile dev build
    docker compose --profile prod build
    echo -e "${GREEN}[SUCCESS]${NC} All images built!"
}

# Main
case "${1:-help}" in
    dev)
        start_dev
        ;;
    prod)
        start_prod
        ;;
    stop)
        stop_services
        ;;
    logs)
        show_logs "$2"
        ;;
    status)
        show_status
        ;;
    clean)
        clean_all
        ;;
    build)
        build_images
        ;;
    help|--help|-h|"")
        print_help
        ;;
    *)
        echo -e "${RED}[ERROR]${NC} Unknown command: $1"
        print_help
        exit 1
        ;;
esac
