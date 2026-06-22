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
  },

  /**
   * Get all landing page content
   * @returns {Promise} Landing page content
   */
  getLandingContent: async () => {
    const response = await api.get('/public/landing-content');
    return response.data;
  },

  /**
   * Get specific landing page section content
   * @param {string} section - Section name (hero, howItWorks, testimonials, faq, cta)
   * @returns {Promise} Section content
   */
  getLandingSection: async (section) => {
    const response = await api.get(`/public/landing-content/${section}`);
    return response.data;
  },

  /**
   * Get all active testimonials (public)
   * @returns {Promise} Active testimonials
   */
  getTestimonials: async () => {
    const response = await api.get('/testimonials');
    return response.data;
  },

  /**
   * Get all active platform stats (public)
   * @returns {Promise} Active platform stats
   */
  getPlatformStats: async () => {
    const response = await api.get('/platform-stats');
    return response.data;
  },

  /**
   * Get public site settings (site name, description)
   * No authentication required
   * @returns {Promise} Site settings
   */
  getSiteSettings: async () => {
    const response = await api.get('/public/site-settings');
    return response.data;
  }
};

export default publicApi;