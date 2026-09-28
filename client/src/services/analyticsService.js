import api from './api.js';

const analyticsService = {
  getSuperDashboardStats: async (params) => {
    try {
      const { data } = await api.get('/admin/analytics/dashboard', { params });
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch dashboard stats';
    }
  },
  
  getWorkforceAnalytics: async (params) => {
    try {
      const { data } = await api.get('/admin/analytics/workforce', { params });
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch workforce analytics';
    }
  },

  getAttendanceAnalytics: async (params) => {
    try {
      const { data } = await api.get('/admin/analytics/attendance', { params });
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch attendance analytics';
    }
  },

  getLeaveAnalytics: async (params) => {
    try {
      const { data } = await api.get('/admin/analytics/leave', { params });
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch leave analytics';
    }
  },

  getTaskAnalytics: async (params) => {
    try {
      const { data } = await api.get('/admin/analytics/tasks', { params });
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch task analytics';
    }
  },

  getPerformanceAnalytics: async (params) => {
    try {
      const { data } = await api.get('/admin/analytics/performance', { params });
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch performance analytics';
    }
  },

  getSalaryAnalytics: async (params) => {
    try {
      const { data } = await api.get('/admin/analytics/salary', { params });
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch salary analytics';
    }
  }
};

export default analyticsService;
