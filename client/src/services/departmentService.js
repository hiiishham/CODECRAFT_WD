import request from './api.js';

export const departmentService = {
  /**
   * Get all departments with dynamic employee counts and optional search/status filter
   * @param {Object} params - { search, status }
   */
  getDepartments: async (params = {}) => {
    const query = new URLSearchParams();

    if (params.search && params.search.trim()) {
      query.append('search', params.search.trim());
    }
    if (params.status && params.status !== 'All') {
      query.append('status', params.status);
    }

    const queryString = query.toString();
    const endpoint = queryString ? `/departments?${queryString}` : '/departments';

    return await request(endpoint);
  },

  /**
   * Get department details by ID along with assigned employees
   * @param {string} id
   */
  getDepartmentById: async (id) => {
    return await request(`/departments/${id}`);
  },

  /**
   * Create a new department
   * @param {Object} departmentData - { name, description, status }
   */
  createDepartment: async (departmentData) => {
    return await request('/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData),
    });
  },

  /**
   * Update an existing department
   * @param {string} id
   * @param {Object} departmentData - { name, description, status }
   */
  updateDepartment: async (id, departmentData) => {
    return await request(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(departmentData),
    });
  },

  /**
   * Delete department by ID
   * @param {string} id
   */
  deleteDepartment: async (id) => {
    return await request(`/departments/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Alias for getDepartments to support legacy consumers
   */
  getAllDepartments: async (params = {}) => {
    return await departmentService.getDepartments(params);
  },
};

export default departmentService;
