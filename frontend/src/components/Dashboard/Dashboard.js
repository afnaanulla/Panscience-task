import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  Plus,
  Calendar,
} from 'lucide-react';
import { api } from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';
import { format } from 'date-fns';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch tasks for statistics
        const tasksResponse = await api.get('/tasks?limit=100');
        const tasks = tasksResponse.data.data.tasks;

        // Calculate statistics
        const statsData = {
          total: tasks.length,
          pending: tasks.filter((task) => task.status === 'pending').length,
          in_progress: tasks.filter((task) => task.status === 'in_progress').length,
          completed: tasks.filter((task) => task.status === 'completed').length,
          overdue: tasks.filter((task) => {
            if (!task.dueDate || task.status === 'completed') return false;
            return new Date(task.dueDate) < new Date();
          }).length,
        };

        setStats(statsData);

        // Get recent tasks (last 5)
        const recentTasksData = tasks
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentTasks(recentTasksData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div>
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.email?.split('@')[0]}!
        </h1>
        <p className="text-gray-600">Here's an overview of your tasks.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckSquare className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Tasks
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pending}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    In Progress
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.in_progress}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckSquare className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.completed}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Overdue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.overdue}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex space-x-4">
            <Link
              to="/tasks/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Task
            </Link>
            <Link
              to="/tasks"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              View All Tasks
            </Link>
          </div>
        </div>
      </div>

      {/* Recent tasks */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Tasks</h2>
        </div>
        <div className="overflow-hidden">
          {recentTasks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <CheckSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No tasks found. Create your first task to get started!</p>
              <Link
                to="/tasks/new"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {recentTasks.map((task) => (
                <li key={task._id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/tasks/${task._id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500 truncate"
                      >
                        {task.title}
                      </Link>
                      <div className="mt-1 flex items-center space-x-2">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            task.status
                          )}`}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="mr-1 h-3 w-3" />
                            Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-1 text-sm text-gray-500 truncate">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-xs text-gray-500">
                      {format(new Date(task.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {recentTasks.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <Link
              to="/tasks"
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
            >
              View all tasks →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
