const { ValidationError } = require('sequelize');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('Error:', err);

  // Sequelize Validation Error
  if (err instanceof ValidationError) {
    const message = 'Validation Error';
    const errors = err.errors.map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));
    return res.status(400).json({
      success: false,
      message,
      errors
    });
  }

  // Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Duplicate field value entered';
    const errors = err.errors.map(error => ({
      field: error.path,
      message: `${error.path} must be unique`,
      value: error.value
    }));
    return res.status(400).json({
      success: false,
      message,
      errors
    });
  }

  // Sequelize Foreign Key Constraint Error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = 'Invalid reference to related resource';
    return res.status(400).json({
      success: false,
      message,
      errors: [{
        field: err.fields[0],
        message: 'Referenced resource does not exist',
        value: err.value
      }]
    });
  }

  // Sequelize Database Connection Error
  if (err.name === 'SequelizeConnectionError') {
    const message = 'Database connection error';
    return res.status(500).json({
      success: false,
      message
    });
  }

  // Multer File Upload Errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    return res.status(400).json({
      success: false,
      message,
      errors: [{
        field: 'file',
        message: 'File size exceeds the maximum allowed limit',
        limit: '10MB'
      }]
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files';
    return res.status(400).json({
      success: false,
      message,
      errors: [{
        field: 'files',
        message: 'Maximum 3 files allowed per task',
        limit: 3
      }]
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    return res.status(400).json({
      success: false,
      message,
      errors: [{
        field: err.field,
        message: 'Unexpected file field in upload'
      }]
    });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    return res.status(401).json({
      success: false,
      message
    });
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    return res.status(401).json({
      success: false,
      message
    });
  }

  // Cast Error (Invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    const message = 'Invalid ID format';
    return res.status(400).json({
      success: false,
      message,
      errors: [{
        field: err.path,
        message: 'Invalid ID format',
        value: err.value
      }]
    });
  }

  // Default server error
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
  errorHandler,
  asyncHandler
};
