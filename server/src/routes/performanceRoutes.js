import express from 'express';
import {
  getPerformances,
  getPerformanceById,
  getPerformanceStats,
  createPerformance,
  updatePerformance,
  getMyPerformances,
  getMyPerformanceById,
  getMyPerformanceSummary,
  getEmployeePerformanceSummary,
} from '../controllers/performanceController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all performance routes
router.use(protect);

// Employee-specific endpoints (must come before /:id)
router.get('/my', requireRole('employee'), getMyPerformances);
router.get('/my/summary', requireRole('employee'), getMyPerformanceSummary);
router.get('/summary/me', requireRole('employee'), getMyPerformanceSummary);
router.get('/my/:id', requireRole('employee'), getMyPerformanceById);

// Admin/Manager stats
router.get('/stats', requireRole('admin', 'manager'), getPerformanceStats);

// Admin/Manager: employee summary by employeeId
router.get('/summary/:employeeId', requireRole('admin', 'manager'), getEmployeePerformanceSummary);

// Admin/Manager CRUD
router
  .route('/')
  .get(requireRole('admin', 'manager'), getPerformances)
  .post(requireRole('admin', 'manager'), createPerformance);

router
  .route('/:id')
  .get(requireRole('admin', 'manager'), getPerformanceById)
  .put(requireRole('admin', 'manager'), updatePerformance);

export default router;
