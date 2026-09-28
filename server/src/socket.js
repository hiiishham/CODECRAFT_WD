import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import Employee from './models/Employee.js';

dotenv.config();

let io;

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.CLIENT_URL,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication Middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // Attach user payload to socket
      next();
    } catch (err) {
      console.error('[Socket.IO] Auth Error:', err.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user?.id;
    console.log(`[Socket.IO] Client connected: ${socket.id} (User: ${userId})`);

    // Join user-specific room for Admin account ID
    if (userId) {
      const userRoom = `user:${userId}`;
      socket.join(userRoom);
      console.log(`[Socket.IO] Socket ${socket.id} joined room ${userRoom}`);
    }

    // Also join employee-specific room if employee profile exists
    try {
      if (socket.user?.email) {
        const emp = await Employee.findOne({
          email: socket.user.email.toLowerCase().trim(),
        }).select('_id');
        if (emp && emp._id.toString() !== userId?.toString()) {
          const empRoom = `user:${emp._id}`;
          socket.join(empRoom);
          console.log(`[Socket.IO] Socket ${socket.id} also joined employee room ${empRoom}`);
        }
      }
    } catch (empErr) {
      // Non-critical background resolution failure
    }

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};
