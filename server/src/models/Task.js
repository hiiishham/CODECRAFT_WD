import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [150, 'Task title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Task description is required'],
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Assigned employee reference is required'],
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Assigned by administrator reference is required'],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
      index: true,
    },
    priority: {
      type: String,
      required: [true, 'Task priority is required'],
      enum: {
        values: ['Low', 'Medium', 'High', 'Urgent'],
        message: '{VALUE} is not a valid priority (Low, Medium, High, Urgent)',
      },
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      required: [true, 'Task status is required'],
      enum: {
        values: ['Assigned', 'In Progress', 'Completed', 'Cancelled'],
        message: '{VALUE} is not a valid status (Assigned, In Progress, Completed, Cancelled)',
      },
      default: 'Assigned',
      index: true,
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
      required: [true, 'Progress is required'],
      min: [0, 'Progress cannot be less than 0'],
      max: [100, 'Progress cannot exceed 100'],
      default: 0,
    },
    estimatedHours: {
      type: Number,
      min: [0, 'Estimated hours cannot be negative'],
      default: 0,
    },
    attachments: {
      type: [String],
      default: [],
    },
    employeeComment: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field: isOverdue (true if dueDate is passed and status is not Completed)
taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  return new Date(this.dueDate) < new Date() && this.status !== 'Completed';
});

// Compound indexes for optimal performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ department: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;
