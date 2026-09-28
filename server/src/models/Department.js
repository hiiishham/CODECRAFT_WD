import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Department name must be at least 2 characters long'],
      maxlength: [60, 'Department name cannot exceed 60 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['Active', 'Inactive'],
        message: '{VALUE} is not a valid status (Active, Inactive)',
      },
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast status filtering
departmentSchema.index({ status: 1 });

const Department = mongoose.model('Department', departmentSchema);

export default Department;
