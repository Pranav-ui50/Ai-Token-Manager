/**
 * Usage Analytics Page
 *
 * Product Manager can view:
 * - Feature usage statistics
 * - Token consumption metrics
 * - Feature performance insights
 *
 * Note: This does NOT include revenue, profit, or margin analytics
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';
import featureApi from '../../services/api/feature.api.js';
import analyticsApi from '../../services/api/analytics.api.js';
import { showToast } from '../../utils/toasts.js';

function UsageAnalyticsPage() {
  const [features, setFeatures] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [featuresRes, analyticsRes] = await Promise.allSettled([
        featureApi.getAll({ limit: 100 }),
        analyticsApi.getDashboard()
      ]);

      if (featuresRes.status === 'fulfilled') {
        const featuresData = featuresRes.value?.data || featuresRes.value || {};
        const featuresList = featuresData.features || featuresData.data || [];
        setFeatures(Array.isArray(featuresList) ? featuresList : []);
      }

      if (analyticsRes.status === 'fulfilled') {
        setAnalyticsData(analyticsRes.value?.data || analyticsRes.value || {});
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      showToast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (value) => {
    if (value === 'custom') {
      setShowCustomRange(true);
    } else {
      setShowCustomRange(false);
      setTimeRange(value);
    }
  };

  const applyCustomRange = () => {
    if (customDateFrom && customDateTo) {
      setTimeRange(`custom:${customDateFrom}:${customDateTo}`);
      setShowCustomRange(false);
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Get display label for time range
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case 'this_month': return 'This Month';
      default:
        if (timeRange.startsWith('custom:')) {
          const parts = timeRange.split(':');
          if (parts.length === 3) {
            return `${parts[1]} to ${parts[2]}`;
          }
        }
        return 'Last 7 days';
    }
  };

  // Calculate feature usage statistics
  const featureStats = features.map(feature => {
    const inputTokens = feature.tokenEstimates?.inputTokensPerRequest || 0;
    const outputTokens = feature.tokenEstimates?.outputTokensPerRequest || 0;
    const monthlyRequests = feature.tokenEstimates?.expectedMonthlyRequests || 0;
    const totalTokensPerRequest = inputTokens + outputTokens;
    const monthlyTokens = totalTokensPerRequest * monthlyRequests;

    return {
      id: feature._id,
      name: feature.name,
      category: feature.category || 'other',
      status: feature.status || 'active',
      model: feature.model?.name || 'Not Mapped',
      inputTokens,
      outputTokens,
      totalTokensPerRequest,
      monthlyRequests,
      monthlyTokens,
      isActive: feature.status === 'active'
    };
  }).sort((a, b) => b.monthlyTokens - a.monthlyTokens);

  // Top used features (sorted by monthly tokens, limited to top 5)
  const topUsedFeatures = featureStats.slice(0, 5);

  // Summary stats
  const totalFeatures = features.length;
  const activeFeatures = features.filter(f => f.status === 'active').length;
  const totalMonthlyTokens = featureStats.reduce((sum, f) => sum + f.monthlyTokens, 0);
  const totalMonthlyRequests = featureStats.reduce((sum, f) => sum + f.monthlyRequests, 0);
  const avgTokensPerRequest = featureStats.length > 0
    ? featureStats.reduce((sum, f) => sum + f.totalTokensPerRequest, 0) / featureStats.length
    : 0;

  // Category breakdown
  const categoryBreakdown = {};
  featureStats.forEach(f => {
    if (!categoryBreakdown[f.category]) {
      categoryBreakdown[f.category] = { count: 0, tokens: 0, requests: 0 };
    }
    categoryBreakdown[f.category].count++;
    categoryBreakdown[f.category].tokens += f.monthlyTokens;
    categoryBreakdown[f.category].requests += f.monthlyRequests;
  });

  if (loading) {
    return <Loader fullPage text="Loading analytics..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Usage Analytics</h1>
          <p className="text-sm text-gray-500">Feature usage and token consumption metrics</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={timeRange.startsWith('custom:') ? 'custom' : timeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="this_month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {/* Custom Range Modal */}
      {showCustomRange && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Date Range</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCustomRange(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applyCustomRange}
                disabled={!customDateFrom || !customDateTo}
                className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Display */}
      {timeRange.startsWith('custom:') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            Showing data from <strong>{getTimeRangeLabel()}</strong>
          </span>
          <button
            onClick={() => setTimeRange('7d')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Total Features</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{totalFeatures}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Active Features</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{activeFeatures}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Monthly Tokens</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatNumber(totalMonthlyTokens)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Avg Tokens/Request</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatNumber(Math.round(avgTokensPerRequest))}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Used Features */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Top Used Features</h2>
          <span className="text-xs sm:text-sm text-gray-500">{getTimeRangeLabel()}</span>
        </div>

        {topUsedFeatures.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">No feature usage data available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topUsedFeatures.map((feature, index) => {
              const usagePercentage = totalMonthlyTokens > 0 ? (feature.monthlyTokens / totalMonthlyTokens) * 100 : 0;
              return (
                <div key={feature.id} className="flex items-center gap-3 sm:gap-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-gray-600">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <Link to={`/features/${feature.id}`} className="font-medium text-gray-900 hover:text-[#DC2626] truncate text-sm sm:text-base">
                        {feature.name}
                      </Link>
                      <span className="text-sm font-medium text-gray-900 flex-shrink-0 ml-2">
                        {formatNumber(feature.monthlyTokens)} tokens
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#DC2626] h-2 rounded-full"
                          style={{ width: `${usagePercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatNumber(feature.monthlyRequests)} requests
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature Usage Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Feature Usage Overview</h2>
          <p className="text-sm text-gray-500">Token consumption by feature</p>
        </div>

        {featureStats.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No usage data available</h3>
            <p className="text-sm text-gray-500 mb-4">
              Create features and configure token estimates to see usage analytics
            </p>
            <Link
              to="/features/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Feature
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Feature
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Category
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Assigned Model
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tokens/Request
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Monthly Requests
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Monthly Tokens
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {featureStats.slice(0, 10).map((feature) => (
                    <tr key={feature.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <Link to={`/features/${feature.id}`} className="font-medium text-gray-900 hover:text-[#DC2626]">
                          {feature.name}
                        </Link>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {feature.category}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {feature.model}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">{formatNumber(feature.totalTokensPerRequest)}</span>
                          <p className="text-xs text-gray-500">In: {formatNumber(feature.inputTokens)} / Out: {formatNumber(feature.outputTokens)}</p>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 hidden sm:table-cell">
                        {formatNumber(feature.monthlyRequests)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        <span className="font-bold text-gray-900">{formatNumber(feature.monthlyTokens)}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${feature.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {feature.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {featureStats.slice(0, 10).map((feature) => (
                <div key={feature.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/features/${feature.id}`} className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{feature.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{feature.category}</p>
                    </Link>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${feature.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {feature.status}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600">
                    Assigned Model: {feature.model}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Tokens/Req</p>
                      <p className="font-medium text-gray-900 text-sm">{formatNumber(feature.totalTokensPerRequest)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Requests</p>
                      <p className="font-medium text-gray-900 text-sm">{formatNumber(feature.monthlyRequests)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Monthly</p>
                      <p className="font-medium text-gray-900 text-sm">{formatNumber(feature.monthlyTokens)}</p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    In: {formatNumber(feature.inputTokens)} / Out: {formatNumber(feature.outputTokens)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Category Breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Usage by Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Object.entries(categoryBreakdown).map(([category, stats]) => (
              <div key={category} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 capitalize">{category}</span>
                  <span className="text-sm text-gray-500">{stats.count} features</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monthly Tokens</span>
                    <span className="font-medium text-gray-900">{formatNumber(stats.tokens)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monthly Requests</span>
                    <span className="font-medium text-gray-900">{formatNumber(stats.requests)}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#DC2626] h-2 rounded-full"
                      style={{ width: `${totalMonthlyTokens > 0 ? (stats.tokens / totalMonthlyTokens) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {totalMonthlyTokens > 0 ? ((stats.tokens / totalMonthlyTokens) * 100).toFixed(1) : 0}% of total
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token Distribution & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Token Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Input Tokens</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatNumber(featureStats.reduce((sum, f) => sum + f.inputTokens, 0))} avg/request
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full"
                  style={{
                    width: `${avgTokensPerRequest > 0 ? (featureStats.reduce((sum, f) => sum + f.inputTokens, 0) / avgTokensPerRequest / featureStats.length) * 50 : 0}%`
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Output Tokens</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatNumber(featureStats.reduce((sum, f) => sum + f.outputTokens, 0))} avg/request
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full"
                  style={{
                    width: `${avgTokensPerRequest > 0 ? (featureStats.reduce((sum, f) => sum + f.outputTokens, 0) / avgTokensPerRequest / featureStats.length) * 50 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2 sm:space-y-3">
            <Link
              to="/features"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">Manage Features</p>
                <p className="text-sm text-gray-500">View and edit all features</p>
              </div>
            </Link>
            <Link
              to="/model-mapping"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">Model Mapping</p>
                <p className="text-sm text-gray-500">Assign models to features</p>
              </div>
            </Link>
            <Link
              to="/token-estimates"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">Token Estimates</p>
                <p className="text-sm text-gray-500">Configure token usage</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900">Product Analytics Only</h4>
            <p className="text-sm text-blue-700 mt-1">
              This dashboard shows feature usage and token consumption metrics. For revenue, profit, and margin analytics,
              please contact your Finance Administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UsageAnalyticsPage;