const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../server');
const { 
  createTestUser, 
  generateToken, 
  expectSuccess, 
  expectError 
} = require('../utils/testHelpers');

describe('User Management Integration Tests', () => {
  let adminToken;
  let userToken;
  let testUserId;
  let adminUserId;

  beforeEach(async () => {
    // Create admin user and get token
    const admin = await createTestUser({ role: 'admin' });
    adminToken = generateToken(admin._id);
    adminUserId = admin._id;

    // Create regular user and get token
    const user = await createTestUser({ role: 'user' });
    userToken = generateToken(user._id);
    testUserId = user._id;
  });

  describe('GET /api/users', () => {
    it('should get all users as admin', async () => {
      await createTestUser({ email: 'extra@test.com' });

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccess(response, 200);
      expect(response.body.data.users).toHaveLength(3); // 2 created + 1 extra
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should not allow regular user to get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expectError(response, 403);
    });

    it('should support pagination and filtering', async () => {
      await createTestUser({ email: 'filtered@test.com', role: 'user' });

      const response = await request(app)
        .get('/api/users?page=1&limit=1&role=user')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccess(response, 200);
      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.users[0].role).toBe('user');
    });

    it('should search users by name and email', async () => {
      await createTestUser({ name: 'John Doe', email: 'john@test.com' });
      await createTestUser({ name: 'Jane Smith', email: 'jane@test.com' });

      const response = await request(app)
        .get('/api/users?search=john')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccess(response, 200);
      expect(response.body.data.users.length).toBeGreaterThan(0);
      expect(response.body.data.users.some(user => 
        user.name.toLowerCase().includes('john') || user.email.toLowerCase().includes('john')
      )).toBe(true);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID as admin', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccess(response, 200);
      expect(response.body.data._id).toBe(testUserId.toString());
      expect(response.body.data.password).toBeUndefined();
    });

    it('should allow user to get their own profile', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccess(response, 200);
      expect(response.body.data._id).toBe(testUserId.toString());
    });

    it('should not allow user to get other user profiles', async () => {
      const response = await request(app)
        .get(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectError(response, 403);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectError(response, 404);
    });
  });

  describe('POST /api/users', () => {
    it('should create user as admin', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@test.com',
        password: 'password123',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expectSuccess(response, 201);
      expect(response.body.data.name).toBe(userData.name);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.role).toBe(userData.role);
      expect(response.body.data.password).toBeUndefined();
    });

    it('should not allow regular user to create users', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@test.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send(userData);

      expectError(response, 403);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expectError(response, 400);
      expect(response.body.errors).toBeDefined();
    });

    it('should not allow duplicate email', async () => {
      const existingUser = await createTestUser({ email: 'existing@test.com' });
      
      const userData = {
        name: 'Duplicate User',
        email: 'existing@test.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expectError(response, 400);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user as admin', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@test.com',
        role: 'admin'
      };

      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expectSuccess(response, 200);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.email).toBe(updateData.email);
      expect(response.body.data.role).toBe(updateData.role);
    });

    it('should not allow regular user to update users', async () => {
      const response = await request(app)
        .put(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hacked' });

      expectError(response, 403);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' });

      expectError(response, 404);
    });

    it('should validate email uniqueness on update', async () => {
      const existingUser = await createTestUser({ email: 'existing@test.com' });
      
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'existing@test.com' });

      expectError(response, 400);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should allow user to update own profile', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'newemail@test.com'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expectSuccess(response, 200);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.email).toBe(updateData.email);
    });

    it('should require current password to change password', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          password: 'newpassword123'
        });

      expectError(response, 400);
      expect(response.body.errors.some(err => err.msg.includes('Current password'))).toBe(true);
    });

    it('should change password with valid current password', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          password: 'newpassword123',
          currentPassword: 'password123' // Default password from createTestUser
        });

      expectSuccess(response, 200);
      expect(response.body.message).toContain('updated successfully');
    });

    it('should reject incorrect current password', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          password: 'newpassword123',
          currentPassword: 'wrongpassword'
        });

      expectError(response, 400);
      expect(response.body.message).toContain('Current password is incorrect');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user as admin', async () => {
      const userToDelete = await createTestUser({ email: 'delete@test.com' });
      
      const response = await request(app)
        .delete(`/api/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccess(response, 200);
      expect(response.body.message).toContain('deleted successfully');

      // Verify user is deleted
      const User = require('../../models/User');
      const deletedUser = await User.findById(userToDelete._id);
      expect(deletedUser).toBeNull();
    });

    it('should not allow regular user to delete users', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectError(response, 403);
    });

    it('should not allow admin to delete themselves', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectError(response, 400);
      expect(response.body.message).toContain('cannot delete your own account');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectError(response, 404);
    });
  });

  describe('User CRUD Authorization Tests', () => {
    it('should require authentication for all user endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/users' },
        { method: 'get', path: `/api/users/${testUserId}` },
        { method: 'post', path: '/api/users' },
        { method: 'put', path: `/api/users/${testUserId}` },
        { method: 'put', path: '/api/users/profile' },
        { method: 'delete', path: `/api/users/${testUserId}` }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
      }
    });

    it('should validate MongoDB ObjectId format', async () => {
      const invalidId = 'invalid-id';
      
      const endpoints = [
        { method: 'get', path: `/api/users/${invalidId}` },
        { method: 'put', path: `/api/users/${invalidId}` },
        { method: 'delete', path: `/api/users/${invalidId}` }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${adminToken}`);
        expectError(response, 400);
        expect(response.body.message).toContain('Validation failed');
      }
    });
  });

  describe('User Validation Tests', () => {
    it('should validate name length', async () => {
      const userData = {
        name: 'A', // Too short
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expectError(response, 400);
      expect(response.body.errors.some(err => err.msg.includes('at least 2 characters'))).toBe(true);
    });

    it('should validate email format', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expectError(response, 400);
      expect(response.body.errors.some(err => err.msg.includes('valid email'))).toBe(true);
    });

    it('should validate password length', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123' // Too short
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expectError(response, 400);
      expect(response.body.errors.some(err => err.msg.includes('at least 6 characters'))).toBe(true);
    });

    it('should validate role values', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'invalid-role'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expectError(response, 400);
      expect(response.body.errors.some(err => err.msg.includes('user or admin'))).toBe(true);
    });
  });
});
