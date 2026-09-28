import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

/**
 * Middleware to protect routes and verify JWT token
 */
export const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      token = authHeader.split(' ')[1];

      if (!token || token.trim() === '' || token === 'null' || token === 'undefined') {
        return res.status(401).json({
          success: false,
          statusCode: 401,
          message: 'Not authorized, token is missing or malformed',
        });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded || !decoded.id) {
        return res.status(401).json({
          success: false,
          statusCode: 401,
          message: 'Not authorized, invalid token payload',
        });
      }

      // Fetch user from database omitting password
      const user = await Admin.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          statusCode: 401,
          message: 'Not authorized, user account no longer exists',
        });
      }

      // Check if user account has been deactivated
      if (user.status === 'Inactive') {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been deactivated. Please contact your system administrator.',
        });
      }

      // Attach user to request object (both user and admin for backward compatibility)
      req.user = user;
      req.admin = user;
      return next();
    } catch (error) {
      const isExpired = error.name === 'TokenExpiredError';
      return res.status(401).json({
        success: false,
        statusCode: 401,
        code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
        message: isExpired
          ? 'Session expired. Please log in again.'
          : 'Not authorized, token verification failed',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: 'Not authorized, no authentication token provided',
    });
  }
};

/**
 * Role-Based Access Control (RBAC) middleware
 * @param  {...string} roles - Allowed roles e.g. requireRole('admin'), requireRole('admin', 'manager')
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    const user = req.user || req.admin;

    if (!user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Authentication required before accessing this resource',
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: `Access denied. Role '${user.role}' is not authorized to perform this action. Required role(s): ${roles.join(', ')}`,
      });
    }

    next();
  };
};

export default protect;
