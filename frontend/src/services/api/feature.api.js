/**
 * Feature API Service
 *
 * Handles all feature-related API calls.
 */

import api from './axios.js';

const featureApi = {
  /**
   * Create a new feature
   * @param {Object} featureData - Feature data
   * @returns {Promise<Object>} Created feature
   */
  create: async (featureData) => {
    const response = await api.post('/features', featureData);
    // Backend returns { success: true, message: '...', data: { feature } }
    return response.data;
  },

  /**
   * Get all features
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Features with pagination
   */
  getAll: async (params = {}) => {
    const response = await api.get('/features', { params });
    return response.data;
  },

  /**
   * Get features by project
   * @param {string} projectId - Project ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Features
   */
  getByProject: async (projectId, params = {}) => {
    const response = await api.get('/features', { params: { project: projectId, ...params } });
    return response.data;
  },

  /**
   * Get feature by ID
   * @param {string} id - Feature ID
   * @returns {Promise<Object>} Feature
   */
  getById: async (id) => {
    const response = await api.get(`/features/${id}`);
    return response.data;
  },

  /**
   * Update feature
   * @param {string} id - Feature ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated feature
   */
  update: async (id, updateData) => {
    const response = await api.put(`/features/${id}`, updateData);
    return response.data;
  },

  /**
   * Delete feature
   * @param {string} id - Feature ID
   * @returns {Promise<Object>} Success message
   */
  delete: async (id) => {
    const response = await api.delete(`/features/${id}`);
    return response.data;
  },

  /**
   * Get feature statistics
   * @returns {Promise<Object>} Statistics
   */
  getStats: async () => {
    const response = await api.get('/features/stats');
    return response.data;
  },

  /**
   * Get features by category
   * @param {string} category - Category
   * @returns {Promise<Object>} Features
   */
  getByCategory: async (category) => {
    const response = await api.get(`/features/category/${category}`);
    return response.data;
  },

  /**
   * Bulk update status
   * @param {Array} featureIds - Feature IDs
   * @param {string} status - New status
   * @returns {Promise<Object>} Update result
   */
  bulkUpdateStatus: async (featureIds, status) => {
    const response = await api.patch('/features/bulk/status', { featureIds, status });
    return response.data;
  },

  /**
   * Calculate cost estimate
   * @param {string} id - Feature ID
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Cost estimate
   */
  calculateCost: async (id, options = {}) => {
    const response = await api.post(`/features/${id}/calculate-cost`, options);
    return response.data;
  }
};

export default featureApi;