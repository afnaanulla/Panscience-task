const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Task, User, TaskDocument } = require('../config/database');
const { asyncHandler } = require('../middleware/error');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/tasks');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 3 // Maximum 3 files
  }
});

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
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
 *         description: Search in title and description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by priority
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: integer
 *         description: Filter by assigned user ID
 *       - in: query
 *         name: created_by
 *         schema:
 *           type: integer
 *         description: Filter by creator user ID
 *       - in: query
 *         name: due_date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter tasks with due date from this date
 *       - in: query
 *         name: due_date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter tasks with due date until this date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, status, priority, due_date, created_at]
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
 *         description: Tasks retrieved successfully
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
 *                     tasks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
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
 */
router.get('/', auth, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    priority,
    assigned_to,
    created_by,
    due_date_from,
    due_date_to,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = req.query;

  const offset = (page - 1) * limit;
  const whereClause = {};

  // Non-admin users can only see tasks assigned to them or created by them
  if (req.user.role !== 'admin') {
    whereClause[Op.or] = [
      { assigned_to: req.user.id },
      { created_by: req.user.id }
    ];
  }

  // Search filter
  if (search) {
    whereClause[Op.and] = whereClause[Op.and] || [];
    whereClause[Op.and].push({
      [Op.or]: [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ]
    });
  }

  // Status filter
  if (status) {
    whereClause.status = status;
  }

  // Priority filter
  if (priority) {
    whereClause.priority = priority;
  }

  // Assigned to filter
  if (assigned_to) {
    whereClause.assigned_to = assigned_to;
  }

  // Created by filter
  if (created_by) {
    whereClause.created_by = created_by;
  }

  // Due date filters
  if (due_date_from || due_date_to) {
    whereClause.due_date = {};
    if (due_date_from) {
      whereClause.due_date[Op.gte] = new Date(due_date_from);
    }
    if (due_date_to) {
      whereClause.due_date[Op.lte] = new Date(due_date_to);
    }
  }

  // Get tasks with pagination and associations
  const { count, rows: tasks } = await Task.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sortBy, sortOrder.toUpperCase()]],
    include: [
      {
        model: User,
        as: 'assignedUser',
        attributes: ['id', 'email']
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'email']
      },
      {
        model: TaskDocument,
        as: 'documents',
        attributes: ['id', 'filename', 'file_size', 'mime_type', 'created_at']
      }
    ]
  });

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    data: {
      tasks,
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
 * /api/tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 *       403:
 *         description: Access denied
 */
router.get('/:id', auth, [
  param('id').isInt().withMessage('Invalid task ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const taskId = parseInt(req.params.id);

  const task = await Task.findByPk(taskId, {
    include: [
      {
        model: User,
        as: 'assignedUser',
        attributes: ['id', 'email']
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'email']
      },
      {
        model: TaskDocument,
        as: 'documents',
        attributes: ['id', 'filename', 'file_size', 'mime_type', 'created_at']
      }
    ]
  });

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  // Check if user has access to this task
  if (req.user.role !== 'admin' && 
      task.assigned_to !== req.user.id && 
      task.created_by !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view tasks assigned to you or created by you.'
    });
  }

  res.json({
    success: true,
    data: task
  });
}));

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Complete project documentation
 *               description:
 *                 type: string
 *                 example: Write comprehensive documentation for the project
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *                 default: pending
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 example: 2023-12-31T23:59:59Z
 *               assigned_to:
 *                 type: integer
 *                 example: 2
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Task created successfully
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
 *                   example: Task created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 */
router.post('/', auth, upload.array('documents', 3), [
  body('title')
    .notEmpty()
    .trim()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed'])
    .withMessage('Status must be pending, in_progress, or completed'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('assigned_to')
    .optional()
    .isInt()
    .withMessage('Assigned to must be a valid user ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const {
    title,
    description,
    status = 'pending',
    priority = 'medium',
    due_date,
    assigned_to
  } = req.body;

  // Validate assigned_to user exists if provided
  if (assigned_to) {
    const assignedUser = await User.findByPk(assigned_to);
    if (!assignedUser) {
      return res.status(400).json({
        success: false,
        message: 'Assigned user not found'
      });
    }
  }

  // Create task
  const task = await Task.create({
    title,
    description: description || null,
    status,
    priority,
    due_date: due_date ? new Date(due_date) : null,
    assigned_to: assigned_to || null,
    created_by: req.user.id
  });

  // Handle file uploads
  if (req.files && req.files.length > 0) {
    const documentPromises = req.files.map(file => 
      TaskDocument.create({
        task_id: task.id,
        filename: file.originalname,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        uploaded_by: req.user.id
      })
    );

    await Promise.all(documentPromises);
  }

  // Fetch the complete task with associations
  const createdTask = await Task.findByPk(task.id, {
    include: [
      {
        model: User,
        as: 'assignedUser',
        attributes: ['id', 'email']
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'email']
      },
      {
        model: TaskDocument,
        as: 'documents',
        attributes: ['id', 'filename', 'file_size', 'mime_type', 'created_at']
      }
    ]
  });

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  if (assigned_to && assigned_to !== req.user.id) {
    io.to(`user_${assigned_to}`).emit('taskAssigned', {
      task: createdTask,
      message: `You have been assigned a new task: ${title}`
    });
  }

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: createdTask
  });
}));

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated task title
 *               description:
 *                 type: string
 *                 example: Updated task description
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               due_date:
 *                 type: string
 *                 format: date-time
 *               assigned_to:
 *                 type: integer
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Task updated successfully
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
 *                   example: Task updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 *       403:
 *         description: Access denied
 */
router.put('/:id', auth, upload.array('documents', 3), [
  param('id').isInt().withMessage('Invalid task ID'),
  body('title')
    .optional()
    .notEmpty()
    .trim()
    .withMessage('Title cannot be empty')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed'])
    .withMessage('Status must be pending, in_progress, or completed'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('assigned_to')
    .optional()
    .isInt()
    .withMessage('Assigned to must be a valid user ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const taskId = parseInt(req.params.id);
  const {
    title,
    description,
    status,
    priority,
    due_date,
    assigned_to
  } = req.body;

  const task = await Task.findByPk(taskId);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  // Check if user has permission to update this task
  if (req.user.role !== 'admin' && 
      task.created_by !== req.user.id && 
      task.assigned_to !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only update tasks assigned to you or created by you.'
    });
  }

  // Validate assigned_to user exists if provided
  if (assigned_to) {
    const assignedUser = await User.findByPk(assigned_to);
    if (!assignedUser) {
      return res.status(400).json({
        success: false,
        message: 'Assigned user not found'
      });
    }
  }

  // Store old assigned user for notifications
  const oldAssignedTo = task.assigned_to;

  // Update task
  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (due_date !== undefined) updateData.due_date = due_date ? new Date(due_date) : null;
  if (assigned_to !== undefined) updateData.assigned_to = assigned_to || null;

  await task.update(updateData);

  // Handle file uploads
  if (req.files && req.files.length > 0) {
    // Check current document count
    const currentDocCount = await TaskDocument.count({ where: { task_id: taskId } });
    if (currentDocCount + req.files.length > 3) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 3 documents allowed per task'
      });
    }

    const documentPromises = req.files.map(file => 
      TaskDocument.create({
        task_id: taskId,
        filename: file.originalname,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        uploaded_by: req.user.id
      })
    );

    await Promise.all(documentPromises);
  }

  // Fetch the updated task with associations
  const updatedTask = await Task.findByPk(taskId, {
    include: [
      {
        model: User,
        as: 'assignedUser',
        attributes: ['id', 'email']
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'email']
      },
      {
        model: TaskDocument,
        as: 'documents',
        attributes: ['id', 'filename', 'file_size', 'mime_type', 'created_at']
      }
    ]
  });

  // Emit socket events for real-time updates
  const io = req.app.get('io');
  
  // Notify old assignee if task was reassigned
  if (oldAssignedTo && oldAssignedTo !== assigned_to) {
    io.to(`user_${oldAssignedTo}`).emit('taskUnassigned', {
      task: updatedTask,
      message: `Task "${task.title}" has been reassigned`
    });
  }

  // Notify new assignee if task was assigned
  if (assigned_to && assigned_to !== oldAssignedTo && assigned_to !== req.user.id) {
    io.to(`user_${assigned_to}`).emit('taskAssigned', {
      task: updatedTask,
      message: `You have been assigned task: ${task.title}`
    });
  }

  // Notify task creator and current assignee about updates
  const notifyUsers = [task.created_by];
  if (task.assigned_to && !notifyUsers.includes(task.assigned_to)) {
    notifyUsers.push(task.assigned_to);
  }

  notifyUsers.forEach(userId => {
    if (userId !== req.user.id) {
      io.to(`user_${userId}`).emit('taskUpdated', {
        task: updatedTask,
        message: `Task "${task.title}" has been updated`
      });
    }
  });

  res.json({
    success: true,
    message: 'Task updated successfully',
    data: updatedTask
  });
}));

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
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
 *                   example: Task deleted successfully
 *       404:
 *         description: Task not found
 *       403:
 *         description: Access denied
 */
router.delete('/:id', auth, [
  param('id').isInt().withMessage('Invalid task ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const taskId = parseInt(req.params.id);

  const task = await Task.findByPk(taskId, {
    include: [{
      model: TaskDocument,
      as: 'documents'
    }]
  });

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  // Only admin or task creator can delete the task
  if (req.user.role !== 'admin' && task.created_by !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only task creator or admin can delete this task.'
    });
  }

  // Delete associated files
  if (task.documents && task.documents.length > 0) {
    const deleteFilePromises = task.documents.map(async (doc) => {
      try {
        await fs.unlink(doc.file_path);
      } catch (error) {
        console.error(`Failed to delete file: ${doc.file_path}`, error);
      }
    });

    await Promise.all(deleteFilePromises);
  }

  // Delete task (documents will be deleted by cascade)
  await task.destroy();

  // Emit socket event
  const io = req.app.get('io');
  if (task.assigned_to && task.assigned_to !== req.user.id) {
    io.to(`user_${task.assigned_to}`).emit('taskDeleted', {
      taskId: task.id,
      message: `Task "${task.title}" has been deleted`
    });
  }

  res.json({
    success: true,
    message: 'Task deleted successfully'
  });
}));

module.exports = router;
