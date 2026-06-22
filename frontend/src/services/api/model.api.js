/**
 * Model API Service
 *
 * API calls for AI model management.
 */

import api from './axios.js';

const modelApi = {
  /**
   * Create a new model
   * @param {Object} data - Model data
   * @returns {Promise} Created model
   */
  create: async (data) => {
    const response = await api.post('/models', data);
    return response.data.data;
  },

  /**
   * Get all models
   * @param {Object} params - Query parameters
   * @returns {Promise} Models with pagination
   */
  getAll: async (params = {}) => {
    const response = await api.get('/models', { params });
    // Backend returns { success: true, data: [...models], pagination: {...} }
    return {
      data: response.data.data,
      pagination: response.data.pagination
    };
  },

  /**
   * Get model by ID
   * @param {string} id - Model ID
   * @returns {Promise} Model
   */
  getById: async (id) => {
    const response = await api.get(`/models/${id}`);
    return response.data.data;
  },

  /**
   * Get model by slug
   * @param {string} slug - Model slug
   * @returns {Promise} Model
   */
  getBySlug: async (slug) => {
    const response = await api.get(`/models/slug/${slug}`);
    return response.data.data;
  },

  /**
   * Update model
   * @param {string} id - Model ID
   * @param {Object} data - Update data
   * @returns {Promise} Updated model
   */
  update: async (id, data) => {
    const response = await api.put(`/models/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete model
   * @param {string} id - Model ID
   * @returns {Promise}
   */
  delete: async (id) => {
    const response = await api.delete(`/models/${id}`);
    return response.data;
  },

  /**
   * Calculate cost for model usage
   * @param {string} id - Model ID
   * @param {number} inputTokens - Input tokens
   * @param {number} outputTokens - Output tokens
   * @returns {Promise} Cost calculation
   */
  calculateCost: async (id, inputTokens, outputTokens = 0) => {
    const response = await api.post(`/models/${id}/calculate-cost`, {
      inputTokens,
      outputTokens
    });
    return response.data.data;
  },

  /**
   * Bulk update pricing
   * @param {Array} updates - Array of pricing updates
   * @returns {Promise} Update results
   */
  bulkUpdatePricing: async (updates) => {
    const response = await api.post('/models/bulk-pricing', { updates });
    return response.data.data;
  }
};

export default modelApi;
