import request from './api.js';

export const goalService = {
  /**
   * Get all goals with filters (Admin/Manager)
   * @param {Object} params - { search, employee, department, priority, status, page, limit }
   */
  getGoals: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.employee && params.employee !== 'All') query.append('employee', params.employee);
    if (params.department && params.department !== 'All') query.append('department', params.department);
    if (params.priority && params.priority !== 'All') query.append('priority', params.priority);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    return await request(qs ? `/goals?${qs}` : '/goals');
  },

  /**
   * Get goal statistics (Admin/Manager)
   */
  getGoalStats: async () => {
    return await request('/goals/stats');
  },

  /**
   * Get single goal by ID
   * @param {string} id
   */
  getGoalById: async (id) => {
    return await request(`/goals/${id}`);
  },

  /**
   * Get my goals (Employee)
   * @param {Object} params - { status, priority }
   */
  getMyGoals: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.priority && params.priority !== 'All') query.append('priority', params.priority);
    const qs = query.toString();
    return await request(qs ? `/goals/my?${qs}` : '/goals/my');
  },

  /**
   * Create a new goal (Admin/Manager)
   * @param {Object} goalData
   */
  createGoal: async (goalData) => {
    return await request('/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
  },

  /**
   * Update a goal (Admin/Manager)
   * @param {string} id
   * @param {Object} updateData
   */
  updateGoal: async (id, updateData) => {
    return await request(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  /**
   * Delete a goal (Admin/Manager)
   * @param {string} id
   */
  deleteGoal: async (id) => {
    return await request(`/goals/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Update goal progress (Employee only)
   * @param {string} id
   * @param {number} progress - 0-100
   */
  updateGoalProgress: async (id, progress) => {
    return await request(`/goals/${id}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ progress }),
    });
  },
};

export default goalService;
