import request from './api.js';

export const announcementService = {
  /**
   * Get all company announcements with search, filters & statistics (Admin / Manager)
   * @param {Object} params - { search, category, priority, status, audience, page, limit }
   */
  getAnnouncements: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'All' && params.category !== 'all') {
      query.append('category', params.category);
    }
    if (params.priority && params.priority !== 'All' && params.priority !== 'all') {
      query.append('priority', params.priority);
    }
    if (params.status && params.status !== 'All' && params.status !== 'all') {
      query.append('status', params.status);
    }
    if (params.audience && params.audience !== 'All' && params.audience !== 'all') {
      query.append('audience', params.audience);
    }
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString();
    return await request(qs ? `/announcements?${qs}` : '/announcements');
  },

  /**
   * Get active, audience-targeted announcements for authenticated employee/manager
   * @param {Object} params - { search, category, priority }
   */
  getMyAnnouncements: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'All' && params.category !== 'all') {
      query.append('category', params.category);
    }
    if (params.priority && params.priority !== 'All' && params.priority !== 'all') {
      query.append('priority', params.priority);
    }

    const qs = query.toString();
    return await request(qs ? `/announcements/my?${qs}` : '/announcements/my');
  },

  /**
   * Get single announcement details by ID
   * @param {string} id
   */
  getAnnouncementById: async (id) => {
    return await request(`/announcements/${id}`);
  },

  /**
   * Create a new announcement (Admin)
   * @param {Object} data - { title, content, category, priority, audience, department, publishDate, expiryDate, status, attachments }
   */
  createAnnouncement: async (data) => {
    return await request('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing announcement (Admin)
   * @param {string} id
   * @param {Object} data
   */
  updateAnnouncement: async (id, data) => {
    return await request(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Archive an announcement (Admin)
   * @param {string} id
   */
  archiveAnnouncement: async (id) => {
    return await request(`/announcements/${id}/archive`, {
      method: 'PATCH',
    });
  },

  /**
   * Delete an announcement (Admin)
   * @param {string} id
   */
  deleteAnnouncement: async (id) => {
    return await request(`/announcements/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Upload an attachment file for announcements (supports FormData or JSON base64)
   * @param {Object|FormData} filePayload
   */
  uploadAttachment: async (filePayload) => {
    const isFormData = typeof FormData !== 'undefined' && filePayload instanceof FormData;
    return await request('/announcements/upload', {
      method: 'POST',
      body: isFormData ? filePayload : JSON.stringify(filePayload),
    });
  },
};

export default announcementService;
