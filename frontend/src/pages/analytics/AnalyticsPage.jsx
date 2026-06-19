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
import { useAuth } from '../../hooks/useAuth.js';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import Loader from '../../components/common/Loader.jsx';
import analyticsApi from '../../services/api/analytics.api.js';
import { showToast } from '../../utils/toasts.js';
import { formatCurrencyWithSymbol } from '../../utils/currency.js';

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

// Custom label renderer for pie charts with collision avoidance
const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, data }) => {
  const RADIAN = Math.PI / 180;
  // Calculate position for label - position outside the pie
  const radius = outerRadius + 40; // Distance from center for label
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Calculate endpoint on the pie edge for the leader line
  const pieEdgeX = cx + outerRadius * Math.cos(-midAngle * RADIAN);
  const pieEdgeY = cy + outerRadius * Math.sin(-midAngle * RADIAN);

  // Determine text alignment based on position
  const isRightSide = x >= cx;
  const textAnchor = isRightSide ? 'start' : 'end';

  // Format percentage
  const percentage = (percent * 100).toFixed(1);

  // Calculate a small offset from the pie edge for the leader line start
  const lineStartRadius = outerRadius + 5;
  const lineStartX = cx + lineStartRadius * Math.cos(-midAngle * RADIAN);
  const lineStartY = cy + lineStartRadius * Math.sin(-midAngle * RADIAN);

  return (
    <g>
      {/* Leader line - two segments */}
      <polyline
        points={`${pieEdgeX},${pieEdgeY} ${lineStartX},${lineStartY} ${x},${y}`}
        fill="none"
        stroke={COLORS[index % COLORS.length]}
        strokeWidth={1.5}
        strokeOpacity={0.7}
      />
      {/* Provider name and percentage */}
      <text
        x={x + (isRightSide ? 5 : -5)}
        y={y - 4}
        textAnchor={textAnchor}
        fill="#374151"
        fontSize={12}
        fontWeight={500}
      >
        {name}
      </text>
      <text
        x={x + (isRightSide ? 5 : -5)}
        y={y + 12}
        textAnchor={textAnchor}
        fill="#6B7280"
        fontSize={11}
      >
        {`${percentage}%`}
      </text>
    </g>
  );
};

// Alternative label for smaller charts - displays in legend style below chart
const renderOuterLabels = (data, formatCurrency) => {
  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, item) => sum + (item.cost || 0), 0);

  return (
    <div className="mt-4 space-y-2">
      {data.map((item, index) => {
        const percentage = total > 0 ? ((item.cost / total) * 100).toFixed(1) : 0;
        return (
          <div key={index} className="flex items-center gap-3 text-sm">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="font-medium text-gray-900 flex-1">{item.name}</span>
            <span className="text-gray-600">{percentage}%</span>
            <span className="text-gray-500 font-mono">{formatCurrency(item.cost)}</span>
          </div>
        );
      })}
    </div>
  );
};

function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Get currency from organization settings
  const currency = currentOrganization?.settings?.currency || 'USD';

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
    // Always fetch data - the backend handles users without organizations
    fetchAllData();
  }, [projectId]);

  const fetchAllData = async () => {
    setIsLoading(true);

    try {
      const filters = projectId ? { projectId } : {};

      const [dashboard, costs, profitability, margins] = await Promise.all([
        analyticsApi.getDashboard(),
        analyticsApi.getOperationalCosts(filters),
        analyticsApi.getFeatureProfitability(filters),
        analyticsApi.getMargins(filters)
      ]);

      setDashboardData(dashboard?.data || dashboard);
      setCostsData(costs?.data || costs);
      setProfitabilityData(profitability?.data || profitability);
      setMarginsData(margins?.data || margins);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      showToast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      await analyticsApi.downloadReport(activeTab === 'overview' ? 'summary' : activeTab, format);
      showToast.analyticsExported();
    } catch (err) {
      console.error('Export failed:', err);
      showToast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount) => {
    return formatCurrencyWithSymbol(amount || 0, currency);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const formatPercent = (value) => {
    return `${parseFloat(value || 0).toFixed(1)}%`;
  };

  // Loading state
  if (authLoading || isLoading) {
    return <Loader fullPage text="Loading analytics..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500">Operational costs, profitability, and margin analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
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
            type="button"
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
        {activeTab === 'overview' && (
          dashboardData ? (
            <OverviewTab
              data={dashboardData}
              costsData={costsData}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-500">Analytics data will appear here once you have usage activity.</p>
            </div>
          )
        )}

        {activeTab === 'costs' && (
          costsData ? (
            <CostsTab
              data={costsData}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cost Data</h3>
              <p className="text-gray-500">Cost analytics will appear here once you have usage activity.</p>
            </div>
          )
        )}

        {activeTab === 'profitability' && (
          profitabilityData ? (
            <ProfitabilityTab
              data={profitabilityData}
              formatCurrency={formatCurrency}
              formatPercent={formatPercent}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Profitability Data</h3>
              <p className="text-gray-500">Profitability analytics will appear here once you have revenue data.</p>
            </div>
          )
        )}

        {activeTab === 'margins' && (
          marginsData ? (
            <MarginsTab
              data={marginsData}
              formatCurrency={formatCurrency}
              formatPercent={formatPercent}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Margin Data</h3>
              <p className="text-gray-500">Margin analytics will appear here once you have feature data.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ data, costsData, formatCurrency, formatNumber }) {
  const summary = data?.summary || { costs: {}, features: {}, usage: {} };
  const costTrend = data?.costTrend || [];
  const recentActivity = data?.recentActivity || [];
  const costByCategory = summary?.costs?.byCategory || [];

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
              <p className="text-xl font-bold text-gray-900">{formatCurrency(summary?.costs?.total || 0)}</p>
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
              <p className="text-xl font-bold text-gray-900">{summary?.features?.active || 0} / {summary?.features?.total || 0}</p>
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
              <p className="text-xl font-bold text-gray-900">{formatNumber(summary?.usage?.totalTokens || 0)}</p>
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
              <p className="text-xl font-bold text-gray-900">{formatNumber(summary?.usage?.totalRequests || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Trend (Last 7 Days)</h3>
          {costTrend && costTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={costTrend} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(value) => {
                    if (!value) return '';
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                  axisLine={{ stroke: '#d1d5db' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  axisLine={{ stroke: '#d1d5db' }}
                  domain={['auto', 'auto']}
                  allowDataOverflow={false}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => {
                    if (!label) return '';
                    const date = new Date(label);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  name="Cost"
                  dot={{ fill: CHART_COLORS.primary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: CHART_COLORS.primary, strokeWidth: 2, fill: '#fff' }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No trend data available
            </div>
          )}
        </div>

        {/* Cost by Category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Category</h3>
          {costByCategory && costByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="cost" fill={CHART_COLORS.primary} name="Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No category data available
            </div>
          )}
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
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h4 className="text-sm font-medium text-gray-900 mb-1">No recent activity</h4>
            <p className="text-sm text-gray-500">Activity will appear here when features are used. Create features and make API requests to see usage data.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Costs Tab Component
function CostsTab({ data, formatCurrency, formatNumber }) {
  const summary = data?.summary || { totalCost: 0, totalTokens: 0, totalRequests: 0, featureCount: 0 };
  const costsByModel = data?.costsByModel || [];
  const costsByProvider = data?.costsByProvider || [];
  const topCostFeatures = data?.topCostFeatures || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalCost || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Tokens</p>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(summary?.totalTokens || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(summary?.totalRequests || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Features</p>
          <p className="text-2xl font-bold text-gray-900">{summary?.featureCount || 0}</p>
        </div>
      </div>

      {/* Cost by Model */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Model</h3>
        {costsByModel && costsByModel.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costsByModel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="cost" fill={CHART_COLORS.primary} name="Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            No model cost data available
          </div>
        )}
      </div>

      {/* Cost by Provider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Provider</h3>
          {costsByProvider && costsByProvider.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={costsByProvider}
                    dataKey="cost"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={40}
                    paddingAngle={2}
                    labelLine={false}
                    label={false}
                  >
                    {costsByProvider.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend-style display below chart for clear label visibility */}
              {renderOuterLabels(costsByProvider, formatCurrency)}
            </>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No provider data available
            </div>
          )}
        </div>

        {/* Top Cost Features */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Cost Features</h3>
          {topCostFeatures && topCostFeatures.length > 0 ? (
            <div className="space-y-3">
              {topCostFeatures.slice(0, 5).map((feature, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{feature.name}</p>
                    <p className="text-xs text-gray-500">{formatNumber(feature.tokens)} tokens</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(feature.cost)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No feature cost data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Profitability Tab Component
function ProfitabilityTab({ data, formatCurrency, formatPercent }) {
  const summary = data?.summary || { totalRevenue: 0, totalCosts: 0, totalProfit: 0, overallMargin: 0 };
  const features = data?.features || [];
  const topPerformers = data?.topPerformers || [];
  const bottomPerformers = data?.bottomPerformers || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.totalRevenue || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Costs</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(summary?.totalCosts || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Profit</p>
          <p className={`text-2xl font-bold ${(summary?.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summary?.totalProfit || 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Overall Margin</p>
          <p className={`text-2xl font-bold ${parseFloat(summary?.overallMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary?.overallMargin || 0}%
          </p>
        </div>
      </div>

      {/* Top & Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
          {topPerformers && topPerformers.length > 0 ? (
            <div className="space-y-3">
              {topPerformers.map((feature, index) => (
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
          ) : (
            <p className="text-gray-400 text-center py-4">No performer data available</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bottom Performers</h3>
          {bottomPerformers && bottomPerformers.length > 0 ? (
            <div className="space-y-3">
              {bottomPerformers.map((feature, index) => (
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
          ) : (
            <p className="text-gray-400 text-center py-4">No performer data available</p>
          )}
        </div>
      </div>

      {/* All Features Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Features</h3>
        {features && features.length > 0 ? (
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
                {features.map((feature, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{feature.featureName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{feature.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(feature.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(feature.costs?.totalCost || feature.costs || 0)}</td>
                    <td className={`px-4 py-3 text-sm text-right ${(feature.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(feature.profit || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        parseFloat(feature.margin || 0) >= 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {feature.margin || 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No feature data available</p>
        )}
      </div>
    </div>
  );
}

// Margins Tab Component
function MarginsTab({ data, formatCurrency, formatPercent }) {
  const summary = data?.summary || { averageMargin: 0, medianMargin: 0, profitableFeatures: 0, unprofitableFeatures: 0 };
  const marginDistribution = data?.marginDistribution || [];
  const features = data?.features || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Average Margin</p>
          <p className={`text-2xl font-bold ${parseFloat(summary?.averageMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary?.averageMargin || 0}%
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Median Margin</p>
          <p className={`text-2xl font-bold ${parseFloat(summary?.medianMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary?.medianMargin || 0}%
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Profitable Features</p>
          <p className="text-2xl font-bold text-green-600">{summary?.profitableFeatures || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Unprofitable Features</p>
          <p className="text-2xl font-bold text-red-600">{summary?.unprofitableFeatures || 0}</p>
        </div>
      </div>

      {/* Margin Distribution Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Margin Distribution</h3>
        {marginDistribution && marginDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={marginDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill={CHART_COLORS.primary} name="Features" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            No margin distribution data available
          </div>
        )}
      </div>

      {/* Margin Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Margins</h3>
        {features && features.length > 0 ? (
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
                {features.map((feature, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{feature.featureName}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        parseFloat(feature.grossMargin || 0) >= 50
                          ? 'bg-green-100 text-green-700'
                          : parseFloat(feature.grossMargin || 0) >= 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {feature.grossMargin || 0}%
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm text-right ${(feature.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(feature.profit || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(feature.revenue || 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(feature.costs || 0)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        feature.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {feature.status || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No margin data available</p>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;