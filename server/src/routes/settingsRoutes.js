import express from 'express';
import { getSettings, updateSettings, getNotificationPreferences, updateNotificationPreferences } from '../controllers/settingsController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/settings/notifications/preferences - Get personal preferences
router.get('/notifications/preferences', protect, getNotificationPreferences);

// PUT /api/settings/notifications/preferences - Update personal preferences
router.put('/notifications/preferences', protect, updateNotificationPreferences);

// GET /api/settings - Authenticated users can retrieve app settings
router.get('/', protect, getSettings);

// PUT /api/settings - Admin only can modify application settings
router.put('/', protect, requireRole('admin'), updateSettings);

import { uploadAvatar } from '../services/uploadService.js';
import { uploadSettingsImage } from '../controllers/settingsController.js';

// POST /api/settings/upload - Admin only upload logo/favicon
router.post('/upload', protect, requireRole('admin'), uploadAvatar.single('image'), uploadSettingsImage);

export default router;
