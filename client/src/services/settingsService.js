import request from './api.js';

export const settingsService = {
  getSettings: async () => {
    return await request('/settings');
  },

  updateSettings: async (settingsData) => {
    return await request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  },

  getNotificationPreferences: async () => {
    return await request('/settings/notifications/preferences');
  },

  updateNotificationPreferences: async (data) => {
    return await request('/settings/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return await request('/settings/upload', {
      method: 'POST',
      body: formData,
    });
  }
};

export default settingsService;
