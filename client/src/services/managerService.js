import api from './api.js';

export const managerService = {
  getDashboardStats: async () => {
    const response = await api.get('/manager/dashboard');
    return response.data;
  },

  getTeam: async (params) => {
    const response = await api.get('/manager/team', { params });
    return response.data;
  },

  getTeamMember: async (employeeId) => {
    const response = await api.get(`/manager/team/${employeeId}`);
    return response.data;
  },

  getTeamTasks: async (params) => {
    const response = await api.get('/manager/tasks', { params });
    return response.data;
  },

  getTeamLeave: async (params) => {
    const response = await api.get('/manager/leave', { params });
    return response.data;
  },

  updateLeaveStatus: async (id, data) => {
    const response = await api.put(`/manager/leave/${id}/status`, data);
    return response.data;
  },

  getTeamSubmissions: async (params) => {
    const response = await api.get('/manager/submissions', { params });
    return response.data;
  },

  reviewSubmission: async (id, data) => {
    const response = await api.put(`/manager/submissions/${id}/review`, data);
    return response.data;
  },

  getTeamAttendance: async (params) => {
    const response = await api.get('/manager/attendance', { params });
    return response.data;
  },

  getTeamPerformance: async () => {
    const response = await api.get('/manager/performance');
    return response.data;
  }
};

export default managerService;
