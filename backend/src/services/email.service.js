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
      <body style="font-family: Arial, Helvetica, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <!-- Header -->
          <div style="background-color: #DC2626; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">
              API Token Manager
            </h1>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">
              Reset Your Password
            </h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              We received a request to reset your password. Click the button below to create a new password.
            </p>

            <!-- Reset Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #DC2626; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                Reset Password
              </a>
            </div>

            <!-- Alternative Link -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #DC2626; font-size: 13px; word-break: break-all; margin: 0;">
                ${resetUrl}
              </p>
            </div>

            <!-- Expiration Warning -->
            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                <strong>Important:</strong> This link will expire in 1 hour for security reasons.
              </p>
            </div>

            <!-- Security Notice -->
            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              (c) ${new Date().getFullYear()} API Token Manager. All rights reserved.
            </p>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 8px 0 0 0;">
              This email was sent to: ${email}
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
      <body style="font-family: Arial, Helvetica, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <!-- Header -->
          <div style="background-color: #DC2626; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">
              API Token Manager
            </h1>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">
              Verify Your Email Address
            </h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              Thank you for registering! Please verify your email address to activate your account.
            </p>

            <!-- Verify Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verificationUrl}" style="display: inline-block; background-color: #DC2626; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                Verify Email
              </a>
            </div>

            <!-- Alternative Link -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #DC2626; font-size: 13px; word-break: break-all; margin: 0;">
                ${verificationUrl}
              </p>
            </div>

            <!-- Expiration Warning -->
            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                <strong>Important:</strong> This link will expire in 24 hours.
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
              If you didn't create an account, you can safely ignore this email.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              (c) ${new Date().getFullYear()} API Token Manager. All rights reserved.
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
      <body style="font-family: Arial, Helvetica, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <!-- Header -->
          <div style="background-color: #DC2626; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">
              API Token Manager
            </h1>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">
              Welcome${firstName ? `, ${firstName}` : ''}!
            </h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              ${inviterName} has added you to <strong>${organizationName}</strong> on API Token Manager.
            </p>

            <!-- Credentials Box -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
                Your Login Credentials
              </h3>
              <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0;">Email</p>
                <p style="color: #111827; font-size: 16px; font-weight: 500; margin: 0;">${email}</p>
              </div>
              <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0;">Password</p>
                <p style="color: #111827; font-size: 16px; font-weight: 500; margin: 0;">${password}</p>
              </div>
            </div>

            <!-- Login Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${loginUrl}" style="display: inline-block; background-color: #DC2626; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                Login Now
              </a>
            </div>

            <!-- Security Notice -->
            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                <strong>Security Tip:</strong> Please change your password after your first login for better security.
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
              If you have any questions or need assistance, please contact your organization administrator.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              (c) ${new Date().getFullYear()} API Token Manager. All rights reserved.
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
      <body style="font-family: Arial, Helvetica, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <!-- Header -->
          <div style="background-color: #DC2626; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">
              API Token Manager
            </h1>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">
              You're Invited!
            </h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on API Token Manager.
            </p>

            <!-- Accept Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${invitationUrl}" style="display: inline-block; background-color: #DC2626; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                Accept Invitation
              </a>
            </div>

            <!-- Alternative Link -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #DC2626; font-size: 13px; word-break: break-all; margin: 0;">
                ${invitationUrl}
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
              This invitation will expire in 7 days.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              (c) ${new Date().getFullYear()} API Token Manager. All rights reserved.
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
   * Send welcome email to new user
   * @param {Object} options - Email options
   * @param {string} options.email - User email
   * @param {string} options.firstName - User first name
   * @param {string} options.lastName - User last name (optional)
   * @param {string} options.organizationName - Organization name (optional)
   * @param {Object} options.plan - Plan details (optional)
   * @returns {Promise<Object>} Send result
   */
  async sendWelcomeEmail({ email, firstName, lastName, organizationName, plan }) {
    const subject = `Welcome to API Token Manager${firstName ? `, ${firstName}` : ''}!`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to API Token Manager</title>
      </head>
      <body style="font-family: Arial, Helvetica, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <!-- Header -->
          <div style="background-color: #DC2626; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">
              API Token Manager
            </h1>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">
              Welcome${firstName ? `, ${firstName}` : ''}!
            </h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              Thank you for joining API Token Manager. Your account has been created successfully!
            </p>

            ${organizationName ? `
            <!-- Organization Info -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #111827; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                Organization: ${organizationName}
              </h3>
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                You're the owner of this organization. You can invite team members and manage permissions from your dashboard.
              </p>
            </div>
            ` : ''}

            ${plan ? `
            <!-- Plan Info -->
            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
                Your Subscription: ${plan.name || 'Active'}
              </h3>
              ${plan.billingCycle ? `<p style="color: #92400e; font-size: 14px; margin: 0;">Billing: ${plan.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</p>` : ''}
              ${plan.credits ? `<p style="color: #92400e; font-size: 14px; margin: 4px 0 0 0;">Included Tokens: ${plan.credits.toLocaleString()}</p>` : ''}
            </div>
            ` : ''}

            <!-- Features -->
            <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #166534; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                Here's what you can do:
              </h3>
              <ul style="color: #166534; font-size: 14px; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Manage AI provider credentials securely</li>
                <li style="margin-bottom: 8px;">Track token usage across all projects</li>
                <li style="margin-bottom: 8px;">Calculate and forecast API costs</li>
                <li style="margin-bottom: 8px;">Set up alerts for usage limits</li>
                <li>Generate detailed usage reports</li>
              </ul>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${config.client?.url || 'http://localhost:3000'}/dashboard" style="display: inline-block; background-color: #DC2626; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                Go to Dashboard
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0; text-align: center;">
              Need help? Check out our <a href="${config.client?.url || 'http://localhost:3000'}/docs" style="color: #DC2626; text-decoration: none;">documentation</a> or contact our support team.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              (c) ${new Date().getFullYear()} API Token Manager. All rights reserved.
            </p>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 8px 0 0 0;">
              This email was sent to: ${email}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome${firstName ? `, ${firstName}` : ''}!

      Thank you for joining API Token Manager. Your account has been created successfully!

      ${organizationName ? `Organization: ${organizationName}` : ''}
      ${plan ? `Subscription: ${plan.name || 'Active'}` : ''}

      Here's what you can do:
      - Manage AI provider credentials securely
      - Track token usage across all projects
      - Calculate and forecast API costs
      - Set up alerts for usage limits
      - Generate detailed usage reports

      Get started: ${config.client?.url || 'http://localhost:3000'}/dashboard

      Need help? Contact our support team.

      (c) ${new Date().getFullYear()} API Token Manager. All rights reserved.
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Send subscription confirmation email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendSubscriptionConfirmationEmail({ email, firstName, organizationName, plan, paymentDetails }) {
    const subject = `Your ${plan?.name || 'Subscription'} is Active - API Token Manager`;

    const formatCurrency = (amount, currency = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase()
      }).format(amount);
    };

    const planName = plan?.name || 'Subscription';
    const planPrice = plan?.billing?.price || paymentDetails?.amount || 0;
    const currency = plan?.billing?.currency || paymentDetails?.currency || 'USD';
    const billingCycle = plan?.billingCycle || 'monthly';
    const credits = plan?.credits?.includedCredits || 0;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Confirmed - API Token Manager</title>
      </head>
      <body style="font-family: Arial, Helvetica, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <!-- Header -->
          <div style="background-color: #DC2626; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">
              API Token Manager
            </h1>
          </div>

          <!-- Success Badge -->
          <div style="text-align: center; padding: 30px 0;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; background-color: #dcfce7; border-radius: 50%; margin: 0 auto;">
              <span style="color: #22c55e; font-size: 40px; font-weight: bold;">OK</span>
            </div>
            <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin: 20px 0 8px 0;">
              Payment Successful!
            </h2>
            <p style="color: #4b5563; font-size: 16px; margin: 0;">
              Your subscription is now active
            </p>
          </div>

          <!-- Subscription Details -->
          <div style="padding: 0 30px 30px;">
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
              <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                Subscription Details
              </h3>

              <div style="border-bottom: 1px solid #e5e7eb; padding: 12px 0;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #6b7280; font-size: 14px;">Plan</span>
                  <span style="color: #111827; font-size: 14px; font-weight: 600;">${planName}</span>
                </div>
              </div>

              <div style="border-bottom: 1px solid #e5e7eb; padding: 12px 0;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #6b7280; font-size: 14px;">Amount</span>
                  <span style="color: #111827; font-size: 14px; font-weight: 600;">${formatCurrency(planPrice, currency)}${billingCycle === 'yearly' ? '/year' : '/month'}</span>
                </div>
              </div>

              <div style="border-bottom: 1px solid #e5e7eb; padding: 12px 0;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #6b7280; font-size: 14px;">Billing Cycle</span>
                  <span style="color: #111827; font-size: 14px; font-weight: 600;">${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</span>
                </div>
              </div>

              ${credits > 0 ? `
              <div style="border-bottom: 1px solid #e5e7eb; padding: 12px 0;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #6b7280; font-size: 14px;">Included Tokens</span>
                  <span style="color: #111827; font-size: 14px; font-weight: 600;">${credits.toLocaleString()}</span>
                </div>
              </div>
              ` : ''}

              <div style="padding: 12px 0;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #6b7280; font-size: 14px;">Organization</span>
                  <span style="color: #111827; font-size: 14px; font-weight: 600;">${organizationName || 'Personal'}</span>
                </div>
              </div>
            </div>

            ${paymentDetails?.transactionId ? `
            <!-- Transaction ID -->
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 12px; margin-top: 16px;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                Transaction ID: <strong>${paymentDetails.transactionId}</strong>
              </p>
            </div>
            ` : ''}

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${config.client?.url || 'http://localhost:3000'}/dashboard" style="display: inline-block; background-color: #DC2626; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                Start Using Your Plan
              </a>
            </div>

            <!-- Support -->
            <p style="color: #6b7280; font-size: 14px; margin: 0; text-align: center;">
              Questions? Contact our <a href="mailto:${config.email?.from?.address || 'support@example.com'}" style="color: #DC2626; text-decoration: none;">support team</a>
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              (c) ${new Date().getFullYear()} API Token Manager. All rights reserved.
            </p>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 8px 0 0 0;">
              This email was sent to: ${email}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Payment Successful - ${planName} is Now Active!

      Hello${firstName ? ` ${firstName}` : ''},

      Your payment has been processed successfully and your subscription is now active.

      Subscription Details:
      - Plan: ${planName}
      - Amount: ${formatCurrency(planPrice, currency)}${billingCycle === 'yearly' ? '/year' : '/month'}
      - Billing Cycle: ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}
      ${credits > 0 ? `- Included Tokens: ${credits.toLocaleString()}` : ''}
      - Organization: ${organizationName || 'Personal'}
      ${paymentDetails?.transactionId ? `- Transaction ID: ${paymentDetails.transactionId}` : ''}

      Get started: ${config.client?.url || 'http://localhost:3000'}/dashboard

      Questions? Contact our support team.

      (c) ${new Date().getFullYear()} API Token Manager. All rights reserved.
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