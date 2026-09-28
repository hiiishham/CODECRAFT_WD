import express from 'express';
import {
  uploadAttachment,
  createSubmission,
  getMySubmissions,
  getSubmissionById,
  getSubmissionByTaskId,
  updateSubmission,
  getSubmissions,
  reviewSubmission,
} from '../controllers/submissionController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all submission routes
router.use(protect);

import { uploadAttachment as multerUploadAttachment } from '../services/uploadService.js';

// 1. File Upload endpoint
router.post('/upload', multerUploadAttachment.array('attachments', 5), uploadAttachment);

// 2. Employee personal submissions
router.get('/my', requireRole('employee'), getMySubmissions);

// 3. Task specific submission lookup
router.get('/task/:taskId', getSubmissionByTaskId);

// 4. Admin & Manager Review endpoint
router.put('/:id/review', requireRole('admin', 'manager'), reviewSubmission);

// 5. Main collection endpoints
router
  .route('/')
  .get(requireRole('admin', 'manager'), getSubmissions)
  .post(requireRole('employee'), createSubmission);

// 6. Parameterized single submission endpoints
router
  .route('/:id')
  .get(getSubmissionById)
  .put(requireRole('employee'), updateSubmission);

export default router;
