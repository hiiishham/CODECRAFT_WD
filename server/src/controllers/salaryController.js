import mongoose from 'mongoose';
import Salary from '../models/Salary.js';
import Employee from '../models/Employee.js';
import Admin from '../models/Admin.js';
import { resolveEmployeeForUser } from '../utils/employeeResolver.js';
import { notifyUser } from '../utils/notificationService.js';
import { escapeRegex } from '../utils/escapeRegex.js';

export const getMonthName = (monthNumber) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return months[monthNumber - 1] || `Month ${monthNumber}`;
};

/**
 * Helper to normalize and calculate salary components strictly server-side
 */
export const calculateSalaryComponents = (basicSalary, allowances = [], deductions = []) => {
  const basic = Number(basicSalary);
  if (!Number.isFinite(basic) || basic <= 0) {
    const err = new Error('Basic salary must be a positive number greater than 0');
    err.statusCode = 400;
    throw err;
  }

  // Normalize and validate allowances array or numeric value
  let normAllowances = [];
  if (Array.isArray(allowances)) {
    for (const item of allowances) {
      if (!item) continue;
      const amt = Number(item.amount);
      if (!Number.isFinite(amt) || amt < 0) {
        const err = new Error('Allowance amounts must be non-negative numbers');
        err.statusCode = 400;
        throw err;
      }
      normAllowances.push({
        name: String(item.name || 'Allowance').trim(),
        amount: Math.round((amt + Number.EPSILON) * 100) / 100,
      });
    }
  } else if (typeof allowances === 'number' || (typeof allowances === 'string' && allowances.trim() !== '')) {
    const amt = Number(allowances);
    if (!Number.isFinite(amt) || amt < 0) {
      const err = new Error('Allowance amounts must be non-negative numbers');
      err.statusCode = 400;
      throw err;
    }
    if (amt > 0) {
      normAllowances = [{ name: 'Standard Allowance', amount: Math.round((amt + Number.EPSILON) * 100) / 100 }];
    }
  } else if (allowances !== undefined && allowances !== null) {
    const err = new Error('Invalid allowances format');
    err.statusCode = 400;
    throw err;
  }

  // Normalize and validate deductions array or numeric value
  let normDeductions = [];
  if (Array.isArray(deductions)) {
    for (const item of deductions) {
      if (!item) continue;
      const amt = Number(item.amount);
      if (!Number.isFinite(amt) || amt < 0) {
        const err = new Error('Deduction amounts must be non-negative numbers');
        err.statusCode = 400;
        throw err;
      }
      normDeductions.push({
        name: String(item.name || 'Deduction').trim(),
        amount: Math.round((amt + Number.EPSILON) * 100) / 100,
      });
    }
  } else if (typeof deductions === 'number' || (typeof deductions === 'string' && deductions.trim() !== '')) {
    const amt = Number(deductions);
    if (!Number.isFinite(amt) || amt < 0) {
      const err = new Error('Deduction amounts must be non-negative numbers');
      err.statusCode = 400;
      throw err;
    }
    if (amt > 0) {
      normDeductions = [{ name: 'Standard Deduction', amount: Math.round((amt + Number.EPSILON) * 100) / 100 }];
    }
  } else if (deductions !== undefined && deductions !== null) {
    const err = new Error('Invalid deductions format');
    err.statusCode = 400;
    throw err;
  }

  const totalAllowances = Math.round((normAllowances.reduce((acc, item) => acc + item.amount, 0) + Number.EPSILON) * 100) / 100;
  const totalDeductions = Math.round((normDeductions.reduce((acc, item) => acc + item.amount, 0) + Number.EPSILON) * 100) / 100;
  const grossSalary = Math.round(((basic + totalAllowances) + Number.EPSILON) * 100) / 100;

  if (totalDeductions > grossSalary) {
    const err = new Error('Net salary cannot be negative. Deductions exceed basic salary plus allowances.');
    err.statusCode = 400;
    throw err;
  }

  const netSalary = Math.round(((grossSalary - totalDeductions) + Number.EPSILON) * 100) / 100;

  return {
    basicSalary: basic,
    allowances: normAllowances,
    deductions: normDeductions,
    totalAllowances,
    grossSalary,
    totalDeductions,
    netSalary,
  };
};

// ============================================================================
// EMPLOYEE SALARY ENDPOINTS
// ============================================================================

/**
 * @desc    Get current employee's salary profile (latest salary record)
 * @route   GET /api/salary/my (or /api/salaries/my)
 * @access  Private (Employee, Manager, Admin)
 */
export const getMySalary = async (req, res, next) => {
  try {
    const employee = await resolveEmployeeForUser(req.user);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found for authenticated account',
      });
    }

    const salary = await Salary.findOne({ employee: employee._id })
      .sort({ payYear: -1, payMonth: -1, effectiveFrom: -1 })
      .populate('employee', 'fullName employeeId email department designation profileImage phone joiningDate');

    return res.status(200).json({
      success: true,
      salary: salary || null,
      message: salary ? 'Current salary retrieved successfully' : 'No salary information available yet',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get monthly salary history for authenticated employee
 * @route   GET /api/salary/my/history (or /api/salaries/my/history)
 * @access  Private (Employee, Manager, Admin)
 */
export const getMySalaryHistory = async (req, res, next) => {
  try {
    const employee = await resolveEmployeeForUser(req.user);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found for authenticated account',
      });
    }

    const salaries = await Salary.find({ employee: employee._id })
      .sort({ payYear: -1, payMonth: -1, effectiveFrom: -1 })
      .populate('employee', 'fullName employeeId email department designation');

    return res.status(200).json({
      success: true,
      count: salaries.length,
      salaries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single payslip / salary statement for authenticated employee
 * @route   GET /api/salary/my/:id (or /api/salaries/my/:id)
 * @access  Private (Employee, Manager, Admin)
 */
export const getMySalaryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid salary record ID format',
      });
    }

    const employee = await resolveEmployeeForUser(req.user);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found',
      });
    }

    const salary = await Salary.findById(id).populate(
      'employee',
      'fullName employeeId email department designation profileImage phone joiningDate'
    );

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found',
      });
    }

    // Strict security check: employee must own this salary record
    const ownerId = salary.employee?._id ? salary.employee._id.toString() : salary.employee?.toString();
    if (!ownerId || ownerId !== employee._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access another employee salary record',
      });
    }

    return res.status(200).json({
      success: true,
      salary,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// ADMIN SALARY ENDPOINTS
// ============================================================================

/**
 * @desc    Get paginated salary records with search, filters, and stats
 * @route   GET /api/salary (or /api/salaries)
 * @access  Private (Admin)
 */
export const getSalaries = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const { search, department, status, payMonth, payYear, sort } = req.query;

    const pipeline = [];

    // Join with Employee collection
    pipeline.push({
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee',
      },
    });

    pipeline.push({
      $unwind: {
        path: '$employee',
        preserveNullAndEmptyArrays: false,
      },
    });

    // Build filter match
    const matchConditions = {};

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      matchConditions.$or = [
        { 'employee.fullName': searchRegex },
        { 'employee.employeeId': searchRegex },
      ];
    }

    if (department && department.trim() !== '' && department !== 'All') {
      matchConditions['employee.department'] = department.trim();
    }

    if (status && status.trim() !== '' && status !== 'All') {
      matchConditions.status = status.trim();
    }

    const rawMonth = payMonth || req.query.month;
    const rawYear = payYear || req.query.year;

    if (rawMonth && rawMonth !== 'All') {
      matchConditions.payMonth = Number(rawMonth);
    }

    if (rawYear && rawYear !== 'All') {
      matchConditions.payYear = Number(rawYear);
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Sorting stage
    let sortStage = { payYear: -1, payMonth: -1, createdAt: -1 };
    switch (sort) {
      case 'salary_asc':
        sortStage = { netSalary: 1, _id: 1 };
        break;
      case 'salary_desc':
        sortStage = { netSalary: -1, _id: -1 };
        break;
      case 'name_asc':
        sortStage = { 'employee.fullName': 1, _id: 1 };
        break;
      case 'name_desc':
        sortStage = { 'employee.fullName': -1, _id: -1 };
        break;
      case 'effective_newest':
        sortStage = { effectiveFrom: -1, _id: -1 };
        break;
      case 'effective_oldest':
        sortStage = { effectiveFrom: 1, _id: 1 };
        break;
      default:
        sortStage = { payYear: -1, payMonth: -1, createdAt: -1 };
    }

    pipeline.push({ $sort: sortStage });

    // Facet for pagination and total count
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              basicSalary: 1,
              allowances: 1,
              deductions: 1,
              grossSalary: 1,
              totalDeductions: 1,
              netSalary: 1,
              effectiveFrom: 1,
              payMonth: 1,
              payYear: 1,
              status: 1,
              createdBy: 1,
              createdAt: 1,
              updatedAt: 1,
              employee: {
                _id: '$employee._id',
                employeeId: '$employee.employeeId',
                fullName: '$employee.fullName',
                email: '$employee.email',
                department: '$employee.department',
                designation: '$employee.designation',
                profileImage: '$employee.profileImage',
                status: '$employee.status',
              },
            },
          },
        ],
      },
    });

    const [aggregationResult, statsResult] = await Promise.all([
      Salary.aggregate(pipeline),
      Salary.aggregate([
        {
          $group: {
            _id: null,
            totalPayroll: {
              $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$netSalary', 0] },
            },
            pendingPayroll: {
              $sum: { $cond: [{ $ne: ['$status', 'Paid'] }, '$netSalary', 0] },
            },
            paidEmployeesCount: {
              $addToSet: { $cond: [{ $eq: ['$status', 'Paid'] }, '$employee', null] },
            },
            averageSalary: { $avg: '$netSalary' },
            totalRecords: { $sum: 1 },
          },
        },
      ]),
    ]);

    const result = aggregationResult[0] || { metadata: [], data: [] };
    const totalRecords = result.metadata[0] ? result.metadata[0].total : 0;
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const salaries = result.data || [];

    const rawStats = statsResult[0] || {
      totalPayroll: 0,
      pendingPayroll: 0,
      paidEmployeesCount: [],
      averageSalary: 0,
      totalRecords: 0,
    };

    const paidEmployees = (rawStats.paidEmployeesCount || []).filter(Boolean).length;

    const stats = {
      totalPayroll: Math.round((rawStats.totalPayroll || 0) * 100) / 100,
      pendingPayroll: Math.round((rawStats.pendingPayroll || 0) * 100) / 100,
      employeesPaid: paidEmployees,
      averageSalary: Math.round((rawStats.averageSalary || 0) * 100) / 100,
      totalRecords: rawStats.totalRecords || 0,
    };

    return res.status(200).json({
      success: true,
      salaries,
      currentPage: page,
      totalPages,
      totalRecords,
      limit,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single salary record by ID (Admin)
 * @route   GET /api/salary/:id (or /api/salaries/:id)
 * @access  Private (Admin)
 */
export const getSalaryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid salary record ID format',
      });
    }

    const salary = await Salary.findById(id)
      .populate('employee', 'fullName employeeId email department designation profileImage phone status joiningDate')
      .populate('createdBy', 'name email role');

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found',
      });
    }

    return res.status(200).json({
      success: true,
      salary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new salary record (Admin)
 * @route   POST /api/salary (or /api/salaries)
 * @access  Private (Admin)
 */
export const createSalary = async (req, res, next) => {
  try {
    const {
      employee,
      basicSalary,
      allowances,
      deductions,
      effectiveFrom,
      payMonth,
      payYear,
      status = 'Draft',
    } = req.body;

    // Required fields check
    if (!employee || basicSalary === undefined || basicSalary === null || !effectiveFrom) {
      return res.status(400).json({
        success: false,
        message: 'Employee, Basic Salary, and Effective Date are required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(employee)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee reference ID',
      });
    }

    // Verify employee exists
    const empRecord = await Employee.findById(employee);
    if (!empRecord) {
      return res.status(404).json({
        success: false,
        message: 'Referenced employee does not exist',
      });
    }



    // Validate effective date
    const effectiveDate = new Date(effectiveFrom);
    if (isNaN(effectiveDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid effective date format',
      });
    }

    const pMonth = payMonth ? Number(payMonth) : effectiveDate.getMonth() + 1;
    const pYear = payYear ? Number(payYear) : effectiveDate.getFullYear();

    if (isNaN(pMonth) || pMonth < 1 || pMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Pay month must be a valid number between 1 and 12',
      });
    }

    if (isNaN(pYear) || pYear < 2000 || pYear > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Pay year must be a valid 4-digit year',
      });
    }

    // Duplicate pay period check: only 1 salary record per employee per month/year
    const duplicateRecord = await Salary.findOne({
      employee,
      payMonth: pMonth,
      payYear: pYear,
    });

    if (duplicateRecord) {
      return res.status(409).json({
        success: false,
        message: `A salary record already exists for ${empRecord.fullName} for ${getMonthName(pMonth)} ${pYear}. Please edit the existing record.`,
      });
    }

    // Calculate components server-side with strict boundary validation
    let components;
    try {
      components = calculateSalaryComponents(basicSalary, allowances, deductions);
    } catch (calcErr) {
      return res.status(calcErr.statusCode || 400).json({
        success: false,
        message: calcErr.message || 'Invalid salary components provided',
      });
    }

    const {
      basicSalary: basic,
      allowances: normAllowances,
      deductions: normDeductions,
      totalAllowances,
      grossSalary,
      totalDeductions,
      netSalary,
    } = components;

    const validStatus = ['Draft', 'Processed', 'Paid'].includes(status) ? status : 'Draft';

    const salary = await Salary.create({
      employee,
      basicSalary: basic,
      allowances: normAllowances,
      deductions: normDeductions,
      grossSalary,
      totalDeductions,
      netSalary,
      effectiveFrom: effectiveDate,
      payMonth: pMonth,
      payYear: pYear,
      status: validStatus,
      createdBy: req.user?._id || null,
    });

    // Synchronize employee model salary field with net salary
    empRecord.salary = netSalary;
    await empRecord.save();

    await salary.populate('employee', 'fullName employeeId email department designation profileImage phone status');

    const monthName = getMonthName(pMonth);

    // Dispatch confirmation notification to admin creator
    if (req.user?._id) {
      await notifyUser(req.user._id, {
        title: 'Salary Record Assigned',
        message: `Salary record assigned for ${empRecord.fullName} (${monthName} ${pYear}).`,
        type: 'salary',
        relatedId: salary._id,
        relatedType: 'Salary',
      });
    }

    // Dispatch notification to employee if user account exists
    const employeeUser = await Admin.findOne({ email: empRecord.email.toLowerCase().trim() });
    if (employeeUser) {
      if (validStatus === 'Paid') {
        await notifyUser(employeeUser._id, {
          title: 'Salary Paid',
          message: `Your salary for ${monthName} ${pYear} has been marked as paid.`,
          type: 'salary',
          relatedId: salary._id,
          relatedType: 'Salary',
        });
      } else {
        await notifyUser(employeeUser._id, {
          title: 'Salary Updated',
          message: `Your salary information for ${monthName} ${pYear} has been updated.`,
          type: 'salary',
          relatedId: salary._id,
          relatedType: 'Salary',
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Salary record created successfully',
      salary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing salary record (Admin)
 * @route   PUT /api/salary/:id (or /api/salaries/:id)
 * @access  Private (Admin)
 */
export const updateSalary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      basicSalary,
      allowances,
      deductions,
      effectiveFrom,
      payMonth,
      payYear,
      status,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid salary record ID format',
      });
    }

    const salary = await Salary.findById(id);
    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found',
      });
    }

    const previousStatus = salary.status;

    // Validate payMonth / payYear if updated
    const targetMonth = payMonth !== undefined ? Number(payMonth) : salary.payMonth;
    const targetYear = payYear !== undefined ? Number(payYear) : salary.payYear;

    if (
      (payMonth !== undefined && targetMonth !== salary.payMonth) ||
      (payYear !== undefined && targetYear !== salary.payYear)
    ) {
      const duplicate = await Salary.findOne({
        _id: { $ne: id },
        employee: salary.employee,
        payMonth: targetMonth,
        payYear: targetYear,
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `A salary record already exists for this employee for ${getMonthName(targetMonth)} ${targetYear}.`,
        });
      }

      salary.payMonth = targetMonth;
      salary.payYear = targetYear;
    }

    // Validate and recalculate components strictly server-side
    let targetBasic = salary.basicSalary;
    let targetAllowances = salary.allowances;
    let targetDeductions = salary.deductions;

    if (basicSalary !== undefined) {
      targetBasic = basicSalary;
    }
    if (allowances !== undefined) {
      targetAllowances = allowances;
    }
    if (deductions !== undefined) {
      targetDeductions = deductions;
    }

    let components;
    try {
      components = calculateSalaryComponents(targetBasic, targetAllowances, targetDeductions);
    } catch (calcErr) {
      return res.status(calcErr.statusCode || 400).json({
        success: false,
        message: calcErr.message || 'Invalid salary components provided',
      });
    }

    salary.basicSalary = components.basicSalary;
    salary.allowances = components.allowances;
    salary.deductions = components.deductions;
    salary.grossSalary = components.grossSalary;
    salary.totalDeductions = components.totalDeductions;
    salary.netSalary = components.netSalary;

    if (effectiveFrom) {
      const effectiveDate = new Date(effectiveFrom);
      if (isNaN(effectiveDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid effective date format',
        });
      }
      salary.effectiveFrom = effectiveDate;
    }

    if (status && ['Draft', 'Processed', 'Paid'].includes(status)) {
      salary.status = status;
    }

    await salary.save();

    // Synchronize employee salary field
    await Employee.findByIdAndUpdate(salary.employee, { salary: salary.netSalary });

    await salary.populate('employee', 'fullName employeeId email department designation profileImage phone status');

    // Notify employee of changes
    const empRecord = salary.employee;
    if (empRecord && empRecord.email) {
      const employeeUser = await Admin.findOne({ email: empRecord.email.toLowerCase().trim() });
      if (employeeUser) {
        const monthName = getMonthName(salary.payMonth);
        if (salary.status === 'Paid' && previousStatus !== 'Paid') {
          await notifyUser(employeeUser._id, {
            title: 'Salary Paid',
            message: `Your salary for ${monthName} ${salary.payYear} has been marked as paid.`,
            type: 'salary',
            relatedId: salary._id,
            relatedType: 'Salary',
          });
        } else {
          await notifyUser(employeeUser._id, {
            title: 'Salary Updated',
            message: `Your salary information for ${monthName} ${salary.payYear} has been updated.`,
            type: 'salary',
            relatedId: salary._id,
            relatedType: 'Salary',
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Salary record updated successfully',
      salary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a draft salary record (Admin only)
 * @route   DELETE /api/salary/:id (or /api/salaries/:id)
 * @access  Private (Admin)
 */
export const deleteSalary = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid salary record ID format',
      });
    }

    const salary = await Salary.findById(id);
    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found',
      });
    }

    // Business Rule: only Draft salary records can be deleted
    if (salary.status === 'Paid' || salary.status === 'Processed') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete ${salary.status.toLowerCase()} salary records. Only draft salary records can be deleted.`,
      });
    }

    const employeeId = salary.employee;
    await salary.deleteOne();

    // Synchronize employee model salary with latest remaining salary or 0
    const latestRemainingSalary = await Salary.findOne({ employee: employeeId })
      .sort({ payYear: -1, payMonth: -1, effectiveFrom: -1 });

    await Employee.findByIdAndUpdate(employeeId, {
      salary: latestRemainingSalary ? latestRemainingSalary.netSalary : 0,
    });

    return res.status(200).json({
      success: true,
      message: 'Draft salary record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get salary summary statistics
 * @route   GET /api/salary/stats (or /api/salaries/stats)
 * @access  Private (Admin)
 */
export const getSalaryStats = async (req, res, next) => {
  try {
    const [statsResult] = await Promise.all([
      Salary.aggregate([
        {
          $group: {
            _id: null,
            totalPayroll: {
              $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$netSalary', 0] },
            },
            pendingPayroll: {
              $sum: { $cond: [{ $ne: ['$status', 'Paid'] }, '$netSalary', 0] },
            },
            paidEmployeesList: {
              $addToSet: { $cond: [{ $eq: ['$status', 'Paid'] }, '$employee', null] },
            },
            averageSalary: { $avg: '$netSalary' },
            highestSalary: { $max: '$netSalary' },
            lowestSalary: { $min: '$netSalary' },
            totalRecords: { $sum: 1 },
          },
        },
      ]),
    ]);

    const raw = statsResult[0] || {
      totalPayroll: 0,
      pendingPayroll: 0,
      paidEmployeesList: [],
      averageSalary: 0,
      highestSalary: 0,
      lowestSalary: 0,
      totalRecords: 0,
    };

    const employeesPaid = (raw.paidEmployeesList || []).filter(Boolean).length;

    return res.status(200).json({
      success: true,
      stats: {
        totalPayroll: Math.round((raw.totalPayroll || 0) * 100) / 100,
        pendingPayroll: Math.round((raw.pendingPayroll || 0) * 100) / 100,
        employeesPaid,
        averageSalary: Math.round((raw.averageSalary || 0) * 100) / 100,
        highestSalary: raw.highestSalary || 0,
        lowestSalary: raw.lowestSalary || 0,
        totalRecords: raw.totalRecords || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getMySalary,
  getMySalaryHistory,
  getMySalaryById,
  getSalaries,
  getSalaryById,
  createSalary,
  updateSalary,
  deleteSalary,
  getSalaryStats,
};
