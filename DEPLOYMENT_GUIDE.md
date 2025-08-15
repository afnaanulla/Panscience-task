# 🚀 Production Deployment Guide

This guide covers deploying the Task Management System to various cloud platforms.

## 📋 Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] Database connection string updated for production
- [ ] JWT secret generated (use strong random string)
- [ ] File storage configured (local or cloud)
- [ ] CORS origins updated for production domain
- [ ] Rate limiting configured appropriately
- [ ] SSL/HTTPS enabled
- [ ] Monitoring and logging set up

## 🌐 Deployment Options

### 1. Heroku Deployment

#### Prerequisites
- Heroku CLI installed
- Git repository initialized

#### Steps
```bash
# Login to Heroku
heroku login

# Create Heroku app
heroku create your-app-name

# Add MongoDB Atlas addon (or use external MongoDB)
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set CLIENT_URL=https://your-frontend-url.herokuapp.com

# Deploy
git push heroku main

# Open app
heroku open
```

#### Heroku Configuration
Create `Procfile`:
```
web: node backend/server.js
```

### 2. AWS Deployment

#### Using AWS Elastic Beanstalk

1. **Prepare the application**
```bash
# Create deployment package
zip -r task-management-api.zip backend/ -x "backend/node_modules/*"
```

2. **Deploy to Elastic Beanstalk**
- Create new application in Elastic Beanstalk console
- Upload zip file
- Configure environment variables
- Set up RDS for MongoDB or use MongoDB Atlas

#### Using AWS ECS (Docker)

1. **Build and push Docker image**
```bash
# Build image
docker build -t task-management-backend ./backend

# Tag for ECR
docker tag task-management-backend:latest your-account.dkr.ecr.region.amazonaws.com/task-management:latest

# Push to ECR
docker push your-account.dkr.ecr.region.amazonaws.com/task-management:latest
```

2. **Create ECS service**
- Create task definition
- Set up service with load balancer
- Configure environment variables

### 3. DigitalOcean App Platform

#### Steps
1. Connect GitHub repository to DigitalOcean App Platform
2. Configure build and run commands:
   ```yaml
   name: task-management-api
   services:
   - name: api
     source_dir: backend
     github:
       repo: your-username/task-management-system
       branch: main
     run_command: node server.js
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: NODE_ENV
       value: production
     - key: JWT_SECRET
       value: your-jwt-secret
     - key: MONGODB_URI
       value: your-mongodb-connection-string
   ```

### 4. Vercel (Frontend) + Railway (Backend)

#### Frontend on Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel

# Set environment variables in Vercel dashboard
# REACT_APP_API_URL=https://your-api-domain.com/api
```

#### Backend on Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

## 🗄️ Database Options

### MongoDB Atlas (Recommended)
1. Create cluster on MongoDB Atlas
2. Configure network access (0.0.0.0/0 for cloud deployment)
3. Create database user
4. Get connection string
5. Update MONGODB_URI environment variable

### Self-hosted MongoDB
- Use Docker container on cloud server
- Configure persistent storage
- Set up backup strategy
- Secure with authentication

## 📁 File Storage Options

### Local Storage (Development)
```env
UPLOADS_PATH=./uploads
```

### AWS S3
```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-west-2
AWS_S3_BUCKET=your-bucket-name
STORAGE_TYPE=s3
```

### DigitalOcean Spaces
```env
DO_SPACES_KEY=your-spaces-key
DO_SPACES_SECRET=your-spaces-secret
DO_SPACES_ENDPOINT=https://region.digitaloceanspaces.com
DO_SPACES_BUCKET=your-bucket-name
STORAGE_TYPE=spaces
```

## 🔒 Security Configuration

### Environment Variables (Production)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/taskmanagement
JWT_SECRET=your-super-secure-random-string-at-least-32-chars
JWT_EXPIRE=7d
CLIENT_URL=https://your-frontend-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### SSL/HTTPS
- Use cloud provider's SSL certificate
- Redirect HTTP to HTTPS
- Update CORS configuration for HTTPS

### Security Headers
```javascript
// Already configured in server.js
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
```

## 📊 Monitoring & Logging

### Application Monitoring
```javascript
// Add to server.js for production monitoring
if (process.env.NODE_ENV === 'production') {
  app.use('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
}
```

### Error Tracking
Consider integrating:
- Sentry for error tracking
- Winston for structured logging
- New Relic for performance monitoring

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd backend
        npm ci
    
    - name: Run tests
      run: |
        cd backend
        npm test
    
    - name: Deploy to Heroku
      uses: akhileshns/heroku-deploy@v3.12.12
      with:
        heroku_api_key: ${{secrets.HEROKU_API_KEY}}
        heroku_app_name: "your-app-name"
        heroku_email: "your-email@example.com"
```

## 🧪 Production Testing

### Health Check Endpoint
```bash
curl https://your-api-domain.com/api/health
```

### API Testing
```bash
# Test authentication
curl -X POST https://your-api-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test protected route
curl -X GET https://your-api-domain.com/api/tasks \
  -H "Authorization: Bearer your-jwt-token"
```

### Load Testing
```bash
# Using Apache Bench
ab -n 1000 -c 10 https://your-api-domain.com/api/health
```

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify CLIENT_URL environment variable
   - Check frontend API URL configuration

2. **Database Connection**
   - Verify MongoDB URI format
   - Check network access in MongoDB Atlas

3. **File Upload Issues**
   - Verify storage configuration
   - Check file size limits
   - Ensure proper permissions for cloud storage

4. **Authentication Problems**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Validate environment variables

### Logs and Debugging
```bash
# Heroku logs
heroku logs --tail

# Docker logs
docker logs container-name

# Check environment variables
heroku config
```

## 🚀 Performance Optimization

### Production Optimizations
1. Enable gzip compression (already configured)
2. Set up CDN for static files
3. Configure database indexing
4. Implement caching strategy
5. Monitor and optimize slow queries

### Scaling Considerations
- Horizontal scaling with load balancers
- Database read replicas
- File storage CDN
- Redis for session management
- Docker container orchestration

## 📝 Post-deployment Steps

1. [ ] Verify all endpoints are working
2. [ ] Test file upload and download
3. [ ] Verify WebSocket connections
4. [ ] Test authentication flow
5. [ ] Monitor error logs
6. [ ] Set up automated backups
7. [ ] Configure monitoring alerts
8. [ ] Document any environment-specific configurations

## 🆘 Support

For deployment issues:
1. Check logs first
2. Verify environment variables
3. Test individual components
4. Check network connectivity
5. Review security group settings (AWS)
6. Validate DNS configuration

Remember to never commit sensitive information like API keys or passwords to version control!
