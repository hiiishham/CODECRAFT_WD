/**
 * Utility functions for formatting currency and dates based on global settings.
 * Since we can't easily use hooks outside React components, we can pass the 
 * settings object from the context to these functions, or rely on a global store if needed.
 */
import dayjs from 'dayjs';

/**
 * Format currency based on the provided settings
 * @param {Number} amount - The numeric amount
 * @param {Object} settings - The global settings object from SettingsContext
 * @returns {String} Formatted string
 */
export const formatCurrency = (amount, settings) => {
  const currencyCode = settings?.currency || 'INR';
  const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format date based on the provided settings
 * @param {String|Date} date - The date to format
 * @param {Object} settings - The global settings object from SettingsContext
 * @returns {String} Formatted date string
 */
export const formatDate = (date, settings) => {
  if (!date) return '-';
  
  // Use dayjs for robust date handling
  const format = settings?.dateFormat || 'DD/MM/YYYY';
  return dayjs(date).format(format);
};
