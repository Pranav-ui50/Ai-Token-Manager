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
import { showToast } from '../../utils/toasts.js';

const PlansPage = () => {
  const { canManagePlans, canViewPlans } = usePermissions();
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
        {/* Filters */}
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

        {/* Plans Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-[#DC2626]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-soft p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No plans</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new plan.</p>
            <Link
              to="/plans/new"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
            >
              Add Plan
            </Link>
          </div>
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
                      className="text-[#DC2626] hover:text-[#B91C1C] font-medium text-sm"
                    >
                      View Details
                    </Link>
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