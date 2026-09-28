import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Leave from '../models/Leave.js';
import Settings from '../models/Settings.js';

/**
 * Normalizes a Date to midnight (00:00:00.000) for consistent daily records
 * @param {Date|string} date
 * @returns {Date}
 */
export const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Normalizes a Date to end of day (23:59:59.999) for date range filters
 * @param {Date|string} date
 * @returns {Date}
 */
export const getEndOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

import { resolveEmployeeForUser } from '../utils/employeeResolver.js';
export { resolveEmployeeForUser };

/**
 * @desc    Check-in for today's working shift
 * @route   POST /api/attendance/check-in
 * @access  Private (Employee, Manager, Admin)
 */
export const checkIn = async (req, res, next) => {
  try {
    const user = req.user || req.admin;
    const employee = await resolveEmployeeForUser(user);

    if (!employee) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Employee record not found for the authenticated user',
      });
    }

    const todayStart = getStartOfDay();

    // Check if an attendance record already exists for today
    const existingAttendance = await Attendance.findOne({
      employee: employee._id,
      date: todayStart,
    });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: 'You are already checked in today.',
        attendance: existingAttendance,
      });
    }

    // Capture precise server timestamp
    const checkInTime = new Date();

    // Determine status based on configured working start time (Default: 09:00 AM)
    let scheduledHour = 9;
    let scheduledMinute = 0;

    try {
      const settings = (await Settings.getSingleton?.()) || (await Settings.findOne());
      const startTimeStr = settings?.defaultCheckInTime || settings?.workStartTime;
      if (startTimeStr) {
        const [h, m] = startTimeStr.split(':').map(Number);
        if (!isNaN(h)) scheduledHour = h;
        if (!isNaN(m)) scheduledMinute = m;
      }
    } catch {
      // Fall back to 09:00 AM standard
    }

    // Determine if late compared to scheduled hour & minute
    const currentHour = checkInTime.getHours();
    const currentMinute = checkInTime.getMinutes();
    const isLate =
      currentHour > scheduledHour ||
      (currentHour === scheduledHour && currentMinute > scheduledMinute);

    const status = isLate ? 'Late' : 'Present';
    const notes = isLate ? 'Checked in after 09:00 AM' : 'On-time check-in';

    const attendance = await Attendance.create({
      employee: employee._id,
      date: todayStart,
      checkIn: checkInTime,
      checkOut: null,
      totalHours: 0,
      status,
      notes,
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: isLate ? 'Checked in successfully (Marked as Late)' : 'Checked in successfully',
      attendance,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: 'You are already checked in today.',
      });
    }
    next(error);
  }
};

/**
 * @desc    Check-out from today's working shift
 * @route   POST /api/attendance/check-out
 * @access  Private (Employee, Manager, Admin)
 */
export const checkOut = async (req, res, next) => {
  try {
    const user = req.user || req.admin;
    const employee = await resolveEmployeeForUser(user);

    if (!employee) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Employee record not found for the authenticated user',
      });
    }

    const todayStart = getStartOfDay();

    // Verify employee has checked in today
    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: todayStart,
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'You cannot check out before checking in.',
      });
    }

    // Verify employee has not already checked out
    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'You have already checked out today.',
        attendance,
      });
    }

    // Capture server checkout timestamp
    const checkOutTime = new Date();
    const durationMs = checkOutTime.getTime() - attendance.checkIn.getTime();
    const rawHours = durationMs / (1000 * 60 * 60);
    const totalHours = Math.max(0, Math.round(rawHours * 100) / 100);

    attendance.checkOut = checkOutTime;
    attendance.totalHours = totalHours;

    // If total working hours are under 4 hours, adjust status to Half Day if was marked Present
    if (totalHours < 4.0 && attendance.status === 'Present') {
      attendance.status = 'Half Day';
      attendance.notes = 'Shift duration under 4 hours (Half Day)';
    }

    await attendance.save();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Checked out successfully. Work day completed.',
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get authenticated employee's attendance record for today
 * @route   GET /api/attendance/today
 * @access  Private
 */
export const getTodayAttendance = async (req, res, next) => {
  try {
    const user = req.user || req.admin;
    const employee = await resolveEmployeeForUser(user);

    if (!employee) {
      return res.status(200).json({
        success: true,
        attendance: null,
      });
    }

    const todayStart = getStartOfDay();
    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: todayStart,
    });

    return res.status(200).json({
      success: true,
      attendance: attendance || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated attendance history for the authenticated employee
 * @route   GET /api/attendance/my
 * @access  Private
 */
export const getMyAttendance = async (req, res, next) => {
  try {
    const user = req.user || req.admin;
    const employee = await resolveEmployeeForUser(user);

    if (!employee) {
      return res.status(200).json({
        success: true,
        count: 0,
        totalPages: 1,
        currentPage: 1,
        attendance: [],
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { status, month, startDate, endDate } = req.query;

    const query = { employee: employee._id };

    if (status && status !== 'All') {
      query.status = status;
    }

    // Filter by specific Month (Format: YYYY-MM)
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = getStartOfDay(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const total = await Attendance.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1;

    const records = await Attendance.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: total,
      totalPages,
      currentPage: page,
      attendance: records,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get monthly attendance metrics & summary for authenticated employee
 * @route   GET /api/attendance/summary
 * @access  Private
 */
export const getAttendanceSummary = async (req, res, next) => {
  try {
    const user = req.user || req.admin;
    const employee = await resolveEmployeeForUser(user);

    if (!employee) {
      return res.status(200).json({
        success: true,
        summary: {
          totalWorkingDays: 0,
          presentDays: 0,
          lateDays: 0,
          halfDays: 0,
          leaveDays: 0,
          totalWorkingHours: 0,
          averageWorkingHours: 0,
        },
      });
    }

    // Default to current month or query month (YYYY-MM)
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    if (req.query.month && /^\d{4}-\d{2}$/.test(req.query.month)) {
      const [y, m] = req.query.month.split('-').map(Number);
      year = y;
      month = m;
    } else if (req.query.year) {
      year = parseInt(req.query.year, 10) || year;
      if (req.query.monthNum) month = parseInt(req.query.monthNum, 10) || month;
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch all attendance records for this employee in the month
    const records = await Attendance.find({
      employee: employee._id,
      date: { $gte: monthStart, $lte: monthEnd },
    });

    // Also query approved leaves in this month for this employee
    const approvedLeaves = await Leave.find({
      employee: employee._id,
      status: 'Approved',
      $or: [
        { startDate: { $gte: monthStart, $lte: monthEnd } },
        { endDate: { $gte: monthStart, $lte: monthEnd } },
      ],
    });

    let leaveDays = 0;
    approvedLeaves.forEach((l) => {
      leaveDays += l.duration || 1;
    });

    let presentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let totalWorkingHours = 0;
    let completedShifts = 0;

    records.forEach((r) => {
      if (r.status === 'Present') presentDays++;
      else if (r.status === 'Late') lateDays++;
      else if (r.status === 'Half Day') halfDays++;

      if (r.totalHours && r.totalHours > 0) {
        totalWorkingHours += r.totalHours;
        completedShifts++;
      }
    });

    totalWorkingHours = Math.round(totalWorkingHours * 100) / 100;
    const averageWorkingHours =
      completedShifts > 0
        ? Math.round((totalWorkingHours / completedShifts) * 100) / 100
        : 0;

    return res.status(200).json({
      success: true,
      summary: {
        totalWorkingDays: records.length,
        presentDays,
        lateDays,
        halfDays,
        leaveDays,
        totalWorkingHours,
        averageWorkingHours,
        month: `${year}-${String(month).padStart(2, '0')}`,
      },
    });
  } catch (error) {
    next(error);
  }
};
