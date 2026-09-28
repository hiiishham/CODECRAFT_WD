import nodemailer from 'nodemailer';

/**
 * Singleton transporter instance
 */
let transporter = null;

/**
 * Initialize or get Nodemailer transporter using environment variables
 */
export const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

  // If credentials are provided, create production SMTP transport
  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for port 465, false for port 587 / other ports
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
  }

  return transporter;
};

/**
 * Verify SMTP connection on startup without leaking secrets
 */
export const verifySmtpConnection = async () => {
  const currentTransporter = getTransporter();

  if (!currentTransporter) {
    console.log('[Email] SMTP is not fully configured (check SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env).');
    return false;
  }

  try {
    await currentTransporter.verify();
    console.log('[Email] SMTP connection verified.');
    return true;
  } catch (error) {
    // Log safe error without exposing credentials or internal details
    const safeError = error?.message?.split('\n')[0] || 'Connection failed';
    console.error(`[Email] SMTP connection failed: ${safeError}`);
    return false;
  }
};

/**
 * Send 6-Digit Password Reset OTP Email
 * @param {Object} options - { to, name, otp, expiresInMinutes }
 */
export const sendPasswordResetEmail = async ({ to, name, otp, expiresInMinutes = 10 }) => {
  const currentTransporter = getTransporter();
  const fromName = process.env.SMTP_FROM_NAME || 'StaffPulse';
  const fromAddress = process.env.SMTP_FROM || 'noreply@staffpulse.internal';
  const from = `"${fromName}" <${fromAddress}>`;

  const recipientName = name || 'StaffPulse User';
  const subject = 'StaffPulse Password Reset Code';

  // Format OTP digits for centered spaced display
  const otpSpaced = String(otp).split('').join(' ');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StaffPulse Password Reset Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 28px 12px; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);" cellspacing="0" cellpadding="0" border="0">
          <!-- Header -->
          <tr>
            <td style="background-color: #050506; padding: 26px 32px; border-bottom: 2px solid #FF5A1F; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Staff<span style="color: #FF5A1F;">Pulse</span></span>
                    <div style="font-size: 10px; font-weight: 600; color: #94a3b8; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px;">HR Management</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.3px;">Password Reset</h2>
              
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
                Hello <strong>${recipientName}</strong>,
              </p>
              
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
                We received a request to reset your StaffPulse password. Use the verification code below to proceed with setting a new password:
              </p>

              <!-- OTP Code Display Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #fff7ed; border: 2px dashed #fed7aa; border-radius: 12px; padding: 22px 16px;">
                    <div style="font-size: 11px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Your Verification Code</div>
                    <div style="font-size: 36px; font-weight: 800; color: #ea580c; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace; margin: 4px 0;">
                      ${otpSpaced}
                    </div>
                    <div style="font-size: 12px; color: #9a3412; font-weight: 500; margin-top: 8px;">
                      ⏱ This code expires in <strong>${expiresInMinutes} minutes</strong>.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
                If you did not request a password reset, you can safely ignore this email.
              </p>

              <div style="background-color: #f8fafc; border-left: 3px solid #FF5A1F; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
                <p style="font-size: 13px; line-height: 1.5; color: #475569; margin: 0;">
                  <strong>Security Reminder:</strong> For your security, never share this code with anyone. StaffPulse representatives will never ask for your verification code.
                </p>
              </div>

              <p style="font-size: 14px; line-height: 1.5; color: #334155; margin: 24px 0 0 0;">
                Regards,<br>
                <strong style="color: #0f172a;">StaffPulse</strong><br>
                <span style="color: #64748b; font-size: 12px;">HR Management</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                &copy; ${new Date().getFullYear()} StaffPulse. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const textContent = `
StaffPulse
Password Reset

Hello ${recipientName},

We received a request to reset your StaffPulse password.

Your verification code is:

${otp}

This code expires in ${expiresInMinutes} minutes.

If you did not request a password reset, you can safely ignore this email.

For your security, never share this code with anyone.

Regards,
StaffPulse
HR Management
`;

  // If SMTP is not configured, safely handle in development
  if (!currentTransporter) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Email] SMTP not configured. Simulated password reset email to: ${to}`);
    }
    return {
      success: true,
      delivered: false,
      simulated: true,
      message: 'SMTP not configured; simulated email handled safely.',
    };
  }

  try {
    const info = await currentTransporter.sendMail({
      from,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[Email] Password reset email sent successfully to ${to}`);

    return {
      success: true,
      delivered: true,
      messageId: info.messageId,
    };
  } catch (error) {
    // Log safe server-side error without exposing credentials
    const safeError = error?.message?.split('\n')[0] || 'Email transmission error';
    console.error(`[Email] Failed to send password reset email to ${to}: ${safeError}`);

    return {
      success: false,
      delivered: false,
      error: safeError,
    };
  }
};

export default {
  getTransporter,
  verifySmtpConnection,
  sendPasswordResetEmail,
};
