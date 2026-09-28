import mongoose from 'mongoose';

/**
 * Sub-schema for itemized allowances
 */
const allowanceItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Allowance name is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Allowance amount is required'],
      min: [0, 'Allowance amount cannot be negative'],
    },
  },
  { _id: false }
);

/**
 * Sub-schema for itemized deductions
 */
const deductionItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Deduction name is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Deduction amount is required'],
      min: [0, 'Deduction amount cannot be negative'],
    },
  },
  { _id: false }
);

const salarySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
      index: true,
    },
    basicSalary: {
      type: Number,
      required: [true, 'Basic salary is required'],
      min: [0, 'Basic salary cannot be negative'],
    },
    allowances: {
      type: [allowanceItemSchema],
      default: [],
    },
    deductions: {
      type: [deductionItemSchema],
      default: [],
    },
    grossSalary: {
      type: Number,
      required: true,
      min: [0, 'Gross salary cannot be negative'],
    },
    totalDeductions: {
      type: Number,
      required: true,
      min: [0, 'Total deductions cannot be negative'],
    },
    netSalary: {
      type: Number,
      required: true,
      min: [0, 'Net salary cannot be negative'],
    },
    effectiveFrom: {
      type: Date,
      required: [true, 'Effective date is required'],
    },
    payMonth: {
      type: Number,
      required: [true, 'Pay month is required'],
      min: [1, 'Pay month must be between 1 and 12'],
      max: [12, 'Pay month must be between 1 and 12'],
    },
    payYear: {
      type: Number,
      required: [true, 'Pay year is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['Draft', 'Processed', 'Paid'],
        message: '{VALUE} is not a valid salary status (Draft, Processed, Paid)',
      },
      default: 'Draft',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validation / pre-save hook to ensure calculations and pay period defaults
salarySchema.pre('validate', function () {
  if (!this.effectiveFrom) {
    if (this.payYear && this.payMonth) {
      this.effectiveFrom = new Date(this.payYear, this.payMonth - 1, 1);
    } else {
      this.effectiveFrom = new Date();
    }
  }

  if (this.effectiveFrom && !this.payMonth) {
    this.payMonth = new Date(this.effectiveFrom).getMonth() + 1;
  }
  if (this.effectiveFrom && !this.payYear) {
    this.payYear = new Date(this.effectiveFrom).getFullYear();
  }

  const allowTotal = Array.isArray(this.allowances)
    ? this.allowances.reduce((acc, item) => acc + (Number(item?.amount) || 0), 0)
    : 0;

  const deductTotal = Array.isArray(this.deductions)
    ? this.deductions.reduce((acc, item) => acc + (Number(item?.amount) || 0), 0)
    : 0;

  const basic = Number(this.basicSalary) || 0;
  this.grossSalary = basic + allowTotal;
  this.totalDeductions = deductTotal;
  this.netSalary = Math.max(0, this.grossSalary - this.totalDeductions);
});

// Indexes for high performance querying & period uniqueness
salarySchema.index({ employee: 1, payYear: 1, payMonth: 1 }, { unique: true });
salarySchema.index({ employee: 1, effectiveFrom: -1 });
salarySchema.index({ status: 1, createdAt: -1 });

const Salary = mongoose.model('Salary', salarySchema);

export default Salary;
