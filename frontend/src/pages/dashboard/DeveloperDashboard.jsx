/**
 * Developer Dashboard
 *
 * Technical overview for DEVELOPER role with real API data.
 * Red & White theme styling.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import apiKeyApi from '../../services/api/apiKey.api.js';
import integrationApi from '../../services/api/integration.api.js';
import analyticsApi from '../../services/api/analytics.api.js';

// Helper to extract numeric value from potentially nested object
const extractNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    return value.total || value.count || value.active || 0;
  }
  return 0;
};

function DeveloperDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    apiKeys: 0,
    activeIntegrations: 0,
    requestsToday: 0,
    errorRate: 0
  });
  const [apiKeys, setApiKeys] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [apiKeysRes, integrationsRes, analyticsRes] = await Promise.allSettled([
        apiKeyApi.getMyKeys(),
        integrationApi.getAll ? integrationApi.getAll() : integrationApi.getForOrganization?.(),
        analyticsApi.getDashboard()
      ]);

      // Process API keys
      if (apiKeysRes.status === 'fulfilled') {
        const keysData = apiKeysRes.value?.data || apiKeysRes.value || {};
        const keysList = keysData.keys || keysData.data || keysData || [];
        const keysArray = Array.isArray(keysList) ? keysList : [];
        setApiKeys(keysArray.slice(0, 5));

        const activeKeys = keysArray.filter(k => k.isActive !== false && k.status !== 'revoked').length;
        setStats(prev => ({
          ...prev,
          apiKeys: keysArray.length,
          activeKeys
        }));
      }

      // Process integrations
      if (integrationsRes.status === 'fulfilled') {
        const intData = integrationsRes.value?.data || integrationsRes.value || {};
        const intList = intData.integrations || intData.data || intData || [];
        const intArray = Array.isArray(intList) ? intList : [];
        setIntegrations(intArray.slice(0, 5));

        const connectedIntegrations = intArray.filter(i => i.status === 'connected' || i.isActive).length;
        setStats(prev => ({
          ...prev,
          activeIntegrations: connectedIntegrations
        }));
      }

      // Process analytics
      if (analyticsRes.status === 'fulfilled') {
        const analyticsData = analyticsRes.value?.data || analyticsRes.value || {};
        const summary = analyticsData?.summary || {};
        setStats(prev => ({
          ...prev,
          requestsToday: extractNumber(summary.requestsToday || summary.todayRequests),
          errorRate: summary.errorRate || summary.errorPercentage || 0
        }));

        // Set recent activity as logs
        const activity = analyticsData?.recentActivity || [];
        setRecentLogs(activity.slice(0, 5));
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load dashboard data');
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

  const getStatusColor = (status) => {
    if (status === 'active' || status === 'connected') {
      return 'bg-green-100 text-green-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: 'bg-blue-100 text-blue-700',
      POST: 'bg-green-100 text-green-700',
      PUT: 'bg-yellow-100 text-yellow-700',
      DELETE: 'bg-red-100 text-red-700'
    };
    return colors[method] || 'bg-gray-100 text-gray-700';
  };

  const maskApiKey = (key) => {
    if (!key) return '****';
    if (key.startsWith('pk_')) {
      return `${key.substring(0, 7)}...${key.substring(key.length - 4)}`;
    }
    return `${key.substring(0, 8)}...****`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-[#DC2626] mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
        <button onClick={fetchDashboardData} className="ml-4 text-red-800 hover:text-red-900 underline">
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Developer Dashboard</h1>
          <p className="text-sm text-gray-500">API keys, integrations, and usage</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open('/docs', '_blank')}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Documentation
          </button>
          <button
            onClick={() => navigate('/api-keys')}
            className="px-4 py-2 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New API Key
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Link to="/api-keys" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">API Keys</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.apiKeys}</p>
            </div>
          </div>
        </Link>

        <Link to="/integrations" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Integrations</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.activeIntegrations}</p>
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Requests Today</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{formatNumber(stats.requestsToday)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Error Rate</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.errorRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* API Keys and Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Keys */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
            <Link to="/api-keys" className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
              Manage All
            </Link>
          </div>
          {apiKeys.length > 0 ? (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-red-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{key.name || 'API Key'}</p>
                      <p className="text-xs text-gray-500 font-mono truncate">{maskApiKey(key.key || key.prefix)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs text-gray-500">{key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never used'}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(key.status || (key.isActive ? 'active' : 'inactive'))}`}>
                      {key.status || (key.isActive ? 'active' : 'inactive')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No API keys yet. <Link to="/api-keys" className="text-[#DC2626] hover:underline">Create one</Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Link to="/audit-logs" className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
              View All Logs
            </Link>
          </div>
          {recentLogs.length > 0 ? (
            <div className="space-y-2">
              {recentLogs.map((log, index) => (
                <div key={log._id || index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-red-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getMethodColor(log.method || 'GET')}`}>
                      {log.method || 'GET'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-mono text-gray-900 truncate">{log.endpoint || log.path || '/'}</p>
                      <p className="text-xs text-gray-500">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className="text-xs text-gray-500">{log.duration ? `${log.duration}ms` : '-'}</span>
                    <span className={`text-sm font-medium ${log.status >= 200 && log.status < 300 ? 'text-green-600' : log.status >= 400 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {log.status || log.statusCode || 200}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          )}
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Connected Integrations</h2>
          <button
            onClick={() => navigate('/integrations')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Integration
          </button>
        </div>
        {integrations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {integrations.map((integration) => (
              <div key={integration._id} className="p-4 bg-gray-50 rounded-xl hover:bg-red-50/50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                      <span className="text-sm font-bold text-gray-700">
                        {integration.name?.charAt(0) || integration.type?.charAt(0) || 'I'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{integration.name || integration.type}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(integration.status || (integration.isActive ? 'connected' : 'disconnected'))}`}>
                        {integration.status || (integration.isActive ? 'connected' : 'disconnected')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{formatNumber(integration.requests || integration.requestCount || 0)} requests</span>
                  <span className="text-gray-400">{integration.lastSync ? new Date(integration.lastSync).toLocaleDateString() : '-'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No integrations yet. <Link to="/integrations" className="text-[#DC2626] hover:underline">Add one</Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/api-keys')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Generate Key</p>
            <p className="text-xs text-gray-500 mt-1">Create new API key</p>
          </button>

          <button
            onClick={() => navigate('/integrations')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Integrations</p>
            <p className="text-xs text-gray-500 mt-1">Manage connections</p>
          </button>

          <button
            onClick={() => window.open('/api-docs', '_blank')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">API Docs</p>
            <p className="text-xs text-gray-500 mt-1">View documentation</p>
          </button>

          <button
            onClick={() => navigate('/usage')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Usage Stats</p>
            <p className="text-xs text-gray-500 mt-1">View detailed metrics</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeveloperDashboard;