# Git Setup and Version Control Guide

## Prerequisites
1. Install Git: Download from https://git-scm.com/downloads
2. Configure Git with your credentials:
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

## Initial Repository Setup

### 1. Initialize Git Repository
```bash
git init
git add .
git commit -m "feat: initial project setup with task management system

- Complete MERN stack application
- JWT authentication and authorization
- Task CRUD operations with file uploads
- User management with admin roles
- MongoDB integration
- Responsive React frontend with Tailwind CSS
- Docker containerization setup"
```

### 2. Create Remote Repository
1. Go to GitHub/GitLab/Bitbucket
2. Create a new repository named `task-management-system`
3. Add remote origin:
```bash
git remote add origin https://github.com/yourusername/task-management-system.git
git branch -M main
git push -u origin main
```

## Feature Branch Workflow

### Creating Feature Branches
```bash
# Create and switch to feature branch
git checkout -b feature/user-authentication
git checkout -b feature/task-management
git checkout -b feature/file-upload
git checkout -b feature/docker-setup
git checkout -b bugfix/task-permission-fix
```

### Working with Feature Branches
```bash
# Make your changes and commit
git add .
git commit -m "feat: add JWT authentication middleware"

# Push feature branch
git push -u origin feature/user-authentication

# Create pull request on GitHub/GitLab
```

### Merging Feature Branches
```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Merge feature branch
git merge feature/user-authentication

# Push merged changes
git push origin main

# Delete feature branch
git branch -d feature/user-authentication
git push origin --delete feature/user-authentication
```

## Commit Message Conventions

Follow conventional commit format:

### Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

### Examples:
```bash
git commit -m "feat: implement task creation with file upload"
git commit -m "fix: resolve permission issue for assigned users"
git commit -m "docs: update README with Docker instructions"
git commit -m "test: add unit tests for authentication service"
git commit -m "refactor: extract file upload logic to separate service"
git commit -m "style: format code according to ESLint rules"
git commit -m "chore: update dependencies to latest versions"
```

## Pre-commit Hooks Setup (Optional)

### Install Husky for Git Hooks
```bash
# In the root directory
npm install --save-dev husky lint-staged

# Initialize husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint-staged"
```

### Add to package.json
```json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

## Useful Git Commands

### Checking Status and History
```bash
git status                    # Check working directory status
git log --oneline            # View commit history
git log --graph --oneline    # View branch history graphically
git diff                     # View unstaged changes
git diff --staged            # View staged changes
```

### Branching
```bash
git branch                   # List local branches
git branch -a                # List all branches (local + remote)
git checkout -b new-branch   # Create and switch to new branch
git branch -d branch-name    # Delete local branch
```

### Stashing Changes
```bash
git stash                    # Stash current changes
git stash list               # View stash list
git stash pop                # Apply and remove latest stash
git stash apply              # Apply stash without removing
```

### Undoing Changes
```bash
git reset HEAD~1             # Undo last commit (keep changes)
git reset --hard HEAD~1      # Undo last commit (discard changes)
git checkout -- filename    # Discard changes in specific file
git revert commit-hash       # Create new commit that undoes changes
```

## GitHub Workflow Example

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/task-management-system.git
cd task-management-system
```

### 2. Create Feature Branch
```bash
git checkout -b feature/enhanced-task-filters
```

### 3. Make Changes and Commit
```bash
git add .
git commit -m "feat: add advanced task filtering by date range and tags"
```

### 4. Push and Create PR
```bash
git push -u origin feature/enhanced-task-filters
# Go to GitHub and create Pull Request
```

### 5. After PR is Approved
```bash
git checkout main
git pull origin main
git branch -d feature/enhanced-task-filters
```

## Best Practices

1. **Meaningful Commits**: Each commit should represent a single logical change
2. **Frequent Commits**: Commit often with small, focused changes
3. **Branch Naming**: Use descriptive branch names (feature/task-filters, bugfix/login-error)
4. **Pull Before Push**: Always pull latest changes before pushing
5. **Code Reviews**: Use pull requests for code review process
6. **Clean History**: Use interactive rebase to clean up commit history if needed

## Integration with CI/CD

### GitHub Actions Example (.github/workflows/ci.yml)
```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run build
```

This guide ensures proper version control practices for the task management system project.
