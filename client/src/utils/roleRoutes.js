/**
 * Role-Based Route Utilities
 * Provides centralized route mappings and authorization helpers for StaffPulse
 */

export const ROLE_DASHBOARDS = {
  admin: '/dashboard',
  manager: '/manager/dashboard',
  employee: '/employee/dashboard',
};

/**
 * Returns the default landing dashboard URL for a given user role
 * @param {string} role - 'admin' | 'manager' | 'employee'
 * @returns {string} Target dashboard path
 */
export const getDashboardPath = (role) => {
  if (!role) return '/login';
  const normalized = role.toLowerCase().trim();
  return ROLE_DASHBOARDS[normalized] || '/login';
};

/**
 * Formats a role string into a clean uppercase badge label
 * @param {string} role - 'admin' | 'manager' | 'employee'
 * @returns {string} e.g. 'ADMIN', 'MANAGER', 'EMPLOYEE'
 */
export const formatRoleLabel = (role) => {
  if (!role) return 'USER';
  return role.toUpperCase();
};

export default {
  ROLE_DASHBOARDS,
  getDashboardPath,
  formatRoleLabel,
};
