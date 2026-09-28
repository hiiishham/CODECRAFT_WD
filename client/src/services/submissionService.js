import request from './api.js';

export const submissionService = {
  /**
   * Upload attachment file(s)
   * @param {FormData} formData - FormData containing files
   */
  uploadAttachment: async (formData) => {
    return await request('/submissions/upload', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Submit work for an assigned task (Employee)
   * @param {Object} data - { taskId, description, githubUrl, liveUrl, attachments, employeeComment }
   */
  createSubmission: async (data) => {
    return await request('/submissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get submissions of the authenticated employee
   * @param {Object} params - { status, search, taskId }
   */
  getMySubmissions: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'All' && params.status !== 'all') {
      query.append('status', params.status);
    }
    if (params.search) query.append('search', params.search);
    if (params.taskId) query.append('taskId', params.taskId);

    const qs = query.toString();
    return await request(qs ? `/submissions/my?${qs}` : '/submissions/my');
  },

  /**
   * Get single submission by ID
   * @param {string} id
   */
  getSubmissionById: async (id) => {
    return await request(`/submissions/${id}`);
  },

  /**
   * Get latest submission for a given task ID
   * @param {string} taskId
   */
  getSubmissionByTaskId: async (taskId) => {
    return await request(`/submissions/task/${taskId}`);
  },

  /**
   * Update and resubmit work (Employee)
   * @param {string} id
   * @param {Object} data - { description, githubUrl, liveUrl, attachments, employeeComment }
   */
  updateSubmission: async (id, data) => {
    return await request(`/submissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get all submissions with search, filters, pagination (Admin / Manager)
   * @param {Object} params - { search, status, employee, department, startDate, endDate, page, limit }
   */
  getSubmissions: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'All' && params.status !== 'all') {
      query.append('status', params.status);
    }
    if (params.employee && params.employee !== 'All' && params.employee !== 'all') {
      query.append('employee', params.employee);
    }
    if (params.department && params.department !== 'All' && params.department !== 'all') {
      query.append('department', params.department);
    }
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString();
    return await request(qs ? `/submissions?${qs}` : '/submissions');
  },

  /**
   * Review submission: Approve or Request Changes (Admin / Manager)
   * @param {string} id
   * @param {Object} data - { status: 'Approved' | 'Changes Requested', reviewComment: string }
   */
  reviewSubmission: async (id, data) => {
    return await request(`/submissions/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export default submissionService;
