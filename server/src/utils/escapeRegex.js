/**
 * Escapes special regular expression characters in a string
 * to prevent regex injection, denial of service, and syntax errors.
 *
 * @param {string} value
 * @returns {string}
 */
export const escapeRegex = (value = '') => {
  if (typeof value !== 'string') return '';
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default escapeRegex;
