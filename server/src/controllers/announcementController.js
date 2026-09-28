import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Announcement from '../models/Announcement.js';
import Department from '../models/Department.js';
import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';
import Notification from '../models/Notification.js';
import { createNotification, notifyRoles } from '../utils/notificationService.js';
import { createAuditLog } from '../utils/auditService.js';
import { escapeRegex } from '../utils/escapeRegex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ANNOUNCEMENT_UPLOADS_DIR = path.resolve(__dirname, '../../uploads/announcements');

// Ensure announcements upload directory exists
if (!fs.existsSync(ANNOUNCEMENT_UPLOADS_DIR)) {
  fs.mkdirSync(ANNOUNCEMENT_UPLOADS_DIR, { recursive: true });
}

const ALLOWED_CATEGORIES = ['General', 'HR', 'Holiday', 'Event', 'Meeting', 'Policy', 'Urgent', 'Other'];
const ALLOWED_PRIORITIES = ['Normal', 'Important', 'Urgent'];
const ALLOWED_AUDIENCES = ['All', 'Employees', 'Managers', 'Department'];
const ALLOWED_STATUSES = ['Draft', 'Published', 'Archived'];

/**
 * Authoritatively resolves user department name and Department document ID
 */
export const resolveUserDepartment = async (user) => {
  if (!user) return { deptName: '', deptId: null };

  let deptName = '';
  // Check Employee record first for employee role or accounts associated with an employee profile
  if (user.email) {
    const empDoc = await Employee.findOne({ email: user.email.toLowerCase().trim() }).select('department');
    if (empDoc && empDoc.department) {
      deptName = empDoc.department.trim();
    }
  }

  // Fallback to Admin.department
  if (!deptName && user.department) {
    deptName = user.department.trim();
  }

  let deptId = null;
  if (deptName) {
    const deptDoc = await Department.findOne({
      name: new RegExp(`^${escapeRegex(deptName)}$`, 'i'),
    });
    if (deptDoc) {
      deptId = deptDoc._id;
    }
  }

  return { deptName, deptId };
};

/**
 * Dispatches notifications to targeted audience when an announcement is published
 */
const dispatchAnnouncementNotifications = async (announcement) => {
  try {
    const { _id, title, audience, department } = announcement;
    const notifTitle = 'New Announcement';
    const notifMessage = title;
    const notifType = 'announcement';

    if (audience === 'All') {
      await notifyRoles(['admin', 'manager', 'employee'], {
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        relatedId: _id,
        relatedType: 'Announcement',
      });
    } else if (audience === 'Employees') {
      await notifyRoles(['employee'], {
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        relatedId: _id,
        relatedType: 'Announcement',
      });
    } else if (audience === 'Managers') {
      await notifyRoles(['manager'], {
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        relatedId: _id,
        relatedType: 'Announcement',
      });
    } else if (audience === 'Department' && department) {
      const deptDoc = await Department.findById(department);
      if (deptDoc) {
        // Find users matching department name in Admin
        const usersInDept = await Admin.find({ department: deptDoc.name }).select('_id');
        // Also resolve employees in this department and their Admin accounts
        const employeesInDept = await Employee.find({ department: deptDoc.name }).select('email');
        const empEmails = employeesInDept.map((e) => e.email.toLowerCase().trim()).filter(Boolean);
        const empUsers = empEmails.length > 0 ? await Admin.find({ email: { $in: empEmails } }).select('_id') : [];

        const recipientIds = new Set([
          ...usersInDept.map((u) => u._id.toString()),
          ...empUsers.map((u) => u._id.toString()),
        ]);

        for (const recipientId of recipientIds) {
          await createNotification({
            recipient: recipientId,
            title: notifTitle,
            message: notifMessage,
            type: notifType,
            relatedId: _id,
            relatedType: 'Announcement',
          });
        }
      }
    }
  } catch (err) {
    console.warn('[AnnouncementController] Notification dispatch failed:', err.message);
  }
};

/**
 * @desc    Create new announcement
 * @route   POST /api/announcements
 * @access  Private (Admin only)
 */
export const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      category = 'General',
      priority = 'Normal',
      audience = 'All',
      department,
      publishDate,
      expiryDate,
      status = 'Published',
      attachments = [],
    } = req.body;

    // 1. Mandatory Fields Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Announcement title is required',
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Announcement content is required',
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Category is required',
      });
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `${category} is not a valid category`,
      });
    }

    if (!priority) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Priority is required',
      });
    }

    if (!ALLOWED_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `${priority} is not a valid priority (Normal, Important, Urgent)`,
      });
    }

    if (!audience) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Audience is required',
      });
    }

    if (!ALLOWED_AUDIENCES.includes(audience)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `${audience} is not a valid audience (All, Employees, Managers, Department)`,
      });
    }

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `${status} is not a valid status (Draft, Published, Archived)`,
      });
    }

    // 2. Department Requirement when audience is Department
    let targetDeptId = null;
    if (audience === 'Department') {
      if (!department) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Department is required for department-specific announcements',
        });
      }

      if (!mongoose.Types.ObjectId.isValid(department)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Invalid department ID format',
        });
      }

      const deptExists = await Department.findById(department);
      if (!deptExists) {
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: 'Specified department does not exist',
        });
      }
      targetDeptId = deptExists._id;
    }

    // 3. Date Validation
    let effectivePublishDate = new Date();
    if (publishDate) {
      effectivePublishDate = new Date(publishDate);
      if (isNaN(effectivePublishDate.getTime())) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Invalid publish date format',
        });
      }
    }

    let effectiveExpiryDate = null;
    if (expiryDate) {
      effectiveExpiryDate = new Date(expiryDate);
      if (isNaN(effectiveExpiryDate.getTime())) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Invalid expiry date format',
        });
      }
      if (effectiveExpiryDate < effectivePublishDate) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Expiry date cannot be before publish date',
        });
      }
    }

    // 4. Create Announcement Document
    const announcement = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      category,
      priority,
      audience,
      department: targetDeptId,
      publishedBy: req.user._id,
      status: status || 'Published',
      publishDate: effectivePublishDate,
      expiryDate: effectiveExpiryDate,
      attachments: Array.isArray(attachments) ? attachments : [],
      readBy: [],
    });

    // 5. Notify audience if Published
    if (announcement.status === 'Published') {
      await dispatchAnnouncementNotifications(announcement);
    }

    // 6. Audit Trail Logging
    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: 'CREATE',
      module: 'ANNOUNCEMENT',
      targetId: announcement._id,
      targetType: 'Announcement',
      description: `Created announcement "${announcement.title}" (${announcement.status})`,
      metadata: {
        category: announcement.category,
        priority: announcement.priority,
        audience: announcement.audience,
        status: announcement.status,
      },
      req,
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('publishedBy', 'name email role avatar')
      .populate('department', 'name');

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Announcement published successfully',
      announcement: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || 'Failed to create announcement',
    });
  }
};

/**
 * @desc    Get all announcements with search, filters & statistics
 * @route   GET /api/announcements
 * @access  Private (Admin, Manager)
 */
export const getAnnouncements = async (req, res) => {
  try {
    const {
      search,
      category,
      priority,
      status,
      audience,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    if (category && category !== 'All' && category !== 'all') {
      filter.category = category;
    }

    if (priority && priority !== 'All' && priority !== 'all') {
      filter.priority = priority;
    }

    if (status && status !== 'All' && status !== 'all') {
      filter.status = status;
    }

    if (audience && audience !== 'All' && audience !== 'all') {
      filter.audience = audience;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [
        { title: searchRegex },
        { content: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const skip = (pageNum - 1) * limitNum;

    const [announcements, totalCount] = await Promise.all([
      Announcement.find(filter)
        .populate('publishedBy', 'name email role avatar')
        .populate('department', 'name')
        .sort({ publishDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Announcement.countDocuments(filter),
    ]);

    // Compute KPI Summary Stats
    const now = new Date();
    const fortyEightHoursLater = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const [total, published, drafts, expiringSoon] = await Promise.all([
      Announcement.countDocuments({}),
      Announcement.countDocuments({ status: 'Published' }),
      Announcement.countDocuments({ status: 'Draft' }),
      Announcement.countDocuments({
        status: 'Published',
        expiryDate: { $gte: now, $lte: fortyEightHoursLater },
      }),
    ]);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      announcements,
      count: announcements.length,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
      currentPage: pageNum,
      stats: {
        total,
        published,
        drafts,
        expiringSoon,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || 'Unable to load announcements',
    });
  }
};

/**
 * @desc    Get active, audience-targeted announcements for authenticated Employee/Manager
 * @route   GET /api/announcements/my
 * @access  Private (Authenticated users)
 */
export const getMyAnnouncements = async (req, res) => {
  try {
    const user = req.user;
    const now = new Date();

    // Authoritatively resolve user's department ID
    const { deptId: userDeptId } = await resolveUserDepartment(user);

    // Build Audience matching criteria
    const audienceConditions = [{ audience: 'All' }];

    if (user.role === 'employee') {
      audienceConditions.push({ audience: 'Employees' });
    } else if (user.role === 'manager') {
      audienceConditions.push({ audience: 'Managers' });
    } else if (user.role === 'admin') {
      // Admin sees everything
      audienceConditions.push({ audience: 'Employees' }, { audience: 'Managers' });
    }

    if (userDeptId) {
      audienceConditions.push({ audience: 'Department', department: userDeptId });
    }

    // Base query for active notice board:
    // Published, publishDate <= now, expiryDate >= now (or no expiry)
    const filter = {
      status: 'Published',
      publishDate: { $lte: now },
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: { $gte: now } },
      ],
      $and: [
        { $or: audienceConditions },
      ],
    };

    // Category and Priority filters
    const { search, category, priority } = req.query;

    if (category && category !== 'All' && category !== 'all') {
      filter.category = category;
    }

    if (priority && priority !== 'All' && priority !== 'all') {
      filter.priority = priority;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$and.push({
        $or: [
          { title: searchRegex },
          { content: searchRegex },
        ],
      });
    }

    const announcements = await Announcement.find(filter)
      .populate('publishedBy', 'name email role avatar')
      .populate('department', 'name')
      .sort({ priority: -1, publishDate: -1 })
      .lean();

    // Compute isRead flag for the current user
    const formatted = announcements.map((item) => {
      const isRead = Array.isArray(item.readBy) && item.readBy.some(
        (r) => r.user && r.user.toString() === user._id.toString()
      );
      return {
        ...item,
        isRead,
      };
    });

    const unreadCount = formatted.filter((item) => !item.isRead).length;

    return res.status(200).json({
      success: true,
      statusCode: 200,
      announcements: formatted,
      count: formatted.length,
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || 'Unable to load announcements notice board',
    });
  }
};

/**
 * @desc    Get single announcement details with audience check and auto-read tracking
 * @route   GET /api/announcements/:id
 * @access  Private (Authenticated users - audience enforced)
 */
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid announcement ID format',
      });
    }

    const announcement = await Announcement.findById(id)
      .populate('publishedBy', 'name email role avatar')
      .populate('department', 'name');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Announcement not found',
      });
    }

    const user = req.user;
    const now = new Date();
    const isExpired = announcement.expiryDate && new Date(announcement.expiryDate) < now;

    // Audience Authorization & Status Enforcement for non-admins
    if (user.role !== 'admin') {
      // 1. Status Check: Draft or Archived announcements are blocked for non-admins
      if (announcement.status !== 'Published') {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'You are not authorized to view this announcement',
        });
      }

      // 2. Publish Date Check: Cannot view future scheduled announcements
      if (announcement.publishDate && new Date(announcement.publishDate) > now) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'This announcement has not been published yet',
        });
      }

      // 3. Expiry Check: Cannot view expired announcements
      if (isExpired) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'This announcement has expired and is no longer accessible',
        });
      }

      // 4. Role & Audience Check
      let isAuthorized = false;

      if (announcement.audience === 'All') {
        isAuthorized = true;
      } else if (announcement.audience === 'Employees' && user.role === 'employee') {
        isAuthorized = true;
      } else if (announcement.audience === 'Managers' && user.role === 'manager') {
        isAuthorized = true;
      } else if (announcement.audience === 'Department') {
        const { deptId: userDeptId } = await resolveUserDepartment(user);
        if (
          userDeptId &&
          announcement.department &&
          ((announcement.department._id && announcement.department._id.equals(userDeptId)) ||
            (announcement.department.equals && announcement.department.equals(userDeptId)))
        ) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'You are not authorized to view this announcement',
        });
      }
    }

    // Auto-mark announcement as Read for the current user
    const alreadyRead = announcement.readBy.some(
      (r) => r.user && r.user.toString() === user._id.toString()
    );

    if (!alreadyRead) {
      announcement.readBy.push({ user: user._id, readAt: new Date() });
      await announcement.save();

      // Also mark corresponding notification as read if exists
      try {
        await Notification.updateMany(
          { recipient: user._id, type: 'announcement', relatedId: announcement._id, isRead: false },
          { $set: { isRead: true } }
        );
      } catch (notifErr) {
        console.warn('[AnnouncementController] Failed to mark notification read:', notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      announcement,
      isExpired,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || 'Failed to retrieve announcement details',
    });
  }
};

/**
 * @desc    Update announcement
 * @route   PUT /api/announcements/:id
 * @access  Private (Admin only)
 */
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid announcement ID format',
      });
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Announcement not found',
      });
    }

    const {
      title,
      content,
      category,
      priority,
      audience,
      department,
      publishDate,
      expiryDate,
      status,
      attachments,
    } = req.body;

    const previousStatus = announcement.status;

    if (title !== undefined) announcement.title = title.trim();
    if (content !== undefined) announcement.content = content.trim();

    if (category !== undefined) {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `${category} is not a valid category`,
        });
      }
      announcement.category = category;
    }

    if (priority !== undefined) {
      if (!ALLOWED_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `${priority} is not a valid priority (Normal, Important, Urgent)`,
        });
      }
      announcement.priority = priority;
    }

    if (audience !== undefined) {
      if (!ALLOWED_AUDIENCES.includes(audience)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `${audience} is not a valid audience (All, Employees, Managers, Department)`,
        });
      }
      announcement.audience = audience;
      if (audience === 'Department') {
        if (!department) {
          return res.status(400).json({
            success: false,
            statusCode: 400,
            message: 'Department is required for department-specific announcements',
          });
        }
        const deptExists = await Department.findById(department);
        if (!deptExists) {
          return res.status(404).json({
            success: false,
            statusCode: 404,
            message: 'Specified department does not exist',
          });
        }
        announcement.department = deptExists._id;
      } else {
        announcement.department = null;
      }
    } else if (department !== undefined) {
      announcement.department = department || null;
    }

    if (publishDate !== undefined) {
      const pub = new Date(publishDate);
      if (isNaN(pub.getTime())) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Invalid publish date format',
        });
      }
      announcement.publishDate = pub;
    }

    if (expiryDate !== undefined) {
      if (expiryDate) {
        const exp = new Date(expiryDate);
        if (isNaN(exp.getTime())) {
          return res.status(400).json({
            success: false,
            statusCode: 400,
            message: 'Invalid expiry date format',
          });
        }
        if (exp < announcement.publishDate) {
          return res.status(400).json({
            success: false,
            statusCode: 400,
            message: 'Expiry date cannot be before publish date',
          });
        }
        announcement.expiryDate = exp;
      } else {
        announcement.expiryDate = null;
      }
    }

    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `${status} is not a valid status (Draft, Published, Archived)`,
        });
      }
      announcement.status = status;
    }

    if (attachments !== undefined && Array.isArray(attachments)) announcement.attachments = attachments;

    await announcement.save();

    // If transitioned from Draft to Published, notify audience
    if (previousStatus === 'Draft' && announcement.status === 'Published') {
      await dispatchAnnouncementNotifications(announcement);
    }

    // Audit Log
    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: 'UPDATE',
      module: 'ANNOUNCEMENT',
      targetId: announcement._id,
      targetType: 'Announcement',
      description: `Updated announcement "${announcement.title}" (${announcement.status})`,
      metadata: {
        category: announcement.category,
        priority: announcement.priority,
        audience: announcement.audience,
        status: announcement.status,
      },
      req,
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('publishedBy', 'name email role avatar')
      .populate('department', 'name');

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Announcement updated successfully',
      announcement: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || 'Failed to update announcement',
    });
  }
};

/**
 * @desc    Archive announcement
 * @route   PATCH /api/announcements/:id/archive
 * @access  Private (Admin only)
 */
export const archiveAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid announcement ID format',
      });
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Announcement not found',
      });
    }

    announcement.status = 'Archived';
    await announcement.save();

    // Audit Log
    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: 'UPDATE',
      module: 'ANNOUNCEMENT',
      targetId: announcement._id,
      targetType: 'Announcement',
      description: `Archived announcement "${announcement.title}"`,
      metadata: { status: 'Archived' },
      req,
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Announcement archived successfully',
      announcement,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || 'Failed to archive announcement',
    });
  }
};

/**
 * @desc    Delete announcement
 * @route   DELETE /api/announcements/:id
 * @access  Private (Admin only)
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid announcement ID format',
      });
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Announcement not found',
      });
    }

    // Clean up corresponding notifications
    try {
      await Notification.deleteMany({ type: 'announcement', relatedId: announcement._id });
    } catch (notifErr) {
      console.warn('[AnnouncementController] Failed to clean up notifications:', notifErr.message);
    }

    // Audit Log
    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: 'DELETE',
      module: 'ANNOUNCEMENT',
      targetId: announcement._id,
      targetType: 'Announcement',
      description: `Deleted announcement "${announcement.title}"`,
      req,
    });

    await announcement.deleteOne();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Announcement deleted successfully',
      id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || 'Failed to delete announcement',
    });
  }
};

/**
 * @desc    Upload attachment for an announcement (supports multipart FormData and base64 JSON)
 * @route   POST /api/announcements/upload
 * @access  Private (Admin only)
 */
export const uploadAttachment = async (req, res) => {
  try {
    let filesToProcess = [];

    // Case 1: Multer multipart files
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      filesToProcess = req.files.map((f) => ({
        originalname: f.originalname,
        buffer: f.buffer,
        mimetype: f.mimetype,
        size: f.size,
      }));
    } else if (req.file) {
      filesToProcess = [
        {
          originalname: req.file.originalname,
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
      ];
    }
    // Case 2: Base64 JSON payload
    else if (req.body && req.body.fileData) {
      const { fileName, fileData, fileType } = req.body;
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      filesToProcess = [
        {
          originalname: fileName || 'attachment',
          buffer,
          mimetype: fileType || 'application/octet-stream',
          size: buffer.length,
        },
      ];
    } else if (req.body && Array.isArray(req.body.files) && req.body.files.length > 0) {
      filesToProcess = req.body.files.map((f) => {
        const base64Data = (f.fileData || '').replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        return {
          originalname: f.fileName || 'attachment',
          buffer,
          mimetype: f.fileType || 'application/octet-stream',
          size: buffer.length,
        };
      });
    }

    if (filesToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'No files provided',
      });
    }

    const uploadedFiles = [];

    for (const file of filesToProcess) {
      let uploadedToCloud = false;

      // Try Cloudinary first if configured
      if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_CLOUD_NAME) {
        try {
          const cloudinaryService = (await import('../services/cloudinaryService.js')).default;
          const uploadResult = await cloudinaryService.uploadBuffer(
            file.buffer,
            'staffpulse/announcements',
            'raw'
          );

          uploadedFiles.push({
            fileName: file.originalname,
            fileUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            fileType: file.mimetype,
            fileSize: file.size,
          });
          uploadedToCloud = true;
        } catch (cloudErr) {
          console.warn('[AnnouncementController] Cloudinary upload failed, using local storage fallback:', cloudErr.message);
        }
      }

      // Safe local disk storage fallback
      if (!uploadedToCloud) {
        const safeName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const targetPath = path.join(ANNOUNCEMENT_UPLOADS_DIR, safeName);
        fs.writeFileSync(targetPath, file.buffer);

        uploadedFiles.push({
          fileName: file.originalname,
          fileUrl: `/uploads/announcements/${safeName}`,
          publicId: safeName,
          fileType: file.mimetype,
          fileSize: file.size,
        });
      }
    }

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Attachment uploaded successfully',
      files: uploadedFiles,
      file: uploadedFiles[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || 'Error occurred while uploading attachment',
    });
  }
};

/**
 * @desc    Get announcement statistics (KPIs)
 * @route   GET /api/announcements/stats
 * @access  Private (Admin, Manager)
 */
export const getAnnouncementStats = async (req, res) => {
  try {
    const total = await Announcement.countDocuments();
    const active = await Announcement.countDocuments({ status: 'Published' });
    const urgent = await Announcement.countDocuments({ priority: 'Urgent', status: 'Published' });
    const drafts = await Announcement.countDocuments({ status: 'Draft' });
    const archived = await Announcement.countDocuments({ status: 'Archived' });

    return res.status(200).json({
      success: true,
      stats: {
        total,
        active,
        urgent,
        drafts,
        archived,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement stats',
      error: error.message,
    });
  }
};

export default {
  createAnnouncement,
  getAnnouncements,
  getMyAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  archiveAnnouncement,
  deleteAnnouncement,
  uploadAttachment,
  getAnnouncementStats,
  resolveUserDepartment,
};
