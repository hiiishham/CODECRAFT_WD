import multer from 'multer';
import path from 'path';

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
];

// Allowed extensions
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.doc',
  '.docx',
  '.zip',
];

// Dangerous/executable extensions that must be rejected immediately
const DANGEROUS_EXTENSIONS = [
  '.exe',
  '.sh',
  '.bat',
  '.cmd',
  '.js',
  '.vbs',
  '.php',
  '.py',
  '.jar',
  '.msi',
  '.scr',
  '.pif',
  '.com',
  '.bin',
  '.cgi',
  '.pl',
];

// Memory storage to buffer files in memory for Cloudinary / local upload
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return cb(
      new Error('Dangerous file extension detected. Executables and scripts are strictly prohibited.'),
      false
    );
  }

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new Error('Invalid file type. Allowed: JPG, PNG, PDF, DOC, DOCX, ZIP, WEBP'),
      false
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error('Invalid file MIME type. Allowed: JPG, PNG, PDF, DOC, DOCX, ZIP, WEBP'),
      false
    );
  }

  cb(null, true);
};

// Configurable Multer instances
export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB for documents
    files: 1,
  },
  fileFilter,
});

export const uploadAttachment = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB for attachments
    files: 5,
  },
  fileFilter,
});

export const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB for avatars
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed for avatars'), false);
    }
  },
});

export default {
  uploadDocument,
  uploadAttachment,
  uploadAvatar,
};
