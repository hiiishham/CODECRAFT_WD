/**
 * Centralized email service re-export for backwards compatibility
 */
export {
  getBrevoClient,
  verifyEmailService,
  verifySmtpConnection,
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  default,
} from '../services/emailService.js';
