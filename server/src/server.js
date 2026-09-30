import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import salaryRoutes from './routes/salaryRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import attendanceAdminRoutes from './routes/attendanceAdminRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import performanceRoutes from './routes/performanceRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import activityRoutes from './routes/activityRoutes.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware Imports
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Load environment variables
dotenv.config();

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();

// Security Headers
app.use(helmet());

// Security: Disable X-Powered-By header
app.disable('x-powered-by');

// Database Connection
if (process.env.NODE_ENV !== 'test') {
  connectDB();
  // Verify Brevo HTTPS API service on backend startup
  import('./services/emailService.js').then(({ verifyEmailService, verifySmtpConnection }) => {
    if (typeof verifyEmailService === 'function') {
      verifyEmailService();
    } else if (typeof verifySmtpConnection === 'function') {
      verifySmtpConnection();
    }
  }).catch((err) => {
    console.error('[Email Service] Failed to initialize email service:', err.message);
  });
}

// Security & Utility Middleware
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps or curl/Postman) or if origin is in allowlist
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('CORS blocked access from this origin'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Global Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
  standardHeaders: true, 
  legacyHeaders: false, 
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

import { secureDocumentDownload, secureSubmissionDownload } from './middleware/fileSecurityMiddleware.js';

// Secured file serving for sensitive user uploads (Documents & Submissions)
app.get('/uploads/documents/:filename', secureDocumentDownload);
app.get('/uploads/submissions/:filename', secureSubmissionDownload);

// Static file serving for public uploads (e.g. announcements)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'StaffPulse Employee Management System API is running smoothly',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/attendance/admin', attendanceAdminRoutes);
app.use('/api/admin/attendance', attendanceAdminRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/admin/audit-logs', auditRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/activity', activityRoutes);

import { initializeSocket } from './socket.js';
import http from 'http';

// Error Handling Middleware (must be after routes)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

server.listen(PORT, () => {
  console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[API Base] http://localhost:${PORT}/api`);
});

export default app;
