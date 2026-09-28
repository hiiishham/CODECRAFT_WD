import express from 'express';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeDashboardStats,
  resetEmployeePassword,
} from '../controllers/employeeController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// All employee routes require active authentication
router.use(protect);

// Dashboard API for Employee Workspace
router.get('/dashboard', requireRole('employee', 'admin', 'manager'), getEmployeeDashboardStats);

import { uploadAvatar } from '../services/uploadService.js';
import { uploadEmployeeAvatar } from '../controllers/employeeController.js';

// Profile Avatar Upload
router.put('/:id/avatar', requireRole('admin', 'employee'), uploadAvatar.single('avatar'), uploadEmployeeAvatar);

// Reset password for an employee account (Admin only)
router.post('/:id/reset-password', requireRole('admin'), resetEmployeePassword);

// View list: Admin & Manager
// Create: Admin only
router.route('/')
  .get(requireRole('admin', 'manager'), getEmployees)
  .post(requireRole('admin'), createEmployee);

// View single: Admin, Manager & Employee
// Update: Admin only
// Delete: Admin only
router.route('/:id')
  .get(requireRole('admin', 'manager', 'employee'), getEmployeeById)
  .put(requireRole('admin'), updateEmployee)
  .delete(requireRole('admin'), deleteEmployee);

export default router;
