import express from 'express';
import {
  getSalaries,
  getSalaryById,
  createSalary,
  updateSalary,
  deleteSalary,
  getSalaryStats,
  getMySalary,
  getMySalaryHistory,
  getMySalaryById,
} from '../controllers/salaryController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Employee self-service endpoints (accessible by authenticated employee for their own data)
router.get('/my/history', protect, getMySalaryHistory);
router.get('/my/:id', protect, getMySalaryById);
router.get('/my', protect, getMySalary);

// Admin-only management routes (sensitive payroll data)
router.get('/stats', protect, requireRole('admin'), getSalaryStats);
router.get('/', protect, requireRole('admin'), getSalaries);
router.get('/:id', protect, requireRole('admin'), getSalaryById);
router.post('/', protect, requireRole('admin'), createSalary);
router.put('/:id', protect, requireRole('admin'), updateSalary);
router.delete('/:id', protect, requireRole('admin'), deleteSalary);

export default router;

