/**
 * Usage Page
 *
 * Displays token usage, API metrics, webhooks, and integrations for Developer role.
 * Focused on technical usage monitoring, API performance, and integration status.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import analyticsApi from '../../services/api/analytics.api.js';
import webhookApi from '../../services/api/webhook.api.js';
import integrationApi from '../../services/api/integration.api.js';

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
    errorRate: 0,
    successRate: 100,
    failedRequests: 0,
    avgResponseTime: 0
  });
  const [modelUsage, setModelUsage] = useState([]);
  const [featureUsage, setFeatureUsage] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [timeRange, setTimeRange] = useState('7d');

  // Webhooks data
  const [webhooksData, setWebhooksData] = useState({
    total: 0,
    active: 0,
    failedDeliveries: 0
  });

  // Integrations data
  const [integrationsData, setIntegrationsData] = useState({
    connectedProviders: 0,
    healthyIntegrations: 0,
    lastSyncStatus: 'N/A'
  });

  useEffect(() => {
    fetchUsageData();
  }, [timeRange]);

  const fetchUsageData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch analytics data
      const [analyticsRes, webhooksRes, integrationsRes] = await Promise.allSettled([
        analyticsApi.getDashboard(),
        webhookApi.getForOrganization(),
        integrationApi.getForOrganization()
      ]);

      // Process analytics
      if (analyticsRes.status === 'fulfilled') {
        const analyticsData = analyticsRes.value?.data || analyticsRes.value || {};
        const summary = analyticsData?.summary || {};

        // Calculate success rate from error rate
        const errorRate = summary.errorRate || summary.errorPercentage || 0;
        const successRate = Math.max(0, 100 - errorRate);

        setUsageData({
          totalTokens: extractNumber(summary.totalTokens || summary.tokenUsage),
          totalRequests: extractNumber(summary.totalRequests || summary.requestCount),
          tokensThisMonth: extractNumber(summary.tokensThisMonth || summary.monthlyTokens),
          requestsThisMonth: extractNumber(summary.requestsThisMonth || summary.monthlyRequests),
          tokensToday: extractNumber(summary.tokensToday || summary.todayTokens),
          requestsToday: extractNumber(summary.requestsToday || summary.todayRequests),
          avgTokensPerRequest: summary.avgTokensPerRequest || 0,
          errorRate: errorRate,
          successRate: successRate,
          failedRequests: summary.failedRequests || summary.errorCount || 0,
          avgResponseTime: summary.avgResponseTime || summary.avgLatency || 0
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

      // Process webhooks
      if (webhooksRes.status === 'fulfilled') {
        const webhooks = webhooksRes.value?.data?.webhooks || webhooksRes.value?.webhooks || webhooksRes.value || [];
        const webhooksList = Array.isArray(webhooks) ? webhooks : [];
        const activeWebhooks = webhooksList.filter(w => w.status === 'active' || w.isActive);
        const failedDeliveries = webhooksList.reduce((sum, w) => sum + (w.failedDeliveries || w.failureCount || 0), 0);

        setWebhooksData({
          total: webhooksList.length,
          active: activeWebhooks.length,
          failedDeliveries: failedDeliveries
        });
      }

      // Process integrations
      if (integrationsRes.status === 'fulfilled') {
        const integrations = integrationsRes.value?.data?.integrations || integrationsRes.value?.integrations || integrationsRes.value || [];
        const integrationsList = Array.isArray(integrations) ? integrations : [];
        const connectedList = integrationsList.filter(i => i.status === 'connected' || i.isConnected);
        const healthyList = integrationsList.filter(i => i.health === 'healthy' || i.status === 'active');

        // Find most recent sync
        let lastSync = 'N/A';
        if (connectedList.length > 0) {
          const syncedIntegrations = connectedList.filter(i => i.lastSync || i.lastSyncedAt);
          if (syncedIntegrations.length > 0) {
            const sorted = syncedIntegrations.sort((a, b) => {
              const dateA = new Date(a.lastSync || a.lastSyncedAt);
              const dateB = new Date(b.lastSync || b.lastSyncedAt);
              return dateB - dateA;
            });
            lastSync = sorted[0].lastSync || sorted[0].lastSyncedAt || 'N/A';
          }
        }

        setIntegrationsData({
          connectedProviders: connectedList.length,
          healthyIntegrations: healthyList.length,
          lastSyncStatus: lastSync
        });
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

  const formatResponseTime = (ms) => {
    if (!ms && ms !== 0) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (date) => {
    if (!date || date === 'N/A') return 'N/A';
    try {
      return new Date(date).toLocaleString();
    } catch {
      return 'N/A';
    }
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
          <p className="text-sm text-gray-500">API usage, token consumption, and performance metrics</p>
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

      {/* Primary Stats Grid */}
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

      {/* API Health Metrics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API Health Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">{formatPercent(usageData.successRate)}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Failed Requests</p>
              <p className="text-2xl font-bold text-red-600">{formatNumber(usageData.failedRequests)}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Response Time</p>
              <p className="text-2xl font-bold text-blue-600">{formatResponseTime(usageData.avgResponseTime)}</p>
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
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              View Only
            </span>
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

      {/* Webhooks & Integrations Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webhooks Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Webhooks Summary</h2>
            <Link to="/webhooks" className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
              Manage
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900">{webhooksData.total}</p>
              <p className="text-xs text-gray-500">Total Webhooks</p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-green-600">{webhooksData.active}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-red-600">{webhooksData.failedDeliveries}</p>
              <p className="text-xs text-gray-500">Failed Deliveries</p>
            </div>
          </div>
        </div>

        {/* Integration Status Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Integration Status</h2>
            <Link to="/integrations" className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
              Manage
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900">{integrationsData.connectedProviders}</p>
              <p className="text-xs text-gray-500">Connected</p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-green-600">{integrationsData.healthyIntegrations}</p>
              <p className="text-xs text-gray-500">Healthy</p>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 mb-1">Last Sync</p>
              <p className="text-sm font-medium text-gray-900 truncate" title={formatDate(integrationsData.lastSyncStatus)}>
                {integrationsData.lastSyncStatus === 'N/A' ? 'N/A' :
                  (integrationsData.lastSyncStatus ? new Date(integrationsData.lastSyncStatus).toLocaleDateString() : 'N/A')}
              </p>
            </div>
          </div>
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

      {/* Quick Actions - Developer Only */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/api-keys"
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">API Keys</p>
            <p className="text-xs text-gray-500 mt-1">Manage your API keys</p>
          </Link>

          <Link
            to="/integrations"
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Integrations</p>
            <p className="text-xs text-gray-500 mt-1">Manage connections</p>
          </Link>

          <Link
            to="/webhooks"
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Webhooks</p>
            <p className="text-xs text-gray-500 mt-1">Manage webhooks</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default UsagePage;