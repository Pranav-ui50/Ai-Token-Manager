/**
 * Finance Admin Dashboard
 *
 * Financial overview for FINANCE_ADMIN role with real API data.
 * Red & White theme styling.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import analyticsApi from '../../services/api/analytics.api.js';

// Helper to extract numeric value from potentially nested object
const extractNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    return value.total || value.count || value.amount || 0;
  }
  return 0;
};

function FinanceAdminDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    totalSpend: 0,
    projectedCost: 0,
    savings: 0,
    activeSubscriptions: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [topModels, setTopModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get organization ID from user
  const orgId = user?.organization?._id || user?.organization;

  useEffect(() => {
    if (orgId) {
      fetchDashboardData();
    } else {
      // Set default data if no organization
      setMonthlyData(generateDefaultMonthlyData());
      setTopModels(generateDefaultModels());
      setIsLoading(false);
    }
  }, [orgId]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await analyticsApi.getDashboard();
      const data = response?.data || response || {};
      const summary = data?.summary || {};

      setStats({
        totalSpend: extractNumber(summary.totalCost || summary.monthlySpend) / 100, // Convert from cents
        projectedCost: extractNumber(summary.projectedCost || summary.estimatedCost) / 100,
        savings: extractNumber(summary.savings || summary.costSavings) / 100,
        activeSubscriptions: extractNumber(summary.activeSubscriptions || summary.subscriptions) || 0
      });

      // Set cost trend data for monthly chart
      const costTrend = data?.costTrend || [];
      setMonthlyData(costTrend.length > 0 ? costTrend : generateDefaultMonthlyData());

      // Set top models from analytics
      const models = data?.topModels || data?.modelsByUsage || [];
      setTopModels(models.length > 0 ? models.slice(0, 5) : generateDefaultModels());

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load dashboard data');
      // Set default data on error
      setMonthlyData(generateDefaultMonthlyData());
      setTopModels(generateDefaultModels());
    } finally {
      setIsLoading(false);
    }
  };

  const generateDefaultMonthlyData = () => [
    { month: 'Jan', actual: 0, projected: 0 },
    { month: 'Feb', actual: 0, projected: 0 },
    { month: 'Mar', actual: 0, projected: 0 },
    { month: 'Apr', actual: 0, projected: 0 },
    { month: 'May', actual: 0, projected: 0 }
  ];

  const generateDefaultModels = () => [];

  const formatCurrency = (amount) => {
    const numValue = typeof amount === 'object' ? extractNumber(amount) : amount;
    if (!numValue && numValue !== 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  };

  const formatNumber = (num) => {
    const numValue = typeof num === 'object' ? extractNumber(num) : num;
    if (!numValue && numValue !== 0) return '0';
    if (numValue >= 1000000) return `${(numValue / 1000000).toFixed(1)}M`;
    if (numValue >= 1000) return `${(numValue / 1000).toFixed(1)}K`;
    return numValue.toString();
  };

  // Loading state
  if (authLoading || isLoading) {
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

  // No organization state
  if (!orgId) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Organization</h2>
          <p className="text-gray-500 mb-4">You need to be added to an organization to access the Finance Dashboard.</p>
          <p className="text-sm text-gray-400">Please contact your administrator to be added to an organization.</p>
        </div>
      </div>
    );
  }

  if (error && !monthlyData.length) {
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-sm text-gray-500">Cost analysis and pricing management</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/reports')}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            onClick={() => navigate('/simulations')}
            className="px-4 py-2 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-5 8a4 4 0 01-4-4V5a2 2 0 012-2h14a2 2 0 012 2v8a4 4 0 01-4 4H7z" />
            </svg>
            New Simulation
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-1 truncate">Total Spend (MTD)</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(stats.totalSpend)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-1 truncate">Projected Cost</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(stats.projectedCost)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-1 truncate">Savings</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 truncate">{formatCurrency(stats.savings)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-1 truncate">Active Plans</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.activeSubscriptions}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Spend</h2>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
              <option>Last 5 months</option>
              <option>Last 12 months</option>
            </select>
          </div>
          {monthlyData.length > 0 ? (
            <div className="space-y-3">
              {monthlyData.map((data, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{data.month || `Month ${index + 1}`}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-900 font-medium">{formatCurrency(extractNumber(data.actual) / 100)}</span>
                      <span className="text-gray-400 text-xs">Projected: {formatCurrency(extractNumber(data.projected) / 100)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div
                      className="h-2 bg-[#DC2626] rounded-full"
                      style={{ width: `${Math.min((extractNumber(data.actual) / 1500000) * 100, 100)}%` }}
                    />
                    <div
                      className="h-2 bg-gray-200 rounded-full"
                      style={{ width: `${Math.min((extractNumber(data.projected - data.actual) / 1500000) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No cost data available yet
            </div>
          )}
        </div>

        {/* Top Models by Cost */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Models by Cost</h2>
            <Link to="/models" className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
              View All
            </Link>
          </div>
          {topModels.length > 0 ? (
            <div className="space-y-3">
              {topModels.map((model, index) => (
                <div key={model._id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-red-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">{index + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{model.name || model.modelName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">{model.provider || model.providerName || '-'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(extractNumber(model.cost) / 100)}</p>
                    <p className="text-xs text-gray-500">{formatNumber(model.tokens || model.tokenCount || 0)} tokens</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No model usage data available yet
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/pricing-history')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Pricing History</p>
            <p className="text-xs text-gray-500 mt-1">View cost trends</p>
          </button>

          <button
            onClick={() => navigate('/simulations')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-5 8a4 4 0 01-4-4V5a2 2 0 012-2h14a2 2 0 012 2v8a4 4 0 01-4 4H7z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Simulations</p>
            <p className="text-xs text-gray-500 mt-1">Run cost scenarios</p>
          </button>

          <button
            onClick={() => navigate('/invoices')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Invoices</p>
            <p className="text-xs text-gray-500 mt-1">View billing history</p>
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 2v-2m5.618-4.574A9 9 0 0012 3a9 9 0 00-8.618 6.426M21 12a9 9 0 01-9 9m9-9H3m9 9a9 9 0 01-9-9" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Reports</p>
            <p className="text-xs text-gray-500 mt-1">Generate reports</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default FinanceAdminDashboard;