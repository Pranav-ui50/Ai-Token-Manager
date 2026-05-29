/**
 * JWT Utility
 *
 * Handles JWT token generation, verification, and refresh token management.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/index.js';

/**
 * Generate access token
 * @param {Object} payload - Token payload
 * @returns {string} Access token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} Refresh token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn
  });
};

/**
 * Generate both tokens
 * @param {Object} user - User object
 * @returns {Object} Access and refresh tokens
 */
export const generateTokens = (user) => {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    organization: user.organization?.toString() || null
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ userId: user._id.toString() });

  return {
    accessToken,
    refreshToken,
    expiresIn: parseExpirationTime(config.jwt.expiresIn)
  };
};

/**
 * Verify access token
 * @param {string} token - Access token
 * @returns {Object|null} Decoded payload or null
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {Object|null} Decoded payload or null
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    return null;
  }
};

/**
 * Decode token without verification
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date
 */
export const getTokenExpiration = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  return new Date(decoded.exp * 1000);
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired
 */
export const isTokenExpired = (token) => {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return true;
  }
  return expiration < new Date();
};

/**
 * Parse expiration time string to milliseconds
 * @param {string} expiresIn - Expiration time (e.g., '15m', '7d')
 * @returns {number} Milliseconds
 */
function parseExpirationTime(expiresIn) {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1));

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return value * 1000;
  }
}

/**
 * Generate a generic JWT token with custom payload
 * @param {Object} payload - Token payload
 * @param {Object} options - Token options
 * @returns {string} JWT token
 */
export const generateToken = (payload, options = {}) => {
  const secret = options.secret || config.jwt.secret;
  const expiresIn = options.expiresIn || config.jwt.expiresIn;

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Hash a token using SHA256
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate a random token
 * @param {number} bytes - Number of bytes (default 32)
 * @returns {string} Random token
 */
export const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
  generateToken,
  hashToken,
  generateRandomToken
};