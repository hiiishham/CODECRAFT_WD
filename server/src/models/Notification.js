import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Recipient user reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: [
          'account',
          'employee',
          'leave',
          'salary',
          'system',
          'task',
          'performance',
          'goal',
          'goals',
          'document',
          'announcement',
          'submission',
          'attendance',
        ],
        message: '{VALUE} is not a valid notification type',
      },
      index: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    relatedType: {
      type: String,
      default: null,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field 'read' mapping to 'isRead' for specification compliance
notificationSchema.virtual('read')
  .get(function () {
    return this.isRead;
  })
  .set(function (value) {
    this.isRead = Boolean(value);
  });

// Compound indexes for high-performance feed filtering and unread count queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
