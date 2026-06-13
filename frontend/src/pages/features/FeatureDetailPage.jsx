/**
 * Feature Detail Page
 *
 * Displays detailed information about a single feature.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import featureApi from '../../services/api/feature.api.js';
import { useFeatureCurrency } from '../../hooks/useProjectCurrency.js';
import { formatCurrencyWithSymbol, getCurrencySymbol } from '../../utils/currency.js';

const FeatureDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [feature, setFeature] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [costEstimate, setCostEstimate] = useState(null);
  const [estimateParams, setEstimateParams] = useState({
    requests: 1000,
    users: 1
  });

  // Get currency from feature's project
  const { currency, currencySymbol } = useFeatureCurrency(feature);

  // Profit margin state
  const [profitParams, setProfitParams] = useState({
    sellingPricePerRequest: 0.01,
    billingModel: 'per_request', // 'per_request', 'per_user', 'monthly_subscription'
    monthlySubscriptionPrice: 29.99,
    requestsPerUser: 1000,
    usersCount: 100
  });

  // Initialize profit params when feature data loads
  useEffect(() => {
    if (feature) {
      // Calculate initial selling price based on model pricing
      const inputTokens = feature.tokenEstimates?.inputTokensPerRequest || 500;
      const outputTokens = feature.tokenEstimates?.outputTokensPerRequest || 500;
      const inputPrice = feature.model?.pricing?.inputPrice || 0;
      const outputPrice = feature.model?.pricing?.outputPrice || 0;
      const fixedCostPerRequest = feature.infrastructureCost?.fixedCostPerRequest || 0;
      const monthlyFixedCost = feature.infrastructureCost?.monthlyFixedCost || 0;

      const inputTokenCost = (inputPrice / 1000000) * inputTokens;
      const outputTokenCost = (outputPrice / 1000000) * outputTokens;
      const tokenCostPerRequest = inputTokenCost + outputTokenCost;
      const totalCostPerRequest = tokenCostPerRequest + fixedCostPerRequest;

      // Set reasonable defaults based on cost
      const suggestedPrice = totalCostPerRequest > 0 ? totalCostPerRequest * 1.5 : 0.01;
      const suggestedMonthlyPrice = totalCostPerRequest > 0
        ? (totalCostPerRequest * 1000 * 1.5) + (monthlyFixedCost * 1.2) // 1000 requests + margin
        : 29.99;

      setProfitParams(prev => ({
        ...prev,
        sellingPricePerRequest: Math.max(suggestedPrice, 0.01),
        monthlySubscriptionPrice: Math.max(suggestedMonthlyPrice, 9.99),
        requestsPerUser: feature.limits?.maxRequestsPerUser || 1000
      }));
    }
  }, [feature?._id]); // Only run when feature ID changes

  // Fetch feature details
  useEffect(() => {
    const fetchFeature = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await featureApi.getById(id);

        if (response.success && response.data?.feature) {
          setFeature(response.data.feature);
        } else if (response.data) {
          // Handle case where response.data is the feature directly
          setFeature(response.data);
        } else {
          setError('Feature not found');
        }
      } catch (err) {
        console.error('Failed to fetch feature:', err);
        const errorMessage = err.response?.data?.error?.message ||
                            err.response?.data?.message ||
                            err.message ||
                            'Failed to fetch feature';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchFeature();
  }, [id]);

  // Calculate cost estimate
  const calculateCost = async () => {
    try {
      const response = await featureApi.calculateCost(id, {
        requestsPerMonth: estimateParams.requests,
        usersPerMonth: estimateParams.users
      });
      if (response.success && response.data?.estimate) {
        setCostEstimate(response.data.estimate);
      }
    } catch (err) {
      console.error('Failed to calculate cost:', err);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this feature? This action cannot be undone.')) {
      return;
    }

    try {
      await featureApi.delete(id);
      navigate('/features');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete feature');
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      deprecated: 'bg-red-100 text-red-800'
    };
    return styles[status] || styles.inactive;
  };

  // Get category badge
  const getCategoryBadge = (category) => {
    const styles = {
      chat: 'bg-blue-100 text-blue-800',
      completion: 'bg-green-100 text-green-800',
      embedding: 'bg-purple-100 text-purple-800',
      image: 'bg-yellow-100 text-yellow-800',
      audio: 'bg-pink-100 text-pink-800',
      video: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return styles[category] || styles.other;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return formatCurrencyWithSymbol(amount, currency);
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };

  // Format percentage
  const formatPercent = (num) => {
    // Handle extreme values
    if (!isFinite(num) || isNaN(num)) return '0.00%';
    if (Math.abs(num) > 10000) return `${num >= 0 ? '+' : ''}${(num / 1000).toFixed(2)}k%`;
    if (Math.abs(num) > 1000) return `${num >= 0 ? '+' : ''}${num.toFixed(0)}%`;
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  // Calculate profit margin - Dynamic calculation with useMemo
  const profitAnalysis = useMemo(() => {
    if (!feature) return null;

    const { sellingPricePerRequest, billingModel, monthlySubscriptionPrice, requestsPerUser, usersCount } = profitParams;
    const inputTokens = feature.tokenEstimates?.inputTokensPerRequest || 0;
    const outputTokens = feature.tokenEstimates?.outputTokensPerRequest || 0;
    const inputPrice = feature.model?.pricing?.inputPrice || 0;
    const outputPrice = feature.model?.pricing?.outputPrice || 0;
    const fixedCostPerRequest = feature.infrastructureCost?.fixedCostPerRequest || 0;
    const overheadPercentage = feature.infrastructureCost?.overheadPercentage || 0;
    const monthlyFixedCost = feature.infrastructureCost?.monthlyFixedCost || 0;

    // Calculate cost per request
    const inputTokenCost = (inputPrice / 1000000) * inputTokens;
    const outputTokenCost = (outputPrice / 1000000) * outputTokens;
    const tokenCostPerRequest = inputTokenCost + outputTokenCost;
    const infrastructureCostPerRequest = fixedCostPerRequest;
    const baseCostPerRequest = tokenCostPerRequest + infrastructureCostPerRequest;
    const totalCostPerRequest = baseCostPerRequest * (1 + overheadPercentage / 100);

    // Check if we have valid pricing data
    const hasPricingData = inputPrice > 0 || outputPrice > 0 || fixedCostPerRequest > 0;

    let revenue, cost, profit, margin, profitPerRequest;

    if (billingModel === 'per_request') {
      // Per-request billing
      revenue = sellingPricePerRequest;
      cost = totalCostPerRequest;
      profit = revenue - cost;
      margin = revenue > 0 ? ((profit / revenue) * 100) : (hasPricingData ? -100 : 0);
      profitPerRequest = profit;
    } else if (billingModel === 'per_user') {
      // Per-user billing (fixed requests per user)
      const revenuePerUser = sellingPricePerRequest * requestsPerUser;
      const costPerUser = totalCostPerRequest * requestsPerUser;
      revenue = revenuePerUser;
      cost = costPerUser;
      profit = revenuePerUser - costPerUser;
      margin = revenue > 0 ? ((profit / revenue) * 100) : (hasPricingData ? -100 : 0);
      profitPerRequest = profit / requestsPerUser;
    } else {
      // Monthly subscription
      const totalRequests = usersCount * requestsPerUser;
      revenue = monthlySubscriptionPrice;
      cost = (totalCostPerRequest * totalRequests) + (monthlyFixedCost / usersCount);
      profit = revenue - cost;
      margin = revenue > 0 ? ((profit / revenue) * 100) : (hasPricingData ? -100 : 0);
      profitPerRequest = usersCount > 0 ? profit / totalRequests : 0;
    }

    // Break-even calculation
    const breakEvenRequests = sellingPricePerRequest > totalCostPerRequest
      ? Math.ceil(monthlyFixedCost / (sellingPricePerRequest - totalCostPerRequest))
      : null;

    return {
      costPerRequest: totalCostPerRequest,
      tokenCostPerRequest,
      infrastructureCostPerRequest,
      revenue,
      cost,
      profit,
      margin,
      breakEvenRequests,
      monthlyFixedCost,
      // Additional metrics
      markup: cost > 0 ? ((revenue - cost) / cost * 100) : 0,
      roi: cost > 0 ? (profit / cost * 100) : 0,
      isProfitable: profit > 0,
      profitPerRequest
    };
  }, [feature, profitParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-[#DC2626] mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-500">Loading feature details...</p>
        </div>
      </div>
    );
  }

  if (error && !feature) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <svg className="h-12 w-12 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Feature</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <Link
            to="/features"
            className="mt-4 inline-flex items-center px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]"
          >
            Back to Features
          </Link>
        </div>
      </div>
    );
  }

  if (!feature) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/features"
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{feature.name}</h1>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(feature.status)}`}>
                    {feature.status}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(feature.category)}`}>
                    {feature.category}
                  </span>
                </div>
                {feature.description && (
                  <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={`/features/${id}/edit`}
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
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            {['overview', 'tokens', 'costs', 'profit', 'calculator'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-[#DC2626] text-[#DC2626]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'profit' ? 'Profit Margin' : tab}
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
              {/* Model & Provider */}
              <div className="bg-white rounded-xl shadow-soft p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Model & Provider</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-gray-500">AI Model</label>
                    <p className="text-gray-900 font-medium">{feature.model?.displayName || feature.model?.name || 'N/A'}</p>
                    {feature.model?.type && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 mt-1">
                        {feature.model.type}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Provider</label>
                    <p className="text-gray-900 font-medium">{feature.provider?.name || 'N/A'}</p>
                    {feature.provider?.category && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700 mt-1">
                        {feature.provider.category}
                      </span>
                    )}
                  </div>
                </div>
                {feature.model?.pricing && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Model Pricing</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <span className="text-xs text-gray-500">Input Price</span>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(feature.model.pricing.inputPrice || 0)}/1M tokens
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <span className="text-xs text-gray-500">Output Price</span>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(feature.model.pricing.outputPrice || 0)}/1M tokens
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Token Estimates */}
              <div className="bg-white rounded-xl shadow-soft p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Estimates</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-gray-500">Input Tokens/Request</label>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatNumber(feature.tokenEstimates?.inputTokensPerRequest)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Output Tokens/Request</label>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatNumber(feature.tokenEstimates?.outputTokensPerRequest)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Calculation Method</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {feature.tokenEstimates?.calculationMethod || 'fixed'}
                    </span>
                  </div>
                  {feature.tokenEstimates?.dynamicMultiplier && (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-500">Dynamic Multiplier</span>
                      <span className="text-sm font-medium text-gray-900">
                        {feature.tokenEstimates.dynamicMultiplier}x
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-soft p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total Tokens/Request</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatNumber((feature.tokenEstimates?.inputTokensPerRequest || 0) +
                                    (feature.tokenEstimates?.outputTokensPerRequest || 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Infrastructure Overhead</span>
                    <span className="text-sm font-medium text-gray-900">
                      {feature.infrastructureCost?.overheadPercentage || 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Fixed Cost/Request</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(feature.infrastructureCost?.fixedCostPerRequest || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-white rounded-xl shadow-soft p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">Created</span>
                    <p className="text-gray-900">
                      {new Date(feature.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Updated</span>
                    <p className="text-gray-900">
                      {new Date(feature.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Feature ID</span>
                    <p className="text-gray-900 font-mono text-xs">{feature._id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tokens Tab */}
        {activeTab === 'tokens' && (
          <div className="bg-white rounded-xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Token Consumption Analysis</h3>

            {/* Model Info */}
            {feature.model && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-500">AI Model</span>
                    <p className="font-medium text-gray-900">{feature.model.displayName || feature.model.name || 'N/A'}</p>
                  </div>
                  {feature.provider && (
                    <div className="text-right">
                      <span className="text-sm text-gray-500">Provider</span>
                      <p className="font-medium text-gray-900">{feature.provider.displayName || feature.provider.name || 'N/A'}</p>
                    </div>
                  )}
                </div>
                {feature.model.pricing && (
                  <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <span className="text-xs text-gray-500">Input Price</span>
                      <p className="text-lg font-bold text-gray-900">{currencySymbol}{(feature.model.pricing.inputPrice || 0).toFixed(4)}/1M tokens</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Output Price</span>
                      <p className="text-lg font-bold text-gray-900">{currencySymbol}{(feature.model.pricing.outputPrice || 0).toFixed(4)}/1M tokens</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Token Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600">Input Tokens</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatNumber(feature.tokenEstimates?.inputTokensPerRequest)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-green-600">Output Tokens</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatNumber(feature.tokenEstimates?.outputTokensPerRequest)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-purple-600">Total per Request</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatNumber((feature.tokenEstimates?.inputTokensPerRequest || 0) +
                                    (feature.tokenEstimates?.outputTokensPerRequest || 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Projections */}
            <div className="mt-8">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Usage Projections</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requests</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Input Tokens</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Output Tokens</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Tokens</th>
                      {feature.model?.pricing && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Cost</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[100, 1000, 10000, 100000, 1000000].map((requests) => {
                      const inputTokens = requests * (feature.tokenEstimates?.inputTokensPerRequest || 0);
                      const outputTokens = requests * (feature.tokenEstimates?.outputTokensPerRequest || 0);
                      const totalTokens = inputTokens + outputTokens;
                      const estimatedCost = feature.model?.pricing
                        ? ((feature.model.pricing.inputPrice || 0) / 1000000) * inputTokens +
                          ((feature.model.pricing.outputPrice || 0) / 1000000) * outputTokens
                        : null;

                      return (
                        <tr key={requests} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">{formatNumber(requests)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatNumber(inputTokens)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatNumber(outputTokens)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">{formatNumber(totalTokens)}</td>
                          {feature.model?.pricing && (
                            <td className="px-6 py-4 text-sm font-medium text-[#DC2626]">
                              {estimatedCost !== null ? formatCurrency(estimatedCost) : 'N/A'}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculation Method Info */}
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">Calculation Method</h4>
              <p className="text-sm text-yellow-700">
                <span className="font-medium capitalize">{feature.tokenEstimates?.calculationMethod || 'fixed'}</span>
                {feature.tokenEstimates?.calculationMethod === 'dynamic' && feature.tokenEstimates?.dynamicMultiplier && (
                  <span> with {feature.tokenEstimates.dynamicMultiplier}x multiplier</span>
                )}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                {feature.tokenEstimates?.calculationMethod === 'fixed' && 'Fixed token consumption per request'}
                {feature.tokenEstimates?.calculationMethod === 'dynamic' && 'Token consumption scales with usage based on multiplier'}
                {feature.tokenEstimates?.calculationMethod === 'user-based' && 'Token consumption varies per user based on activity'}
              </p>
            </div>
          </div>
        )}

        {/* Costs Tab */}
        {activeTab === 'costs' && (
          <div className="bg-white rounded-xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Infrastructure Costs</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <p className="text-sm text-gray-500">Fixed Cost per Request</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(feature.infrastructureCost?.fixedCostPerRequest || 0)}
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <p className="text-sm text-gray-500">Overhead Percentage</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {feature.infrastructureCost?.overheadPercentage || 0}%
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <p className="text-sm text-gray-500">Monthly Fixed Cost</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(feature.infrastructureCost?.monthlyFixedCost || 0)}
                </p>
              </div>
            </div>

            {/* Cost Breakdown */}
            {feature.model?.pricing && (
              <div className="mt-8">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Cost per 1000 Requests</h4>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Input Token Cost</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatCurrency(
                          ((feature.model.pricing.inputPrice || 0) / 1000000) *
                          (feature.tokenEstimates?.inputTokensPerRequest || 0) * 1000
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Output Token Cost</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatCurrency(
                          ((feature.model.pricing.outputPrice || 0) / 1000000) *
                          (feature.tokenEstimates?.outputTokensPerRequest || 0) * 1000
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Cost</p>
                      <p className="text-xl font-semibold text-[#DC2626]">
                        {formatCurrency(
                          ((feature.model.pricing.inputPrice || 0) / 1000000) *
                          (feature.tokenEstimates?.inputTokensPerRequest || 0) * 1000 +
                          ((feature.model.pricing.outputPrice || 0) / 1000000) *
                          (feature.tokenEstimates?.outputTokensPerRequest || 0) * 1000
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profit Margin Tab */}
        {activeTab === 'profit' && (
          <div className="space-y-6">
            {/* Real-time indicator */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span>Real-time calculations - values update as you type</span>
            </div>

            {/* Warning if no model or pricing data */}
            {(!feature.model || !feature.model?.pricing) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium text-yellow-800">Missing Pricing Data</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {!feature.model
                        ? 'No AI model is assigned to this feature. Please assign a model to calculate accurate profit margins.'
                        : 'The assigned model does not have pricing information. Profit calculations will use default estimates.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Profit Overview Cards */}
            {profitAnalysis && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className={`rounded-xl shadow-soft p-4 md:p-6 ${profitAnalysis.isProfitable ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {profitAnalysis.isProfitable ? (
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    )}
                    <span className="text-xs md:text-sm font-medium text-gray-600">Profit Margin</span>
                  </div>
                  <p className={`text-xl md:text-3xl font-bold ${profitAnalysis.isProfitable ? 'text-green-700' : 'text-red-700'}`}>
                    {formatPercent(profitAnalysis.margin)}
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-soft p-4 md:p-6">
                  <p className="text-xs md:text-sm text-gray-500 mb-1">Revenue</p>
                  <p className="text-lg md:text-2xl font-bold text-blue-600">{formatCurrency(profitAnalysis.revenue)}</p>
                  <p className="text-xs text-gray-400 mt-1 hidden md:block">
                    {profitParams.billingModel === 'per_request' && 'per request'}
                    {profitParams.billingModel === 'per_user' && 'per user'}
                    {profitParams.billingModel === 'monthly_subscription' && 'monthly'}
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-soft p-4 md:p-6">
                  <p className="text-xs md:text-sm text-gray-500 mb-1">Total Cost</p>
                  <p className="text-lg md:text-2xl font-bold text-red-600">{formatCurrency(profitAnalysis.cost)}</p>
                  <p className="text-xs text-gray-400 mt-1 hidden md:block">
                    {formatCurrency(profitAnalysis.costPerRequest)} per request
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-soft p-4 md:p-6">
                  <p className="text-xs md:text-sm text-gray-500 mb-1">Profit</p>
                  <p className={`text-lg md:text-2xl font-bold ${profitAnalysis.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profitAnalysis.profit)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 hidden md:block">
                    {profitAnalysis.profit >= 0 ? 'Net profit' : 'Net loss'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Pricing Configuration */}
              <div className="bg-white rounded-xl shadow-soft p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Pricing Configuration</h3>

                <div className="space-y-4">
                  {/* Billing Model */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Billing Model</label>
                    <select
                      value={profitParams.billingModel}
                      onChange={(e) => setProfitParams({ ...profitParams, billingModel: e.target.value })}
                      className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="per_request">Per Request</option>
                      <option value="per_user">Per User (with quota)</option>
                      <option value="monthly_subscription">Monthly Subscription</option>
                    </select>
                  </div>

                  {/* Per Request */}
                  {profitParams.billingModel === 'per_request' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Selling Price per Request ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={profitParams.sellingPricePerRequest}
                        onChange={(e) => setProfitParams({ ...profitParams, sellingPricePerRequest: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        {profitAnalysis?.costPerRequest > 0 ? (
                          <>
                            Cost per request: {formatCurrency(profitAnalysis?.costPerRequest)} •
                            Suggested: {formatCurrency(profitAnalysis?.costPerRequest * 1.5)} (50% margin)
                          </>
                        ) : (
                          'Enter token estimates and model pricing for accurate cost calculation'
                        )}
                      </p>
                    </div>
                  )}

                  {/* Per User */}
                  {profitParams.billingModel === 'per_user' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price per Request ({currencySymbol})
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={profitParams.sellingPricePerRequest}
                          onChange={(e) => setProfitParams({ ...profitParams, sellingPricePerRequest: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Requests per User
                        </label>
                        <input
                          type="number"
                          value={profitParams.requestsPerUser}
                          onChange={(e) => setProfitParams({ ...profitParams, requestsPerUser: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </>
                  )}

                  {/* Monthly Subscription */}
                  {profitParams.billingModel === 'monthly_subscription' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Monthly Price ({currencySymbol})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={profitParams.monthlySubscriptionPrice}
                          onChange={(e) => setProfitParams({ ...profitParams, monthlySubscriptionPrice: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          {profitAnalysis?.costPerRequest > 0 ? (
                            <>
                              Total monthly cost for {profitParams.usersCount * profitParams.requestsPerUser} requests: {formatCurrency(profitAnalysis?.costPerRequest * profitParams.usersCount * profitParams.requestsPerUser + (feature?.infrastructureCost?.monthlyFixedCost || 0))}
                            </>
                          ) : (
                            'Enter token estimates and model pricing for accurate cost calculation'
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Requests per User/Month
                        </label>
                        <input
                          type="number"
                          value={profitParams.requestsPerUser}
                          onChange={(e) => setProfitParams({ ...profitParams, requestsPerUser: parseInt(e.target.value) || 1 })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">How many API requests each user can make per month</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Users
                        </label>
                        <input
                          type="number"
                          value={profitParams.usersCount}
                          onChange={(e) => setProfitParams({ ...profitParams, usersCount: parseInt(e.target.value) || 1 })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">Expected number of paying subscribers</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Quick Pricing Suggestions */}
                <div className="mt-4 md:mt-6 p-3 md:p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 md:mb-3">Quick Pricing Suggestions</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        const basePrice = profitAnalysis?.costPerRequest || 0;
                        const multiplier = 1.25;
                        if (profitParams.billingModel === 'monthly_subscription') {
                          const monthlyPrice = (basePrice * profitParams.requestsPerUser * multiplier) + (feature?.infrastructureCost?.monthlyFixedCost || 0);
                          setProfitParams({ ...profitParams, monthlySubscriptionPrice: Math.max(monthlyPrice, 9.99) });
                        } else if (profitParams.billingModel === 'per_user') {
                          setProfitParams({ ...profitParams, sellingPricePerRequest: basePrice * multiplier });
                        } else {
                          setProfitParams({ ...profitParams, sellingPricePerRequest: basePrice * multiplier });
                        }
                      }}
                      className="px-2 md:px-3 py-2 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50"
                    >
                      25% Margin
                    </button>
                    <button
                      onClick={() => {
                        const basePrice = profitAnalysis?.costPerRequest || 0;
                        const multiplier = 1.5;
                        if (profitParams.billingModel === 'monthly_subscription') {
                          const monthlyPrice = (basePrice * profitParams.requestsPerUser * multiplier) + (feature?.infrastructureCost?.monthlyFixedCost || 0);
                          setProfitParams({ ...profitParams, monthlySubscriptionPrice: Math.max(monthlyPrice, 9.99) });
                        } else if (profitParams.billingModel === 'per_user') {
                          setProfitParams({ ...profitParams, sellingPricePerRequest: basePrice * multiplier });
                        } else {
                          setProfitParams({ ...profitParams, sellingPricePerRequest: basePrice * multiplier });
                        }
                      }}
                      className="px-2 md:px-3 py-2 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50"
                    >
                      50% Margin
                    </button>
                    <button
                      onClick={() => {
                        const basePrice = profitAnalysis?.costPerRequest || 0;
                        const multiplier = 2;
                        if (profitParams.billingModel === 'monthly_subscription') {
                          const monthlyPrice = (basePrice * profitParams.requestsPerUser * multiplier) + (feature?.infrastructureCost?.monthlyFixedCost || 0);
                          setProfitParams({ ...profitParams, monthlySubscriptionPrice: Math.max(monthlyPrice, 9.99) });
                        } else if (profitParams.billingModel === 'per_user') {
                          setProfitParams({ ...profitParams, sellingPricePerRequest: basePrice * multiplier });
                        } else {
                          setProfitParams({ ...profitParams, sellingPricePerRequest: basePrice * multiplier });
                        }
                      }}
                      className="px-2 md:px-3 py-2 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50"
                    >
                      100% Margin
                    </button>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-white rounded-xl shadow-soft p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Cost Breakdown per Request</h3>

                {profitAnalysis && (
                  <div className="space-y-4">
                    {/* Cost Breakdown Bar */}
                    <div className="relative h-6 md:h-8 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-blue-500"
                        style={{ width: `${(profitAnalysis.tokenCostPerRequest / profitAnalysis.costPerRequest) * 100}%` }}
                        title="Token Cost"
                      />
                      <div
                        className="absolute h-full bg-orange-500"
                        style={{ left: `${(profitAnalysis.tokenCostPerRequest / profitAnalysis.costPerRequest) * 100}%`, width: `${(profitAnalysis.infrastructureCostPerRequest / profitAnalysis.costPerRequest) * 100}%` }}
                        title="Infrastructure"
                      />
                    </div>
                    <div className="flex gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded" />
                        <span>Token Cost</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-orange-500 rounded" />
                        <span>Infrastructure</span>
                      </div>
                    </div>

                    {/* Detailed Costs */}
                    <div className="border-t border-gray-100 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Token Cost</span>
                        <span className="font-medium">{formatCurrency(profitAnalysis.tokenCostPerRequest)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Infrastructure Cost</span>
                        <span className="font-medium">{formatCurrency(profitAnalysis.infrastructureCostPerRequest)}</span>
                      </div>
                      {feature.infrastructureCost?.overheadPercentage > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Overhead ({feature.infrastructureCost.overheadPercentage}%)</span>
                          <span className="font-medium">
                            {formatCurrency(profitAnalysis.costPerRequest * feature.infrastructureCost.overheadPercentage / 100)}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-gray-100 pt-2 flex justify-between">
                        <span className="text-sm font-semibold text-gray-700">Total Cost</span>
                        <span className="text-sm font-bold text-red-600">{formatCurrency(profitAnalysis.costPerRequest)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Monthly Fixed Cost Warning */}
                {feature.infrastructureCost?.monthlyFixedCost > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Monthly Fixed Cost</p>
                        <p className="text-xs text-yellow-700">
                          {formatCurrency(feature.infrastructureCost.monthlyFixedCost)}/month not included in per-request calculation.
                          Factor this into your break-even analysis.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Break-Even Analysis */}
            {profitAnalysis && (
              <div className="bg-white rounded-xl shadow-soft p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Break-Even Analysis</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                  <div className="p-3 md:p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-xs md:text-sm font-medium text-gray-500 mb-1 md:mb-2">Break-Even Price</h4>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCurrency(profitAnalysis.costPerRequest)}</p>
                    <p className="text-xs text-gray-400 mt-1">Minimum price to cover costs</p>
                  </div>

                  <div className="p-3 md:p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-xs md:text-sm font-medium text-gray-500 mb-1 md:mb-2">Current Markup</h4>
                    <p className={`text-lg md:text-2xl font-bold ${profitAnalysis.markup >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(profitAnalysis.markup)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Over cost basis</p>
                  </div>

                  <div className="p-3 md:p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-xs md:text-sm font-medium text-gray-500 mb-1 md:mb-2">ROI</h4>
                    <p className={`text-lg md:text-2xl font-bold ${profitAnalysis.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(profitAnalysis.roi)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Return on investment</p>
                  </div>
                </div>

                {/* Profit Scenarios */}
                <div className="mt-4 md:mt-6">
                  <h4 className="text-xs md:text-sm font-semibold text-gray-700 mb-3">Profit at Different Volumes</h4>
                  <div className="overflow-x-auto -mx-4 md:mx-0">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">Requests</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {[100, 1000, 10000, 100000, 1000000].map((requests) => {
                          const revenue = profitParams.billingModel === 'per_request'
                            ? requests * profitParams.sellingPricePerRequest
                            : profitParams.billingModel === 'per_user'
                            ? (requests / profitParams.requestsPerUser) * (profitParams.sellingPricePerRequest * profitParams.requestsPerUser)
                            : profitParams.monthlySubscriptionPrice * profitParams.usersCount;
                          const cost = requests * profitAnalysis.costPerRequest + (feature.infrastructureCost?.monthlyFixedCost || 0);
                          const profit = revenue - cost;
                          const margin = revenue > 0 ? (profit / revenue * 100) : 0;

                          return (
                            <tr key={requests} className="hover:bg-gray-50">
                              <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-900">{formatNumber(requests)}</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-blue-600 font-medium">{formatCurrency(revenue)}</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-red-600">{formatCurrency(cost)}</td>
                              <td className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(profit)}
                              </td>
                              <td className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercent(margin)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calculator Tab */}
        {activeTab === 'calculator' && (
          <div className="bg-white rounded-xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Cost Calculator</h3>

            {/* Model & Pricing Info */}
            {feature.model?.pricing && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Selected Model Pricing</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-blue-600">Input Price</span>
                    <p className="text-lg font-bold text-blue-900">
                      {currencySymbol}{((feature.model.pricing.inputPrice || 0)).toFixed(4)}/1M tokens
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-blue-600">Output Price</span>
                    <p className="text-lg font-bold text-blue-900">
                      {currencySymbol}{((feature.model.pricing.outputPrice || 0)).toFixed(4)}/1M tokens
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Input */}
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Requests
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={estimateParams.requests}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setEstimateParams({ ...estimateParams, requests: value === '' ? 0 : parseInt(value) });
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Enter number of requests"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Users
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={estimateParams.users}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setEstimateParams({ ...estimateParams, users: value === '' ? 1 : parseInt(value) });
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Enter number of users"
                    />
                  </div>
                  <button
                    onClick={calculateCost}
                    className="w-full px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors"
                  >
                    Calculate Cost
                  </button>
                </div>

                {/* Live Calculation Preview */}
                {feature.model?.pricing && (
                  <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Estimate</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Input Tokens:</span>
                        <span className="font-medium">{formatNumber(estimateParams.requests * (feature.tokenEstimates?.inputTokensPerRequest || 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Output Tokens:</span>
                        <span className="font-medium">{formatNumber(estimateParams.requests * (feature.tokenEstimates?.outputTokensPerRequest || 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Tokens:</span>
                        <span className="font-medium">{formatNumber(estimateParams.requests * ((feature.tokenEstimates?.inputTokensPerRequest || 0) + (feature.tokenEstimates?.outputTokensPerRequest || 0)))}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Token Cost:</span>
                          <span className="font-medium">
                            {formatCurrency(
                              ((feature.model.pricing.inputPrice || 0) / 1000000) * (feature.tokenEstimates?.inputTokensPerRequest || 0) * estimateParams.requests +
                              ((feature.model.pricing.outputPrice || 0) / 1000000) * (feature.tokenEstimates?.outputTokensPerRequest || 0) * estimateParams.requests
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Results */}
              <div>
                {costEstimate ? (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Cost Estimate</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Tokens</span>
                        <span className="font-medium">{formatNumber(costEstimate.totalTokens || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Input Tokens</span>
                        <span className="font-medium">{formatNumber(costEstimate.totalInputTokens || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Output Tokens</span>
                        <span className="font-medium">{formatNumber(costEstimate.totalOutputTokens || 0)}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Token Cost</span>
                          <span className="font-medium">{formatCurrency(costEstimate.tokenCost || 0)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Infrastructure Cost</span>
                        <span className="font-medium">{formatCurrency(costEstimate.infrastructureCost || 0)}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-3 flex justify-between">
                        <span className="font-semibold text-gray-900">Total Cost</span>
                        <span className="font-bold text-[#DC2626] text-lg">
                          {formatCurrency(costEstimate.totalCost || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p>Enter parameters and click calculate to see cost estimate</p>
                  </div>
                )}

                {/* Per User Breakdown */}
                {costEstimate && estimateParams.users > 1 && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Per User Breakdown</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-600">Requests per User</span>
                        <span className="font-medium text-blue-900">{formatNumber(Math.ceil(estimateParams.requests / estimateParams.users))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Cost per User</span>
                        <span className="font-medium text-blue-900">{formatCurrency((costEstimate.totalCost || 0) / estimateParams.users)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FeatureDetailPage;