import AuditLog from '../models/AuditLog.js';
import { escapeRegex } from '../utils/escapeRegex.js';

/**
 * @desc    Get paginated and filtered audit logs
 * @route   GET /api/admin/audit-logs
 * @access  Private (Admin only)
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { user, userRole, action, module, startDate, endDate, targetType, search } = req.query;

    const filter = {};

    if (user) filter.user = user;
    if (userRole) filter.userRole = userRole;
    if (action) filter.action = action;
    if (module) filter.module = module;
    if (targetType) filter.targetType = targetType;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search && search.trim()) {
      filter.description = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }

    const [totalRecords, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .populate('user', 'name email fullName employeeId profileImage') // Admin or Employee
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        totalPages,
        totalRecords,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single audit log details
 * @route   GET /api/admin/audit-logs/:id
 * @access  Private (Admin only)
 */
export const getAuditLogById = async (req, res, next) => {
  try {
    const log = await AuditLog.findById(req.params.id).populate('user', 'name email fullName employeeId profileImage');

    if (!log) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }

    res.status(200).json({ success: true, log });
  } catch (error) {
    next(error);
  }
};
