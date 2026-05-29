/**
 * Credentials Service Tests
 *
 * Tests for the secure credentials management.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import credentialsService from '../../../src/services/credentials.service.js';

// Mock environment variables
const originalEnv = process.env;

describe('CredentialsService', () => {
  beforeEach(() => {
    // Reset process.env
    process.env = { ...originalEnv };
    // Clear cache
    credentialsService.clearCache();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt a value', () => {
      const value = 'my-secret-password';
      const encrypted = credentialsService.encrypt(value);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(value);
      expect(typeof encrypted).toBe('string');
    });

    it('should decrypt an encrypted value', () => {
      const value = 'my-secret-password';
      const encrypted = credentialsService.encrypt(value);
      const decrypted = credentialsService.decrypt(encrypted);

      expect(decrypted).toBe(value);
    });

    it('should return null for empty value', () => {
      expect(credentialsService.encrypt(null)).toBeNull();
      expect(credentialsService.encrypt('')).toBeNull();
    });

    it('should produce different encrypted values for same input', () => {
      const value = 'password123';
      const encrypted1 = credentialsService.encrypt(value);
      const encrypted2 = credentialsService.encrypt(value);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('get', () => {
    it('should get plain environment variable', () => {
      process.env.TEST_VAR = 'test-value';
      const value = credentialsService.get('TEST_VAR');

      expect(value).toBe('test-value');
    });

    it('should get encrypted environment variable', () => {
      const plainValue = 'secret-value';
      const encrypted = credentialsService.encrypt(plainValue);
      process.env.TEST_ENCRYPTED = encrypted;

      const value = credentialsService.get('TEST', { encrypted: true });

      expect(value).toBe(plainValue);
    });

    it('should return default value when not found', () => {
      const value = credentialsService.get('NONEXISTENT', { defaultValue: 'default' });

      expect(value).toBe('default');
    });

    it('should throw when required and not found', () => {
      expect(() => credentialsService.get('NONEXISTENT', { required: true }))
        .toThrow('Required credential NONEXISTENT is not set');
    });

    it('should cache values', () => {
      process.env.CACHED_VAR = 'cached-value';

      credentialsService.get('CACHED_VAR', { cache: true });
      // Delete env var
      delete process.env.CACHED_VAR;

      // Should still return cached value
      const cached = credentialsService.get('CACHED_VAR');
      expect(cached).toBe('cached-value');
    });
  });

  describe('getWithEncryptedFallback', () => {
    it('should use encrypted version when available', () => {
      const plainValue = 'encrypted-value';
      const encrypted = credentialsService.encrypt(plainValue);

      process.env.TEST_VAR = 'plain-value';
      process.env.TEST_VAR_ENCRYPTED = encrypted;

      const value = credentialsService.getWithEncryptedFallback('TEST_VAR');

      expect(value).toBe(plainValue);
    });

    it('should fallback to plain when encrypted not available', () => {
      process.env.TEST_VAR = 'plain-value';
      delete process.env.TEST_VAR_ENCRYPTED;

      credentialsService.clearCache();
      const value = credentialsService.getWithEncryptedFallback('TEST_VAR');

      expect(value).toBe('plain-value');
    });
  });

  describe('isSensitiveKey', () => {
    it('should identify sensitive keys', () => {
      expect(credentialsService.isSensitiveKey('PASSWORD')).toBe(true);
      expect(credentialsService.isSensitiveKey('API_KEY')).toBe(true);
      expect(credentialsService.isSensitiveKey('SECRET')).toBe(true);
      expect(credentialsService.isSensitiveKey('TOKEN')).toBe(true);
      expect(credentialsService.isSensitiveKey('PRIVATE_KEY')).toBe(true);
    });

    it('should not identify non-sensitive keys', () => {
      expect(credentialsService.isSensitiveKey('NAME')).toBe(false);
      expect(credentialsService.isSensitiveKey('EMAIL')).toBe(false);
      expect(credentialsService.isSensitiveKey('PORT')).toBe(false);
    });
  });

  describe('sanitizeForLogging', () => {
    it('should redact sensitive values', () => {
      const config = {
        name: 'test-app',
        password: 'secret123',
        api_key: 'key123',
        email: 'test@example.com'
      };

      const sanitized = credentialsService.sanitizeForLogging(config);

      expect(sanitized.name).toBe('test-app');
      expect(sanitized.password).toBe('***REDACTED***');
      expect(sanitized.api_key).toBe('***REDACTED***');
      expect(sanitized.email).toBe('test@example.com');
    });

    it('should handle nested objects', () => {
      const config = {
        database: {
          name: 'mydb',
          password: 'dbpass'
        },
        email: {
          smtp_password: 'smtppass'
        }
      };

      const sanitized = credentialsService.sanitizeForLogging(config);

      expect(sanitized.database.name).toBe('mydb');
      expect(sanitized.database.password).toBe('***REDACTED***');
      expect(sanitized.email.smtp_password).toBe('***REDACTED***');
    });
  });

  describe('validateCredential', () => {
    it('should validate credential format', () => {
      const result = credentialsService.validateCredential('API_KEY', 'sk_live_12345678901234567890');

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about short credentials', () => {
      const result = credentialsService.validateCredential('API_KEY', 'short');

      expect(result.warnings.some(w => w.includes('too short'))).toBe(true);
    });

    it('should warn about test credentials', () => {
      const result = credentialsService.validateCredential('API_KEY', 'test-key-123');

      expect(result.warnings.some(w => w.includes('test'))).toBe(true);
    });

    it('should fail for empty credentials', () => {
      const result = credentialsService.validateCredential('API_KEY', '');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Credential value is empty');
    });
  });

  describe('getCredentialsStatus', () => {
    it('should return status of all credentials', () => {
      process.env.JWT_SECRET = 'test-secret';
      process.env.SMTP_PASSWORD = 'test-password';
      process.env.STRIPE_SECRET_KEY = 'sk_test_key';

      const status = credentialsService.getCredentialsStatus();

      expect(status.credentials.authentication.jwtSecret).toBe(true);
      expect(status.credentials.email.smtpPassword).toBe(true);
      expect(status.credentials.payments.stripeSecretKey).toBe(true);
      expect(status.summary).toBeDefined();
    });

    it('should identify missing credentials', () => {
      delete process.env.JWT_SECRET;
      delete process.env.STRIPE_SECRET_KEY;

      const status = credentialsService.getCredentialsStatus();

      expect(status.credentials.authentication.jwtSecret).toBe(false);
      expect(status.summary.missing).toContain('authentication.jwtSecret');
    });
  });
});