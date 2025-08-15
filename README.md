# Task Management System

A comprehensive full-stack web application for task management built with React, Node.js, Express, and MongoDB.

## 🚀 Quick Start

### Prerequisites
- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Node.js](https://nodejs.org/) (for local development)
- [MongoDB](https://www.mongodb.com/) (for local development)
- [Git](https://git-scm.com/) for version control

### Run with Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd task-management-system
   ```

2. **Start the application:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

4. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Development Mode

For development with hot reloading:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

Additional services available in development:
- MongoDB Express GUI: http://localhost:8081 (admin/admin)
- Redis Cache: localhost:6379
- Backend Debugging: localhost:9229

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based user registration and login
- Role-based access control (admin/user)
- Secure password hashing with bcrypt
- Protected routes and API endpoints
- Session management with automatic token refresh

### 📋 Task Management
- **CRUD Operations**: Create, read, update, delete tasks
- **Task Assignment**: Assign tasks to users
- **Status Tracking**: Pending, In Progress, Completed
- **Priority Levels**: Low, Medium, High
- **Due Dates**: Set and track task deadlines
- **Search & Filter**: Find tasks by title, status, priority, assignee
- **Sorting**: Sort by creation date, due date, priority
- **Pagination**: Efficient handling of large task lists

### 📎 File Management
- Upload up to 3 PDF documents per task
- File size limit: 10MB per file
- Secure file storage with access control
- Document viewing in browser
- Download functionality
- File metadata tracking

### 👥 User Management
- Admin users can create, edit, delete users
- User profile management
- Email-based user identification
- Role assignment and permissions

### 🎨 User Interface
- **Responsive Design**: Mobile-first approach
- **Modern UI**: Clean, intuitive interface
- **Real-time Updates**: Live task status changes
- **Form Validation**: Client and server-side validation
- **Loading States**: Smooth user experience
- **Error Handling**: User-friendly error messages
- **Accessibility**: WCAG 2.1 compliant

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18
- **Framework**: Express.js 4
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Validation**: Express Validator
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest & Supertest (80%+ Coverage)
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan HTTP request logging

### Frontend
- **Framework**: React 18
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Date Utilities**: Date-fns

### DevOps & Deployment
- **Containerization**: Docker & Docker Compose
- **Database**: MongoDB
- **Web Server**: Nginx (production)
- **Development**: Hot reloading with nodemon
- **Caching**: Redis (development)
- **Database GUI**: MongoDB Express (development)
- **File Storage**: Local storage with cloud-ready configuration

## 📋 Prerequisites

- Node.js (v16 or higher)
- Docker and Docker Compose
- Git

## 🚀 Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd task-management-system
   ```

2. **Start the application**
   ```bash
   docker-compose up --build
   ```

3. **Access the applications**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

4. **Create an admin user** (optional)
   You can register a new user and then manually change their role to 'admin' in the database, or use the API to create an admin user.

## 🔧 Development Setup

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/task_management
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   CLIENT_URL=http://localhost:3000
   UPLOADS_PATH=./uploads
   ```

4. **Database setup**
   ```bash
   # Make sure MongoDB is running
   # No database creation needed - MongoDB creates it automatically
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file** (optional)
   ```bash
   echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
   ```

4. **Start development server**
   ```bash
   npm start
   ```

## 🧪 Testing

### Backend Testing (80%+ Coverage)
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Test Structure
```
__tests__/
├── unit/              # Unit tests
│   ├── auth.test.js   # Authentication tests
│   ├── tasks.test.js  # Task management tests
│   └── users.test.js  # User management tests
├── integration/       # Integration tests
│   ├── api.test.js    # API endpoint tests
│   └── auth.test.js   # Authentication flow tests
└── utils/            # Test utilities and helpers
```

### Frontend Testing
```bash
# Run frontend tests
cd frontend
npm test

# Run E2E tests with Cypress
npm run cy:open
```

## 📚 API Documentation

The API documentation is available at:
- Development: http://localhost:5000/api-docs
- Production: Your deployed URL + /api-docs

### Key API Endpoints

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/verify-token` - Verify JWT token

#### Tasks
- `GET /api/tasks` - Get all tasks (with filtering, sorting, pagination)
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

#### Users (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

#### Files
- `GET /api/files/download/:documentId` - Download document
- `GET /api/files/view/:documentId` - View document in browser
- `DELETE /api/files/document/:documentId` - Delete document

## 🔐 Security Features

- **Authentication**: JWT-based with secure token storage
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive validation using express-validator
- **NoSQL Injection Protection**: Mongoose ODM with schema validation
- **XSS Protection**: Helmet middleware with security headers
- **CORS**: Configured for specific origins
- **Rate Limiting**: API rate limiting to prevent abuse
- **File Upload Security**: File type validation and size limits
- **Password Security**: Bcrypt hashing with salt rounds

## 🏗️ Architecture

### Backend (Node.js/Express)
```
src/
├── controllers/     # Route handlers
├── middleware/      # Auth, validation, error handling
├── models/         # MongoDB models (Mongoose)
├── routes/         # API route definitions
├── services/       # Business logic
├── utils/          # Helper functions
├── config/         # Database and app configuration
└── server.js       # Application entry point
```

### Frontend (React)
```
src/
├── components/        # Reusable UI components
│   ├── Auth/         # Login, Register, PrivateRoute
│   ├── Tasks/        # Task management components
│   ├── Users/        # User management (admin)
│   ├── Common/       # Shared components
│   └── Layout/       # App layout components
├── services/         # API calls and utilities
├── store/           # Redux store and slices
├── utils/           # Helper functions
└── App.js           # Main application component
```

### Project Structure
```
task-management-system/
├── backend/
│   ├── __tests__/       # Test files (80%+ coverage)
│   │   ├── unit/        # Unit tests
│   │   ├── integration/ # Integration tests
│   │   └── utils/       # Test utilities
│   ├── config/          # Database and app configuration
│   ├── middleware/      # Auth, validation, error handling
│   ├── models/         # MongoDB models (Mongoose)
│   ├── routes/         # API route definitions
│   ├── utils/          # Helper functions
│   ├── uploads/        # File uploads directory
│   ├── server.js       # Main server file
│   ├── Dockerfile      # Backend container
│   ├── Dockerfile.dev  # Development container
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/   # API services
│   │   ├── store/      # Redux store and slices
│   │   ├── utils/      # Utility functions
│   │   └── App.js      # Main React component
│   ├── public/         # Static files
│   ├── Dockerfile      # Frontend container
│   ├── Dockerfile.dev  # Development container
│   └── package.json
├── docker-compose.yml     # Production composition
├── docker-compose.dev.yml # Development composition
├── .dockerignore          # Docker ignore patterns
├── .gitignore            # Git ignore patterns
├── DOCKER_GUIDE.md       # Docker deployment guide
├── GIT_SETUP.md          # Git setup guide
└── README.md
```

## 🚢 Deployment

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build -d
   ```

2. **Environment Variables**
   Update the environment variables in `docker-compose.yml` for production:
   - Change JWT_SECRET to a secure random string
   - Update database credentials
   - Set NODE_ENV to 'production'

### Services
- **MongoDB**: Database (port 27017)
- **Backend**: Node.js API (port 5000)
- **Frontend**: Nginx-served React app (port 3000)

### Environment Configuration
Create `.env` files for custom configuration:

**Backend (.env):**
```env
NODE_ENV=production
MONGODB_URI=mongodb://admin:password@mongodb:27017/task_management?authSource=admin
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

**Frontend (.env):**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Manual Deployment

1. **Backend Deployment**
   - Set up MongoDB database
   - Configure environment variables
   - Install dependencies: `npm ci --only=production`
   - Start server: `npm start`

2. **Frontend Deployment**
   - Build the React app: `npm run build`
   - Serve the build folder with a web server (nginx, Apache, etc.)

### Cloud Deployment Options

- **Heroku**: Use the included Dockerfile and environment configurations
- **AWS**: Deploy using ECS, EC2, or Elastic Beanstalk
- **DigitalOcean**: Use App Platform or Droplets
- **Vercel**: Frontend deployment (configure API URL)

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/task_management

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# CORS
CLIENT_URL=http://localhost:3000

# File Storage
UPLOADS_PATH=./uploads

# AWS S3 (if using cloud storage)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-west-2
AWS_S3_BUCKET=your-bucket-name
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Known Issues

- File uploads are limited to PDF format only
- Maximum 3 documents per task
- Local file storage only (cloud storage configuration available but not implemented in UI)

## 🔮 Future Enhancements

- [ ] Email notifications for task assignments
- [ ] Task comments and activity history
- [ ] Drag-and-drop task management (Kanban board)
- [ ] Mobile responsive improvements
- [ ] Advanced reporting and analytics
- [ ] Integration with external calendars
- [ ] Bulk task operations
- [ ] Task templates
- [ ] Time tracking functionality
- [ ] Task dependencies

## 📞 Support

For support, email support@taskmanagement.com or create an issue in the repository.

## 🙏 Acknowledgments

- React team for the amazing framework
- Express.js community for the robust backend framework
- MongoDB for the flexible NoSQL database
- Mongoose team for the elegant MongoDB modeling
- Docker community for containerization excellence
- All open-source contributors whose packages made this project possible
