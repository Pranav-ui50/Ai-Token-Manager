/**
 * Admin API Service
 *
 * API calls for super admin operations.
 */

import api from './axios.js';

const adminApi = {
  /**
   * Get system statistics
   * @returns {Promise} System stats
   */
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data.data;
  },

  /**
   * Get all organizations with filtering and pagination
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search query
   * @param {string} params.status - Filter by status
   * @param {string} params.plan - Filter by plan
   * @returns {Promise} Organizations list
   */
  getOrganizations: async (params = {}) => {
    const response = await api.get('/admin/organizations', { params });
    return response.data.data;
  },

  /**
   * Get organization by ID with details
   * @param {string} id - Organization ID
   * @returns {Promise} Organization details
   */
  getOrganizationById: async (id) => {
    const response = await api.get(`/admin/organizations/${id}`);
    return response.data.data;
  },

  /**
   * Create new organization
   * @param {Object} data - Organization data
   * @returns {Promise} Created organization
   */
  createOrganization: async (data) => {
    const response = await api.post('/admin/organizations', data);
    return response.data.data;
  },

  /**
   * Update organization status
   * @param {string} id - Organization ID
   * @param {string} status - New status
   * @returns {Promise} Updated organization
   */
  updateOrganizationStatus: async (id, status) => {
    const response = await api.patch(`/admin/organizations/${id}/status`, { status });
    return response.data.data;
  },

  /**
   * Update organization plan
   * @param {string} id - Organization ID
   * @param {string} plan - New plan
   * @returns {Promise} Updated organization
   */
  updateOrganizationPlan: async (id, plan) => {
    const response = await api.patch(`/admin/organizations/${id}/plan`, { plan });
    return response.data.data;
  },

  /**
   * Get all users with filtering
   * @param {Object} params - Query parameters
   * @returns {Promise} Users list
   */
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data.data;
  },

  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Promise} User details
   */
  getUserById: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data.data;
  },

  /**
   * Update user status
   * @param {string} id - User ID
   * @param {string} status - New status ('active' or 'inactive')
   * @returns {Promise} Updated user
   */
  updateUserStatus: async (id, status) => {
    const response = await api.patch(`/admin/users/${id}/status`, { status });
    return response.data.data;
  },

  /**
   * Update user role
   * @param {string} id - User ID
   * @param {string} roleId - New role ID
   * @returns {Promise} Updated user
   */
  updateUserRole: async (id, roleId) => {
    const response = await api.patch(`/admin/users/${id}/role`, { roleId });
    return response.data.data;
  },

  /**
   * Get all providers with model counts
   * @param {Object} params - Query parameters
   * @returns {Promise} Providers list
   */
  getProviders: async (params = {}) => {
    const response = await api.get('/admin/providers', { params });
    return response.data.data;
  },

  /**
   * Get provider by ID with models
   * @param {string} id - Provider ID
   * @returns {Promise} Provider details with models
   */
  getProviderById: async (id) => {
    const response = await api.get(`/admin/providers/${id}`);
    return response.data.data;
  },

  /**
   * Create new provider
   * @param {Object} data - Provider data
   * @returns {Promise} Created provider
   */
  createProvider: async (data) => {
    const response = await api.post('/admin/providers', data);
    return response.data.data;
  },

  /**
   * Update provider
   * @param {string} id - Provider ID
   * @param {Object} data - Update data
   * @returns {Promise} Updated provider
   */
  updateProvider: async (id, data) => {
    const response = await api.put(`/admin/providers/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete provider
   * @param {string} id - Provider ID
   * @returns {Promise}
   */
  deleteProvider: async (id) => {
    const response = await api.delete(`/admin/providers/${id}`);
    return response.data;
  },

  /**
   * Toggle provider status
   * @param {string} id - Provider ID
   * @param {boolean} isActive - Active status
   * @returns {Promise} Updated provider
   */
  toggleProviderStatus: async (id, isActive) => {
    const response = await api.patch(`/admin/providers/${id}/status`, { isActive });
    return response.data.data;
  },

  /**
   * Get all models with filtering
   * @param {Object} params - Query parameters
   * @returns {Promise} Models list
   */
  getModels: async (params = {}) => {
    const response = await api.get('/admin/models', { params });
    return response.data.data;
  },

  /**
   * Get model by ID
   * @param {string} id - Model ID
   * @returns {Promise} Model details
   */
  getModelById: async (id) => {
    const response = await api.get(`/admin/models/${id}`);
    return response.data.data;
  },

  /**
   * Create new model
   * @param {Object} data - Model data
   * @returns {Promise} Created model
   */
  createModel: async (data) => {
    const response = await api.post('/admin/models', data);
    return response.data.data;
  },

  /**
   * Update model
   * @param {string} id - Model ID
   * @param {Object} data - Update data
   * @returns {Promise} Updated model
   */
  updateModel: async (id, data) => {
    const response = await api.put(`/admin/models/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete model
   * @param {string} id - Model ID
   * @returns {Promise}
   */
  deleteModel: async (id) => {
    const response = await api.delete(`/admin/models/${id}`);
    return response.data;
  },

  /**
   * Toggle model status
   * @param {string} id - Model ID
   * @param {boolean} isActive - Active status
   * @returns {Promise} Updated model
   */
  toggleModelStatus: async (id, isActive) => {
    const response = await api.patch(`/admin/models/${id}/status`, { isActive });
    return response.data.data;
  },

  /**
   * Get dashboard statistics
   * @returns {Promise} Dashboard stats
   */
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data.data;
  },

  /**
   * Get system settings
   * @returns {Promise} System settings
   */
  getSettings: async () => {
    const response = await api.get('/admin/settings');
    return response.data;
  },

  /**
   * Update system settings
   * @param {Object} data - Settings data
   * @returns {Promise} Updated settings
   */
  updateSettings: async (data) => {
    const response = await api.put('/admin/settings', data);
    return response.data;
  },

  /**
   * Get all plans
   * @param {Object} params - Query parameters
   * @returns {Promise} Plans list
   */
  getPlans: async (params = {}) => {
    const response = await api.get('/admin/plans', { params });
    return response.data.data;
  }
};

export default adminApi;