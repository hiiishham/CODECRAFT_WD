import AuditLog from '../models/AuditLog.js';

/**
 * Reusable Audit Logging Service
 * @param {Object} options
 * @param {Object|String} options.user - The user ID or user document initiating the action
 * @param {String} options.userRole - The role of the user (e.g., 'admin', 'manager', 'employee')
 * @param {String} options.action - Action type: LOGIN, CREATE, UPDATE, DELETE, etc.
 * @param {String} options.module - Module name: AUTH, EMPLOYEE, DEPARTMENT, etc.
 * @param {String} [options.targetId] - ID of the document being affected
 * @param {String} [options.targetType] - Type of the document being affected (e.g., 'Employee')
 * @param {String} options.description - Human readable description of the event
 * @param {Object} [options.metadata] - Additional JSON data (DO NOT include passwords or tokens)
 * @param {Object} [options.req] - Express request object for IP and User Agent extraction
 */
export const createAuditLog = async ({
  user,
  userRole,
  action,
  module,
  targetId = null,
  targetType = null,
  description,
  metadata = {},
  req = null,
}) => {
  try {
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'];
      userAgent = req.headers['user-agent'];
    }

    // Filter out sensitive data from metadata just in case
    const safeMetadata = { ...metadata };
    delete safeMetadata.password;
    delete safeMetadata.newPassword;
    delete safeMetadata.currentPassword;
    delete safeMetadata.confirmPassword;
    delete safeMetadata.token;
    delete safeMetadata.authorization;

    await AuditLog.create({
      user: user?._id || user,
      userRole,
      action,
      module,
      targetId,
      targetType,
      description,
      metadata: safeMetadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // We log the error but don't throw, to prevent audit logging from breaking main business logic
    console.error('Audit Log Error:', error.message);
  }
};
