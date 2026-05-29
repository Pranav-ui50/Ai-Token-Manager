/**
 * API Key API Service
 *
 * Handles all API key-related API requests.
 * FR-48: API Credential Management
 */

import apiClient from './axios.js';

const apiKeyApi = {
  /**
   * Get all API keys for organization
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API keys with pagination
   */
  getForOrganization: async (params = {}) => {
    const response = await apiClient.get('/api-keys', { params });
    return response.data;
  },

  /**
   * Get API keys for current user
   * @returns {Promise<Array>} API keys
   */
  getMyKeys: async () => {
    const response = await apiClient.get('/api-keys/my-keys');
    return response.data;
  },

  /**
   * Get API key by ID
   * @param {string} id - API key ID
   * @returns {Promise<Object>} API key
   */
  getById: async (id) => {
    const response = await apiClient.get(`/api-keys/${id}`);
    return response.data;
  },

  /**
   * Create a new API key
   * @param {Object} data - API key data
   * @returns {Promise<Object>} Created API key with plain key
   */
  create: async (data) => {
    const response = await apiClient.post('/api-keys', data);
    return response.data;
  },

  /**
   * Update an API key
   * @param {string} id - API key ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated API key
   */
  update: async (id, data) => {
    const response = await apiClient.put(`/api-keys/${id}`, data);
    return response.data;
  },

  /**
   * Regenerate an API key
   * @param {string} id - API key ID
   * @returns {Promise<Object>} New API key with plain key
   */
  regenerate: async (id) => {
    const response = await apiClient.post(`/api-keys/${id}/regenerate`);
    return response.data;
  },

  /**
   * Revoke an API key
   * @param {string} id - API key ID
   * @param {string} reason - Revocation reason
   * @returns {Promise<Object>} Revoked API key
   */
  revoke: async (id, reason = null) => {
    const response = await apiClient.post(`/api-keys/${id}/revoke`, { reason });
    return response.data;
  },

  /**
   * Delete an API key
   * @param {string} id - API key ID
   * @returns {Promise<Object>} Success message
   */
  delete: async (id) => {
    const response = await apiClient.delete(`/api-keys/${id}`);
    return response.data;
  },

  /**
   * Get API key usage statistics
   * @param {string} id - API key ID
   * @returns {Promise<Object>} Usage statistics
   */
  getUsageStats: async (id) => {
    const response = await apiClient.get(`/api-keys/${id}/stats`);
    return response.data;
  },

  /**
   * Validate an API key
   * @param {string} apiKey - API key to validate
   * @returns {Promise<Object>} Validation result
   */
  validate: async (apiKey) => {
    const response = await apiClient.post('/api-keys/validate', { apiKey });
    return response.data;
  }
};

export default apiKeyApi;