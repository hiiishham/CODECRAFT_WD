import request from './api.js';

export const performanceService = {
  /**
   * Get all performance reviews with filters (Admin/Manager)
   * @param {Object} params - { search, employee, status, rating, page, limit }
   */
  getPerformances: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.employee && params.employee !== 'All') query.append('employee', params.employee);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.rating && params.rating !== 'All') query.append('rating', params.rating);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    return await request(qs ? `/performance?${qs}` : '/performance');
  },

  /**
   * Get performance statistics (Admin/Manager)
   */
  getPerformanceStats: async () => {
    return await request('/performance/stats');
  },

  /**
   * Get single performance review (Admin/Manager)
   * @param {string} id
   */
  getPerformanceById: async (id) => {
    return await request(`/performance/${id}`);
  },

  /**
   * Create a performance review (Admin/Manager)
   * @param {Object} reviewData
   */
  createPerformance: async (reviewData) => {
    return await request('/performance', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  },

  /**
   * Update a performance review (Admin/Manager)
   * @param {string} id
   * @param {Object} updateData
   */
  updatePerformance: async (id, updateData) => {
    return await request(`/performance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  /**
   * Get my performance reviews (Employee)
   */
  getMyPerformances: async () => {
    return await request('/performance/my');
  },

  /**
   * Get my performance summary (Employee) — tasks, attendance, goals, reviews
   */
  getMyPerformanceSummary: async () => {
    return await request('/performance/my/summary');
  },

  /**
   * Get my single performance review by ID (Employee)
   * @param {string} id
   */
  getMyPerformanceById: async (id) => {
    return await request(`/performance/my/${id}`);
  },

  /**
   * Get performance summary for a specific employee (Admin/Manager)
   * @param {string} employeeId
   */
  getEmployeePerformanceSummary: async (employeeId) => {
    return await request(`/performance/summary/${employeeId}`);
  },
};

export default performanceService;
