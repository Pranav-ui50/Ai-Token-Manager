/**
 * Plan API Service
 *
 * Handles all plan-related API calls.
 */

import api from './axios.js';

const planApi = {
  /**
   * Create a new plan
   * @param {Object} planData - Plan data
   * @returns {Promise<Object>} Created plan
   */
  create: (planData) =>
    api.post('/plans', planData),

  /**
   * Get all plans
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Plans with pagination
   */
  getAll: (params = {}) =>
    api.get('/plans', { params }),

  /**
   * Get public plans
   * @returns {Promise<Object>} Public plans
   */
  getPublic: () =>
    api.get('/plans/public'),

  /**
   * Get plan by ID
   * @param {string} id - Plan ID
   * @returns {Promise<Object>} Plan
   */
  getById: (id) =>
    api.get(`/plans/${id}`),

  /**
   * Get plan by slug
   * @param {string} slug - Plan slug
   * @returns {Promise<Object>} Plan
   */
  getBySlug: (slug) =>
    api.get(`/plans/slug/${slug}`),

  /**
   * Update plan
   * @param {string} id - Plan ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated plan
   */
  update: (id, updateData) =>
    api.put(`/plans/${id}`, updateData),

  /**
   * Delete plan
   * @param {string} id - Plan ID
   * @returns {Promise<Object>} Success message
   */
  delete: (id) =>
    api.delete(`/plans/${id}`),

  /**
   * Get plan statistics
   * @returns {Promise<Object>} Statistics
   */
  getStats: () =>
    api.get('/plans/stats'),

  /**
   * Compare multiple plans
   * @param {Array} planIds - Plan IDs to compare
   * @returns {Promise<Object>} Comparison data
   */
  compare: (planIds) =>
    api.post('/plans/compare', { planIds }),

  /**
   * Clone a plan
   * @param {string} id - Plan ID to clone
   * @param {Object} options - Clone options
   * @returns {Promise<Object>} Cloned plan
   */
  clone: (id, options = {}) =>
    api.post(`/plans/${id}/clone`, options),

  /**
   * Set default plan
   * @param {string} id - Plan ID
   * @returns {Promise<Object>} Updated plan
   */
  setDefault: (id) =>
    api.patch(`/plans/${id}/set-default`),

  /**
   * Reorder plans
   * @param {Array} planOrders - Array of { id, displayOrder }
   * @returns {Promise<Object>} Success message
   */
  reorder: (planOrders) =>
    api.patch('/plans/reorder', { planOrders }),

  /**
   * Calculate profitability for all plans
   * @returns {Promise<Object>} Calculation results
   */
  calculateProfitability: () =>
    api.post('/plans/calculate-profitability')
};

export default planApi;
