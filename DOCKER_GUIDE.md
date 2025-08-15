# Docker Deployment Guide

This guide explains how to use Docker to run the Task Management System in different environments.

## Prerequisites

1. **Install Docker**: Download from https://www.docker.com/get-started
2. **Install Docker Compose**: Usually included with Docker Desktop
3. **Verify installation**:
   ```bash
   docker --version
   docker-compose --version
   ```

## Quick Start

### Production Environment (Single Command)

Run the complete application stack:
```bash
docker-compose up -d
```

This will start:
- MongoDB database (port 27017)
- Backend API (port 5000)
- Frontend React app (port 3000)

Access the application at: http://localhost:3000

### Development Environment

For development with hot reloading:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

Additional services in development:
- Redis cache (port 6379)
- MongoDB Express GUI (port 8081)
- Backend with debugging (port 9229)

### Stop Services

```bash
docker-compose down
# or for development
docker-compose -f docker-compose.dev.yml down
```

## Docker Compose Files

### 1. `docker-compose.yml` (Production)

**Services:**
- `mongodb`: MongoDB 7.0 database
- `backend`: Node.js API server (production build)
- `frontend`: React app served by Nginx

**Features:**
- Optimized for production
- Health checks for all services
- Volume persistence for data
- Automatic service dependencies

### 2. `docker-compose.dev.yml` (Development)

**Additional Services:**
- `redis`: Redis for caching
- `mongo-express`: Database GUI
- Volume mounting for hot reloading
- Debugging ports exposed

## Individual Service Commands

### Backend

Build and run backend only:
```bash
# Production build
cd backend
docker build -t task-backend .
docker run -p 5000:5000 task-backend

# Development build
docker build -f Dockerfile.dev -t task-backend-dev .
docker run -p 5000:5000 -p 9229:9229 task-backend-dev
```

### Frontend

Build and run frontend only:
```bash
# Production build
cd frontend
docker build -t task-frontend .
docker run -p 3000:3000 task-frontend

# Development build
docker build -f Dockerfile.dev -t task-frontend-dev .
docker run -p 3000:3000 task-frontend-dev
```

## Environment Configuration

### Environment Variables

**Backend (.env):**
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://admin:password@mongodb:27017/task_management?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
STORAGE_TYPE=local
UPLOADS_PATH=./uploads
```

**Frontend:**
```env
REACT_APP_API_URL=http://localhost:5000/api
GENERATE_SOURCEMAP=false
```

### Override Environment Variables

Create `docker-compose.override.yml`:
```yaml
version: '3.8'
services:
  backend:
    environment:
      - JWT_SECRET=my-custom-secret
      - NODE_ENV=staging
  
  frontend:
    environment:
      - REACT_APP_API_URL=http://my-custom-domain.com/api
```

## Data Persistence

### Volumes

Data is persisted using Docker volumes:
- `mongodb_data`: Database files
- `backend_uploads`: Uploaded task documents

### Backup Database

```bash
# Create backup
docker exec task-management-db mongodump --host localhost --port 27017 --out /backup
docker cp task-management-db:/backup ./mongodb-backup

# Restore backup
docker cp ./mongodb-backup task-management-db:/backup
docker exec task-management-db mongorestore --host localhost --port 27017 /backup
```

## Development Workflow

### 1. Start Development Environment

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 2. View Logs

```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f backend-dev
```

### 3. Execute Commands in Containers

```bash
# Backend shell
docker-compose -f docker-compose.dev.yml exec backend-dev sh

# Run tests
docker-compose -f docker-compose.dev.yml exec backend-dev npm test

# Install new dependencies
docker-compose -f docker-compose.dev.yml exec backend-dev npm install package-name
```

### 4. Database Management

Access MongoDB Express GUI at: http://localhost:8081
- Username: admin
- Password: admin

### 5. Debugging

The development backend exposes debugging on port 9229.

**VS Code Debug Configuration (.vscode/launch.json):**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Docker: Attach to Backend",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "address": "localhost",
      "localRoot": "${workspaceFolder}/backend",
      "remoteRoot": "/app",
      "protocol": "inspector",
      "restart": true
    }
  ]
}
```

## Production Deployment

### 1. Build Production Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build backend
```

### 2. Security Considerations

**Change default credentials:**
```yaml
# In docker-compose.yml
mongodb:
  environment:
    MONGO_INITDB_ROOT_USERNAME: your_username
    MONGO_INITDB_ROOT_PASSWORD: your_secure_password
```

**Use secrets for sensitive data:**
```yaml
services:
  backend:
    secrets:
      - jwt_secret
      - db_password

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  db_password:
    file: ./secrets/db_password.txt
```

### 3. Performance Optimization

**Resource limits:**
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### 4. Health Checks

All services include health checks:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Cloud Deployment

### AWS ECS

1. Push images to ECR:
```bash
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-west-2.amazonaws.com

docker tag task-backend:latest 123456789012.dkr.ecr.us-west-2.amazonaws.com/task-backend:latest
docker push 123456789012.dkr.ecr.us-west-2.amazonaws.com/task-backend:latest
```

2. Create ECS task definition
3. Configure load balancer
4. Set up RDS for MongoDB

### Heroku

Create `heroku.yml`:
```yaml
build:
  docker:
    backend: backend/Dockerfile
    frontend: frontend/Dockerfile
run:
  backend: npm start
  frontend: npm start
```

Deploy:
```bash
heroku create your-app-name
heroku stack:set container
git push heroku main
```

### DigitalOcean App Platform

Create `.do/app.yaml`:
```yaml
name: task-management-system
services:
- name: backend
  source_dir: backend
  docker:
    dockerfile_path: Dockerfile
  http_port: 5000
  instance_count: 1
  instance_size_slug: basic-xxs
  
- name: frontend
  source_dir: frontend
  docker:
    dockerfile_path: Dockerfile
  http_port: 3000
  instance_count: 1
  instance_size_slug: basic-xxs

databases:
- engine: MONGODB
  name: task-db
  num_nodes: 1
  size: db-s-1vcpu-1gb
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Find process using port
   netstat -tulpn | grep :3000
   
   # Kill process
   kill -9 <PID>
   ```

2. **Permission denied:**
   ```bash
   # Fix Docker permissions (Linux)
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. **Out of disk space:**
   ```bash
   # Clean up Docker
   docker system prune -a --volumes
   ```

4. **Database connection failed:**
   ```bash
   # Check MongoDB logs
   docker-compose logs mongodb
   
   # Restart MongoDB
   docker-compose restart mongodb
   ```

### Logs and Debugging

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Follow logs in real-time
docker-compose logs -f --tail=100 backend

# Check service health
docker-compose ps
```

### Performance Monitoring

```bash
# Container stats
docker stats

# System resource usage
docker system df

# Container inspection
docker inspect task-management-backend
```

This Docker setup provides a complete, scalable solution for deploying the Task Management System in any environment.
