/**
 * Integration API Service
 *
 * Handles all integration-related API requests.
 * FR-45: API Integrations
 */

import apiClient from './axios.js';

const integrationApi = {
  /**
   * Get all integrations for organization
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Integrations with pagination
   */
  getForOrganization: async (params = {}) => {
    const response = await apiClient.get('/integrations', { params });
    return response.data;
  },

  /**
   * Get integration by ID
   * @param {string} id - Integration ID
   * @returns {Promise<Object>} Integration
   */
  getById: async (id) => {
    const response = await apiClient.get(`/integrations/${id}`);
    return response.data;
  },

  /**
   * Create a new integration
   * @param {Object} data - Integration data
   * @returns {Promise<Object>} Created integration
   */
  create: async (data) => {
    const response = await apiClient.post('/integrations', data);
    return response.data;
  },

  /**
   * Update an integration
   * @param {string} id - Integration ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated integration
   */
  update: async (id, data) => {
    const response = await apiClient.put(`/integrations/${id}`, data);
    return response.data;
  },

  /**
   * Delete an integration
   * @param {string} id - Integration ID
   * @returns {Promise<Object>} Success message
   */
  delete: async (id) => {
    const response = await apiClient.delete(`/integrations/${id}`);
    return response.data;
  },

  /**
   * Test integration connection
   * @param {string} id - Integration ID
   * @returns {Promise<Object>} Test result
   */
  testConnection: async (id) => {
    const response = await apiClient.post(`/integrations/${id}/test`);
    return response.data;
  },

  /**
   * Sync integration data
   * @param {string} id - Integration ID
   * @returns {Promise<Object>} Sync result
   */
  sync: async (id) => {
    const response = await apiClient.post(`/integrations/${id}/sync`);
    return response.data;
  },

  /**
   * Toggle integration status
   * @param {string} id - Integration ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated integration
   */
  toggleStatus: async (id, status) => {
    const response = await apiClient.put(`/integrations/${id}/status`, { status });
    return response.data;
  },

  /**
   * Start a manual sync
   * @param {string} id - Integration ID
   * @returns {Promise<Object>} Sync record
   */
  startSync: async (id) => {
    const response = await apiClient.post(`/integrations/${id}/sync/start`);
    return response.data;
  },

  /**
   * Get sync status
   * @param {string} id - Integration ID
   * @returns {Promise<Object>} Last sync status
   */
  getSyncStatus: async (id) => {
    const response = await apiClient.get(`/integrations/${id}/sync/status`);
    return response.data;
  },

  /**
   * Get sync history
   * @param {string} id - Integration ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Sync history with pagination
   */
  getSyncHistory: async (id, params = {}) => {
    const response = await apiClient.get(`/integrations/${id}/sync/history`, { params });
    return response.data;
  },

  /**
   * Update sync settings
   * @param {string} id - Integration ID
   * @param {Object} settings - Sync settings
   * @returns {Promise<Object>} Updated integration
   */
  updateSyncSettings: async (id, settings) => {
    const response = await apiClient.put(`/integrations/${id}/sync/settings`, settings);
    return response.data;
  },

  /**
   * Cancel a running sync
   * @param {string} id - Integration ID
   * @param {string} syncId - Sync ID
   * @returns {Promise<Object>} Success message
   */
  cancelSync: async (id, syncId) => {
    const response = await apiClient.post(`/integrations/${id}/sync/${syncId}/cancel`);
    return response.data;
  },

  /**
   * Retry a failed sync
   * @param {string} id - Integration ID
   * @param {string} syncId - Sync ID
   * @returns {Promise<Object>} Sync record
   */
  retrySync: async (id, syncId) => {
    const response = await apiClient.post(`/integrations/${id}/sync/${syncId}/retry`);
    return response.data;
  },

  /**
   * Get sync statistics
   * @param {Object} params - Query parameters (startDate, endDate)
   * @returns {Promise<Object>} Sync statistics
   */
  getSyncStats: async (params = {}) => {
    const response = await apiClient.get('/integrations/sync/stats', { params });
    return response.data;
  }
};

export default integrationApi;