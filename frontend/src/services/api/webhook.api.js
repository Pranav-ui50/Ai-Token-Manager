/**
 * Webhook API Service
 *
 * Handles all webhook-related API requests.
 * FR-46: Webhook Configurations
 */

import apiClient from './axios.js';

const webhookApi = {
  /**
   * Get available webhook events
   * @returns {Promise<Object>} Available events grouped by category
   */
  getAvailableEvents: async () => {
    const response = await apiClient.get('/webhooks/events');
    return response.data;
  },

  /**
   * Get all webhooks for organization
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Webhooks with pagination
   */
  getForOrganization: async (params = {}) => {
    const response = await apiClient.get('/webhooks', { params });
    return response.data;
  },

  /**
   * Get webhook by ID
   * @param {string} id - Webhook ID
   * @returns {Promise<Object>} Webhook
   */
  getById: async (id) => {
    const response = await apiClient.get(`/webhooks/${id}`);
    return response.data;
  },

  /**
   * Create a new webhook
   * @param {Object} data - Webhook data
   * @returns {Promise<Object>} Created webhook with secret key
   */
  create: async (data) => {
    const response = await apiClient.post('/webhooks', data);
    return response.data;
  },

  /**
   * Update a webhook
   * @param {string} id - Webhook ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated webhook
   */
  update: async (id, data) => {
    const response = await apiClient.put(`/webhooks/${id}`, data);
    return response.data;
  },

  /**
   * Delete a webhook
   * @param {string} id - Webhook ID
   * @returns {Promise<Object>} Success message
   */
  delete: async (id) => {
    const response = await apiClient.delete(`/webhooks/${id}`);
    return response.data;
  },

  /**
   * Test a webhook
   * @param {string} id - Webhook ID
   * @returns {Promise<Object>} Test result
   */
  test: async (id) => {
    const response = await apiClient.post(`/webhooks/${id}/test`);
    return response.data;
  },

  /**
   * Toggle webhook status
   * @param {string} id - Webhook ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated webhook
   */
  toggleStatus: async (id, status) => {
    const response = await apiClient.put(`/webhooks/${id}/status`, { status });
    return response.data;
  },

  /**
   * Regenerate webhook secret
   * @param {string} id - Webhook ID
   * @returns {Promise<Object>} New secret key
   */
  regenerateSecret: async (id) => {
    const response = await apiClient.post(`/webhooks/${id}/regenerate-secret`);
    return response.data;
  },

  /**
   * Get webhook delivery history
   * @param {string} id - Webhook ID
   * @returns {Promise<Array>} Delivery history
   */
  getDeliveryHistory: async (id) => {
    const response = await apiClient.get(`/webhooks/${id}/history`);
    return response.data;
  }
};

export default webhookApi;