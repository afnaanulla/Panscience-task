import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Calendar, User, FileText, Download, Trash2, Eye } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import LoadingSpinner from '../Common/LoadingSpinner';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTask();
  }, [id]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tasks/${id}`);
      setTask(response.data.data);
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error('Failed to fetch task details');
      navigate('/tasks');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-orange-600 bg-orange-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleDownloadDocument = async (documentId, filename) => {
    try {
      const response = await api.get(`/tasks/${id}/documents/${documentId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const handleViewDocument = (documentId, filename) => {
    try {
      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Open document in new tab with auth header
      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/tasks/${id}/documents/${documentId}/view?token=${token}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to open document');
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Task deleted successfully');
      navigate('/tasks');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Task not found</h3>
          <Link 
            to="/tasks" 
            className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Tasks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          to="/tasks" 
          className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Tasks
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {task.title}
              </h1>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link
                to={`/tasks/${id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Task
              </Link>
              <button
                onClick={handleDeleteTask}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Description
                  </h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {task.description}
                    </p>
                  </div>
                </div>

                {/* Document Attachments */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">
                    Document Attachments
                  </h4>
                  {task.documents && task.documents.length > 0 ? (
                    <div className="space-y-3">
                      {task.documents.map((doc) => (
                        <div key={doc._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center flex-1">
                            <FileText className="h-5 w-5 text-red-500 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {doc.originalName || doc.filename}
                              </p>
                              <p className="text-xs text-gray-500">
                                {doc.fileSize ? `${(doc.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                                {doc.createdAt && ` • Uploaded ${format(new Date(doc.createdAt), 'MMM d, yyyy')}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewDocument(doc._id, doc.originalName || doc.filename)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-600 bg-blue-100 hover:bg-blue-200"
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </button>
                            <button
                              onClick={() => handleDownloadDocument(doc._id, doc.originalName || doc.filename)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                            >
                              <Download className="mr-1 h-3 w-3" />
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">
                        No documents attached to this task
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Task Information
                </h4>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500">Status</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Priority</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Due Date</dt>
                    <dd className="mt-1 flex items-center text-sm text-gray-900">
                      <Calendar className="mr-1 h-4 w-4 text-gray-400" />
                      {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'Not set'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Assigned To</dt>
                    <dd className="mt-1 flex items-center text-sm text-gray-900">
                      <User className="mr-1 h-4 w-4 text-gray-400" />
                      {task.assignedTo ? task.assignedTo.email : 'Not assigned'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Created By</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {task.createdBy ? task.createdBy.email : 'Unknown'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {format(new Date(task.createdAt), 'MMM d, yyyy h:mm a')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {format(new Date(task.updatedAt), 'MMM d, yyyy h:mm a')}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
