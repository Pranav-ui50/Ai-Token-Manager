/**
 * Plan Detail Page
 *
 * Displays detailed information about a subscription plan.
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';
import planApi from '../../services/api/plan.api.js';
import usePermissions from '../../hooks/usePermissions.js';

const PlanDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = usePermissions();
  const isViewer = role === 'viewer';
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch plan details
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoading(true);
        const response = await planApi.getById(id);
        if (response.success) {
          setPlan(response.data);
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to fetch plan');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [id]);

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return;
    }

    try {
      await planApi.delete(id);
      navigate('/plans');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete plan');
    }
  };

  // Handle clone
  const handleClone = async () => {
    try {
      const response = await planApi.clone(id);
      if (response.success) {
        navigate(`/plans/${response.data._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to clone plan');
    }
  };

  // Handle set default
  const handleSetDefault = async () => {
    try {
      await planApi.setDefault(id);
      const response = await planApi.getById(id);
      if (response.success) {
        setPlan(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to set as default');
    }
  };

  // Get tier badge
  const getTierBadge = (tier) => {
    const styles = {
      free: 'bg-gray-100 text-gray-800',
      starter: 'bg-blue-100 text-blue-800',
      professional: 'bg-purple-100 text-purple-800',
      business: 'bg-yellow-100 text-yellow-800',
      enterprise: 'bg-[#DC2626]/10 text-[#DC2626]'
    };
    return styles[tier] || styles.starter;
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      archived: 'bg-yellow-100 text-yellow-800',
      deprecated: 'bg-red-100 text-red-800'
    };
    return styles[status] || styles.draft;
  };

  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  // Format number
  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };

  if (loading) {
    return <Loader fullPage text="Loading plan details..." />;
  }

  if (error && !plan) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <svg className="h-12 w-12 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Plan</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <Link
            to="/plans"
            className="mt-4 inline-flex items-center px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]"
          >
            Back to Plans
          </Link>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/plans"
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierBadge(plan.tier)}`}>
                    {plan.tier}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(plan.status)}`}>
                    {plan.status}
                  </span>
                  {plan.settings?.isDefault && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DC2626]/10 text-[#DC2626]">
                      Default
                    </span>
                  )}
                </div>
                {plan.description && (
                  <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isViewer && (
                <>
                  <button
                    onClick={handleClone}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Clone
                  </button>
                  <Link
                    to={`/plans/${id}/edit`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            {['overview', 'features', 'pricing', 'profitability', 'limits'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-[#DC2626] text-[#DC2626]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Billing Info */}
              <div className="bg-white rounded-xl shadow-soft p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-gray-500">Monthly Price</label>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(plan.billing?.price, plan.billing?.currency)}
                      <span className="text-base font-normal text-gray-500">/{plan.billing?.interval}</span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Pricing Model</label>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {plan.pricingModel?.type || 'flat'}
                    </p>
                  </div>
                </div>
                {plan.discount?.percentage > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Discount:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {plan.discount.percentage}% off
                      </span>
                      {plan.discount.validUntil && (
                        <span className="text-xs text-gray-400">
                          until {new Date(plan.discount.validUntil).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Credits */}
              {plan.credits?.includedCredits > 0 && (
                <div className="bg-white rounded-xl shadow-soft p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit System</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm text-gray-500">Included Credits</label>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatNumber(plan.credits.includedCredits)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Credit Type</label>
                      <p className="text-lg font-semibold text-gray-900 capitalize">
                        {plan.credits.creditType || 'tokens'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Price per Credit</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(plan.credits.creditPricing?.pricePerCredit || 0)}
                      </p>
                    </div>
                  </div>
                  {plan.credits.rollover?.enabled && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Rollover enabled (max {plan.credits.rollover.maxRolloverPercent}%)</span>
                      </div>
                    </div>
                  )}
                  {plan.credits.autoRecharge?.enabled && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-gray-700">
                          Auto-recharge at {plan.credits.autoRecharge.threshold} {plan.credits.creditType}s
                          ({formatCurrency(plan.credits.autoRecharge.amount)})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-soft p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Features</span>
                    <span className="text-sm font-medium text-gray-900">
                      {plan.features?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Gross Margin</span>
                    <span className={`text-sm font-medium ${
                      (plan.profitability?.grossMargin || 0) >= 50 ? 'text-green-600' :
                      (plan.profitability?.grossMargin || 0) >= 0 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {(plan.profitability?.grossMargin || 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Break-even Users</span>
                    <span className="text-sm font-medium text-gray-900">
                      {plan.profitability?.breakEvenUsers || 0}
                    </span>
                  </div>
                </div>
                {!plan.settings?.isDefault && (
                  <button
                    onClick={handleSetDefault}
                    className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    Set as Default
                  </button>
                )}
              </div>

              {/* Limits Summary */}
              <div className="bg-white rounded-xl shadow-soft p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Limits</h3>
                <div className="space-y-3">
                  {plan.limits?.maxUsers && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Max Users</span>
                      <span className="text-sm font-medium text-gray-900">{formatNumber(plan.limits.maxUsers)}</span>
                    </div>
                  )}
                  {plan.limits?.maxApiCalls && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Max API Calls</span>
                      <span className="text-sm font-medium text-gray-900">{formatNumber(plan.limits.maxApiCalls)}</span>
                    </div>
                  )}
                  {plan.limits?.maxTokens && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Max Tokens</span>
                      <span className="text-sm font-medium text-gray-900">{formatNumber(plan.limits.maxTokens)}</span>
                    </div>
                  )}
                  {plan.limits?.maxFeatures && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Max Features</span>
                      <span className="text-sm font-medium text-gray-900">{formatNumber(plan.limits.maxFeatures)}</span>
                    </div>
                  )}
                  {plan.limits?.maxSimulations && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Max Simulations</span>
                      <span className="text-sm font-medium text-gray-900">{formatNumber(plan.limits.maxSimulations)}</span>
                    </div>
                  )}
                  {!plan.limits?.maxUsers && !plan.limits?.maxApiCalls && !plan.limits?.maxTokens && (
                    <p className="text-sm text-gray-400">No limits configured</p>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-white rounded-xl shadow-soft p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">Created</span>
                    <p className="text-gray-900">
                      {new Date(plan.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Updated</span>
                    <p className="text-gray-900">
                      {new Date(plan.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Plan ID</span>
                    <p className="text-gray-900 font-mono text-xs">{plan._id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <div className="bg-white rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Plan Features</h3>
              <Link
                to={`/plans/${id}/edit`}
                className="text-[#DC2626] hover:text-[#B91C1C] text-sm font-medium"
              >
                Manage Features
              </Link>
            </div>
            {plan.features?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plan.features.map((featureConfig, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${featureConfig.enabled ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className={`font-medium ${featureConfig.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                          {featureConfig.feature?.name || `Feature ${index + 1}`}
                        </h4>
                        {featureConfig.feature?.category && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 mt-1">
                            {featureConfig.feature.category}
                          </span>
                        )}
                      </div>
                      {featureConfig.enabled ? (
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    {featureConfig.limits && (
                      <div className="mt-3 text-sm text-gray-500">
                        {featureConfig.limits.maxRequests && (
                          <p>Max: {formatNumber(featureConfig.limits.maxRequests)} requests</p>
                        )}
                        {featureConfig.limits.maxTokens && (
                          <p>Max: {formatNumber(featureConfig.limits.maxTokens)} tokens</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No features</h3>
                <p className="mt-1 text-sm text-gray-500">Add features to this plan.</p>
              </div>
            )}
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            {/* Pricing Model */}
            <div className="bg-white rounded-xl shadow-soft p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Model</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-500">Model Type</label>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {plan.pricingModel?.type || 'flat'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Base Price</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(plan.billing?.price, plan.billing?.currency)}/{plan.billing?.interval}
                  </p>
                </div>
              </div>
            </div>

            {/* Usage-Based Pricing */}
            {plan.pricingModel?.type === 'usage-based' && plan.pricingModel?.usageBased && (
              <div className="bg-white rounded-xl shadow-soft p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage-Based Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <label className="text-sm text-gray-500">Included Tokens</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatNumber(plan.pricingModel.usageBased.includedTokens)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Included Requests</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatNumber(plan.pricingModel.usageBased.includedRequests)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Price per Token</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(plan.pricingModel.usageBased.pricePerToken)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Overage Multiplier</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {plan.pricingModel.usageBased.overageMultiplier}x
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tiered Pricing */}
            {plan.pricingModel?.type === 'tiered' && plan.pricingModel?.tiers && (
              <div className="bg-white rounded-xl shadow-soft p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Tiers</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {plan.pricingModel.tiers.map((tier, idx) => (
                        <tr key={idx}>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatNumber(tier.from)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{tier.to ? formatNumber(tier.to) : '∞'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(tier.pricePerUnit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Credit Packs */}
            {plan.credits?.creditPricing?.creditPacks && plan.credits.creditPricing.creditPacks.length > 0 && (
              <div className="bg-white rounded-xl shadow-soft p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Packs</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plan.credits.creditPricing.creditPacks.map((pack, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900">{pack.name}</h4>
                      <p className="text-2xl font-bold text-[#DC2626] mt-1">{formatCurrency(pack.price)}</p>
                      <p className="text-sm text-gray-500">{formatNumber(pack.credits)} credits</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profitability Tab */}
        {activeTab === 'profitability' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-soft p-6">
                <p className="text-sm text-gray-500">Gross Margin</p>
                <p className={`text-2xl font-bold mt-1 ${
                  (plan.profitability?.grossMargin || 0) >= 50 ? 'text-green-600' :
                  (plan.profitability?.grossMargin || 0) >= 0 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {(plan.profitability?.grossMargin || 0).toFixed(1)}%
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-soft p-6">
                <p className="text-sm text-gray-500">Net Margin</p>
                <p className={`text-2xl font-bold mt-1 ${
                  (plan.profitability?.netMargin || 0) >= 30 ? 'text-green-600' :
                  (plan.profitability?.netMargin || 0) >= 0 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {(plan.profitability?.netMargin || 0).toFixed(1)}%
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-soft p-6">
                <p className="text-sm text-gray-500">Break-even Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {plan.profitability?.breakEvenUsers || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-soft p-6">
                <p className="text-sm text-gray-500">Contribution Margin</p>
                <p className={`text-2xl font-bold mt-1 ${
                  (plan.profitability?.contributionMargin || 0) > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(plan.profitability?.contributionMargin || 0)}
                </p>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white rounded-xl shadow-soft p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Fixed Costs</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Monthly Fixed Costs</span>
                      <span className="text-sm font-medium">{formatCurrency(plan.costs?.fixedCostsPerMonth || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Variable Cost %</span>
                      <span className="text-sm font-medium">{plan.costs?.variableCostPercentage || 0}%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Revenue</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Base Price</span>
                      <span className="text-sm font-medium">{formatCurrency(plan.billing?.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Per User Revenue</span>
                      <span className="text-sm font-medium">{formatCurrency(plan.billing?.price)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Limits Tab */}
        {activeTab === 'limits' && (
          <div className="bg-white rounded-xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Plan Limits & Quotas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plan.limits?.maxUsers && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Max Users</p>
                      <p className="text-xl font-bold text-gray-900">{formatNumber(plan.limits.maxUsers)}</p>
                    </div>
                  </div>
                </div>
              )}
              {plan.limits?.maxApiCalls && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Max API Calls</p>
                      <p className="text-xl font-bold text-gray-900">{formatNumber(plan.limits.maxApiCalls)}</p>
                    </div>
                  </div>
                </div>
              )}
              {plan.limits?.maxTokens && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Max Tokens</p>
                      <p className="text-xl font-bold text-gray-900">{formatNumber(plan.limits.maxTokens)}</p>
                    </div>
                  </div>
                </div>
              )}
              {plan.limits?.maxFeatures && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Max Features</p>
                      <p className="text-xl font-bold text-gray-900">{formatNumber(plan.limits.maxFeatures)}</p>
                    </div>
                  </div>
                </div>
              )}
              {plan.limits?.maxSimulations && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-100 rounded-lg">
                      <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Max Simulations</p>
                      <p className="text-xl font-bold text-gray-900">{formatNumber(plan.limits.maxSimulations)}</p>
                    </div>
                  </div>
                </div>
              )}
              {plan.limits?.rateLimit && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Rate Limit</p>
                      <p className="text-xl font-bold text-gray-900">{plan.limits.rateLimit} req/min</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {!plan.limits?.maxUsers && !plan.limits?.maxApiCalls && !plan.limits?.maxTokens && (
              <div className="text-center py-12 text-gray-500">
                <p>No limits configured for this plan.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PlanDetailPage;
