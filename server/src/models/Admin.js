import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Ensures password hash is never included in query results by default
    },
    role: {
      type: String,
      default: 'admin',
      enum: {
        values: ['admin', 'manager', 'employee'],
        message: '{VALUE} is not a valid role (admin, manager, employee)',
      },
    },
    avatar: {
      type: String,
      default: '',
      trim: true,
    },
    department: {
      type: String,
      default: 'Engineering',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Inactive'],
        message: '{VALUE} is not a valid status (Active, Inactive)',
      },
      default: 'Active',
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    passwordChangedAt: {
      type: Date,
    },
    resetPasswordOtp: {
      type: String,
      select: false,
    },
    resetPasswordOtpExpires: {
      type: Date,
      select: false,
    },
    resetPasswordAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    resetPasswordCooldown: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password securely with bcrypt
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  // Update passwordChangedAt timestamp if password is modified
  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }

  // Prevent double-hashing if password is already a valid bcrypt hash
  if (this.password && (this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$'))) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare password during authentication
adminSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Safe JSON serialization omitting password and sensitive internal fields
adminSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    _id: this._id,
    name: this.name,
    username: this.username || '',
    email: this.email,
    role: this.role,
    avatar: this.avatar || '',
    department: this.department || '',
    status: this.status || 'Active',
    mustChangePassword: !!this.mustChangePassword,
    passwordChangedAt: this.passwordChangedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
