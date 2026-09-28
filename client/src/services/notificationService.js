import request from './api.js';

export const notificationService = {
  /**
   * Get paginated notifications for current user with optional filters
   * @param {Object} params - { page, limit, status, type }
   */
  getNotifications: async (params = {}) => {
    const query = new URLSearchParams();

    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.status && params.status !== 'all' && params.status !== 'All') {
      query.append('status', params.status);
    }
    if (params.type && params.type !== 'all' && params.type !== 'All') {
      query.append('type', params.type);
    }

    const qs = query.toString();
    return await request(qs ? `/notifications?${qs}` : '/notifications');
  },

  /**
   * Get lightweight unread count for navbar and sidebar badges
   */
  getUnreadCount: async () => {
    return await request('/notifications/unread-count');
  },

  /**
   * Get single notification by ID
   * @param {string} id
   */
  getNotificationById: async (id) => {
    return await request(`/notifications/${id}`);
  },

  /**
   * Mark a single notification as read
   * @param {string} id
   */
  markAsRead: async (id) => {
    return await request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  /**
   * Mark all notifications for current user as read
   */
  markAllAsRead: async () => {
    return await request('/notifications/read-all', {
      method: 'PUT',
    });
  },

  /**
   * Delete a single notification
   * @param {string} id
   */
  deleteNotification: async (id) => {
    return await request(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Clear all notifications for current user
   */
  clearAllNotifications: async () => {
    return await request('/notifications', {
      method: 'DELETE',
    });
  },
};

export default notificationService;
