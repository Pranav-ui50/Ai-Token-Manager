/**
 * Secure Configuration
 *
 * Loads configuration with secure credential handling.
 * Encrypts sensitive credentials and never logs them.
 */

import credentialsService from './credentials.service.js';

const config = {
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  appName: process.env.APP_NAME || 'API Token Manager',
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/api-token-manager',
    dbName: process.env.MONGODB_DB_NAME || 'api-token-manager',
    options: {
      maxPoolSize: 50,
      minPoolSize: 5,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000
    }
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: credentialsService.getWithEncryptedFallback('REDIS_PASSWORD') || undefined,
    skipRedis: process.env.SKIP_REDIS === 'true'
  },

  // JWT - Use encrypted secrets in production
  jwt: {
    secret: credentialsService.getWithEncryptedFallback('JWT_SECRET') || 'default-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: credentialsService.getWithEncryptedFallback('JWT_REFRESH_SECRET') || 'default-refresh-secret-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Session
  session: {
    secret: credentialsService.getWithEncryptedFallback('SESSION_SECRET') || 'default-session-secret',
    maxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 86400000
  },

  // Two-Factor Authentication
  otp: {
    issuer: process.env.OTP_ISSUER || 'API Token Manager'
  },

  // Password
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12
  },
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 8,
    resetExpires: parseInt(process.env.PASSWORD_RESET_EXPIRES, 10) || 3600000
  },

  // Rate Limiting (higher limits in development)
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: process.env.NODE_ENV === 'development'
      ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 10000
      : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10
  },

  // Email - Secure credential handling
  email: {
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      // Use encrypted password if available, fallback to plain
      password: credentialsService.getWithEncryptedFallback('SMTP_PASSWORD') || '',
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
    },
    from: {
      name: process.env.EMAIL_FROM_NAME || 'API Token Manager',
      address: process.env.EMAIL_FROM_ADDRESS || 'noreply@apitokenmanager.com'
    }
  },

  // Client URLs
  client: {
    url: process.env.CLIENT_URL || 'http://localhost:5173',
    adminUrl: process.env.ADMIN_URL || 'http://localhost:5173'
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') || ['Content-Type', 'Authorization', 'X-Organization-ID']
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug'
  },

  // Feature Flags
  features: {
    enable2FA: process.env.ENABLE_2FA === 'true',
    enableRegistration: process.env.ENABLE_REGISTRATION === 'true',
    enablePasswordReset: process.env.ENABLE_PASSWORD_RESET === 'true'
  },

  // Encryption
  encryption: {
    key: credentialsService.getWithEncryptedFallback('ENCRYPTION_KEY') || 'default-32-character-encryption',
    iv: process.env.ENCRYPTION_IV || 'default-16-char-iv'
  },

  // Payment Providers - Secure credential handling
  stripe: {
    secretKey: credentialsService.getWithEncryptedFallback('STRIPE_SECRET_KEY') || null,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    webhookSecret: credentialsService.getWithEncryptedFallback('STRIPE_WEBHOOK_SECRET') || null,
    starterPriceId: process.env.STRIPE_STARTER_PRICE_ID || null,
    professionalPriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || null
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || null,
    keySecret: credentialsService.getWithEncryptedFallback('RAZORPAY_KEY_SECRET') || null,
    webhookSecret: credentialsService.getWithEncryptedFallback('RAZORPAY_WEBHOOK_SECRET') || null,
    starterPlanId: process.env.RAZORPAY_STARTER_PLAN_ID || null,
    professionalPlanId: process.env.RAZORPAY_PROFESSIONAL_PLAN_ID || null
  },

  // AI Provider API Keys - Secure credential handling
  openai: {
    apiKey: credentialsService.getWithEncryptedFallback('OPENAI_API_KEY') || null
  },

  anthropic: {
    apiKey: credentialsService.getWithEncryptedFallback('ANTHROPIC_API_KEY') || null
  }
};

// Validation for production
if (config.nodeEnv === 'production') {
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'ENCRYPTION_KEY'
  ];

  const missing = requiredEnvVars.filter(env => !process.env[env]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables in production: ${missing.join(', ')}`);
    process.exit(1);
  }
}

export default config;