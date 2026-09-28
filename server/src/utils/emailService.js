/**
 * Centralized email service re-export for backwards compatibility
 */
export {
  getTransporter,
  verifySmtpConnection,
  sendPasswordResetEmail,
  default,
} from '../services/emailService.js';
