import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Dashboard stats route protected by admin & manager authentication
router.get('/stats', protect, requireRole('admin', 'manager'), getDashboardStats);

export default router;
