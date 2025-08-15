const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { Op } = require('sequelize');
const { User } = require('../config/database');
const { asyncHandler } = require('../middleware/error');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: Filter by role
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [email, role, created_at]
 *           default: created_at
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/', auth, adminAuth, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    role,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = req.query;

  const offset = (page - 1) * limit;
  const whereClause = {};

  // Search filter
  if (search) {
    whereClause.email = {
      [Op.iLike]: `%${search}%`
    };
  }

  // Role filter
  if (role) {
    whereClause.role = role;
  }

  // Get users with pagination
  const { count, rows: users } = await User.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sortBy, sortOrder.toUpperCase()]],
    attributes: { exclude: ['password'] }
  });

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
}));

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Can only view own profile or admin access required
 */
router.get('/:id', auth, [
  param('id').isInt().withMessage('Invalid user ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const userId = parseInt(req.params.id);

  // Users can only view their own profile, admins can view any profile
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view your own profile.'
    });
  }

  const user = await User.findByPk(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: user
  });
}));

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newuser@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *                 example: user
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User created successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/', auth, adminAuth, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email, password, role = 'user' } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Create user
  const user = await User.create({
    email,
    password,
    role
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user
  });
}));

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: updated@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: newpassword123
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 example: user
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Can only update own profile or admin access required
 */
router.put('/:id', auth, [
  param('id').isInt().withMessage('Invalid user ID'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const userId = parseInt(req.params.id);
  const { email, password, role } = req.body;

  // Users can only update their own profile, admins can update any profile
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only update your own profile.'
    });
  }

  // Non-admin users cannot change their role
  if (req.user.role !== 'admin' && role) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You cannot change your role.'
    });
  }

  const user = await User.findByPk(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if email is already taken by another user
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already taken'
      });
    }
  }

  // Update user
  const updateData = {};
  if (email) updateData.email = email;
  if (password) updateData.password = password;
  if (role && req.user.role === 'admin') updateData.role = role;

  await user.update(updateData);

  res.json({
    success: true,
    message: 'User updated successfully',
    data: user
  });
}));

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin access required
 */
router.delete('/:id', auth, adminAuth, [
  param('id').isInt().withMessage('Invalid user ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const userId = parseInt(req.params.id);

  // Prevent admin from deleting themselves
  if (req.user.id === userId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account'
    });
  }

  const user = await User.findByPk(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  await user.destroy();

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

module.exports = router;
