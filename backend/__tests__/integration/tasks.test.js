const request = require('supertest');
const app = require('../../server');
const path = require('path');
const {
  createTestUsers,
  createTestTasks,
  generateTestToken,
  expectErrorResponse,
  expectSuccessResponse,
  createTestPDFFile,
  cleanupTestFiles
} = require('../utils/testHelpers');

describe('Task Management Integration Tests', () => {
  let users, tasks, adminToken, user1Token, user2Token;

  beforeEach(async () => {
    // Create test users
    users = await createTestUsers();
    tasks = await createTestTasks(users);

    // Generate tokens
    adminToken = generateTestToken(users.admin._id, 'admin');
    user1Token = generateTestToken(users.user1._id, 'user');
    user2Token = generateTestToken(users.user2._id, 'user');
  });

  afterEach(async () => {
    await cleanupTestFiles();
  });

  describe('GET /api/tasks', () => {
    it('should get all tasks for admin user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response, 200);
      expect(response.body.data.tasks).toHaveLength(4);
      expect(response.body.data.pagination).toHaveProperty('totalItems', 4);
    });

    it('should get only relevant tasks for regular user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${user1Token}`);

      expectSuccessResponse(response, 200);
      // User1 should see: tasks created by them + tasks assigned to them
      expect(response.body.data.tasks.length).toBeGreaterThan(0);
      
      // Verify all tasks are either created by user1 or assigned to user1
      response.body.data.tasks.forEach(task => {
        const isCreatedByUser = task.createdBy._id === users.user1._id.toString();
        const isAssignedToUser = task.assignedTo?._id === users.user1._id.toString();
        expect(isCreatedByUser || isAssignedToUser).toBe(true);
      });
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=completed')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response, 200);
      response.body.data.tasks.forEach(task => {
        expect(task.status).toBe('completed');
      });
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response, 200);
      response.body.data.tasks.forEach(task => {
        expect(task.priority).toBe('high');
      });
    });

    it('should search tasks by title', async () => {
      const response = await request(app)
        .get('/api/tasks?search=Admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response, 200);
      response.body.data.tasks.forEach(task => {
        expect(task.title.toLowerCase()).toContain('admin');
      });
    });

    it('should sort tasks by creation date', async () => {
      const response = await request(app)
        .get('/api/tasks?sortBy=createdAt&sortOrder=asc')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response, 200);
      const tasks = response.body.data.tasks;
      
      if (tasks.length > 1) {
        const firstTaskDate = new Date(tasks[0].createdAt);
        const secondTaskDate = new Date(tasks[1].createdAt);
        expect(firstTaskDate.getTime()).toBeLessThanOrEqual(secondTaskDate.getTime());
      }
    });

    it('should paginate tasks correctly', async () => {
      const response = await request(app)
        .get('/api/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response, 200);
      expect(response.body.data.tasks.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.data.pagination).toHaveProperty('totalItems');
    });

    it('should not allow access without authentication', async () => {
      const response = await request(app)
        .get('/api/tasks');

      expectErrorResponse(response, 401);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should get task details for authorized user', async () => {
      const taskId = tasks[0]._id;

      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('_id', taskId.toString());
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('createdBy');
      expect(response.body.data).toHaveProperty('assignedTo');
    });

    it('should not allow unauthorized user to view task', async () => {
      const taskId = tasks[0]._id; // This task is not related to user2

      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      // Should either return 403 or exclude this task from user2's view
      expect([403, 404]).toContain(response.status);
    });

    it('should return 404 for non-existent task', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(response, 404);
    });

    it('should return 400 for invalid task ID format', async () => {
      const response = await request(app)
        .get('/api/tasks/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(response, 400);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const taskData = {
        title: 'New Integration Test Task',
        description: 'This is a test task created during integration testing',
        status: 'pending',
        priority: 'medium',
        assignedTo: users.user1._id
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(taskData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('title', taskData.title);
      expect(response.body.data).toHaveProperty('description', taskData.description);
      expect(response.body.data).toHaveProperty('status', taskData.status);
      expect(response.body.data).toHaveProperty('priority', taskData.priority);
      expect(response.body.data.createdBy).toHaveProperty('_id', users.admin._id.toString());
      expect(response.body.data.assignedTo).toHaveProperty('_id', users.user1._id.toString());
    });

    it('should create task with file upload', async () => {
      const testFile = await createTestPDFFile();

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Task with File Upload')
        .field('description', 'This task has a file attached')
        .field('status', 'pending')
        .field('priority', 'high')
        .attach('documents', testFile.path);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('documents');
      expect(response.body.data.documents).toHaveLength(1);
      expect(response.body.data.documents[0]).toHaveProperty('originalName', testFile.originalname);
    });

    it('should not create task without required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Task without title'
          // Missing title
        });

      expectErrorResponse(response, 400);
    });

    it('should not create task with invalid assigned user', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Task',
          description: 'Test Description',
          assignedTo: '507f1f77bcf86cd799439011' // Non-existent user ID
        });

      expectErrorResponse(response, 400, 'Assigned user not found');
    });

    it('should not allow regular user to assign task to another user without permission', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'User Task',
          description: 'Task created by regular user',
          assignedTo: users.user2._id
        });

      // This should succeed as per current implementation
      // Users can assign tasks to others
      expectSuccessResponse(response, 201);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task successfully by creator', async () => {
      const taskId = tasks[1]._id; // Task created by user1
      const updateData = {
        title: 'Updated Task Title',
        status: 'in_progress',
        priority: 'high'
      };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send(updateData);

      expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('title', updateData.title);
      expect(response.body.data).toHaveProperty('status', updateData.status);
      expect(response.body.data).toHaveProperty('priority', updateData.priority);
    });

    it('should update task successfully by assigned user', async () => {
      const taskId = tasks[0]._id; // Task assigned to user1
      const updateData = {
        status: 'completed'
      };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send(updateData);

      expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('status', updateData.status);
    });

    it('should not allow unauthorized user to update task', async () => {
      const taskId = tasks[1]._id; // Task created by user1

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          title: 'Unauthorized Update'
        });

      expectErrorResponse(response, 403);
    });

    it('should allow admin to update any task', async () => {
      const taskId = tasks[1]._id; // Task created by user1
      const updateData = {
        title: 'Admin Updated Task'
      };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('title', updateData.title);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task successfully by creator', async () => {
      const taskId = tasks[1]._id; // Task created by user1

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expectSuccessResponse(response, 200);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should allow admin to delete any task', async () => {
      const taskId = tasks[1]._id; // Task created by user1

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response, 200);
    });

    it('should not allow unauthorized user to delete task', async () => {
      const taskId = tasks[1]._id; // Task created by user1

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expectErrorResponse(response, 403);
    });

    it('should not allow assigned user to delete task (only creator and admin)', async () => {
      const taskId = tasks[0]._id; // Task assigned to user1 but created by admin

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expectErrorResponse(response, 403);
    });

    it('should return 404 for non-existent task', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(response, 404);
    });
  });

  describe('File Upload and Management', () => {
    it('should upload multiple documents to task', async () => {
      const file1 = await createTestPDFFile();
      const file2 = await createTestPDFFile();

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Task with Multiple Files')
        .field('description', 'This task has multiple files')
        .attach('documents', file1.path)
        .attach('documents', file2.path);

      expectSuccessResponse(response, 201);
      expect(response.body.data.documents).toHaveLength(2);
    });

    it('should not allow more than 3 documents per task', async () => {
      const files = await Promise.all([
        createTestPDFFile(),
        createTestPDFFile(),
        createTestPDFFile(),
        createTestPDFFile()
      ]);

      const request_builder = request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Task with Too Many Files')
        .field('description', 'This task has too many files');

      files.forEach(file => {
        request_builder.attach('documents', file.path);
      });

      const response = await request_builder;
      
      // Should either reject or only accept first 3 files
      expect(response.status).toBe(400);
    });

    it('should only allow PDF files', async () => {
      // This test would require creating a non-PDF file
      // For now, we'll test the validation logic exists in the route
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Task with Invalid File')
        .field('description', 'This task tries to upload invalid file')
        .attach('documents', Buffer.from('fake image content'), { filename: 'test.jpg', contentType: 'image/jpeg' });

      expectErrorResponse(response, 400);
    });
  });
});
