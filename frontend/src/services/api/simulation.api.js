/**
 * Simulation API Service
 *
 * API calls for simulation management.
 */

import api from './axios.js';

const simulationApi = {
  /**
   * Create a new simulation
   * @param {Object} data - Simulation data
   * @returns {Promise} Created simulation
   */
  create: async (data) => {
    const response = await api.post('/simulations', data);
    return response.data.data;
  },

  /**
   * Get simulation by ID
   * @param {string} simulationId - Simulation ID
   * @returns {Promise} Simulation
   */
  getById: async (simulationId) => {
    const response = await api.get(`/simulations/${simulationId}`);
    return response.data.data;
  },

  /**
   * Get simulations for organization
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Optional filters
   * @returns {Promise} Simulations
   */
  getForOrganization: async (organizationId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);

    const response = await api.get(`/simulations/organization/${organizationId}?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Update simulation
   * @param {string} simulationId - Simulation ID
   * @param {Object} data - Update data
   * @returns {Promise} Updated simulation
   */
  update: async (simulationId, data) => {
    const response = await api.put(`/simulations/${simulationId}`, data);
    return response.data.data;
  },

  /**
   * Delete simulation
   * @param {string} simulationId - Simulation ID
   * @returns {Promise}
   */
  delete: async (simulationId) => {
    const response = await api.delete(`/simulations/${simulationId}`);
    return response.data;
  },

  /**
   * Run simulation
   * @param {string} simulationId - Simulation ID
   * @returns {Promise} Simulation with results
   */
  run: async (simulationId) => {
    const response = await api.post(`/simulations/${simulationId}/run`);
    return response.data.data;
  },

  /**
   * Compare simulations
   * @param {Array} simulationIds - Array of simulation IDs
   * @returns {Promise} Comparison results
   */
  compare: async (simulationIds) => {
    const response = await api.post('/simulations/compare', { simulationIds });
    return response.data.data;
  },

  /**
   * Get simulation statistics
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Statistics
   */
  getStatistics: async (organizationId) => {
    const response = await api.get(`/simulations/statistics/${organizationId}`);
    return response.data.data;
  },

  /**
   * Duplicate simulation
   * @param {string} simulationId - Simulation ID
   * @returns {Promise} Duplicated simulation
   */
  duplicate: async (simulationId) => {
    const response = await api.post(`/simulations/${simulationId}/duplicate`);
    return response.data.data;
  },

  /**
   * Get simulation templates
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Templates
   */
  getTemplates: async (organizationId) => {
    const response = await api.get('/simulations/templates', {
      params: { organizationId }
    });
    return response.data.data;
  }
};

export default simulationApi;