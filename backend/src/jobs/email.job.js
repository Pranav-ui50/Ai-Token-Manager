/**
 * Email Job Processor
 *
 * Processes email jobs from the email queue.
 */

import logger from '../config/logger.js';
import emailService from '../services/email.service.js';

/**
 * Job types
 */
const JOB_TYPES = {
  WELCOME: 'welcome',
  VERIFICATION: 'verification',
  PASSWORD_RESET: 'passwordReset',
  NOTIFICATION: 'notification',
  INVITATION: 'invitation',
  ALERT: 'alert',
  REPORT: 'report'
};

/**
 * Process email job
 * @param {Object} data - Job data
 * @param {Object} job - Bull job instance
 * @returns {Promise<Object>}
 */
async function processEmailJob(data, job) {
  const { type, to, subject, payload, options = {} } = data;

  logger.info(`Processing email job: ${type} to ${to}`);

  try {
    let result;

    switch (type) {
      case JOB_TYPES.WELCOME:
        result = await emailService.sendWelcomeEmail(to, payload);
        break;

      case JOB_TYPES.VERIFICATION:
        result = await emailService.sendVerificationEmail(to, payload);
        break;

      case JOB_TYPES.PASSWORD_RESET:
        result = await emailService.sendPasswordResetEmail(to, payload);
        break;

      case JOB_TYPES.INVITATION:
        result = await emailService.sendInvitationEmail(to, payload);
        break;

      case JOB_TYPES.NOTIFICATION:
        result = await emailService.sendNotificationEmail(to, subject, payload);
        break;

      case JOB_TYPES.ALERT:
        result = await emailService.sendAlertEmail(to, subject, payload);
        break;

      case JOB_TYPES.REPORT:
        result = await emailService.sendReportEmail(to, subject, payload);
        break;

      default:
        // Generic email
        result = await emailService.sendEmail({
          to,
          subject,
          html: payload.html || payload.body,
          text: payload.text,
          attachments: payload.attachments
        });
    }

    logger.info(`Email sent successfully: ${type} to ${to}`);
    return { success: true, messageId: result?.messageId };

  } catch (error) {
    logger.error(`Email job failed: ${type} to ${to}`, error.message);

    // Re-throw to trigger retry
    throw error;
  }
}

/**
 * Register email processor with queue service
 * @param {Object} queueService - Queue service instance
 */
async function register(queueService) {
  await queueService.registerProcessor('email', processEmailJob, 5);
  logger.info('Email job processor registered');
}

export default {
  process: processEmailJob,
  register,
  JOB_TYPES
};