import mongoose from 'mongoose';
import Department from '../models/Department.js';
import Employee from '../models/Employee.js';
import Admin from '../models/Admin.js';
import { notifyRoles } from '../utils/notificationService.js';
import { createAuditLog } from '../utils/auditService.js';
import { escapeRegex } from '../utils/escapeRegex.js';

/**
 * @desc    Get all departments with dynamic employee counts and optional search/status filter
 * @route   GET /api/departments
 * @access  Private (Admin, Manager)
 */
export const getDepartments = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
      ];
    }

    const [departments, employeeAgg] = await Promise.all([
      Department.find(filter).sort({ name: 1 }),
      Employee.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
      ]),
    ]);

    // Build map of employee counts by department name
    const countMap = {};
    employeeAgg.forEach((item) => {
      if (item._id) {
        countMap[item._id] = item.count;
      }
    });

    const departmentsWithCounts = departments.map((dept) => ({
      ...dept.toObject(),
      employeeCount: countMap[dept.name] || 0,
    }));

    return res.status(200).json({
      success: true,
      count: departmentsWithCounts.length,
      departments: departmentsWithCounts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single department by ID with dynamic employee count and list of assigned employees
 * @route   GET /api/departments/:id
 * @access  Private (Admin, Manager)
 */
export const getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID format',
      });
    }

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    // Retrieve employees assigned to this department
    const employees = await Employee.find({ department: department.name })
      .select('employeeId fullName email designation status profileImage createdAt joiningDate')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      department: {
        ...department.toObject(),
        employeeCount: employees.length,
      },
      employees,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new department
 * @route   POST /api/departments
 * @access  Private (Admin only)
 */
export const createDepartment = async (req, res, next) => {
  try {
    const { name, description, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required',
      });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Department name must be at least 2 characters long',
      });
    }
    if (trimmedName.length > 60) {
      return res.status(400).json({
        success: false,
        message: 'Department name cannot exceed 60 characters',
      });
    }

    if (description && description.trim().length > 300) {
      return res.status(400).json({
        success: false,
        message: 'Description cannot exceed 300 characters',
      });
    }

    if (status && !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either Active or Inactive',
      });
    }

    // Check for duplicate name (case-insensitive)
    const existing = await Department.findOne({
      name: { $regex: `^${trimmedName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, $options: 'i' },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A department with this name already exists',
      });
    }

    const department = await Department.create({
      name: trimmedName,
      description: description ? description.trim() : '',
      status: status || 'Active',
    });

    // Record audit log
    await createAuditLog({
      user: req.user,
      userRole: req.user?.role || 'admin',
      action: 'CREATE',
      module: 'DEPARTMENT',
      targetId: department._id,
      targetType: 'Department',
      description: `Created department "${department.name}"`,
      metadata: { name: department.name, status: department.status },
      req,
    });

    // Notify administrators and managers about new department
    await notifyRoles(['admin', 'manager'], {
      title: 'New Department Created',
      message: `Department "${department.name}" has been established.`,
      type: 'system',
      relatedId: department._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department: {
        ...department.toObject(),
        employeeCount: 0,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A department with this name already exists',
      });
    }
    next(error);
  }
};

/**
 * @desc    Update an existing department
 * @route   PUT /api/departments/:id
 * @access  Private (Admin only)
 */
export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID format',
      });
    }

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    const oldName = department.name;
    let newName = oldName;

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Department name cannot be empty',
        });
      }

      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Department name must be at least 2 characters long',
        });
      }
      if (trimmedName.length > 60) {
        return res.status(400).json({
          success: false,
          message: 'Department name cannot exceed 60 characters',
        });
      }

      if (trimmedName.toLowerCase() !== oldName.toLowerCase()) {
        // Check if another department already has the new name
        const duplicate = await Department.findOne({
          _id: { $ne: id },
          name: { $regex: `^${trimmedName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, $options: 'i' },
        });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: 'Another department already has this name',
          });
        }
      }

      newName = trimmedName;
      department.name = newName;

      if (newName !== oldName) {
        // Synchronize all employees and managers assigned to this department
        await Employee.updateMany({ department: oldName }, { department: newName });
        await Admin.updateMany({ department: oldName }, { department: newName });
      }
    }

    if (description !== undefined) {
      const trimmedDesc = description ? description.trim() : '';
      if (trimmedDesc.length > 300) {
        return res.status(400).json({
          success: false,
          message: 'Description cannot exceed 300 characters',
        });
      }
      department.description = trimmedDesc;
    }

    if (status !== undefined) {
      if (!['Active', 'Inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be either Active or Inactive',
        });
      }
      department.status = status;
    }

    await department.save();

    // Record audit log
    await createAuditLog({
      user: req.user,
      userRole: req.user?.role || 'admin',
      action: 'UPDATE',
      module: 'DEPARTMENT',
      targetId: department._id,
      targetType: 'Department',
      description: `Updated department "${department.name}"`,
      metadata: { oldName, newName: department.name, status: department.status },
      req,
    });

    // Get current employee count for response
    const employeeCount = await Employee.countDocuments({ department: department.name });

    return res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      department: {
        ...department.toObject(),
        employeeCount,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Another department already has this name',
      });
    }
    next(error);
  }
};

/**
 * @desc    Delete a department safely
 * @route   DELETE /api/departments/:id
 * @access  Private (Admin only)
 */
export const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID format',
      });
    }

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    // Safety check: Prevent deletion if any employees are currently assigned
    const assignedCount = await Employee.countDocuments({ department: department.name });
    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'This department has employees assigned to it. Reassign employees before deleting.',
        employeeCount: assignedCount,
      });
    }

    // Safety check: Prevent deletion if any managers are currently assigned
    const assignedManagers = await Admin.countDocuments({ role: 'manager', department: department.name });
    if (assignedManagers > 0) {
      return res.status(400).json({
        success: false,
        message: 'This department has managers assigned to it. Reassign managers before deleting.',
        employeeCount: assignedManagers,
      });
    }

    await department.deleteOne();

    // Record audit log
    await createAuditLog({
      user: req.user,
      userRole: req.user?.role || 'admin',
      action: 'DELETE',
      module: 'DEPARTMENT',
      targetId: department._id,
      targetType: 'Department',
      description: `Deleted department "${department.name}"`,
      metadata: { name: department.name },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
