/**
 * Feature Detail Page
 *
 * Displays detailed information about a single feature.
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import featureApi from '../../services/api/feature.api.js';

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
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };

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
            {['overview', 'tokens', 'costs', 'calculator'].map((tab) => (
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
                      <p className="text-lg font-bold text-gray-900">${(feature.model.pricing.inputPrice || 0).toFixed(4)}/1M tokens</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Output Price</span>
                      <p className="text-lg font-bold text-gray-900">${(feature.model.pricing.outputPrice || 0).toFixed(4)}/1M tokens</p>
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
                      ${((feature.model.pricing.inputPrice || 0)).toFixed(4)}/1M tokens
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-blue-600">Output Price</span>
                    <p className="text-lg font-bold text-blue-900">
                      ${((feature.model.pricing.outputPrice || 0)).toFixed(4)}/1M tokens
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