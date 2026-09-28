import api from './api.js';

export const adminAttendanceService = {
  getTodayWorkforce: async () => {
    const response = await api.get('/attendance/admin/today');
    return response.data;
  },

  getAttendanceHistory: async (params) => {
    const response = await api.get('/attendance/admin', { params });
    return response.data;
  },

  getDashboardSummary: async () => {
    const response = await api.get('/attendance/admin/summary');
    return response.data;
  },

  getEmployeeAttendanceDetails: async (employeeId, params) => {
    const response = await api.get(`/attendance/admin/${employeeId}`, { params });
    return response.data;
  },

  updateAttendance: async (id, data) => {
    const response = await api.put(`/attendance/admin/${id}`, data);
    return response.data;
  },

  exportAttendance: async (params) => {
    // Return blob for download
    const response = await api.get('/attendance/admin/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

export default adminAttendanceService;
