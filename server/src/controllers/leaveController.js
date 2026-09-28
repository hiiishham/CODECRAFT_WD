import mongoose from 'mongoose';
import Leave from '../models/Leave.js';
import Employee from '../models/Employee.js';
import Admin from '../models/Admin.js';
import { resolveEmployeeForUser } from '../utils/employeeResolver.js';
import { createNotification, notifyRoles } from '../utils/notificationService.js';
import { escapeRegex } from '../utils/escapeRegex.js';

/**
 * Standard yearly allowance constants
 */
export const DEFAULT_LEAVE_ALLOWANCES = {
  annual: 20,
  sick: 10,
  casual: 7,
  emergency: 5,
};

/**
 * Normalize input leave type string to standard model representation
 */
export const normalizeLeaveType = (type) => {
  if (!type) return 'Other';
  const lower = type.toLowerCase().trim();
  if (lower.includes('annual')) return 'Annual Leave';
  if (lower.includes('sick')) return 'Sick Leave';
  if (lower.includes('casual')) return 'Casual Leave';
  if (lower.includes('emergency')) return 'Emergency Leave';
  return 'Other';
};

/**
 * Map leave type to allowance balance key
 */
export const getLeaveBalanceKey = (type) => {
  if (!type) return null;
  const lower = type.toLowerCase().trim();
  if (lower.includes('annual')) return 'annual';
  if (lower.includes('sick')) return 'sick';
  if (lower.includes('casual')) return 'casual';
  if (lower.includes('emergency')) return 'emergency';
  return null;
};

/**
 * Timezone-safe local date parser for ISO and YYYY-MM-DD strings
 */
export const parseSafeDate = (d) => {
  if (!d) return new Date(NaN);
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) {
    const [y, m, day] = d.trim().split('-').map(Number);
    return new Date(y, m - 1, day, 0, 0, 0, 0);
  }
  return new Date(d);
};

/**
 * Dynamically calculate an employee's leave balance for the current calendar year
 * Only APPROVED leave requests reduce the used and remaining balances.
 */
export const calculateEmployeeLeaveBalance = async (employeeId) => {
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

  const approvedLeaves = await Leave.find({
    employee: employeeId,
    status: 'Approved',
    startDate: { $gte: yearStart, $lte: yearEnd },
  });

  const used = {
    annual: 0,
    sick: 0,
    casual: 0,
    emergency: 0,
  };

  approvedLeaves.forEach((l) => {
    const key = getLeaveBalanceKey(l.leaveType);
    const days = l.duration || 1;
    if (key && used[key] !== undefined) {
      used[key] += days;
    }
  });

  const balance = {
    annual: {
      total: DEFAULT_LEAVE_ALLOWANCES.annual,
      used: used.annual,
      remaining: Math.max(0, DEFAULT_LEAVE_ALLOWANCES.annual - used.annual),
    },
    sick: {
      total: DEFAULT_LEAVE_ALLOWANCES.sick,
      used: used.sick,
      remaining: Math.max(0, DEFAULT_LEAVE_ALLOWANCES.sick - used.sick),
    },
    casual: {
      total: DEFAULT_LEAVE_ALLOWANCES.casual,
      used: used.casual,
      remaining: Math.max(0, DEFAULT_LEAVE_ALLOWANCES.casual - used.casual),
    },
    emergency: {
      total: DEFAULT_LEAVE_ALLOWANCES.emergency,
      used: used.emergency,
      remaining: Math.max(0, DEFAULT_LEAVE_ALLOWANCES.emergency - used.emergency),
    },
  };

  const totalRemaining =
    balance.annual.remaining +
    balance.sick.remaining +
    balance.casual.remaining +
    balance.emergency.remaining;

  return { balance, totalRemaining };
};

/**
 * Format dates cleanly for notifications and display
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * @desc    Get authenticated employee's live leave balance
 * @route   GET /api/leaves/my/balance
 * @access  Private (Employee, Manager, Admin)
 */
export const getMyLeaveBalance = async (req, res, next) => {
  try {
    const employeeDoc = await resolveEmployeeForUser(req.user);
    if (!employeeDoc) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found for authenticated user',
      });
    }

    const { balance, totalRemaining } = await calculateEmployeeLeaveBalance(employeeDoc._id);

    return res.status(200).json({
      success: true,
      balance,
      totalRemaining,
      employeeId: employeeDoc.employeeId,
      fullName: employeeDoc.fullName,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get authenticated employee's personal leave requests
 * @route   GET /api/leaves/my
 * @access  Private (Employee, Manager, Admin)
 */
export const getMyLeaves = async (req, res, next) => {
  try {
    const employeeDoc = await resolveEmployeeForUser(req.user);
    if (!employeeDoc) {
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found',
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const { status, leaveType } = req.query;

    const filter = { employee: employeeDoc._id };
    if (status && status !== 'All') filter.status = status;
    if (leaveType && leaveType !== 'All') {
      filter.leaveType = { $regex: new RegExp(escapeRegex(leaveType.replace(' Leave', '').trim()), 'i') };
    }

    const [totalLeaves, leaves, summaryCounts] = await Promise.all([
      Leave.countDocuments(filter),
      Leave.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reviewedBy', 'name email role'),
      Leave.aggregate([
        { $match: { employee: employeeDoc._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const summary = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };

    summaryCounts.forEach((s) => {
      summary.total += s.count;
      const key = s._id ? s._id.toLowerCase() : '';
      if (summary[key] !== undefined) {
        summary[key] = s.count;
      }
    });

    const totalPages = Math.ceil(totalLeaves / limit) || 1;

    return res.status(200).json({
      success: true,
      leaves,
      summary,
      currentPage: page,
      totalPages,
      totalLeaves,
      limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated leaves with search and filters (Admin & Manager)
 * @route   GET /api/leaves
 * @access  Private (Admin, Manager)
 */
export const getLeaves = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const { search, status, leaveType, department, startDate, endDate } = req.query;

    const filter = {};

    // 1. Role-based department scoping for Managers
    if (req.user?.role === 'manager') {
      const managerDept = req.user.department || 'Development';
      const teamEmployees = await Employee.find({ department: managerDept }).select('_id');
      const teamIds = teamEmployees.map((e) => e._id);
      filter.employee = { $in: teamIds };
    }

    // 2. Status filter
    if (status && status !== 'All') {
      filter.status = status;
    }

    // 3. Leave type filter
    if (leaveType && leaveType !== 'All') {
      filter.leaveType = { $regex: new RegExp(escapeRegex(leaveType.replace(' Leave', '').trim()), 'i') };
    }

    // 4. Date range filter
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    // 5. Search by employee name, employee ID, or department
    if ((search && search.trim()) || (department && department !== 'All')) {
      const empQuery = {};

      if (search && search.trim()) {
        const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
        empQuery.$or = [
          { fullName: searchRegex },
          { employeeId: searchRegex },
          { email: searchRegex },
        ];
      }

      if (department && department !== 'All') {
        empQuery.department = department.trim();
      }

      const matchingEmployees = await Employee.find(empQuery).select('_id');
      const employeeIds = matchingEmployees.map((emp) => emp._id);

      if (filter.employee && filter.employee.$in) {
        // Intersect manager team IDs with search IDs
        const teamSet = new Set(filter.employee.$in.map((id) => id.toString()));
        const intersected = employeeIds.filter((id) => teamSet.has(id.toString()));
        filter.employee = { $in: intersected };
      } else {
        filter.employee = { $in: employeeIds };
      }
    }

    // Compute top metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tonight = new Date();
    tonight.setHours(23, 59, 59, 999);

    const baseStatsFilter = {};
    if (req.user?.role === 'manager') {
      const managerDept = req.user.department || 'Development';
      const teamEmps = await Employee.find({ department: managerDept }).select('_id');
      baseStatsFilter.employee = { $in: teamEmps.map((e) => e._id) };
    }

    const [
      totalLeaves,
      leaves,
      pendingCount,
      approvedCount,
      rejectedCount,
      onLeaveTodayRecords,
    ] = await Promise.all([
      Leave.countDocuments(filter),
      Leave.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employee', 'fullName employeeId email department designation profileImage phone')
        .populate('reviewedBy', 'name email role'),
      Leave.countDocuments({ ...baseStatsFilter, status: 'Pending' }),
      Leave.countDocuments({ ...baseStatsFilter, status: 'Approved' }),
      Leave.countDocuments({ ...baseStatsFilter, status: 'Rejected' }),
      Leave.find({
        ...baseStatsFilter,
        status: 'Approved',
        startDate: { $lte: tonight },
        endDate: { $gte: today },
      }).populate('employee', 'fullName employeeId department designation profileImage'),
    ]);

    const totalPages = Math.ceil(totalLeaves / limit) || 1;

    return res.status(200).json({
      success: true,
      leaves,
      stats: {
        total: totalLeaves,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        onLeaveToday: onLeaveTodayRecords.length,
        onLeaveEmployeesToday: onLeaveTodayRecords.map((l) => ({
          leaveId: l._id,
          employee: l.employee,
          leaveType: l.leaveType,
          startDate: l.startDate,
          endDate: l.endDate,
        })),
      },
      currentPage: page,
      totalPages,
      totalLeaves,
      limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single leave by ID (with RBAC isolation)
 * @route   GET /api/leaves/:id
 * @access  Private (Admin, Manager, Employee)
 */
export const getLeaveById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave request ID format',
      });
    }

    const leave = await Leave.findById(id)
      .populate('employee', 'fullName employeeId email department designation profileImage phone')
      .populate('reviewedBy', 'name email role');

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    // Role-based access control
    if (req.user?.role === 'employee') {
      const employeeDoc = await resolveEmployeeForUser(req.user);
      if (!employeeDoc || leave.employee._id.toString() !== employeeDoc._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this leave request',
        });
      }
    } else if (req.user?.role === 'manager') {
      const managerDept = req.user.department || 'Development';
      if (leave.employee?.department && leave.employee.department !== managerDept) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view leave requests for other departments',
        });
      }
    }

    return res.status(200).json({
      success: true,
      leave,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new leave request with balance and conflict validations
 * @route   POST /api/leaves
 * @access  Private (Employee, Manager, Admin)
 */
export const createLeave = async (req, res, next) => {
  try {
    let { employee, leaveType, startDate, endDate, reason } = req.body;

    // 1. Resolve employee reference
    let targetEmployeeId = employee;
    if (req.user?.role === 'employee' || !targetEmployeeId) {
      const resolvedEmp = await resolveEmployeeForUser(req.user);
      if (!resolvedEmp) {
        return res.status(404).json({
          success: false,
          message: 'Employee profile could not be resolved',
        });
      }
      targetEmployeeId = resolvedEmp._id;
    }

    // 2. Required fields validation
    if (!leaveType || !startDate || !endDate || !reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'All fields (Leave Type, Start Date, End Date, Reason) are required.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(targetEmployeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee reference ID',
      });
    }

    const empRecord = await Employee.findById(targetEmployeeId);
    if (!empRecord) {
      return res.status(404).json({
        success: false,
        message: 'Referenced employee does not exist',
      });
    }

    // Role-based department restriction for Manager
    if (req.user?.role === 'manager') {
      const managerDept = (req.user.department || 'Development').toLowerCase().trim();
      const empDept = (empRecord.department || '').toLowerCase().trim();
      if (empDept !== managerDept) {
        return res.status(403).json({
          success: false,
          message: `Managers can only create leave requests for employees within their department (${req.user.department || 'Development'})`,
        });
      }
    }

    // 3. Date validation & normalization (timezone-safe)
    const start = parseSafeDate(startDate);
    const end = parseSafeDate(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format for start date or end date',
      });
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Past date validation (Start date cannot be before today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      return res.status(400).json({
        success: false,
        message: 'Leave start date cannot be in the past.',
      });
    }

    // End date validation
    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date.',
      });
    }

    // Duration calculation (inclusive calendar days)
    const diffTime = Math.abs(end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0));
    const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (duration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Calculated leave duration must be at least 1 day.',
      });
    }

    const normalizedType = normalizeLeaveType(leaveType);

    // 4. Overlapping / Conflict Validation (Pending & Approved are conflicts)
    const overlappingLeave = await Leave.findOne({
      employee: targetEmployeeId,
      status: { $in: ['Pending', 'Approved'] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (overlappingLeave) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active or pending leave request covering these dates.',
        conflictingLeaveId: overlappingLeave._id,
      });
    }

    // 5. Leave Balance Validation
    const balanceKey = getLeaveBalanceKey(normalizedType);
    if (balanceKey) {
      const { balance } = await calculateEmployeeLeaveBalance(targetEmployeeId);
      const remainingDays = balance[balanceKey].remaining;

      if (duration > remainingDays) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance. You have ${remainingDays} day(s) remaining for ${normalizedType}, but requested ${duration} day(s).`,
          remaining: remainingDays,
          requestedDuration: duration,
        });
      }
    }

    // 6. Create Leave Record
    const leave = await Leave.create({
      employee: targetEmployeeId,
      leaveType: normalizedType,
      startDate: start,
      endDate: end,
      duration,
      reason: reason.trim(),
      status: 'Pending',
    });

    await leave.populate('employee', 'fullName employeeId email department designation');

    // 7. Dispatch notification to Admins & Managers
    await notifyRoles(['admin', 'manager'], {
      title: 'New leave request',
      message: `${leave.employee?.fullName || 'An employee'} submitted a leave request.`,
      type: 'leave',
      relatedId: leave._id,
      relatedType: 'Leave',
    });

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      leave,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Employee cancels their own pending leave request
 * @route   PUT /api/leaves/:id/cancel
 * @access  Private (Employee, Manager, Admin)
 */
export const cancelLeave = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave request ID format',
      });
    }

    const leave = await Leave.findById(id).populate('employee', 'fullName email employeeId department');
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    // Verify employee owns this request
    if (req.user?.role === 'employee') {
      const employeeDoc = await resolveEmployeeForUser(req.user);
      if (!employeeDoc || leave.employee._id.toString() !== employeeDoc._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only cancel your own leave requests',
        });
      }
    }

    // Only pending leave requests can be cancelled
    if (leave.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel leave request that is already ${leave.status.toLowerCase()}. Only pending requests can be cancelled.`,
      });
    }

    leave.status = 'Cancelled';
    await leave.save();

    // Notify administrators and managers about cancellation
    await notifyRoles(['admin', 'manager'], {
      title: 'Leave request cancelled',
      message: `${leave.employee?.fullName || 'Employee'} cancelled their leave request.`,
      type: 'leave',
      relatedId: leave._id,
      relatedType: 'Leave',
    });

    return res.status(200).json({
      success: true,
      message: 'Leave request cancelled successfully',
      leave,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a pending leave request
 * @route   PUT /api/leaves/:id/approve
 * @access  Private (Admin, Manager)
 */
export const approveLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewComment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave request ID format',
      });
    }

    const leave = await Leave.findById(id).populate('employee', 'fullName email employeeId department designation');
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    // Manager role authorization check
    if (req.user?.role === 'manager') {
      const managerDept = req.user.department || 'Development';
      if (leave.employee?.department && leave.employee.department !== managerDept) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to approve leave requests for employees outside your department',
        });
      }
    }

    // State check
    if (leave.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request is already ${leave.status.toLowerCase()} and cannot be approved again.`,
      });
    }

    // Verify employee still has sufficient leave balance at approval time
    const balanceKey = getLeaveBalanceKey(leave.leaveType);
    if (balanceKey) {
      const { balance } = await calculateEmployeeLeaveBalance(leave.employee._id);
      const reqDays = leave.duration || 1;
      if (reqDays > balance[balanceKey].remaining) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve leave. Employee has only ${balance[balanceKey].remaining} day(s) remaining for ${leave.leaveType}, but this request requires ${reqDays} day(s).`,
        });
      }
    }

    leave.status = 'Approved';
    leave.reviewedBy = req.user?._id;
    leave.reviewedAt = new Date();
    if (reviewComment && reviewComment.trim()) {
      leave.reviewComment = reviewComment.trim();
    }

    await leave.save();
    await leave.populate('reviewedBy', 'name email role');

    // Notify employee directly
    const userAccount = await Admin.findOne({ email: leave.employee?.email?.toLowerCase().trim() });
    if (userAccount) {
      await createNotification({
        recipient: userAccount._id,
        title: 'Leave request approved',
        message: 'Your leave request has been approved.',
        type: 'leave',
        relatedId: leave._id,
        relatedType: 'Leave',
      });
    }

    // Notify Admins & Managers
    await notifyRoles(['admin', 'manager'], {
      title: 'Leave request approved',
      message: `Leave request for ${leave.employee?.fullName || 'employee'} has been approved.`,
      type: 'leave',
      relatedId: leave._id,
      relatedType: 'Leave',
    });

    return res.status(200).json({
      success: true,
      message: 'Leave request approved successfully',
      leave,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a pending leave request (requires review comment)
 * @route   PUT /api/leaves/:id/reject
 * @access  Private (Admin, Manager)
 */
export const rejectLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewComment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave request ID format',
      });
    }

    // Review comment is required for rejection
    if (!reviewComment || !reviewComment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A review comment is required when rejecting a leave request.',
      });
    }

    const leave = await Leave.findById(id).populate('employee', 'fullName email employeeId department designation');
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    // Manager role authorization check
    if (req.user?.role === 'manager') {
      const managerDept = req.user.department || 'Development';
      if (leave.employee?.department && leave.employee.department !== managerDept) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to reject leave requests for employees outside your department',
        });
      }
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request is already ${leave.status.toLowerCase()} and cannot be rejected again.`,
      });
    }

    leave.status = 'Rejected';
    leave.reviewedBy = req.user?._id;
    leave.reviewedAt = new Date();
    leave.reviewComment = reviewComment.trim();

    await leave.save();
    await leave.populate('reviewedBy', 'name email role');

    // Notify employee directly
    const userAccount = await Admin.findOne({ email: leave.employee?.email?.toLowerCase().trim() });
    if (userAccount) {
      await createNotification({
        recipient: userAccount._id,
        title: 'Leave request rejected',
        message: 'Your leave request has been rejected.',
        type: 'leave',
        relatedId: leave._id,
        relatedType: 'Leave',
      });
    }

    // Notify Admins & Managers
    await notifyRoles(['admin', 'manager'], {
      title: 'Leave request rejected',
      message: `Leave request for ${leave.employee?.fullName || 'employee'} has been rejected.`,
      type: 'leave',
      relatedId: leave._id,
      relatedType: 'Leave',
    });

    return res.status(200).json({
      success: true,
      message: 'Leave request rejected',
      leave,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing pending leave request
 * @route   PUT /api/leaves/:id
 * @access  Private (Admin, Manager)
 */
export const updateLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave request ID format',
      });
    }

    const leave = await Leave.findById(id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot update a leave request that has already been ${leave.status.toLowerCase()}.`,
      });
    }

    if (leaveType) leave.leaveType = normalizeLeaveType(leaveType);
    if (reason) leave.reason = reason.trim();

    if (startDate || endDate) {
      const start = startDate ? parseSafeDate(startDate) : new Date(leave.startDate);
      const end = endDate ? parseSafeDate(endDate) : new Date(leave.endDate);

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      if (end < start) {
        return res.status(400).json({
          success: false,
          message: 'End date cannot be before start date',
        });
      }

      const overlap = await Leave.findOne({
        _id: { $ne: id },
        employee: leave.employee,
        status: { $in: ['Pending', 'Approved'] },
        startDate: { $lte: end },
        endDate: { $gte: start },
      });

      if (overlap) {
        return res.status(409).json({
          success: false,
          message: 'This updated date range overlaps with another leave request for this employee.',
        });
      }

      leave.startDate = start;
      leave.endDate = end;
      const diffTime = Math.abs(end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0));
      leave.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    await leave.save();
    await leave.populate('employee', 'fullName employeeId email department designation');

    return res.status(200).json({
      success: true,
      message: 'Leave request updated successfully',
      leave,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a leave request
 * @route   DELETE /api/leaves/:id
 * @access  Private (Admin only)
 */
export const deleteLeave = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave request ID format',
      });
    }

    const leave = await Leave.findById(id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    await leave.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Leave request deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
