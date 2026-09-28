import express from 'express';
import {
  getDashboardSuperStats,
  getWorkforceAnalytics,
  getAttendanceAnalytics,
  getLeaveAnalytics,
  getTaskAnalytics,
  getPerformanceAnalytics,
  getSalaryAnalytics
} from '../controllers/analyticsController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(requireRole('admin'));

router.get('/dashboard', getDashboardSuperStats);
router.get('/workforce', getWorkforceAnalytics);
router.get('/attendance', getAttendanceAnalytics);
router.get('/leave', getLeaveAnalytics);
router.get('/tasks', getTaskAnalytics);
router.get('/performance', getPerformanceAnalytics);
router.get('/salary', getSalaryAnalytics);

export default router;
