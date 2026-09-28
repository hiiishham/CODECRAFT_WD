import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';
import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';
import { getIo } from '../socket.js';

/**
 * Reusable backend notification service for StaffPulse EMS
 */

/**
 * Resolve a recipient identifier to the authenticated Admin user account ID
 * and return associated room IDs (both Admin ID and Employee ID if applicable)
 */
const resolveRecipientRooms = async (recipient) => {
  if (!recipient) return { adminId: null, employeeId: null, rooms: [] };

  const idStr = recipient?._id ? recipient._id.toString() : recipient.toString();
  if (!mongoose.Types.ObjectId.isValid(idStr)) {
    return { adminId: null, employeeId: null, rooms: [] };
  }

  // Check if recipient is already an Admin user
  const adminUser = await Admin.findById(idStr).select('_id email');
  if (adminUser) {
    // Look up linked employee ID if any
    const emp = await Employee.findOne({ email: adminUser.email.toLowerCase().trim() }).select('_id');
    const rooms = [`user:${adminUser._id}`];
    if (emp) rooms.push(`user:${emp._id}`);
    return {
      adminId: adminUser._id,
      employeeId: emp?._id || null,
      rooms,
    };
  }

  // If not Admin, check if recipient is an Employee ID
  const empUser = await Employee.findById(idStr).select('_id email');
  if (empUser && empUser.email) {
    const linkedAdmin = await Admin.findOne({ email: empUser.email.toLowerCase().trim() }).select('_id');
    const rooms = [`user:${empUser._id}`];
    if (linkedAdmin) rooms.push(`user:${linkedAdmin._id}`);
    return {
      adminId: linkedAdmin?._id || empUser._id,
      employeeId: empUser._id,
      rooms,
    };
  }

  // Fallback
  return {
    adminId: idStr,
    employeeId: null,
    rooms: [`user:${idStr}`],
  };
};

/**
 * Check if an identical notification was recently sent (deduplication within 5 minutes)
 */
const isDuplicate = async ({ recipient, title, type, relatedId }) => {
  const timeWindow = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
  const query = {
    recipient,
    title: title.trim(),
    type,
    createdAt: { $gte: timeWindow },
  };
  if (relatedId) query.relatedId = relatedId;

  const count = await Notification.countDocuments(query);
  return count > 0;
};

/**
 * Emit real-time notification to user's private rooms
 */
const emitNotificationToRooms = async (rooms, notification, adminId) => {
  try {
    const io = getIo();
    if (!io) return;

    // Calculate updated unread count for the user
    let unreadCount = 0;
    if (adminId) {
      unreadCount = await Notification.countDocuments({
        recipient: adminId,
        isRead: false,
      });
    }

    const payload = notification.toObject ? notification.toObject() : notification;
    payload.unreadCount = unreadCount;

    for (const room of rooms) {
      io.to(room).emit('notification:new', payload);
      io.to(room).emit('notification:unread-count', { unreadCount });
    }
  } catch (err) {
    // Socket emit is non-fatal to database transaction
    console.error('[NotificationService] Socket emit failed:', err.message);
  }
};

/**
 * Create a single notification for a specific recipient
 */
export const createNotification = async ({
  recipient,
  title,
  message,
  type = 'system',
  relatedId = null,
  relatedType = null,
  priority = 'medium',
  metadata = {},
}) => {
  try {
    if (!recipient || !title || !message) {
      return null;
    }

    // Resolve recipient and rooms
    const { adminId, rooms } = await resolveRecipientRooms(recipient);
    if (!adminId) {
      return null;
    }

    // Check user notification preferences
    const prefs = await NotificationPreference.findOne({ user: adminId });
    if (prefs && type !== 'system') {
      const isTypeEnabled = prefs.categories?.[type] ?? true;
      const isInAppEnabled = prefs.inApp ?? true;
      if (!isTypeEnabled || !isInAppEnabled) {
        return null; // Skipped due to user preference
      }
    }

    // Deduplication check
    if (await isDuplicate({ recipient: adminId, title, type, relatedId })) {
      return null;
    }

    const notification = await Notification.create({
      recipient: adminId,
      title: title.trim(),
      message: message.trim(),
      type,
      relatedId: relatedId || null,
      relatedType: relatedType || null,
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      metadata: metadata || {},
      isRead: false,
    });

    await emitNotificationToRooms(rooms, notification, adminId);
    return notification;
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error.message);
    return null;
  }
};

/**
 * Create notifications for all users holding specific roles (e.g. ['admin', 'manager'])
 */
export const notifyRoles = async (
  roles,
  { title, message, type = 'system', relatedId = null, relatedType = null, priority = 'medium', metadata = {} }
) => {
  try {
    if (!roles || !roles.length || !title || !message) {
      return [];
    }

    const matchingUsers = await Admin.find({
      role: { $in: roles },
      status: { $ne: 'Inactive' },
    }).select('_id email');

    if (!matchingUsers.length) {
      return [];
    }

    const results = [];
    for (const user of matchingUsers) {
      const notif = await createNotification({
        recipient: user._id,
        title,
        message,
        type,
        relatedId,
        relatedType,
        priority,
        metadata,
      });
      if (notif) {
        results.push(notif);
      }
    }

    return results;
  } catch (error) {
    console.error('[NotificationService] Error notifying roles:', error.message);
    return [];
  }
};

/**
 * Create notification for a specific user ID
 */
export const notifyUser = async (
  userId,
  { title, message, type = 'system', relatedId = null, relatedType = null, priority = 'medium', metadata = {} }
) => {
  return await createNotification({
    recipient: userId,
    title,
    message,
    type,
    relatedId,
    relatedType,
    priority,
    metadata,
  });
};

export default {
  createNotification,
  notifyRoles,
  notifyUser,
};

