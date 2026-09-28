import express from 'express';
import {
  getOverview,
  getDepartmentReport,
  getEmployeeExport,
  getLeaveReport,
  getJoiningTrends,
} from '../controllers/reportController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// All report routes are protected and require admin or manager role
router.get('/overview', protect, requireRole('admin', 'manager'), getOverview);
router.get('/departments', protect, requireRole('admin', 'manager'), getDepartmentReport);
router.get('/employees', protect, requireRole('admin'), getEmployeeExport);
router.get('/leaves', protect, requireRole('admin', 'manager'), getLeaveReport);
router.get('/joining-trends', protect, requireRole('admin', 'manager'), getJoiningTrends);

export default router;
