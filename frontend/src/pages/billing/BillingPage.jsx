/**
 * Billing Page
 *
 * Manage billing, subscription plans, and invoices.
 * Uses PlansContext for centralized plan management.
 */

import { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { usePlans } from '../../context/PlansContext.jsx';
import billingApi from '../../services/api/billing.api.js';
import { showToast } from '../../utils/toasts.jsx';
import { getCurrencySymbol, formatIndianNumber } from '../../utils/currency.js';
import Loader from '../../components/common/Loader.jsx';

// Track last refresh time to prevent duplicate refreshes
let lastRefreshTime = 0;

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-blue-100 text-blue-700',
  pending_payment: 'bg-yellow-100 text-yellow-700',
  past_due: 'bg-red-100 text-red-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700'
};

function BillingPage() {
  const { currentOrganization, getOrganization } = useOrganization();
  const { plans, loading: plansLoading, error: plansError } = usePlans();
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [billingInterval, setBillingInterval] = useState('month');
  const [currency, setCurrency] = useState('USD');

  // Modal states
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination state for invoices
  const [invoicePage, setInvoicePage] = useState(1);
  const invoicesPerPage = 10;

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
    }
  }, [organizationId]);

  const loadBillingData = async () => {
    try {
      setLoading(true);

      // Load billing, usage, and invoices separately to handle partial failures
      let billingRes = null;
      let usageRes = null;
      let invoicesRes = null;

      try {
        billingRes = await billingApi.getBilling(organizationId);
        setBillingData(billingRes.data);
      } catch (err) {
        console.error('Failed to load billing data:', err);
        // Don't show error toast for billing data - plans will still work
      }

      try {
        usageRes = await billingApi.getUsage(organizationId);
        setUsageData(usageRes.data);
      } catch (err) {
        console.error('Failed to load usage data:', err);
        // Usage data is optional
      }

      try {
        invoicesRes = await billingApi.getInvoices(organizationId);
        setInvoices(invoicesRes.data || []);
      } catch (err) {
        console.error('Failed to load invoices:', err);
        // Invoices are optional
      }

    } catch (err) {
      console.error('Error loading billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price, curr = 'USD') => {
    if (price === 'custom' || price === 'Contact Sales') return 'Custom';
    const symbol = currencySymbols[curr] || '$';
    const convertedPrice = price * (conversionRates[curr] || 1);

    // Use Indian numbering system for INR
    if (curr === 'INR') {
      return `${symbol}${formatIndianNumber(convertedPrice)}`;
    }

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
    // Check if already on this plan by comparing IDs
    const planId = plan._id?.toString() || plan.id?.toString();
    const effectivePlanId = effectivePlan?._id?.toString() || effectivePlan?.id?.toString();
    const isCurrentPlan = planId && effectivePlanId && planId === effectivePlanId;

    if (isCurrentPlan) {
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
    try {
      const response = await billingApi.updateSubscription(organizationId, {
        plan: plan.id || plan.tier,
        billingCycle: billingInterval === 'year' ? 'yearly' : 'monthly'
      });

      // Show success message with re-enable info if available
      if (response.data?.reEnabled) {
        const reEnabled = response.data.reEnabled;
        const parts = [];
        if (reEnabled.members?.reenabled > 0) parts.push(`${reEnabled.members.reenabled} member(s)`);
        if (reEnabled.projects?.reenabled > 0) parts.push(`${reEnabled.projects.reenabled} project(s)`);
        if (reEnabled.features?.reenabled > 0) parts.push(`${reEnabled.features.reenabled} feature(s)`);
        if (reEnabled.simulations?.reenabled > 0) parts.push(`${reEnabled.simulations.reenabled} simulation(s)`);

        if (parts.length > 0) {
          showToast.success(`Plan upgraded. Re-enabled: ${parts.join(', ')}`);
        } else {
          showToast.subscriptionUpdated();
        }
      } else {
        showToast.subscriptionUpdated();
      }

      // Refresh billing data
      await loadBillingData();

      // Refresh organization context to get updated members
      // Use debounce to prevent multiple refreshes
      const now = Date.now();
      if (now - lastRefreshTime > 2000) {
        lastRefreshTime = now;
        await getOrganization(organizationId);
      }
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to change plan');
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
      showToast.invoiceDownloaded();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to download invoice');
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  // Find the current plan - try multiple ways to match by ID first
  const currentPlanFromList = plans.find(plan => {
    // Get plan IDs
    const planId = plan._id?.toString() || plan.id?.toString();
    const subscriptionPlanId = billingData?.subscription?.planId?.toString() || billingData?.subscription?.plan?.toString();
    const billingPlanId = billingData?.plan?.id?.toString() || billingData?.plan?._id?.toString();

    // Match by ID (most precise)
    if (planId && subscriptionPlanId && planId === subscriptionPlanId) {
      return true;
    }
    if (planId && billingPlanId && planId === billingPlanId) {
      return true;
    }

    // Match by tier only if it's a unique match and IDs don't match
    const subscriptionPlan = billingData?.subscription?.plan;
    const billingPlanTier = billingData?.plan?.tier;

    // Only match by tier if it's a unique match
    if (subscriptionPlan && plan.tier === subscriptionPlan) {
      const matchingPlans = plans.filter(p => p.tier === subscriptionPlan);
      return matchingPlans.length === 1; // Only match if tier is unique
    }

    return false;
  });

  // If no plan found in list but we have billing plan data, use it
  const effectivePlan = currentPlanFromList || (billingData?.plan ? {
    id: billingData.plan.id || billingData.plan._id,
    _id: billingData.plan._id || billingData.plan.id,
    tier: billingData.plan.tier,
    name: billingData.plan.name || billingData.plan.displayName || 'Unknown Plan',
    displayName: billingData.plan.displayName || billingData.plan.name || 'Unknown Plan',
    billing: billingData.plan.billing || { price: 0, currency: 'USD', interval: 'month' },
    limits: billingData.plan.limits || {},
    credits: billingData.plan.credits || {},
    features: billingData.plan.features || []
  } : null);

  // Separate free and paid plans
  const freePlan = plans.find(plan => plan.tier === 'free' || plan.id === 'free');
  const paidPlans = plans.filter(plan => plan.tier !== 'free' && plan.id !== 'free');

  // Determine if user can downgrade/cancel - only if there's a free plan available
  const canDowngrade = freePlan && billingData?.subscription?.status !== 'cancelled';

  // Show error if plans failed to load
  if (plansError && !plansLoading) {
    console.error('Plans error:', plansError);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-sm text-gray-500">Manage your subscription and billing details</p>
        </div>
      </div>

      {/* Current Plan Summary */}
      {billingData && (
        <div className="bg-gradient-to-r from-[#DC2626] to-[#B91C1C] rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-red-100 text-sm">Current Plan</p>
              <h2 className="text-3xl font-bold">
                {effectivePlan?.displayName || effectivePlan?.name || 'No Active Plan'}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[billingData.subscription?.status] || STATUS_COLORS.trial}`}>
                  {getStatusLabel(billingData.subscription?.status || 'trial')}
                </span>
                {billingData.subscription?.status === 'cancelled' ? (
                  <span className="text-sm text-red-100">Access until: {formatDate(billingData.subscription?.currentPeriodEnd)}</span>
                ) : billingData.subscription?.status === 'trial' ? (
                  <span className="text-sm text-red-100">Trial ends: {formatDate(billingData.subscription?.trialEndsAt)}</span>
                ) : billingData.subscription?.currentPeriodEnd ? (
                  <span className="text-sm text-red-100">Next billing: {formatDate(billingData.subscription?.currentPeriodEnd)}</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Summary */}
      {usageData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage This Period</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {Object.entries(usageData.usage || {}).map(([key, value]) => {
              const isUnlimited = value.limit === 'unlimited' || value.limit === null || value.limit === undefined;
              const displayLimit = isUnlimited ? '∞' : value.limit;

              return (
                <div key={key} className="bg-gray-50 rounded-lg p-3 sm:p-4 min-w-0">
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block truncate">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 min-w-0">
                    <span className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{value.used}</span>
                    <span className="text-sm text-gray-500 flex-shrink-0">/ {displayLimit}</span>
                  </div>
                  {!isUnlimited && (
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          value.percentage >= 90 ? 'bg-red-500' :
                          value.percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(value.percentage || 0, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
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
                  month
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
                  year
                  <span className="ml-1 text-green-600 font-semibold">(Save 20%)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Plans Grid */}
          {plansLoading ? (
            <div className="flex justify-center py-8">
              <Loader />
            </div>
          ) : plansError ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">Failed to load plans</p>
              <p className="text-gray-500 text-sm">{plansError}</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No plans available. Please contact support.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Free Plan */}
              {freePlan && (() => {
                const freePlanId = freePlan._id?.toString() || freePlan.id?.toString();
                const effectivePlanId = effectivePlan?._id?.toString() || effectivePlan?.id?.toString();
                const isCurrentFreePlan = freePlanId && effectivePlanId && freePlanId === effectivePlanId;
                const isFreePlanCurrent = effectivePlan?.tier === 'free' && freePlan.tier === 'free';

                return (
                <div key={freePlan.id} className="flex flex-col">
                  <div
                    className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all hover:shadow-xl h-full flex flex-col ${
                      isCurrentFreePlan || isFreePlanCurrent ? 'border-[#DC2626] ring-2 ring-[#DC2626] ring-opacity-50' : 'border-gray-200'
                    }`}
                  >
                    {isCurrentFreePlan || isFreePlanCurrent ? (
                      <div className="absolute top-0 right-0 bg-[#DC2626] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                        Current Plan
                      </div>
                    ) : null}
                    <div className="p-6 flex-1 flex flex-col">
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

                      <div className="space-y-3 mb-6 flex-1">
                        {freePlan.credits?.includedCredits > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-600">
                              {formatIndianNumber(freePlan.credits.includedCredits)} included credits
                            </span>
                          </div>
                        )}
                        {freePlan.limits?.maxProjects > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-600">Up to {freePlan.limits.maxProjects} project{freePlan.limits.maxProjects > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {freePlan.limits?.maxFeatures > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-600">Up to {freePlan.limits.maxFeatures} feature{freePlan.limits.maxFeatures > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {freePlan.limits?.maxSimulations > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-600">{formatIndianNumber(freePlan.limits.maxSimulations)} simulation{freePlan.limits.maxSimulations > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {freePlan.limits?.maxUsers > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-600">Up to {freePlan.limits.maxUsers} user{freePlan.limits.maxUsers > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {freePlan.limits?.maxApiCalls > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-600">{formatIndianNumber(freePlan.limits.maxApiCalls)} API calls</span>
                          </div>
                        )}
                        {freePlan.limits?.maxTokens > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-600">{formatIndianNumber(freePlan.limits.maxTokens)} tokens</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleSelectPlan(freePlan)}
                          disabled={isCurrentFreePlan || isFreePlanCurrent}
                          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                            isCurrentFreePlan || isFreePlanCurrent
                              ? 'bg-[#DC2626] text-white cursor-default'
                              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                          }`}
                        >
                          {isCurrentFreePlan || isFreePlanCurrent ? 'Current Plan' : 'Select Plan'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
              })()}

              {/* Paid Plans */}
              {paidPlans.map((plan) => {
                const tierStyle = getTierColor(plan.tier);
                const isPopular = plan.isPopular || plan.tier === 'professional';
                // Match current plan by ID only - must have valid IDs on both sides
                const planId = plan._id?.toString() || plan.id?.toString();
                const effectivePlanId = effectivePlan?._id?.toString() || effectivePlan?.id?.toString();
                const isCurrentPlan = planId && effectivePlanId && planId === effectivePlanId;

                return (
                  <div key={plan.id} className="flex flex-col">
                    <div
                      className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all hover:shadow-xl h-full flex flex-col ${
                        isCurrentPlan ? 'border-[#DC2626] ring-2 ring-[#DC2626] ring-opacity-50' : isPopular ? 'border-[#DC2626] shadow-lg' : 'border-gray-200'
                      }`}
                    >
                      {/* Current Plan Badge - Right Side */}
                      {isCurrentPlan && (
                        <div className="absolute top-0 right-0 bg-[#DC2626] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                          Current Plan
                        </div>
                      )}

                      <div className="p-6 flex-1 flex flex-col">
                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${tierStyle.badge}`}>
                              {getTierName(plan.tier)}
                            </span>
                            {isPopular && (
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[#DC2626] text-white">
                                Popular
                              </span>
                            )}
                          </div>
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

                        <div className="space-y-3 mb-6 flex-1">
                          {plan.credits?.includedCredits > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-600">
                                {formatIndianNumber(plan.credits.includedCredits)} included credits
                              </span>
                            </div>
                          )}

                          {plan.limits?.maxProjects > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-600">Up to {plan.limits.maxProjects} project{plan.limits.maxProjects > 1 ? 's' : ''}</span>
                            </div>
                          )}

                          {plan.limits?.maxFeatures > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-600">Up to {plan.limits.maxFeatures} feature{plan.limits.maxFeatures > 1 ? 's' : ''}</span>
                            </div>
                          )}

                          {plan.limits?.maxSimulations > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-600">{formatIndianNumber(plan.limits.maxSimulations)} simulation{plan.limits.maxSimulations > 1 ? 's' : ''}</span>
                            </div>
                          )}

                          {plan.limits?.maxUsers > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-600">Up to {plan.limits.maxUsers} user{plan.limits.maxUsers > 1 ? 's' : ''}</span>
                            </div>
                          )}

                          {plan.limits?.maxApiCalls > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-600">{formatIndianNumber(plan.limits.maxApiCalls)} API calls</span>
                            </div>
                          )}

                          {plan.limits?.maxTokens > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-600">{formatIndianNumber(plan.limits.maxTokens)} tokens</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-100">
                          <button
                            onClick={() => handleSelectPlan(plan)}
                            disabled={isCurrentPlan}
                            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                              isCurrentPlan
                                ? 'bg-[#DC2626] text-white cursor-default'
                                : isPopular
                                  ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                            }`}
                          >
                            {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                          </button>
                          {plan.billing?.trialDays > 0 && !isCurrentPlan && (
                            <p className="text-center text-sm text-gray-500 mt-2">
                              {plan.billing.trialDays}-day free trial
                            </p>
                          )}
                        </div>
                      </div>
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
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">S.No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {invoices.slice((invoicePage - 1) * invoicesPerPage, invoicePage * invoicesPerPage).map((invoice, index) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {((invoicePage - 1) * invoicesPerPage) + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{invoice.invoiceNumber || invoice.number}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.paidAt || invoice.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.currency === 'INR'
                          ? `${getCurrencySymbol(invoice.currency)}${formatIndianNumber(invoice.amount || 0)}`
                          : `${getCurrencySymbol(invoice.currency)}${(invoice.amount || 0).toFixed(2)}`}
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
                          onClick={() => handleDownloadInvoice(invoice.id, invoice.invoiceNumber || invoice.number)}
                          className="text-[#DC2626] hover:text-[#B91C1C] p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="Download Invoice"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {invoices.length > invoicesPerPage && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {((invoicePage - 1) * invoicesPerPage) + 1} to {Math.min(invoicePage * invoicesPerPage, invoices.length)} of {invoices.length} invoices
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInvoicePage(prev => Math.max(prev - 1, 1))}
                    disabled={invoicePage === 1}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(invoices.length / invoicesPerPage) }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setInvoicePage(page)}
                        className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                          invoicePage === page
                            ? 'bg-[#DC2626] text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setInvoicePage(prev => Math.min(prev + 1, Math.ceil(invoices.length / invoicesPerPage)))}
                    disabled={invoicePage === Math.ceil(invoices.length / invoicesPerPage)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default BillingPage;
