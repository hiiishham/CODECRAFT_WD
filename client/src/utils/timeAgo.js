/**
 * Format a date string or timestamp into a friendly relative time representation
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Relative time string (e.g. "Just now", "5 minutes ago", "2 hours ago", "Yesterday")
 */
export const formatTimeAgo = (dateInput) => {
  if (!dateInput) return '—';

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) {
    return 'Just now';
  }

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes === 1) {
    return '1 minute ago';
  }
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) {
    return '1 hour ago';
  }
  if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return 'Yesterday';
  }
  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }

  // Fallback to formatted date for older items
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

export default formatTimeAgo;
