/**
 * Product Manager Dashboard
 *
 * Product and features overview for PRODUCT_MANAGER role.
 * Red & White theme styling.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';

function ProductManagerDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    features: 0,
    models: 0,
    plans: 0,
    usageThisMonth: 0
  });
  const [features, setFeatures] = useState([]);
  const [plans, setPlans] = useState([]);
  const [modelUsage, setModelUsage] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading - replace with actual API calls
    const timer = setTimeout(() => {
      setStats({
        features: 23,
        models: 42,
        plans: 5,
        usageThisMonth: 8500000
      });
      setFeatures([
        { _id: '1', name: 'Chat Completion', model: 'GPT-4', tokens: 2500000, status: 'active' },
        { _id: '2', name: 'Text Summarization', model: 'Claude 3 Sonnet', tokens: 1800000, status: 'active' },
        { _id: '3', name: 'Image Generation', model: 'DALL-E 3', tokens: 500000, status: 'active' },
        { _id: '4', name: 'Embedding Search', model: 'text-embedding-3', tokens: 1200000, status: 'active' }
      ]);
      setPlans([
        { _id: '1', name: 'Free Trial', users: 150, revenue: 0, features: 5 },
        { _id: '2', name: 'Starter', users: 89, revenue: 890, features: 12 },
        { _id: '3', name: 'Professional', users: 45, revenue: 2250, features: 20 },
        { _id: '4', name: 'Enterprise', users: 12, revenue: 4800, features: 23 }
      ]);
      setModelUsage([
        { _id: '1', model: 'GPT-4', requests: 125000, avgLatency: 1.2, cost: 3200 },
        { _id: '2', model: 'Claude 3 Opus', requests: 85000, avgLatency: 1.5, cost: 2800 },
        { _id: '3', model: 'GPT-3.5 Turbo', requests: 450000, avgLatency: 0.3, cost: 1350 },
        { _id: '4', model: 'Claude 3 Sonnet', requests: 120000, avgLatency: 0.8, cost: 1200 }
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
          <h1 className="text-2xl font-bold text-gray-900">Product Dashboard</h1>
          <p className="text-sm text-gray-500">Features, models, and usage analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Feature
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Features</p>
              <p className="text-2xl font-bold text-gray-900">{stats.features}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs">
            <span className="text-green-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              +3 this week
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Models</p>
              <p className="text-2xl font-bold text-gray-900">{stats.models}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs">
            <span className="text-gray-500">8 providers integrated</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Plans</p>
              <p className="text-2xl font-bold text-gray-900">{stats.plans}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs">
            <span className="text-green-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              +1 this month
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tokens This Month</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.usageThisMonth)}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs">
            <span className="text-yellow-600">85% of allocation</span>
          </div>
        </div>
      </div>

      {/* Features and Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Features */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Features</h2>
            <button className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {features.map((feature) => (
              <div key={feature._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-red-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{feature.name}</p>
                    <p className="text-xs text-gray-500">{feature.model}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatNumber(feature.tokens)} tokens</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                    {feature.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Subscription Plans</h2>
            <button className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
              Manage Plans
            </button>
          </div>
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-red-50/50 transition-colors">
                <div>
                  <p className="font-medium text-gray-900">{plan.name}</p>
                  <p className="text-xs text-gray-500">{plan.features} features</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{plan.users} users</p>
                  <p className="text-xs text-gray-500">{formatCurrency(plan.revenue)}/mo</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Model Usage */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Model Performance</h2>
          <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none ">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Model</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Requests</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Avg Latency</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {modelUsage.map((model) => (
                <tr key={model._id} className="hover:bg-red-50/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-medium text-gray-900">{model.model}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatNumber(model.requests)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{model.avgLatency}s</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{formatCurrency(model.cost)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#DC2626] rounded-full"
                          style={{ width: `${Math.min((model.cost / 3500) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round((model.cost / 3500) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/features')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Add Feature</p>
            <p className="text-xs text-gray-500 mt-1">Configure new feature</p>
          </button>

          <button
            onClick={() => navigate('/plans')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Create Plan</p>
            <p className="text-xs text-gray-500 mt-1">Build subscription tier</p>
          </button>

          <button
            onClick={() => navigate('/analytics')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">View Analytics</p>
            <p className="text-xs text-gray-500 mt-1">Usage statistics</p>
          </button>

          <button
            onClick={() => navigate('/models')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Model Catalog</p>
            <p className="text-xs text-gray-500 mt-1">Browse AI models</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductManagerDashboard;