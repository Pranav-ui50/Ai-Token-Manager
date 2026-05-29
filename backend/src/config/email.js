/**
 * Email Configuration
 *
 * SMTP configuration for sending emails.
 */

import nodemailer from 'nodemailer';
import config from './index.js';

// Store ethereal credentials for development
let etherealCredentials = null;

// Create transporter based on environment
const createTransporter = async () => {
  // Development: Use Ethereal Email for testing
  if (config.nodeEnv === 'development' && !config.email.smtp.host) {
    // Create real Ethereal test account
    try {
      const testAccount = await nodemailer.createTestAccount();
      etherealCredentials = testAccount;

      console.log('📧 Using Ethereal Email for development');
      console.log(`📧 Test account: ${testAccount.user}`);

      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } catch (error) {
      console.error('❌ Failed to create Ethereal account:', error.message);
      // Fallback to console logging
      return {
        sendMail: (mailOptions) => {
          console.log('📧 Email would be sent (console fallback):');
          console.log(`   To: ${mailOptions.to}`);
          console.log(`   Subject: ${mailOptions.subject}`);
          console.log(`   Body: ${mailOptions.text?.substring(0, 100)}...`);
          return Promise.resolve({ messageId: 'console-' + Date.now() });
        }
      };
    }
  }

  // Production or configured SMTP
  return nodemailer.createTransport({
    host: config.email.smtp.host,
    port: config.email.smtp.port,
    secure: config.email.smtp.secure, // true for 465, false for other ports
    auth: config.email.smtp.user ? {
      user: config.email.smtp.user,
      pass: config.email.smtp.password
    } : undefined,
    tls: {
      rejectUnauthorized: config.email.smtp.rejectUnauthorized !== false
    }
  });
};

// Email transporter instance
let transporter = null;

const getTransporter = async () => {
  if (!transporter) {
    transporter = await createTransporter();

    // Verify connection
    try {
      if (transporter.verify) {
        await transporter.verify();
        console.log('✅ Email server ready');
      }
    } catch (error) {
      console.error('❌ Email server error:', error.message);
    }
  }
  return transporter;
};

// For development: Get test account URL
const getTestMessageUrl = (info) => {
  if (etherealCredentials) {
    return nodemailer.getTestMessageUrl(info);
  }
  return null;
};

export default {
  getTransporter,
  getTestMessageUrl
};