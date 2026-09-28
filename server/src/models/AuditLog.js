import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SUBMIT', 'REVIEW', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'PASSWORD_RESET_REQUEST', 'SETTINGS_UPDATE', 'UPLOAD', 'DOWNLOAD'],
      index: true,
    },
    module: {
      type: String,
      required: true,
      enum: ['AUTH', 'EMPLOYEE', 'DEPARTMENT', 'ATTENDANCE', 'LEAVE', 'TASK', 'SUBMISSION', 'PERFORMANCE', 'GOAL', 'SALARY', 'DOCUMENT', 'ANNOUNCEMENT', 'SETTINGS'],
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetType: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast filtering and pagination
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
