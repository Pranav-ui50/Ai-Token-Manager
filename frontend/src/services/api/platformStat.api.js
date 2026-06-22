/**
 * Platform Statistics API Service
 *
 * Handles all platform statistics-related API calls.
 */

import api from './axios.js';

const platformStatApi = {
  /**
   * Get all active platform stats (public)
   */
  getActive: async () => {
    const response = await api.get('/platform-stats');
    return response.data;
  },

  /**
   * Get all platform stats (admin)
   */
  getAll: async () => {
    const response = await api.get('/platform-stats/admin');
    return response.data;
  },

  /**
   * Get stat by key
   */
  getByKey: async (key) => {
    const response = await api.get(`/platform-stats/admin/key/${key}`);
    return response.data;
  },

  /**
   * Update platform stat by ID
   */
  update: async (id, data) => {
    const response = await api.put(`/platform-stats/admin/${id}`, data);
    return response.data;
  },

  /**
   * Update platform stat by key
   */
  updateByKey: async (key, data) => {
    const response = await api.put(`/platform-stats/admin/key/${key}`, data);
    return response.data;
  },

  /**
   * Reorder platform stats
   */
  reorder: async (orderIds) => {
    const response = await api.patch('/platform-stats/admin/reorder', { orderIds });
    return response.data;
  },

  /**
   * Initialize default stats
   */
  initializeDefaults: async () => {
    const response = await api.post('/platform-stats/admin/initialize');
    return response.data;
  }
};

export default platformStatApi;
