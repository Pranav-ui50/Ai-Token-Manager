/**
 * Forecast Charts Component
 *
 * Displays forecast data with interactive charts for simulations.
 */

import { useState, useMemo } from 'react';

const ForecastCharts = ({ data, type = 'simulation' }) => {
  const [activeChart, setActiveChart] = useState('revenue');
  const [timeRange, setTimeRange] = useState('all'); // 'all' | '6m' | '12m' | '24m'

  // Process monthly projections for charts
  const chartData = useMemo(() => {
    if (!data?.monthlyProjections) return null;

    let projections = [...data.monthlyProjections];

    // Filter by time range
    if (timeRange === '6m') {
      projections = projections.slice(0, 6);
    } else if (timeRange === '12m') {
      projections = projections.slice(0, 12);
    } else if (timeRange === '24m') {
      projections = projections.slice(0, 24);
    }

    return {
      labels: projections.map(p => `${p.month}/${p.year.toString().slice(2)}`),
      revenue: projections.map(p => p.revenue?.total || 0),
      costs: projections.map(p => p.costs?.totalCost || 0),
      profit: projections.map(p => p.profit?.net || 0),
      users: projections.map(p => p.users?.total || 0),
      tokens: projections.map(p => p.tokens?.total || 0),
      margin: projections.map(p => p.profit?.margin || 0)
    };
  }, [data, timeRange]);

  // Calculate max values for scaling
  const maxValues = useMemo(() => {
    if (!chartData) return {};
    return {
      revenue: Math.max(...chartData.revenue),
      costs: Math.max(...chartData.costs),
      profit: Math.max(...chartData.profit.map(Math.abs)),
      users: Math.max(...chartData.users),
      tokens: Math.max(...chartData.tokens),
      margin: 100 // Max percentage
    };
  }, [chartData]);

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Format number
  const formatNumber = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  // Get chart height percentage
  const getHeightPercent = (value, max) => {
    if (!max || max === 0) return 0;
    return Math.min((Math.abs(value) / max) * 100, 100);
  };

  if (!chartData) {
    return (
      <div className="bg-white rounded-xl shadow-soft p-6">
        <div className="text-center py-12 text-gray-500">
          <p>No forecast data available</p>
        </div>
      </div>
    );
  }

  const chartTypes = [
    { id: 'revenue', label: 'Revenue', icon: '💰', color: '#10B981' },
    { id: 'costs', label: 'Costs', icon: '📊', color: '#EF4444' },
    { id: 'profit', label: 'Profit', icon: '📈', color: '#3B82F6' },
    { id: 'users', label: 'Users', icon: '👥', color: '#8B5CF6' },
    { id: 'tokens', label: 'Tokens', icon: '🔢', color: '#F59E0B' },
    { id: 'margin', label: 'Margin', icon: '📊', color: '#06B6D4' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-soft p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Forecast Charts</h3>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Period:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['6m', '12m', '24m', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-white text-[#DC2626] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range === 'all' ? 'All' : range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Type Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {chartTypes.map((chart) => (
          <button
            key={chart.id}
            onClick={() => setActiveChart(chart.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeChart === chart.id
                ? 'bg-[#DC2626]/10 text-[#DC2626]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{chart.icon}</span>
            <span>{chart.label}</span>
          </button>
        ))}
      </div>

      {/* Main Chart Area */}
      <div className="relative">
        {/* Y-Axis Labels */}
        <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-gray-400">
          {activeChart === 'margin' ? (
            <>
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
              <span>-50%</span>
            </>
          ) : (
            <>
              <span>{activeChart === 'revenue' || activeChart === 'costs' || activeChart === 'profit'
                ? formatCurrency(maxValues[activeChart] || 0)
                : formatNumber(maxValues[activeChart] || 0)}</span>
              <span>{activeChart === 'revenue' || activeChart === 'costs' || activeChart === 'profit'
                ? formatCurrency((maxValues[activeChart] || 0) / 2)
                : formatNumber((maxValues[activeChart] || 0) / 2)}</span>
              <span>0</span>
            </>
          )}
        </div>

        {/* Chart Container */}
        <div className="ml-16 overflow-x-auto">
          <div className="min-w-full" style={{ minWidth: `${chartData.labels.length * 60}px` }}>
            {/* Chart Grid */}
            <div className="relative h-64 border-l border-b border-gray-200">
              {/* Grid Lines */}
              <div className="absolute inset-0">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="absolute w-full border-t border-gray-100"
                    style={{ top: `${i * 25}%` }}
                  />
                ))}
              </div>

              {/* Bars or Line */}
              <div className="absolute inset-0 flex items-end justify-around px-2 pb-0">
                {chartData.labels.map((label, idx) => {
                  const value = chartData[activeChart][idx];
                  const max = activeChart === 'margin' ? 100 : maxValues[activeChart];
                  const height = getHeightPercent(value, max);
                  const color = chartTypes.find(c => c.id === activeChart)?.color || '#3B82F6';
                  const isNegative = value < 0;

                  return (
                    <div key={idx} className="flex flex-col items-center h-full justify-end">
                      {/* Tooltip on hover */}
                      <div className="group relative flex flex-col items-center h-full justify-end">
                        {/* Bar */}
                        <div
                          className={`w-8 rounded-t-md transition-all hover:opacity-80 ${
                            isNegative ? 'bg-red-400' : ''
                          }`}
                          style={{
                            height: `${height}%`,
                            minHeight: '2px',
                            backgroundColor: isNegative ? undefined : color,
                            marginBottom: isNegative ? 'auto' : 0
                          }}
                        />

                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                            {activeChart === 'margin'
                              ? `${value.toFixed(1)}%`
                              : activeChart === 'revenue' || activeChart === 'costs' || activeChart === 'profit'
                                ? formatCurrency(value)
                                : formatNumber(value)}
                          </div>
                        </div>
                      </div>

                      {/* X-Axis Label */}
                      <div className="mt-2 text-xs text-gray-500 text-center">
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {activeChart === 'revenue' && (
          <>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(chartData.revenue.reduce((a, b) => a + b, 0))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Avg Monthly</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(chartData.revenue.reduce((a, b) => a + b, 0) / chartData.revenue.length)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Peak Month</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(Math.max(...chartData.revenue))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Growth</p>
              <p className={`text-lg font-bold ${chartData.revenue[chartData.revenue.length - 1] > chartData.revenue[0] ? 'text-green-600' : 'text-red-600'}`}>
                {chartData.revenue[0] > 0
                  ? (((chartData.revenue[chartData.revenue.length - 1] - chartData.revenue[0]) / chartData.revenue[0]) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
          </>
        )}

        {activeChart === 'costs' && (
          <>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Costs</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(chartData.costs.reduce((a, b) => a + b, 0))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Avg Monthly</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(chartData.costs.reduce((a, b) => a + b, 0) / chartData.costs.length)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Peak Month</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(Math.max(...chartData.costs))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Cost Growth</p>
              <p className={`text-lg font-bold ${chartData.costs[chartData.costs.length - 1] > chartData.costs[0] ? 'text-red-600' : 'text-green-600'}`}>
                {chartData.costs[0] > 0
                  ? (((chartData.costs[chartData.costs.length - 1] - chartData.costs[0]) / chartData.costs[0]) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
          </>
        )}

        {activeChart === 'profit' && (
          <>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Profit</p>
              <p className={`text-lg font-bold ${chartData.profit.reduce((a, b) => a + b, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(chartData.profit.reduce((a, b) => a + b, 0))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Avg Monthly</p>
              <p className={`text-lg font-bold ${chartData.profit.reduce((a, b) => a + b, 0) / chartData.profit.length >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(chartData.profit.reduce((a, b) => a + b, 0) / chartData.profit.length)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Best Month</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(Math.max(...chartData.profit))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Worst Month</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(Math.min(...chartData.profit))}
              </p>
            </div>
          </>
        )}

        {activeChart === 'users' && (
          <>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Final Users</p>
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(chartData.users[chartData.users.length - 1])}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Starting Users</p>
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(chartData.users[0])}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Peak Users</p>
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(Math.max(...chartData.users))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">User Growth</p>
              <p className="text-lg font-bold text-green-600">
                {chartData.users[0] > 0
                  ? (((chartData.users[chartData.users.length - 1] - chartData.users[0]) / chartData.users[0]) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
          </>
        )}

        {activeChart === 'tokens' && (
          <>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Tokens</p>
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(chartData.tokens.reduce((a, b) => a + b, 0))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Avg Monthly</p>
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(chartData.tokens.reduce((a, b) => a + b, 0) / chartData.tokens.length)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Peak Month</p>
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(Math.max(...chartData.tokens))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Token Growth</p>
              <p className="text-lg font-bold text-green-600">
                {chartData.tokens[0] > 0
                  ? (((chartData.tokens[chartData.tokens.length - 1] - chartData.tokens[0]) / chartData.tokens[0]) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
          </>
        )}

        {activeChart === 'margin' && (
          <>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Avg Margin</p>
              <p className={`text-lg font-bold ${(chartData.margin.reduce((a, b) => a + b, 0) / chartData.margin.length) >= 30 ? 'text-green-600' : 'text-yellow-600'}`}>
                {(chartData.margin.reduce((a, b) => a + b, 0) / chartData.margin.length).toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Best Margin</p>
              <p className="text-lg font-bold text-green-600">
                {Math.max(...chartData.margin).toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Worst Margin</p>
              <p className="text-lg font-bold text-red-600">
                {Math.min(...chartData.margin).toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Margin Trend</p>
              <p className={`text-lg font-bold ${chartData.margin[chartData.margin.length - 1] > chartData.margin[0] ? 'text-green-600' : 'text-red-600'}`}>
                {chartData.margin[chartData.margin.length - 1] > chartData.margin[0] ? '↑ Improving' : '↓ Declining'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Multi-Chart Comparison View */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Overview Comparison</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue vs Costs */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Revenue vs Costs</h5>
            <div className="h-40 flex items-end justify-around gap-1">
              {chartData.labels.slice(0, 12).map((label, idx) => {
                const revenue = chartData.revenue[idx];
                const cost = chartData.costs[idx];
                const maxVal = Math.max(...chartData.revenue, ...chartData.costs);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                    <div className="flex gap-0.5 h-full items-end">
                      <div
                        className="w-2 bg-green-500 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${getHeightPercent(revenue, maxVal)}%`, minHeight: '2px' }}
                        title={`Revenue: ${formatCurrency(revenue)}`}
                      />
                      <div
                        className="w-2 bg-red-400 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${getHeightPercent(cost, maxVal)}%`, minHeight: '2px' }}
                        title={`Cost: ${formatCurrency(cost)}`}
                      />
                    </div>
                    {idx % 2 === 0 && (
                      <span className="text-[10px] text-gray-400 mt-1">{label}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-gray-500">Revenue</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-400 rounded" />
                <span className="text-gray-500">Costs</span>
              </div>
            </div>
          </div>

          {/* User Growth */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3">User Growth</h5>
            <div className="h-40 flex items-end justify-around gap-1">
              {chartData.labels.slice(0, 12).map((label, idx) => {
                const users = chartData.users[idx];
                const maxUsers = Math.max(...chartData.users);
                const prevUsers = idx > 0 ? chartData.users[idx - 1] : users;
                const growth = prevUsers > 0 ? ((users - prevUsers) / prevUsers) * 100 : 0;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className="w-4 bg-purple-500 rounded-t transition-all hover:opacity-80"
                      style={{ height: `${getHeightPercent(users, maxUsers)}%`, minHeight: '2px' }}
                      title={`${formatNumber(users)} users`}
                    />
                    {idx % 2 === 0 && (
                      <span className="text-[10px] text-gray-400 mt-1">{label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Trend Indicators */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Trend Analysis</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Revenue Trend */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Revenue Trend</span>
              {chartData.revenue[chartData.revenue.length - 1] > chartData.revenue[0] ? (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
            </div>
            <p className={`text-xl font-bold ${chartData.revenue[chartData.revenue.length - 1] > chartData.revenue[0] ? 'text-green-600' : 'text-red-600'}`}>
              {chartData.revenue[0] > 0
                ? (((chartData.revenue[chartData.revenue.length - 1] - chartData.revenue[0]) / chartData.revenue[0]) * 100).toFixed(1)
                : 0}%
            </p>
            <p className="text-xs text-gray-400 mt-1">over period</p>
          </div>

          {/* Cost Efficiency */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Cost Efficiency</span>
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-xl font-bold text-blue-600">
              {((chartData.revenue.reduce((a, b) => a + b, 0) - chartData.costs.reduce((a, b) => a + b, 0)) / chartData.revenue.reduce((a, b) => a + b, 0) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 mt-1">gross margin</p>
          </div>

          {/* Growth Rate */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">User Growth</span>
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-xl font-bold text-purple-600">
              {formatNumber(chartData.users[chartData.users.length - 1] - chartData.users[0])}
            </p>
            <p className="text-xs text-gray-400 mt-1">new users</p>
          </div>

          {/* Profitability */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Profitability</span>
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className={`text-xl font-bold ${chartData.profit.reduce((a, b) => a + b, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(chartData.profit.reduce((a, b) => a + b, 0))}
            </p>
            <p className="text-xs text-gray-400 mt-1">total profit</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForecastCharts;