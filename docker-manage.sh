#!/bin/bash

# ATS Docker Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    echo "ATS Docker Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build       Build all Docker images"
    echo "  start       Start all services"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  logs        Show logs from all services"
    echo "  status      Show status of all services"
    echo "  clean       Remove all containers and images"
    echo "  dev         Start in development mode (no nginx)"
    echo "  prod        Start in production mode (with nginx)"
    echo "  shell       Open shell in specified service"
    echo "  help        Show this help message"
}

# Build all images
build_images() {
    print_status "Building Docker images..."
    docker-compose build --no-cache
    print_success "All images built successfully!"
}

# Start services
start_services() {
    local mode=${1:-dev}
    
    if [ "$mode" = "prod" ]; then
        print_status "Starting ATS services in production mode..."
        docker-compose --profile production up -d
    else
        print_status "Starting ATS services in development mode..."
        docker-compose up -d python-ai java-api frontend
    fi
    
    print_success "All services started!"
    print_status "Services will be available at:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Java API: http://localhost:8080"
    echo "  - Python AI: http://localhost:8000"
    
    if [ "$mode" = "prod" ]; then
        echo "  - Nginx Proxy: http://localhost:80"
    fi
}

# Stop services
stop_services() {
    print_status "Stopping all services..."
    docker-compose down
    print_success "All services stopped!"
}

# Restart services
restart_services() {
    print_status "Restarting all services..."
    docker-compose restart
    print_success "All services restarted!"
}

# Show logs
show_logs() {
    local service=$1
    
    if [ -z "$service" ]; then
        print_status "Showing logs from all services..."
        docker-compose logs -f
    else
        print_status "Showing logs from $service..."
        docker-compose logs -f "$service"
    fi
}

# Show status
show_status() {
    print_status "Service Status:"
    docker-compose ps
}

# Clean up
clean_up() {
    print_warning "This will remove all ATS containers and images. Continue? (y/N)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_status "Stopping and removing containers..."
        docker-compose down -v --remove-orphans
        
        print_status "Removing images..."
        docker-compose down --rmi all
        
        print_status "Cleaning up unused Docker resources..."
        docker system prune -f
        
        print_success "Cleanup completed!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Open shell in service
open_shell() {
    local service=$1
    
    if [ -z "$service" ]; then
        print_error "Please specify a service: python-ai, java-api, or frontend"
        return 1
    fi
    
    print_status "Opening shell in $service..."
    docker-compose exec "$service" /bin/bash
}

# Main script logic
case "$1" in
    build)
        build_images
        ;;
    start)
        start_services dev
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs "$2"
        ;;
    status)
        show_status
        ;;
    clean)
        clean_up
        ;;
    dev)
        start_services dev
        ;;
    prod)
        start_services prod
        ;;
    shell)
        open_shell "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac