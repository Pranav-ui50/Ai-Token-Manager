/**
 * Auth API Service
 *
 * Handles all authentication-related API calls.
 */

import apiClient from './axios.js';

const authApi = {
  /**
   * Register a new user
   * @param {Object} data - Registration data
   * @returns {Promise}
   */
  register: async (data) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  /**
   * Login user
   * @param {Object} data - Login credentials
   * @returns {Promise}
   */
  login: async (data) => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  /**
   * Logout user
   * @returns {Promise}
   */
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise}
   */
  refreshToken: async (refreshToken) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise}
   */
  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password with token
   * @param {Object} data - Reset data
   * @returns {Promise}
   */
  resetPassword: async (data) => {
    const response = await apiClient.post('/auth/reset-password', data);
    return response.data;
  },

  /**
   * Verify Email ID
   * @param {string} token - Verification token
   * @returns {Promise}
   */
  verifyEmail: async (token) => {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  },

  /**
   * Resend verification email
   * @param {string} email - User email
   * @returns {Promise}
   */
  resendVerification: async (email) => {
    const response = await apiClient.post('/auth/resend-verification', { email });
    return response.data;
  },

  /**
   * Get current user
   * @returns {Promise}
   */
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Update user profile
   * @param {Object} data - Profile data
   * @returns {Promise}
   */
  updateProfile: async (data) => {
    const response = await apiClient.put('/auth/profile', data);
    return response.data;
  },

  /**
   * Change password
   * @param {Object} data - Password data
   * @returns {Promise}
   */
  changePassword: async (data) => {
    const response = await apiClient.put('/auth/password', data);
    return response.data;
  },

  /**
   * Enable two-factor authentication
   * @returns {Promise}
   */
  enableTwoFactor: async () => {
    const response = await apiClient.post('/auth/2fa/enable');
    return response.data;
  },

  /**
   * Verify two-factor authentication
   * @param {string} code - 2FA code
   * @returns {Promise}
   */
  verifyTwoFactor: async (code) => {
    const response = await apiClient.post('/auth/2fa/verify', { code });
    return response.data;
  },

  /**
   * Disable two-factor authentication
   * @returns {Promise}
   */
  disableTwoFactor: async () => {
    const response = await apiClient.post('/auth/2fa/disable');
    return response.data;
  }
};

export default authApi;
