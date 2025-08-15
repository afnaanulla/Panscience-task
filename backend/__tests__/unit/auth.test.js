const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { 
  createTestUser, 
  testUsers,
  expectErrorResponse,
  expectSuccessResponse 
} = require('../utils/testHelpers');

describe('Authentication Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'password123',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', userData.email);
      expect(response.body.data.user).toHaveProperty('role', userData.role);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should not register user with existing email', async () => {
      // Create a user first
      await createTestUser(testUsers.user1);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUsers.user1.email,
          password: 'password123',
          role: 'user'
        });

      expectErrorResponse(response, 400, 'already exists');
    });

    it('should not register user without required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com'
          // Missing password
        });

      expectErrorResponse(response, 400);
    });

    it('should not register user with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          role: 'user'
        });

      expectErrorResponse(response, 400);
    });

    it('should not register user with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: '123', // Too short
          role: 'user'
        });

      expectErrorResponse(response, 400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await createTestUser(testUsers.user1);
    });

    it('should login user with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.user1.email,
          password: testUsers.user1.password
        });

      expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', testUsers.user1.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should not login user with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.user1.email,
          password: 'wrongpassword'
        });

      expectErrorResponse(response, 400, 'Invalid credentials');
    });

    it('should not login user with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });

      expectErrorResponse(response, 400, 'Invalid credentials');
    });

    it('should not login without required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.user1.email
          // Missing password
        });

      expectErrorResponse(response, 400);
    });
  });

  describe('GET /api/auth/me', () => {
    let user, token;

    beforeEach(async () => {
      user = await createTestUser(testUsers.user1);
      token = jwt.sign(
        { id: user._id, _id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('email', user.email);
      expect(response.body.data).toHaveProperty('role', user.role);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should not get user without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expectErrorResponse(response, 401, 'No token provided');
    });

    it('should not get user with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');

      expectErrorResponse(response, 401, 'Invalid token');
    });

    it('should not get user with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: user._id, _id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expectErrorResponse(response, 401, 'Invalid token');
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving user', async () => {
      const userData = {
        email: 'hashtest@test.com',
        password: 'plainpassword123',
        role: 'user'
      };

      const user = new User(userData);
      await user.save();

      // Password should be hashed
      expect(user.password).not.toBe(userData.password);
      expect(user.password.length).toBeGreaterThan(50); // Hashed passwords are longer
      
      // Should be able to verify the password
      const isValidPassword = await bcrypt.compare(userData.password, user.password);
      expect(isValidPassword).toBe(true);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate valid JWT token', async () => {
      const user = await createTestUser(testUsers.user1);
      
      const token = jwt.sign(
        { id: user._id, _id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Token should be a string
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts

      // Should be able to verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('id', user._id.toString());
      expect(decoded).toHaveProperty('role', user.role);
    });
  });
});
