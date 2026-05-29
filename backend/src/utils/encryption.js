/**
 * Encryption Utility
 *
 * Handles encryption and decryption of sensitive data.
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import config from '../config/index.js';

// Ensure encryption key and IV are proper lengths
const ENCRYPTION_KEY = config.encryption.key.padEnd(32, '0').slice(0, 32);
const IV_LENGTH = 16;
const IV = config.encryption.iv.padEnd(IV_LENGTH, '0').slice(0, IV_LENGTH);

/**
 * Encrypt text using AES-256-CBC
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted text (base64)
 */
export const encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypt text using AES-256-CBC
 * @param {string} encryptedText - Encrypted text
 * @returns {string} Decrypted text
 */
export const decrypt = (encryptedText) => {
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed');
  }
};

/**
 * Hash text using SHA-256
 * @param {string} text - Text to hash
 * @returns {string} Hashed text
 */
export const hash = (text) => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

/**
 * Generate random token
 * @param {number} length - Token length (default: 32)
 * @returns {string} Random token
 */
export const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate random numeric code
 * @param {number} length - Code length (default: 6)
 * @returns {string} Random numeric code
 */
export const generateNumericCode = (length = 6) => {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
};

/**
 * Generate secure random string
 * @param {number} length - String length (default: 32)
 * @returns {string} Secure random string
 */
export const generateSecureString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
};

/**
 * Generate UUID v4
 * @returns {string} UUID
 */
export const generateUUID = () => {
  return crypto.randomUUID();
};

/**
 * Create HMAC signature
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} HMAC signature
 */
export const createHmac = (data, secret) => {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - Signature to verify
 * @param {string} secret - Secret key
 * @returns {boolean} True if valid
 */
export const verifyHmac = (data, signature, secret) => {
  const expectedSignature = createHmac(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

/**
 * Hash password using bcrypt
 * @param {string} password - Password to hash
 * @param {number} saltRounds - Number of salt rounds (default: 12)
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password, saltRounds = 12) => {
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} True if match
 */
export const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

export default {
  encrypt,
  decrypt,
  hash,
  generateToken,
  generateNumericCode,
  generateSecureString,
  generateUUID,
  createHmac,
  verifyHmac,
  hashPassword,
  comparePassword
};