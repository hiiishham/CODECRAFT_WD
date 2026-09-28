import express from 'express';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departmentController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Private routes for Admin and Manager
router.get('/', protect, requireRole('admin', 'manager'), getDepartments);
router.get('/:id', protect, requireRole('admin', 'manager'), getDepartmentById);

// Admin-only management operations
router.post('/', protect, requireRole('admin'), createDepartment);
router.put('/:id', protect, requireRole('admin'), updateDepartment);
router.delete('/:id', protect, requireRole('admin'), deleteDepartment);

export default router;
