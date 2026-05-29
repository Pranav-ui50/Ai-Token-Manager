/**
 * Product Manager Dashboard
 *
 * Product and features overview for PRODUCT_MANAGER role with real API data.
 * Red & White theme styling.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import featureApi from '../../services/api/feature.api.js';
import planApi from '../../services/api/plan.api.js';
import modelApi from '../../services/api/model.api.js';
import analyticsApi from '../../services/api/analytics.api.js';

// Helper to extract numeric value from potentially nested object
const extractNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    return value.total || value.count || value.active || 0;
  }
  return 0;
};

function ProductManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [featuresRes, plansRes, modelsRes, analyticsRes] = await Promise.allSettled([
        featureApi.getAll({ limit: 5 }),
        planApi.getAll({ limit: 5 }),
        modelApi.getAll({ limit: 10 }),
        analyticsApi.getDashboard()
      ]);

      // Process features
      if (featuresRes.status === 'fulfilled') {
        const featuresData = featuresRes.value?.data || featuresRes.value || {};
        const featuresList = featuresData.features || featuresData.data || [];
        setFeatures(Array.isArray(featuresList) ? featuresList.slice(0, 5) : []);
        setStats(prev => ({
          ...prev,
          features: featuresData.total || featuresData.count || (Array.isArray(featuresList) ? featuresList.length : 0)
        }));
      }

      // Process plans
      if (plansRes.status === 'fulfilled') {
        const plansData = plansRes.value?.data || plansRes.value || {};
        const plansList = plansData.plans || plansData.data || [];
        setPlans(Array.isArray(plansList) ? plansList.slice(0, 5) : []);
        setStats(prev => ({
          ...prev,
          plans: plansData.total || plansData.count || (Array.isArray(plansList) ? plansList.length : 0)
        }));
      }

      // Process models
      if (modelsRes.status === 'fulfilled') {
        const modelsData = modelsRes.value?.data || modelsRes.value || {};
        const modelsList = modelsData.models || modelsData.data || [];
        setModelUsage(Array.isArray(modelsList) ? modelsList.slice(0, 5) : []);
        setStats(prev => ({
          ...prev,
          models: modelsData.total || modelsData.count || (Array.isArray(modelsList) ? modelsList.length : 0)
        }));
      }

      // Process analytics
      if (analyticsRes.status === 'fulfilled') {
        const analyticsData = analyticsRes.value?.data || analyticsRes.value || {};
        const summary = analyticsData?.summary || {};
        setStats(prev => ({
          ...prev,
          usageThisMonth: extractNumber(summary.totalTokens || summary.tokenUsage)
        }));
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num) => {
    const numValue = typeof num === 'object' ? extractNumber(num) : num;
    if (!numValue && numValue !== 0) return '0';
    if (numValue >= 1000000) return `${(numValue / 1000000).toFixed(1)}M`;
    if (numValue >= 1000) return `${(numValue / 1000).toFixed(1)}K`;
    return numValue.toString();
  };

  const formatCurrency = (amount) => {
    const numValue = typeof amount === 'object' ? extractNumber(amount) : amount;
    if (!numValue && numValue !== 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numValue);
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

  if (error) {
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Product Dashboard</h1>
          <p className="text-sm text-gray-500">Features, models, and usage analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/analytics')}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </button>
          <button
            onClick={() => navigate('/features/new')}
            className="px-4 py-2 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Feature
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Link to="/features" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Features</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.features}</p>
            </div>
          </div>
        </Link>

        <Link to="/models" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Models</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.models}</p>
            </div>
          </div>
        </Link>

        <Link to="/plans" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Plans</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.plans}</p>
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Tokens This Month</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{formatNumber(stats.usageThisMonth)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features and Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Features */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Features</h2>
            <Link to="/features" className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
              View All
            </Link>
          </div>
          {features.length > 0 ? (
            <div className="space-y-3">
              {features.map((feature) => (
                <Link
                  key={feature._id}
                  to={`/features/${feature._id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-red-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{feature.name}</p>
                      <p className="text-xs text-gray-500 truncate">{feature.model?.name || feature.modelName || 'No model'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 text-sm">{formatNumber(feature.estimatedTokens || feature.tokens || 0)} tokens</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${feature.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {feature.status || 'active'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No features yet. <Link to="/features/new" className="text-[#DC2626] hover:underline">Create one</Link>
            </div>
          )}
        </div>

        {/* Subscription Plans */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Subscription Plans</h2>
            <Link to="/plans" className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
              Manage Plans
            </Link>
          </div>
          {plans.length > 0 ? (
            <div className="space-y-3">
              {plans.map((plan) => (
                <Link
                  key={plan._id}
                  to={`/plans/${plan._id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-red-50/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{plan.name}</p>
                    <p className="text-xs text-gray-500">{plan.features?.length || 0} features</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{plan.users || plan.subscriberCount || 0} users</p>
                    <p className="text-xs text-gray-500">{formatCurrency(plan.price || 0)}/mo</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No plans yet. <Link to="/plans" className="text-[#DC2626] hover:underline">Create one</Link>
            </div>
          )}
        </div>
      </div>

      {/* Model Usage */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Model Performance</h2>
          <Link to="/models" className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
            View All
          </Link>
        </div>
        {modelUsage.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {modelUsage.map((model) => (
                  <tr key={model._id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-gray-900">{model.name || model.displayName}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {model.provider?.name || model.providerName || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {model.type || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${model.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {model.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No models configured yet. <Link to="/models" className="text-[#DC2626] hover:underline">Configure models</Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/features/new')}
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