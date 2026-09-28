import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All notification routes require active JWT authentication
router.use(protect);

router.route('/')
  .get(getNotifications)
  .delete(clearAllNotifications);

router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllAsRead);

router.route('/:id')
  .get(getNotificationById)
  .delete(deleteNotification);

router.put('/:id/read', markAsRead);

export default router;
