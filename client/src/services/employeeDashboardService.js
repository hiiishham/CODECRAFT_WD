import api from './api';

export const employeeDashboardService = {
  getStats: async () => {
    try {
      const response = await api.get('/employee/dashboard');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch dashboard stats' };
    }
  }
};
