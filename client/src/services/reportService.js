import request from './api.js';

export const reportService = {
  /**
   * Get overview statistics
   * @param {Object} params - { from, to, department }
   */
  getOverview: async (params = {}) => {
    const query = buildQuery(params);
    return await request(`/reports/overview${query}`);
  },

  /**
   * Get department distribution report
   * @param {Object} params - { from, to }
   */
  getDepartmentReport: async (params = {}) => {
    const query = buildQuery(params);
    return await request(`/reports/departments${query}`);
  },

  /**
   * Get employee export data (admin only)
   * @param {Object} params - { from, to, department }
   */
  getEmployeeExport: async (params = {}) => {
    const query = buildQuery(params);
    return await request(`/reports/employees${query}`);
  },

  /**
   * Get leave analytics and export data
   * @param {Object} params - { from, to, department }
   */
  getLeaveReport: async (params = {}) => {
    const query = buildQuery(params);
    return await request(`/reports/leaves${query}`);
  },

  /**
   * Get joining trend data
   * @param {Object} params - { from, to, department }
   */
  getJoiningTrends: async (params = {}) => {
    const query = buildQuery(params);
    return await request(`/reports/joining-trends${query}`);
  },
};

/**
 * Build URL query string from filter params
 */
function buildQuery(params) {
  const query = new URLSearchParams();
  if (params.from) query.append('from', params.from);
  if (params.to) query.append('to', params.to);
  if (params.department && params.department !== 'All') query.append('department', params.department);
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export default reportService;
