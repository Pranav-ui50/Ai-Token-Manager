/**
 * Billing Page
 *
 * Main billing and subscription management page.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useOrganizationStore } from '../../store';
import { apiClient } from '../../services/api';
import {
  PricingTierCard,
  UsageProgress,
  BillingHistory,
  PaymentMethodCard,
  PaymentProviderSelect,
  StripeCheckout,
  RazorpayCheckout,
  AddPaymentMethod
} from '../../components/features';
import { FormActions, FormError, FormSuccess, Toggle } from '../../components/forms';

const BillingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { organization, fetchOrganization } = useOrganizationStore();

  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch billing data
  const fetchBillingData = useCallback(async () => {
    try {
      setLoading(true);
      const [billingRes, plansRes, invoicesRes, methodsRes] = await Promise.all([
        apiClient.get('/billing'),
        apiClient.get('/billing/plans/public'),
        apiClient.get('/billing/invoices'),
        apiClient.get('/billing/payment-methods')
      ]);

      if (billingRes.data.success) {
        setBillingData(billingRes.data.data);
      }

      if (plansRes.data.success) {
        setPlans(plansRes.data.data);
      }

      if (invoicesRes.data.success) {
        setInvoices(invoicesRes.data.data);
      }

      if (methodsRes.data.success) {
        setPaymentMethods(methodsRes.data.data);
      }
    } catch (err) {
      setError('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // Handle plan selection
  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
    if (planId !== 'free' && planId !== 'enterprise') {
      setShowCheckoutModal(true);
    } else if (planId === 'enterprise') {
      // Redirect to contact sales
      window.open('/contact-sales', '_blank');
    }
  };

  // Handle payment method addition
  const handleAddPaymentMethod = async (method) => {
    setPaymentMethods([...paymentMethods, method]);
    setShowPaymentMethodModal(false);
    setSuccess('Payment method added successfully');
    fetchBillingData();
  };

  // Handle payment method removal
  const handleRemovePaymentMethod = async (methodId) => {
    try {
      await apiClient.delete(`/billing/payment-methods/${methodId}`);
      setPaymentMethods(paymentMethods.filter(m => m.id !== methodId));
      setSuccess('Payment method removed successfully');
    } catch (err) {
      setError('Failed to remove payment method');
    }
  };

  // Handle set default payment method
  const handleSetDefaultPaymentMethod = async (methodId) => {
    try {
      await apiClient.put(`/billing/payment-methods/${methodId}/default`);
      setPaymentMethods(paymentMethods.map(m => ({
        ...m,
        isDefault: m.id === methodId
      })));
      setSuccess('Default payment method updated');
    } catch (err) {
      setError('Failed to set default payment method');
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    try {
      await apiClient.post('/billing/cancel');
      setSuccess('Subscription cancelled successfully');
      fetchBillingData();
    } catch (err) {
      setError('Failed to cancel subscription');
    }
  };

  // Handle checkout success
  const handleCheckoutSuccess = (data) => {
    setShowCheckoutModal(false);
    setSuccess('Payment successful! Your subscription has been activated.');
    fetchBillingData();
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Get plan display name from billing data
  const planDisplayName = billingData?.plan?.name || billingData?.plan?.displayName || billingData?.subscription?.plan || 'Free';
  const planTier = billingData?.plan?.tier || billingData?.subscription?.plan || 'free';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Billing & Subscription
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your subscription, billing details, and payment methods
            </p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <FormError error={error} onDismiss={() => setError('')} />
        )}
        {success && (
          <FormSuccess message={success} onDismiss={() => setSuccess('')} />
        )}

        {/* Current Subscription */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Subscription
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Plan</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {planDisplayName}
              </p>
              {billingData?.plan?.price !== undefined && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {billingData.plan.currency || 'USD'} {billingData.plan.price}/{billingData?.subscription?.billingCycle === 'yearly' ? 'year' : 'month'}
                </p>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                {billingData?.subscription?.status || 'trial'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Billing Cycle</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                {billingData?.subscription?.billingCycle || 'monthly'}
              </p>
            </div>
          </div>

          {/* Usage Progress */}
          {billingData?.usage && (
            <div className="mt-6 space-y-4">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">
                Usage This Period
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {billingData.usage.projects && (
                  <UsageProgress
                    current={billingData.usage.projects.used}
                    limit={billingData.usage.projects.limit}
                    label="Projects"
                    color="blue"
                  />
                )}
                {billingData.usage.features && (
                  <UsageProgress
                    current={billingData.usage.features.used}
                    limit={billingData.usage.features.limit}
                    label="Features"
                    color="purple"
                  />
                )}
                {billingData.usage.simulations && (
                  <UsageProgress
                    current={billingData.usage.simulations.used}
                    limit={billingData.usage.simulations.limit}
                    label="Simulations"
                    color="orange"
                  />
                )}
                {billingData.usage.teamMembers && (
                  <UsageProgress
                    current={billingData.usage.teamMembers.used}
                    limit={billingData.usage.teamMembers.limit}
                    label="Team Members"
                    color="yellow"
                  />
                )}
                {billingData.usage.apiCalls && (
                  <UsageProgress
                    current={billingData.usage.apiCalls.used}
                    limit={billingData.usage.apiCalls.limit}
                    label="API Calls"
                    color="green"
                  />
                )}
                {billingData.usage.tokens && (
                  <UsageProgress
                    current={billingData.usage.tokens.used}
                    limit={billingData.usage.tokens.limit}
                    label="Tokens"
                    color="cyan"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Billing Cycle Toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Billing Period
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose between monthly or annual billing
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className={billingCycle === 'monthly' ? 'text-blue-600 font-medium' : 'text-gray-500'}>
                Monthly
              </span>
              <Toggle
                checked={billingCycle === 'yearly'}
                onChange={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              />
              <span className={billingCycle === 'yearly' ? 'text-blue-600 font-medium' : 'text-gray-500'}>
                Annual (Save 20%)
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Plans */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Available Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <PricingTierCard
                key={plan.id}
                tier={plan}
                selected={selectedPlan === plan.id || planTier === plan.tier || billingData?.plan?.id === plan.id}
                onSelect={handlePlanSelect}
                billingCycle={billingCycle}
              />
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Payment Methods
            </h2>
            <button
              onClick={() => setShowPaymentMethodModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Payment Method
            </button>
          </div>

          {paymentMethods.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No payment methods added
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  onSetDefault={handleSetDefaultPaymentMethod}
                  onRemove={handleRemovePaymentMethod}
                />
              ))}
            </div>
          )}
        </div>

        {/* Billing History */}
        <BillingHistory invoices={invoices} />

        {/* Danger Zone */}
        {planTier !== 'free' && billingData?.subscription?.status !== 'trial' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Danger Zone
            </h2>
            <p className="text-red-700 dark:text-red-300 mb-4">
              You can cancel your subscription at any time. Your access will continue until the end of your current billing period.
            </p>
            <button
              onClick={handleCancelSubscription}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Cancel Subscription
            </button>
          </div>
        )}

        {/* Payment Method Modal */}
        {showPaymentMethodModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add Payment Method
              </h3>
              <PaymentProviderSelect
                selectedProvider={selectedProvider}
                onSelect={setSelectedProvider}
              />
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPaymentMethodModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                {selectedProvider && (
                  <button
                    onClick={() => {
                      setShowPaymentMethodModal(false);
                      setShowCheckoutModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Continue
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Checkout Modal */}
        {showCheckoutModal && selectedPlan && selectedProvider && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              {selectedProvider === 'stripe' ? (
                <StripeCheckout
                  planId={selectedPlan}
                  billingCycle={billingCycle}
                  onSuccess={handleCheckoutSuccess}
                  onCancel={() => setShowCheckoutModal(false)}
                />
              ) : (
                <RazorpayCheckout
                  planId={selectedPlan}
                  billingCycle={billingCycle}
                  onSuccess={handleCheckoutSuccess}
                  onCancel={() => setShowCheckoutModal(false)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPage;