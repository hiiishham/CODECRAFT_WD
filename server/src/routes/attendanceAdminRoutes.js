import express from 'express';
import {
  getTodayWorkforce,
  getAttendanceHistory,
  getDashboardSummary,
  getEmployeeAttendanceDetails,
  updateAttendance,
  exportAttendance,
} from '../controllers/attendanceAdminController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes here are admin only
router.use(protect);
router.use(requireRole('admin'));

// Export route (must be before /:employeeId to prevent param matching)
router.get('/export', exportAttendance);

// Summary stats for dashboard
router.get('/summary', getDashboardSummary);

// Today's workforce view
router.get('/today', getTodayWorkforce);

// All attendance history with pagination/filters
router.get('/', getAttendanceHistory);

// Specific employee attendance details
router.get('/:employeeId', getEmployeeAttendanceDetails);

// Update/correct attendance record
router.put('/:id', updateAttendance);

export default router;
