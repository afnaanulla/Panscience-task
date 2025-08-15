import api from './api';

const authService = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Verify token
  verifyToken: async () => {
    const response = await api.get('/auth/verify-token');
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Update user profile
  updateProfile: async (userId, profileData) => {
    const response = await api.put(`/users/${userId}`, profileData);
    return response.data;
  },

  // Logout (client-side only - remove token)
  logout: () => {
    localStorage.removeItem('token');
  },
};

export default authService;
