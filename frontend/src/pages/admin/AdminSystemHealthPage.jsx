/**
 * Admin System Health Page
 *
 * System health monitoring for super admins.
 */

import { useState, useEffect } from 'react';

function AdminSystemHealthPage() {
  const [healthData, setHealthData] = useState({
    api: { status: 'healthy', latency: 12, uptime: '99.99%', requests: 125000 },
    database: { status: 'healthy', latency: 5, connections: 45, maxConnections: 100 },
    redis: { status: 'healthy', latency: 1, memory: '45%', keys: 12500 },
    storage: { status: 'warning', used: '75%', free: '25%', total: '100GB' }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);

  useEffect(() => {
    // Simulate health check API call
    const fetchData = () => {
      setTimeout(() => {
        setHealthData({
          api: { status: 'healthy', latency: Math.floor(Math.random() * 20) + 10, uptime: '99.99%', requests: Math.floor(Math.random() * 10000) + 120000 },
          database: { status: 'healthy', latency: Math.floor(Math.random() * 10) + 3, connections: Math.floor(Math.random() * 20) + 40, maxConnections: 100 },
          redis: { status: 'healthy', latency: Math.floor(Math.random() * 3) + 1, memory: `${Math.floor(Math.random() * 20) + 40}%`, keys: Math.floor(Math.random() * 2000) + 11000 },
          storage: { status: Math.random() > 0.8 ? 'warning' : 'healthy', used: '75%', free: '25%', total: '100GB' }
        });
        setIsLoading(false);
      }, 300);
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const MetricCard = ({ title, value, unit, status, children }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(status)}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(status)} mr-1.5`}></span>
          {status}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {children}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DC2626]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-sm text-gray-500">Monitor system performance and health</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
          >
            <option value={10}>Refresh: 10s</option>
            <option value={30}>Refresh: 30s</option>
            <option value={60}>Refresh: 1m</option>
          </select>
          <button
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Logs
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">All Systems Operational</h2>
            <p className="text-sm text-gray-600">Last checked: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="API Latency"
          value={healthData.api.latency}
          unit="ms"
          status={healthData.api.status}
        >
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">Uptime: {healthData.api.uptime}</span>
            <span className="text-xs text-gray-300">•</span>
            <span className="text-xs text-gray-500">{healthData.api.requests.toLocaleString()} req/min</span>
          </div>
        </MetricCard>

        <MetricCard
          title="Database Latency"
          value={healthData.database.latency}
          unit="ms"
          status={healthData.database.status}
        >
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Connections</span>
              <span>{healthData.database.connections}/{healthData.database.maxConnections}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full"
                style={{ width: `${(healthData.database.connections / healthData.database.maxConnections) * 100}%` }}
              ></div>
            </div>
          </div>
        </MetricCard>

        <MetricCard
          title="Redis Latency"
          value={healthData.redis.latency}
          unit="ms"
          status={healthData.redis.status}
        >
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">Memory: {healthData.redis.memory}</span>
            <span className="text-xs text-gray-300">•</span>
            <span className="text-xs text-gray-500">{healthData.redis.keys.toLocaleString()} keys</span>
          </div>
        </MetricCard>

        <MetricCard
          title="Storage Usage"
          value={healthData.storage.used}
          status={healthData.storage.status}
        >
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${healthData.storage.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: healthData.storage.used }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{healthData.storage.free} free of {healthData.storage.total}</p>
          </div>
        </MetricCard>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Distribution</h3>
          <div className="space-y-3">
            {[
              { endpoint: '/api/v1/tokens/calculate', requests: 45210, percentage: 36 },
              { endpoint: '/api/v1/usage/analytics', requests: 31250, percentage: 25 },
              { endpoint: '/api/v1/providers', requests: 18750, percentage: 15 },
              { endpoint: '/api/v1/billing', requests: 12500, percentage: 10 },
              { endpoint: '/api/v1/auth', requests: 17790, percentage: 14 }
            ].map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono text-gray-600">{item.endpoint}</span>
                  <span className="text-gray-900 font-medium">{item.requests.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-[#DC2626] h-1.5 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error Rates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Rates (24h)</h3>
          <div className="space-y-4">
            {[
              { code: '4xx', label: 'Client Errors', count: 245, percentage: 0.2, trend: '+0.05%', color: 'yellow' },
              { code: '5xx', label: 'Server Errors', count: 12, percentage: 0.01, trend: '-0.02%', color: 'red' },
              { code: '429', label: 'Rate Limited', count: 890, percentage: 0.7, trend: '+0.1%', color: 'orange' },
              { code: '408', label: 'Timeouts', count: 5, percentage: 0.004, trend: '0%', color: 'gray' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-mono ${
                    item.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                    item.color === 'red' ? 'bg-red-100 text-red-700' :
                    item.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {item.code}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.count} requests ({item.percentage}%)</p>
                  </div>
                </div>
                <span className={`text-xs font-medium ${item.trend.startsWith('+') ? 'text-red-600' : item.trend.startsWith('-') ? 'text-green-600' : 'text-gray-500'}`}>
                  {item.trend}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Logs Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent System Logs</h3>
          <button className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
            View All Logs
          </button>
        </div>
        <div className="font-mono text-xs space-y-2 max-h-48 overflow-y-auto">
          {[
            { time: '14:32:01', level: 'INFO', message: 'API request processed successfully', duration: '12ms' },
            { time: '14:32:00', level: 'INFO', message: 'Cache hit for provider:openai', duration: '1ms' },
            { time: '14:31:58', level: 'WARN', message: 'Rate limit exceeded for user:abc123', duration: '0ms' },
            { time: '14:31:55', level: 'INFO', message: 'Database query completed', duration: '5ms' },
            { time: '14:31:50', level: 'INFO', message: 'WebSocket connection established', duration: '3ms' },
            { time: '14:31:45', level: 'ERROR', message: 'Payment processing failed: card_declined', duration: '234ms' }
          ].map((log, index) => (
            <div key={index} className="flex items-start gap-3 py-1 hover:bg-gray-50">
              <span className="text-gray-400 w-20">{log.time}</span>
              <span className={`w-12 ${
                log.level === 'INFO' ? 'text-blue-500' :
                log.level === 'WARN' ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                [{log.level}]
              </span>
              <span className="flex-1 text-gray-700">{log.message}</span>
              <span className="text-gray-400">{log.duration}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminSystemHealthPage;