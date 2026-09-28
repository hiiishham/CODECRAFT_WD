import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Leave from '../models/Leave.js';

/**
 * Build a date range filter for a given field using query params
 */
const buildDateFilter = (query, field = 'createdAt') => {
  const filter = {};
  if (query.from) {
    const from = new Date(query.from);
    if (!isNaN(from.getTime())) {
      from.setHours(0, 0, 0, 0);
      filter[field] = { ...filter[field], $gte: from };
    }
  }
  if (query.to) {
    const to = new Date(query.to);
    if (!isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      filter[field] = { ...filter[field], $lte: to };
    }
  }
  return filter;
};

/**
 * @desc    Get high-level overview statistics
 * @route   GET /api/reports/overview
 * @access  Private (Admin, Manager)
 */
export const getOverview = async (req, res, next) => {
  try {
    const dateFilter = buildDateFilter(req.query, 'joiningDate');
    let targetDept = null;
    if (req.user?.role === 'manager') {
      targetDept = req.user.department || 'Development';
    } else if (req.query.department && req.query.department !== 'All') {
      targetDept = req.query.department;
    }
    const deptFilter = targetDept ? { department: targetDept } : {};

    const empFilter = { ...dateFilter, ...deptFilter };

    // Determine overlapping window for on-leave count
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    let leaveStartLimit = todayEnd;
    let leaveEndLimit = todayStart;

    if (req.query.to) {
      const to = new Date(req.query.to);
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        leaveStartLimit = to;
      }
    }
    if (req.query.from) {
      const from = new Date(req.query.from);
      if (!isNaN(from.getTime())) {
        from.setHours(0, 0, 0, 0);
        leaveEndLimit = from;
      }
    }

    const leaveMatch = {
      status: 'Approved',
      startDate: { $lte: leaveStartLimit },
      endDate: { $gte: leaveEndLimit },
    };

    if (targetDept) {
      const deptEmps = await Employee.find({ department: targetDept }).select('_id').lean();
      leaveMatch.employee = { $in: deptEmps.map((e) => e._id) };
    }

    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      totalDepartments,
      onLeaveEmpIds,
      manualOnLeaveEmps,
    ] = await Promise.all([
      Employee.countDocuments(empFilter),
      Employee.countDocuments({ ...empFilter, status: 'Active' }),
      Employee.countDocuments({ ...empFilter, status: 'Inactive' }),
      Department.countDocuments({ status: 'Active' }),
      Leave.distinct('employee', leaveMatch),
      Employee.find({ ...empFilter, status: 'On Leave' }).select('_id').lean(),
    ]);

    // Unique count of employees on approved leave or marked on leave
    const uniqueOnLeaveSet = new Set([
      ...onLeaveEmpIds.map((id) => id.toString()),
      ...manualOnLeaveEmps.map((e) => e._id.toString()),
    ]);
    const onLeaveEmployees = uniqueOnLeaveSet.size;

    return res.status(200).json({
      success: true,
      overview: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        onLeaveEmployees,
        totalDepartments,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get department distribution report
 * @route   GET /api/reports/departments
 * @access  Private (Admin, Manager)
 */
export const getDepartmentReport = async (req, res, next) => {
  try {
    const dateFilter = buildDateFilter(req.query, 'joiningDate');
    let deptFilter = {};
    if (req.user?.role === 'manager') {
      deptFilter = { department: req.user.department || 'Development' };
    } else if (req.query.department && req.query.department !== 'All') {
      deptFilter = { department: req.query.department };
    }

    const matchStage = { ...dateFilter, ...deptFilter };

    const pipeline = [
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ];

    const aggregation = await Employee.aggregate(pipeline);

    const totalEmployees = aggregation.reduce((sum, d) => sum + d.count, 0);

    const departments = aggregation.map((d) => ({
      department: d._id || 'Unassigned',
      count: d.count,
      percentage: totalEmployees > 0 ? Math.round((d.count / totalEmployees) * 100) : 0,
    }));

    return res.status(200).json({
      success: true,
      totalEmployees,
      departments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get full employee list for export (no pagination, CSV-ready)
 * @route   GET /api/reports/employees
 * @access  Private (Admin)
 */
export const getEmployeeExport = async (req, res, next) => {
  try {
    const dateFilter = buildDateFilter(req.query, 'joiningDate');
    const deptFilter = req.query.department && req.query.department !== 'All'
      ? { department: req.query.department }
      : {};

    const filter = { ...dateFilter, ...deptFilter };

    const employees = await Employee.find(filter)
      .select('employeeId fullName email phone department designation joiningDate salary status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get leave analytics and export data
 * @route   GET /api/reports/leaves
 * @access  Private (Admin, Manager)
 */
export const getLeaveReport = async (req, res, next) => {
  try {
    const dateFilter = buildDateFilter(req.query, 'startDate');
    const deptFilter = {};

    // If department filter is specified, find matching employees first
    let employeeFilter = {};
    if (req.user?.role === 'manager') {
      const managerDept = req.user.department || 'Development';
      const empIds = await Employee.find({ department: managerDept }).select('_id').lean();
      employeeFilter = { employee: { $in: empIds.map((e) => e._id) } };
    } else if (req.query.department && req.query.department !== 'All') {
      const empIds = await Employee.find({ department: req.query.department }).select('_id').lean();
      employeeFilter = { employee: { $in: empIds.map((e) => e._id) } };
    }

    const leaveFilter = { ...dateFilter, ...employeeFilter };

    // Status aggregation
    const [
      totalLeaves,
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,
      typeAggregation,
      leaves,
    ] = await Promise.all([
      Leave.countDocuments(leaveFilter),
      Leave.countDocuments({ ...leaveFilter, status: 'Pending' }),
      Leave.countDocuments({ ...leaveFilter, status: 'Approved' }),
      Leave.countDocuments({ ...leaveFilter, status: 'Rejected' }),
      // Leave type distribution
      Leave.aggregate([
        ...(Object.keys(leaveFilter).length > 0 ? [{ $match: leaveFilter }] : []),
        {
          $group: {
            _id: '$leaveType',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      // Full leave list for export
      Leave.find(leaveFilter)
        .sort({ createdAt: -1 })
        .populate('employee', 'fullName employeeId department designation')
        .lean(),
    ]);

    const leaveTypeDistribution = typeAggregation.map((t) => ({
      type: t._id,
      count: t.count,
      percentage: totalLeaves > 0 ? Math.round((t.count / totalLeaves) * 100) : 0,
    }));

    return res.status(200).json({
      success: true,
      stats: {
        totalLeaves,
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves,
      },
      leaveTypeDistribution,
      leaves,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get employee joining trends (grouped by month)
 * @route   GET /api/reports/joining-trends
 * @access  Private (Admin, Manager)
 */
export const getJoiningTrends = async (req, res, next) => {
  try {
    let deptFilter = {};
    if (req.user?.role === 'manager') {
      deptFilter = { department: req.user.department || 'Development' };
    } else if (req.query.department && req.query.department !== 'All') {
      deptFilter = { department: req.query.department };
    }

    // Determine date range for joining trends
    const dateFilter = buildDateFilter(req.query, 'joiningDate');
    const matchStage = { ...dateFilter, ...deptFilter };

    const pipeline = [
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: {
            year: { $year: '$joiningDate' },
            month: { $month: '$joiningDate' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ];

    const aggregation = await Employee.aggregate(pipeline);

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const trends = aggregation.map((item) => ({
      year: item._id.year,
      month: item._id.month,
      monthName: monthNames[item._id.month - 1],
      label: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      count: item.count,
    }));

    return res.status(200).json({
      success: true,
      trends,
    });
  } catch (error) {
    next(error);
  }
};
