import express from 'express';
import {
  uploadDocument,
  getDocuments,
  getMyDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  downloadDocument,
  viewDocumentFile,
} from '../controllers/documentController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { uploadDocument as multerUpload } from '../services/uploadService.js';

const router = express.Router();

// All document routes require authentication
router.use(protect);

// 1. Employee personal vault
router.get('/my', requireRole('employee'), getMyDocuments);

// 2. Main collection endpoints (Admin & Manager to view, Admin/Employee to upload)
router
  .route('/')
  .get(requireRole('admin', 'manager'), getDocuments)
  .post(requireRole('admin', 'employee'), multerUpload.single('file'), uploadDocument);

// 3. Document secure file streaming / download
router.get('/:id/download', downloadDocument);
router.get('/:id/view', viewDocumentFile);

// 4. Parameterized single document endpoints
router
  .route('/:id')
  .get(getDocumentById)
  .put(requireRole('admin', 'employee'), multerUpload.single('file'), updateDocument)
  .delete(requireRole('admin', 'employee'), deleteDocument);

export default router;
