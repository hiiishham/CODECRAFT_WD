import request from './api.js';

export const employeeService = {
  /**
   * Get paginated employees list with search, filter, and sorting
   * @param {Object} params - { page, limit, search, department, status, sort }
   */
  getEmployees: async (params = {}) => {
    const query = new URLSearchParams();

    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.search && params.search.trim()) query.append('search', params.search.trim());
    if (params.department && params.department !== 'All') query.append('department', params.department);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.role && params.role !== 'All' && params.role !== 'all') query.append('role', params.role);
    if (params.sort) query.append('sort', params.sort);

    const queryString = query.toString();
    const endpoint = queryString ? `/employees?${queryString}` : '/employees';

    return await request(endpoint);
  },

  /**
   * Get single employee by ID
   * @param {string} id
   */
  getEmployeeById: async (id) => {
    return await request(`/employees/${id}`);
  },

  /**
   * Create a new employee
   * @param {Object} employeeData
   */
  createEmployee: async (employeeData) => {
    return await request('/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  },

  /**
   * Update an existing employee
   * @param {string} id
   * @param {Object} employeeData
   */
  updateEmployee: async (id, employeeData) => {
    return await request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData),
    });
  },

  /**
   * Delete employee by ID
   * @param {string} id
   */
  deleteEmployee: async (id) => {
    return await request(`/employees/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Admin Reset password for an employee/manager
   * @param {string} id
   * @param {Object} data - { newPassword, confirmPassword }
   */
  resetPassword: async (id, data) => {
    return await request(`/employees/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export default employeeService;
