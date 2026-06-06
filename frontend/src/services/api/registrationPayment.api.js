/**
 * Registration Payment API Service
 *
 * API calls for the registration-to-payment flow.
 */

import api from './axios.js';

const registrationPaymentApi = {
  /**
   * Initiate registration with payment
   * @param {Object} data - Registration and payment data
   * @returns {Promise}
   */
  initiatePayment: async (data) => {
    const response = await api.post('/auth/register/payment', data);
    return response.data;
  },

  /**
   * Verify Razorpay payment and complete registration
   * @param {string} orderId - Razorpay order ID
   * @param {string} paymentId - Razorpay payment ID
   * @param {string} signature - Payment signature
   * @returns {Promise}
   */
  verifyRazorpayPayment: async (orderId, paymentId, signature) => {
    const response = await api.post('/auth/register/verify-razorpay', {
      orderId,
      paymentId,
      signature
    });
    return response.data;
  },

  /**
   * Complete Stripe registration after payment
   * @param {string} sessionId - Stripe checkout session ID
   * @returns {Promise}
   */
  completeStripeRegistration: async (sessionId) => {
    const response = await api.post('/auth/register/complete-stripe', {
      sessionId
    });
    return response.data;
  },

  /**
   * Cancel pending registration
   * @param {string} pendingId - Pending registration ID
   * @returns {Promise}
   */
  cancelRegistration: async (pendingId) => {
    const response = await api.post('/auth/register/cancel', {
      pendingId
    });
    return response.data;
  },

  /**
   * Get pending registration status
   * @param {string} pendingId - Pending registration ID
   * @returns {Promise}
   */
  getPendingStatus: async (pendingId) => {
    const response = await api.get(`/auth/register/pending/${pendingId}`);
    return response.data;
  },

  /**
   * Retry payment for pending registration
   * @param {string} pendingId - Pending registration ID
   * @param {string} paymentProvider - 'stripe' or 'razorpay'
   * @returns {Promise}
   */
  retryPayment: async (pendingId, paymentProvider) => {
    const response = await api.post('/auth/register/retry-payment', {
      pendingId,
      paymentProvider
    });
    return response.data;
  }
};

export default registrationPaymentApi;