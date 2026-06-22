/**
 * Project API Service
 *
 * Handles all project-related API requests.
 */

import apiClient from './axios.js';

const projectApi = {
  /**
   * Get all projects for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Projects
   */
  getForOrganization: async (organizationId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);

    const response = await apiClient.get(`/projects/organization/${organizationId}?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Get project by ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project
   */
  getById: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}`);
    return response.data.data;
  },

  /**
   * Create a new project
   * @param {Object} data - Project data
   * @returns {Promise<Object>} Created project
   */
  create: async (data) => {
    const response = await apiClient.post('/projects', data);
    return response.data.data;
  },

  /**
   * Update a project
   * @param {string} projectId - Project ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated project
   */
  update: async (projectId, data) => {
    const response = await apiClient.put(`/projects/${projectId}`, data);
    return response.data.data;
  },

  /**
   * Delete a project
   * @param {string} projectId - Project ID
   * @returns {Promise<void>}
   */
  delete: async (projectId) => {
    await apiClient.delete(`/projects/${projectId}`);
  },

  /**
   * Get project statistics
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project statistics
   */
  getStats: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/stats`);
    return response.data.data;
  },

  /**
   * Archive a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Archived project
   */
  archive: async (projectId) => {
    const response = await apiClient.put(`/projects/${projectId}/archive`);
    return response.data.data;
  },

  /**
   * Restore an archived project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Restored project
   */
  restore: async (projectId) => {
    const response = await apiClient.put(`/projects/${projectId}/restore`);
    return response.data.data;
  }
};

export default projectApi;
