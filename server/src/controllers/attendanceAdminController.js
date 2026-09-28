import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Leave from '../models/Leave.js';
import Task from '../models/Task.js';
import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';
import { getStartOfDay, getEndOfDay } from './attendanceController.js';
import { stringify } from 'csv-stringify/sync';
import { escapeRegex } from '../utils/escapeRegex.js';

/**
 * Determine live status based on attendance, leave, and time of day
 */
const getLiveStatus = (employee, todayAttendance, todayLeave, settings) => {
  if (todayLeave) return 'On Leave';

  if (todayAttendance) {
    if (!todayAttendance.checkOut) {
      return 'Working';
    }
    return todayAttendance.status;
  }

  const now = new Date();
  let workStartHour = 9;
  let workStartMinute = 0;

  const startTimeStr = settings?.defaultCheckInTime || settings?.workStartTime;
  if (startTimeStr) {
    const [h, m] = startTimeStr.split(':').map(Number);
    if (!isNaN(h)) workStartHour = h;
    if (!isNaN(m)) workStartMinute = m;
  }

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  if (currentHour > workStartHour || (currentHour === workStartHour && currentMinute > workStartMinute + 15)) {
    return 'Absent';
  }

  return 'Absent';
};

/**
 * Helper to resolve department name if an ID is passed
 */
const resolveDepartmentName = async (dept) => {
  if (!dept || dept === 'All') return null;
  if (mongoose.Types.ObjectId.isValid(dept)) {
    const d = await Department.findById(dept);
    if (d) return d.name;
  }
  return dept;
};

/**
 * @desc    Get live workforce monitoring for today
 * @route   GET /api/attendance/admin/today
 * @access  Private (Admin)
 */
export const getTodayWorkforce = async (req, res, next) => {
  try {
    const todayStart = getStartOfDay();
    const todayEnd = getEndOfDay(todayStart);

    const [employees, attendances, leaves, tasks, settings] = await Promise.all([
      Employee.find({ status: 'Active' }).lean(),
      Attendance.find({ date: todayStart }).lean(),
      Leave.find({
        status: 'Approved',
        startDate: { $lte: todayEnd },
        endDate: { $gte: todayStart },
      }).lean(),
      Task.find({ status: 'In Progress' }).lean(),
      (await Settings.getSingleton?.()) || (await Settings.findOne?.().lean()),
    ]);

    const attendanceMap = new Map(attendances.map((a) => [a.employee.toString(), a]));
    const leaveMap = new Map(leaves.map((l) => [l.employee.toString(), l]));
    const taskMap = new Map(tasks.map((t) => [t.assignedTo ? t.assignedTo.toString() : '', t]));

    const workforce = employees.map((emp) => {
      const empIdStr = emp._id.toString();
      const attendance = attendanceMap.get(empIdStr);
      const leave = leaveMap.get(empIdStr);
      const activeTask = taskMap.get(empIdStr);

      const liveStatus = getLiveStatus(emp, attendance, leave, settings);

      let currentDurationMs = 0;
      if (liveStatus === 'Working' && attendance?.checkIn) {
        currentDurationMs = Math.max(0, Date.now() - new Date(attendance.checkIn).getTime());
      }

      return {
        employee: {
          _id: emp._id,
          fullName: emp.fullName,
          employeeId: emp.employeeId,
          department: emp.department,
          avatar: emp.profileImage || emp.avatar || '',
        },
        attendance: attendance || null,
        leave: leave || null,
        task:
          liveStatus === 'Working' && activeTask
            ? {
                title: activeTask.title,
                progress: activeTask.progress || 0,
              }
            : null,
        status: liveStatus,
        currentDurationMs,
      };
    });

    return res.status(200).json({
      success: true,
      workforce,
      records: workforce,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all attendance records with filters (History)
 * @route   GET /api/attendance/admin
 * @access  Private (Admin)
 */
export const getAttendanceHistory = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      department,
      status,
      startDate,
      endDate,
      search,
    } = req.query;

    const query = {};

    // Date range filter
    if (startDate && endDate) {
      query.date = {
        $gte: getStartOfDay(startDate),
        $lte: getEndOfDay(endDate),
      };
    } else if (startDate) {
      query.date = {
        $gte: getStartOfDay(startDate),
        $lte: getEndOfDay(startDate),
      };
    }

    // Status filter
    if (status && status !== 'All') {
      query.status = status;
    }

    // Find employees matching department or search
    const employeeQuery = {};
    const resolvedDept = await resolveDepartmentName(department);
    if (resolvedDept) {
      employeeQuery.department = resolvedDept;
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      employeeQuery.$or = [
        { fullName: searchRegex },
        { employeeId: searchRegex },
        { email: searchRegex },
      ];
    }

    if (Object.keys(employeeQuery).length > 0) {
      const emps = await Employee.find(employeeQuery).select('_id').lean();
      const empIds = emps.map((e) => e._id);
      query.employee = { $in: empIds };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [attendances, total] = await Promise.all([
      Attendance.find(query)
        .populate({
          path: 'employee',
          select: 'fullName employeeId department email profileImage avatar',
        })
        .sort({ date: -1, checkIn: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Attendance.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      records: attendances,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard summary stats
 * @route   GET /api/attendance/admin/summary
 * @access  Private (Admin)
 */
export const getDashboardSummary = async (req, res, next) => {
  try {
    const todayStart = getStartOfDay();
    const todayEnd = getEndOfDay(todayStart);

    const [totalEmps, attendances, leaves] = await Promise.all([
      Employee.countDocuments({ status: 'Active' }),
      Attendance.find({ date: todayStart }).lean(),
      Leave.find({
        status: 'Approved',
        startDate: { $lte: todayEnd },
        endDate: { $gte: todayStart },
      }).lean(),
    ]);

    let present = 0;
    let workingNow = 0;
    let late = 0;
    const onLeave = leaves.length;

    attendances.forEach((a) => {
      if (a.status === 'Present' || a.status === 'Half Day') present++;
      if (a.status === 'Late') late++;
      if (!a.checkOut) workingNow++;
    });

    const totalPresentToday = attendances.length;
    const absent = Math.max(0, totalEmps - (totalPresentToday + onLeave));

    return res.status(200).json({
      success: true,
      stats: {
        totalEmployees: totalEmps,
        present: totalPresentToday,
        workingNow,
        late,
        absent,
        onLeave,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get specific employee attendance details
 * @route   GET /api/attendance/admin/:employeeId
 * @access  Private (Admin)
 */
export const getEmployeeAttendanceDetails = async (req, res, next) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format',
      });
    }

    const employee = await Employee.findById(employeeId).lean();

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const { month, year } = req.query;
    const todayStart = getStartOfDay();
    const todayEnd = getEndOfDay(todayStart);

    // Determine query date range
    let startDate, endDate;
    if (month && year) {
      startDate = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);
      endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const records = await Attendance.find({
      employee: employee._id,
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: -1 })
      .lean();

    const todayRecord = records.find(
      (r) => new Date(r.date).getTime() === todayStart.getTime()
    );

    let liveStatus = 'Absent';
    if (todayRecord) {
      liveStatus = !todayRecord.checkOut ? 'Working' : todayRecord.status;
    } else {
      const leaveToday = await Leave.findOne({
        employee: employee._id,
        status: 'Approved',
        startDate: { $lte: todayEnd },
        endDate: { $gte: todayStart },
      });
      if (leaveToday) liveStatus = 'On Leave';
    }

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

    const leaveRecords = await Leave.countDocuments({
      employee: employee._id,
      status: 'Approved',
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
      ],
    });

    totalWorkingHours = Math.round(totalWorkingHours * 100) / 100;
    const averageWorkingHours =
      completedShifts > 0
        ? Math.round((totalWorkingHours / completedShifts) * 100) / 100
        : 0;

    return res.status(200).json({
      success: true,
      employee,
      liveStatus,
      todayAttendance: todayRecord || null,
      monthlySummary: {
        present: presentDays,
        late: lateDays,
        halfDay: halfDays,
        leave: leaveRecords,
        totalWorkingHours,
        averageWorkingHours,
      },
      history: records,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Correct/Edit an attendance record
 * @route   PUT /api/attendance/admin/:id
 * @access  Private (Admin)
 */
export const updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance ID format',
      });
    }

    const { checkIn, checkOut, status, notes } = req.body;
    const adminUser = req.user || req.admin;
    const adminId = adminUser?._id;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const prevStatus = attendance.status;
    const prevCheckIn = attendance.checkIn;
    const prevCheckOut = attendance.checkOut;

    if (checkIn) attendance.checkIn = new Date(checkIn);
    if (checkOut !== undefined) {
      attendance.checkOut = checkOut ? new Date(checkOut) : null;
    }
    if (status) attendance.status = status;

    const auditNote = `[Corrected by Admin on ${new Date().toLocaleDateString()}] ${notes || ''}`;
    attendance.notes = attendance.notes ? `${attendance.notes}\n${auditNote}` : auditNote;

    if (attendance.checkIn && attendance.checkOut) {
      const diffMs = attendance.checkOut.getTime() - attendance.checkIn.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      attendance.totalHours = Math.max(0, Math.round(diffHours * 100) / 100);
    } else {
      attendance.totalHours = 0;
    }

    await attendance.save();

    // Create Audit Log entry for the correction
    try {
      if (adminId) {
        await AuditLog.create({
          user: adminId,
          userRole: adminUser?.role || 'admin',
          action: 'UPDATE',
          module: 'ATTENDANCE',
          targetId: attendance._id,
          targetType: 'Attendance',
          description: `Attendance corrected for employee ID: ${attendance.employee}`,
          metadata: {
            previousStatus: prevStatus,
            newStatus: attendance.status,
            previousCheckIn: prevCheckIn,
            newCheckIn: attendance.checkIn,
            previousCheckOut: prevCheckOut,
            newCheckOut: attendance.checkOut,
            notes,
          },
        });
      }
    } catch {
      // Non-fatal if audit logging fails
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance corrected successfully',
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export attendance to CSV
 * @route   GET /api/attendance/admin/export
 * @access  Private (Admin)
 */
export const exportAttendance = async (req, res, next) => {
  try {
    const { startDate, endDate, department, status, search } = req.query;

    const query = {};

    if (startDate && endDate) {
      query.date = {
        $gte: getStartOfDay(startDate),
        $lte: getEndOfDay(endDate),
      };
    } else if (startDate) {
      query.date = {
        $gte: getStartOfDay(startDate),
        $lte: getEndOfDay(startDate),
      };
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    const employeeQuery = {};
    const resolvedDept = await resolveDepartmentName(department);
    if (resolvedDept) {
      employeeQuery.department = resolvedDept;
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      employeeQuery.$or = [
        { fullName: searchRegex },
        { employeeId: searchRegex },
        { email: searchRegex },
      ];
    }

    if (Object.keys(employeeQuery).length > 0) {
      const emps = await Employee.find(employeeQuery).select('_id').lean();
      query.employee = { $in: emps.map((e) => e._id) };
    }

    const records = await Attendance.find(query)
      .populate({
        path: 'employee',
        select: 'fullName employeeId department',
      })
      .sort({ date: -1, checkIn: -1 })
      .lean();

    const dataToExport = records.map((r) => ({
      'Employee Name': r.employee?.fullName || 'Unknown',
      'Employee ID': r.employee?.employeeId || 'Unknown',
      'Department': r.employee?.department || 'Unknown',
      Date: r.date ? new Date(r.date).toLocaleDateString() : '',
      'Check In': r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '',
      'Check Out': r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : 'N/A',
      'Total Hours': r.totalHours
        ? `${Math.floor(r.totalHours)}h ${Math.round((r.totalHours % 1) * 60)}m`
        : '0h 0m',
      Status: r.status,
      Notes: r.notes || '',
    }));

    const csv = stringify(dataToExport, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="attendance_export_${new Date().toISOString().split('T')[0]}.csv"`
    );

    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
