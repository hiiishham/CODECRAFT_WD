import request from './api.js';

export const authService = {
  login: async (credentials) => {
    return await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  getMe: async () => {
    return await request('/auth/me');
  },

  logout: async () => {
    try {
      return await request('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Best-effort server notification
      return { success: true };
    }
  },

  updateProfile: async (data) => {
    return await request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  changePassword: async (data) => {
    return await request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  forceChangePassword: async (data) => {
    return await request('/auth/force-change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  forgotPassword: async (data) => {
    return await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  verifyOtp: async (data) => {
    return await request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  resetPassword: async (data) => {
    return await request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export default authService;
