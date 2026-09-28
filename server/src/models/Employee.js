import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [
        /^[+0-9\s-]{7,20}$/,
        'Please provide a valid phone number',
      ],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation / job title is required'],
      trim: true,
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
      default: Date.now,
    },
    salary: {
      type: Number,
      required: [true, 'Salary is required'],
      min: [0, 'Salary cannot be negative'],
    },
    profileImage: {
      type: String,
      default: '',
      trim: true,
    },
    profileImageId: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['Active', 'Inactive', 'On Leave'],
        message: '{VALUE} is not a valid status (Active, Inactive, On Leave)',
      },
      default: 'Active',
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    managerName: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast searching and sorting
employeeSchema.index({ fullName: 'text', employeeId: 'text', email: 'text' });
employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ manager: 1 });

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
