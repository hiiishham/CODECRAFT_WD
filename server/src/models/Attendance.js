import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
      index: true,
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in timestamp is required'],
    },
    checkOut: {
      type: Date,
      default: null,
    },
    totalHours: {
      type: Number,
      default: 0,
      min: [0, 'Total hours cannot be negative'],
    },
    status: {
      type: String,
      required: [true, 'Attendance status is required'],
      enum: {
        values: ['Present', 'Late', 'Half Day', 'Absent', 'On Leave'],
        message: '{VALUE} is not a valid attendance status',
      },
      default: 'Present',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to guarantee one attendance record per employee per calendar working day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ employee: 1, createdAt: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
