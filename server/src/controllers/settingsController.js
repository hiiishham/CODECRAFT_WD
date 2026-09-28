import Settings from '../models/Settings.js';
import NotificationPreference from '../models/NotificationPreference.js';
import { createAuditLog } from '../utils/auditService.js';
import { getIo } from '../socket.js';

/**
 * @desc    Get application settings (singleton)
 * @route   GET /api/settings
 * @access  Private (Authenticated users)
 */
export const getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSingleton();
    await settings.populate('updatedBy', 'name email');

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update application settings
 * @route   PUT /api/settings
 * @access  Private (Admin only)
 */
export const updateSettings = async (req, res, next) => {
  try {
    const {
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      companyLogo,
      companyWebsite,
      companyDescription,
      companyFavicon,
      primaryColor,
      secondaryColor,
      accentColor,
      paginationDefault,
      dashboardDateRange,
      sessionTimeout,
      workingDays,
      workingHoursPerDay,
      defaultCheckInTime,
      defaultCheckOutTime,
      currency,
      timezone,
      dateFormat,
      theme,
    } = req.body;

    const settings = await Settings.getSingleton();

    if (companyName !== undefined) {
      if (!companyName || typeof companyName !== 'string' || companyName.trim() === '') {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Company name cannot be empty',
        });
      }
      settings.companyName = companyName.trim();
    }

    if (companyEmail !== undefined) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!companyEmail || !emailRegex.test(companyEmail.trim())) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Please provide a valid company email address',
        });
      }
      settings.companyEmail = companyEmail.trim().toLowerCase();
    }

    if (companyPhone !== undefined) {
      settings.companyPhone = companyPhone.trim();
    }

    if (companyAddress !== undefined) {
      settings.companyAddress = companyAddress.trim();
    }

    if (companyLogo !== undefined) {
      settings.companyLogo = companyLogo.trim();
    }

    if (currency !== undefined) {
      const allowedCurrencies = ['INR', 'USD', 'EUR', 'GBP'];
      if (!allowedCurrencies.includes(currency)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `Currency must be one of: ${allowedCurrencies.join(', ')}`,
        });
      }
      settings.currency = currency;
    }

    if (timezone !== undefined) {
      const tz = timezone.trim();
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        settings.timezone = tz;
      } catch (tzErr) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `Invalid timezone: '${timezone}'. Please provide a valid IANA timezone (e.g. 'Asia/Kolkata', 'UTC', 'America/New_York')`,
        });
      }
    }

    if (dateFormat !== undefined) {
      const allowedFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
      if (!allowedFormats.includes(dateFormat)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `Date format must be one of: ${allowedFormats.join(', ')}`,
        });
      }
      settings.dateFormat = dateFormat;
    }

    if (theme !== undefined) {
      const allowedThemes = ['light', 'dark', 'system'];
      if (!allowedThemes.includes(theme)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `Theme must be one of: ${allowedThemes.join(', ')}`,
        });
      }
      settings.theme = theme;
    }

    // New Fields
    if (companyWebsite !== undefined) settings.companyWebsite = companyWebsite.trim();
    if (companyDescription !== undefined) settings.companyDescription = companyDescription.trim();
    if (companyFavicon !== undefined) settings.companyFavicon = companyFavicon.trim();
    
    if (primaryColor !== undefined) settings.primaryColor = primaryColor.trim();
    if (secondaryColor !== undefined) settings.secondaryColor = secondaryColor.trim();
    if (accentColor !== undefined) settings.accentColor = accentColor.trim();

    if (paginationDefault !== undefined) settings.paginationDefault = paginationDefault;
    if (dashboardDateRange !== undefined) settings.dashboardDateRange = dashboardDateRange;
    if (sessionTimeout !== undefined) settings.sessionTimeout = sessionTimeout;
    
    if (workingDays !== undefined) settings.workingDays = workingDays;
    if (workingHoursPerDay !== undefined) settings.workingHoursPerDay = workingHoursPerDay;
    if (defaultCheckInTime !== undefined) settings.defaultCheckInTime = defaultCheckInTime;
    if (defaultCheckOutTime !== undefined) settings.defaultCheckOutTime = defaultCheckOutTime;

    settings.updatedBy = req.user?._id || req.admin?._id;

    await settings.save();
    await settings.populate('updatedBy', 'name email');

    try {
      const io = getIo();
      io.emit('settings:updated', settings);
    } catch (ioErr) {
      console.error('[Settings] Socket.io error:', ioErr.message);
    }

    await createAuditLog({
      user: settings.updatedBy._id || settings.updatedBy,
      userRole: req.user?.role || req.admin?.role || 'admin',
      action: 'SETTINGS_UPDATE',
      module: 'SETTINGS',
      targetId: settings._id,
      targetType: 'Settings',
      description: `Company settings updated: ${settings.companyName}`,
      metadata: {
        companyName: settings.companyName,
        currency: settings.currency,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
      },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Application settings updated successfully',
      settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get personal notification preferences
 * @route   GET /api/settings/notifications/preferences
 * @access  Private
 */
export const getNotificationPreferences = async (req, res, next) => {
  try {
    let prefs = await NotificationPreference.findOne({ user: req.user._id });

    if (!prefs) {
      prefs = await NotificationPreference.create({
        user: req.user._id,
        userType: req.user.role === 'employee' ? 'Employee' : 'Admin',
      });
    }

    return res.status(200).json({
      success: true,
      preferences: prefs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update personal notification preferences
 * @route   PUT /api/settings/notifications/preferences
 * @access  Private
 */
export const updateNotificationPreferences = async (req, res, next) => {
  try {
    const { email, inApp, categories } = req.body;

    let prefs = await NotificationPreference.findOne({ user: req.user._id });

    if (!prefs) {
      prefs = new NotificationPreference({
        user: req.user._id,
        userType: req.user.role === 'employee' ? 'Employee' : 'Admin',
      });
    }

    if (email !== undefined) prefs.email = email;
    if (inApp !== undefined) prefs.inApp = inApp;

    if (categories) {
      prefs.categories = {
        ...prefs.categories,
        ...categories,
        system: true, // system is always true
      };
    }

    await prefs.save();

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: prefs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload image for settings (logo/favicon)
 * @route   POST /api/settings/upload
 * @access  Private (Admin only)
 */
export const uploadSettingsImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    const hasCloudinary =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    if (hasCloudinary) {
      try {
        const cloudinaryService = (await import('../services/cloudinaryService.js')).default;
        const result = await cloudinaryService.uploadBuffer(
          req.file.buffer,
          'staffpulse/branding',
          'image'
        );
        return res.status(200).json({
          success: true,
          url: result.secure_url || result.url,
        });
      } catch (cloudErr) {
        console.warn('[SettingsController] Cloudinary upload failed, falling back to dataURI:', cloudErr.message);
      }
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    return res.status(200).json({
      success: true,
      url: dataURI,
    });
  } catch (error) {
    next(error);
  }
};
