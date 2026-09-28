import express from 'express';
import {
  getGoals,
  getGoalStats,
  getGoalById,
  getMyGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  updateGoalProgress,
} from '../controllers/goalController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all goal routes
router.use(protect);

// Employee-specific endpoints (must come before /:id to avoid conflicts)
router.get('/my', requireRole('employee'), getMyGoals);

// Admin/Manager stats endpoint
router.get('/stats', requireRole('admin', 'manager'), getGoalStats);

// Employee progress update endpoint
router.put('/:id/progress', requireRole('employee'), updateGoalProgress);

// Admin/Manager CRUD endpoints
router
  .route('/')
  .get(requireRole('admin', 'manager'), getGoals)
  .post(requireRole('admin', 'manager'), createGoal);

router
  .route('/:id')
  .get(getGoalById) // Ownership check done dynamically in controller
  .put(requireRole('admin', 'manager'), updateGoal)
  .delete(requireRole('admin', 'manager'), deleteGoal);

export default router;
