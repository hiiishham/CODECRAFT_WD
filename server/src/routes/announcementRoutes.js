import express from 'express';
import {
  createAnnouncement,
  getAnnouncements,
  getMyAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  archiveAnnouncement,
  deleteAnnouncement,
  uploadAttachment,
  getAnnouncementStats,
} from '../controllers/announcementController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// All announcement endpoints require authentication
router.use(protect);

// 1. Employee & Manager active notice board
router.get('/my', getMyAnnouncements);

// 2. Attachment upload (Admin only)
import { uploadAttachment as multerUploadAttachment } from '../services/uploadService.js';
router.post('/upload', requireRole('admin'), multerUploadAttachment.array('attachments', 5), uploadAttachment);

// 3. Admin dashboard KPIs
router.get('/stats', requireRole('admin', 'manager'), getAnnouncementStats);

// 4. Main collection routes
router
  .route('/')
  .get(requireRole('admin', 'manager'), getAnnouncements)
  .post(requireRole('admin'), createAnnouncement);

// 5. Archive quick-action
router.patch('/:id/archive', requireRole('admin'), archiveAnnouncement);

// 6. Parameterized single announcement routes (Must be last)
router
  .route('/:id')
  .get(getAnnouncementById)
  .put(requireRole('admin'), updateAnnouncement)
  .delete(requireRole('admin'), deleteAnnouncement);

export default router;
