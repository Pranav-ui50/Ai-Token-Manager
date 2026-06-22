/**
 * Settings API Service
 *
 * API calls for user and organization settings management.
 */

import api from './axios.js';

const settingsApi = {
  // ==========================================
  // Organization Settings
  // ==========================================

  /**
   * Get organization settings
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Organization settings
   */
  getOrganizationSettings: async (organizationId) => {
    const response = await api.get(`/settings/organization/${organizationId}`);
    return response.data.data;
  },

  /**
   * Update organization settings
   * @param {string} organizationId - Organization ID
   * @param {Object} data - Settings data
   * @returns {Promise} Updated organization
   */
  updateOrganizationSettings: async (organizationId, data) => {
    const response = await api.put(`/settings/organization/${organizationId}`, data);
    return response.data.data;
  },

  // ==========================================
  // User Profile Settings
  // ==========================================

  /**
   * Get user profile
   * @returns {Promise} User profile
   */
  getProfile: async () => {
    const response = await api.get('/settings/profile');
    return response.data.data;
  },

  /**
   * Update user profile
   * @param {Object} data - Profile data
   * @returns {Promise} Updated profile
   */
  updateProfile: async (data) => {
    const response = await api.put('/settings/profile', data);
    return response.data.data;
  },

  /**
   * Upload avatar
   * @param {File} file - Avatar file
   * @returns {Promise} Avatar URL
   */
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/settings/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  },

  // ==========================================
  // Notification Settings
  // ==========================================

  /**
   * Get notification settings
   * @returns {Promise} Notification settings
   */
  getNotificationSettings: async () => {
    const response = await api.get('/settings/notifications');
    return response.data.data;
  },

  /**
   * Update notification settings
   * @param {Object} settings - Notification settings
   * @returns {Promise} Updated settings
   */
  updateNotificationSettings: async (settings) => {
    const response = await api.put('/settings/notifications', settings);
    return response.data.data;
  },

  // ==========================================
  // Security Settings
  // ==========================================

  /**
   * Change password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @param {string} confirmPassword - Confirm password
   * @returns {Promise} Success message
   */
  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    const response = await api.put('/settings/security/password', {
      currentPassword,
      newPassword,
      confirmPassword
    });
    return response.data;
  },

  /**
   * Get 2FA status
   * @returns {Promise} 2FA status
   */
  getTwoFactorStatus: async () => {
    const response = await api.get('/settings/security/2fa');
    return response.data.data;
  },

  /**
   * Setup 2FA
   * @returns {Promise} 2FA setup data (secret, QR code URL)
   */
  setupTwoFactor: async () => {
    const response = await api.post('/settings/security/2fa/setup');
    return response.data.data;
  },

  /**
   * Verify and enable 2FA
   * @param {string} token - Verification token
   * @param {string} secret - 2FA secret
   * @returns {Promise} Backup codes
   */
  verifyTwoFactor: async (token, secret) => {
    const response = await api.post('/settings/security/2fa/verify', { token, secret });
    return response.data.data;
  },

  /**
   * Disable 2FA
   * @param {string} password - User password
   * @returns {Promise} Success message
   */
  disableTwoFactor: async (password) => {
    const response = await api.delete('/settings/security/2fa', { data: { password } });
    return response.data;
  },

  /**
   * Get active sessions
   * @returns {Promise} Active sessions
   */
  getActiveSessions: async () => {
    const response = await api.get('/settings/security/sessions');
    return response.data.data;
  },

  /**
   * Revoke session
   * @param {string} sessionId - Session ID
   * @returns {Promise} Success message
   */
  revokeSession: async (sessionId) => {
    const response = await api.delete(`/settings/security/sessions/${sessionId}`);
    return response.data;
  }
};

export default settingsApi;
