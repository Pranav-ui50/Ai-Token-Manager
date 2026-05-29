/**
 * Notification API Service
 *
 * API service for notification endpoints.
 */

import api from './axios.js';

const notificationApi = {
  // ==========================================
  // Get Notifications
  // ==========================================

  /**
   * Get notifications for current user
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  getAll: (params = {}) => api.get('/notifications', { params }),

  /**
   * Get notification by ID
   * @param {string} id - Notification ID
   * @returns {Promise} API response
   */
  getById: (id) => api.get(`/notifications/${id}`),

  /**
   * Get unread notification count
   * @returns {Promise} API response
   */
  getUnreadCount: () => api.get('/notifications/unread-count'),

  // ==========================================
  // Status Update Methods
  // ==========================================

  /**
   * Mark notification as read
   * @param {string} id - Notification ID
   * @returns {Promise} API response
   */
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),

  /**
   * Mark all notifications as read
   * @param {Object} params - Optional filters
   * @returns {Promise} API response
   */
  markAllAsRead: (params = {}) => api.patch('/notifications/read-all', null, { params }),

  /**
   * Dismiss notification
   * @param {string} id - Notification ID
   * @returns {Promise} API response
   */
  dismiss: (id) => api.patch(`/notifications/${id}/dismiss`),

  /**
   * Resolve notification
   * @param {string} id - Notification ID
   * @returns {Promise} API response
   */
  resolve: (id) => api.patch(`/notifications/${id}/resolve`),

  // ==========================================
  // Delete Methods
  // ==========================================

  /**
   * Delete notification
   * @param {string} id - Notification ID
   * @returns {Promise} API response
   */
  delete: (id) => api.delete(`/notifications/${id}`),

  /**
   * Delete all read notifications
   * @returns {Promise} API response
   */
  deleteAllRead: () => api.delete('/notifications/read'),

  // ==========================================
  // Bulk Operations
  // ==========================================

  /**
   * Bulk mark notifications as read
   * @param {Array} notificationIds - Array of notification IDs
   * @returns {Promise} API response
   */
  bulkMarkAsRead: (notificationIds) => api.patch('/notifications/bulk/read', { notificationIds }),

  /**
   * Bulk delete notifications
   * @param {Array} notificationIds - Array of notification IDs
   * @returns {Promise} API response
   */
  bulkDelete: (notificationIds) => api.delete('/notifications/bulk', { data: { notificationIds } }),

  // ==========================================
  // Admin Trigger Methods
  // ==========================================

  /**
   * Trigger pricing change notification
   * @param {Object} data - Pricing change data
   * @returns {Promise} API response
   */
  triggerPricingChange: (data) => api.post('/notifications/trigger/pricing-change', data),

  /**
   * Trigger low margin notification
   * @param {Object} data - Margin data
   * @returns {Promise} API response
   */
  triggerLowMargin: (data) => api.post('/notifications/trigger/low-margin', data),

  /**
   * Trigger usage spike notification
   * @param {Object} data - Usage spike data
   * @returns {Promise} API response
   */
  triggerUsageSpike: (data) => api.post('/notifications/trigger/usage-spike', data),

  /**
   * Create custom notification (admin)
   * @param {Object} data - Notification data
   * @returns {Promise} API response
   */
  createCustom: (data) => api.post('/notifications/custom', data)
};

export default notificationApi;