/**
 * Payment API Service
 *
 * API calls for payment gateway integration (Razorpay & Stripe).
 */

import api from './axios.js';

const paymentApi = {
  /**
   * Get payment configuration
   * @returns {Promise} Payment config with enabled gateways
   */
  getConfig: async () => {
    const response = await api.get('/payments/config');
    return response.data;
  },

  /**
   * Create Razorpay order for subscription
   * @param {string} organizationId - Organization ID
   * @param {string} planId - Plan ID
   * @param {string} billingCycle - 'monthly' or 'yearly'
   * @returns {Promise} Order details with Razorpay key
   */
  createRazorpayOrder: async (organizationId, planId, billingCycle) => {
    const response = await api.post('/payments/razorpay/order', {
      organizationId,
      planId,
      billingCycle
    });
    return response.data;
  },

  /**
   * Verify and process Razorpay payment
   * @param {string} organizationId - Organization ID
   * @param {object} paymentData - Payment data from Razorpay
   * @returns {Promise} Payment verification result
   */
  verifyRazorpayPayment: async (organizationId, paymentData) => {
    const response = await api.post('/payments/razorpay/verify', {
      organizationId,
      orderId: paymentData.razorpay_order_id,
      paymentId: paymentData.razorpay_payment_id,
      signature: paymentData.razorpay_signature
    });
    return response.data;
  },

  /**
   * Create Stripe checkout session
   * @param {string} organizationId - Organization ID
   * @param {string} planId - Plan ID
   * @param {string} billingCycle - 'monthly' or 'yearly'
   * @param {string} successUrl - Success redirect URL
   * @param {string} cancelUrl - Cancel redirect URL
   * @returns {Promise} Checkout session URL
   */
  createStripeCheckout: async (organizationId, planId, billingCycle, successUrl, cancelUrl) => {
    const response = await api.post('/payments/stripe/checkout', {
      organizationId,
      planId,
      billingCycle,
      successUrl,
      cancelUrl
    });
    return response.data;
  },

  /**
   * Get available subscription plans
   * @returns {Promise} List of plans
   */
  getPlans: async () => {
    const response = await api.get('/payments/plans');
    return response.data;
  },

  /**
   * Cancel subscription
   * @param {string} organizationId - Organization ID
   * @param {boolean} immediately - Cancel immediately or at period end
   * @returns {Promise} Cancellation result
   */
  cancelSubscription: async (organizationId, immediately = false) => {
    const response = await api.post('/payments/subscription/cancel', {
      organizationId,
      immediately
    });
    return response.data;
  },

  /**
   * Get subscription status
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Subscription details
   */
  getSubscription: async (organizationId) => {
    const response = await api.get(`/payments/subscription/${organizationId}`);
    return response.data;
  }
};

export default paymentApi;