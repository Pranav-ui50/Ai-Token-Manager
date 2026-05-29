/**
 * Email Templates Service
 *
 * Handles email template rendering for transactional emails.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import handlebars from 'handlebars';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailTemplateService {
  constructor() {
    this.templatesDir = path.join(__dirname, 'templates');
    this.cache = new Map();
    this.registerHelpers();
  }

  /**
   * Register Handlebars helpers
   */
  registerHelpers() {
    // Format currency
    handlebars.registerHelper('currency', (amount, currency = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
      }).format(amount);
    });

    // Format date
    handlebars.registerHelper('date', (date, format = 'long') => {
      const d = new Date(date);
      const formats = {
        short: { month: 'short', day: 'numeric' },
        medium: { month: 'short', day: 'numeric', year: 'numeric' },
        long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
        datetime: { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      };
      return d.toLocaleDateString('en-US', formats[format] || formats.long);
    });

    // Format number with commas
    handlebars.registerHelper('number', (num) => {
      return num?.toLocaleString() || '0';
    });

    // Capitalize
    handlebars.registerHelper('capitalize', (str) => {
      return str?.charAt(0).toUpperCase() + str?.slice(1).toLowerCase() || '';
    });

    // Equality check
    handlebars.registerHelper('eq', (a, b) => a === b);

    // Greater than
    handlebars.registerHelper('gt', (a, b) => a > b);

    // Less than
    handlebars.registerHelper('lt', (a, b) => a < b);

    // Add
    handlebars.registerHelper('add', (a, b) => a + b);

    // Subtract
    handlebars.registerHelper('subtract', (a, b) => a - b);

    // Multiply
    handlebars.registerHelper('multiply', (a, b) => a * b);
  }

  /**
   * Load template from file
   */
  loadTemplate(templateName) {
    if (this.cache.has(templateName)) {
      return this.cache.get(templateName);
    }

    const templatePath = path.join(this.templatesDir, `${templateName}.html`);

    try {
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const compiled = handlebars.compile(templateContent);
      this.cache.set(templateName, compiled);
      return compiled;
    } catch (error) {
      logger.error(`Failed to load email template: ${templateName}`, error);
      return null;
    }
  }

  /**
   * Render template with data
   */
  render(templateName, data) {
    const template = this.loadTemplate(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Add default data
    const templateData = {
      ...data,
      year: new Date().getFullYear(),
      appName: process.env.APP_NAME || 'API Token Manager',
      appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com'
    };

    return template(templateData);
  }

  /**
   * Render both HTML and text versions
   */
  renderWithText(templateName, data) {
    const html = this.render(templateName, data);
    const text = this.htmlToText(html);

    return { html, text };
  }

  /**
   * Convert HTML to plain text
   */
  htmlToText(html) {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  // ==========================================
  // Template Methods
  // ==========================================

  /**
   * Welcome email template
   */
  welcome(data) {
    return this.renderWithText('welcome', {
      subject: `Welcome to ${process.env.APP_NAME || 'API Token Manager'}!`,
      ...data
    });
  }

  /**
   * Email verification template
   */
  verifyEmail(data) {
    return this.renderWithText('verify-email', {
      subject: 'Verify your email address',
      ...data
    });
  }

  /**
   * Password reset template
   */
  passwordReset(data) {
    return this.renderWithText('password-reset', {
      subject: 'Reset your password',
      ...data
    });
  }

  /**
   * Password changed notification
   */
  passwordChanged(data) {
    return this.renderWithText('password-changed', {
      subject: 'Your password has been changed',
      ...data
    });
  }

  /**
   * Organization invite template
   */
  organizationInvite(data) {
    return this.renderWithText('organization-invite', {
      subject: `You've been invited to join ${data.organizationName}`,
      ...data
    });
  }

  /**
   * Invoice email template
   */
  invoice(data) {
    return this.renderWithText('invoice', {
      subject: `Invoice ${data.invoiceNumber} from ${process.env.APP_NAME || 'API Token Manager'}`,
      ...data
    });
  }

  /**
   * Payment success template
   */
  paymentSuccess(data) {
    return this.renderWithText('payment-success', {
      subject: 'Payment successful',
      ...data
    });
  }

  /**
   * Payment failed template
   */
  paymentFailed(data) {
    return this.renderWithText('payment-failed', {
      subject: 'Payment failed',
      ...data
    });
  }

  /**
   * Subscription created template
   */
  subscriptionCreated(data) {
    return this.renderWithText('subscription-created', {
      subject: `Your ${data.planName} subscription is active`,
      ...data
    });
  }

  /**
   * Subscription cancelled template
   */
  subscriptionCancelled(data) {
    return this.renderWithText('subscription-cancelled', {
      subject: 'Your subscription has been cancelled',
      ...data
    });
  }

  /**
   * Usage alert template
   */
  usageAlert(data) {
    return this.renderWithText('usage-alert', {
      subject: `Usage alert: ${data.percentage}% of ${data.limitType} used`,
      ...data
    });
  }

  /**
   * API key created template
   */
  apiKeyCreated(data) {
    return this.renderWithText('api-key-created', {
      subject: 'New API key created',
      ...data
    });
  }

  /**
   * Two-factor enabled template
   */
  twoFactorEnabled(data) {
    return this.renderWithText('two-factor-enabled', {
      subject: 'Two-factor authentication enabled',
      ...data
    });
  }

  /**
   * Two-factor disabled template
   */
  twoFactorDisabled(data) {
    return this.renderWithText('two-factor-disabled', {
      subject: 'Two-factor authentication disabled',
      ...data
    });
  }

  /**
   * Weekly report template
   */
  weeklyReport(data) {
    return this.renderWithText('weekly-report', {
      subject: 'Your weekly usage report',
      ...data
    });
  }

  /**
   * Custom notification template
   */
  customNotification(data) {
    return this.renderWithText('custom-notification', {
      subject: data.subject || 'Notification',
      ...data
    });
  }
}

export default new EmailTemplateService();