/**
 * Billing API Service
 *
 * API calls for organization billing management.
 */

import api from './axios.js';

const billingApi = {
  /**
   * Get billing information for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Billing information
   */
  getBilling: async (organizationId) => {
    const response = await api.get(`/billing/${organizationId}`);
    return response.data;
  },

  /**
   * Update subscription plan
   * @param {string} organizationId - Organization ID
   * @param {Object} data - Subscription data (plan, billingCycle)
   * @returns {Promise} Updated subscription
   */
  updateSubscription: async (organizationId, data) => {
    const response = await api.put(`/billing/${organizationId}/subscription`, data);
    return response.data;
  },

  /**
   * Cancel subscription
   * @param {string} organizationId - Organization ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise} Cancellation result
   */
  cancelSubscription: async (organizationId, reason) => {
    const response = await api.post(`/billing/${organizationId}/cancel`, { reason });
    return response.data;
  },

  /**
   * Reactivate subscription
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Reactivation result
   */
  reactivateSubscription: async (organizationId) => {
    const response = await api.post(`/billing/${organizationId}/reactivate`);
    return response.data;
  },

  /**
   * Get usage summary
   * @param {string} organizationId - Organization ID
   * @param {Object} params - Query params (startDate, endDate)
   * @returns {Promise} Usage summary
   */
  getUsage: async (organizationId, params = {}) => {
    const response = await api.get(`/billing/${organizationId}/usage`, { params });
    return response.data;
  },

  /**
   * Get invoices
   * @param {string} organizationId - Organization ID
   * @param {Object} params - Query params (page, limit)
   * @returns {Promise} Invoices list
   */
  getInvoices: async (organizationId, params = {}) => {
    const response = await api.get(`/billing/${organizationId}/invoices`, { params });
    return response.data;
  },

  /**
   * Get invoice by ID
   * @param {string} organizationId - Organization ID
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise} Invoice details
   */
  getInvoiceById: async (organizationId, invoiceId) => {
    const response = await api.get(`/billing/${organizationId}/invoices/${invoiceId}`);
    return response.data;
  },

  /**
   * Download invoice
   * @param {string} organizationId - Organization ID
   * @param {string} invoiceId - Invoice ID
   * @param {string} format - Download format (pdf, json)
   * @returns {Promise} Invoice file
   */
  downloadInvoice: async (organizationId, invoiceId, format = 'pdf') => {
    const response = await api.get(
      `/billing/${organizationId}/invoices/${invoiceId}/download`,
      { params: { format }, responseType: 'blob' }
    );
    return response;
  },

  /**
   * Update billing details
   * @param {string} organizationId - Organization ID
   * @param {Object} data - Billing details
   * @returns {Promise} Updated billing details
   */
  updateBillingDetails: async (organizationId, data) => {
    const response = await api.put(`/billing/${organizationId}/details`, data);
    return response.data;
  },

  /**
   * Add payment method
   * @param {string} organizationId - Organization ID
   * @param {Object} data - Payment method data
   * @returns {Promise} Added payment method
   */
  addPaymentMethod: async (organizationId, data) => {
    const response = await api.post(`/billing/${organizationId}/payment-methods`, data);
    return response.data;
  },

  /**
   * Remove payment method
   * @param {string} organizationId - Organization ID
   * @param {string} methodId - Payment method ID
   * @returns {Promise}
   */
  removePaymentMethod: async (organizationId, methodId) => {
    const response = await api.delete(`/billing/${organizationId}/payment-methods/${methodId}`);
    return response.data;
  },

  /**
   * Set default payment method
   * @param {string} organizationId - Organization ID
   * @param {string} methodId - Payment method ID
   * @returns {Promise}
   */
  setDefaultPaymentMethod: async (organizationId, methodId) => {
    const response = await api.put(
      `/billing/${organizationId}/payment-methods/${methodId}/default`
    );
    return response.data;
  },

  /**
   * Get available plans
   * @returns {Promise} Array of plans
   */
  getAvailablePlans: async () => {
    const response = await api.get('/billing/plans/public');
    return response.data;
  },

  /**
   * Preview subscription change
   * @param {string} organizationId - Organization ID
   * @param {Object} data - Preview data (plan, billingCycle)
   * @returns {Promise} Preview result
   */
  previewSubscriptionChange: async (organizationId, data) => {
    const response = await api.post(`/billing/${organizationId}/preview`, data);
    return response.data;
  }
};

export default billingApi;