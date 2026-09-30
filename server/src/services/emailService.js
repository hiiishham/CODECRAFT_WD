import { BrevoClient } from '@getbrevo/brevo';

/**
 * Singleton BrevoClient instance
 */
let brevoClient = null;

/**
 * Initialize or get BrevoClient using environment variables
 */
export const getBrevoClient = () => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }

  if (!brevoClient) {
    brevoClient = new BrevoClient({ apiKey: apiKey.trim() });
  }

  return brevoClient;
};

/**
 * Reset client singleton (useful for testing and configuration changes)
 */
export const resetBrevoClient = () => {
  brevoClient = null;
};

/**
 * Verify Brevo API connection / credentials on startup without leaking secrets
 */
export const verifyEmailService = async () => {
  const client = getBrevoClient();

  if (!client) {
    console.log('[Email Service] Brevo HTTPS API key not set (set BREVO_API_KEY in .env for live email delivery).');
    return false;
  }

  try {
    if (client.account && typeof client.account.getAccount === 'function') {
      await client.account.getAccount();
      console.log('[Email Service] Brevo HTTPS Transactional Email API verified.');
      return true;
    }
    console.log('[Email Service] Brevo API client initialized.');
    return true;
  } catch (error) {
    // Log safe error without exposing credentials or internal details
    const safeError = error?.body?.message || error?.message?.split('\n')[0] || 'Verification failed';
    console.warn(`[Email Service] Brevo API verification check: ${safeError}`);
    return false;
  }
};

/**
 * Backward compatibility alias for startup checks
 */
export const verifySmtpConnection = verifyEmailService;

/**
 * Send an email via Brevo HTTPS Transactional Email API (POST https://api.brevo.com/v3/smtp/email)
 * @param {Object} options - { to, toName, subject, html, text }
 */
export const sendEmail = async ({ to, toName, subject, html, text }) => {
  const client = getBrevoClient();

  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@staffpulse.internal';
  const fromName = process.env.BREVO_FROM_NAME || 'StaffPulse';

  const recipientEmail = typeof to === 'string' ? to.trim() : to?.email?.trim();
  const recipientName = toName || (typeof to === 'object' && to?.name) || recipientEmail.split('@')[0];

  if (!recipientEmail) {
    return {
      success: false,
      delivered: false,
      error: 'Recipient email is required',
    };
  }

  // If Brevo API key is not configured, handle safely in development/test
  if (!client) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Email Service] Simulated send to ${recipientEmail} (Subject: "${subject}")`);
    }
    return {
      success: true,
      delivered: false,
      simulated: true,
      message: 'Brevo API key not configured; simulated email handled safely.',
    };
  }

  try {
    const payload = {
      sender: {
        email: fromEmail,
        name: fromName,
      },
      to: [
        {
          email: recipientEmail,
          name: recipientName,
        },
      ],
      subject: subject || 'Notification from StaffPulse',
      htmlContent: html,
      textContent: text || (html ? html.replace(/<[^>]*>?/gm, '').trim() : ''),
    };

    const response = await client.transactionalEmails.sendTransacEmail(payload);

    console.log(`[Email Service] Transactional email sent successfully via Brevo HTTPS API to ${recipientEmail}`);

    return {
      success: true,
      delivered: true,
      messageId: response?.messageId || response?.messageIds?.[0] || 'sent',
    };
  } catch (error) {
    // Log safe server-side diagnostic error without exposing API key
    const safeError = error?.body?.message || error?.message?.split('\n')[0] || 'Brevo API transmission error';
    console.error(`[Email Service] Brevo HTTPS API error while sending to ${recipientEmail}: ${safeError}`);

    return {
      success: false,
      delivered: false,
      error: safeError,
    };
  }
};

/**
 * Send 6-Digit Password Reset OTP Email
 * @param {Object} options - { to, name, otp, expiresInMinutes }
 */
export const sendPasswordResetEmail = async ({ to, name, otp, expiresInMinutes = 10 }) => {
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

  return await sendEmail({
    to,
    toName: recipientName,
    subject,
    html: htmlContent,
    text: textContent,
  });
};

/**
 * Send Welcome Email to Newly Created Employees/Managers
 * @param {Object} options - { to, name, role, department }
 */
export const sendWelcomeEmail = async ({ to, name, role, department }) => {
  const recipientName = name || 'Team Member';
  const roleName = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Employee';
  const deptName = department || 'General';
  const subject = 'Welcome to StaffPulse HR Management';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to StaffPulse</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 28px 12px; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background-color: #050506; padding: 26px 32px; border-bottom: 2px solid #FF5A1F;">
              <span style="font-size: 22px; font-weight: 800; color: #ffffff;">Staff<span style="color: #FF5A1F;">Pulse</span></span>
              <div style="font-size: 10px; font-weight: 600; color: #94a3b8; letter-spacing: 1.5px; text-transform: uppercase;">HR Management</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">Welcome to the Team, ${recipientName}!</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
                Your StaffPulse account has been set up successfully for the <strong>${deptName}</strong> department as <strong>${roleName}</strong>.
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
                You can now sign in to your dashboard to manage your attendance, tasks, leaves, and professional documents.
              </p>
              <p style="font-size: 14px; line-height: 1.5; color: #334155; margin: 24px 0 0 0;">
                Best regards,<br>
                <strong style="color: #0f172a;">StaffPulse Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">&copy; ${new Date().getFullYear()} StaffPulse. All rights reserved.</p>
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
Welcome to StaffPulse!

Hello ${recipientName},

Your StaffPulse account has been set up successfully for the ${deptName} department as ${roleName}.

Best regards,
StaffPulse Team
`;

  return await sendEmail({
    to,
    toName: recipientName,
    subject,
    html: htmlContent,
    text: textContent,
  });
};

export default {
  getBrevoClient,
  verifyEmailService,
  verifySmtpConnection,
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
