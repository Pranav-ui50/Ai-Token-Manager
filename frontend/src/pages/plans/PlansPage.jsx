/**
 * Plans Page
 *
 * Displays all subscription plans with CRUD operations.
 */

import Loader from '../../components/common/Loader.jsx';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import planApi from '../../services/api/plan.api.js';
import usePermissions from '../../hooks/usePermissions.js';
import { useOrganization } from '../../context/index.js';
import { showToast } from '../../utils/toasts.js';

// Get status badge styles for subscription
const getStatusBadge = (status) => {
  const styles = {
    active: 'bg-green-100 text-green-700',
    trial: 'bg-blue-100 text-blue-700',
    pending_payment: 'bg-yellow-100 text-yellow-700',
    past_due: 'bg-orange-100 text-orange-700',
    expired: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700'
  };
  return styles[status] || 'bg-gray-100 text-gray-700';
};

const PlansPage = () => {
  const { canManagePlans, canViewPlans, role } = usePermissions();
  const { currentOrganization } = useOrganization();
  const isViewer = role === 'viewer';
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    tier: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Get subscription data from organization
  const subscription = currentOrganization?.subscription || null;
  const hasSubscription = subscription && (subscription.planId || subscription.status === 'trial');

  // Get plan display name
  const getPlanDisplayName = () => {
    if (subscription?.planId?.name) {
      return subscription.planId.name;
    }
    if (subscription?.planName) {
      return subscription.planName;
    }
    if (subscription?.plan) {
      return subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);
    }
    if (subscription?.status === 'trial') {
      return 'Free Trial';
    }
    return null;
  };

  const planDisplayName = getPlanDisplayName();

  // Fetch plans
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await planApi.getAll({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });

      if (response.success) {
        setPlans(response.data.plans);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [filters.status, filters.tier, pagination.page]);

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) {
      return;
    }

    try {
      await planApi.delete(id);
      showToast.planDeleted();
      fetchPlans();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to delete plan');
    }
  };

  // Handle clone
  const handleClone = async (id) => {
    try {
      await planApi.clone(id);
      showToast.success('Plan cloned successfully');
      fetchPlans();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to clone plan');
    }
  };

  // Get tier badge color
  const getTierColor = (tier) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      starter: 'bg-blue-100 text-blue-800',
      professional: 'bg-purple-100 text-purple-800',
      business: 'bg-yellow-100 text-yellow-800',
      enterprise: 'bg-[#DC2626]/10 text-[#DC2626]'
    };
    return colors[tier] || colors.starter;
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      archived: 'bg-yellow-100 text-yellow-800',
      deprecated: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.draft;
  };

  // Format price
  const formatPrice = (price, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
              <p className="text-sm text-gray-500">
                Manage pricing plans and profitability
              </p>
            </div>
            {canManagePlans() && (
              <Link
                to="/plans/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Plan
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Plan Section - Only show if organization has a subscription */}
        {hasSubscription && planDisplayName && (
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your Current Plan</h2>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(subscription?.status)}`}>
                {subscription?.status?.charAt(0).toUpperCase() + subscription?.status?.slice(1)}
              </span>
            </div>

            {/* Plan Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Plan Name */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#DC2626]/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Plan</p>
                  <p className="text-lg font-semibold text-gray-900">{planDisplayName}</p>
                </div>
              </div>

              {/* Billing Interval */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Billing</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {subscription?.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                  </p>
                </div>
              </div>

              {/* Started Date (for active subscriptions) */}
              {subscription?.status === 'active' && subscription?.currentPeriodStart && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-4 4M3 5v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Started</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(subscription.currentPeriodStart).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Trial End (for trial subscriptions) */}
              {subscription?.status === 'trial' && subscription?.trialEndsAt && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Trial Ends</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(subscription.trialEndsAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Renews Date (for active subscriptions) */}
              {subscription?.status === 'active' && subscription?.currentPeriodEnd && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Renews</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Plan Limits Section */}
            {subscription?.planId?.limits && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Plan Includes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Users Limit */}
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="text-gray-700">
                      Up to <span className="font-semibold text-gray-900">{subscription.planId.limits.maxUsers || 'Unlimited'}</span> users
                    </span>
                  </div>

                  {/* Projects Limit */}
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-gray-700">
                      Up to <span className="font-semibold text-gray-900">{subscription.planId.limits.maxProjects || 'Unlimited'}</span> projects
                    </span>
                  </div>

                  {/* Features Limit */}
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                    <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span className="text-gray-700">
                      Up to <span className="font-semibold text-gray-900">{subscription.planId.limits.maxFeatures || 'Unlimited'}</span> features
                    </span>
                  </div>

                  {/* Simulations Limit */}
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                    <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-gray-700">
                      <span className="font-semibold text-gray-900">{subscription.planId.limits.maxSimulations || 'Unlimited'}</span> simulations
                    </span>
                  </div>

                  {/* API Calls Limit */}
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                    <svg className="w-5 h-5 text-cyan-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-700">
                      <span className="font-semibold text-gray-900">{subscription.planId.limits.maxApiCalls ? subscription.planId.limits.maxApiCalls.toLocaleString() : 'Unlimited'}</span> API calls
                    </span>
                  </div>

                  {/* Tokens/Credits Limit */}
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                    <svg className="w-5 h-5 text-pink-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    <span className="text-gray-700">
                      <span className="font-semibold text-gray-900">{(subscription.planId.credits?.includedCredits || subscription.planId.limits.maxTokens || 0).toLocaleString()}</span> tokens included
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters - Only show for non-viewers */}
        {!isViewer && (
        <div className="bg-white rounded-xl shadow-soft p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </div>

            {/* Tier Filter */}
            <div>
              <select
                value={filters.tier}
                onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
              >
                <option value="">All Tiers</option>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="business">Business</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={fetchPlans}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Refresh
              </button>
              <Link
                to="/plans/compare"
                className="px-4 py-2 bg-[#DC2626]/10 text-[#DC2626] rounded-lg hover:bg-[#DC2626]/20 transition-colors"
              >
                Compare Plans
              </Link>
            </div>
          </div>
        </div>
        )}

        {/* Plans Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader />
          </div>
        ) : plans.length === 0 ? (
          !isViewer && (
            <div className="bg-white rounded-xl shadow-soft p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No plans</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new plan.
              </p>
              <Link
                to="/plans/new"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
              >
                Add Plan
              </Link>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan._id}
                className="bg-white rounded-xl shadow-soft overflow-hidden hover:shadow-medium transition-shadow"
              >
                {/* Plan Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierColor(plan.tier)}`}>
                        {plan.tier}
                      </span>
                      {plan.settings?.isDefault && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DC2626]/10 text-[#DC2626]">
                          Default
                        </span>
                      )}
                      <h3 className="mt-2 text-lg font-semibold text-gray-900">{plan.name}</h3>
                      {plan.description && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{plan.description}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}>
                      {plan.status}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatPrice(plan.billing.price, plan.billing.currency)}
                    </span>
                    <span className="text-gray-500">/{plan.billing.interval}</span>
                    {plan.discount?.percentage > 0 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {plan.discount.percentage}% off
                      </span>
                    )}
                  </div>

                  {/* Pricing Model & Credits */}
                  <div className="mt-3 space-y-2">
                    {/* Pricing Model Badge */}
                    {plan.pricingModel?.type && plan.pricingModel.type !== 'flat' && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">
                          {plan.pricingModel.type === 'usage-based' ? 'Usage-Based' : plan.pricingModel.type === 'tiered' ? 'Tiered Pricing' : 'Hybrid Pricing'}
                        </span>
                        {plan.pricingModel.usageBased?.includedTokens > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({plan.pricingModel.usageBased.includedTokens.toLocaleString()} tokens included)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Credits */}
                    {plan.credits?.includedCredits > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-1 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{plan.credits.includedCredits.toLocaleString()} {plan.credits.creditType}s</span>
                        {plan.credits.rollover?.enabled && (
                          <span className="ml-2 text-xs text-green-600">
                            (Rollover up to {plan.credits.rollover.maxRolloverPercent}%)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Auto-recharge */}
                    {plan.credits?.autoRecharge?.enabled && (
                      <div className="flex items-center text-xs text-blue-600">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Auto-recharge at {plan.credits.autoRecharge.threshold} {plan.credits.creditType}s
                      </div>
                    )}
                  </div>
                </div>

                {/* Plan Features */}
                <div className="p-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Features ({plan.features?.length || 0})
                  </h4>
                  <ul className="space-y-2">
                    {(plan.features || []).slice(0, 3).map((featureConfig, index) => (
                      <li key={index} className="flex items-center text-sm">
                        {featureConfig.enabled ? (
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span className={featureConfig.enabled ? 'text-gray-700' : 'text-gray-400'}>
                          {featureConfig.feature?.name || 'Feature'}
                        </span>
                      </li>
                    ))}
                    {plan.features?.length > 3 && (
                      <li className="text-sm text-gray-500">
                        +{plan.features.length - 3} more features
                      </li>
                    )}
                  </ul>

                  {/* Profitability */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Gross Margin</span>
                      <span className={`font-medium ${plan.profitability?.grossMargin >= 50 ? 'text-green-600' : plan.profitability?.grossMargin >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {plan.profitability?.grossMargin?.toFixed(1) || 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-500">Break-even Users</span>
                      <span className="font-medium text-gray-900">
                        {plan.profitability?.breakEvenUsers || 0}
                      </span>
                    </div>

                    {/* Usage Limits Summary */}
                    {(plan.limits?.maxUsers || plan.limits?.maxApiCalls || plan.limits?.maxTokens) && (
                      <div className="mt-3 pt-3 border-t border-gray-50">
                        <p className="text-xs text-gray-500 mb-1">Plan Limits:</p>
                        <div className="flex flex-wrap gap-2">
                          {plan.limits.maxUsers && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                              {plan.limits.maxUsers} users
                            </span>
                          )}
                          {plan.limits.maxApiCalls && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700">
                              {plan.limits.maxApiCalls.toLocaleString()} calls
                            </span>
                          )}
                          {plan.limits.maxTokens && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700">
                              {plan.limits.maxTokens.toLocaleString()} tokens
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tiered Pricing Display */}
                    {plan.pricingModel?.type === 'tiered' && plan.pricingModel?.tiers?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-50">
                        <p className="text-xs text-gray-500 mb-1">Pricing Tiers:</p>
                        <div className="space-y-1">
                          {plan.pricingModel.tiers.slice(0, 3).map((tier, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-gray-600">
                                {tier.to ? `${tier.from.toLocaleString()}-${tier.to.toLocaleString()}` : `${tier.from.toLocaleString()}+`} {tier.unitType}s
                              </span>
                              <span className="text-gray-900 font-medium">
                                ${tier.pricePerUnit.toFixed(4)}/unit
                              </span>
                            </div>
                          ))}
                          {plan.pricingModel.tiers.length > 3 && (
                            <span className="text-xs text-gray-400">+{plan.pricingModel.tiers.length - 3} more tiers</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Credit Packs */}
                    {plan.credits?.creditPricing?.creditPacks?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-50">
                        <p className="text-xs text-gray-500 mb-1">Credit Packs:</p>
                        <div className="flex flex-wrap gap-1">
                          {plan.credits.creditPricing.creditPacks.map((pack, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-50 text-yellow-700">
                              {pack.name}: {pack.credits.toLocaleString()} for ${pack.price}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/plans/${plan._id}`}
                      className="text-[#DC2626] hover:text-[#B91C1C] p-1.5 rounded-lg hover:bg-red-50 transition-colors inline-flex items-center justify-center"
                      title="View Details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    {!isViewer && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleClone(plan._id)}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                      >
                        Clone
                      </button>
                      <button
                        onClick={() => handleDelete(plan._id)}
                        className="text-gray-500 hover:text-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 bg-white rounded-xl shadow-soft px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PlansPage;