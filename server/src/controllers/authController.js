import crypto from 'crypto';
import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';
import generateToken from '../utils/generateToken.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

/**
 * Helper to build sanitized, safe user payload
 */
const buildSafeUser = (user, empProfile = null) => {
  return {
    id: user._id,
    _id: user._id,
    name: user.name || empProfile?.fullName || '',
    fullName: user.name || empProfile?.fullName || '',
    username: user.username || empProfile?.username || (user.email ? user.email.split('@')[0] : ''),
    email: user.email,
    role: user.role,
    phone: empProfile?.phone || user.phone || '',
    avatar: user.avatar || empProfile?.profileImage || '',
    employeeId: empProfile?.employeeId || (user.role === 'employee' ? 'EMP-100' : ''),
    department: empProfile?.department || user.department || (user.role === 'employee' ? 'Engineering' : ''),
    designation: empProfile?.designation || (user.role === 'employee' ? 'Software Engineer' : user.role === 'manager' ? 'Department Manager' : 'System Administrator'),
    manager: empProfile?.manager || null,
    managerName: empProfile?.managerName || '',
    employeeRef: empProfile?._id || null,
    status: user.status || empProfile?.status || 'Active',
    mustChangePassword: !!user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/**
 * @desc    Authenticate user (Admin, Manager, Employee) & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginAdmin = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || '').trim();

    // Input Validation
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Please provide both email/username and password',
      });
    }

    let user = null;

    // Check if identifier contains '@' (email)
    if (identifier.includes('@')) {
      user = await Admin.findOne({ email: identifier.toLowerCase() }).select('+password');
    } else {
      // Identifier might be a username, employeeId, or name
      const emp = await Employee.findOne({
        $or: [
          { employeeId: identifier.toUpperCase() },
          { username: identifier.toLowerCase() },
          { email: identifier.toLowerCase() },
        ],
      });
      if (emp && emp.email) {
        user = await Admin.findOne({ email: emp.email.toLowerCase() }).select('+password');
      } else {
        user = await Admin.findOne({
          $or: [
            { username: identifier.toLowerCase() },
            { email: identifier.toLowerCase() },
            { name: identifier },
          ],
        }).select('+password');
      }
    }

    // Generic error response to prevent user enumeration
    if (!user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Invalid email or password',
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

    // Verify password hash securely
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Invalid email or password',
      });
    }

    // Find linked employee profile if one exists
    const empProfile = await Employee.findOne({ email: user.email.toLowerCase() });

    // Also verify employee profile status if linked
    if (empProfile && empProfile.status === 'Inactive') {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Your employee profile is deactivated. Please contact your system administrator.',
      });
    }

    // Generate JWT token containing ID and Role
    const token = generateToken(user._id, user.role);

    // Build sanitized user payload
    const userData = buildSafeUser(user, empProfile);

    // Record audit log (non-blocking)
    import('../utils/auditService.js').then(({ createAuditLog }) => {
      createAuditLog({
        user: user._id,
        userRole: user.role || 'employee',
        action: 'LOGIN',
        module: 'AUTH',
        description: `User '${user.name}' logged in successfully`,
        req,
      });
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userData,
      admin: userData, // backward compatibility
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (Requires valid JWT)
 */
export const getMe = async (req, res, next) => {
  try {
    const user = req.user || req.admin;

    if (!user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'User session not found',
      });
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Your account has been deactivated.',
      });
    }

    const empProfile = await Employee.findOne({ email: user.email.toLowerCase() });
    const userData = buildSafeUser(user, empProfile);

    return res.status(200).json({
      success: true,
      user: userData,
      admin: userData, // backward compatibility
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile (name, avatar, phone)
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.admin?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Authentication required',
      });
    }

    const nameToUpdate = req.body.name || req.body.fullName;
    const { avatar, phone } = req.body;

    if (nameToUpdate !== undefined) {
      if (!nameToUpdate || typeof nameToUpdate !== 'string' || nameToUpdate.trim().length < 2) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Name must be at least 2 characters long',
        });
      }
    }

    const user = await Admin.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'User account not found',
      });
    }

    const oldName = user.name;
    if (nameToUpdate) {
      user.name = nameToUpdate.trim();
    }
    if (avatar !== undefined) {
      user.avatar = typeof avatar === 'string' ? avatar.trim() : '';
    }
    if (phone !== undefined && typeof phone === 'string') {
      user.phone = phone.trim();
    }

    await user.save();

    // Synchronize linked Employee record if one exists
    const empProfile = await Employee.findOne({ email: user.email.toLowerCase() });
    if (empProfile) {
      if (nameToUpdate) empProfile.fullName = user.name;
      if (avatar !== undefined) empProfile.profileImage = user.avatar;
      if (phone !== undefined && typeof phone === 'string' && phone.trim()) {
        empProfile.phone = phone.trim();
      }
      await empProfile.save();
    }

    // Audit log for profile update
    const { createAuditLog } = await import('../utils/auditService.js');
    await createAuditLog({
      user: user._id,
      userRole: user.role || 'employee',
      action: 'UPDATE',
      module: 'AUTH',
      targetId: user._id,
      targetType: 'Admin',
      description: `User '${user.name}' updated profile details`,
      metadata: {
        previousName: oldName,
        updatedFields: [nameToUpdate ? 'name' : null, avatar !== undefined ? 'avatar' : null, phone ? 'phone' : null].filter(Boolean),
      },
      req,
    });

    const userData = buildSafeUser(user, empProfile);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: userData,
      admin: userData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change authenticated user password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.admin?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Authentication required',
      });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Field presence validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Please provide current password, new password, and confirmation password',
      });
    }

    // Matching validation
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'New password and confirm password do not match',
      });
    }

    // Length validation
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'New password must be at least 6 characters long',
      });
    }

    // Fetch user including hidden password hash
    const user = await Admin.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'User account not found',
      });
    }

    // Verify current password
    const isCurrentMatch = await user.matchPassword(currentPassword);
    if (!isCurrentMatch) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Current password is incorrect',
      });
    }

    // Check if new password is identical to current password
    const isSamePassword = await user.matchPassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'New password must be different from current password',
      });
    }

    // Update password (triggers bcrypt pre-save hook on Admin model)
    user.password = newPassword;
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await user.save();

    // Generate fresh JWT token
    const token = generateToken(user._id, user.role);
    const empProfile = await Employee.findOne({ email: user.email.toLowerCase() });
    const userData = buildSafeUser(user, empProfile);

    // Create Audit Log for password change (never logging passwords)
    const { createAuditLog } = await import('../utils/auditService.js');
    await createAuditLog({
      user: user._id,
      userRole: user.role || 'employee',
      action: 'PASSWORD_CHANGE',
      module: 'AUTH',
      targetId: user._id,
      targetType: 'Admin',
      description: `User '${user.name}' changed password successfully`,
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
      token,
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    First-login mandatory password change
 * @route   PUT /api/auth/force-change-password
 * @access  Private (Authenticated users with mustChangePassword = true)
 */
export const forceChangePassword = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.admin?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide new password and confirmation password',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const user = await Admin.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    // If currentPassword is provided, verify it
    if (currentPassword) {
      const isCurrentMatch = await user.matchPassword(currentPassword);
      if (!isCurrentMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current temporary password is incorrect',
        });
      }
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await user.save();

    // Issue a fresh token
    const token = generateToken(user._id, user.role);
    const empProfile = await Employee.findOne({ email: user.email.toLowerCase() });
    const userData = buildSafeUser(user, empProfile);

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully. You now have full access to your dashboard.',
      token,
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot Password - Request verification OTP
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Please provide your email address',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await Admin.findOne({ email: normalizedEmail }).select(
      '+resetPasswordOtp +resetPasswordOtpExpires +resetPasswordCooldown'
    );

    // If user exists and account is active
    if (user && user.status !== 'Inactive') {
      // Check cooldown (60 seconds) to prevent spamming
      if (user.resetPasswordCooldown && user.resetPasswordCooldown > Date.now()) {
        const remainingSec = Math.ceil((user.resetPasswordCooldown.getTime() - Date.now()) / 1000);
        return res.status(429).json({
          success: false,
          statusCode: 429,
          message: `Please wait ${remainingSec} second(s) before requesting another code.`,
        });
      }

      // Generate 6-digit random verification code
      const otp = crypto.randomInt(100000, 999999).toString();

      // Store hashed OTP using SHA-256
      const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

      user.resetPasswordOtp = hashedOtp;
      user.resetPasswordOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      user.resetPasswordAttempts = 0;
      user.resetPasswordCooldown = new Date(Date.now() + 60 * 1000); // 60s cooldown
      await user.save();

      // Send OTP via email (Brevo HTTPS API or safe dev fallback)
      const emailResult = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        otp,
        expiresInMinutes: 10,
      });

      if (!emailResult.success && !emailResult.simulated) {
        return res.status(500).json({
          success: false,
          statusCode: 500,
          message: 'Unable to send the verification email. Please try again later.',
        });
      }

      // Audit log
      const { createAuditLog } = await import('../utils/auditService.js');
      createAuditLog({
        user: user._id,
        userRole: user.role || 'employee',
        action: 'PASSWORD_RESET_REQUEST',
        module: 'AUTH',
        description: `Password reset verification code requested for '${user.email}'`,
        req,
      }).catch(() => {});
    }

    // Generic response regardless of whether email exists (prevents account enumeration)
    return res.status(200).json({
      success: true,
      message: 'If an account exists for this email, a verification code has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP for password reset
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Please provide both email and verification code',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await Admin.findOne({ email: normalizedEmail }).select(
      '+resetPasswordOtp +resetPasswordOtpExpires +resetPasswordAttempts'
    );

    if (!user || !user.resetPasswordOtp || !user.resetPasswordOtpExpires) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid or expired verification code',
      });
    }

    // Check attempts limit (max 5 failed attempts)
    if (user.resetPasswordAttempts >= 5) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpires = undefined;
      user.resetPasswordAttempts = 0;
      await user.save();

      return res.status(429).json({
        success: false,
        statusCode: 429,
        message: 'Too many failed attempts. Please request a new verification code.',
      });
    }

    // Check expiry
    if (Date.now() > user.resetPasswordOtpExpires.getTime()) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpires = undefined;
      await user.save();

      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    // Hash entered OTP and compare
    const hashedInput = crypto.createHash('sha256').update(otp.trim()).digest('hex');

    if (hashedInput !== user.resetPasswordOtp) {
      user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
      await user.save();

      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid verification code',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password after OTP verification
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Please provide email, verification code, new password, and confirmation password',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'New password and confirm password do not match',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'New password must be at least 6 characters long',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await Admin.findOne({ email: normalizedEmail }).select(
      '+password +resetPasswordOtp +resetPasswordOtpExpires'
    );

    if (!user || !user.resetPasswordOtp || !user.resetPasswordOtpExpires) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid or expired verification code',
      });
    }

    // Verify expiration
    if (Date.now() > user.resetPasswordOtpExpires.getTime()) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpires = undefined;
      await user.save();

      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    // Verify OTP hash
    const hashedInput = crypto.createHash('sha256').update(otp.trim()).digest('hex');
    if (hashedInput !== user.resetPasswordOtp) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid verification code',
      });
    }

    // Update password (triggers bcrypt pre-save hook)
    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    user.resetPasswordAttempts = 0;
    user.resetPasswordCooldown = undefined;
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await user.save();

    // Audit log
    const { createAuditLog } = await import('../utils/auditService.js');
    await createAuditLog({
      user: user._id,
      userRole: user.role || 'employee',
      action: 'PASSWORD_RESET',
      module: 'AUTH',
      targetId: user._id,
      targetType: 'Admin',
      description: `Password reset successfully completed for '${user.email}'`,
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user / clear server session if needed
 * @route   POST /api/auth/logout
 * @access  Public / Private
 */
export const logoutUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token && token !== 'null' && token !== 'undefined') {
        const jwt = (await import('jsonwebtoken')).default;
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && decoded.id) {
            const { createAuditLog } = await import('../utils/auditService.js');
            await createAuditLog({
              user: decoded.id,
              userRole: decoded.role || 'employee',
              action: 'LOGOUT',
              module: 'AUTH',
              description: 'User logged out',
              req,
            });
          }
        } catch {
          // Token expired or invalid, still allow logout
        }
      }
    }
  } catch (err) {
    // Best-effort audit logging on logout
  }

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
