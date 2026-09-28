import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [200, 'Goal title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Goal description is required'],
      trim: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Assigned by reference is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    progress: {
      type: Number,
      min: [0, 'Progress cannot be less than 0'],
      max: [100, 'Progress cannot exceed 100'],
      default: 0,
    },
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: {
        values: ['Low', 'Medium', 'High'],
        message: '{VALUE} is not a valid priority (Low, Medium, High)',
      },
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['Not Started', 'In Progress', 'Completed', 'Overdue'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Not Started',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: isOverdue — calculated at read time, no DB mutation
goalSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  return new Date(this.dueDate) < new Date() && this.progress < 100;
});

// Validation: dueDate must be >= startDate
goalSchema.pre('validate', function (next) {
  if (this.startDate && this.dueDate && this.dueDate < this.startDate) {
    this.invalidate('dueDate', 'Due date cannot be before start date');
  }
  next();
});

// Compound indexes for efficient queries
goalSchema.index({ employee: 1, status: 1 });
goalSchema.index({ employee: 1, priority: 1 });
goalSchema.index({ dueDate: 1, status: 1 });

const Goal = mongoose.model('Goal', goalSchema);

export default Goal;
