import api from './api.js';

const auditService = {
  getAuditLogs: async (params) => {
    try {
      const { data } = await api.get('/admin/audit-logs', { params });
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch audit logs';
    }
  },

  getAuditLogById: async (id) => {
    try {
      const { data } = await api.get(`/admin/audit-logs/${id}`);
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch audit log details';
    }
  }
};

export default auditService;
