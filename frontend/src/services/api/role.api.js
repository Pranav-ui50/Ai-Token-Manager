/**
 * Role API Service
 *
 * API calls for role management.
 */

import api from './axios.js';

const roleApi = {
  /**
   * Get all roles
   * @returns {Promise} Array of roles
   */
  getAll: async () => {
    const response = await api.get('/roles');
    return response.data.data;
  },

  /**
   * Get organization roles
   * @returns {Promise} Array of organization roles
   */
  getOrganizationRoles: async () => {
    const response = await api.get('/roles/organization');
    return response.data.data;
  }
};

export default roleApi;