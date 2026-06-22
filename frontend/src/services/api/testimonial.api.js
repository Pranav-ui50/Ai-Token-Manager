/**
 * Testimonial API Service
 *
 * Handles all testimonial-related API calls.
 */

import api from './axios.js';

const testimonialApi = {
  /**
   * Get all active testimonials (public)
   */
  getActive: async () => {
    const response = await api.get('/testimonials');
    return response.data;
  },

  /**
   * Get all testimonials (admin)
   */
  getAll: async () => {
    const response = await api.get('/testimonials/admin');
    return response.data;
  },

  /**
   * Get testimonial by ID
   */
  getById: async (id) => {
    const response = await api.get(`/testimonials/admin/${id}`);
    return response.data;
  },

  /**
   * Create new testimonial
   */
  create: async (data) => {
    const response = await api.post('/testimonials/admin', data);
    return response.data;
  },

  /**
   * Update testimonial
   */
  update: async (id, data) => {
    const response = await api.put(`/testimonials/admin/${id}`, data);
    return response.data;
  },

  /**
   * Delete testimonial
   */
  delete: async (id) => {
    const response = await api.delete(`/testimonials/admin/${id}`);
    return response.data;
  },

  /**
   * Toggle testimonial active status
   */
  toggle: async (id) => {
    const response = await api.patch(`/testimonials/admin/${id}/toggle`);
    return response.data;
  },

  /**
   * Reorder testimonials
   */
  reorder: async (orderIds) => {
    const response = await api.patch('/testimonials/admin/reorder', { orderIds });
    return response.data;
  }
};

export default testimonialApi;
