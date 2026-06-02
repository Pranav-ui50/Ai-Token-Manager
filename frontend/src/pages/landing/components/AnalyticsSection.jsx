/**
 * Analytics Section
 *
 * Interactive charts preview showing platform capabilities.
 */

import { useState } from 'react';

const AnalyticsSection = () => {
  const [activeChart, setActiveChart] = useState('usage');

  // Sample data for charts
  const usageData = [
    { month: 'Jan', tokens: 2.1, cost: 120 },
    { month: 'Feb', tokens: 2.8, cost: 156 },
    { month: 'Mar', tokens: 3.2, cost: 189 },
    { month: 'Apr', tokens: 3.5, cost: 198 },
    { month: 'May', tokens: 4.1, cost: 234 },
    { month: 'Jun', tokens: 4.8, cost: 267 }
  ];

  const providerData = [
    { name: 'OpenAI', percentage: 45, color: '#10B981' },
    { name: 'Anthropic', percentage: 25, color: '#6366F1' },
    { name: 'Google', percentage: 15, color: '#F59E0B' },
    { name: 'Others', percentage: 15, color: '#EC4899' }
  ];

  const costBreakdown = [
    { category: 'Input Tokens', percentage: 40, amount: '$4,800' },
    { category: 'Output Tokens', percentage: 35, amount: '$4,200' },
    { category: 'API Calls', percentage: 15, amount: '$1,800' },
    { category: 'Overage', percentage: 10, amount: '$1,200' }
  ];

  return (
    <section id="analytics" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Powerful Analytics at Your Fingertips
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Visualize your AI usage, costs, and trends with interactive charts and detailed insights.
          </p>
        </div>

        {/* Chart Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { id: 'usage', label: 'Token Usage' },
            { id: 'cost', label: 'Cost Trends' },
            { id: 'providers', label: 'Provider Split' },
            { id: 'breakdown', label: 'Cost Breakdown' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeChart === tab.id
                  ? 'bg-[#DC2626] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Chart Container */}
        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
          {/* Token Usage Chart */}
          {activeChart === 'usage' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Token Usage (Millions)</h3>
              <div className="h-64 flex items-end justify-around gap-4">
                {usageData.map((data, index) => (
                  <div key={index} className="flex flex-col items-center gap-2 flex-1">
                    <div className="w-full bg-gradient-to-t from-[#DC2626] to-[#F87171] rounded-t-lg transition-all hover:from-[#B91C1C] hover:to-[#DC2626]"
                      style={{ height: `${(data.tokens / 5) * 100}%` }}
                    />
                    <span className="text-sm font-medium text-gray-600">{data.month}</span>
                    <span className="text-xs text-gray-400">{data.tokens}M</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost Trends Chart */}
          {activeChart === 'cost' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Cost Trends</h3>
              <div className="h-64 relative">
                <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-400">
                  <span>$300</span>
                  <span>$200</span>
                  <span>$100</span>
                  <span>$0</span>
                </div>
                <div className="ml-12 h-56 flex items-end justify-around gap-4 border-b border-gray-200">
                  {usageData.map((data, index) => (
                    <div key={index} className="flex flex-col items-center gap-2 flex-1 relative">
                      <div
                        className="w-full max-w-[60px] bg-gradient-to-t from-[#6366F1] to-[#818CF8] rounded-t-lg"
                        style={{ height: `${(data.cost / 300) * 100}%` }}
                      />
                      <span className="text-xs text-gray-400 mt-2">${data.cost}</span>
                      <span className="text-xs font-medium text-gray-600 absolute -bottom-6">{data.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Provider Split */}
          {activeChart === 'providers' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">API Usage by Provider</h3>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Donut Chart */}
                <div className="relative h-64">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {providerData.map((provider, index) => {
                          const offset = providerData.slice(0, index).reduce((sum, p) => sum + p.percentage, 0);
                          return (
                            <circle
                              key={index}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke={provider.color}
                              strokeWidth="20"
                              strokeDasharray={`${provider.percentage * 2.51327} ${100 - provider.percentage * 2.51327}`}
                              strokeDashoffset={`-${offset * 2.51327}`}
                              className="transition-all"
                            />
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-gray-900">4.8M</div>
                          <div className="text-sm text-gray-500">Total Tokens</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Legend */}
                <div className="flex flex-col justify-center gap-4">
                  {providerData.map((provider, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: provider.color }}
                      />
                      <span className="text-gray-600">{provider.name}</span>
                      <span className="ml-auto font-semibold text-gray-900">{provider.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cost Breakdown */}
          {activeChart === 'breakdown' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Cost Breakdown</h3>
              <div className="space-y-4">
                {costBreakdown.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-600">{item.category}</span>
                      <span className="font-semibold text-gray-900">{item.amount}</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#DC2626] to-[#F87171] rounded-full transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Total Monthly Cost</span>
                  <span className="text-2xl font-bold text-[#DC2626]">$12,000</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Based on current usage patterns
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Features List */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Real-Time Dashboards</h4>
            <p className="text-gray-600">
              Monitor your AI usage in real-time with interactive dashboards that update instantly.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Cost Forecasting</h4>
            <p className="text-gray-600">
              Predict future costs with AI-powered forecasting based on your usage patterns.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Custom Reports</h4>
            <p className="text-gray-600">
              Generate detailed reports for stakeholders with custom date ranges and metrics.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnalyticsSection;