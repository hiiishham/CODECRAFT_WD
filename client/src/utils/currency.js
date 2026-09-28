/**
 * Currency configuration and formatting utilities for StaffPulse EMS
 */

const getStoredSettings = () => {
  try {
    const data = localStorage.getItem('ems_settings');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

export const CURRENCY_CONFIG = {
  get code() { return getStoredSettings().currency || 'INR'; },
  get symbol() { 
    const code = getStoredSettings().currency || 'INR';
    if (code === 'USD') return '$';
    if (code === 'EUR') return '€';
    if (code === 'GBP') return '£';
    return '₹';
  },
  get locale() { 
    const code = getStoredSettings().currency || 'INR';
    return code === 'INR' ? 'en-IN' : 'en-US';
  },
};

/**
 * Format a numeric value as a formatted currency string
 * @param {number|string|null|undefined} value - The numeric value to format
 * @param {Object} options - Optional Intl.NumberFormat options
 * @returns {string} Formatted currency string, e.g. "₹45,000"
 */
export const formatCurrency = (value, options = {}) => {
  if (value === null || value === undefined || isNaN(value)) {
    return `${CURRENCY_CONFIG.symbol}0`;
  }

  const num = Number(value);
  const formattedNumber = num.toLocaleString(CURRENCY_CONFIG.locale, {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    ...options,
  });

  return `${CURRENCY_CONFIG.symbol}${formattedNumber}`;
};

export default {
  CURRENCY_CONFIG,
  formatCurrency,
};
