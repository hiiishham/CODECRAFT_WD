import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Admin from '../models/Admin.js';
import WorkSubmission from '../models/WorkSubmission.js';
import { resolveEmployeeForUser } from '../utils/employeeResolver.js';
import { notifyUser } from '../utils/notificationService.js';
import { escapeRegex } from '../utils/escapeRegex.js';

/**
 * Helper to resolve Department ObjectId from either an ObjectId or department name
 */
const resolveDepartmentId = async (deptInput) => {
  if (!deptInput) return null;
  if (mongoose.Types.ObjectId.isValid(deptInput)) {
    const doc = await Department.findById(deptInput);
    if (doc) return doc._id;
  }
  // Lookup by name
  const found = await Department.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(deptInput.toString().trim())}$`, 'i') },
  });
  return found ? found._id : null;
};

/**
 * Helper to get team member IDs and department ObjectId for a manager
 */
const getManagerTeamScope = async (user) => {
  const managerDeptName = user.department || 'Development';
  const deptDoc = await Department.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(managerDeptName.trim())}$`, 'i') },
  });
  const deptId = deptDoc ? deptDoc._id : null;

  const teamEmployees = await Employee.find({
    department: { $regex: new RegExp(`^${escapeRegex(managerDeptName.trim())}$`, 'i') },
  }).select('_id');

  const teamEmployeeIds = teamEmployees.map((e) => e._id);
  return { managerDeptName, deptId, teamEmployeeIds };
};

/**
 * @desc    Get all tasks with search, filters and pagination
 * @route   GET /api/tasks
 * @access  Private (Admin & Manager)
 */
export const getTasks = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, department, employee, priority, status } = req.query;

    const filter = {};

    // Enforce Manager Scope: Manager can ONLY view tasks assigned to their department team
    let managerScope = null;
    if (req.user.role === 'manager') {
      managerScope = await getManagerTeamScope(req.user);
      filter.assignedTo = { $in: managerScope.teamEmployeeIds };
    }

    // Filter by department
    if (department && department !== 'all' && department !== 'All') {
      const deptId = await resolveDepartmentId(department);
      if (deptId) {
        if (
          req.user.role === 'manager' &&
          managerScope?.deptId &&
          deptId.toString() !== managerScope.deptId.toString()
        ) {
          // Manager explicitly filtering for an out-of-scope department
          return res.status(200).json({
            success: true,
            tasks: [],
            totalRecords: 0,
            totalPages: 1,
            currentPage: page,
            limit,
          });
        }
        filter.department = deptId;
      }
    }

    // Filter by employee
    if (employee && employee !== 'all' && employee !== 'All') {
      if (mongoose.Types.ObjectId.isValid(employee)) {
        if (req.user.role === 'manager' && managerScope) {
          const isTeamMember = managerScope.teamEmployeeIds.some(
            (id) => id.toString() === employee.toString()
          );
          if (!isTeamMember) {
            return res.status(200).json({
              success: true,
              tasks: [],
              totalRecords: 0,
              totalPages: 1,
              currentPage: page,
              limit,
            });
          }
        }
        filter.assignedTo = employee;
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

    // Search by task title or employee name/id
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      let empQuery = {
        $or: [
          { fullName: searchRegex },
          { employeeId: searchRegex },
        ],
      };
      if (req.user.role === 'manager' && managerScope) {
        empQuery._id = { $in: managerScope.teamEmployeeIds };
      }
      const matchingEmployees = await Employee.find(empQuery).select('_id');
      const empIds = matchingEmployees.map((e) => e._id);

      if (req.user.role === 'manager') {
        filter.$and = [
          { assignedTo: { $in: managerScope.teamEmployeeIds } },
          {
            $or: [
              { title: searchRegex },
              { assignedTo: { $in: empIds } },
            ],
          },
        ];
        delete filter.assignedTo;
      } else {
        filter.$or = [
          { title: searchRegex },
          { assignedTo: { $in: empIds } },
        ];
      }
    }

    const [totalRecords, tasks] = await Promise.all([
      Task.countDocuments(filter),
      Task.find(filter)
        .populate('assignedTo', 'fullName employeeId email department designation profileImage')
        .populate('assignedBy', 'name email role')
        .populate('department', 'name status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    // Attach dynamic isOverdue calculation
    const enrichedTasks = tasks.map((t) => ({
      ...t,
      isOverdue: t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed',
    }));

    return res.status(200).json({
      success: true,
      tasks: enrichedTasks,
      totalRecords,
      totalPages,
      currentPage: page,
      limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get aggregate statistics for tasks
 * @route   GET /api/tasks/stats
 * @access  Private (Admin & Manager)
 */
export const getTaskStats = async (req, res, next) => {
  try {
    const now = new Date();
    const baseFilter = {};

    if (req.user.role === 'manager') {
      const { teamEmployeeIds } = await getManagerTeamScope(req.user);
      baseFilter.assignedTo = { $in: teamEmployeeIds };
    }

    const [total, assigned, inProgress, completed, overdue] = await Promise.all([
      Task.countDocuments(baseFilter),
      Task.countDocuments({ ...baseFilter, status: 'Assigned' }),
      Task.countDocuments({ ...baseFilter, status: 'In Progress' }),
      Task.countDocuments({ ...baseFilter, status: 'Completed' }),
      Task.countDocuments({
        ...baseFilter,
        dueDate: { $lt: now },
        status: { $ne: 'Completed' },
      }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        assigned,
        inProgress,
        completed,
        overdue,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single task details by ID
 * @route   GET /api/tasks/:id
 * @access  Private (Admin, Manager, Assigned Employee)
 */
export const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid task ID format',
      });
    }

    const task = await Task.findById(id)
      .populate('assignedTo', 'fullName employeeId email department designation profileImage')
      .populate('assignedBy', 'name email role')
      .populate('department', 'name status');

    if (!task) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Task not found',
      });
    }

    // Role-based isolation for Employee role
    if (req.user.role === 'employee') {
      const employee = await resolveEmployeeForUser(req.user);
      if (!employee || task.assignedTo?._id?.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'You are not authorized to access this task',
        });
      }
    }

    // Role-based isolation for Manager role
    if (req.user.role === 'manager') {
      const { teamEmployeeIds } = await getManagerTeamScope(req.user);
      const isTeamTask = teamEmployeeIds.some(
        (empId) => empId.toString() === task.assignedTo?._id?.toString()
      );
      if (!isTeamTask) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'You are not authorized to access tasks outside your department',
        });
      }
    }

    const taskObj = task.toObject({ virtuals: true });
    taskObj.isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';

    return res.status(200).json({
      success: true,
      task: taskObj,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get tasks assigned to the authenticated employee
 * @route   GET /api/tasks/my
 * @access  Private (Employee)
 */
export const getMyTasks = async (req, res, next) => {
  try {
    const employee = await resolveEmployeeForUser(req.user);
    if (!employee) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Employee profile not found for authenticated user',
      });
    }

    const { status, priority, search, limit } = req.query;

    const filter = { assignedTo: employee._id };

    if (status && status !== 'all' && status !== 'All') {
      filter.status = status;
    }

    if (priority && priority !== 'all' && priority !== 'All') {
      filter.priority = priority;
    }

    if (search && search.trim() !== '') {
      filter.title = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }

    let query = Task.find(filter)
      .populate('assignedTo', 'fullName employeeId email department designation profileImage')
      .populate('assignedBy', 'name email role')
      .populate('department', 'name status');

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    }

    const tasks = await query.lean({ virtuals: true });

    // Calculate dynamic overdue indicator and sort: incomplete first, then nearest due date
    const enrichedTasks = tasks.map((t) => ({
      ...t,
      isOverdue: t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed',
    }));

    enrichedTasks.sort((a, b) => {
      const aDone = a.status === 'Completed' ? 1 : 0;
      const bDone = b.status === 'Completed' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    // Summary counts for employee
    const allEmployeeTasks = await Task.find({ assignedTo: employee._id }).select('status dueDate');
    const summary = {
      total: allEmployeeTasks.length,
      assigned: allEmployeeTasks.filter((t) => t.status === 'Assigned').length,
      inProgress: allEmployeeTasks.filter((t) => t.status === 'In Progress').length,
      completed: allEmployeeTasks.filter((t) => t.status === 'Completed').length,
      overdue: allEmployeeTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed').length,
    };

    return res.status(200).json({
      success: true,
      tasks: enrichedTasks,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new task and notify assigned employee
 * @route   POST /api/tasks
 * @access  Private (Admin & Manager)
 */
export const createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      assignedTo,
      department,
      priority = 'Medium',
      startDate,
      dueDate,
      estimatedHours = 0,
      attachments = [],
      employeeComment = '',
    } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Task title is required',
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Task description is required',
      });
    }

    if (!assignedTo || !mongoose.Types.ObjectId.isValid(assignedTo)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'A valid assigned employee is required',
      });
    }

    const employeeDoc = await Employee.findById(assignedTo);
    if (!employeeDoc) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Assigned employee not found',
      });
    }

    // Manager Scope Restriction: Manager can only assign to employees in their department
    if (req.user.role === 'manager') {
      const managerDept = (req.user.department || 'Development').toLowerCase().trim();
      const empDept = (employeeDoc.department || '').toLowerCase().trim();
      if (empDept !== managerDept) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: `Managers can only assign tasks to employees within their department (${req.user.department || 'Development'})`,
        });
      }
    }

    // Department Resolution & Consistency
    let deptId = null;
    if (department) {
      deptId = await resolveDepartmentId(department);
      if (!deptId) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'The specified department does not exist',
        });
      }
    }

    // Auto-resolve department from employee if not provided
    if (!deptId && employeeDoc.department) {
      deptId = await resolveDepartmentId(employeeDoc.department);
    }

    if (!deptId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'A valid department is required or could not be resolved from employee',
      });
    }

    // Prevent inconsistent assignments where task department conflicts with employee's department
    if (employeeDoc.department) {
      const empDeptId = await resolveDepartmentId(employeeDoc.department);
      if (empDeptId && deptId.toString() !== empDeptId.toString()) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `Selected department does not match employee's assigned department (${employeeDoc.department})`,
        });
      }
    }

    if (!startDate || !dueDate) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Both start date and due date are required',
      });
    }

    const parsedStart = new Date(startDate);
    const parsedDue = new Date(dueDate);

    if (isNaN(parsedStart.getTime()) || isNaN(parsedDue.getTime())) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid start date or due date format',
      });
    }

    if (parsedDue < parsedStart) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Due date cannot be before start date',
      });
    }

    if (Number(estimatedHours) < 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Estimated hours cannot be negative',
      });
    }

    const allowedPriorities = ['Low', 'Medium', 'High', 'Urgent'];
    if (!allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Invalid priority. Must be one of: ${allowedPriorities.join(', ')}`,
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      assignedTo,
      assignedBy: req.user._id,
      department: deptId,
      priority,
      status: 'Assigned',
      startDate: parsedStart,
      dueDate: parsedDue,
      progress: 0,
      estimatedHours: Number(estimatedHours) || 0,
      attachments,
      employeeComment,
    });

    // Populate task details for response
    await task.populate([
      { path: 'assignedTo', select: 'fullName employeeId email department designation profileImage' },
      { path: 'assignedBy', select: 'name email role' },
      { path: 'department', select: 'name status' },
    ]);

    // Dispatch notification to assigned employee user account
    try {
      const employeeUser = await Admin.findOne({ email: employeeDoc.email.toLowerCase().trim() });
      if (employeeUser) {
        await notifyUser(employeeUser._id, {
          title: 'New task assigned',
          message: `You have been assigned a new task: ${task.title}.`,
          type: 'task',
          relatedId: task._id,
          relatedType: 'Task',
          priority: ['Urgent', 'High'].includes(task.priority) ? 'high' : 'medium',
        });
      }
    } catch (notifErr) {
      console.error('[TaskController] Failed to dispatch task assignment notification:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Task created and assigned successfully',
      task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update task details (Admin & Manager)
 * @route   PUT /api/tasks/:id
 * @access  Private (Admin & Manager)
 */
export const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid task ID format',
      });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Task not found',
      });
    }

    // Manager Scope Restriction on existing task
    let managerScope = null;
    if (req.user.role === 'manager') {
      managerScope = await getManagerTeamScope(req.user);
      const isTeamTask = managerScope.teamEmployeeIds.some(
        (empId) => empId.toString() === task.assignedTo.toString()
      );
      if (!isTeamTask) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'You are not authorized to edit tasks outside your department',
        });
      }
    }

    const {
      title,
      description,
      assignedTo,
      department,
      priority,
      status,
      startDate,
      dueDate,
      estimatedHours,
      progress,
    } = req.body;

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Task title cannot be empty',
        });
      }
      task.title = title.trim();
    }

    if (description !== undefined) {
      if (!description.trim()) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Task description cannot be empty',
        });
      }
      task.description = description.trim();
    }

    let reassigned = false;
    let targetEmployeeDoc = null;

    if (assignedTo !== undefined && assignedTo.toString() !== task.assignedTo.toString()) {
      if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Invalid assigned employee ID',
        });
      }
      targetEmployeeDoc = await Employee.findById(assignedTo);
      if (!targetEmployeeDoc) {
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: 'New assigned employee not found',
        });
      }

      // Manager can only reassign within their department
      if (req.user.role === 'manager') {
        const managerDept = (req.user.department || 'Development').toLowerCase().trim();
        const empDept = (targetEmployeeDoc.department || '').toLowerCase().trim();
        if (empDept !== managerDept) {
          return res.status(403).json({
            success: false,
            statusCode: 403,
            message: `Managers can only assign tasks to employees within their department (${req.user.department || 'Development'})`,
          });
        }
      }

      task.assignedTo = assignedTo;
      // Auto-update department to match new employee if department not explicitly provided
      if (department === undefined && targetEmployeeDoc.department) {
        const empDeptId = await resolveDepartmentId(targetEmployeeDoc.department);
        if (empDeptId) task.department = empDeptId;
      }
      reassigned = true;
    } else {
      targetEmployeeDoc = await Employee.findById(task.assignedTo);
    }

    if (department !== undefined) {
      const deptId = await resolveDepartmentId(department);
      if (!deptId) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Valid department reference is required',
        });
      }
      // Check consistency with employee department
      if (targetEmployeeDoc?.department) {
        const empDeptId = await resolveDepartmentId(targetEmployeeDoc.department);
        if (empDeptId && deptId.toString() !== empDeptId.toString()) {
          return res.status(400).json({
            success: false,
            statusCode: 400,
            message: `Selected department does not match employee's assigned department (${targetEmployeeDoc.department})`,
          });
        }
      }
      task.department = deptId;
    }

    if (priority !== undefined) {
      const allowedPriorities = ['Low', 'Medium', 'High', 'Urgent'];
      if (!allowedPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `Invalid priority. Must be one of: ${allowedPriorities.join(', ')}`,
        });
      }
      task.priority = priority;
    }

    const newStart = startDate ? new Date(startDate) : task.startDate;
    const newDue = dueDate ? new Date(dueDate) : task.dueDate;

    if (isNaN(newStart.getTime()) || isNaN(newDue.getTime())) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid start date or due date format',
      });
    }

    if (newDue < newStart) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Due date cannot be before start date',
      });
    }

    if (startDate !== undefined) task.startDate = newStart;
    if (dueDate !== undefined) task.dueDate = newDue;

    if (estimatedHours !== undefined) {
      if (Number(estimatedHours) < 0) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Estimated hours cannot be negative',
        });
      }
      task.estimatedHours = Number(estimatedHours);
    }

    if (progress !== undefined) {
      const progNum = Number(progress);
      if (isNaN(progNum) || progNum < 0 || progNum > 100) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Progress must be a number between 0 and 100',
        });
      }
      task.progress = progNum;

      // Auto update status if status wasn't explicitly supplied in request
      if (status === undefined) {
        if (progNum === 0) task.status = 'Assigned';
        else if (progNum === 100) task.status = 'Completed';
        else task.status = 'In Progress';
      }
    }

    if (status !== undefined) {
      const allowedStatuses = ['Assigned', 'In Progress', 'Completed', 'Cancelled'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`,
        });
      }
      task.status = status;
      if (status === 'Completed' && task.progress < 100) {
        task.progress = 100;
      }
    }

    await task.save();

    await task.populate([
      { path: 'assignedTo', select: 'fullName employeeId email department designation profileImage' },
      { path: 'assignedBy', select: 'name email role' },
      { path: 'department', select: 'name status' },
    ]);

    // Dispatch notification to employee (reassigned or updated)
    if (targetEmployeeDoc) {
      try {
        const employeeUser = await Admin.findOne({ email: targetEmployeeDoc.email.toLowerCase().trim() });
        if (employeeUser) {
          if (reassigned) {
            await notifyUser(employeeUser._id, {
              title: 'New task assigned',
              message: `You have been assigned a new task: ${task.title}.`,
              type: 'task',
              relatedId: task._id,
              relatedType: 'Task',
              priority: ['Urgent', 'High'].includes(task.priority) ? 'high' : 'medium',
            });
          } else if (status !== undefined || priority !== undefined) {
            await notifyUser(employeeUser._id, {
              title: 'Task updated',
              message: `Task "${task.title}" status is now ${task.status}.`,
              type: 'task',
              relatedId: task._id,
              relatedType: 'Task',
              priority: ['Urgent', 'High'].includes(task.priority) ? 'high' : 'medium',
            });
          }
        }
      } catch (err) {
        console.error('[TaskController] Failed to dispatch task notification:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a task (Admin & Manager)
 * @route   DELETE /api/tasks/:id
 * @access  Private (Admin & Manager)
 */
export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid task ID format',
      });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Task not found',
      });
    }

    // Manager Scope Restriction: manager can only delete tasks belonging to their department
    if (req.user.role === 'manager') {
      const { teamEmployeeIds } = await getManagerTeamScope(req.user);
      const isTeamTask = teamEmployeeIds.some(
        (empId) => empId.toString() === task.assignedTo.toString()
      );
      if (!isTeamTask) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'You are not authorized to delete tasks outside your department',
        });
      }
    }

    // Work Submission Cascade & Relationship Protection:
    // Prevent deletion if work submissions reference this task to protect review history
    const existingSubmission = await WorkSubmission.findOne({ task: id });
    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Cannot delete task because associated work submissions exist. Set task status to Cancelled instead.',
      });
    }

    await Task.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update task progress (Employee only)
 * @route   PUT /api/tasks/:id/progress
 * @access  Private (Employee)
 */
export const updateTaskProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { progress, employeeComment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid task ID format',
      });
    }

    // 1. Authenticate user and verify employee profile
    const employee = await resolveEmployeeForUser(req.user);
    if (!employee) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Employee profile not found for authenticated user',
      });
    }

    // 2. Find task
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Task not found',
      });
    }

    // 3. Strict Ownership Verification: Verify task.assignedTo matches authenticated employee
    if (task.assignedTo.toString() !== employee._id.toString()) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: 'You are not authorized to update progress for this task',
      });
    }

    // 4. Validate progress (0 - 100)
    const progValue = Number(progress);
    if (isNaN(progValue) || progValue < 0 || progValue > 100) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid progress value. Progress must be a number between 0 and 100.',
      });
    }

    // 5. Update progress
    task.progress = progValue;

    // 6. Automatic status transitions according to Step 9 rules:
    // progress = 0 -> Assigned
    // progress > 0 && progress < 100 -> In Progress
    // progress = 100 -> Completed
    if (progValue === 0) {
      task.status = 'Assigned';
    } else if (progValue > 0 && progValue < 100) {
      task.status = 'In Progress';
    } else if (progValue === 100) {
      task.status = 'Completed';
    }

    if (employeeComment !== undefined) {
      task.employeeComment = employeeComment.trim();
    }

    await task.save();

    await task.populate([
      { path: 'assignedTo', select: 'fullName employeeId email department designation profileImage' },
      { path: 'assignedBy', select: 'name email role' },
      { path: 'department', select: 'name status' },
    ]);

    // Dispatch notification to manager/admin who assigned the task
    try {
      if (task.assignedBy) {
        const assignedById = task.assignedBy._id || task.assignedBy;
        await notifyUser(assignedById, {
          title: progValue === 100 ? 'Task Completed' : `Task Progress: ${progValue}%`,
          message: `${employee.fullName} updated progress to ${progValue}% on "${task.title}". Status: ${task.status}.`,
          type: 'task',
          relatedId: task._id,
        });
      }
    } catch (notifErr) {
      console.error('[TaskController] Failed to dispatch progress update notification:', notifErr.message);
    }

    const taskObj = task.toObject({ virtuals: true });
    taskObj.isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';

    return res.status(200).json({
      success: true,
      message: `Task progress updated to ${progValue}%. Status is now ${task.status}.`,
      task: taskObj,
    });
  } catch (error) {
    next(error);
  }
};
