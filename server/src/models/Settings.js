import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Please provide a company name'],
      trim: true,
      default: 'StaffPulse Inc.',
    },
    companyEmail: {
      type: String,
      required: [true, 'Please provide a company email address'],
      trim: true,
      lowercase: true,
      default: 'contact@staffpulse.com',
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid company email address',
      ],
    },
    companyPhone: {
      type: String,
      trim: true,
      default: '+91 98765 43210',
    },
    companyAddress: {
      type: String,
      trim: true,
      default: '123 Business Park, Tech Zone, Bengaluru, Karnataka, India',
    },
    companyLogo: {
      type: String,
      trim: true,
      default: '',
    },
    currency: {
      type: String,
      trim: true,
      default: 'INR',
      enum: {
        values: ['INR', 'USD', 'EUR', 'GBP'],
        message: '{VALUE} is not a supported currency (INR, USD, EUR, GBP)',
      },
    },
    timezone: {
      type: String,
      trim: true,
      default: 'Asia/Kolkata',
    },
    dateFormat: {
      type: String,
      trim: true,
      default: 'DD/MM/YYYY',
      enum: {
        values: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
        message: '{VALUE} is not a supported date format',
      },
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    // New Fields for Step 30
    companyWebsite: {
      type: String,
      trim: true,
      default: '',
    },
    companyDescription: {
      type: String,
      trim: true,
      default: '',
    },
    companyFavicon: {
      type: String,
      trim: true,
      default: '',
    },
    primaryColor: {
      type: String,
      trim: true,
      default: '#4f46e5', // Indigo-600
    },
    secondaryColor: {
      type: String,
      trim: true,
      default: '#64748b', // Slate-500
    },
    accentColor: {
      type: String,
      trim: true,
      default: '#f59e0b', // Amber-500
    },
    paginationDefault: {
      type: Number,
      enum: [10, 20, 50],
      default: 10,
    },
    dashboardDateRange: {
      type: String,
      enum: ['Today', 'This Week', 'This Month'],
      default: 'This Month',
    },
    sessionTimeout: {
      type: Number,
      default: 120, // minutes
    },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    workingHoursPerDay: {
      type: Number,
      default: 8,
    },
    defaultCheckInTime: {
      type: String,
      default: '09:00',
    },
    defaultCheckOutTime: {
      type: String,
      default: '17:00',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

// Helper static to retrieve or initialize the single settings document
settingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      companyName: 'StaffPulse Inc.',
      companyEmail: 'contact@staffpulse.com',
      companyPhone: '+91 98765 43210',
      companyAddress: '123 Business Park, Tech Zone, Bengaluru, Karnataka, India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      theme: 'system',
      primaryColor: '#4f46e5',
      secondaryColor: '#64748b',
      accentColor: '#f59e0b',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    });
  }
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
