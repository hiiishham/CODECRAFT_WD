import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Document from '../models/Document.js';
import Employee from '../models/Employee.js';
import Admin from '../models/Admin.js';
import { resolveEmployeeForUser } from '../utils/employeeResolver.js';
import { createNotification } from '../utils/notificationService.js';
import { createAuditLog } from '../utils/auditService.js';
import { escapeRegex } from '../utils/escapeRegex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local storage directory fallback
const DOCUMENTS_DIR = path.resolve(__dirname, '../../uploads/documents');
if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
];

// Allowed extensions
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.doc',
  '.docx',
  '.zip',
];

// Dangerous extensions
const DANGEROUS_EXTENSIONS = [
  '.exe',
  '.sh',
  '.bat',
  '.cmd',
  '.js',
  '.vbs',
  '.php',
  '.py',
  '.jar',
  '.msi',
  '.scr',
  '.pif',
  '.com',
  '.bin',
  '.cgi',
  '.pl',
];

// Document Types Enum
const DOCUMENT_TYPES = [
  'Offer Letter',
  'Employment Contract',
  'Salary Slip',
  'Experience Letter',
  'ID Proof',
  'Certificate',
  'Resume',
  'Other',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate file content against magic bytes to prevent spoofing
 */
function validateMagicBytes(buffer, ext) {
  if (!buffer || buffer.length === 0) return false;

  if (ext === '.pdf') {
    // PDF starts with %PDF- (0x25 0x50 0x44 0x46)
    const header = buffer.subarray(0, 5).toString('ascii');
    return header.startsWith('%PDF-');
  }

  if (ext === '.png') {
    // PNG starts with 0x89 0x50 0x4E 0x47
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    // JPEG starts with 0xFF 0xD8 0xFF
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // Other types (doc, docx, zip) pass generic check
  return true;
}

/**
 * Save file buffer either to Cloudinary (if configured) or local disk
 */
async function saveFileBuffer(buffer, originalName, mimeType) {
  const ext = path.extname(originalName || '').toLowerCase() || '.pdf';
  const hasCloudinary =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (hasCloudinary) {
    try {
      const cloudinaryService = (await import('../services/cloudinaryService.js')).default;
      const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';
      const result = await cloudinaryService.uploadBuffer(buffer, 'staffpulse/documents', resourceType);
      return {
        secureUrl: result.secure_url,
        fileUrl: result.secure_url,
        publicId: result.public_id,
        filePath: '',
        storageProvider: 'cloudinary',
      };
    } catch (err) {
      console.warn('[DocumentController] Cloudinary upload failed, falling back to local disk:', err.message);
    }
  }

  // Local storage fallback
  const uniqueName = `doc-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const safeStoragePath = path.resolve(DOCUMENTS_DIR, uniqueName);

  if (!safeStoragePath.startsWith(DOCUMENTS_DIR)) {
    throw new Error('Path traversal detected');
  }

  fs.writeFileSync(safeStoragePath, buffer);

  return {
    secureUrl: `/uploads/documents/${uniqueName}`,
    fileUrl: `/uploads/documents/${uniqueName}`,
    publicId: uniqueName,
    filePath: safeStoragePath,
    storageProvider: 'local',
  };
}

/**
 * Remove physical file from storage
 */
async function removeStorageFile(document) {
  if (!document) return;

  // Local file cleanup
  if (document.filePath && fs.existsSync(document.filePath)) {
    try {
      fs.unlinkSync(document.filePath);
    } catch (e) {
      console.warn('[DocumentController] Failed to remove local file:', e.message);
    }
  }

  // Cloudinary cleanup
  if (document.storageProvider === 'cloudinary' && document.publicId) {
    try {
      const cloudinaryService = (await import('../services/cloudinaryService.js')).default;
      const resourceType = document.mimeType?.startsWith('image/') ? 'image' : 'raw';
      await cloudinaryService.deleteFile(document.publicId, resourceType);
    } catch (e) {
      console.warn('[DocumentController] Failed to remove Cloudinary file:', e.message);
    }
  }
}

/**
 * Parse and validate incoming file from either req.file or req.body.fileData (base64)
 */
function extractAndValidateFile(req) {
  let fileBuffer = null;
  let originalName = '';
  let mimeType = '';
  let fileSize = 0;

  if (req.file) {
    fileBuffer = req.file.buffer;
    originalName = req.file.originalname || 'document.pdf';
    mimeType = req.file.mimetype || 'application/octet-stream';
    fileSize = req.file.size;
  } else if (req.body.fileData) {
    const rawData = req.body.fileData;
    originalName = req.body.fileName || 'document.pdf';
    mimeType = req.body.mimeType || 'application/pdf';

    if (rawData.startsWith('data:')) {
      const matches = rawData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1] || mimeType;
        fileBuffer = Buffer.from(matches[2], 'base64');
      } else {
        const base64Index = rawData.indexOf(';base64,');
        if (base64Index !== -1) {
          mimeType = rawData.substring(5, base64Index);
          fileBuffer = Buffer.from(rawData.substring(base64Index + 8), 'base64');
        } else {
          fileBuffer = Buffer.from(rawData, 'base64');
        }
      }
    } else {
      fileBuffer = Buffer.from(rawData, 'base64');
    }
    fileSize = fileBuffer.length;
  }

  if (!fileBuffer || fileSize === 0) {
    const error = new Error('No file provided or file is empty (0 bytes)');
    error.statusCode = 400;
    throw error;
  }

  const ext = path.extname(originalName).toLowerCase();

  // 1. Dangerous extension check
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    const error = new Error('Dangerous file extension detected. Executable and script files are strictly prohibited.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Allowed extension check
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const error = new Error('Unsupported file extension. Allowed formats: PDF, PNG, JPG, JPEG, DOC, DOCX, ZIP, WEBP.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Allowed MIME type check
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    const error = new Error('Unsupported file MIME type. Allowed formats: PDF, PNG, JPG, JPEG, DOC, DOCX, ZIP, WEBP.');
    error.statusCode = 400;
    throw error;
  }

  // 4. File size check
  if (fileSize > MAX_FILE_SIZE) {
    const error = new Error(`File size exceeds maximum allowed limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
    error.statusCode = 400;
    throw error;
  }

  // 5. Magic bytes verification
  if (!validateMagicBytes(fileBuffer, ext)) {
    const error = new Error('File content signature verification failed. Spoofed file types are not permitted.');
    error.statusCode = 400;
    throw error;
  }

  return { fileBuffer, originalName, mimeType, fileSize, ext };
}

/**
 * @desc    Upload new document for an employee (Admin or Employee self-upload)
 * @route   POST /api/documents
 * @access  Private (Admin, Employee)
 */
export const uploadDocument = async (req, res, next) => {
  try {
    const { employee, title, documentType, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Document title is required' });
    }

    if (!documentType || !DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid document type. Allowed types: ${DOCUMENT_TYPES.join(', ')}`,
      });
    }

    // Role-based target employee binding & IDOR protection
    let targetEmployeeId = null;
    let targetEmployee = null;

    const COMPANY_ISSUED_TYPES = ['Offer Letter', 'Employment Contract', 'Salary Slip', 'Experience Letter'];

    if (req.user.role === 'employee') {
      // Employees cannot forge or upload official company-issued records
      if (COMPANY_ISSUED_TYPES.includes(documentType)) {
        return res.status(403).json({
          success: false,
          message: `Access denied: Employees cannot issue official company documents (${documentType}).`,
        });
      }

      const resolvedEmp = await resolveEmployeeForUser(req.user);
      if (!resolvedEmp) {
        return res.status(404).json({ success: false, message: 'Employee profile not found' });
      }
      targetEmployee = resolvedEmp;
      targetEmployeeId = resolvedEmp._id;

      // If body specified an employee ID, verify it matches self
      if (employee && !resolvedEmp._id.equals(employee)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Employees can only upload documents for their own profile.',
        });
      }
    } else {
      // Admin / Manager uploading for an employee
      if (!employee) {
        return res.status(400).json({ success: false, message: 'Employee reference is required' });
      }

      if (!mongoose.Types.ObjectId.isValid(employee)) {
        return res.status(400).json({ success: false, message: 'Invalid employee ID format' });
      }

      targetEmployee = await Employee.findById(employee);
      if (!targetEmployee) {
        return res.status(404).json({ success: false, message: 'Target employee not found' });
      }
      targetEmployeeId = targetEmployee._id;
    }

    // Extract & validate file
    let fileDetails;
    try {
      fileDetails = extractAndValidateFile(req);
    } catch (valErr) {
      return res.status(valErr.statusCode || 400).json({ success: false, message: valErr.message });
    }

    const { fileBuffer, originalName, mimeType, fileSize } = fileDetails;

    // Sanitize original file name
    const sanitizedFileName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');

    // Save file buffer
    const storageInfo = await saveFileBuffer(fileBuffer, sanitizedFileName, mimeType);

    const newDoc = new Document({
      employee: targetEmployeeId,
      title: title.trim(),
      documentType,
      fileName: sanitizedFileName,
      originalFileName: sanitizedFileName,
      filePath: storageInfo.filePath,
      fileUrl: storageInfo.fileUrl,
      secureUrl: storageInfo.secureUrl,
      publicId: storageInfo.publicId,
      storageProvider: storageInfo.storageProvider,
      fileSize,
      mimeType,
      uploadedBy: req.user._id,
      description: description ? description.trim() : '',
      status: 'Active',
    });

    await newDoc.save();

    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: 'UPLOAD',
      module: 'DOCUMENT',
      targetId: newDoc._id,
      targetType: 'Document',
      description: `Uploaded document: ${title.trim()} (${sanitizedFileName})`,
      req,
    });

    // Notify target employee if uploaded by someone else
    if (req.user.role !== 'employee' && targetEmployee.email) {
      const userAccount = await Admin.findOne({ email: targetEmployee.email.toLowerCase() });
      if (userAccount) {
        await createNotification({
          recipient: userAccount._id,
          title: 'New Document Available',
          message: `A new document (${title.trim()}) has been uploaded to your profile.`,
          type: 'document',
          relatedId: newDoc._id,
          relatedType: 'Document',
        });
      }
    }

    const populatedDoc = await Document.findById(newDoc._id)
      .populate('employee', 'fullName employeeId email department designation profileImage')
      .populate('uploadedBy', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document: populatedDoc,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all documents with search, filters & summary statistics
 * @route   GET /api/documents
 * @access  Private (Admin, Manager)
 */
export const getDocuments = async (req, res, next) => {
  try {
    const { search, employee, department, documentType, page = 1, limit = 50 } = req.query;
    const filter = { status: 'Active' };

    if (employee && employee !== 'All' && employee !== 'all') {
      if (mongoose.Types.ObjectId.isValid(employee)) {
        filter.employee = employee;
      }
    }

    // Filter by department through Employee model
    if (department && department !== 'All' && department !== 'all') {
      const empIds = await Employee.find({ department: department.trim() }).distinct('_id');
      filter.employee = { $in: empIds };
    }

    if (documentType && documentType !== 'All' && documentType !== 'all') {
      filter.documentType = documentType;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      const matchingEmployees = await Employee.find({
        $or: [{ fullName: searchRegex }, { employeeId: searchRegex }],
      }).distinct('_id');

      filter.$or = [
        { title: searchRegex },
        { fileName: searchRegex },
        { employee: { $in: matchingEmployees } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const skip = (pageNum - 1) * limitNum;

    // Calculate summary statistics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [documents, totalDocuments, distinctEmployees, recentlyUploaded] = await Promise.all([
      Document.find(filter)
        .populate('employee', 'fullName employeeId email department designation profileImage')
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Document.countDocuments(filter),
      Document.distinct('employee', { status: 'Active' }),
      Document.countDocuments({ status: 'Active', createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    return res.status(200).json({
      success: true,
      documents,
      totalDocuments,
      totalPages: Math.ceil(totalDocuments / limitNum) || 1,
      currentPage: pageNum,
      stats: {
        totalDocuments: await Document.countDocuments({ status: 'Active' }),
        employeesWithDocuments: distinctEmployees.length,
        recentlyUploaded,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get authenticated employee's documents
 * @route   GET /api/documents/my
 * @access  Private (Employee)
 */
export const getMyDocuments = async (req, res, next) => {
  try {
    const employee = await resolveEmployeeForUser(req.user);
    if (!employee) {
      return res.status(200).json({ success: true, documents: [] });
    }

    const { search, documentType } = req.query;
    const filter = { employee: employee._id, status: 'Active' };

    if (documentType && documentType !== 'All' && documentType !== 'all') {
      filter.documentType = documentType;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ title: searchRegex }, { fileName: searchRegex }, { description: searchRegex }];
    }

    const documents = await Document.find(filter)
      .populate('employee', 'fullName employeeId email department designation profileImage')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single document details
 * @route   GET /api/documents/:id
 * @access  Private (Authenticated users - ownership enforced for employees)
 */
export const getDocumentById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid document ID format' });
    }

    const document = await Document.findById(req.params.id)
      .populate('employee', 'fullName employeeId email department designation profileImage')
      .populate('uploadedBy', 'name email');

    if (!document || document.status === 'Deleted') {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (req.user.role === 'employee') {
      const employee = await resolveEmployeeForUser(req.user);
      if (!employee || !document.employee._id.equals(employee._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to view this document.',
        });
      }
    }

    return res.status(200).json({ success: true, document });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update document metadata or replace document file
 * @route   PUT /api/documents/:id
 * @access  Private (Admin, Employee if owner)
 */
export const updateDocument = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid document ID format' });
    }

    const document = await Document.findById(req.params.id);
    if (!document || document.status === 'Deleted') {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Role check & ownership enforcement
    if (req.user.role === 'employee') {
      const employee = await resolveEmployeeForUser(req.user);
      if (!employee || !document.employee.equals(employee._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only replace or update your own documents.',
        });
      }

      const COMPANY_ISSUED_TYPES = ['Offer Letter', 'Employment Contract', 'Salary Slip', 'Experience Letter'];
      if (COMPANY_ISSUED_TYPES.includes(document.documentType) || !document.uploadedBy.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Employees cannot modify or replace company-issued documents.',
        });
      }
    }

    // If replacement file provided, process & validate
    const hasNewFile = !!(req.file || req.body.fileData);
    if (hasNewFile) {
      let fileDetails;
      try {
        fileDetails = extractAndValidateFile(req);
      } catch (valErr) {
        return res.status(valErr.statusCode || 400).json({ success: false, message: valErr.message });
      }

      const { fileBuffer, originalName, mimeType, fileSize } = fileDetails;
      const sanitizedFileName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');

      // Save new file first to prevent loss if saving fails
      const storageInfo = await saveFileBuffer(fileBuffer, sanitizedFileName, mimeType);

      // Clean up old file
      await removeStorageFile(document);

      document.fileName = sanitizedFileName;
      document.originalFileName = sanitizedFileName;
      document.filePath = storageInfo.filePath;
      document.fileUrl = storageInfo.fileUrl;
      document.secureUrl = storageInfo.secureUrl;
      document.publicId = storageInfo.publicId;
      document.storageProvider = storageInfo.storageProvider;
      document.fileSize = fileSize;
      document.mimeType = mimeType;
    }

    // Update metadata if provided
    if (req.body.title && req.body.title.trim()) {
      document.title = req.body.title.trim();
    }

    if (req.body.documentType) {
      if (!DOCUMENT_TYPES.includes(req.body.documentType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid document type. Allowed types: ${DOCUMENT_TYPES.join(', ')}`,
        });
      }
      document.documentType = req.body.documentType;
    }

    if (req.body.description !== undefined) {
      document.description = req.body.description.trim();
    }

    await document.save();

    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: 'UPDATE',
      module: 'DOCUMENT',
      targetId: document._id,
      targetType: 'Document',
      description: `${hasNewFile ? 'Replaced file and updated' : 'Updated'} document: ${document.title}`,
      req,
    });

    const updated = await Document.findById(req.params.id)
      .populate('employee', 'fullName employeeId email department designation profileImage')
      .populate('uploadedBy', 'name email');

    return res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      document: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete document and associated file from storage
 * @route   DELETE /api/documents/:id
 * @access  Private (Admin, Employee if owner)
 */
export const deleteDocument = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid document ID format' });
    }

    const document = await Document.findById(req.params.id);
    if (!document || document.status === 'Deleted') {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Role check & ownership enforcement
    if (req.user.role === 'employee') {
      const employee = await resolveEmployeeForUser(req.user);
      if (!employee || !document.employee.equals(employee._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only delete your own documents.',
        });
      }

      const COMPANY_ISSUED_TYPES = ['Offer Letter', 'Employment Contract', 'Salary Slip', 'Experience Letter'];
      if (COMPANY_ISSUED_TYPES.includes(document.documentType) || !document.uploadedBy.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Employees cannot delete company-issued documents.',
        });
      }
    }

    // Clean up file from physical / cloud storage
    await removeStorageFile(document);

    // Hard delete or mark Deleted
    await Document.findByIdAndDelete(req.params.id);

    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: 'DELETE',
      module: 'DOCUMENT',
      targetId: document._id,
      targetType: 'Document',
      description: `Deleted document: ${document.title} (${document.fileName})`,
      req,
    });

    return res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Securely download document file (streams attachment)
 * @route   GET /api/documents/:id/download
 * @access  Private (Authenticated users - ownership enforced)
 */
export const downloadDocument = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid document ID format' });
    }

    const document = await Document.findById(req.params.id);
    if (!document || document.status === 'Deleted') {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Ownership Enforcement
    if (req.user.role === 'employee') {
      const employee = await resolveEmployeeForUser(req.user);
      if (!employee || !document.employee.equals(employee._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to download this document.',
        });
      }
    }

    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: 'DOWNLOAD',
      module: 'DOCUMENT',
      targetId: document._id,
      targetType: 'Document',
      description: `Downloaded document: ${document.title}`,
      req,
    });

    // If client requested URL only (e.g. urlOnly query param)
    if (req.query.urlOnly === 'true') {
      return res.status(200).json({ success: true, secureUrl: document.secureUrl });
    }

    const downloadFileName = document.originalFileName || document.fileName || 'document';

    // If local file exists, stream it as attachment download
    if (document.filePath && fs.existsSync(document.filePath)) {
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(downloadFileName)}"`
      );
      return res.sendFile(document.filePath);
    }

    // Remote / Cloudinary URL redirect
    if (document.secureUrl) {
      return res.redirect(document.secureUrl);
    }

    return res.status(404).json({ success: false, message: 'Document file not found in storage' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Securely stream document file for browser preview
 * @route   GET /api/documents/:id/view
 * @access  Private (Authenticated users - ownership enforced)
 */
export const viewDocumentFile = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid document ID format' });
    }

    const document = await Document.findById(req.params.id);
    if (!document || document.status === 'Deleted') {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Ownership Enforcement
    if (req.user.role === 'employee') {
      const employee = await resolveEmployeeForUser(req.user);
      if (!employee || !document.employee.equals(employee._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to view this document.',
        });
      }
    }

    const viewFileName = document.originalFileName || document.fileName || 'document';

    // If local file exists, stream inline
    if (document.filePath && fs.existsSync(document.filePath)) {
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(viewFileName)}"`);
      return res.sendFile(document.filePath);
    }

    // Remote / Cloudinary URL redirect
    if (document.secureUrl) {
      return res.redirect(document.secureUrl);
    }

    return res.status(404).json({ success: false, message: 'Document file not found in storage' });
  } catch (err) {
    next(err);
  }
};

export default {
  uploadDocument,
  getDocuments,
  getMyDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  downloadDocument,
  viewDocumentFile,
};
