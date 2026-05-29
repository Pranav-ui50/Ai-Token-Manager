/**
 * Email Service
 *
 * Handles all email-related functionality.
 */

import emailConfig from '../config/email.js';
import config from '../config/index.js';
import logger from '../config/logger.js';

class EmailService {
  /**
   * Send an email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      const transporter = await emailConfig.getTransporter();

      const mailOptions = {
        from: `${config.email.from.name} <${config.email.from.address}>`,
        to,
        subject,
        html,
        text: text || this.htmlToText(html)
      };

      const info = await transporter.sendMail(mailOptions);

      // Log email in development
      if (config.nodeEnv === 'development') {
        const testUrl = emailConfig.getTestMessageUrl(info);
        if (testUrl) {
          logger.info(`📧 Email sent (Development): ${testUrl}`);
          return { success: true, messageId: info.messageId, testUrl };
        }
      }

      logger.info(`📧 Email sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Email send error:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send password reset email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendPasswordResetEmail({ email, resetToken, resetUrl }) {
    const subject = 'Reset Your Password - API Token Manager';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background-color: #DC2626; padding: 40px 30px; text-align: center;">
            <div style="display: inline-flex; align-items: center; gap: 10px;">
              <div style="width: 48px; height: 48px; background-color: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <svg width="28" height="28" fill="none" stroke="#DC2626" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <span style="color: #ffffff; font-size: 20px; font-weight: 700;">API Token Manager</span>
            </div>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">
              Reset Your Password
            </h1>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              We received a request to reset your password. Click the button below to create a new password.
            </p>

            <!-- Reset Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #DC2626; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.25);">
                Reset Password
              </a>
            </div>

            <!-- Alternative Link -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #DC2626; font-size: 14px; word-break: break-all; margin: 0;">
                ${resetUrl}
              </p>
            </div>

            <!-- Expiration Warning -->
            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                ⚠️ This link will expire in 1 hour for security reasons.
              </p>
            </div>

            <!-- Security Notice -->
            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} API Token Manager. All rights reserved.
            </p>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 8px 0 0 0;">
              This email was sent to <strong>${email}</strong>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Reset Your Password - API Token Manager

      We received a request to reset your password.

      Click the link below to reset your password:
      ${resetUrl}

      This link will expire in 1 hour.

      If you didn't request this, you can safely ignore this email.
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Send email verification
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendVerificationEmail({ email, verificationToken, verificationUrl }) {
    const subject = 'Verify Your Email - API Token Manager';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background-color: #DC2626; padding: 40px 30px; text-align: center;">
            <div style="display: inline-flex; align-items: center; gap: 10px;">
              <div style="width: 48px; height: 48px; background-color: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <svg width="28" height="28" fill="none" stroke="#DC2626" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <span style="color: #ffffff; font-size: 20px; font-weight: 700;">API Token Manager</span>
            </div>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">
              Verify Your Email Address
            </h1>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              Thank you for registering! Please verify your email address to activate your account.
            </p>

            <!-- Verify Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verificationUrl}" style="display: inline-block; background-color: #DC2626; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.25);">
                Verify Email
              </a>
            </div>

            <!-- Alternative Link -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #DC2626; font-size: 14px; word-break: break-all; margin: 0;">
                ${verificationUrl}
              </p>
            </div>

            <!-- Expiration Warning -->
            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                ⚠️ This link will expire in 24 hours.
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
              If you didn't create an account, you can safely ignore this email.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} API Token Manager. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Verify Your Email - API Token Manager

      Thank you for registering!

      Click the link below to verify your email:
      ${verificationUrl}

      This link will expire in 24 hours.

      If you didn't create an account, you can safely ignore this email.
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Send team member credentials email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendTeamMemberCredentialsEmail({ email, password, firstName, lastName, organizationName, inviterName, loginUrl }) {
    const subject = `Welcome to ${organizationName} - Your Account Credentials`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${organizationName}</title>
      </head>
      <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background-color: #DC2626; padding: 40px 30px; text-align: center;">
            <div style="display: inline-flex; align-items: center; gap: 10px;">
              <div style="width: 48px; height: 48px; background-color: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <svg width="28" height="28" fill="none" stroke="#DC2626" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <span style="color: #ffffff; font-size: 20px; font-weight: 700;">API Token Manager</span>
            </div>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">
              Welcome${firstName ? `, ${firstName}` : ''}!
            </h1>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              ${inviterName} has added you to <strong>${organizationName}</strong> on API Token Manager.
            </p>

            <!-- Credentials Box -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <h2 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
                Your Login Credentials
              </h2>
              <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0;">Email</p>
                <p style="color: #111827; font-size: 16px; font-weight: 500; margin: 0;">${email}</p>
              </div>
              <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0;">Password</p>
                <p style="color: #111827; font-size: 16px; font-weight: 500; margin: 0; font-family: monospace;">${password}</p>
              </div>
            </div>

            <!-- Login Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${loginUrl}" style="display: inline-block; background-color: #DC2626; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.25);">
                Login Now
              </a>
            </div>

            <!-- Security Notice -->
            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                🔒 <strong>Security Tip:</strong> Please change your password after your first login for better security.
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
              If you have any questions or need assistance, please contact your organization administrator.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} API Token Manager. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome${firstName ? `, ${firstName}` : ''}!

      ${inviterName} has added you to ${organizationName} on API Token Manager.

      Your Login Credentials:
      Email: ${email}
      Password: ${password}

      Login here: ${loginUrl}

      Please change your password after your first login for better security.

      If you have any questions, please contact your organization administrator.
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Send invitation email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendInvitationEmail({ email, organizationName, inviterName, invitationUrl }) {
    const subject = `You're invited to join ${organizationName} - API Token Manager`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Organization Invitation</title>
      </head>
      <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background-color: #DC2626; padding: 40px 30px; text-align: center;">
            <div style="display: inline-flex; align-items: center; gap: 10px;">
              <div style="width: 48px; height: 48px; background-color: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <svg width="28" height="28" fill="none" stroke="#DC2626" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <span style="color: #ffffff; font-size: 20px; font-weight: 700;">API Token Manager</span>
            </div>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">
              You're Invited!
            </h1>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on API Token Manager.
            </p>

            <!-- Accept Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${invitationUrl}" style="display: inline-block; background-color: #DC2626; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.25);">
                Accept Invitation
              </a>
            </div>

            <!-- Alternative Link -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #DC2626; font-size: 14px; word-break: break-all; margin: 0;">
                ${invitationUrl}
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
              This invitation will expire in 7 days.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} API Token Manager. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      You're Invited to Join ${organizationName}

      ${inviterName} has invited you to join ${organizationName} on API Token Manager.

      Click the link below to accept:
      ${invitationUrl}

      This invitation will expire in 7 days.
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Convert HTML to plain text
   * @param {string} html - HTML content
   * @returns {string} Plain text
   */
  htmlToText(html) {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export default new EmailService();