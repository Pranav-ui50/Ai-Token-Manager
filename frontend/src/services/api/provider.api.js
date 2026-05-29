/**
 * Provider API Service
 *
 * API calls for AI provider management.
 */

import api from './axios.js';

const providerApi = {
  /**
   * Create a new provider
   * @param {Object} data - Provider data
   * @returns {Promise} Created provider
   */
  create: async (data) => {
    const response = await api.post('/providers', data);
    return response.data.data;
  },

  /**
   * Get all providers
   * @param {Object} params - Query parameters
   * @returns {Promise} Providers with pagination
   */
  getAll: async (params = {}) => {
    const response = await api.get('/providers', { params });
    return {
      providers: response.data.data || [],
      pagination: response.data.pagination || {}
    };
  },

  /**
   * Get provider by ID
   * @param {string} id - Provider ID
   * @returns {Promise} Provider
   */
  getById: async (id) => {
    const response = await api.get(`/providers/${id}`);
    return response.data.data;
  },

  /**
   * Get provider by slug
   * @param {string} slug - Provider slug
   * @returns {Promise} Provider
   */
  getBySlug: async (slug) => {
    const response = await api.get(`/providers/slug/${slug}`);
    return response.data.data;
  },

  /**
   * Update provider
   * @param {string} id - Provider ID
   * @param {Object} data - Update data
   * @returns {Promise} Updated provider
   */
  update: async (id, data) => {
    const response = await api.put(`/providers/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete provider
   * @param {string} id - Provider ID
   * @returns {Promise}
   */
  delete: async (id) => {
    const response = await api.delete(`/providers/${id}`);
    return response.data;
  },

  /**
   * Get provider models
   * @param {string} providerId - Provider ID
   * @param {Object} params - Query parameters
   * @returns {Promise} Models
   */
  getModels: async (providerId, params = {}) => {
    const response = await api.get(`/providers/${providerId}/models`, { params });
    return response.data.data;
  }
};

export default providerApi;