const express = require('express');
const { param, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs').promises;
const { TaskDocument, Task } = require('../config/database');
const { asyncHandler } = require('../middleware/error');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/files/download/{documentId}:
 *   get:
 *     summary: Download a task document
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Document ID
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Document not found
 *       403:
 *         description: Access denied
 */
router.get('/download/:documentId', auth, [
  param('documentId').isInt().withMessage('Invalid document ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const documentId = parseInt(req.params.documentId);

  // Find document with associated task
  const document = await TaskDocument.findByPk(documentId, {
    include: [{
      model: Task,
      as: 'task',
      attributes: ['id', 'assigned_to', 'created_by', 'title']
    }]
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  const task = document.task;

  // Check if user has access to this document
  if (req.user.role !== 'admin' && 
      task.assigned_to !== req.user.id && 
      task.created_by !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only download documents from tasks assigned to you or created by you.'
    });
  }

  try {
    // Check if file exists
    await fs.access(document.file_path);

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Length', document.file_size);

    // Send file
    res.sendFile(path.resolve(document.file_path));
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
 * /api/files/view/{documentId}:
 *   get:
 *     summary: View a task document in browser
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Document ID
 *     responses:
 *       200:
 *         description: File viewed successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Document not found
 *       403:
 *         description: Access denied
 */
router.get('/view/:documentId', auth, [
  param('documentId').isInt().withMessage('Invalid document ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const documentId = parseInt(req.params.documentId);

  // Find document with associated task
  const document = await TaskDocument.findByPk(documentId, {
    include: [{
      model: Task,
      as: 'task',
      attributes: ['id', 'assigned_to', 'created_by', 'title']
    }]
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  const task = document.task;

  // Check if user has access to this document
  if (req.user.role !== 'admin' && 
      task.assigned_to !== req.user.id && 
      task.created_by !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view documents from tasks assigned to you or created by you.'
    });
  }

  try {
    // Check if file exists
    await fs.access(document.file_path);

    // Set appropriate headers for inline viewing
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Length', document.file_size);
    res.setHeader('Content-Disposition', `inline; filename="${document.filename}"`);

    // Send file for viewing in browser
    res.sendFile(path.resolve(document.file_path));
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
 * /api/files/task/{taskId}/documents:
 *   get:
 *     summary: Get all documents for a task
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TaskDocument'
 *       404:
 *         description: Task not found
 *       403:
 *         description: Access denied
 */
router.get('/task/:taskId/documents', auth, [
  param('taskId').isInt().withMessage('Invalid task ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const taskId = parseInt(req.params.taskId);

  // Find task first to check access
  const task = await Task.findByPk(taskId);

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
      message: 'Access denied. You can only view documents from tasks assigned to you or created by you.'
    });
  }

  // Get all documents for the task
  const documents = await TaskDocument.findAll({
    where: { task_id: taskId },
    attributes: ['id', 'filename', 'file_size', 'mime_type', 'uploaded_by', 'created_at'],
    order: [['created_at', 'DESC']]
  });

  res.json({
    success: true,
    data: documents
  });
}));

/**
 * @swagger
 * /api/files/document/{documentId}:
 *   delete:
 *     summary: Delete a task document
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document deleted successfully
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
 *                   example: Document deleted successfully
 *       404:
 *         description: Document not found
 *       403:
 *         description: Access denied
 */
router.delete('/document/:documentId', auth, [
  param('documentId').isInt().withMessage('Invalid document ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const documentId = parseInt(req.params.documentId);

  // Find document with associated task
  const document = await TaskDocument.findByPk(documentId, {
    include: [{
      model: Task,
      as: 'task',
      attributes: ['id', 'assigned_to', 'created_by', 'title']
    }]
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  const task = document.task;

  // Only admin, task creator, or document uploader can delete the document
  if (req.user.role !== 'admin' && 
      task.created_by !== req.user.id && 
      document.uploaded_by !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only delete documents you uploaded or from tasks you created.'
    });
  }

  try {
    // Delete the physical file
    await fs.unlink(document.file_path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Failed to delete file: ${document.file_path}`, error);
    }
  }

  // Delete the document record
  await document.destroy();

  res.json({
    success: true,
    message: 'Document deleted successfully'
  });
}));

/**
 * @swagger
 * /api/files/document/{documentId}/info:
 *   get:
 *     summary: Get document information
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TaskDocument'
 *       404:
 *         description: Document not found
 *       403:
 *         description: Access denied
 */
router.get('/document/:documentId/info', auth, [
  param('documentId').isInt().withMessage('Invalid document ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const documentId = parseInt(req.params.documentId);

  // Find document with associated task
  const document = await TaskDocument.findByPk(documentId, {
    include: [{
      model: Task,
      as: 'task',
      attributes: ['id', 'assigned_to', 'created_by', 'title']
    }]
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  const task = document.task;

  // Check if user has access to this document
  if (req.user.role !== 'admin' && 
      task.assigned_to !== req.user.id && 
      task.created_by !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view document info from tasks assigned to you or created by you.'
    });
  }

  res.json({
    success: true,
    data: {
      id: document.id,
      filename: document.filename,
      file_size: document.file_size,
      mime_type: document.mime_type,
      uploaded_by: document.uploaded_by,
      created_at: document.created_at,
      task: {
        id: task.id,
        title: task.title
      }
    }
  });
}));

module.exports = router;
