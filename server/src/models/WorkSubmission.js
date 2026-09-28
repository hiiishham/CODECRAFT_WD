import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    publicId: { type: String, default: '' },
    fileType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
  },
  { _id: false }
);

const workSubmissionSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task reference is required'],
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Work description is required'],
      trim: true,
    },
    githubUrl: {
      type: String,
      trim: true,
      default: '',
    },
    liveUrl: {
      type: String,
      trim: true,
      default: '',
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    employeeComment: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      required: [true, 'Submission status is required'],
      enum: {
        values: ['Pending Review', 'Approved', 'Changes Requested'],
        message: '{VALUE} is not a valid submission status',
      },
      default: 'Pending Review',
      index: true,
    },
    reviewComment: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal performance
workSubmissionSchema.index({ task: 1, employee: 1 });
workSubmissionSchema.index({ employee: 1, status: 1 });
workSubmissionSchema.index({ status: 1, submittedAt: -1 });

const WorkSubmission = mongoose.model('WorkSubmission', workSubmissionSchema);

export default WorkSubmission;
