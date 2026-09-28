import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      default: '',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileType: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const readRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Announcement content is required'],
      trim: true,
      minlength: [5, 'Content must be at least 5 characters long'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['General', 'HR', 'Holiday', 'Event', 'Meeting', 'Policy', 'Urgent', 'Other'],
        message: '{VALUE} is not a valid category',
      },
      default: 'General',
      index: true,
    },
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: {
        values: ['Normal', 'Important', 'Urgent'],
        message: '{VALUE} is not a valid priority (Normal, Important, Urgent)',
      },
      default: 'Normal',
      index: true,
    },
    audience: {
      type: String,
      required: [true, 'Audience is required'],
      enum: {
        values: ['All', 'Employees', 'Managers', 'Department'],
        message: '{VALUE} is not a valid audience (All, Employees, Managers, Department)',
      },
      default: 'All',
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Publisher reference is required'],
      index: true,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['Draft', 'Published', 'Archived'],
        message: '{VALUE} is not a valid status (Draft, Published, Archived)',
      },
      default: 'Published',
      index: true,
    },
    publishDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    readBy: {
      type: [readRecordSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal queries and audience lookups
announcementSchema.index({ status: 1, publishDate: -1 });
announcementSchema.index({ status: 1, expiryDate: 1 });
announcementSchema.index({ audience: 1, department: 1, status: 1 });
announcementSchema.index({ createdAt: -1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement;
