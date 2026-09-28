import express from 'express';
import {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getAttendanceSummary,
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All attendance routes require active user authentication
router.use(protect);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/today', getTodayAttendance);
router.get('/my', getMyAttendance);
router.get('/summary', getAttendanceSummary);

export default router;
