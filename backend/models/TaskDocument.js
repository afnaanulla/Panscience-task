const mongoose = require('mongoose');

const taskDocumentSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Task ID is required']
  },
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true,
    minlength: [1, 'Filename must be at least 1 character'],
    maxlength: [255, 'Filename must be less than 255 characters']
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  filePath: {
    type: String,
    required: [true, 'File path is required'],
    trim: true,
    maxlength: [500, 'File path must be less than 500 characters']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [1, 'File size must be greater than 0']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    enum: {
      values: ['application/pdf'],
      message: 'Only PDF files are allowed'
    }
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploaded by user is required']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
taskDocumentSchema.index({ taskId: 1 });
taskDocumentSchema.index({ uploadedBy: 1 });

// Virtual for human-readable file size
taskDocumentSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Ensure virtual fields are included in JSON
taskDocumentSchema.set('toJSON', { virtuals: true });
taskDocumentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('TaskDocument', taskDocumentSchema);
