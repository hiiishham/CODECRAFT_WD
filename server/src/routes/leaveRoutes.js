import express from 'express';
import {
  getMyLeaveBalance,
  getMyLeaves,
  getLeaves,
  getLeaveById,
  createLeave,
  cancelLeave,
  updateLeave,
  approveLeave,
  rejectLeave,
  deleteLeave,
} from '../controllers/leaveController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Employee personal leave balance & history (before :id)
router.get('/my/balance', protect, requireRole('employee', 'manager', 'admin'), getMyLeaveBalance);
router.get('/my', protect, requireRole('employee', 'manager', 'admin'), getMyLeaves);

// 2. Submit new leave request (Employee, Manager, Admin)
router.post('/', protect, requireRole('employee', 'manager', 'admin'), createLeave);

// 3. Cancel own pending leave request (Employee, Manager, Admin)
router.put('/:id/cancel', protect, requireRole('employee', 'manager', 'admin'), cancelLeave);

// 4. Admin & Manager management endpoints
router.get('/', protect, requireRole('admin', 'manager'), getLeaves);
router.get('/:id', protect, requireRole('admin', 'manager', 'employee'), getLeaveById);
router.put('/:id', protect, requireRole('admin', 'manager'), updateLeave);
router.put('/:id/approve', protect, requireRole('admin', 'manager'), approveLeave);
router.put('/:id/reject', protect, requireRole('admin', 'manager'), rejectLeave);

// 5. Delete leave record (Admin only)
router.delete('/:id', protect, requireRole('admin'), deleteLeave);

export default router;
