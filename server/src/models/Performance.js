import mongoose from 'mongoose';

const performanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
      index: true,
    },
    reviewPeriod: {
      type: String,
      required: [true, 'Review period is required'],
      trim: true,
      maxlength: [100, 'Review period cannot exceed 100 characters'],
    },
    overallRating: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    strengths: {
      type: String,
      trim: true,
      default: '',
    },
    areasForImprovement: {
      type: String,
      trim: true,
      default: '',
    },
    managerFeedback: {
      type: String,
      required: [true, 'Manager feedback is required'],
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Reviewer reference is required'],
    },
    reviewedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['Draft', 'Submitted', 'Reviewed'],
        message: '{VALUE} is not a valid status (Draft, Submitted, Reviewed)',
      },
      default: 'Reviewed',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate reviews for the same employee in the same review period
performanceSchema.index({ employee: 1, reviewPeriod: 1 }, { unique: true });
performanceSchema.index({ employee: 1, reviewedAt: -1 });
performanceSchema.index({ reviewedBy: 1, createdAt: -1 });

const Performance = mongoose.model('Performance', performanceSchema);

export default Performance;
