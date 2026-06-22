/**
 * Finance Admin Dashboard
 *
 * Financial overview for FINANCE_ADMIN role with real API data.
 * Red & White theme styling.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import analyticsApi from '../../services/api/analytics.api.js';
import Loader from '../../components/common/Loader.jsx';

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
  const { currentOrganization } = useOrganization();
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

  // Get organization ID from user or context
  const orgId = currentOrganization?._id || user?.organization?._id || user?.organization;

  useEffect(() => {
    fetchDashboardData();
  }, [orgId]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await analyticsApi.getDashboard();
      const data = response?.data || response || {};
      const summary = data?.summary || {};

      // Map backend fields to frontend stats
      setStats({
        totalSpend: extractNumber(summary.totalCost || summary.monthlySpend || summary.costs?.total || 0),
        projectedCost: extractNumber(summary.projectedCost || summary.estimatedCost || summary.costs?.projected || 0),
        savings: extractNumber(summary.savings || summary.costSavings || 0),
        activeSubscriptions: extractNumber(summary.activePlans || summary.activeSubscriptions || summary.subscriptions || 0)
      });

      // Set cost trend data for monthly chart
      const costTrend = data?.costTrend || [];
      if (costTrend.length > 0) {
        // Get current month info for generating proper month labels
        const now = new Date();
        const currentMonth = now.getMonth();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Take only last 5 data points to match "Last 5 months" title
        const last5Data = costTrend.slice(-5);

        // Transform costTrend data for chart display
        // Use index-based month names to ensure unique months
        const transformedTrend = last5Data.map((item, index) => {
          // Calculate the month index based on position from current month
          // First item is oldest (4 months ago), last is current
          const monthIndex = (currentMonth - (last5Data.length - 1 - index) + 12) % 12;
          return {
            month: months[monthIndex],
            actual: extractNumber(item.cost || item.actual || 0),
            projected: extractNumber(item.projected || 0),
            tokens: extractNumber(item.tokens || 0),
            requests: extractNumber(item.requests || 0)
          };
        });
        setMonthlyData(transformedTrend);
      } else {
        // No real usage data - don't show fake $0 values
        setMonthlyData([]);
      }

      // Set top models from analytics
      const models = data?.topModels || data?.summary?.costs?.byModel || [];
      if (models.length > 0) {
        const transformedModels = models.map(model => ({
          _id: model._id || model.model,
          name: model.name || model.modelName || model.model || 'Unknown',
          cost: extractNumber(model.cost || 0),
          tokens: extractNumber(model.tokens || model.tokenCount || 0),
          requests: extractNumber(model.requests || 0),
          provider: model.provider || model.providerName || 'Unknown'
        }));
        setTopModels(transformedModels.slice(0, 5));
      } else {
        setTopModels([]);
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load dashboard data');
      setMonthlyData(generateDefaultMonthlyData());
      setTopModels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDefaultMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentMonth = now.getMonth();
    const data = [];

    // Generate last 5 months
    for (let i = 4; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      data.push({
        month: months[monthIndex],
        actual: 0,
        projected: 0
      });
    }
    return data;
  };

  const formatCurrency = (amount) => {
    const numValue = typeof amount === 'object' ? extractNumber(amount) : amount;
    if (!numValue && numValue !== 0) return '$0.00';
    const value = Number(numValue);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (num) => {
    const numValue = typeof num === 'object' ? extractNumber(num) : num;
    if (!numValue && numValue !== 0) return '0';
    if (numValue >= 1000000) return `${(numValue / 1000000).toFixed(1)}M`;
    if (numValue >= 1000) return `${(numValue / 1000).toFixed(1)}K`;
    return numValue.toString();
  };

  // Calculate max value for chart scaling
  const maxCost = Math.max(...monthlyData.map(d => Math.max(d.actual, d.projected)), 1);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader text="Loading dashboard..." />
      </div>
    );
  }

  // No organization state
  if (!orgId && !currentOrganization) {
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
              <p className="text-xs text-gray-500 mb-1 truncate">Active Models</p>
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
            <p className="text-xs text-gray-500">Last 5 months</p>
          </div>
          {monthlyData.length > 0 ? (
            <div className="space-y-4">
              {monthlyData.map((data, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">{data.month}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-900 font-semibold">{formatCurrency(data.actual)}</span>
                      {data.projected > 0 && (
                        <span className="text-gray-400 text-xs">Projected: {formatCurrency(data.projected)}</span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="flex h-full">
                      <div
                        className="h-full bg-[#DC2626] rounded-l-full"
                        style={{ width: `${Math.min((data.actual / maxCost) * 100, 100) || 0}%` }}
                      />
                      {data.projected > data.actual && (
                        <div
                          className="h-full bg-gray-300 rounded-r-full"
                          style={{ width: `${Math.min(((data.projected - data.actual) / maxCost) * 100, 100 - (data.actual / maxCost) * 100) || 0}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-gray-500">No cost data available yet</p>
              <p className="text-sm text-gray-400 mt-1">Cost trends will appear here after API usage</p>
            </div>
          )}
        </div>

        {/* Top Models by Cost */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Models by Cost</h2>
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
                      <p className="font-medium text-gray-900 truncate">{model.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">{model.provider || '-'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(model.cost)}</p>
                    <p className="text-xs text-gray-500">{formatNumber(model.tokens)} tokens</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <p className="text-gray-500">No model usage data available yet</p>
              <p className="text-sm text-gray-400 mt-1">Model costs will appear here after API usage</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate('/subscription')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Subscription</p>
            <p className="text-xs text-gray-500 mt-1">View plan details</p>
          </button>

          <button
            type="button"
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
            type="button"
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
            type="button"
            onClick={() => navigate('/reports')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 2v-2m5.618-4.574A9 9 0 0012 3a9 9 0 00-8.618 6.426M21 12a9 9 0 01-9 9m9-9H3m9 9a9 9 0 01-9-9" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Reports</p>
            <p className="text-xs text-gray-500 mt-1">View reports</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default FinanceAdminDashboard;