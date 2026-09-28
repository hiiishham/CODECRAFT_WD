// 404 Not Found Middleware
export const notFound = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global Error Handler Middleware
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose Bad ObjectId (CastError) -> 400 Bad Request
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format: ${err.value}`;
  }

  // Handle Mongoose Duplicate Key Error (11000) -> 409 Conflict
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    // Hide the actual value in production to prevent data leakage
    const val = process.env.NODE_ENV === 'development' && err.keyValue ? `"${err.keyValue[field]}"` : 'that already exists';
    message = `Duplicate value entered for ${field} ${val}. Please use a different value.`;
  }

  // Handle Mongoose Validation Error -> 400 Bad Request
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(', ');
  }

  // Handle Multer File Upload Errors -> 400 Bad Request
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds the maximum allowed limit of 10MB';
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // Handle JWT Errors -> 401 Unauthorized
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Not authorized, invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Not authorized, token has expired';
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
