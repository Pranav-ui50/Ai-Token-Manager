/**
 * Secure Credentials Service
 *
 * Provides encrypted storage and retrieval of sensitive credentials.
 * - Encrypts credentials at rest
 * - Decrypts only when needed
 * - Supports both environment variables and database storage
 * - Never logs or exposes raw credentials
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import logger from '../config/logger.js';

class CredentialsService {
  constructor() {
    // Get encryption key from environment or generate a default for development
    this.encryptionKey = this._getEncryptionKey();
    this.algorithm = 'aes-256-gcm';
    this.ivLength = 16;
    this.authTagLength = 16;
    this.saltLength = 64;

    // Cache for decrypted credentials (in-memory only)
    this.cache = new Map();

    // Sensitive credential patterns
    this.sensitivePatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /api[-_]?key/i,
      /private[-_]?key/i,
      /access[-_]?key/i,
      /auth/i,
      /credential/i
    ];
  }

  /**
   * Get encryption key from environment
   * @private
   */
  _getEncryptionKey() {
    const envKey = process.env.ENCRYPTION_KEY;

    if (!envKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_KEY environment variable is required in production');
      }
      // Development fallback - NOT SECURE FOR PRODUCTION
      logger.warn('Using default encryption key in development. Set ENCRYPTION_KEY in production!');
      return crypto.scryptSync('dev-key', 'salt', 32);
    }

    // Derive a proper key from the environment variable
    return crypto.scryptSync(envKey, 'app-credentials-salt', 32);
  }

  /**
   * Encrypt a value
   * @param {string} value - Value to encrypt
   * @returns {string} Encrypted value (base64 encoded)
   */
  encrypt(value) {
    if (!value) return null;

    const iv = crypto.randomBytes(this.ivLength);
    const salt = crypto.randomBytes(this.saltLength);

    // Create cipher
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey,
      iv
    );

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Combine salt + iv + authTag + encrypted
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);

    return combined.toString('base64');
  }

  /**
   * Decrypt a value
   * @param {string} encryptedValue - Encrypted value (base64 encoded)
   * @returns {string} Decrypted value
   */
  decrypt(encryptedValue) {
    if (!encryptedValue) return null;

    try {
      const buffer = Buffer.from(encryptedValue, 'base64');

      // Extract components
      const salt = buffer.subarray(0, this.saltLength);
      const iv = buffer.subarray(this.saltLength, this.saltLength + this.ivLength);
      const authTag = buffer.subarray(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.authTagLength
      );
      const encrypted = buffer.subarray(this.saltLength + this.ivLength + this.authTagLength);

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );

      decipher.setAuthTag(authTag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Failed to decrypt credential:', error.message);
      // Return the original value if it's not encrypted (backward compatibility)
      if (this._isLikelyEncrypted(encryptedValue)) {
        throw new Error('Failed to decrypt credential');
      }
      return encryptedValue;
    }
  }

  /**
   * Check if a value appears to be encrypted
   * @private
   */
  _isLikelyEncrypted(value) {
    try {
      const buffer = Buffer.from(value, 'base64');
      return buffer.length > this.saltLength + this.ivLength + this.authTagLength;
    } catch {
      return false;
    }
  }

  /**
   * Get a credential value
   * First checks cache, then encrypted env, then plain env
   * @param {string} key - Credential key
   * @param {Object} options - Options
   * @returns {string} Credential value
   */
  get(key, options = {}) {
    const {
      encrypted = false,  // Whether to use encrypted version
      required = false,    // Whether credential is required
      defaultValue = null, // Default value if not found
      cache = true        // Whether to cache the result
    } = options;

    // Check cache first
    if (cache && this.cache.has(key)) {
      return this.cache.get(key);
    }

    let value = null;

    // Try encrypted version first if requested
    if (encrypted) {
      const encryptedKey = `${key}_ENCRYPTED`;
      const encryptedValue = process.env[encryptedKey];

      if (encryptedValue) {
        try {
          value = this.decrypt(encryptedValue);
        } catch (error) {
          logger.error(`Failed to decrypt ${key}:`, error.message);
        }
      }
    }

    // Fall back to plain environment variable
    if (!value) {
      value = process.env[key];
    }

    // Use default if not found
    if (!value && defaultValue !== null) {
      value = defaultValue;
    }

    // Validate required
    if (!value && required) {
      throw new Error(`Required credential ${key} is not set`);
    }

    // Cache the result
    if (cache && value) {
      this.cache.set(key, value);
    }

    return value;
  }

  /**
   * Get a credential and throw if required but not set
   * @param {string} key - Credential key
   * @returns {string} Credential value
   */
  getRequired(key) {
    return this.get(key, { required: true });
  }

  /**
   * Get an encrypted credential
   * @param {string} key - Credential key (will look for KEY_ENCRYPTED)
   * @returns {string} Credential value
   */
  getEncrypted(key) {
    return this.get(key, { encrypted: true });
  }

  /**
   * Get credential with fallback to encrypted version
   * @param {string} key - Credential key
   * @returns {string} Credential value
   */
  getWithEncryptedFallback(key) {
    // Try encrypted first
    const encryptedKey = `${key}_ENCRYPTED`;
    if (process.env[encryptedKey]) {
      return this.get(key, { encrypted: true });
    }
    // Fall back to plain
    return this.get(key);
  }

  /**
   * Set a credential in the cache (in-memory only)
   * @param {string} key - Credential key
   * @param {string} value - Credential value
   */
  setCache(key, value) {
    this.cache.set(key, value);
  }

  /**
   * Clear the credentials cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Check if a key name is sensitive
   * @param {string} key - Key name
   * @returns {boolean}
   */
  isSensitiveKey(key) {
    return this.sensitivePatterns.some(pattern => pattern.test(key));
  }

  /**
   * Sanitize config for logging (remove sensitive values)
   * @param {Object} config - Configuration object
   * @returns {Object} Sanitized configuration
   */
  sanitizeForLogging(config) {
    const sanitized = { ...config };

    for (const key of Object.keys(sanitized)) {
      if (this.isSensitiveKey(key)) {
        if (typeof sanitized[key] === 'string' && sanitized[key]) {
          sanitized[key] = '***REDACTED***';
        }
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeForLogging(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Generate an encrypted value for storage
   * Useful for generating values to store in environment or config files
   * @param {string} value - Plain text value
   * @returns {string} Encrypted value
   */
  generateEncryptedValue(value) {
    return this.encrypt(value);
  }

  /**
   * Rotate encryption for a credential
   * @param {string} key - Credential key
   * @param {string} newValue - New value to encrypt
   * @returns {string} Encrypted new value
   */
  rotateCredential(key, newValue) {
    const encrypted = this.encrypt(newValue);
    // Clear from cache to force re-read
    this.cache.delete(key);
    this.cache.delete(`${key}_ENCRYPTED`);
    return encrypted;
  }

  /**
   * Validate credential format
   * @param {string} key - Credential key
   * @param {string} value - Credential value
   * @returns {Object} Validation result
   */
  validateCredential(key, value) {
    const result = {
      valid: true,
      warnings: [],
      errors: []
    };

    if (!value) {
      result.valid = false;
      result.errors.push('Credential value is empty');
      return result;
    }

    // Check for common issues
    if (value.length < 8) {
      result.warnings.push('Credential is too short (minimum 8 characters recommended)');
    }

    if (value.includes(' ') && !value.startsWith('sk_')) {
      result.warnings.push('Credential contains spaces');
    }

    // Check for test/default values
    const testPatterns = ['test', 'demo', 'example', 'default', 'xxx', 'your-', 'change-me'];
    const lowerValue = value.toLowerCase();
    for (const pattern of testPatterns) {
      if (lowerValue.includes(pattern)) {
        result.warnings.push(`Credential contains test/default pattern: "${pattern}"`);
      }
    }

    return result;
  }

  /**
   * Get all credentials status (for health check)
   * @returns {Object} Credentials status
   */
  getCredentialsStatus() {
    const credentials = {
      database: {
        mongodb: !!process.env.MONGODB_URI,
        redis: !!process.env.REDIS_URL
      },
      authentication: {
        jwtSecret: !!process.env.JWT_SECRET,
        jwtRefreshSecret: !!process.env.JWT_REFRESH_SECRET,
        sessionSecret: !!process.env.SESSION_SECRET
      },
      email: {
        smtpHost: !!process.env.SMTP_HOST,
        smtpUser: !!process.env.SMTP_USER,
        smtpPassword: !!(process.env.SMTP_PASSWORD || process.env.SMTP_PASSWORD_ENCRYPTED)
      },
      payments: {
        stripeSecretKey: !!(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_ENCRYPTED),
        stripePublishableKey: !!(process.env.STRIPE_PUBLISHABLE_KEY),
        razorpayKeyId: !!(process.env.RAZORPAY_KEY_ID),
        razorpayKeySecret: !!(process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET_ENCRYPTED)
      },
      integrations: {
        openaiApiKey: !!(process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENCRYPTED),
        anthropicApiKey: !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY_ENCRYPTED)
      }
    };

    // Mask actual values
    const maskValue = (val) => val ? '***SET***' : '***NOT_SET***';

    return {
      status: credentials,
      summary: {
        allConfigured: Object.values(credentials).every(group =>
          Object.values(group).every(v => v === true)
        ),
        missing: Object.entries(credentials).flatMap(([group, keys]) =>
          Object.entries(keys)
            .filter(([, value]) => value === false)
            .map(([key]) => `${group}.${key}`)
        )
      }
    };
  }
}

// Singleton instance
const credentialsService = new CredentialsService();

export default credentialsService;