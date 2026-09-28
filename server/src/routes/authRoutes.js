import express from 'express';
import {
  loginAdmin,
  getMe,
  logoutUser,
  updateProfile,
  changePassword,
  forceChangePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// General authentication rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 100, // 100 requests per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

// Specific stricter limiter for password reset requests (prevents email spamming)
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 20, // 20 requests per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later'
  }
});

// Public authentication routes
router.post('/login', authLimiter, loginAdmin);
router.post('/logout', logoutUser);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/reset-password', authLimiter, resetPassword);

// Protected routes: Current User Profile & Security
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.route('/change-password').put(protect, changePassword).post(protect, changePassword);
router.route('/force-change-password').put(protect, forceChangePassword).post(protect, forceChangePassword);

export default router;
