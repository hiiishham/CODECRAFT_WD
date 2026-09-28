import Employee from '../models/Employee.js';
import Admin from '../models/Admin.js';
import Department from '../models/Department.js';
import Leave from '../models/Leave.js';
import Salary from '../models/Salary.js';
import WorkSubmission from '../models/WorkSubmission.js';
import Attendance from '../models/Attendance.js';
import Task from '../models/Task.js';

/**
 * @desc    Get dashboard metrics & summary statistics including leaves and confidential salary overview for admin
 * @route   GET /api/dashboard/stats
 * @access  Private (Admin, Manager)
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      onLeaveEmployees,
      managerCount,
      allDepartments,
      employeeAggregation,
      recentEmployees,
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,
      recentLeaves,
      onLeaveToday,
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      changesRequestedSubmissions,
      presentToday,
      activeTasks,
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'Active' }),
      Employee.countDocuments({ status: 'Inactive' }),
      Employee.countDocuments({ status: 'On Leave' }),
      Admin.countDocuments({ role: 'manager' }),
      Department.find().sort({ name: 1 }),
      // Group by department to count employees per department
      Employee.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Get 5 most recently added employees
      Employee.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('employeeId fullName email department designation status profileImage createdAt'),
      // Leave statistics
      Leave.countDocuments({ status: 'Pending' }),
      Leave.countDocuments({ status: 'Approved' }),
      Leave.countDocuments({ status: 'Rejected' }),
      // 5 most recent leave requests
      Leave.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('employee', 'fullName employeeId department designation profileImage'),
      // Active approved leaves today (unique employees)
      Leave.distinct('employee', {
        status: 'Approved',
        startDate: { $lte: todayEnd },
        endDate: { $gte: todayStart },
      }),
      // Work Submission metrics
      WorkSubmission.countDocuments(),
      WorkSubmission.countDocuments({ status: 'Pending Review' }),
      WorkSubmission.countDocuments({ status: 'Approved' }),
      WorkSubmission.countDocuments({ status: 'Changes Requested' }),
      // Live Attendance and Task counts
      Attendance.countDocuments({ date: { $gte: todayStart, $lte: todayEnd }, status: { $in: ['Present', 'Late'] } }),
      Task.countDocuments({ status: { $in: ['Assigned', 'In Progress'] } }),
    ]);

    const onLeaveTodayCount = Array.isArray(onLeaveToday) ? onLeaveToday.length : onLeaveToday;

    // Build count map
    const countMap = {};
    employeeAggregation.forEach((dept) => {
      if (dept._id) {
        countMap[dept._id] = dept.count;
      }
    });

    // Build real department distribution from Department collection
    let departmentDistribution;
    let departmentCount = allDepartments.length;

    if (allDepartments.length > 0) {
      departmentDistribution = allDepartments.map((dept) => ({
        department: dept.name,
        count: countMap[dept.name] || 0,
      })).sort((a, b) => b.count - a.count || a.department.localeCompare(b.department));
    } else {
      // Fallback if no Department documents exist yet
      departmentDistribution = employeeAggregation.map((dept) => ({
        department: dept._id || 'Unassigned',
        count: dept.count,
      }));
      departmentCount = employeeAggregation.length;
    }

    // Role-based security: only calculate salary metrics if user is admin
    let salaryOverview = null;
    if (req.user?.role === 'admin') {
      const now = new Date();
      const currentPayMonth = now.getMonth() + 1;
      const currentPayYear = now.getFullYear();

      const [salaryAgg, paidCount, pendingPayrollAgg] = await Promise.all([
        Salary.aggregate([
          {
            $match: {
              payMonth: currentPayMonth,
              payYear: currentPayYear,
              status: { $in: ['Processed', 'Paid'] },
            },
          },
          {
            $group: {
              _id: null,
              totalPayroll: { $sum: '$netSalary' },
              averageSalary: { $avg: '$netSalary' },
            },
          },
        ]),
        Salary.countDocuments({
          payMonth: currentPayMonth,
          payYear: currentPayYear,
          status: 'Paid',
        }),
        Salary.aggregate([
          {
            $match: {
              payMonth: currentPayMonth,
              payYear: currentPayYear,
              status: { $nin: ['Paid', 'Cancelled', 'Rejected'] },
            },
          },
          { $group: { _id: null, pendingPayroll: { $sum: '$netSalary' } } },
        ]),
      ]);

      const sResult = salaryAgg[0] || { totalPayroll: 0, averageSalary: 0 };
      const pendingResult = pendingPayrollAgg[0] || { pendingPayroll: 0 };

      salaryOverview = {
        totalPayroll: Math.round(sResult.totalPayroll * 100) / 100,
        averageSalary: Math.round(sResult.averageSalary * 100) / 100,
        paidEmployees: paidCount,
        pendingPayroll: Math.round(pendingResult.pendingPayroll * 100) / 100,
        payMonth: currentPayMonth,
        payYear: currentPayYear,
      };
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        onLeaveEmployees,
        managerCount,
        departmentCount,
        departmentDistribution,
        recentEmployees,
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves,
        totalLeaves: pendingLeaves + approvedLeaves + rejectedLeaves,
        recentLeaves,
        onLeaveToday: onLeaveTodayCount,
        presentToday,
        activeTasks,
        submissions: {
          total: totalSubmissions,
          pendingReview: pendingSubmissions,
          approved: approvedSubmissions,
          changesRequested: changesRequestedSubmissions,
        },
        ...(salaryOverview ? { salaryOverview } : {}),
      },
      // Flat keys for client convenience
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      onLeaveEmployees,
      managerCount,
      departmentCount,
      recentEmployees,
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,
      recentLeaves,
      onLeaveToday: onLeaveTodayCount,
      presentToday,
      activeTasks,
      submissions: {
        total: totalSubmissions,
        pendingReview: pendingSubmissions,
        approved: approvedSubmissions,
        changesRequested: changesRequestedSubmissions,
      },
      ...(salaryOverview ? { salaryOverview } : {}),
    });
  } catch (error) {
    next(error);
  }
};
