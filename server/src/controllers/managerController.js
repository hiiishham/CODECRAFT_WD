import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import Admin from '../models/Admin.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Task from '../models/Task.js';
import Submission from '../models/WorkSubmission.js';
import Performance from '../models/Performance.js';
import Goal from '../models/Goal.js';
import { getStartOfDay } from './attendanceController.js';
import { calculateEmployeeLeaveBalance, getLeaveBalanceKey } from './leaveController.js';
import { createNotification, notifyUser } from '../utils/notificationService.js';

import { stringify } from 'csv-stringify/sync';
import { escapeRegex } from '../utils/escapeRegex.js';

// Utility to get team member IDs based on manager relationships and department scopes
export const getManagerTeamEmployeeIds = async (user) => {
  if (!user) return [];

  const orConditions = [
    { manager: user._id },
  ];

  // Also check if this manager has a linked employee profile
  if (user.email) {
    const mgrEmp = await Employee.findOne({ email: user.email.toLowerCase().trim() }).select('_id').lean();
    if (mgrEmp) {
      orConditions.push({ manager: mgrEmp._id });
    }
  }

  // Rahul Menon manages Engineering & Design
  const email = (user.email || '').toLowerCase().trim();
  const username = (user.username || '').toLowerCase().trim();
  const dept = user.department || '';

  if (dept === 'Engineering' || email === 'rahul.menon@staffpulse.local' || username === 'rahul.menon') {
    orConditions.push({ department: { $in: ['Engineering', 'Design'] } });
  } else if (dept === 'HR' || email === 'anjali.nair@staffpulse.local' || username === 'anjali.nair') {
    // Anjali Nair manages HR, Sales, Marketing, Finance
    orConditions.push({ department: { $in: ['HR', 'Sales', 'Marketing', 'Finance'] } });
  } else if (dept) {
    orConditions.push({ department: dept });
  }

  const employees = await Employee.find({ $or: orConditions }).select('_id').lean();
  return employees.map((emp) => emp._id);
};

/**
 * @desc    Get manager dashboard statistics
 * @route   GET /api/manager/dashboard
 * @access  Private (Manager)
 */
export const getDashboardStats = async (req, res) => {
  try {
    const todayStart = getStartOfDay();
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const teamIds = await getManagerTeamEmployeeIds(req.user);
    const teamEmployees = await Employee.find({ _id: { $in: teamIds }, status: 'Active' }).lean();
    const totalTeamMembers = teamIds.length;

    const [
      attendancesToday,
      activeLeavesToday,
      pendingLeaves,
      activeTasks,
      pendingSubmissions,
      goals
    ] = await Promise.all([
      Attendance.find({ date: todayStart, employee: { $in: teamIds } }).lean(),
      Leave.find({
        employee: { $in: teamIds },
        status: 'Approved',
        startDate: { $lte: todayEnd },
        endDate: { $gte: todayStart }
      }).lean(),
      Leave.countDocuments({ employee: { $in: teamIds }, status: 'Pending' }),
      Task.countDocuments({ assignedTo: { $in: teamIds }, status: { $in: ['Assigned', 'In Progress'] } }),
      Submission.countDocuments({ employee: { $in: teamIds }, status: 'Pending Review' }),
      Goal.find({ employee: { $in: teamIds } }).lean(),
    ]);

    // Calculate Today's Workforce
    let present = 0;
    let workingNow = 0;
    let late = 0;
    let absent = 0;
    let onLeave = activeLeavesToday.length;

    // A simple threshold for late (e.g. 09:15) could be taken from Settings, but for simplicity:
    const now = new Date();
    const isLateThresholdPassed = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);

    teamEmployees.forEach(emp => {
      const isLeave = activeLeavesToday.some(l => l.employee.toString() === emp._id.toString());
      if (isLeave) return; // already counted in onLeave

      const att = attendancesToday.find(a => a.employee.toString() === emp._id.toString());
      if (att) {
        present++;
        if (!att.checkOut) workingNow++;
        if (att.status === 'Late') late++;
      } else {
        if (isLateThresholdPassed) {
          absent++;
        }
      }
    });

    // Performance & Goals
    const completedGoals = goals.filter(g => g.progress === 100).length;
    const inProgressGoals = goals.filter(g => g.progress > 0 && g.progress < 100).length;
    
    let avgAttendance = 0;
    if (totalTeamMembers > 0) {
       // Estimate: present / (total - onLeave)
       const expected = totalTeamMembers - onLeave;
       avgAttendance = expected > 0 ? Math.round((present / expected) * 100) : 100;
    }

    res.status(200).json({
      success: true,
      stats: {
        totalTeamMembers,
        present,
        workingNow,
        onLeave,
        late,
        absent,
        pendingLeaves,
        activeTasks,
        pendingSubmissions,
        avgAttendance,
        completedGoals,
        inProgressGoals
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Get team members
 * @route   GET /api/manager/team
 * @access  Private (Manager)
 */
export const getTeam = async (req, res) => {
  try {
    const teamIds = await getManagerTeamEmployeeIds(req.user);
    const { search, status } = req.query;

    let query = { _id: { $in: teamIds } };

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const safeSearch = escapeRegex(search.trim());
      query.$or = [
        { fullName: { $regex: safeSearch, $options: 'i' } },
        { employeeId: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { username: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const employees = await Employee.find(query).select('-salary').sort({ fullName: 1 }).lean();
    res.status(200).json({ success: true, count: employees.length, employees });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Get team member detail
 * @route   GET /api/manager/team/:id
 * @access  Private (Manager)
 */
export const getTeamMember = async (req, res) => {
  try {
    const teamIds = await getManagerTeamEmployeeIds(req.user);
    const employee = await Employee.findOne({ _id: req.params.id, _id: { $in: teamIds } }).select('-salary').lean();

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found in your team' });
    }

    res.status(200).json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Get tasks assigned to team
 * @route   GET /api/manager/tasks
 * @access  Private (Manager)
 */
export const getTeamTasks = async (req, res) => {
  try {
    const teamIds = await getManagerTeamEmployeeIds(req.user);

    const { status, priority, search } = req.query;
    let query = { assignedTo: { $in: teamIds } };

    if (status && status !== 'All') {
      if (status === 'Overdue') {
        query.dueDate = { $lt: new Date() };
        query.status = { $ne: 'Completed' };
      } else {
        query.status = status;
      }
    }
    if (priority && priority !== 'All') query.priority = priority;
    if (search && search.trim()) query.title = { $regex: escapeRegex(search.trim()), $options: 'i' };

    const tasks = await Task.find(query)
      .populate('assignedTo', 'fullName employeeId profileImage department')
      .populate('assignedBy', 'name email role')
      .populate('department', 'name status')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    const enrichedTasks = tasks.map((t) => ({
      ...t,
      isOverdue: t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed',
    }));

    res.status(200).json({ success: true, count: enrichedTasks.length, tasks: enrichedTasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Get team leave requests
 * @route   GET /api/manager/leave
 * @access  Private (Manager)
 */
export const getTeamLeave = async (req, res) => {
  try {
    const teamIds = await getManagerTeamEmployeeIds(req.user);
    
    const { status } = req.query;
    let query = { employee: { $in: teamIds } };
    
    if (status && status !== 'All') query.status = status;

    const leaves = await Leave.find(query)
      .populate('employee', 'fullName employeeId department')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Approve/Reject leave
 * @route   PUT /api/manager/leave/:id/status
 * @access  Private (Manager)
 */
export const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid leave request ID format' });
    }
    
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Only Approved or Rejected allowed' });
    }

    const teamIds = await getManagerTeamEmployeeIds(req.user);

    const leave = await Leave.findOne({ _id: id, employee: { $in: teamIds } }).populate('employee', 'fullName email employeeId department designation');
    
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found or not authorized' });
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request is already ${leave.status.toLowerCase()} and cannot be updated again.`,
      });
    }

    // Verify leave balance on approval
    if (status === 'Approved') {
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
    }

    const comment = notes && notes.trim() ? notes.trim() : (status === 'Approved' ? `Approved by Manager ${req.user.name}` : `Rejected by Manager ${req.user.name}`);

    leave.status = status;
    leave.reviewComment = comment;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    await leave.save();
    await leave.populate('reviewedBy', 'name email role');

    // Notify employee directly
    const userAccount = await Admin.findOne({ email: leave.employee.email });
    if (userAccount) {
      const formattedStart = new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const formattedEnd = new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      await createNotification({
        recipient: userAccount._id,
        title: status === 'Approved' ? 'Leave Approved' : 'Leave Request Rejected',
        message: status === 'Approved'
          ? `Your ${leave.leaveType} request from ${formattedStart} to ${formattedEnd} has been approved.`
          : `Your leave request has been rejected. Reason: "${comment}"`,
        type: 'leave',
        relatedId: leave._id,
      });
    }

    res.status(200).json({ success: true, message: `Leave ${status}`, leave });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Get team submissions
 * @route   GET /api/manager/submissions
 * @access  Private (Manager)
 */
export const getTeamSubmissions = async (req, res) => {
  try {
    const teamIds = await getManagerTeamEmployeeIds(req.user);

    const { status } = req.query;
    let query = { employee: { $in: teamIds } };

    if (status && status !== 'All') query.status = status;

    const submissions = await Submission.find(query)
      .populate('employee', 'fullName employeeId profileImage')
      .populate('task', 'title')
      .populate('reviewedBy', 'name')
      .sort({ submittedAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: submissions.length, submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Review team submission
 * @route   PUT /api/manager/submissions/:id/review
 * @access  Private (Manager)
 */
export const reviewSubmission = async (req, res) => {
  try {
    const teamIds = await getManagerTeamEmployeeIds(req.user);

    const { status, comments, reviewComment } = req.body;
    const commentText = String(reviewComment || comments || '').trim();
    
    if (!['Approved', 'Changes Requested'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    if (status === 'Changes Requested' && !commentText) {
      return res.status(400).json({ success: false, message: 'Review comment is required when requesting changes' });
    }

    const submission = await Submission.findOne({ _id: req.params.id, employee: { $in: teamIds } });
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found or unauthorized' });
    }

    if (submission.status === 'Approved') {
      return res.status(400).json({ success: false, message: 'Submission is already approved and cannot be modified' });
    }

    if (submission.status === 'Changes Requested' && status === 'Changes Requested') {
      return res.status(400).json({ success: false, message: 'Changes have already been requested. Awaiting employee resubmission.' });
    }

    submission.status = status;
    submission.reviewComment = commentText;
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    await submission.save();

    // If approved, update Task status to Completed and progress to 100%
    if (status === 'Approved' && submission.task) {
      await Task.findByIdAndUpdate(submission.task, {
        status: 'Completed',
        progress: 100,
      });
    }

    // Dispatch notification to employee
    try {
      const employeeDoc = await Employee.findById(submission.employee);
      if (employeeDoc?.email) {
        const empUser = await Admin.findOne({ email: employeeDoc.email.toLowerCase().trim() });
        if (empUser) {
          await notifyUser(empUser._id, {
            title: status === 'Approved' ? 'Work Approved' : 'Changes Requested',
            message: status === 'Approved' 
              ? 'Your work submission has been approved.' 
              : `Changes have been requested on your submission. Feedback: ${commentText}`,
            type: 'task',
            relatedId: submission._id,
          });
        }
      }
    } catch (notifErr) {
      console.error('[ManagerController] Notification error:', notifErr.message);
    }

    return res.status(200).json({ success: true, submission });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Get team attendance history
 * @route   GET /api/manager/attendance
 * @access  Private (Manager)
 */
export const getTeamAttendance = async (req, res) => {
  try {
    const teamIds = await getManagerTeamEmployeeIds(req.user);

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const { status } = req.query;
    let query = { employee: { $in: teamIds } };

    if (status && status !== 'All') query.status = status;

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .populate('employee', 'fullName employeeId')
      .sort({ date: -1 })
      .skip(startIndex)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      count: records.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      records
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Get team performance overview
 * @route   GET /api/manager/performance
 * @access  Private (Manager)
 */
export const getTeamPerformance = async (req, res) => {
  try {
    const teamIds = await getManagerTeamEmployeeIds(req.user);

    const [reviews, goals] = await Promise.all([
      Performance.find({ employee: { $in: teamIds } }).populate('employee', 'fullName employeeId profileImage').lean(),
      Goal.find({ employee: { $in: teamIds } }).populate('employee', 'fullName employeeId profileImage').lean(),
    ]);

    let avgRating = 0;
    if (reviews.length > 0) {
      avgRating = reviews.reduce((sum, r) => sum + (r.overallRating || 0), 0) / reviews.length;
    }

    res.status(200).json({
      success: true,
      data: {
        avgRating,
        totalReviews: reviews.length,
        totalGoals: goals.length,
        reviews,
        goals
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
