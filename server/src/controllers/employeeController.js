import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import Admin from '../models/Admin.js';
import { notifyRoles, createNotification } from '../utils/notificationService.js';
import { resolveEmployeeForUser } from '../utils/employeeResolver.js';
import { calculateEmployeeLeaveBalance } from './leaveController.js';
import { escapeRegex } from '../utils/escapeRegex.js';

/**
 * @desc    Get all employees with search, filter, sort, and pagination
 * @route   GET /api/employees
 * @access  Private (Admin)
 */
export const getEmployees = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, department, status, sort } = req.query;

    // Build filter query
    const filterQuery = {};

    // Search by fullName, employeeId, email, department, or designation
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filterQuery.$or = [
        { fullName: searchRegex },
        { employeeId: searchRegex },
        { email: searchRegex },
        { department: searchRegex },
        { designation: searchRegex },
      ];
    }

    // Filter by department
    if (department && department.trim() !== '' && department.toLowerCase() !== 'all') {
      filterQuery.department = department.trim();
    }

    // Filter by status
    if (status && status.trim() !== '' && status.toLowerCase() !== 'all') {
      filterQuery.status = status.trim();
    }

    // Sorting
    let sortOption = { createdAt: -1 }; // Default: newest first
    if (sort && sort.trim() !== '') {
      if (sort.includes(':')) {
        const [field, order] = sort.split(':');
        sortOption = { [field]: order.toLowerCase() === 'asc' ? 1 : -1 };
      } else if (sort.startsWith('-')) {
        sortOption = { [sort.substring(1)]: -1 };
      } else {
        sortOption = { [sort]: 1 };
      }
    }

    // Filter by role (Admin can filter by manager / employee)
    const { role } = req.query;
    if (role && role.trim().toLowerCase() === 'manager') {
      const mgrQuery = { role: 'manager' };
      if (search && search.trim() !== '') {
        const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
        mgrQuery.$or = [
          { name: searchRegex },
          { username: searchRegex },
          { email: searchRegex },
          { department: searchRegex },
        ];
      }
      if (department && department.trim() !== '' && department.toLowerCase() !== 'all') {
        mgrQuery.department = department.trim();
      }
      if (status && status.trim() !== '' && status.toLowerCase() !== 'all') {
        mgrQuery.status = status.trim();
      }

      const totalManagers = await Admin.countDocuments(mgrQuery);
      const managers = await Admin.find(mgrQuery).select('-password').sort(sortOption).skip(skip).limit(limit).lean();

      const mappedManagers = managers.map((m) => ({
        _id: m._id,
        employeeId: m.employeeId || `MGR-${(m.username || 'mgr').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)}`,
        fullName: m.name,
        name: m.name,
        username: m.username,
        email: m.email,
        phone: m.phone || '+91 98111 00000',
        department: m.department,
        designation: `${m.department} Manager`,
        status: m.status || 'Active',
        accountStatus: m.status || 'Active',
        role: 'manager',
        mustChangePassword: m.mustChangePassword || false,
        joiningDate: m.createdAt,
        createdAt: m.createdAt,
      }));

      const totalPages = Math.ceil(totalManagers / limit) || 1;
      return res.status(200).json({
        success: true,
        employees: mappedManagers,
        currentPage: page,
        totalPages,
        totalEmployees: totalManagers,
        limit,
      });
    }

    if (role && role.trim() !== '' && role.toLowerCase() !== 'all') {
      const matchingAdmins = await Admin.find({ role: role.trim().toLowerCase() }).select('email').lean();
      filterQuery.email = { $in: matchingAdmins.map((a) => a.email) };
    }

    // Execute queries in parallel with role-based salary security
    const selectProjection = req.user?.role === 'admin' ? '' : '-salary';
    const [totalEmployees, employees] = await Promise.all([
      Employee.countDocuments(filterQuery),
      Employee.find(filterQuery).select(selectProjection).sort(sortOption).skip(skip).limit(limit),
    ]);

    const totalPages = Math.ceil(totalEmployees / limit) || 1;

    // Enrich with authentication account role and status
    const emails = employees.map((e) => e.email.toLowerCase());
    const admins = await Admin.find({ email: { $in: emails } }).select('email role status mustChangePassword').lean();
    const adminMap = {};
    admins.forEach((a) => {
      adminMap[a.email] = a;
    });

    const enrichedEmployees = employees.map((emp) => {
      const plain = emp.toObject ? emp.toObject() : emp;
      const account = adminMap[emp.email.toLowerCase()];
      return {
        ...plain,
        role: account?.role || (emp.designation?.toLowerCase().includes('manager') ? 'manager' : 'employee'),
        accountStatus: account?.status || emp.status,
        mustChangePassword: account?.mustChangePassword || false,
      };
    });

    return res.status(200).json({
      success: true,
      employees: enrichedEmployees,
      currentPage: page,
      totalPages,
      totalEmployees,
      limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single employee details
 * @route   GET /api/employees/:id
 * @access  Private (Admin, Manager, Employee)
 */
export const getEmployeeById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format',
      });
    }

    const selectProjection = req.user?.role === 'admin' ? '' : '-salary';
    const employee = await Employee.findById(req.params.id).select(selectProjection);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // IDOR protection: if user is an employee, they can only view their own profile
    if (req.user?.role === 'employee' && employee.email.toLowerCase() !== req.user.email?.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view another employee profile',
      });
    }

    return res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new employee
 * @route   POST /api/employees
 * @access  Private (Admin)
 */
export const createEmployee = async (req, res, next) => {
  try {
    const {
      employeeId,
      fullName,
      email,
      phone,
      department,
      designation,
      joiningDate,
      salary,
      profileImage,
      status,
      role: requestedRole,
      password,
      confirmPassword,
    } = req.body;

    // Strict Role Enforcement: Admin can create 'employee' or 'manager' only
    const accountRole = requestedRole === 'manager' ? 'manager' : 'employee';

    // Password validation if provided
    let initialPassword = 'StaffPulse@123';
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Password must be at least 6 characters long',
        });
      }
      if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Password and confirm password do not match',
        });
      }
      initialPassword = password;
    }

    // Auto-generate employeeId if omitted
    let finalEmployeeId = employeeId ? employeeId.trim().toUpperCase() : undefined;
    if (!finalEmployeeId) {
      if (accountRole === 'manager') {
        finalEmployeeId = `MGR-${Math.floor(100 + Math.random() * 900)}`;
      } else {
        const empCount = await Employee.countDocuments();
        finalEmployeeId = `EMP-${100 + empCount + 1}`;
      }
    }

    // Check duplicate employeeId
    if (finalEmployeeId) {
      const existingId = await Employee.findOne({
        employeeId: finalEmployeeId,
      });
      if (existingId) {
        return res.status(409).json({
          success: false,
          statusCode: 409,
          message: `Employee with ID "${finalEmployeeId}" already exists`,
        });
      }
    }

    // Check duplicate email in Employee and Admin collections
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const [existingEmpEmail, existingAdminEmail] = await Promise.all([
        Employee.findOne({ email: normalizedEmail }),
        Admin.findOne({ email: normalizedEmail }),
      ]);

      if (existingEmpEmail || existingAdminEmail) {
        return res.status(409).json({
          success: false,
          statusCode: 409,
          message: `An account with email "${normalizedEmail}" already exists`,
        });
      }
    }

    // Auto-derive username if omitted
    const finalUsername = req.body.username
      ? req.body.username.trim().toLowerCase()
      : (email ? email.split('@')[0].toLowerCase() : `emp.${Date.now()}`);

    let managerId = req.body.manager || null;
    let managerName = req.body.managerName || '';
    if (managerId && !managerName) {
      const mgr = await Admin.findById(managerId).select('name');
      if (mgr) managerName = mgr.name;
    }

    const employee = await Employee.create({
      employeeId: finalEmployeeId,
      fullName,
      username: finalUsername,
      email: email ? email.trim().toLowerCase() : undefined,
      phone: phone || '+91 98000 00000',
      department: department ? department.trim() : 'Engineering',
      designation: designation || (accountRole === 'manager' ? 'Operations Manager' : 'Software Engineer'),
      joiningDate: joiningDate || Date.now(),
      salary: salary !== undefined && salary !== '' ? Number(salary) : (accountRole === 'manager' ? 85000 : 50000),
      profileImage: profileImage || '',
      status: status || 'Active',
      manager: managerId,
      managerName: managerName,
    });

    // Create corresponding Admin authentication account
    let createdAccount = null;
    if (employee.email) {
      createdAccount = await Admin.create({
        name: employee.fullName,
        username: finalUsername,
        email: employee.email,
        password: initialPassword,
        role: accountRole,
        department: employee.department,
        status: employee.status === 'Inactive' ? 'Inactive' : 'Active',
        mustChangePassword: true, // Requires changing password on first login
      });

      // Dispatch welcome notification to the newly created user (no passwords included)
      await createNotification({
        recipient: createdAccount._id,
        title: 'Welcome to StaffPulse',
        message: 'Your StaffPulse account has been created. Sign in and complete your account setup.',
        type: 'account',
        relatedId: employee._id,
        relatedType: 'Account',
        priority: 'high',
      });
    }

    // Notify administrators and managers about new user
    await notifyRoles(['admin', 'manager'], {
      title: `New ${accountRole === 'manager' ? 'Manager' : 'Employee'} Added`,
      message: `${employee.fullName} was added to the ${employee.department} department as ${accountRole}.`,
      type: 'employee',
      relatedId: employee._id,
      relatedType: 'Employee',
    });

    return res.status(201).json({
      success: true,
      message: `${accountRole === 'manager' ? 'Manager' : 'Employee'} created successfully`,
      employee: {
        ...employee.toObject(),
        role: accountRole,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update employee details
 * @route   PUT /api/employees/:id
 * @access  Private (Admin)
 */
export const updateEmployee = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format',
      });
    }

    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const { employeeId, email } = req.body;

    // Check duplicate employeeId if updating
    if (employeeId && employeeId.trim().toUpperCase() !== employee.employeeId) {
      const existingId = await Employee.findOne({
        employeeId: employeeId.trim().toUpperCase(),
        _id: { $ne: req.params.id },
      });
      if (existingId) {
        return res.status(409).json({
          success: false,
          statusCode: 409,
          message: `Employee with ID "${employeeId.trim().toUpperCase()}" already exists`,
        });
      }
      req.body.employeeId = employeeId.trim().toUpperCase();
    }

    // Check duplicate email if updating
    if (email && email.trim().toLowerCase() !== employee.email) {
      const existingEmail = await Employee.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: req.params.id },
      });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          statusCode: 409,
          message: `Employee with email "${email.trim().toLowerCase()}" already exists`,
        });
      }
      req.body.email = email.trim().toLowerCase();
    }

    if (req.body.manager) {
      const mgr = await Admin.findById(req.body.manager).select('name');
      if (mgr) req.body.managerName = mgr.name;
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Sync linked Admin login user account if one exists for this employee
    try {
      const Admin = mongoose.model('Admin');
      const adminAccount = await Admin.findOne({ email: employee.email.toLowerCase() });
      if (adminAccount) {
        if (req.body.email) adminAccount.email = req.body.email.toLowerCase();
        if (req.body.fullName) adminAccount.name = req.body.fullName.trim();
        if (req.body.username) adminAccount.username = req.body.username.trim().toLowerCase();
        if (req.body.department) adminAccount.department = req.body.department;
        if (req.body.status) adminAccount.status = req.body.status === 'Inactive' ? 'Inactive' : 'Active';
        if (req.body.role && (req.body.role === 'manager' || req.body.role === 'employee')) {
          adminAccount.role = req.body.role;
        }
        if (req.body.password && req.body.password.trim().length >= 6) {
          adminAccount.password = req.body.password.trim();
          adminAccount.mustChangePassword = true;
        }
        await adminAccount.save();
      }
    } catch (e) {
      // Non-fatal
    }

    // Notify administrators and managers about employee profile update
    await notifyRoles(['admin', 'manager'], {
      title: 'Employee Profile Updated',
      message: `${updatedEmployee.fullName}'s profile information was updated.`,
      type: 'employee',
      relatedId: updatedEmployee._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      employee: updatedEmployee,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete employee
 * @route   DELETE /api/employees/:id
 * @access  Private (Admin)
 */
export const deleteEmployee = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format',
      });
    }

    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // Safety check: verify employee does not have active assigned tasks
    try {
      const Task = mongoose.model('Task');
      const activeTasks = await Task.countDocuments({
        assignedTo: employee._id,
        status: { $in: ['Assigned', 'In Progress'] },
      });

      if (activeTasks > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete employee: They have ${activeTasks} active task(s). Please reassign or complete these tasks first.`,
          activeTasks,
        });
      }
    } catch (e) {
      // Non-fatal
    }

    // Clean up linked Admin login account if one exists for this employee
    try {
      const Admin = mongoose.model('Admin');
      await Admin.deleteOne({ email: employee.email.toLowerCase() });
    } catch (e) {
      // Non-fatal
    }

    await employee.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Employee deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset employee/manager account password (Admin only)
 * @route   POST /api/employees/:id/reset-password
 * @access  Private (Admin)
 */
export const resetEmployeePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const tempPassword = (password && password.trim().length >= 6) ? password.trim() : 'StaffPulse@123';

    let adminAccount = await Admin.findOne({ email: employee.email.toLowerCase() });
    if (!adminAccount) {
      adminAccount = await Admin.create({
        name: employee.fullName,
        email: employee.email.toLowerCase(),
        password: tempPassword,
        role: 'employee',
        department: employee.department || 'Development',
        status: employee.status || 'Active',
        mustChangePassword: true,
      });
    } else {
      adminAccount.password = tempPassword;
      adminAccount.mustChangePassword = true;
      await adminAccount.save();
    }

    return res.status(200).json({
      success: true,
      message: `Password reset successfully. The temporary password is: ${tempPassword}`,
      temporaryPassword: tempPassword,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get consolidated employee dashboard stats
 * @route   GET /api/employee/dashboard
 * @access  Private (Employee, Admin, Manager)
 */
export const getEmployeeDashboardStats = async (req, res, next) => {
  try {
    const employeeDoc = await resolveEmployeeForUser(req.user);
    if (!employeeDoc) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found for authenticated user',
      });
    }
    const employeeId = employeeDoc._id;

    const Attendance = mongoose.model('Attendance');
    const Task = mongoose.model('Task');
    const Leave = mongoose.model('Leave');
    const Salary = mongoose.model('Salary');
    const Performance = mongoose.model('Performance');
    const Goal = mongoose.model('Goal');
    const Notification = mongoose.model('Notification');
    const Announcement = mongoose.model('Announcement');
    const Employee = mongoose.model('Employee');
    const WorkSubmission = mongoose.model('WorkSubmission');

    // Prepare date boundaries
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    const endOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth() + 1, 0, 23, 59, 59, 999);

    // Resolve employee department ID for audience targeting
    let userDeptId = null;
    if (employeeDoc?.department) {
      const Department = mongoose.model('Department');
      const dDoc = await Department.findOne({
        name: new RegExp(`^${escapeRegex(employeeDoc.department.trim())}$`, 'i'),
      });
      if (dDoc) userDeptId = dDoc._id;
    }
    const now = new Date();
    const audienceConds = [{ audience: 'All' }, { audience: 'Employees' }];
    if (userDeptId) {
      audienceConds.push({ audience: 'Department', department: userDeptId });
    }

    // Parallel execution for maximum performance
    const [
      todayAttendance,
      monthlyAttendances,
      pendingTasksCount,
      completedTasksCount,
      upcomingTasks,
      leaveBalanceData,
      pendingLeaves,
      latestSalary,
      performanceSummary,
      goals,
      notifications,
      announcements,
      employee,
      recentSubmissions,
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      changesRequestedSubmissions,
    ] = await Promise.all([
      // 1. Today's Attendance
      Attendance.findOne({ employee: employeeId, date: { $gte: startOfDay, $lte: endOfDay } }),
      // 2. Monthly Attendance Summary
      Attendance.find({ employee: employeeId, date: { $gte: startOfMonth, $lte: endOfMonth } }),
      // 3. Pending Tasks
      Task.countDocuments({ assignedTo: employeeId, status: { $ne: 'Completed' } }),
      // 4. Completed Tasks
      Task.countDocuments({ assignedTo: employeeId, status: 'Completed' }),
      // 5. Upcoming Tasks (next 3)
      Task.find({ assignedTo: employeeId, status: { $ne: 'Completed' } }).sort({ dueDate: 1 }).limit(3).lean({ virtuals: true }),
      // 6. Live Leave Balance
      calculateEmployeeLeaveBalance(employeeId),
      // 7. Pending Leaves
      Leave.find({ employee: employeeId, status: 'Pending' }).sort({ createdAt: -1 }).limit(3),
      // 8. Latest Salary
      Salary.findOne({ employee: employeeId }).sort({ payYear: -1, payMonth: -1, effectiveFrom: -1 }),
      // 9. Performance Summary
      Performance.findOne({ employee: employeeId }).sort({ reviewPeriod: -1 }),
      // 10. Goals
      Goal.find({ employee: employeeId }).limit(4),
      // 11. Notifications
      Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(5),
      // 12. Announcements (applicable to them)
      Announcement.find({ 
        status: 'Published',
        publishDate: { $lte: now },
        $or: [
          { expiryDate: { $exists: false } },
          { expiryDate: null },
          { expiryDate: { $gte: now } },
        ],
        $and: [{ $or: audienceConds }],
      }).sort({ priority: -1, publishDate: -1, createdAt: -1 }).limit(4).lean(),
      // 13. Employee info (to check department for announcements)
      Employee.findById(employeeId).select('department'),
      // 14. Submissions
      WorkSubmission.find({ employee: employeeId }).sort({ submittedAt: -1 }).limit(5).populate('task', 'title priority status').lean(),
      WorkSubmission.countDocuments({ employee: employeeId }),
      WorkSubmission.countDocuments({ employee: employeeId, status: 'Pending Review' }),
      WorkSubmission.countDocuments({ employee: employeeId, status: 'Approved' }),
      WorkSubmission.countDocuments({ employee: employeeId, status: 'Changes Requested' }),
    ]);

    const liveBalance = leaveBalanceData?.balance || {
      annual: { total: 20, used: 0, remaining: 20 },
      sick: { total: 10, used: 0, remaining: 10 },
      casual: { total: 7, used: 0, remaining: 7 },
      emergency: { total: 5, used: 0, remaining: 5 },
    };

    // Format response
    const dashboardData = {
      attendance: {
        today: todayAttendance,
        monthly: {
          present: monthlyAttendances.filter(a => a.status === 'Present').length,
          absent: monthlyAttendances.filter(a => a.status === 'Absent').length,
          late: monthlyAttendances.filter(a => a.status === 'Late').length,
          leave: monthlyAttendances.filter(a => a.status === 'Leave').length,
          total: monthlyAttendances.length
        }
      },
      tasks: {
        pending: pendingTasksCount,
        completed: completedTasksCount,
        upcoming: upcomingTasks.map((t) => ({
          ...t,
          isOverdue: t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed',
        })),
      },
      submissions: {
        recent: recentSubmissions,
        summary: {
          total: totalSubmissions,
          pendingReview: pendingSubmissions,
          approved: approvedSubmissions,
          changesRequested: changesRequestedSubmissions,
        },
      },
      leave: {
        usedSummary: {
          'Annual Leave': liveBalance.annual,
          'Sick Leave': liveBalance.sick,
          'Casual Leave': liveBalance.casual,
          'Emergency Leave': liveBalance.emergency,
        },
        balance: liveBalance,
        pending: pendingLeaves
      },
      salary: latestSalary,
      performance: performanceSummary,
      goals: goals,
      notifications: notifications,
      announcements: announcements
    };

    return res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload or replace employee profile avatar
 * @route   PUT /api/employees/:id/avatar
 * @access  Private (Admin, Employee self)
 */
export const uploadEmployeeAvatar = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Role-based auth
    if (req.user.role === 'employee' && employee.email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this avatar' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    let optimizedUrl = null;
    let publicId = null;

    const hasCloudinary =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    if (hasCloudinary) {
      try {
        const cloudinaryService = (await import('../services/cloudinaryService.js')).default;
        const uploadResult = await cloudinaryService.uploadBuffer(req.file.buffer, 'staffpulse/avatars', 'image');
        publicId = uploadResult.public_id;

        // Delete old avatar if publicId exists
        if (employee.profileImageId) {
          try {
            await cloudinaryService.deleteFile(employee.profileImageId, 'image');
          } catch (e) {
            console.warn('Failed to delete old avatar', e.message);
          }
        }

        optimizedUrl = cloudinaryService.getOptimizedImageUrl(uploadResult.public_id, {
          width: 256,
          height: 256,
          crop: 'fill',
          gravity: 'face',
        });
      } catch (err) {
        console.warn('Cloudinary upload failed, falling back to dataURI:', err.message);
      }
    }

    if (!optimizedUrl) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      optimizedUrl = `data:${req.file.mimetype};base64,${b64}`;
    }

    employee.profileImage = optimizedUrl;
    if (publicId) employee.profileImageId = publicId;
    await employee.save();

    // Synchronize Admin avatar if matching email account exists
    await Admin.findOneAndUpdate(
      { email: employee.email.toLowerCase().trim() },
      { avatar: optimizedUrl }
    );

    const { createAuditLog } = await import('../utils/auditService.js');
    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: 'UPDATE',
      module: 'EMPLOYEE',
      targetId: employee._id,
      targetType: 'Employee',
      description: `Updated profile avatar for ${employee.fullName}`,
      req
    });

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      profileImage: employee.profileImage,
    });
  } catch (err) {
    next(err);
  }
};
