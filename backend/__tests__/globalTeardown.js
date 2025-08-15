module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up test uploads directory
  const fs = require('fs').promises;
  const path = require('path');
  
  const uploadDir = path.join(__dirname, '../test-uploads');
  try {
    await fs.rmdir(uploadDir, { recursive: true });
  } catch (error) {
    // Directory might not exist, ignore error
  }
  
  console.log('✅ Test environment cleanup complete');
};
