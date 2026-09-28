import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import Employee from '../models/Employee.js';
import { getIo } from '../socket.js';

/**
 * Helper to get all valid recipient ObjectIds for current user
 * (Both Admin account _id and Employee _id if profile exists)
 */
const getAuthorizedRecipientIds = async (user) => {
  if (!user || !user._id) return [];
  const ids = [user._id];
  try {
    if (user.email) {
      const emp = await Employee.findOne({ email: user.email.toLowerCase().trim() }).select('_id');
      if (emp && !emp._id.equals(user._id)) {
        ids.push(emp._id);
      }
    }
  } catch (err) {
    // Non-critical background lookup
  }
  return ids;
};

/**
 * Helper to emit unread count update to user's private rooms
 */
const emitUnreadCount = (user, unreadCount) => {
  try {
    const io = getIo();
    if (!io || !user?._id) return;
    io.to(`user:${user._id}`).emit('notification:unread-count', { unreadCount });
  } catch (err) {
    // Non-fatal
  }
};

/**
 * @desc    Get paginated notifications for current user with optional filters
 * @route   GET /api/notifications
 * @access  Private (Authenticated users)
 */
export const getNotifications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const { status, type } = req.query;

    const recipientIds = await getAuthorizedRecipientIds(req.user);

    // Strict user privacy: only query notifications for authenticated user
    const filter = { recipient: { $in: recipientIds } };

    // Status filter: unread / read / all
    if (status === 'unread') {
      filter.isRead = false;
    } else if (status === 'read') {
      filter.isRead = true;
    }

    // Type filter with normalized aliases
    if (type && type !== 'all' && type !== 'All') {
      const lowerType = type.toLowerCase().trim();
      if (lowerType === 'goal' || lowerType === 'goals') {
        filter.type = { $in: ['goal', 'goals'] };
      } else if (lowerType === 'task' || lowerType === 'tasks') {
        filter.type = 'task';
      } else if (lowerType === 'leave' || lowerType === 'leaves') {
        filter.type = 'leave';
      } else if (lowerType === 'submission' || lowerType === 'submissions' || lowerType === 'work submission') {
        filter.type = 'submission';
      } else if (lowerType === 'announcement' || lowerType === 'announcements') {
        filter.type = 'announcement';
      } else if (lowerType === 'document' || lowerType === 'documents') {
        filter.type = 'document';
      } else {
        filter.type = lowerType;
      }
    }

    const [totalRecords, unreadCount, notifications] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: { $in: recipientIds }, isRead: false }),
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
      currentPage: page,
      totalPages,
      totalRecords,
      limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get lightweight unread notification count for badge in navbar/sidebar
 * @route   GET /api/notifications/unread-count
 * @access  Private (Authenticated users)
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const recipientIds = await getAuthorizedRecipientIds(req.user);
    const unreadCount = await Notification.countDocuments({
      recipient: { $in: recipientIds },
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single notification by ID
 * @route   GET /api/notifications/:id
 * @access  Private (Authenticated users)
 */
export const getNotificationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID format',
      });
    }

    const recipientIds = await getAuthorizedRecipientIds(req.user);

    // Enforce privacy: recipient must match authenticated user
    const notification = await Notification.findOne({
      _id: id,
      recipient: { $in: recipientIds },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied',
      });
    }

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a single notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private (Authenticated users)
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID format',
      });
    }

    const recipientIds = await getAuthorizedRecipientIds(req.user);

    // Anti-IDOR: find and update only if notification belongs to authenticated user
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: { $in: recipientIds } },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied',
      });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: { $in: recipientIds },
      isRead: false,
    });

    try {
      const io = getIo();
      if (io) {
        for (const rId of recipientIds) {
          io.to(`user:${rId}`).emit('notification:read', { id, unreadCount });
        }
      }
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications for current user as read
 * @route   PUT /api/notifications/read-all
 * @access  Private (Authenticated users)
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const recipientIds = await getAuthorizedRecipientIds(req.user);

    const result = await Notification.updateMany(
      { recipient: { $in: recipientIds }, isRead: false },
      { isRead: true }
    );

    try {
      const io = getIo();
      if (io) {
        for (const rId of recipientIds) {
          io.to(`user:${rId}`).emit('notification:read-all', { unreadCount: 0 });
        }
      }
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      updatedCount: result.modifiedCount || 0,
      unreadCount: 0,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a single notification
 * @route   DELETE /api/notifications/:id
 * @access  Private (Authenticated users)
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID format',
      });
    }

    const recipientIds = await getAuthorizedRecipientIds(req.user);

    // Anti-IDOR: find and delete only if belongs to authenticated user
    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: { $in: recipientIds },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied',
      });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: { $in: recipientIds },
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear all notifications for current user
 * @route   DELETE /api/notifications
 * @access  Private (Authenticated users)
 */
export const clearAllNotifications = async (req, res, next) => {
  try {
    const recipientIds = await getAuthorizedRecipientIds(req.user);

    const result = await Notification.deleteMany({
      recipient: { $in: recipientIds },
    });

    return res.status(200).json({
      success: true,
      message: 'All notifications cleared',
      deletedCount: result.deletedCount || 0,
      unreadCount: 0,
    });
  } catch (error) {
    next(error);
  }
};
