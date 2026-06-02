/**
 * Public API Service
 *
 * API calls for public landing page - no authentication required.
 */

import api from './axios.js';

const publicApi = {
  /**
   * Get all public plans
   * @returns {Promise} Public plans
   */
  getPlans: async () => {
    const response = await api.get('/public/plans');
    return response.data;
  },

  /**
   * Get single public plan by ID
   * @param {string} id - Plan ID
   * @returns {Promise} Public plan
   */
  getPlanById: async (id) => {
    const response = await api.get(`/public/plans/${id}`);
    return response.data;
  },

  /**
   * Get all public providers
   * @returns {Promise} Public providers
   */
  getProviders: async () => {
    const response = await api.get('/public/providers');
    return response.data;
  },

  /**
   * Get single public provider by ID or slug
   * @param {string} id - Provider ID or slug
   * @returns {Promise} Public provider
   */
  getProviderById: async (id) => {
    const response = await api.get(`/public/providers/${id}`);
    return response.data;
  },

  /**
   * Get public platform statistics
   * @returns {Promise} Platform stats
   */
  getStats: async () => {
    const response = await api.get('/public/stats');
    return response.data;
  },

  /**
   * Get public features
   * @returns {Promise} Public features
   */
  getFeatures: async () => {
    const response = await api.get('/public/features');
    return response.data;
  }
};

export default publicApi;