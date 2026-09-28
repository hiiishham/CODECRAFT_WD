import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Leave from '../models/Leave.js';
import Task from '../models/Task.js';
import Performance from '../models/Performance.js';
import Salary from '../models/Salary.js';
import AuditLog from '../models/AuditLog.js';
import Goal from '../models/Goal.js';
import WorkSubmission from '../models/WorkSubmission.js';
import Attendance from '../models/Attendance.js';

// Helper to get date boundaries
const getDateFilter = (filterType) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (filterType === 'Today') {
    // defaults
  } else if (filterType === 'This Week') {
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    start.setDate(diff);
  } else if (filterType === 'This Month') {
    start.setDate(1);
  } else if (filterType === 'Last Month') {
    start.setMonth(start.getMonth() - 1);
    start.setDate(1);
    end.setDate(0); // last day of previous month
    end.setHours(23, 59, 59, 999);
  } else if (filterType === 'This Year') {
    start.setMonth(0, 1);
  } else {
    // Default to a wide range or no filter if 'All Time'
    return null;
  }
  
  return { $gte: start, $lte: end };
};

/**
 * @desc    Get dashboard super stats and recent activity
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
export const getDashboardSuperStats = async (req, res, next) => {
  try {
    const { dateFilter } = req.query;
    const dateQuery = getDateFilter(dateFilter || 'This Month');
    
    // Base filter for queries that depend on date
    const dateMatch = dateQuery ? { createdAt: dateQuery } : {};

    // Get today boundaries for attendance
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Determine current payroll cycle (payMonth & payYear)
    const now = new Date();
    let currentPayMonth = req.query.payMonth ? parseInt(req.query.payMonth, 10) : (now.getMonth() + 1);
    let currentPayYear = req.query.payYear ? parseInt(req.query.payYear, 10) : now.getFullYear();

    if (dateFilter === 'Last Month' && !req.query.payMonth) {
      currentPayMonth = currentPayMonth === 1 ? 12 : currentPayMonth - 1;
      if (currentPayMonth === 12) currentPayYear -= 1;
    }

    const payrollMatch = {
      status: { $in: ['Processed', 'Paid'] },
      payMonth: currentPayMonth,
      payYear: currentPayYear,
    };

    const [
      totalEmployees,
      activeEmployees,
      newEmployees,
      totalDepartments,
      presentToday,
      onLeaveToday,
      pendingLeaves,
      activeTasks,
      pendingSubmissions,
      payrollAgg,
      recentActivity
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'Active' }),
      Employee.countDocuments(dateMatch),
      Department.countDocuments(),
      Attendance.countDocuments({ date: { $gte: todayStart, $lte: todayEnd }, status: { $in: ['Present', 'Late'] } }),
      Leave.countDocuments({ status: 'Approved', startDate: { $lte: todayEnd }, endDate: { $gte: todayStart } }),
      Leave.countDocuments({ status: 'Pending' }),
      Task.countDocuments({ status: { $in: ['Assigned', 'In Progress'] } }),
      WorkSubmission.countDocuments({ status: 'Pending Review' }),
      Salary.aggregate([
        { $match: payrollMatch },
        { $group: { _id: null, totalPayroll: { $sum: '$netSalary' } } }
      ]),
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'fullName email')
        .lean()
    ]);

    // Calculate real 7-day platform activity trend from AuditLog collection
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const activityTrendAgg = await AuditLog.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const dayMap = {};
    activityTrendAgg.forEach((item) => {
      dayMap[item._id] = item.count;
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const activityTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const name = dayNames[d.getDay()];
      activityTrend.push({
        date: key,
        name,
        value: dayMap[key] || 0,
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalEmployees,
        activeEmployees,
        newEmployees,
        totalDepartments,
        presentToday,
        onLeaveToday,
        pendingLeaves,
        activeTasks,
        pendingSubmissions,
        totalPayroll: payrollAgg[0]?.totalPayroll || 0,
      },
      recentActivity,
      activityTrend,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Workforce Analytics
 * @route   GET /api/admin/analytics/workforce
 */
export const getWorkforceAnalytics = async (req, res, next) => {
  try {
    const [statusDistribution, deptDistribution, joinTrends] = await Promise.all([
      Employee.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Employee.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      // Join trends last 6 months
      Employee.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
          }
        },
        {
          $group: {
            _id: { $month: '$createdAt' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusDistribution,
        deptDistribution,
        joinTrends
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Attendance Analytics
 * @route   GET /api/admin/analytics/attendance
 */
export const getAttendanceAnalytics = async (req, res, next) => {
  try {
    const { dateFilter } = req.query;
    const dateQuery = getDateFilter(dateFilter || 'This Month');
    const dateMatch = dateQuery ? { date: dateQuery } : {};

    const [statusDist, dailyTrend] = await Promise.all([
      Attendance.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Attendance.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            present: { $sum: { $cond: [{ $in: ['$status', ['Present', 'Late']] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusDistribution: statusDist,
        dailyTrend
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Leave Analytics
 * @route   GET /api/admin/analytics/leave
 */
export const getLeaveAnalytics = async (req, res, next) => {
  try {
    const { dateFilter } = req.query;
    const dateQuery = getDateFilter(dateFilter || 'This Year');
    const dateMatch = dateQuery ? { createdAt: dateQuery } : {};

    const [typeDist, statusDist] = await Promise.all([
      Leave.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$leaveType', count: { $sum: 1 } } }
      ]),
      Leave.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        typeDistribution: typeDist,
        statusDistribution: statusDist
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Tasks Analytics
 * @route   GET /api/admin/analytics/tasks
 */
export const getTaskAnalytics = async (req, res, next) => {
  try {
    const { dateFilter } = req.query;
    const dateQuery = getDateFilter(dateFilter || 'This Year');
    const dateMatch = dateQuery ? { createdAt: dateQuery } : {};

    const [statusDist, priorityDist] = await Promise.all([
      Task.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusDistribution: statusDist,
        priorityDistribution: priorityDist
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Performance Analytics
 * @route   GET /api/admin/analytics/performance
 */
export const getPerformanceAnalytics = async (req, res, next) => {
  try {
    const { dateFilter } = req.query;
    const dateQuery = getDateFilter(dateFilter || 'This Year');
    const dateMatch = dateQuery ? { createdAt: dateQuery } : {};

    const [ratingAgg, goalDist] = await Promise.all([
      Performance.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$overallRating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Goal.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        ratingDistribution: ratingAgg,
        goalStatusDistribution: goalDist
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Salary Analytics
 * @route   GET /api/admin/analytics/salary
 */
export const getSalaryAnalytics = async (req, res, next) => {
  try {
    const [totals, deptDist] = await Promise.all([
      Salary.aggregate([
        {
          $group: {
            _id: null,
            totalBasic: { $sum: '$basicSalary' },
            totalNet: { $sum: '$netSalary' },
            avgNet: { $avg: '$netSalary' },
            employeeCount: { $sum: 1 }
          }
        }
      ]),
      // To get salary by department, we need to lookup Employee
      Salary.aggregate([
        {
          $lookup: {
            from: 'employees',
            localField: 'employee',
            foreignField: '_id',
            as: 'empData'
          }
        },
        { $unwind: '$empData' },
        {
          $group: {
            _id: '$empData.department',
            totalSalary: { $sum: '$netSalary' }
          }
        },
        { $sort: { totalSalary: -1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totals: totals[0] || { totalBasic: 0, totalNet: 0, avgNet: 0, employeeCount: 0 },
        departmentDistribution: deptDist
      }
    });
  } catch (error) {
    next(error);
  }
};
