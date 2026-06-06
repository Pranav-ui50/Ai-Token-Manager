/**
 * Usage Page
 *
 * Displays token usage and API metrics for the organization.
 * Used by product_manager and developer roles.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import analyticsApi from '../../services/api/analytics.api.js';
import apiKeyApi from '../../services/api/apiKey.api.js';

// Helper to extract numeric value from potentially nested object
const extractNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    return value.total || value.count || value.active || 0;
  }
  return 0;
};

function UsagePage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usageData, setUsageData] = useState({
    totalTokens: 0,
    totalRequests: 0,
    tokensThisMonth: 0,
    requestsThisMonth: 0,
    tokensToday: 0,
    requestsToday: 0,
    avgTokensPerRequest: 0,
    errorRate: 0
  });
  const [modelUsage, setModelUsage] = useState([]);
  const [featureUsage, setFeatureUsage] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchUsageData();
  }, [timeRange]);

  const fetchUsageData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch analytics data
      const [analyticsRes, apiKeysRes] = await Promise.allSettled([
        analyticsApi.getDashboard(),
        apiKeyApi.getMyKeys()
      ]);

      // Process analytics
      if (analyticsRes.status === 'fulfilled') {
        const analyticsData = analyticsRes.value?.data || analyticsRes.value || {};
        const summary = analyticsData?.summary || {};

        setUsageData({
          totalTokens: extractNumber(summary.totalTokens || summary.tokenUsage),
          totalRequests: extractNumber(summary.totalRequests || summary.requestCount),
          tokensThisMonth: extractNumber(summary.tokensThisMonth || summary.monthlyTokens),
          requestsThisMonth: extractNumber(summary.requestsThisMonth || summary.monthlyRequests),
          tokensToday: extractNumber(summary.tokensToday || summary.todayTokens),
          requestsToday: extractNumber(summary.requestsToday || summary.todayRequests),
          avgTokensPerRequest: summary.avgTokensPerRequest || 0,
          errorRate: summary.errorRate || summary.errorPercentage || 0
        });

        // Set model usage
        const modelData = analyticsData?.modelUsage || analyticsData?.models || [];
        setModelUsage(Array.isArray(modelData) ? modelData.slice(0, 5) : []);

        // Set feature usage
        const featureData = analyticsData?.featureUsage || analyticsData?.features || [];
        setFeatureUsage(Array.isArray(featureData) ? featureData.slice(0, 5) : []);

        // Set recent activity
        const activity = analyticsData?.recentActivity || analyticsData?.recentLogs || [];
        setRecentActivity(Array.isArray(activity) ? activity.slice(0, 10) : []);
      }

    } catch (err) {
      console.error('Failed to fetch usage data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load usage data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num) => {
    const numValue = typeof num === 'object' ? extractNumber(num) : num;
    if (!numValue && numValue !== 0) return '0';
    if (numValue >= 1000000) return `${(numValue / 1000000).toFixed(1)}M`;
    if (numValue >= 1000) return `${(numValue / 1000).toFixed(1)}K`;
    return numValue.toString();
  };

  const formatPercent = (num) => {
    if (!num && num !== 0) return '0%';
    return `${num.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-[#DC2626] mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-500">Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
        <button onClick={fetchUsageData} className="ml-4 text-red-800 hover:text-red-900 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Usage & Analytics</h1>
          <p className="text-sm text-gray-500">Token consumption and API metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={fetchUsageData}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Tokens This Month</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{formatNumber(usageData.tokensThisMonth)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Requests This Month</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{formatNumber(usageData.requestsThisMonth)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Avg Tokens/Request</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{formatNumber(usageData.avgTokensPerRequest)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Error Rate</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{formatPercent(usageData.errorRate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Usage by Model</h2>
            <span className="text-sm text-gray-500">Top 5</span>
          </div>
          {modelUsage.length > 0 ? (
            <div className="space-y-3">
              {modelUsage.map((model, index) => {
                const tokens = extractNumber(model.tokens || model.tokenUsage || model.usage);
                const maxTokens = Math.max(...modelUsage.map(m => extractNumber(m.tokens || m.tokenUsage || m.usage)));
                const percentage = maxTokens > 0 ? (tokens / maxTokens) * 100 : 0;

                return (
                  <div key={model._id || model.id || index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{model.name || model.modelName || `Model ${index + 1}`}</span>
                      <span className="text-gray-500">{formatNumber(tokens)} tokens</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#DC2626] to-[#EF4444] rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No model usage data available
            </div>
          )}
        </div>

        {/* Feature Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Usage by Feature</h2>
            <span className="text-sm text-gray-500">Top 5</span>
          </div>
          {featureUsage.length > 0 ? (
            <div className="space-y-3">
              {featureUsage.map((feature, index) => {
                const tokens = extractNumber(feature.tokens || feature.tokenUsage || feature.usage);
                const maxTokens = Math.max(...featureUsage.map(f => extractNumber(f.tokens || f.tokenUsage || f.usage)));
                const percentage = maxTokens > 0 ? (tokens / maxTokens) * 100 : 0;

                return (
                  <div key={feature._id || feature.id || index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{feature.name || feature.featureName || `Feature ${index + 1}`}</span>
                      <span className="text-gray-500">{formatNumber(tokens)} tokens</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No feature usage data available
            </div>
          )}
        </div>
      </div>

      {/* Daily Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Activity</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{formatNumber(usageData.tokensToday)}</p>
            <p className="text-sm text-gray-500">Tokens Today</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{formatNumber(usageData.requestsToday)}</p>
            <p className="text-sm text-gray-500">Requests Today</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{formatNumber(usageData.totalTokens)}</p>
            <p className="text-sm text-gray-500">Total Tokens</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{formatNumber(usageData.totalRequests)}</p>
            <p className="text-sm text-gray-500">Total Requests</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Endpoint</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tokens</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentActivity.map((log, index) => (
                  <tr key={log._id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900">{log.endpoint || log.path || '/'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        log.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                        log.method === 'POST' ? 'bg-green-100 text-green-700' :
                        log.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                        log.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {log.method || 'GET'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatNumber(log.tokens || log.tokenUsage || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        (log.status || log.statusCode || 200) < 300 ? 'bg-green-100 text-green-700' :
                        (log.status || log.statusCode) >= 400 ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {log.status || log.statusCode || 200}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : log.time || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No recent activity recorded
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <a
            href="/analytics"
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Full Analytics</p>
            <p className="text-xs text-gray-500 mt-1">Detailed reports</p>
          </a>

          <a
            href="/reports"
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Reports</p>
            <p className="text-xs text-gray-500 mt-1">Export data</p>
          </a>

          <a
            href="/api-keys"
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">API Keys</p>
            <p className="text-xs text-gray-500 mt-1">Manage keys</p>
          </a>

          <a
            href="/features"
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Features</p>
            <p className="text-xs text-gray-500 mt-1">View features</p>
          </a>
        </div>
      </div>
    </div>
  );
}

export default UsagePage;