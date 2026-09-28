import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    leaveType: {
      type: String,
      required: [true, 'Leave type is required'],
      enum: {
        values: [
          'Casual Leave',
          'Sick Leave',
          'Annual Leave',
          'Emergency Leave',
          'Other',
          'Casual',
          'Sick',
          'Annual',
          'Emergency',
        ],
        message: '{VALUE} is not a valid leave type',
      },
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    duration: {
      type: Number,
      min: [1, 'Leave duration must be at least 1 day'],
    },
    reason: {
      type: String,
      required: [true, 'Reason for leave is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
        message: '{VALUE} is not a valid status (Pending, Approved, Rejected, Cancelled)',
      },
      default: 'Pending',
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
    reviewComment: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook: compute calendar day duration (inclusive)
leaveSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0));
    this.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  next();
});

// Virtual field for calculated duration in days (inclusive fallback)
leaveSchema.virtual('calculatedDuration').get(function () {
  if (!this.startDate || !this.endDate) return 1;
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const diffTime = Math.abs(end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
});

// Indexes for fast querying, filtering, and conflict detection
leaveSchema.index({ employee: 1, status: 1, startDate: 1 });
leaveSchema.index({ employee: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ status: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ createdAt: -1 });

const Leave = mongoose.model('Leave', leaveSchema);

export default Leave;
