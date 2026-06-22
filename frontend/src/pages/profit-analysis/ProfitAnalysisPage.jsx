/**
 * Profit Analysis Page
 *
 * Displays profitability analysis and margins for product managers.
 */

import { useState, useEffect } from 'react';
import usePermissions from '../../hooks/usePermissions.js';
import { showToast } from '../../utils/toasts.js';
import Loader from '../../components/common/Loader.jsx';

const ProfitAnalysisPage = () => {
  const { canViewAnalytics } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [profitData, setProfitData] = useState({
    summary: {
      totalRevenue: 0,
      totalCost: 0,
      grossProfit: 0,
      profitMargin: 0,
      revenueChange: 0,
      costChange: 0,
      profitChange: 0
    },
    byFeature: [],
    byModel: [],
    byPlan: [],
    trends: []
  });

  useEffect(() => {
    fetchProfitData();
  }, [timeRange]);

  const fetchProfitData = async () => {
    try {
      setLoading(true);
      // TODO: Implement API call when backend endpoint is ready
      // const response = await analyticsApi.getProfitAnalysis({ timeRange });
      // setProfitData(response.data);

      // Mock data for now
      setProfitData({
        summary: {
          totalRevenue: 125000,
          totalCost: 45000,
          grossProfit: 80000,
          profitMargin: 64,
          revenueChange: 12.5,
          costChange: 8.2,
          profitChange: 15.3
        },
        byFeature: [
          { name: 'Chat Completion', revenue: 45000, cost: 15000, profit: 30000, margin: 66.7 },
          { name: 'Embeddings', revenue: 25000, cost: 8000, profit: 17000, margin: 68 },
          { name: 'Image Generation', revenue: 30000, cost: 12000, profit: 18000, margin: 60 },
          { name: 'Fine-tuning', revenue: 15000, cost: 6000, profit: 9000, margin: 60 },
          { name: 'Audio Processing', revenue: 10000, cost: 4000, profit: 6000, margin: 60 }
        ],
        byModel: [
          { name: 'GPT-4', revenue: 50000, cost: 20000, profit: 30000, margin: 60 },
          { name: 'GPT-3.5', revenue: 35000, cost: 10000, profit: 25000, margin: 71.4 },
          { name: 'Claude-3', revenue: 25000, cost: 8000, profit: 17000, margin: 68 },
          { name: 'Other Models', revenue: 15000, cost: 7000, profit: 8000, margin: 53.3 }
        ],
        byPlan: [
          { name: 'Enterprise', revenue: 60000, cost: 20000, profit: 40000, margin: 66.7, customers: 15 },
          { name: 'Professional', revenue: 40000, cost: 15000, profit: 25000, margin: 62.5, customers: 45 },
          { name: 'Starter', revenue: 20000, cost: 8000, profit: 12000, margin: 60, customers: 120 },
          { name: 'Free Tier', revenue: 5000, cost: 2000, profit: 3000, margin: 60, customers: 500 }
        ],
        trends: []
      });
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to fetch profit analysis');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const getChangeIcon = (change) => {
    if (change > 0) {
      return (
        <span className="flex items-center text-green-600 text-sm">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          +{change}%
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="flex items-center text-red-600 text-sm">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
          </svg>
          {change}%
        </span>
      );
    }
    return <span className="text-gray-500 text-sm">0%</span>;
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit Analysis</h1>
          <p className="text-gray-600 mt-1">Analyze profitability and margins across features, models, and plans</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(profitData.summary.totalRevenue)}
              </p>
              {getChangeIcon(profitData.summary.revenueChange)}
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(profitData.summary.totalCost)}
              </p>
              {getChangeIcon(profitData.summary.costChange)}
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Gross Profit</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(profitData.summary.grossProfit)}
              </p>
              {getChangeIcon(profitData.summary.profitChange)}
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Profit Margin</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatPercentage(profitData.summary.profitMargin)}
              </p>
              <span className="text-sm text-gray-500">vs industry avg 40%</span>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Profit by Feature */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Profit by Feature</h2>
          <p className="text-sm text-gray-500">Revenue, cost, and margin breakdown by feature type</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {profitData.byFeature.map((feature, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{feature.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatCurrency(feature.revenue)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatCurrency(feature.cost)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">{formatCurrency(feature.profit)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      feature.margin >= 65 ? 'bg-green-100 text-green-800' :
                      feature.margin >= 55 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {formatPercentage(feature.margin)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profit by Model */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Profit by Model</h2>
          <p className="text-sm text-gray-500">Revenue, cost, and margin breakdown by AI model</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {profitData.byModel.map((model, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{model.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatCurrency(model.revenue)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatCurrency(model.cost)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">{formatCurrency(model.profit)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      model.margin >= 65 ? 'bg-green-100 text-green-800' :
                      model.margin >= 55 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {formatPercentage(model.margin)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profit by Plan */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Profit by Plan</h2>
          <p className="text-sm text-gray-500">Revenue, cost, and margin breakdown by subscription plan</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Customers</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {profitData.byPlan.map((plan, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{plan.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{plan.customers}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatCurrency(plan.revenue)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatCurrency(plan.cost)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">{formatCurrency(plan.profit)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      plan.margin >= 65 ? 'bg-green-100 text-green-800' :
                      plan.margin >= 55 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {formatPercentage(plan.margin)}
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
};

export default ProfitAnalysisPage;