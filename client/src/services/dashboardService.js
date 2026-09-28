import request from './api.js';

export const dashboardService = {
  getStats: async () => {
    return await request('/dashboard/stats');
  },
};

export default dashboardService;
