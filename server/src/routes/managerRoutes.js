import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import {
  getDashboardStats,
  getTeam,
  getTeamMember,
  getTeamTasks,
  getTeamLeave,
  updateLeaveStatus,
  getTeamSubmissions,
  reviewSubmission,
  getTeamAttendance,
  getTeamPerformance
} from '../controllers/managerController.js';

const router = express.Router();

// Apply middleware to all routes
router.use(protect);
router.use(requireRole('manager')); // strictly for managers

router.get('/dashboard', getDashboardStats);
router.get('/team', getTeam);
router.get('/team/:id', getTeamMember);
router.get('/tasks', getTeamTasks);

router.get('/leave', getTeamLeave);
router.put('/leave/:id/status', updateLeaveStatus);

router.get('/submissions', getTeamSubmissions);
router.put('/submissions/:id/review', reviewSubmission);

router.get('/attendance', getTeamAttendance);
router.get('/performance', getTeamPerformance);

export default router;
