/**
 * Analytics Page
 *
 * Analytics dashboard with operational costs, profitability, and margins.
 * FR-40: Operational cost dashboards
 * FR-41: Feature profitability analytics
 * FR-42: Exportable reports
 * FR-43: Excel/PDF exports
 * FR-44: Margin analytics
 */

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import Loader from '../../components/common/Loader.jsx';
import analyticsApi from '../../services/api/analytics.api.js';

// Tab configuration
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'costs', label: 'Costs' },
  { id: 'profitability', label: 'Profitability' },
  { id: 'margins', label: 'Margins' }
];

// Chart colors
const COLORS = ['#DC2626', '#EA580C', '#D97706', '#059669', '#0891B2', '#6366F1', '#7C3AED', '#DB2777'];
const CHART_COLORS = {
  primary: '#DC2626',
  secondary: '#B91C1C',
  success: '#059669',
  warning: '#D97706',
  info: '#0891B2'
};

function AnalyticsPage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [costsData, setCostsData] = useState(null);
  const [profitabilityData, setProfitabilityData] = useState(null);
  const [marginsData, setMarginsData] = useState(null);

  // Filter states
  const [projectId, setProjectId] = useState('');

  // Export states
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (currentOrganization) {
      fetchAllData();
    }
  }, [currentOrganization, projectId]);

  const fetchAllData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const filters = projectId ? { projectId } : {};

      const [dashboard, costs, profitability, margins] = await Promise.all([
        analyticsApi.getDashboard(),
        analyticsApi.getOperationalCosts(filters),
        analyticsApi.getFeatureProfitability(filters),
        analyticsApi.getMargins(filters)
      ]);

      setDashboardData(dashboard.data);
      setCostsData(costs.data);
      setProfitabilityData(profitability.data);
      setMarginsData(margins.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      await analyticsApi.downloadReport(activeTab === 'overview' ? 'summary' : activeTab, format);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const formatPercent = (value) => {
    return `${parseFloat(value || 0).toFixed(1)}%`;
  };

  // Loading state
  if (orgLoading || isLoading) {
    return <Loader fullPage text="Loading analytics..." />;
  }

  // No organization state
  if (!currentOrganization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Organization Selected</h2>
          <p className="text-gray-500 mb-4">Please select an organization to view analytics.</p>
          <a
            href="/organizations"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            <span>Go to Organizations</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500">Operational costs, profitability, and margin analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{isExporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-[#DC2626] text-[#DC2626]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && dashboardData && (
          <OverviewTab
            data={dashboardData}
            costsData={costsData}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
          />
        )}

        {activeTab === 'costs' && costsData && (
          <CostsTab
            data={costsData}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
          />
        )}

        {activeTab === 'profitability' && profitabilityData && (
          <ProfitabilityTab
            data={profitabilityData}
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
          />
        )}

        {activeTab === 'margins' && marginsData && (
          <MarginsTab
            data={marginsData}
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
          />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ data, costsData, formatCurrency, formatNumber }) {
  const { summary, costTrend, recentActivity } = data;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Cost</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.costs.total)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Active Features</p>
              <p className="text-xl font-bold text-gray-900">{summary.features.active} / {summary.features.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Tokens</p>
              <p className="text-xl font-bold text-gray-900">{formatNumber(summary.usage.totalTokens)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Requests</p>
              <p className="text-xl font-bold text-gray-900">{formatNumber(summary.usage.totalRequests)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={costTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="cost" stroke={CHART_COLORS.primary} strokeWidth={2} name="Cost ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cost by Category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary.costs.byCategory || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="cost" fill={CHART_COLORS.primary} name="Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {recentActivity && recentActivity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Used</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentActivity.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.lastUsed ? new Date(item.lastUsed).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatNumber(item.requests)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No recent activity</p>
        )}
      </div>
    </div>
  );
}

// Costs Tab Component
function CostsTab({ data, formatCurrency, formatNumber }) {
  const { summary, costsByModel, costsByProvider, topCostFeatures, costTrend } = data;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalCost)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Tokens</p>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalTokens)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalRequests)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Features</p>
          <p className="text-2xl font-bold text-gray-900">{summary.featureCount}</p>
        </div>
      </div>

      {/* Cost by Model */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Model</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={costsByModel || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Bar dataKey="cost" fill={CHART_COLORS.primary} name="Cost ($)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cost by Provider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Provider</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={costsByProvider || []}
                dataKey="cost"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {(costsByProvider || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Cost Features */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Cost Features</h3>
          <div className="space-y-3">
            {(topCostFeatures || []).slice(0, 5).map((feature, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{feature.name}</p>
                  <p className="text-xs text-gray-500">{formatNumber(feature.tokens)} tokens</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(feature.cost)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Profitability Tab Component
function ProfitabilityTab({ data, formatCurrency, formatPercent }) {
  const { summary, features, topPerformers, bottomPerformers } = data;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Costs</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalCosts)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Profit</p>
          <p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summary.totalProfit)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Overall Margin</p>
          <p className={`text-2xl font-bold ${parseFloat(summary.overallMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.overallMargin}%
          </p>
        </div>
      </div>

      {/* Top & Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
          <div className="space-y-3">
            {(topPerformers || []).map((feature, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{feature.featureName}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(feature.profit)} profit</p>
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {feature.margin}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bottom Performers</h3>
          <div className="space-y-3">
            {(bottomPerformers || []).map((feature, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{feature.featureName}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(feature.profit)} profit</p>
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  {feature.margin}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Features Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Features</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costs</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(features || []).map((feature, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{feature.featureName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">{feature.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(feature.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(feature.costs.totalCost)}</td>
                  <td className={`px-4 py-3 text-sm text-right ${feature.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(feature.profit)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      parseFloat(feature.margin) >= 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {feature.margin}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Margins Tab Component
function MarginsTab({ data, formatCurrency, formatPercent }) {
  const { summary, marginDistribution, features } = data;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Average Margin</p>
          <p className={`text-2xl font-bold ${parseFloat(summary.averageMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.averageMargin}%
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Median Margin</p>
          <p className={`text-2xl font-bold ${parseFloat(summary.medianMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.medianMargin}%
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Profitable Features</p>
          <p className="text-2xl font-bold text-green-600">{summary.profitableFeatures}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Unprofitable Features</p>
          <p className="text-2xl font-bold text-red-600">{summary.unprofitableFeatures}</p>
        </div>
      </div>

      {/* Margin Distribution Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Margin Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={marginDistribution || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill={CHART_COLORS.primary} name="Features" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Margin Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Margins</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costs</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(features || []).map((feature, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{feature.featureName}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      parseFloat(feature.grossMargin) >= 50
                        ? 'bg-green-100 text-green-700'
                        : parseFloat(feature.grossMargin) >= 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {feature.grossMargin}%
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm text-right ${feature.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(feature.profit)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(feature.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(feature.costs)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      feature.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {feature.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;