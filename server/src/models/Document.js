import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      minlength: [2, 'Document title must be at least 2 characters long'],
      maxlength: [150, 'Document title cannot exceed 150 characters'],
    },
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
      enum: {
        values: [
          'Offer Letter',
          'Employment Contract',
          'Salary Slip',
          'Experience Letter',
          'ID Proof',
          'Certificate',
          'Resume',
          'Other',
        ],
        message: '{VALUE} is not a valid document type',
      },
      index: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    originalFileName: {
      type: String,
      trim: true,
    },
    filePath: {
      type: String,
      required: [false, 'File storage path is required'], // Made false since we use secureUrl
    },
    fileUrl: {
      type: String,
      default: '',
    },
    secureUrl: {
      type: String,
      default: '',
    },
    publicId: {
      type: String,
      default: '',
    },
    storageProvider: {
      type: String,
      default: 'cloudinary',
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File size must be greater than 0 bytes'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Archived', 'Deleted'],
      default: 'Active',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Uploader user reference is required'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal queries and filtering
documentSchema.index({ employee: 1, createdAt: -1 });
documentSchema.index({ employee: 1, documentType: 1 });
documentSchema.index({ createdAt: -1 });

const Document = mongoose.model('Document', documentSchema);

export default Document;
