import request from './api.js';

export const taskService = {
  /**
   * Get paginated tasks with search and filters (Admin / Manager)
   * @param {Object} params - { search, department, employee, priority, status, page, limit }
   */
  getTasks: async (params = {}) => {
    const query = new URLSearchParams();

    if (params.search) query.append('search', params.search);
    if (params.department && params.department !== 'All' && params.department !== 'all') {
      query.append('department', params.department);
    }
    if (params.employee && params.employee !== 'All' && params.employee !== 'all') {
      query.append('employee', params.employee);
    }
    if (params.priority && params.priority !== 'All' && params.priority !== 'all') {
      query.append('priority', params.priority);
    }
    if (params.status && params.status !== 'All' && params.status !== 'all') {
      query.append('status', params.status);
    }
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString();
    return await request(qs ? `/tasks?${qs}` : '/tasks');
  },

  /**
   * Get task statistics (Admin / Manager)
   */
  getTaskStats: async () => {
    return await request('/tasks/stats');
  },

  /**
   * Get single task by ID
   * @param {string} id
   */
  getTaskById: async (id) => {
    return await request(`/tasks/${id}`);
  },

  /**
   * Create a new task (Admin / Manager)
   * @param {Object} taskData
   */
  createTask: async (taskData) => {
    return await request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  /**
   * Update task details (Admin / Manager)
   * @param {string} id
   * @param {Object} updateData
   */
  updateTask: async (id, updateData) => {
    return await request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  /**
   * Delete task (Admin / Manager)
   * @param {string} id
   */
  deleteTask: async (id) => {
    return await request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get personal tasks for authenticated employee
   * @param {Object} params - { status, priority, search, limit }
   */
  getMyTasks: async (params = {}) => {
    const query = new URLSearchParams();

    if (params.status && params.status !== 'All' && params.status !== 'all') {
      query.append('status', params.status);
    }
    if (params.priority && params.priority !== 'All' && params.priority !== 'all') {
      query.append('priority', params.priority);
    }
    if (params.search) query.append('search', params.search);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString();
    return await request(qs ? `/tasks/my?${qs}` : '/tasks/my');
  },

  /**
   * Update task progress (Employee only)
   * @param {string} id
   * @param {Object} data - { progress: number, employeeComment?: string }
   */
  updateTaskProgress: async (id, data) => {
    return await request(`/tasks/${id}/progress`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export default taskService;
