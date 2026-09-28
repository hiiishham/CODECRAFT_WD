import request from './api.js';

export const leaveService = {
  /**
   * Get authenticated employee's live leave balance
   */
  getMyLeaveBalance: async () => {
    return await request('/leaves/my/balance');
  },

  /**
   * Get authenticated employee's personal leave requests
   * @param {Object} params - { page, limit, status, leaveType }
   */
  getMyLeaves: async (params = {}) => {
    const query = new URLSearchParams();

    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.leaveType && params.leaveType !== 'All') query.append('leaveType', params.leaveType);

    const queryString = query.toString();
    const endpoint = queryString ? `/leaves/my?${queryString}` : '/leaves/my';

    return await request(endpoint);
  },

  /**
   * Get paginated leaves list with search and filters (Admin & Manager)
   * @param {Object} params - { page, limit, search, status, leaveType, department, startDate, endDate }
   */
  getLeaves: async (params = {}) => {
    const query = new URLSearchParams();

    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.search && params.search.trim()) query.append('search', params.search.trim());
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.leaveType && params.leaveType !== 'All') query.append('leaveType', params.leaveType);
    if (params.department && params.department !== 'All') query.append('department', params.department);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const queryString = query.toString();
    const endpoint = queryString ? `/leaves?${queryString}` : '/leaves';

    return await request(endpoint);
  },

  /**
   * Get single leave by ID
   * @param {string} id
   */
  getLeaveById: async (id) => {
    return await request(`/leaves/${id}`);
  },

  /**
   * Create a new leave request
   * @param {Object} leaveData - { employee, leaveType, startDate, endDate, reason }
   */
  createLeave: async (leaveData) => {
    return await request('/leaves', {
      method: 'POST',
      body: JSON.stringify(leaveData),
    });
  },

  /**
   * Cancel an employee's own pending leave request
   * @param {string} id
   */
  cancelLeave: async (id) => {
    return await request(`/leaves/${id}/cancel`, {
      method: 'PUT',
    });
  },

  /**
   * Update a pending leave request
   * @param {string} id
   * @param {Object} leaveData
   */
  updateLeave: async (id, leaveData) => {
    return await request(`/leaves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(leaveData),
    });
  },

  /**
   * Approve a pending leave request
   * @param {string} id
   * @param {string} [reviewComment]
   */
  approveLeave: async (id, reviewComment = '') => {
    return await request(`/leaves/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ reviewComment }),
    });
  },

  /**
   * Reject a pending leave request (requires reviewComment)
   * @param {string} id
   * @param {string} reviewComment
   */
  rejectLeave: async (id, reviewComment = '') => {
    return await request(`/leaves/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reviewComment }),
    });
  },

  /**
   * Delete a leave request
   * @param {string} id
   */
  deleteLeave: async (id) => {
    return await request(`/leaves/${id}`, {
      method: 'DELETE',
    });
  },
};

export default leaveService;
