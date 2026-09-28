import request from './api.js';

export const attendanceService = {
  /**
   * Check in for today's work shift
   */
  checkIn: async () => {
    return await request('/attendance/check-in', {
      method: 'POST',
    });
  },

  /**
   * Check out from today's work shift
   */
  checkOut: async () => {
    return await request('/attendance/check-out', {
      method: 'POST',
    });
  },

  /**
   * Get authenticated employee's attendance record for today
   */
  getTodayAttendance: async () => {
    return await request('/attendance/today');
  },

  /**
   * Get attendance history for the authenticated employee
   * @param {Object} params - { page, limit, status, month, startDate, endDate }
   */
  getMyAttendance: async (params = {}) => {
    const query = new URLSearchParams();

    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.status && params.status !== 'All' && params.status !== 'all') {
      query.append('status', params.status);
    }
    if (params.month) query.append('month', params.month);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const qs = query.toString();
    return await request(qs ? `/attendance/my?${qs}` : '/attendance/my');
  },

  /**
   * Get monthly attendance summary and metrics for current employee
   * @param {Object} params - { month, year }
   */
  getAttendanceSummary: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.month) query.append('month', params.month);
    if (params.year) query.append('year', params.year);

    const qs = query.toString();
    return await request(qs ? `/attendance/summary?${qs}` : '/attendance/summary');
  },
};

export default attendanceService;
