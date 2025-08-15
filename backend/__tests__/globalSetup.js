module.exports = async () => {
  // Global setup for all test files
  console.log('🧪 Setting up test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
  process.env.JWT_EXPIRE = '1h';
  process.env.UPLOADS_PATH = './test-uploads';
  process.env.STORAGE_TYPE = 'local';
  
  // Create test uploads directory if it doesn't exist
  const fs = require('fs').promises;
  const path = require('path');
  
  const uploadDir = path.join(__dirname, '../test-uploads');
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(path.join(uploadDir, 'tasks'), { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
  
  console.log('✅ Test environment setup complete');
};
