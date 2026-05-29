/**
 * Developer Dashboard
 *
 * Technical overview for DEVELOPER role.
 * Red & White theme styling.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';

function DeveloperDashboard() {
  const navigate = useNavigate();
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

  useEffect(() => {
    // Simulate loading - replace with actual API calls
    const timer = setTimeout(() => {
      setStats({
        apiKeys: 5,
        activeIntegrations: 3,
        requestsToday: 45280,
        errorRate: 0.12
      });
      setApiKeys([
        { _id: '1', name: 'Production API', prefix: 'pk_live_****', lastUsed: '2 min ago', status: 'active' },
        { _id: '2', name: 'Development', prefix: 'pk_test_****', lastUsed: '15 min ago', status: 'active' },
        { _id: '3', name: 'Staging', prefix: 'pk_staging_****', lastUsed: '1 hour ago', status: 'active' },
        { _id: '4', name: 'Old Integration', prefix: 'pk_live_****', lastUsed: '30 days ago', status: 'inactive' }
      ]);
      setRecentLogs([
        { _id: '1', endpoint: '/v1/chat/completions', method: 'POST', status: 200, time: '2 sec ago', duration: '1.2s' },
        { _id: '2', endpoint: '/v1/embeddings', method: 'POST', status: 200, time: '5 sec ago', duration: '0.8s' },
        { _id: '3', endpoint: '/v1/models', method: 'GET', status: 200, time: '10 sec ago', duration: '0.1s' },
        { _id: '4', endpoint: '/v1/chat/completions', method: 'POST', status: 429, time: '15 sec ago', duration: '0.05s' },
        { _id: '5', endpoint: '/v1/completions', method: 'POST', status: 200, time: '20 sec ago', duration: '2.1s' }
      ]);
      setIntegrations([
        { _id: '1', name: 'OpenAI', status: 'connected', requests: 25000, lastSync: '1 min ago' },
        { _id: '2', name: 'Anthropic', status: 'connected', requests: 15000, lastSync: '2 min ago' },
        { _id: '3', name: 'Google AI', status: 'connected', requests: 5000, lastSync: '5 min ago' }
      ]);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusColor = (status) => {
    return status === 'active' || status === 'connected'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700';
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

  const getStatusCodeColor = (status) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developer Dashboard</h1>
          <p className="text-sm text-gray-500">API keys, integrations, and usage</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Documentation
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New API Key
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">API Keys</p>
              <p className="text-2xl font-bold text-gray-900">{stats.apiKeys}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs">
            <span className="text-gray-500">4 active, 1 inactive</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Integrations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeIntegrations}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs">
            <span className="text-green-600">All connected</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Requests Today</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.requestsToday)}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs">
            <span className="text-green-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              +12% from yesterday
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Error Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.errorRate}%</p>
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs">
            <span className="text-green-600">Within acceptable range</span>
          </div>
        </div>
      </div>

      {/* API Keys and Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Keys */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
            <button className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
              Manage All
            </button>
          </div>
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div key={key._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-red-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{key.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{key.prefix}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{key.lastUsed}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(key.status)}`}>
                    {key.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>
            <button className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
              View All Logs
            </button>
          </div>
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div key={log._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-red-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getMethodColor(log.method)}`}>
                    {log.method}
                  </span>
                  <div>
                    <p className="text-sm font-mono text-gray-900">{log.endpoint}</p>
                    <p className="text-xs text-gray-500">{log.time}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="text-xs text-gray-500">{log.duration}</span>
                  <span className={`text-sm font-medium ${getStatusCodeColor(log.status)}`}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <div key={integration._id} className="p-4 bg-gray-50 rounded-xl hover:bg-red-50/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-sm font-bold text-gray-700">
                      {integration.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{integration.name}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(integration.status)}`}>
                      {integration.status}
                    </span>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-[#DC2626] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{formatNumber(integration.requests)} requests</span>
                <span className="text-gray-400">{integration.lastSync}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            onClick={() => navigate('/analytics')}
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