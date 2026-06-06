/**
 * Billing Page
 *
 * Manage billing, subscription plans, payment methods, and invoices.
 * Matches the landing page pricing section style.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import billingApi from '../../services/api/billing.api.js';
import publicApi from '../../services/api/public.api.js';
import Modal from '../../components/common/Modal.jsx';
import Button from '../../components/common/Button.jsx';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-blue-100 text-blue-700',
  pending_payment: 'bg-yellow-100 text-yellow-700',
  past_due: 'bg-red-100 text-red-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700'
};

const PAYMENT_BRAND_COLORS = {
  visa: 'bg-blue-600',
  mastercard: 'bg-orange-500',
  amex: 'bg-blue-400',
  discover: 'bg-orange-400',
  other: 'bg-gray-500'
};

// Default plans as fallback
const DEFAULT_PLANS = [
  {
    id: 'free',
    name: 'Free',
    tier: 'free',
    description: 'Perfect for getting started with AI cost management',
    billing: { price: 0, currency: 'USD', interval: 'month', trialDays: 0 },
    credits: { includedCredits: 10000, creditType: 'token' },
    limits: { maxUsers: 1, maxApiCalls: 1000 },
    isPopular: false
  },
  {
    id: 'starter',
    name: 'Starter',
    tier: 'starter',
    description: 'Great for small teams exploring AI APIs',
    billing: { price: 29, currency: 'USD', interval: 'month', trialDays: 14 },
    credits: { includedCredits: 500000, creditType: 'token' },
    limits: { maxUsers: 3, maxApiCalls: 10000 },
    isPopular: false
  },
  {
    id: 'professional',
    name: 'Professional',
    tier: 'professional',
    description: 'Ideal for growing teams with advanced AI needs',
    billing: { price: 99, currency: 'USD', interval: 'month', trialDays: 14 },
    credits: { includedCredits: 2000000, creditType: 'token' },
    limits: { maxUsers: 10, maxApiCalls: 50000 },
    isPopular: true
  },
  {
    id: 'business',
    name: 'Business',
    tier: 'business',
    description: 'For organizations with heavy AI API usage',
    billing: { price: 299, currency: 'USD', interval: 'month', trialDays: 14 },
    credits: { includedCredits: 10000000, creditType: 'token' },
    limits: { maxUsers: 50, maxApiCalls: 200000 },
    isPopular: false
  }
];

function BillingPage() {
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingData, setBillingData] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [plansLoading, setPlansLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState('month');
  const [currency, setCurrency] = useState('USD');

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillingDetailsModal, setShowBillingDetailsModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Billing details form
  const [billingDetails, setBillingDetails] = useState({
    companyName: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    taxId: '',
    vatNumber: ''
  });

  // Payment method form
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'card',
    last4: '',
    brand: 'visa',
    expiryMonth: '',
    expiryYear: ''
  });

  // Currency conversion rates (approximate)
  const conversionRates = {
    USD: 1,
    INR: 83.5,
    EUR: 0.92,
    GBP: 0.79
  };

  // Currency symbols
  const currencySymbols = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£'
  };

  const organizationId = currentOrganization?._id || currentOrganization?.id;

  useEffect(() => {
    if (organizationId) {
      loadBillingData();
      loadPlans();
    }
  }, [organizationId]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      setError('');

      const [billingRes, usageRes, invoicesRes] = await Promise.all([
        billingApi.getBilling(organizationId),
        billingApi.getUsage(organizationId),
        billingApi.getInvoices(organizationId)
      ]);

      setBillingData(billingRes.data);
      setUsageData(usageRes.data);
      setInvoices(invoicesRes.data);

      if (billingRes.data?.billingDetails) {
        setBillingDetails(billingRes.data.billingDetails);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      setPlansLoading(true);
      // Use the same public API as the landing page
      const res = await publicApi.getPlans();
      if (res.success && res.data && res.data.length > 0) {
        setPlans(res.data);
      } else {
        setPlans(DEFAULT_PLANS);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
      setPlans(DEFAULT_PLANS);
    } finally {
      setPlansLoading(false);
    }
  };

  const formatPrice = (price, curr = 'USD') => {
    if (price === 'custom' || price === 'Contact Sales') return 'Custom';
    const symbol = currencySymbols[curr] || '$';
    const convertedPrice = price * (conversionRates[curr] || 1);
    return `${symbol}${convertedPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getTierColor = (tier) => {
    const colors = {
      free: { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700' },
      starter: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
      professional: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
      business: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
      enterprise: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' }
    };
    return colors[tier] || colors.starter;
  };

  const getTierName = (tier) => {
    const names = {
      free: 'Free',
      starter: 'Starter',
      professional: 'Professional',
      business: 'Business',
      enterprise: 'Enterprise'
    };
    return names[tier] || tier;
  };

  const getDisplayPrice = (plan) => {
    const basePrice = plan.billing?.price || plan.price || 0;
    if (billingInterval === 'year' && (plan.billing?.interval === 'month' || !plan.billing?.interval)) {
      return basePrice * 12 * 0.8;
    }
    return basePrice;
  };

  const handleSelectPlan = async (plan) => {
    const currentPlanId = billingData?.subscription?.plan || billingData?.plan?.tier;

    if (plan.tier === currentPlanId || plan.id === currentPlanId) {
      return; // Already on this plan
    }

    // For upgrade/downgrade, you can integrate with payment flow
    setSelectedPlan(plan);
    // For now, just show an alert - integrate with actual payment flow
    if (plan.tier === 'free' || plan.billing?.price === 0) {
      if (confirm('Are you sure you want to downgrade to the Free plan?')) {
        await handlePlanChange(plan);
      }
    } else {
      // Redirect to checkout for paid plans
      window.location.href = `/checkout?plan=${plan.id || plan.tier}&currency=${currency}&billing=${billingInterval}`;
    }
  };

  const handlePlanChange = async (plan) => {
    setIsSubmitting(true);
    setError('');
    try {
      await billingApi.updateSubscription(organizationId, {
        plan: plan.id || plan.tier,
        billingCycle: billingInterval === 'year' ? 'yearly' : 'monthly'
      });
      await loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubscription = async (reason) => {
    setIsSubmitting(true);
    setError('');
    try {
      await billingApi.cancelSubscription(organizationId, reason);
      setShowCancelModal(false);
      await loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await billingApi.reactivateSubscription(organizationId);
      await loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reactivate subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPaymentMethod = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await billingApi.addPaymentMethod(organizationId, newPaymentMethod);
      setShowPaymentModal(false);
      setNewPaymentMethod({
        type: 'card',
        last4: '',
        brand: 'visa',
        expiryMonth: '',
        expiryYear: ''
      });
      await loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add payment method');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePaymentMethod = async (methodId) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;
    try {
      await billingApi.removePaymentMethod(organizationId, methodId);
      await loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove payment method');
    }
  };

  const handleSetDefaultPaymentMethod = async (methodId) => {
    try {
      await billingApi.setDefaultPaymentMethod(organizationId, methodId);
      await loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set default payment method');
    }
  };

  const handleUpdateBillingDetails = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await billingApi.updateBillingDetails(organizationId, billingDetails);
      setShowBillingDetailsModal(false);
      await loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update billing details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId, invoiceNumber) => {
    try {
      const response = await billingApi.downloadInvoice(organizationId, invoiceId, 'pdf');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download invoice');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626]"></div>
        </div>
      </div>
    );
  }

  const currentPlanId = billingData?.subscription?.plan || billingData?.plan?.tier || 'free';
  const freePlan = plans.find(plan => plan.tier === 'free' || plan.id === 'free');
  const paidPlans = plans.filter(plan => plan.tier !== 'free' && plan.id !== 'free');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-sm text-gray-500">Manage your subscription and billing details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowBillingDetailsModal(true)}>
            Billing Details
          </Button>
          <Button variant="secondary" onClick={() => setShowPaymentModal(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Payment Methods
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Current Plan Summary */}
      {billingData && (
        <div className="bg-gradient-to-r from-[#DC2626] to-[#B91C1C] rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-red-100 text-sm">Current Plan</p>
              <h2 className="text-3xl font-bold">{billingData.plan?.displayName || billingData.plan?.name || 'Free'}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[billingData.subscription?.status] || STATUS_COLORS.trial}`}>
                  {getStatusLabel(billingData.subscription?.status || 'trial')}
                </span>
                {billingData.subscription?.status === 'cancelled' ? (
                  <span className="text-sm text-red-100">Access until: {formatDate(billingData.subscription?.currentPeriodEnd)}</span>
                ) : billingData.subscription?.status === 'trial' ? (
                  <span className="text-sm text-red-100">Trial ends: {formatDate(billingData.subscription?.trialEndsAt)}</span>
                ) : (
                  <span className="text-sm text-red-100">Next billing: {formatDate(billingData.subscription?.currentPeriodEnd)}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {billingData.subscription?.status === 'cancelled' && (
                <Button variant="secondary" onClick={handleReactivate} disabled={isSubmitting}>
                  Reactivate
                </Button>
              )}
              {billingData.subscription?.status === 'active' && billingData.subscription?.plan !== 'free' && (
                <Button variant="secondary" onClick={() => setShowCancelModal(true)}>
                  Cancel Subscription
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Usage Summary */}
      {usageData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage This Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Object.entries(usageData.usage || {}).map(([key, value]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="text-sm text-gray-500">
                    {value.used} / {value.limit === 'unlimited' ? '∞' : value.limit}
                  </span>
                </div>
                {value.limit !== 'unlimited' && (
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${value.percentage >= 90 ? 'bg-red-500' : value.percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(value.percentage, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Section - Same as Landing Page */}
      <div className="bg-gray-50 rounded-2xl py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Change Your Plan
            </h2>
            <p className="text-gray-600">
              Select a plan that fits your needs. Upgrade or downgrade anytime.
            </p>

            {/* Billing Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-6">
              {/* Currency Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Currency:</span>
                <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                  {['USD', 'INR', 'EUR', 'GBP'].map((curr) => (
                    <button
                      key={curr}
                      onClick={() => setCurrency(curr)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        currency === curr
                          ? 'bg-[#DC2626] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Billing Interval Toggle */}
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${billingInterval === 'month' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Monthly
                </span>
                <button
                  onClick={() => setBillingInterval(billingInterval === 'month' ? 'year' : 'month')}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    billingInterval === 'year' ? 'bg-[#DC2626]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      billingInterval === 'year' ? 'transform translate-x-7' : ''
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${billingInterval === 'year' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Yearly
                  <span className="ml-1 text-green-600 font-semibold">(Save 20%)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Plans Grid */}
          {plansLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC2626]"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Free Plan */}
              {freePlan && (
                <div key={freePlan.id}>
                  <div
                    className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all hover:shadow-xl ${
                      currentPlanId === 'free' || currentPlanId === freePlan.id ? 'border-[#DC2626] ring-2 ring-[#DC2626] ring-opacity-50' : 'border-gray-200'
                    }`}
                  >
                    {currentPlanId === 'free' || currentPlanId === freePlan.id ? (
                      <div className="absolute top-0 right-0 bg-[#DC2626] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                        Current Plan
                      </div>
                    ) : null}
                    <div className="p-6">
                      <div className="mb-4">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          Free
                        </span>
                        <h3 className="mt-2 text-xl font-bold text-gray-900">{freePlan.name}</h3>
                        {freePlan.description && (
                          <p className="text-sm text-gray-500 mt-1">{freePlan.description}</p>
                        )}
                      </div>

                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-gray-900">Free</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Forever free</p>
                      </div>

                      <div className="space-y-3 mb-6">
                        {freePlan.credits?.includedCredits > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-600">
                              {freePlan.credits.includedCredits.toLocaleString()} {freePlan.credits.creditType || 'tokens'}
                            </span>
                          </div>
                        )}
                        {freePlan.limits?.maxUsers && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-600">Up to {freePlan.limits.maxUsers} user{freePlan.limits.maxUsers > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {freePlan.limits?.maxApiCalls && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-600">{freePlan.limits.maxApiCalls.toLocaleString()} API calls</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleSelectPlan(freePlan)}
                        disabled={currentPlanId === 'free' || currentPlanId === freePlan.id}
                        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                          currentPlanId === 'free' || currentPlanId === freePlan.id
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        {currentPlanId === 'free' || currentPlanId === freePlan.id ? 'Current Plan' : 'Downgrade'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Paid Plans */}
              {paidPlans.map((plan) => {
                const tierStyle = getTierColor(plan.tier);
                const isPopular = plan.isPopular || plan.tier === 'professional';
                const isCurrentPlan = currentPlanId === plan.tier || currentPlanId === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all hover:shadow-xl ${
                      isCurrentPlan ? 'border-[#DC2626] ring-2 ring-[#DC2626] ring-opacity-50' : isPopular ? 'border-[#DC2626] shadow-lg' : 'border-gray-200'
                    }`}
                  >
                    {isCurrentPlan ? (
                      <div className="absolute top-0 right-0 bg-[#DC2626] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                        Current Plan
                      </div>
                    ) : isPopular ? (
                      <div className="absolute top-0 right-0 bg-[#DC2626] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                        Most Popular
                      </div>
                    ) : null}

                    <div className="p-6">
                      <div className="mb-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${tierStyle.badge}`}>
                          {getTierName(plan.tier)}
                        </span>
                        <h3 className="mt-2 text-xl font-bold text-gray-900">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                        )}
                      </div>

                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-gray-900">
                            {formatPrice(getDisplayPrice(plan), currency)}
                          </span>
                          <span className="text-gray-500">
                            /{billingInterval === 'year' ? 'year' : plan.billing?.interval || 'month'}
                          </span>
                        </div>
                        {billingInterval === 'year' && (plan.billing?.price || plan.price) > 0 && (
                          <p className="text-sm text-gray-400 mt-1">
                            <span className="line-through">{formatPrice(((plan.billing?.price || plan.price || 0) * 12), currency)}/year</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-3 mb-6">
                        {plan.credits?.includedCredits > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-600">
                              {plan.credits.includedCredits.toLocaleString()} {plan.credits.creditType || 'tokens'} included
                            </span>
                          </div>
                        )}

                        {plan.limits?.maxUsers && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-600">Up to {plan.limits.maxUsers} users</span>
                          </div>
                        )}

                        {plan.limits?.maxApiCalls && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-600">{plan.limits.maxApiCalls.toLocaleString()} API calls</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isCurrentPlan}
                        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                          isCurrentPlan
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isPopular
                              ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                      </button>

                      {plan.billing?.trialDays > 0 && !isCurrentPlan && (
                        <p className="text-center text-sm text-gray-500 mt-3">
                          {plan.billing.trialDays}-day free trial
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Billing History / Invoices */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Billing History</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No billing history yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{invoice.number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.paidAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${invoice.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                        invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDownloadInvoice(invoice.id, invoice.number)}
                        className="text-[#DC2626] hover:text-[#B91C1C] font-medium text-sm"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Methods Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Payment Methods"
        size="md"
      >
        <div className="p-6 space-y-4">
          {billingData?.paymentMethods?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Saved Payment Methods</h3>
              {billingData.paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="bg-gray-50 rounded-lg p-4 flex items-center gap-4"
                >
                  <div className={`w-12 h-8 ${PAYMENT_BRAND_COLORS[method.brand] || 'bg-gray-500'} rounded flex items-center justify-center`}>
                    <span className="text-white text-xs font-bold uppercase">{method.brand}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">•••• {method.last4}</p>
                    <p className="text-xs text-gray-500">
                      Expires {method.expiryMonth}/{method.expiryYear}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {method.isDefault ? (
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">Default</span>
                    ) : (
                      <button
                        onClick={() => handleSetDefaultPaymentMethod(method.id)}
                        className="text-xs text-[#DC2626] hover:underline"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleRemovePaymentMethod(method.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Payment Method</h3>
            <form onSubmit={handleAddPaymentMethod} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Number (Last 4)</label>
                  <input
                    type="text"
                    value={newPaymentMethod.last4}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="4242"
                    maxLength={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Brand</label>
                  <select
                    value={newPaymentMethod.brand}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, brand: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                  >
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">American Express</option>
                    <option value="discover">Discover</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Month</label>
                  <input
                    type="number"
                    value={newPaymentMethod.expiryMonth}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryMonth: e.target.value })}
                    placeholder="01"
                    min={1}
                    max={12}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Year</label>
                  <input
                    type="number"
                    value={newPaymentMethod.expiryYear}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryYear: e.target.value })}
                    placeholder={new Date().getFullYear()}
                    min={new Date().getFullYear()}
                    max={new Date().getFullYear() + 20}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowPaymentModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? 'Adding...' : 'Add Payment Method'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Modal>

      {/* Billing Details Modal */}
      <Modal
        isOpen={showBillingDetailsModal}
        onClose={() => setShowBillingDetailsModal(false)}
        title="Billing Details"
        size="md"
      >
        <div className="p-6">
          <form onSubmit={handleUpdateBillingDetails} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={billingDetails.companyName}
                onChange={(e) => setBillingDetails({ ...billingDetails, companyName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={billingDetails.address}
                onChange={(e) => setBillingDetails({ ...billingDetails, address: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={billingDetails.city}
                  onChange={(e) => setBillingDetails({ ...billingDetails, city: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={billingDetails.state}
                  onChange={(e) => setBillingDetails({ ...billingDetails, state: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={billingDetails.country}
                  onChange={(e) => setBillingDetails({ ...billingDetails, country: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={billingDetails.postalCode}
                  onChange={(e) => setBillingDetails({ ...billingDetails, postalCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                <input
                  type="text"
                  value={billingDetails.taxId}
                  onChange={(e) => setBillingDetails({ ...billingDetails, taxId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                <input
                  type="text"
                  value={billingDetails.vatNumber}
                  onChange={(e) => setBillingDetails({ ...billingDetails, vatNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowBillingDetailsModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Cancel Subscription Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Subscription"
        size="md"
      >
        <CancelSubscriptionForm
          onCancel={() => setShowCancelModal(false)}
          onSubmit={handleCancelSubscription}
          isSubmitting={isSubmitting}
        />
      </Modal>
    </div>
  );
}

// Cancel Subscription Form Component
function CancelSubscriptionForm({ onCancel, onSubmit, isSubmitting }) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(reason);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">
          Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason for cancellation (optional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Tell us why you're leaving..."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Keep Subscription
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Cancelling...' : 'Cancel Subscription'}
        </Button>
      </div>
    </form>
  );
}

export default BillingPage;