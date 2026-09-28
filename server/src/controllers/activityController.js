import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';
import { escapeRegex } from '../utils/escapeRegex.js';

export const getActivity = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const isEmployee = req.user.role === 'employee';
    const isManager = req.user.role === 'manager';
    const isAdmin = req.user.role === 'admin';

    let activity = [];
    let totalCount = 0;

    if (isAdmin) {
      // Admin: Use AuditLog system-wide
      const filter = {};
      if (type && type !== 'all') filter.action = new RegExp(escapeRegex(type.trim()), 'i');
      
      const [logs, count] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit, 10))
          .populate('user', 'firstName lastName email')
          .lean(),
        AuditLog.countDocuments(filter)
      ]);

      totalCount = count;
      activity = logs.map(log => ({
        _id: log._id,
        title: log.action,
        description: log.details || 'System activity',
        timestamp: log.createdAt,
        type: 'system',
        user: log.user,
        ipAddress: log.ipAddress
      }));

    } else if (isManager) {
      // Manager: Own notifications + Team notifications?
      // For simplicity, query Notifications for this manager. Since they receive notifications for their team.
      const filter = { recipient: req.user._id };
      if (type && type !== 'all') filter.type = type.toLowerCase();

      const [notifications, count] = await Promise.all([
        Notification.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit, 10))
          .lean(),
        Notification.countDocuments(filter)
      ]);

      totalCount = count;
      activity = notifications.map(notif => ({
        _id: notif._id,
        title: notif.title,
        description: notif.message,
        timestamp: notif.createdAt,
        type: notif.type,
        relatedId: notif.relatedId
      }));

    } else {
      // Employee: Own notifications
      const filter = { recipient: req.user._id };
      if (type && type !== 'all') filter.type = type.toLowerCase();

      const [notifications, count] = await Promise.all([
        Notification.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit, 10))
          .lean(),
        Notification.countDocuments(filter)
      ]);

      totalCount = count;
      activity = notifications.map(notif => ({
        _id: notif._id,
        title: notif.title,
        description: notif.message,
        timestamp: notif.createdAt,
        type: notif.type,
        relatedId: notif.relatedId
      }));
    }

    return res.status(200).json({
      success: true,
      activity,
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(totalCount / parseInt(limit, 10)) || 1,
      totalRecords: totalCount
    });

  } catch (err) {
    next(err);
  }
};
