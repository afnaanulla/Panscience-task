import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;

    if (response) {
      switch (response.status) {
        case 401:
          // Token expired or invalid
          localStorage.removeItem('token');
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            toast.error('Session expired. Please login again.');
            window.location.href = '/login';
          }
          break;
          
        case 403:
          toast.error('Access denied. Insufficient permissions.');
          break;
          
        case 404:
          toast.error('Resource not found.');
          break;
          
        case 422:
          // Validation errors
          if (response.data?.errors) {
            response.data.errors.forEach((err) => {
              toast.error(err.message || 'Validation error');
            });
          } else {
            toast.error('Validation failed.');
          }
          break;
          
        case 500:
          toast.error('Server error. Please try again later.');
          break;
          
        default:
          if (response.data?.message) {
            toast.error(response.data.message);
          } else {
            toast.error('An error occurred. Please try again.');
          }
          break;
      }
    } else if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      toast.error('Network error. Please check your connection.');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please try again.');
    } else {
      toast.error('An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);

export default api;
export { api };
