import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

let socket = null;

export const initializeSocket = (userId) => {
  if (socket) {
    socket.disconnect();
  }

  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No auth token found for socket connection');
    return;
  }

  socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000', {
    auth: {
      token
    },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  // Task-related events
  socket.on('taskAssigned', (data) => {
    toast.success(`New task assigned: ${data.task.title}`);
  });

  socket.on('taskUpdated', (task) => {
    toast.info(`Task updated: ${task.title}`);
  });

  socket.on('taskStatusChanged', (data) => {
    toast.info(`Task "${data.task.title}" status changed to ${data.task.status}`);
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export { socket };
