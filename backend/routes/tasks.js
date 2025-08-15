const express = require('express');
const { body, validationResult, param } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const TaskDocument = require('../models/TaskDocument');
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
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by assigned user ID
 *       - in: query
 *         name: createdBy
 *         schema:
 *           type: string
 *         description: Filter by creator user ID
 *       - in: query
 *         name: dueDateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter tasks with due date from this date
 *       - in: query
 *         name: dueDateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter tasks with due date until this date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, status, priority, dueDate, createdAt]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 */
router.get('/', auth, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    priority,
    assignedTo,
    createdBy,
    dueDateFrom,
    dueDateTo,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build query
  let query = {};

  // Non-admin users can only see tasks assigned to them or created by them
  if (req.user.role !== 'admin') {
    query = {
      $or: [
        { assignedTo: req.user._id },
        { createdBy: req.user._id }
      ]
    };
  }

  // Search filter
  if (search) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    });
  }

  // Status filter
  if (status) {
    query.status = status;
  }

  // Priority filter
  if (priority) {
    query.priority = priority;
  }

  // Assigned to filter
  if (assignedTo) {
    query.assignedTo = assignedTo;
  }

  // Created by filter
  if (createdBy) {
    query.createdBy = createdBy;
  }

  // Due date filters
  if (dueDateFrom || dueDateTo) {
    query.dueDate = {};
    if (dueDateFrom) {
      query.dueDate.$gte = new Date(dueDateFrom);
    }
    if (dueDateTo) {
      query.dueDate.$lte = new Date(dueDateTo);
    }
  }

  // Build sort object
  const sortObj = {};
  sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

  try {
    const [tasks, totalItems] = await Promise.all([
      Task.find(query)
        .populate('assignedTo', 'email')
        .populate('createdBy', 'email')
        .populate('documents')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      Task.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks'
    });
  }
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
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *       404:
 *         description: Task not found
 */
router.get('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid task ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'email')
    .populate('createdBy', 'email')
    .populate('documents');

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  // Check if user has permission to view this task
  if (req.user.role !== 'admin' && 
      !task.assignedTo?.equals(req.user._id) && 
      !task.createdBy.equals(req.user._id)) {
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
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               dueDate:
 *                 type: string
 *                 format: date
 *               assignedTo:
 *                 type: string
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 */
router.post('/', [
  auth,
  upload.array('documents', 3),
  body('title')
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed'])
    .withMessage('Status must be one of: pending, in_progress, completed'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('assignedTo')
    .optional()
    .isMongoId()
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

  const { title, description, status, priority, dueDate, assignedTo } = req.body;

  // Validate assigned user exists if provided
  if (assignedTo) {
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(400).json({
        success: false,
        message: 'Assigned user not found'
      });
    }
  }

  try {
    // Create task
    const task = new Task({
      title,
      description,
      status: status || 'pending',
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assignedTo: assignedTo || null,
      createdBy: req.user._id
    });

    await task.save();

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      const documentPromises = req.files.map(file => {
        const document = new TaskDocument({
          taskId: task._id,
          filename: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: req.user._id
        });
        return document.save();
      });

      const documents = await Promise.all(documentPromises);
      task.documents = documents.map(doc => doc._id);
      await task.save();
    }

    // Populate task for response
    await task.populate('assignedTo', 'email');
    await task.populate('createdBy', 'email');
    await task.populate('documents');

    // Emit real-time event
    const io = req.app.get('io');
    if (assignedTo && assignedTo !== req.user._id.toString()) {
      io.to(`user_${assignedTo}`).emit('taskAssigned', {
        task,
        assignedBy: req.user.email
      });
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating task'
    });
  }
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
 *           type: string
 *         description: Task ID
 */
router.put('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid task ID'),
  upload.array('documents', 3),
  body('title')
    .optional()
    .notEmpty()
    .withMessage('Task title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed'])
    .withMessage('Status must be one of: pending, in_progress, completed'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('assignedTo')
    .optional()
    .isMongoId()
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

  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  // Check permissions - Allow admins, task creators, and assigned users to update
  if (req.user.role !== 'admin' && 
      !task.createdBy.equals(req.user._id) &&
      (!task.assignedTo || !task.assignedTo.equals(req.user._id))) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only admins, task creators, and assigned users can update tasks.'
    });
  }

  const { title, description, status, priority, dueDate, assignedTo } = req.body;
  const oldAssignedTo = task.assignedTo?.toString();

  // Validate assigned user exists if provided
  if (assignedTo && assignedTo !== 'null') {
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(400).json({
        success: false,
        message: 'Assigned user not found'
      });
    }
  }

  try {
    // Update task fields
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (assignedTo !== undefined) task.assignedTo = assignedTo === 'null' ? null : assignedTo;

    await task.save();

    // Handle new file uploads
    if (req.files && req.files.length > 0) {
      // Check if adding files would exceed limit
      const currentDocCount = await TaskDocument.countDocuments({ taskId: task._id });
      if (currentDocCount + req.files.length > 3) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 3 documents allowed per task'
        });
      }

      const documentPromises = req.files.map(file => {
        const document = new TaskDocument({
          taskId: task._id,
          filename: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: req.user._id
        });
        return document.save();
      });

      const newDocuments = await Promise.all(documentPromises);
      task.documents.push(...newDocuments.map(doc => doc._id));
      await task.save();
    }

    // Populate task for response
    await task.populate('assignedTo', 'email');
    await task.populate('createdBy', 'email');
    await task.populate('documents');

    // Emit real-time events
    const io = req.app.get('io');
    const newAssignedTo = task.assignedTo?.toString();

    if (newAssignedTo && newAssignedTo !== oldAssignedTo) {
      // Task reassigned
      io.to(`user_${newAssignedTo}`).emit('taskAssigned', {
        task,
        assignedBy: req.user.email
      });
    }

    // Notify about task update
    if (newAssignedTo) {
      io.to(`user_${newAssignedTo}`).emit('taskUpdated', task);
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task'
    });
  }
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
 *           type: string
 *         description: Task ID
 */
router.delete('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid task ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  // Check permissions
  if (req.user.role !== 'admin' && !task.createdBy.equals(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only task creators and admins can delete tasks.'
    });
  }

  try {
    // Delete associated documents
    const documents = await TaskDocument.find({ taskId: task._id });
    
    // Delete physical files
    for (const doc of documents) {
      try {
        await fs.unlink(doc.filePath);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }

    // Delete document records
    await TaskDocument.deleteMany({ taskId: task._id });

    // Delete task
    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task'
    });
  }
}));

/**
 * @swagger
 * /api/tasks/{id}/documents/{documentId}/download:
 *   get:
 *     summary: Download a task document
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 */
router.get('/:id/documents/:documentId/download', [
  auth,
  param('id').isMongoId().withMessage('Invalid task ID'),
  param('documentId').isMongoId().withMessage('Invalid document ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  // Check if user has access to this task
  if (req.user.role !== 'admin' && 
      !task.assignedTo?.equals(req.user._id) && 
      !task.createdBy.equals(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only download documents from tasks assigned to you or created by you.'
    });
  }

  const document = await TaskDocument.findOne({ 
    _id: req.params.documentId, 
    taskId: req.params.id 
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  try {
    // Check if file exists
    await fs.access(document.filePath);

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Length', document.fileSize);

    // Send file
    res.sendFile(path.resolve(document.filePath));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }
    throw error;
  }
}));

/**
 * @swagger
 * /api/tasks/{id}/documents/{documentId}/view:
 *   get:
 *     summary: View a task document in browser
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 */
router.get('/:id/documents/:documentId/view', [
  param('id').isMongoId().withMessage('Invalid task ID'),
  param('documentId').isMongoId().withMessage('Invalid document ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  // Handle authentication via query parameter or header
  let token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Verify and decode token
  let user;
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('../models/User');
    user = await User.findById(decoded.id || decoded._id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }

  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  // Check if user has access to this task
  if (user.role !== 'admin' && 
      !task.assignedTo?.equals(user._id) && 
      !task.createdBy.equals(user._id)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view documents from tasks assigned to you or created by you.'
    });
  }

  const document = await TaskDocument.findOne({ 
    _id: req.params.documentId, 
    taskId: req.params.id 
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  try {
    // Check if file exists
    await fs.access(document.filePath);

    // Set appropriate headers for inline viewing
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Length', document.fileSize);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);

    // Send file for viewing in browser
    res.sendFile(path.resolve(document.filePath));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }
    throw error;
  }
}));

/**
 * @swagger
 * /api/tasks/{id}/documents/{documentId}:
 *   delete:
 *     summary: Delete a task document
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 */
router.delete('/:id/documents/:documentId', [
  auth,
  param('id').isMongoId().withMessage('Invalid task ID'),
  param('documentId').isMongoId().withMessage('Invalid document ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  const document = await TaskDocument.findOne({ 
    _id: req.params.documentId, 
    taskId: req.params.id 
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Only admin, task creator, or document uploader can delete the document
  if (req.user.role !== 'admin' && 
      !task.createdBy.equals(req.user._id) &&
      !document.uploadedBy.equals(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only delete documents you uploaded or from tasks you created.'
    });
  }

  try {
    // Delete the physical file
    try {
      await fs.unlink(document.filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`Failed to delete file: ${document.filePath}`, error);
      }
    }

    // Remove document from task's documents array
    task.documents = task.documents.filter(docId => !docId.equals(document._id));
    await task.save();

    // Delete the document record
    await TaskDocument.findByIdAndDelete(document._id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting document'
    });
  }
}));

module.exports = router;
