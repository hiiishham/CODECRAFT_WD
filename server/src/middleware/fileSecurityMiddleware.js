import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Document from '../models/Document.js';
import WorkSubmission from '../models/WorkSubmission.js';
import { resolveEmployeeForUser } from '../utils/employeeResolver.js';
import { escapeRegex } from '../utils/escapeRegex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCUMENTS_DIR = path.resolve(__dirname, '../../uploads/documents');
const SUBMISSIONS_DIR = path.resolve(__dirname, '../../uploads/submissions');

/**
 * Middleware to secure direct file URL access to /uploads/documents/:filename
 */
export const secureDocumentDownload = async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!filename || filename.includes('..') || path.basename(filename) !== filename) {
      return res.status(400).json({ success: false, message: 'Invalid or malformed filename' });
    }

    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.query.token;

    if (!token || token.trim() === '' || token === 'null' || token === 'undefined') {
      return res.status(401).json({ success: false, message: 'Authentication required to access documents' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
    }

    const user = await Admin.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found' });
    }

    const filePath = path.resolve(DOCUMENTS_DIR, filename);

    // Locate document record to check ownership & department
    const doc = await Document.findOne({
      $or: [
        { publicId: filename },
        { fileName: filename },
        { filePath: filePath },
        { fileUrl: new RegExp(escapeRegex(filename) + '$') }
      ]
    }).populate('employee', 'department');

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document record not found' });
    }

    // Role-based access control
    if (user.role === 'employee') {
      const emp = await resolveEmployeeForUser(user);
      if (!emp || doc.employee?._id?.toString() !== emp._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to view another employee document' });
      }
    } else if (user.role === 'manager') {
      const managerDept = user.department || 'Development';
      if (!doc.employee?.department || doc.employee.department.toLowerCase() !== managerDept.toLowerCase()) {
        return res.status(403).json({ success: false, message: 'Forbidden: Document belongs to an employee outside your department' });
      }
    } else if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Now verify file on disk
    if (!filePath.startsWith(DOCUMENTS_DIR) || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Document file not found on server' });
    }

    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to secure direct file URL access to /uploads/submissions/:filename
 */
export const secureSubmissionDownload = async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!filename || filename.includes('..') || path.basename(filename) !== filename) {
      return res.status(400).json({ success: false, message: 'Invalid or malformed filename' });
    }

    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.query.token;

    if (!token || token.trim() === '' || token === 'null' || token === 'undefined') {
      return res.status(401).json({ success: false, message: 'Authentication required to access submission files' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
    }

    const user = await Admin.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found' });
    }

    const filePath = path.resolve(SUBMISSIONS_DIR, filename);

    // Locate submission record
    const sub = await WorkSubmission.findOne({
      $or: [
        { 'attachments.publicId': filename },
        { 'attachments.fileUrl': new RegExp(escapeRegex(filename) + '$') }
      ]
    }).populate('employee', 'department');

    if (!sub) {
      return res.status(404).json({ success: false, message: 'Submission record not found' });
    }

    if (user.role === 'employee') {
      const emp = await resolveEmployeeForUser(user);
      if (!emp || sub.employee?._id?.toString() !== emp._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to view another employee submission' });
      }
    } else if (user.role === 'manager') {
      const managerDept = user.department || 'Development';
      if (!sub.employee?.department || sub.employee.department.toLowerCase() !== managerDept.toLowerCase()) {
        return res.status(403).json({ success: false, message: 'Forbidden: Submission belongs to an employee outside your department' });
      }
    } else if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!filePath.startsWith(SUBMISSIONS_DIR) || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Submission attachment file not found on server' });
    }

    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};
