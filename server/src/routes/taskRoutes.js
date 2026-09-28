import express from 'express';
import {
  getTasks,
  getTaskStats,
  getTaskById,
  getMyTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskProgress,
} from '../controllers/taskController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all task routes
router.use(protect);

// 1. Employee specific personal task endpoint
router.get('/my', requireRole('employee'), getMyTasks);

// 2. Admin/Manager statistics endpoint
router.get('/stats', requireRole('admin', 'manager'), getTaskStats);

// 3. Employee progress update endpoint
router.put('/:id/progress', requireRole('employee'), updateTaskProgress);

// 4. Admin/Manager CRUD endpoints
router
  .route('/')
  .get(requireRole('admin', 'manager'), getTasks)
  .post(requireRole('admin', 'manager'), createTask);

router
  .route('/:id')
  .get(getTaskById) // Checked dynamically inside controller for employee ownership
  .put(requireRole('admin', 'manager'), updateTask)
  .delete(requireRole('admin', 'manager'), deleteTask);

export default router;
