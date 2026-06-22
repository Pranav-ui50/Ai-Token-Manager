/**
 * Pricing History API Service
 *
 * API calls for pricing history management.
 */

import api from './axios.js';

const pricingHistoryApi = {
  /**
   * Get pricing history for a model
   * @param {string} modelId - Model ID
   * @param {Object} params - Query parameters (limit, skip)
   * @returns {Promise} Pricing history
   */
  getByModel: async (modelId, params = {}) => {
    const response = await api.get(`/pricing-history/model/${modelId}`, { params });
    return response.data.data;
  },

  /**
   * Get pricing history for a provider
   * @param {string} providerId - Provider ID
   * @param {Object} params - Query parameters (limit, skip)
   * @returns {Promise} Pricing history
   */
  getByProvider: async (providerId, params = {}) => {
    const response = await api.get(`/pricing-history/provider/${providerId}`, { params });
    return response.data.data || response.data;
  },

  /**
   * Get recent pricing changes
   * @param {Object} params - Query parameters (days, limit)
   * @returns {Promise} Recent changes
   */
  getRecentChanges: async (params = {}) => {
    const response = await api.get('/pricing-history/recent', { params });
    return response.data.data;
  },

  /**
   * Get price trends for a model
   * @param {string} modelId - Model ID
   * @param {number} days - Number of days to analyze
   * @returns {Promise} Price trends
   */
  getTrends: async (modelId, days = 30) => {
    const response = await api.get(`/pricing-history/trends/${modelId}`, { params: { days } });
    return response.data.data;
  },

  /**
   * Verify a pricing change
   * @param {string} historyId - Pricing history ID
   * @returns {Promise} Verified history
   */
  verify: async (historyId) => {
    const response = await api.put(`/pricing-history/${historyId}/verify`);
    return response.data.data;
  },

  /**
   * Compare prices between models
   * @param {Array} modelIds - Array of model IDs
   * @returns {Promise} Price comparison
   */
  comparePrices: async (modelIds) => {
    const response = await api.post('/pricing-history/compare', { modelIds });
    return response.data.data;
  },

  /**
   * Get pricing statistics
   * @param {string} providerId - Optional provider ID filter
   * @returns {Promise} Pricing statistics
   */
  getStatistics: async (providerId = null) => {
    const params = providerId ? { providerId } : {};
    const response = await api.get('/pricing-history/statistics', { params });
    return response.data.data;
  }
};

export default pricingHistoryApi;
