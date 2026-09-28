import mongoose from 'mongoose';
import Performance from '../models/Performance.js';
import Goal from '../models/Goal.js';
import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import Attendance from '../models/Attendance.js';
import Admin from '../models/Admin.js';
import { resolveEmployeeForUser } from '../utils/employeeResolver.js';
import { notifyUser } from '../utils/notificationService.js';
import { escapeRegex } from '../utils/escapeRegex.js';

// Helper to get department team employee IDs for a manager
const getManagerTeamEmployeeIds = async (user) => {
  if (user.role !== 'manager' || !user.department) return null;
  const dept = user.department;
  const emps = await Employee.find({
    $or: [
      { department: dept },
      { department: new RegExp(`^${escapeRegex(dept)}$`, 'i') },
      ...(mongoose.Types.ObjectId.isValid(dept) ? [{ department: new mongoose.Types.ObjectId(dept) }] : []),
    ],
  }).select('_id');
  return emps.map((e) => e._id);
};

const isEmployeeInManagerDept = (empDept, managerDept) => {
  if (!empDept || !managerDept) return false;
  const empDeptStr = typeof empDept === 'object' && empDept?.name ? empDept.name : empDept.toString();
  const mgrDeptStr = typeof managerDept === 'object' && managerDept?.name ? managerDept.name : managerDept.toString();
  return empDeptStr.toLowerCase().trim() === mgrDeptStr.toLowerCase().trim();
};

/**
 * @desc    Get all performance reviews (Admin/Manager)
 * @route   GET /api/performance
 * @access  Private (Admin, Manager)
 */
export const getPerformances = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, employee, status, rating } = req.query;
    const filter = {};

    if (employee && employee !== 'all') {
      if (mongoose.Types.ObjectId.isValid(employee)) {
        filter.employee = employee;
      }
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (rating && rating !== 'all') {
      filter.overallRating = Number(rating);
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      const matchingEmployees = await Employee.find({
        $or: [{ fullName: searchRegex }, { employeeId: searchRegex }],
      }).select('_id');
      const empIds = matchingEmployees.map((e) => e._id);
      filter.$or = [
        { reviewPeriod: searchRegex },
        { employee: { $in: empIds } },
      ];
    }

    // Manager scoping: Restrict to manager's department
    if (req.user.role === 'manager') {
      const teamIds = await getManagerTeamEmployeeIds(req.user);
      if (teamIds) {
        if (filter.employee) {
          if (filter.employee.$in) {
            const teamIdStrs = new Set(teamIds.map((id) => id.toString()));
            filter.employee.$in = filter.employee.$in.filter((id) => teamIdStrs.has(id.toString()));
          } else {
            const isMatch = teamIds.some((id) => id.toString() === filter.employee.toString());
            if (!isMatch) {
              return res.status(200).json({
                success: true,
                data: [],
                pagination: { page, limit, total: 0, totalPages: 0 },
              });
            }
          }
        } else {
          filter.employee = { $in: teamIds };
        }
      }
    }

    const [reviews, total] = await Promise.all([
      Performance.find(filter)
        .populate('employee', 'fullName employeeId department designation')
        .populate({ path: 'employee', populate: { path: 'department', select: 'name' } })
        .populate('reviewedBy', 'name email role')
        .sort({ reviewedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Performance.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get performance stats (Admin/Manager)
 * @route   GET /api/performance/stats
 * @access  Private (Admin, Manager)
 */
export const getPerformanceStats = async (req, res, next) => {
  try {
    const matchFilter = {};
    let teamIds = null;

    if (req.user.role === 'manager') {
      teamIds = await getManagerTeamEmployeeIds(req.user);
      if (teamIds) {
        matchFilter.employee = { $in: teamIds };
      }
    }

    const [totalReviews, avgRatingAgg, goalStats] = await Promise.all([
      Performance.countDocuments(matchFilter),
      Performance.aggregate([
        { $match: matchFilter },
        { $group: { _id: null, avgRating: { $avg: '$overallRating' } } },
      ]),
      Goal.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const avgRating = avgRatingAgg.length > 0 ? parseFloat(avgRatingAgg[0].avgRating.toFixed(2)) : 0;

    const goalCounts = { Completed: 0, 'In Progress': 0, 'Not Started': 0, Overdue: 0 };
    goalStats.forEach((s) => { goalCounts[s._id] = s.count; });
    const totalGoals = Object.values(goalCounts).reduce((a, b) => a + b, 0);

    // Unique employees reviewed
    const uniqueEmployees = await Performance.distinct('employee', matchFilter);

    // Pending reviews = employees with no review in last 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const recentFilter = {
      ...matchFilter,
      reviewedAt: { $gte: cutoff },
    };
    const recentlyReviewed = await Performance.distinct('employee', recentFilter);

    const empCountFilter = { status: 'Active' };
    if (req.user.role === 'manager' && req.user.department) {
      empCountFilter.department = req.user.department;
    }
    const totalEmployees = await Employee.countDocuments(empCountFilter);
    const pendingReviews = Math.max(0, totalEmployees - recentlyReviewed.length);

    return res.status(200).json({
      success: true,
      data: {
        totalReviews,
        employeesReviewed: uniqueEmployees.length,
        avgRating,
        goalsCompleted: goalCounts['Completed'],
        goalsInProgress: goalCounts['In Progress'],
        totalGoals,
        pendingReviews,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single performance review (Admin/Manager)
 * @route   GET /api/performance/:id
 * @access  Private (Admin, Manager)
 */
export const getPerformanceById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid performance review ID format' });
    }

    const review = await Performance.findById(req.params.id)
      .populate('employee', 'fullName employeeId department designation profileImage')
      .populate({ path: 'employee', populate: { path: 'department', select: 'name' } })
      .populate('reviewedBy', 'name email role')
      .lean();

    if (!review) {
      return res.status(404).json({ success: false, message: 'Performance review not found' });
    }

    // Manager scoping check
    if (req.user.role === 'manager') {
      const empDept = review.employee?.department?._id || review.employee?.department;
      if (!isEmployeeInManagerDept(empDept, req.user.department)) {
        return res.status(403).json({ success: false, message: 'Access denied: Employee is not in your department' });
      }
    }

    // Fetch linked goals for that employee
    const goals = await Goal.find({ employee: review.employee._id })
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    const now = new Date();
    const enrichedGoals = goals.map((g) => ({
      ...g,
      isOverdue: g.dueDate && new Date(g.dueDate) < now && g.progress < 100,
    }));

    return res.status(200).json({
      success: true,
      data: { ...review, goals: enrichedGoals },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a performance review (Admin/Manager)
 * @route   POST /api/performance
 * @access  Private (Admin, Manager)
 */
export const createPerformance = async (req, res, next) => {
  try {
    const { employee, reviewPeriod, overallRating, strengths, areasForImprovement, managerFeedback, status } = req.body;

    if (!employee || !reviewPeriod || !overallRating || !managerFeedback) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: employee, reviewPeriod, overallRating, managerFeedback',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(employee)) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID format' });
    }

    const rating = Number(overallRating);
    if (isNaN(rating) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }

    if (status !== undefined) {
      const validStatuses = ['Draft', 'Submitted', 'Reviewed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid review status (Draft, Submitted, Reviewed)' });
      }
    }

    const empDoc = await Employee.findById(employee);
    if (!empDoc) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Manager can only review employees in their department
    if (req.user.role === 'manager') {
      if (!isEmployeeInManagerDept(empDoc.department, req.user.department)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only review employees in your department',
        });
      }
    }

    // Check for duplicate (same employee + reviewPeriod)
    const existing = await Performance.findOne({ employee, reviewPeriod: reviewPeriod.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A performance review for "${reviewPeriod.trim()}" already exists for this employee`,
      });
    }

    const review = await Performance.create({
      employee,
      reviewPeriod: reviewPeriod.trim(),
      overallRating: rating,
      strengths: strengths?.trim() || '',
      areasForImprovement: areasForImprovement?.trim() || '',
      managerFeedback: managerFeedback.trim(),
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      status: status || 'Reviewed',
    });

    // Notify the employee
    if (empDoc.email) {
      const empAdminUser = await Admin.findOne({ email: empDoc.email.toLowerCase().trim() });
      if (empAdminUser) {
        await notifyUser(empAdminUser._id, {
          title: 'Performance Review Available',
          message: `Your performance review for ${reviewPeriod.trim()} is now available.`,
          type: 'performance',
          relatedId: review._id,
          relatedType: 'Performance',
        });
      }
    }

    const populated = await Performance.findById(review._id)
      .populate('employee', 'fullName employeeId department')
      .populate('reviewedBy', 'name email role');

    return res.status(201).json({
      success: true,
      message: 'Performance review created successfully',
      data: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A performance review for this period already exists for this employee',
      });
    }
    next(error);
  }
};

/**
 * @desc    Update a performance review (Admin/Manager)
 * @route   PUT /api/performance/:id
 * @access  Private (Admin, Manager)
 */
export const updatePerformance = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid performance review ID format' });
    }

    const review = await Performance.findById(req.params.id).populate('employee');
    if (!review) {
      return res.status(404).json({ success: false, message: 'Performance review not found' });
    }

    // Manager authorization check
    if (req.user.role === 'manager') {
      const empDept = review.employee?.department;
      if (!isEmployeeInManagerDept(empDept, req.user.department)) {
        return res.status(403).json({ success: false, message: 'Access denied: Employee is not in your department' });
      }
    }

    const { reviewPeriod, overallRating, strengths, areasForImprovement, managerFeedback, status } = req.body;

    if (overallRating !== undefined) {
      const rating = Number(overallRating);
      if (isNaN(rating) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
      }
      review.overallRating = rating;
    }

    if (status !== undefined) {
      const validStatuses = ['Draft', 'Submitted', 'Reviewed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid review status (Draft, Submitted, Reviewed)' });
      }
      review.status = status;
    }

    if (reviewPeriod !== undefined) review.reviewPeriod = reviewPeriod.trim();
    if (strengths !== undefined) review.strengths = strengths.trim();
    if (areasForImprovement !== undefined) review.areasForImprovement = areasForImprovement.trim();
    if (managerFeedback !== undefined) review.managerFeedback = managerFeedback.trim();

    await review.save();

    // Dispatch update notification to employee
    try {
      const targetEmp = await Employee.findById(review.employee?._id || review.employee);
      if (targetEmp?.email) {
        const empAdmin = await Admin.findOne({ email: targetEmp.email.toLowerCase().trim() });
        if (empAdmin) {
          await notifyUser(empAdmin._id, {
            title: 'Performance Review Updated',
            message: `Your performance review for ${review.reviewPeriod} has been updated.`,
            type: 'performance',
            relatedId: review._id,
            relatedType: 'Performance',
          });
        }
      }
    } catch (e) {
      // non-fatal
    }

    const populated = await Performance.findById(review._id)
      .populate('employee', 'fullName employeeId department')
      .populate('reviewedBy', 'name email role');

    return res.status(200).json({
      success: true,
      message: 'Performance review updated successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get my performance reviews (Employee)
 * @route   GET /api/performance/my
 * @access  Private (Employee)
 */
export const getMyPerformances = async (req, res, next) => {
  try {
    const emp = await resolveEmployeeForUser(req.user);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const reviews = await Performance.find({ employee: emp._id })
      .populate('reviewedBy', 'name email role')
      .sort({ reviewedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single performance review for employee (own only)
 * @route   GET /api/performance/my/:id
 * @access  Private (Employee)
 */
export const getMyPerformanceById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid review ID format' });
    }

    const emp = await resolveEmployeeForUser(req.user);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const review = await Performance.findOne({ _id: req.params.id, employee: emp._id })
      .populate('reviewedBy', 'name email role')
      .lean();

    if (!review) {
      return res.status(404).json({ success: false, message: 'Performance review not found' });
    }

    return res.status(200).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get employee performance summary (combined: tasks, attendance, goals, reviews)
 * @route   GET /api/performance/summary/me
 * @access  Private (Employee)
 */
export const getMyPerformanceSummary = async (req, res, next) => {
  try {
    const emp = await resolveEmployeeForUser(req.user);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Fetch in parallel
    const [tasks, goals, reviews, attendanceRecords] = await Promise.all([
      Task.find({ assignedTo: emp._id }).lean(),
      Goal.find({ employee: emp._id }).lean(),
      Performance.find({ employee: emp._id })
        .populate('reviewedBy', 'name email role')
        .sort({ reviewedAt: -1 })
        .lean(),
      Attendance.find({ employee: emp._id }).lean(),
    ]);

    // Task stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Goal stats
    const totalGoals = goals.length;
    const completedGoals = goals.filter((g) => g.progress === 100).length;
    const goalCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    // Attendance stats
    const presentDays = attendanceRecords.filter(
      (a) => a.status === 'Present' || a.status === 'Late'
    ).length;
    const totalDays = attendanceRecords.length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;
    const lateDays = attendanceRecords.filter((a) => a.status === 'Late').length;

    // Latest review
    const latestReview = reviews.length > 0 ? reviews[0] : null;

    // Active goals (up to 3)
    const now = new Date();
    const activeGoals = goals
      .filter((g) => g.progress < 100)
      .map((g) => ({
        ...g,
        isOverdue: g.dueDate && new Date(g.dueDate) < now && g.progress < 100,
      }))
      .slice(0, 3);

    return res.status(200).json({
      success: true,
      data: {
        employee: {
          _id: emp._id,
          fullName: emp.fullName,
          employeeId: emp.employeeId,
          department: emp.department,
          designation: emp.designation,
        },
        taskStats: { total: totalTasks, completed: completedTasks, completionRate: taskCompletionRate },
        goalStats: { total: totalGoals, completed: completedGoals, completionRate: goalCompletionRate },
        attendanceStats: {
          total: totalDays,
          present: presentDays,
          late: lateDays,
          attendanceRate,
        },
        latestReview,
        reviewHistory: reviews,
        activeGoals,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get performance summary for a specific employee (Admin/Manager)
 * @route   GET /api/performance/summary/:employeeId
 * @access  Private (Admin, Manager)
 */
export const getEmployeePerformanceSummary = async (req, res, next) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID format' });
    }

    const emp = await Employee.findById(employeeId).populate('department', 'name').lean();
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Manager scoping check
    if (req.user.role === 'manager') {
      const empDept = emp.department?._id || emp.department;
      if (!isEmployeeInManagerDept(empDept, req.user.department)) {
        return res.status(403).json({ success: false, message: 'Access denied: Employee is not in your department' });
      }
    }

    const [tasks, goals, reviews, attendanceRecords] = await Promise.all([
      Task.find({ assignedTo: emp._id }).lean(),
      Goal.find({ employee: emp._id }).lean(),
      Performance.find({ employee: emp._id })
        .populate('reviewedBy', 'name email')
        .sort({ reviewedAt: -1 })
        .lean(),
      Attendance.find({ employee: emp._id }).lean(),
    ]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalGoals = goals.length;
    const completedGoals = goals.filter((g) => g.progress === 100).length;
    const goalCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    const presentDays = attendanceRecords.filter(
      (a) => a.status === 'Present' || a.status === 'Late'
    ).length;
    const totalDays = attendanceRecords.length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;

    return res.status(200).json({
      success: true,
      data: {
        employee: emp,
        taskStats: { total: totalTasks, completed: completedTasks, completionRate: taskCompletionRate },
        goalStats: { total: totalGoals, completed: completedGoals, completionRate: goalCompletionRate },
        attendanceStats: { total: totalDays, present: presentDays, attendanceRate },
        reviews,
        goals,
      },
    });
  } catch (error) {
    next(error);
  }
};

