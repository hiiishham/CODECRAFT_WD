import mongoose from 'mongoose';
import Goal from '../models/Goal.js';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Admin from '../models/Admin.js';
import { resolveEmployeeForUser } from '../utils/employeeResolver.js';
import { notifyUser, notifyRoles } from '../utils/notificationService.js';
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
 * @desc    Get all goals (Admin/Manager) with search and filters
 * @route   GET /api/goals
 * @access  Private (Admin, Manager)
 */
export const getGoals = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, employee, department, priority, status } = req.query;
    const filter = {};

    // Filter by employee
    if (employee && employee !== 'all' && employee !== 'All') {
      if (mongoose.Types.ObjectId.isValid(employee)) {
        filter.employee = employee;
      }
    }

    // Filter by department (find employees in dept, then filter goals)
    if (department && department !== 'all' && department !== 'All') {
      let deptId = department;
      if (!mongoose.Types.ObjectId.isValid(department)) {
        const dept = await Department.findOne({
          name: { $regex: new RegExp(`^${escapeRegex(department.trim())}$`, 'i') },
        });
        deptId = dept ? dept._id : null;
      }
      if (deptId) {
        const empIds = await Employee.find({ department: deptId }).select('_id');
        filter.employee = { $in: empIds.map((e) => e._id) };
      }
    }

    // Filter by priority
    if (priority && priority !== 'all' && priority !== 'All') {
      filter.priority = priority;
    }

    // Filter by status
    if (status && status !== 'all' && status !== 'All') {
      filter.status = status;
    }

    // Search by title or employee name/id
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      const matchingEmployees = await Employee.find({
        $or: [{ fullName: searchRegex }, { employeeId: searchRegex }],
      }).select('_id');
      const empIds = matchingEmployees.map((e) => e._id);
      filter.$or = [{ title: searchRegex }, { employee: { $in: empIds } }];
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

    const [goals, total] = await Promise.all([
      Goal.find(filter)
        .populate('employee', 'fullName employeeId department')
        .populate({ path: 'employee', populate: { path: 'department', select: 'name' } })
        .populate('assignedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true }),
      Goal.countDocuments(filter),
    ]);

    // Compute isOverdue for each goal
    const now = new Date();
    const enriched = goals.map((g) => ({
      ...g,
      isOverdue: g.dueDate && new Date(g.dueDate) < now && g.progress < 100,
    }));

    return res.status(200).json({
      success: true,
      data: enriched,
      goals: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get goal statistics (Admin/Manager)
 * @route   GET /api/goals/stats
 * @access  Private (Admin, Manager)
 */
export const getGoalStats = async (req, res, next) => {
  try {
    const now = new Date();
    const matchFilter = {};

    if (req.user.role === 'manager') {
      const teamIds = await getManagerTeamEmployeeIds(req.user);
      if (teamIds) {
        matchFilter.employee = { $in: teamIds };
      }
    }

    const [statusAgg, total] = await Promise.all([
      Goal.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Goal.countDocuments(matchFilter),
    ]);

    const counts = { 'Not Started': 0, 'In Progress': 0, Completed: 0, Overdue: 0 };
    statusAgg.forEach((s) => { counts[s._id] = s.count; });

    // Count overdue: dueDate < now AND progress < 100 AND status != Completed
    const overdueFilter = {
      ...matchFilter,
      dueDate: { $lt: now },
      progress: { $lt: 100 },
      status: { $ne: 'Completed' },
    };
    const overdueCount = await Goal.countDocuments(overdueFilter);

    return res.status(200).json({
      success: true,
      data: {
        total,
        notStarted: counts['Not Started'],
        inProgress: counts['In Progress'],
        completed: counts['Completed'],
        overdue: overdueCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single goal by ID
 * @route   GET /api/goals/:id
 * @access  Private (Admin/Manager: any; Employee: own only)
 */
export const getGoalById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid goal ID format' });
    }

    const goal = await Goal.findById(req.params.id)
      .populate('employee', 'fullName employeeId department designation')
      .populate({ path: 'employee', populate: { path: 'department', select: 'name' } })
      .populate('assignedBy', 'name email role')
      .lean({ virtuals: true });

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    // Employee: only own goals
    if (req.user.role === 'employee') {
      const emp = await resolveEmployeeForUser(req.user);
      if (!emp || goal.employee?._id.toString() !== emp._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied — not your goal' });
      }
    }

    // Manager: only goals of employees in their department
    if (req.user.role === 'manager') {
      const empDept = goal.employee?.department?._id || goal.employee?.department;
      if (!isEmployeeInManagerDept(empDept, req.user.department)) {
        return res.status(403).json({ success: false, message: 'Access denied — employee not in your department' });
      }
    }

    const now = new Date();
    goal.isOverdue = goal.dueDate && new Date(goal.dueDate) < now && goal.progress < 100;

    return res.status(200).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get my goals (Employee only)
 * @route   GET /api/goals/my
 * @access  Private (Employee)
 */
export const getMyGoals = async (req, res, next) => {
  try {
    const emp = await resolveEmployeeForUser(req.user);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const { status, priority } = req.query;
    const filter = { employee: emp._id };

    if (status && status !== 'all') filter.status = status;
    if (priority && priority !== 'all') filter.priority = priority;

    const goals = await Goal.find(filter)
      .populate('assignedBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    const now = new Date();
    const enriched = goals.map((g) => ({
      ...g,
      isOverdue: g.dueDate && new Date(g.dueDate) < now && g.progress < 100,
    }));

    // Stats for the employee
    const total = enriched.length;
    const completed = enriched.filter((g) => g.progress === 100).length;
    const inProgress = enriched.filter((g) => g.progress > 0 && g.progress < 100).length;
    const overdue = enriched.filter((g) => g.isOverdue).length;

    return res.status(200).json({
      success: true,
      data: enriched,
      stats: { total, completed, inProgress, overdue },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new goal
 * @route   POST /api/goals
 * @access  Private (Admin, Manager)
 */
export const createGoal = async (req, res, next) => {
  try {
    const { employee, title, description, startDate, dueDate, priority } = req.body;

    if (!employee || !title || !description || !startDate || !dueDate || !priority) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: employee, title, description, startDate, dueDate, priority',
      });
    }

    if (!title.trim() || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Goal title and description cannot be empty' });
    }

    const validPriorities = ['Low', 'Medium', 'High'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ success: false, message: 'Priority must be Low, Medium, or High' });
    }

    if (!mongoose.Types.ObjectId.isValid(employee)) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID format' });
    }

    const empDoc = await Employee.findById(employee);
    if (!empDoc) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Manager can only assign goals to their department
    if (req.user.role === 'manager') {
      if (!isEmployeeInManagerDept(empDoc.department, req.user.department)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only assign goals to employees in your department',
        });
      }
    }

    const start = new Date(startDate);
    const due = new Date(dueDate);

    if (isNaN(start.getTime()) || isNaN(due.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format provided' });
    }

    if (due < start) {
      return res.status(400).json({ success: false, message: 'Due date cannot be before start date' });
    }

    const goal = await Goal.create({
      employee,
      title: title.trim(),
      description: description.trim(),
      assignedBy: req.user._id,
      startDate: start,
      dueDate: due,
      priority,
      progress: 0,
      status: 'Not Started',
    });

    // Find the Admin account linked to the employee (by email) to notify
    if (empDoc.email) {
      const empAdminUser = await Admin.findOne({ email: empDoc.email.toLowerCase().trim() });
      if (empAdminUser) {
        await notifyUser(empAdminUser._id, {
          title: 'New Goal Assigned',
          message: `You have been assigned a new performance goal: "${title.trim()}".`,
          type: 'goal',
          relatedId: goal._id,
          relatedType: 'Goal',
        });
      }
    }

    const populated = await Goal.findById(goal._id)
      .populate('employee', 'fullName employeeId department')
      .populate('assignedBy', 'name email role');

    return res.status(201).json({
      success: true,
      message: 'Goal created and assigned successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a goal (Admin/Manager)
 * @route   PUT /api/goals/:id
 * @access  Private (Admin, Manager)
 */
export const updateGoal = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid goal ID format' });
    }

    const goal = await Goal.findById(req.params.id).populate('employee');
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    // Manager authorization check
    if (req.user.role === 'manager') {
      const empDept = goal.employee?.department;
      if (!isEmployeeInManagerDept(empDept, req.user.department)) {
        return res.status(403).json({ success: false, message: 'Access denied: Goal employee is not in your department' });
      }
    }

    const { title, description, startDate, dueDate, priority, status, progress, employee } = req.body;

    const updates = {};
    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ success: false, message: 'Goal title cannot be empty' });
      updates.title = title.trim();
    }
    if (description !== undefined) {
      if (!description.trim()) return res.status(400).json({ success: false, message: 'Goal description cannot be empty' });
      updates.description = description.trim();
    }

    let effectiveStart = goal.startDate;
    let effectiveDue = goal.dueDate;

    if (startDate !== undefined) {
      const s = new Date(startDate);
      if (isNaN(s.getTime())) return res.status(400).json({ success: false, message: 'Invalid start date' });
      effectiveStart = s;
      updates.startDate = s;
    }
    if (dueDate !== undefined) {
      const d = new Date(dueDate);
      if (isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'Invalid due date' });
      effectiveDue = d;
      updates.dueDate = d;
    }

    if (effectiveDue < effectiveStart) {
      return res.status(400).json({ success: false, message: 'Due date cannot be before start date' });
    }

    if (priority !== undefined) {
      const validPriorities = ['Low', 'Medium', 'High'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ success: false, message: 'Priority must be Low, Medium, or High' });
      }
      updates.priority = priority;
    }

    if (status !== undefined) {
      const validStatuses = ['Not Started', 'In Progress', 'Completed', 'Overdue'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value' });
      }
      updates.status = status;
    }

    if (progress !== undefined) {
      const numProgress = Number(progress);
      if (isNaN(numProgress) || numProgress < 0 || numProgress > 100) {
        return res.status(400).json({ success: false, message: 'Progress must be a number between 0 and 100' });
      }
      updates.progress = numProgress;

      // Auto-update status based on progress unless status was explicitly provided
      if (status === undefined) {
        if (numProgress === 100) {
          updates.status = 'Completed';
        } else if (numProgress > 0) {
          updates.status = 'In Progress';
        } else {
          updates.status = 'Not Started';
        }
      }
    }

    if (employee !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(employee)) {
        return res.status(400).json({ success: false, message: 'Invalid employee ID format' });
      }
      const newEmpDoc = await Employee.findById(employee);
      if (!newEmpDoc) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }
      if (req.user.role === 'manager') {
        if (!isEmployeeInManagerDept(newEmpDoc.department, req.user.department)) {
          return res.status(403).json({ success: false, message: 'Access denied: Target employee is not in your department' });
        }
      }
      updates.employee = employee;
    }

    const updated = await Goal.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('employee', 'fullName employeeId department')
      .populate('assignedBy', 'name email role');

    // Notify employee of update
    try {
      const targetEmp = await Employee.findById(updated.employee?._id || updated.employee);
      if (targetEmp?.email) {
        const empAdmin = await Admin.findOne({ email: targetEmp.email.toLowerCase().trim() });
        if (empAdmin) {
          await notifyUser(empAdmin._id, {
            title: 'Goal Updated',
            message: `Your goal "${updated.title}" has been updated.`,
            type: 'goal',
            relatedId: updated._id,
            relatedType: 'Goal',
          });
        }
      }
    } catch (e) {
      // non-fatal
    }

    return res.status(200).json({
      success: true,
      message: 'Goal updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a goal (Admin/Manager)
 * @route   DELETE /api/goals/:id
 * @access  Private (Admin, Manager)
 */
export const deleteGoal = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid goal ID format' });
    }

    const goal = await Goal.findById(req.params.id).populate('employee');
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    if (req.user.role === 'manager') {
      const empDept = goal.employee?.department;
      if (!isEmployeeInManagerDept(empDept, req.user.department)) {
        return res.status(403).json({ success: false, message: 'Access denied: Goal employee is not in your department' });
      }
    }

    await goal.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Goal deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update goal progress (Employee only)
 * @route   PUT /api/goals/:id/progress
 * @access  Private (Employee)
 */
export const updateGoalProgress = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid goal ID format' });
    }

    const emp = await resolveEmployeeForUser(req.user);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const goal = await Goal.findById(req.params.id).populate('employee', '_id fullName');
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    // Ownership check
    if (goal.employee._id.toString() !== emp._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied — not your goal' });
    }

    const { progress } = req.body;
    if (progress === undefined || progress === null) {
      return res.status(400).json({ success: false, message: 'Progress value is required' });
    }

    const numProgress = Number(progress);
    if (isNaN(numProgress) || numProgress < 0 || numProgress > 100) {
      return res.status(400).json({ success: false, message: 'Progress must be a number between 0 and 100' });
    }

    const wasCompleted = goal.progress === 100;

    // Auto-determine status from progress
    let newStatus = 'Not Started';
    if (numProgress === 100) {
      newStatus = 'Completed';
    } else if (numProgress > 0) {
      newStatus = 'In Progress';
    }

    goal.progress = numProgress;
    goal.status = newStatus;
    await goal.save();

    // Notify admin/manager when goal is newly completed
    if (!wasCompleted && numProgress === 100) {
      await notifyRoles(['admin', 'manager'], {
        title: 'Goal Completed',
        message: `${emp.fullName} completed the goal "${goal.title}".`,
        type: 'goal',
        relatedId: goal._id,
        relatedType: 'Goal',
      });
    }

    const updated = await Goal.findById(goal._id)
      .populate('employee', 'fullName employeeId department')
      .populate('assignedBy', 'name email role')
      .lean({ virtuals: true });

    const now = new Date();
    updated.isOverdue = updated.dueDate && new Date(updated.dueDate) < now && updated.progress < 100;

    return res.status(200).json({
      success: true,
      message: numProgress === 100 ? 'Goal marked as completed!' : 'Progress updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

