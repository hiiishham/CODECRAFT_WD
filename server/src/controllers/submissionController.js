import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WorkSubmission from '../models/WorkSubmission.js';
import Task from '../models/Task.js';
import Employee from '../models/Employee.js';
import Admin from '../models/Admin.js';
import { resolveEmployeeForUser } from '../utils/employeeResolver.js';
import { notifyUser, notifyRoles } from '../utils/notificationService.js';
import { escapeRegex } from '../utils/escapeRegex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/submissions');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Validates whether a string is a valid HTTP/HTTPS URL
 */
export const isValidUrl = (urlStr) => {
  if (!urlStr || !urlStr.trim()) return true;
  try {
    const parsed = new URL(urlStr.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Validates whether a string is a valid GitHub repository URL
 */
export const isValidGithubUrl = (urlStr) => {
  if (!urlStr || !urlStr.trim()) return true;
  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'github.com' || host.endsWith('.github.com');
  } catch {
    return false;
  }
};

/**
 * @desc    Upload file attachments for work submission
 * @route   POST /api/submissions/upload
 * @access  Private (Authenticated users)
 */
export const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'No files provided',
      });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      let fileUrl = '';
      let publicId = '';

      try {
        const cloudinaryService = (await import('../services/cloudinaryService.js')).default;
        const uploadResult = await cloudinaryService.uploadBuffer(
          file.buffer,
          'staffpulse/submissions',
          'raw'
        );
        fileUrl = uploadResult.secure_url;
        publicId = uploadResult.public_id;
      } catch (cloudinaryErr) {
        console.warn('[SubmissionController] Cloudinary upload fallback to local storage:', cloudinaryErr.message);
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname) || '';
        const safeBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${safeBaseName}-${uniqueSuffix}${ext}`;
        const filePath = path.join(UPLOAD_DIR, filename);
        fs.writeFileSync(filePath, file.buffer);
        fileUrl = `/uploads/submissions/${filename}`;
        publicId = filename;
      }

      uploadedFiles.push({
        fileName: file.originalname,
        fileUrl,
        publicId,
        fileType: file.mimetype,
        fileSize: file.size,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Attachments uploaded successfully',
      files: uploadedFiles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a work submission for an assigned task
 * @route   POST /api/submissions
 * @access  Private (Employee)
 */
export const createSubmission = async (req, res, next) => {
  try {
    const employee = await resolveEmployeeForUser(req.user);
    if (!employee) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Employee profile not found for authenticated user',
      });
    }

    const {
      taskId,
      description,
      githubUrl = '',
      liveUrl = '',
      attachments = [],
      employeeComment = '',
    } = req.body;

    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Valid task ID is required',
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Work description is required',
      });
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 10) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Work description must be at least 10 characters long',
      });
    }

    if (trimmedDesc.length > 3000) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Work description must not exceed 3000 characters',
      });
    }

    // Validate URLs if provided
    if (githubUrl && !isValidGithubUrl(githubUrl)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid GitHub URL. Must be a valid URL pointing to github.com starting with http:// or https://',
      });
    }

    if (liveUrl && !isValidUrl(liveUrl)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid Live URL. Must be a valid URL starting with http:// or https://',
      });
    }

    // Find task and verify assignment
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Task not found',
      });
    }

    if (task.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Cannot submit work for a cancelled task',
      });
    }

    if (task.assignedTo.toString() !== employee._id.toString()) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: 'You are not authorized to submit work for this task',
      });
    }

    // Check existing submissions
    const existingApproved = await WorkSubmission.findOne({ task: taskId, status: 'Approved' });
    if (existingApproved) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: 'Work for this task has already been approved',
      });
    }

    const existingPending = await WorkSubmission.findOne({ task: taskId, status: 'Pending Review' });
    if (existingPending) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: 'A submission is already pending review for this task',
      });
    }

    // Format attachments safely
    const formattedAttachments = Array.isArray(attachments)
      ? attachments.map((att) => ({
          fileName: String(att.fileName || 'Attachment').trim(),
          fileUrl: String(att.fileUrl || '').trim(),
          publicId: String(att.publicId || '').trim(),
          fileType: String(att.fileType || '').trim(),
          fileSize: Number(att.fileSize) || 0,
        }))
      : [];

    const submission = await WorkSubmission.create({
      task: taskId,
      employee: employee._id,
      description: trimmedDesc,
      githubUrl: String(githubUrl).trim(),
      liveUrl: String(liveUrl).trim(),
      attachments: formattedAttachments,
      employeeComment: String(employeeComment).trim(),
      status: 'Pending Review',
      submittedAt: new Date(),
    });

    await submission.populate([
      { path: 'task', select: 'title priority status department dueDate' },
      { path: 'employee', select: 'fullName employeeId email department designation profileImage' },
    ]);

    // Dispatch notification to Admins & Managers
    try {
      await notifyRoles(['admin', 'manager'], {
        title: 'New work submission',
        message: `${employee.fullName} submitted work for ${task.title}.`,
        type: 'submission',
        relatedId: submission._id,
        relatedType: 'WorkSubmission',
      });
    } catch (notifErr) {
      console.error('[SubmissionController] Failed to dispatch submission notification:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Work submitted successfully and is now pending review',
      submission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get submissions by authenticated employee
 * @route   GET /api/submissions/my
 * @access  Private (Employee)
 */
export const getMySubmissions = async (req, res, next) => {
  try {
    const employee = await resolveEmployeeForUser(req.user);
    if (!employee) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Employee profile not found for authenticated user',
      });
    }

    const { status, search, taskId } = req.query;
    const filter = { employee: employee._id };

    if (status && status !== 'All' && status !== 'all') {
      filter.status = status;
    }

    if (taskId && mongoose.Types.ObjectId.isValid(taskId)) {
      filter.task = taskId;
    }

    const submissions = await WorkSubmission.find(filter)
      .populate('task', 'title priority status department dueDate')
      .populate('reviewedBy', 'name role')
      .sort({ submittedAt: -1 })
      .lean();

    // Client-side search on task title or description if provided
    let filtered = submissions;
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filtered = submissions.filter(
        (sub) =>
          sub.task?.title?.toLowerCase().includes(q) ||
          sub.description?.toLowerCase().includes(q)
      );
    }

    // Calculate summary statistics
    const allSubs = await WorkSubmission.find({ employee: employee._id }).select('status');
    const summary = {
      total: allSubs.length,
      pendingReview: allSubs.filter((s) => s.status === 'Pending Review').length,
      approved: allSubs.filter((s) => s.status === 'Approved').length,
      changesRequested: allSubs.filter((s) => s.status === 'Changes Requested').length,
    };

    return res.status(200).json({
      success: true,
      submissions: filtered,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get submission by ID
 * @route   GET /api/submissions/:id
 * @access  Private (Admin, Manager, Assigned Employee)
 */
export const getSubmissionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid submission ID format',
      });
    }

    const submission = await WorkSubmission.findById(id)
      .populate('task', 'title description priority status department startDate dueDate estimatedHours progress')
      .populate('employee', 'fullName employeeId email department designation profileImage')
      .populate('reviewedBy', 'name email role avatar');

    if (!submission) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Submission not found',
      });
    }

    // Role-based privacy isolation for Employee
    if (req.user.role === 'employee') {
      const employee = await resolveEmployeeForUser(req.user);
      if (!employee || submission.employee._id.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'You are not authorized to view this submission',
        });
      }
    }

    // Role-based privacy isolation for Manager: scoped to their department
    if (req.user.role === 'manager') {
      const managerDept = req.user.department;
      if (!managerDept || submission.employee?.department?.toLowerCase() !== managerDept.toLowerCase()) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'You are not authorized to view submissions outside your department',
        });
      }
    }

    return res.status(200).json({
      success: true,
      submission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get submission for a specific task
 * @route   GET /api/submissions/task/:taskId
 * @access  Private (All authenticated roles)
 */
export const getSubmissionByTaskId = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid task ID format',
      });
    }

    const query = { task: taskId };

    // If employee, ensure query is scoped to them
    if (req.user.role === 'employee') {
      const employee = await resolveEmployeeForUser(req.user);
      if (employee) query.employee = employee._id;
    }

    // Get latest submission for this task
    const submission = await WorkSubmission.findOne(query)
      .sort({ submittedAt: -1 })
      .populate('reviewedBy', 'name role')
      .lean();

    return res.status(200).json({
      success: true,
      submission: submission || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update and resubmit work (Employee only)
 * @route   PUT /api/submissions/:id
 * @access  Private (Employee)
 */
export const updateSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid submission ID format',
      });
    }

    const employee = await resolveEmployeeForUser(req.user);
    if (!employee) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Employee profile not found for authenticated user',
      });
    }

    const submission = await WorkSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Submission not found',
      });
    }

    // Ownership check
    if (submission.employee.toString() !== employee._id.toString()) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: 'You are not authorized to update this submission',
      });
    }

    // Cannot edit approved submission
    if (submission.status === 'Approved') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Approved submissions cannot be modified',
      });
    }

    const {
      description,
      githubUrl,
      liveUrl,
      attachments,
      employeeComment,
    } = req.body;

    if (description !== undefined) {
      const trimmed = String(description).trim();
      if (!trimmed) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Work description cannot be empty',
        });
      }
      if (trimmed.length < 10) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Work description must be at least 10 characters long',
        });
      }
      if (trimmed.length > 3000) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Work description must not exceed 3000 characters',
        });
      }
      submission.description = trimmed;
    }

    if (githubUrl !== undefined) {
      if (githubUrl && !isValidGithubUrl(githubUrl)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Invalid GitHub URL. Must be a valid URL pointing to github.com starting with http:// or https://',
        });
      }
      submission.githubUrl = String(githubUrl).trim();
    }

    if (liveUrl !== undefined) {
      if (liveUrl && !isValidUrl(liveUrl)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Invalid Live URL. Must be a valid URL starting with http:// or https://',
        });
      }
      submission.liveUrl = String(liveUrl).trim();
    }

    if (attachments !== undefined && Array.isArray(attachments)) {
      submission.attachments = attachments.map((att) => ({
        fileName: String(att.fileName || 'Attachment').trim(),
        fileUrl: String(att.fileUrl || '').trim(),
        publicId: String(att.publicId || '').trim(),
        fileType: String(att.fileType || '').trim(),
        fileSize: Number(att.fileSize) || 0,
      }));
    }

    if (employeeComment !== undefined) {
      submission.employeeComment = String(employeeComment).trim();
    }

    // Reset status to Pending Review on resubmission
    submission.status = 'Pending Review';
    submission.submittedAt = new Date();

    await submission.save();

    await submission.populate([
      { path: 'task', select: 'title priority status department dueDate' },
      { path: 'employee', select: 'fullName employeeId email department designation profileImage' },
    ]);

    // Dispatch notification to Reviewer/Admins
    try {
      await notifyRoles(['admin', 'manager'], {
        title: 'Work Resubmitted',
        message: `${employee.fullName} resubmitted work for review on "${submission.task?.title || 'task'}".`,
        type: 'submission',
        relatedId: submission._id,
      });
    } catch (notifErr) {
      console.error('[SubmissionController] Failed to dispatch resubmission notification:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Work resubmitted successfully and is now pending review',
      submission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all submissions with search, filters, pagination and stats (Admin & Manager)
 * @route   GET /api/submissions
 * @access  Private (Admin & Manager)
 */
export const getSubmissions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, status, employee, department, startDate, endDate } = req.query;

    const filter = {};

    // 1. Role-based scoping for Manager: strictly isolated to their department team
    let teamEmpIds = null;
    if (req.user.role === 'manager') {
      const managerDept = req.user.department;
      const teamEmployees = await Employee.find({
        department: { $regex: new RegExp(`^${escapeRegex(managerDept?.trim() || '')}$`, 'i') },
      }).select('_id');
      teamEmpIds = teamEmployees.map((e) => e._id.toString());

      if (employee && employee !== 'All' && employee !== 'all') {
        if (teamEmpIds.includes(employee.toString())) {
          filter.employee = employee;
        } else {
          // Employee not in manager's department
          filter.employee = new mongoose.Types.ObjectId();
        }
      } else {
        filter.employee = { $in: teamEmpIds };
      }
    } else {
      // Admin: company-wide
      if (employee && employee !== 'All' && employee !== 'all') {
        if (mongoose.Types.ObjectId.isValid(employee)) {
          filter.employee = employee;
        }
      }

      if (department && department !== 'All' && department !== 'all') {
        const deptEmployees = await Employee.find({
          department: { $regex: new RegExp(`^${escapeRegex(department.trim())}$`, 'i') },
        }).select('_id');
        const deptEmpIds = deptEmployees.map((e) => e._id);
        filter.employee = { $in: deptEmpIds };
      }
    }

    if (status && status !== 'All' && status !== 'all') {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.submittedAt = {};
      if (startDate) filter.submittedAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.submittedAt.$lte = end;
      }
    }

    // Filter by employee search or task search or description
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      const [matchingEmployees, matchingTasks] = await Promise.all([
        Employee.find({
          $or: [
            { fullName: searchRegex },
            { employeeId: searchRegex },
          ],
        }).select('_id'),
        Task.find({ title: searchRegex }).select('_id'),
      ]);

      const empIds = matchingEmployees.map((e) => e._id);
      const taskIds = matchingTasks.map((t) => t._id);

      const searchConditions = [
        { employee: { $in: empIds } },
        { task: { $in: taskIds } },
        { description: searchRegex },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const baseStatsFilter = req.user.role === 'manager' && teamEmpIds ? { employee: { $in: teamEmpIds } } : {};

    const [totalRecords, submissions, totalCount, pendingCount, approvedCount, changesCount] =
      await Promise.all([
        WorkSubmission.countDocuments(filter),
        WorkSubmission.find(filter)
          .populate('employee', 'fullName employeeId email department designation profileImage')
          .populate('task', 'title priority status department dueDate')
          .populate('reviewedBy', 'name email role')
          .sort({ submittedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        WorkSubmission.countDocuments(baseStatsFilter),
        WorkSubmission.countDocuments({ ...baseStatsFilter, status: 'Pending Review' }),
        WorkSubmission.countDocuments({ ...baseStatsFilter, status: 'Approved' }),
        WorkSubmission.countDocuments({ ...baseStatsFilter, status: 'Changes Requested' }),
      ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return res.status(200).json({
      success: true,
      submissions,
      totalRecords,
      totalPages,
      currentPage: page,
      limit,
      stats: {
        total: totalCount,
        pendingReview: pendingCount,
        approved: approvedCount,
        changesRequested: changesCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Review submission (Approve or Request Changes)
 * @route   PUT /api/submissions/:id/review
 * @access  Private (Admin & Manager)
 */
export const reviewSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewComment = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid submission ID format',
      });
    }

    const allowedStatuses = ['Approved', 'Changes Requested'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Invalid review status. Must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    if (status === 'Changes Requested' && (!reviewComment || !reviewComment.trim())) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Review comment is required when requesting changes',
      });
    }

    const submission = await WorkSubmission.findById(id)
      .populate('task', 'title priority status')
      .populate('employee', 'fullName email employeeId department');

    if (!submission) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Submission not found',
      });
    }

    // Role-based authorization for Manager: verify employee is in manager's department
    if (req.user.role === 'manager') {
      const managerDept = req.user.department;
      if (!managerDept || submission.employee?.department?.toLowerCase() !== managerDept.toLowerCase()) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'You are not authorized to review submissions outside your department',
        });
      }
    }

    // State transition rules:
    // 1. Cannot modify already approved submissions
    if (submission.status === 'Approved') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Submission is already approved and cannot be modified',
      });
    }

    // 2. Cannot request changes again if already in Changes Requested status without resubmission
    if (submission.status === 'Changes Requested' && status === 'Changes Requested') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Changes have already been requested. Awaiting employee resubmission.',
      });
    }

    submission.status = status;
    submission.reviewComment = reviewComment ? reviewComment.trim() : '';
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();

    await submission.save();

    // If approved, synchronize underlying Task status to Completed and progress to 100%
    if (status === 'Approved' && submission.task?._id) {
      await Task.findByIdAndUpdate(submission.task._id, {
        status: 'Completed',
        progress: 100,
      });
    }

    await submission.populate([
      { path: 'reviewedBy', select: 'name email role avatar' },
    ]);

    // Dispatch notification to employee
    try {
      const employeeUser = await Admin.findOne({
        email: submission.employee?.email?.toLowerCase().trim(),
      });

      if (employeeUser) {
        if (status === 'Approved') {
          await notifyUser(employeeUser._id, {
            title: 'Work submission approved',
            message: `Your work submission for "${submission.task?.title}" has been approved.`,
            type: 'submission',
            relatedId: submission._id,
            relatedType: 'WorkSubmission',
          });
        } else {
          await notifyUser(employeeUser._id, {
            title: 'Changes requested',
            message: `Changes have been requested for "${submission.task?.title}".`,
            type: 'submission',
            relatedId: submission._id,
            relatedType: 'WorkSubmission',
          });
        }
      }
    } catch (notifErr) {
      console.error('[SubmissionController] Failed to dispatch review notification:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Submission marked as ${status}`,
      submission,
    });
  } catch (error) {
    next(error);
  }
};
