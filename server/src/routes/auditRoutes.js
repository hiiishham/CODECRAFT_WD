import express from 'express';
import { getAuditLogs, getAuditLogById } from '../controllers/auditController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(requireRole('admin'));

router.get('/', getAuditLogs);
router.get('/:id', getAuditLogById);

export default router;
