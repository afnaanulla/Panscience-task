const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const Task = require('../../models/Task');
const TaskDocument = require('../../models/TaskDocument');
const fs = require('fs').promises;
const path = require('path');

// Test user data
const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'admin123',
    role: 'admin'
  },
  user1: {
    email: 'user1@test.com',
    password: 'user123',
    role: 'user'
  },
  user2: {
    email: 'user2@test.com',
    password: 'user456',
    role: 'user'
  }
};

// Create test user
const createTestUser = async (userData = testUsers.user1) => {
  const hashedPassword = await bcrypt.hash(userData.password, 12);
  const user = new User({
    email: userData.email,
    password: hashedPassword,
    role: userData.role
  });
  await user.save();
  return user;
};

// Create multiple test users
const createTestUsers = async () => {
  const users = {};
  for (const [key, userData] of Object.entries(testUsers)) {
    users[key] = await createTestUser(userData);
  }
  return users;
};

// Generate JWT token for test user
const generateTestToken = (userId, role = 'user') => {
  return jwt.sign(
    { id: userId, _id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Create test task
const createTestTask = async (createdBy, assignedTo = null, overrides = {}) => {
  const taskData = {
    title: 'Test Task',
    description: 'This is a test task',
    status: 'pending',
    priority: 'medium',
    createdBy,
    assignedTo,
    ...overrides
  };
  
  const task = new Task(taskData);
  await task.save();
  return task;
};

// Create multiple test tasks
const createTestTasks = async (users) => {
  const tasks = [];
  
  // Task 1: Admin created, assigned to user1
  tasks.push(await createTestTask(
    users.admin._id,
    users.user1._id,
    { title: 'Admin Task for User1', priority: 'high' }
  ));
  
  // Task 2: User1 created, not assigned
  tasks.push(await createTestTask(
    users.user1._id,
    null,
    { title: 'User1 Personal Task', priority: 'low' }
  ));
  
  // Task 3: User1 created, assigned to user2
  tasks.push(await createTestTask(
    users.user1._id,
    users.user2._id,
    { title: 'User1 Task for User2', status: 'in_progress' }
  ));
  
  // Task 4: User2 created, assigned to user1
  tasks.push(await createTestTask(
    users.user2._id,
    users.user1._id,
    { title: 'User2 Task for User1', status: 'completed' }
  ));
  
  return tasks;
};

// Create test document file
const createTestPDFFile = async () => {
  const testUploadDir = path.join(__dirname, '../../test-uploads/tasks');
  await fs.mkdir(testUploadDir, { recursive: true });
  
  const filename = `test-document-${Date.now()}.pdf`;
  const filePath = path.join(testUploadDir, filename);
  
  // Create a simple PDF-like content
  const pdfContent = '%PDF-1.4\nTest PDF content for unit testing\n%%EOF';
  await fs.writeFile(filePath, pdfContent);
  
  return {
    filename,
    originalname: 'test-document.pdf',
    path: filePath,
    size: pdfContent.length,
    mimetype: 'application/pdf'
  };
};

// Create test task document
const createTestTaskDocument = async (taskId, uploadedBy, fileOverrides = {}) => {
  const fileData = await createTestPDFFile();
  
  const document = new TaskDocument({
    taskId,
    filename: fileData.filename,
    originalName: fileData.originalname,
    filePath: fileData.path,
    fileSize: fileData.size,
    mimeType: fileData.mimetype,
    uploadedBy,
    ...fileOverrides
  });
  
  await document.save();
  return document;
};

// Clean up test files
const cleanupTestFiles = async () => {
  const testUploadDir = path.join(__dirname, '../../test-uploads');
  try {
    await fs.rmdir(testUploadDir, { recursive: true });
  } catch (error) {
    // Directory might not exist
  }
};

// Assert error response format
const expectErrorResponse = (response, statusCode, message) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('success', false);
  if (message) {
    expect(response.body.message).toContain(message);
  }
};

// Assert success response format
const expectSuccessResponse = (response, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('data');
};

// Mock file upload data
const mockFileUpload = {
  fieldname: 'documents',
  originalname: 'test-document.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  destination: './test-uploads/tasks',
  filename: 'test-document-123456789.pdf',
  path: './test-uploads/tasks/test-document-123456789.pdf',
  size: 1024
};

module.exports = {
  testUsers,
  createTestUser,
  createTestUsers,
  generateTestToken,
  createTestTask,
  createTestTasks,
  createTestPDFFile,
  createTestTaskDocument,
  cleanupTestFiles,
  expectErrorResponse,
  expectSuccessResponse,
  mockFileUpload
};
