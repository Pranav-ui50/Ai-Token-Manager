/**
 * Finance Admin Dashboard
 *
 * Financial overview for FINANCE_ADMIN role.
 * Red & White theme styling.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';

function FinanceAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSpend: 0,
    projectedCost: 0,
    savings: 0,
    activeSubscriptions: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [topModels, setTopModels] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading - replace with actual API calls
    const timer = setTimeout(() => {
      setStats({
        totalSpend: 12500.00,
        projectedCost: 15200.00,
        savings: 2700.00,
        activeSubscriptions: 5
      });
      setMonthlyData([
        { month: 'Jan', actual: 8500, projected: 9200 },
        { month: 'Feb', actual: 9200, projected: 10000 },
        { month: 'Mar', actual: 10100, projected: 11000 },
        { month: 'Apr', actual: 11000, projected: 12000 },
        { month: 'May', actual: 12500, projected: 15200 }
      ]);
      setTopModels([
        { _id: '1', name: 'GPT-4', provider: 'OpenAI', cost: 5200, tokens: 4500000 },
        { _id: '2', name: 'Claude 3 Opus', provider: 'Anthropic', cost: 3800, tokens: 2800000 },
        { _id: '3', name: 'GPT-3.5 Turbo', provider: 'OpenAI', cost: 2100, tokens: 15000000 },
        { _id: '4', name: 'Claude 3 Sonnet', provider: 'Anthropic', cost: 1400, tokens: 3200000 }
      ]);
      setRecentInvoices([
        { _id: '1', date: '2024-01-15', amount: 2450.00, status: 'paid' },
        { _id: '2', date: '2024-01-01', amount: 2200.00, status: 'paid' },
        { _id: '3', date: '2023-12-15', amount: 1980.00, status: 'paid' }
      ]);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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
          <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-sm text-gray-500">Cost analysis and pricing management</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-5 8a4 4 0 01-4-4V5a2 2 0 012-2h14a2 2 0 012 2v8a4 4 0 01-4 4H7z" />
            </svg>
            New Simulation
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Spend (MTD)</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSpend)}</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                12% from last month
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Projected Cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.projectedCost)}</p>
              <p className="text-xs text-yellow-600 mt-1">End of month estimate</p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Savings</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.savings)}</p>
              <p className="text-xs text-gray-500 mt-1">vs. direct pricing</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Active Plans</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeSubscriptions}</p>
              <p className="text-xs text-blue-600 mt-1">3 billing cycles</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none ">
              <option>Last 5 months</option>
              <option>Last 12 months</option>
            </select>
          </div>
          <div className="space-y-3">
            {monthlyData.map((data, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{data.month}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-900 font-medium">{formatCurrency(data.actual)}</span>
                    <span className="text-gray-400 text-xs">Projected: {formatCurrency(data.projected)}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <div
                    className="h-2 bg-[#DC2626] rounded-full"
                    style={{ width: `${(data.actual / 15000) * 100}%` }}
                  />
                  <div
                    className="h-2 bg-gray-200 rounded-full"
                    style={{ width: `${((data.projected - data.actual) / 15000) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Models by Cost */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Models by Cost</h2>
            <button
              onClick={() => navigate('/models')}
              className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {topModels.map((model, index) => (
              <div key={model._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-red-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{model.name}</p>
                    <p className="text-xs text-gray-500">{model.provider}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(model.cost)}</p>
                  <p className="text-xs text-gray-500">{formatNumber(model.tokens)} tokens</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
          <button className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
            View All Invoices
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentInvoices.map((invoice) => (
                <tr key={invoice._id} className="hover:bg-red-50/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-medium text-gray-900">INV-{invoice._id.padStart(4, '0')}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{invoice.date}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{formatCurrency(invoice.amount)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => navigate('/reports')}
                      className="text-[#DC2626] hover:text-[#B91C1C] text-sm font-medium"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Optimization Tips */}
      <div className="bg-gradient-to-r from-[#DC2626] to-[#B91C1C] rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 2.828l.707.707M10 17a7 7 0 1114 0H10z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Cost Optimization Tip</h3>
            <p className="text-white/90 text-sm mb-3">
              You could save approximately <strong>$450/month</strong> by switching 30% of your GPT-4 usage to Claude 3 Sonnet for similar tasks.
            </p>
            <button
              onClick={() => navigate('/reports')}
              className="px-4 py-2 bg-white text-[#DC2626] font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
              View Optimization Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinanceAdminDashboard;