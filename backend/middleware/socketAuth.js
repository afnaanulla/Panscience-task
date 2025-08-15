const jwt = require('jsonwebtoken');
const { User } = require('../config/database');

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      socket.userEmail = user.email;
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Authentication error: Token expired'));
      } else if (error.name === 'JsonWebTokenError') {
        return next(new Error('Authentication error: Invalid token'));
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication error: Server error'));
  }
};

module.exports = socketAuth;
