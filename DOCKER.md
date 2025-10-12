# ATS Docker Setup

This document explains how to run the Smart ATS system using Docker containers.

## 🐳 Architecture

The system consists of 4 services:

- **Frontend** (Next.js) - Port 3000
- **Java API** (Spring Boot) - Port 8080  
- **Python AI** (FastAPI) - Port 8000
- **Nginx** (Reverse Proxy) - Port 80 (production only)

## 🚀 Quick Start

### Prerequisites

- Docker (v20.0+)
- Docker Compose (v2.0+)

### 1. Build and Start Services

```bash
# Make the management script executable
chmod +x docker-manage.sh

# Build all images
./docker-manage.sh build

# Start in development mode
./docker-manage.sh dev
```

### 2. Access the Application

Once all services are running:

- **Frontend**: http://localhost:3000
- **Java API**: http://localhost:8080/api/ats/health
- **Python AI**: http://localhost:8000/health

## 📋 Management Commands

The `docker-manage.sh` script provides easy management:

```bash
# Development mode (no nginx)
./docker-manage.sh dev

# Production mode (with nginx reverse proxy)
./docker-manage.sh prod

# View logs
./docker-manage.sh logs
./docker-manage.sh logs python-ai  # Specific service

# Check status
./docker-manage.sh status

# Restart services
./docker-manage.sh restart

# Stop services
./docker-manage.sh stop

# Clean up everything
./docker-manage.sh clean

# Open shell in service
./docker-manage.sh shell python-ai
./docker-manage.sh shell java-api
./docker-manage.sh shell frontend
```

## 🔧 Manual Docker Compose

If you prefer direct Docker Compose commands:

```bash
# Start development services
docker-compose up -d python-ai java-api frontend

# Start production with nginx
docker-compose --profile production up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild specific service
docker-compose build python-ai
docker-compose up -d python-ai
```

## 🌍 Environment Configuration

### Development Mode
- Services communicate via Docker internal network
- Direct port access for debugging
- No reverse proxy

### Production Mode
- Nginx reverse proxy handles routing
- Rate limiting and security headers
- Single entry point on port 80

## 📊 Monitoring & Health Checks

All services include health checks:

```bash
# Check service health
curl http://localhost:8000/health  # Python AI
curl http://localhost:8080/api/ats/health  # Java API
curl http://localhost:3000  # Frontend
curl http://localhost:80/health  # Nginx (prod mode)
```

## 🔍 Troubleshooting

### Services won't start
```bash
# Check logs for errors
./docker-manage.sh logs

# Verify Docker resources
docker system df
docker system prune  # Clean up if needed
```

### Python AI service issues
```bash
# Check model downloads
./docker-manage.sh shell python-ai
ls -la /app/models/

# Check NLTK data
python -c "import nltk; print(nltk.data.path)"
```

### Java API connection issues
```bash
# Verify Python service is reachable
./docker-manage.sh shell java-api
curl http://python-ai:8000/health
```

### Frontend API calls failing
```bash
# Check network connectivity
./docker-manage.sh shell frontend
curl http://java-api:8080/api/ats/health
```

## 🚀 Deployment Options

### Local Development
```bash
./docker-manage.sh dev
```

### Production Deployment
```bash
./docker-manage.sh prod
```

### Cloud Deployment
For cloud deployment, modify `docker-compose.yml`:

1. Add external load balancer configuration
2. Configure persistent volumes for model storage
3. Add environment-specific secrets
4. Set up monitoring and logging

## 📦 Build Optimization

The Docker setup includes several optimizations:

- **Multi-stage builds** for smaller final images
- **Layer caching** for faster rebuilds  
- **Health checks** for service reliability
- **Volume mounting** for model persistence
- **Security headers** via Nginx

## 🔐 Security Considerations

- Services run in isolated network
- Nginx provides rate limiting
- No direct external access to backend services
- Health check endpoints are protected
- File upload size limits enforced

## 📈 Scaling

To scale services horizontally:

```yaml
# In docker-compose.yml
services:
  python-ai:
    deploy:
      replicas: 3
  java-api:
    deploy:
      replicas: 2
```

Then use Docker Swarm or Kubernetes for orchestration.

## 🛠 Development Workflow

1. **Code changes**: Edit source files normally
2. **Rebuild**: `./docker-manage.sh build`  
3. **Restart**: `./docker-manage.sh restart`
4. **Test**: Access via browser or API calls
5. **Debug**: Use `./docker-manage.sh logs` or `shell` commands

## 📝 Environment Variables

Key environment variables you can customize:

```bash
# Python AI Service
MODEL_CACHE_DIR=/app/models
PYTHONUNBUFFERED=1

# Java API Service  
SPRING_PROFILES_ACTIVE=docker
PYTHON_SERVICE_URL=http://python-ai:8000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080
NODE_ENV=production
```

## 🏗 Custom Configuration

To customize for your environment:

1. **Modify ports**: Edit `docker-compose.yml` port mappings
2. **Add environment variables**: Update service environment sections
3. **Configure nginx**: Edit `nginx/nginx.conf` for custom routing
4. **Persistent data**: Add volume mounts for data persistence

This Docker setup provides a complete, production-ready deployment of the ATS system! 🎉