import request from './api.js';

export const salaryService = {
  /**
   * Get paginated salary records with search, filters, and sorting (Admin)
   * @param {Object} params - { page, limit, search, department, status, month, year, sort }
   */
  getSalaries: async (params = {}) => {
    const query = new URLSearchParams();

    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.search && params.search.trim()) query.append('search', params.search.trim());
    if (params.department && params.department !== 'All') query.append('department', params.department);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.month && params.month !== 'All') query.append('month', params.month);
    if (params.year && params.year !== 'All') query.append('year', params.year);
    if (params.sort) query.append('sort', params.sort);

    const qs = query.toString();
    return await request(qs ? `/salary?${qs}` : '/salary');
  },

  /**
   * Get single salary record (Admin)
   * @param {string} id
   */
  getSalaryById: async (id) => {
    return await request(`/salary/${id}`);
  },

  /**
   * Create a new salary record (Admin)
   * @param {Object} data
   */
  createSalary: async (data) => {
    return await request('/salary', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing salary record (Admin)
   * @param {string} id
   * @param {Object} data
   */
  updateSalary: async (id, data) => {
    return await request(`/salary/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a salary record (Admin - Draft only)
   * @param {string} id
   */
  deleteSalary: async (id) => {
    return await request(`/salary/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get salary statistics for admin dashboard
   */
  getStats: async () => {
    return await request('/salary/stats');
  },

  /**
   * Get current/latest salary for the logged-in employee
   */
  getMySalary: async () => {
    return await request('/salary/my');
  },

  /**
   * Get monthly salary history for the logged-in employee
   */
  getMySalaryHistory: async () => {
    return await request('/salary/my/history');
  },

  /**
   * Get detailed payslip for a specific salary record (Employee self-service)
   * @param {string} id
   */
  getMySalaryById: async (id) => {
    return await request(`/salary/my/${id}`);
  },
};

export default salaryService;

