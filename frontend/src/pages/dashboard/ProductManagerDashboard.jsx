/**
 * Product Manager Dashboard
 *
 * Product and features overview for PRODUCT_MANAGER role.
 * Red & White theme styling.
 *
 * Features:
 * - Feature Management: Create, edit, delete features
 * - Model Mapping: Assign existing AI models to features
 * - Token Estimates: Configure token consumption per feature
 * - Feature Cost View: View estimated AI costs
 * - Usage Analytics: Feature usage and token consumption metrics
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import featureApi from '../../services/api/feature.api.js';
import analyticsApi from '../../services/api/analytics.api.js';
import Loader from '../../components/common/Loader.jsx';

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
    totalFeatures: 0,
    activeFeatures: 0,
    mappedFeatures: 0,
    unmappedFeatures: 0,
    monthlyTokenConsumption: 0,
    avgTokensPerRequest: 0
  });
  const [features, setFeatures] = useState([]);
  const [featureUsage, setFeatureUsage] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [featuresRes, analyticsRes] = await Promise.allSettled([
        featureApi.getAll({ limit: 10 }),
        analyticsApi.getDashboard()
      ]);

      // Process features
      if (featuresRes.status === 'fulfilled') {
        const featuresData = featuresRes.value?.data || featuresRes.value || {};
        const featuresList = featuresData.features || featuresData.data || [];
        setFeatures(Array.isArray(featuresList) ? featuresList : []);

        const totalFeatures = featuresData.total || featuresData.count || (Array.isArray(featuresList) ? featuresList.length : 0);
        const activeCount = Array.isArray(featuresList)
          ? featuresList.filter(f => f.status === 'active').length
          : 0;
        const mappedCount = Array.isArray(featuresList)
          ? featuresList.filter(f => f.model && f.model._id).length
          : 0;

        let avgInputTokens = 0;
        let avgOutputTokens = 0;
        if (Array.isArray(featuresList) && featuresList.length > 0) {
          const featuresWithTokens = featuresList.filter(f => f.tokenEstimates);
          if (featuresWithTokens.length > 0) {
            avgInputTokens = featuresWithTokens.reduce((sum, f) => sum + (f.tokenEstimates?.inputTokensPerRequest || 0), 0) / featuresWithTokens.length;
            avgOutputTokens = featuresWithTokens.reduce((sum, f) => sum + (f.tokenEstimates?.outputTokensPerRequest || 0), 0) / featuresWithTokens.length;
          }
        }

        setStats(prev => ({
          ...prev,
          totalFeatures,
          activeFeatures: activeCount,
          mappedFeatures: mappedCount,
          unmappedFeatures: totalFeatures - mappedCount,
          avgTokensPerRequest: Math.round(avgInputTokens + avgOutputTokens)
        }));

        if (Array.isArray(featuresList)) {
          const usageData = featuresList.slice(0, 6).map(f => ({
            id: f._id,
            name: f.name,
            status: f.status,
            model: f.model?.name || 'Not Mapped',
            inputTokens: f.tokenEstimates?.inputTokensPerRequest || 0,
            outputTokens: f.tokenEstimates?.outputTokensPerRequest || 0,
            estimatedCost: f.estimatedCostPerRequest || 0,
            category: f.category || 'other'
          }));
          setFeatureUsage(usageData);
        }
      }

      // Process analytics for token consumption
      if (analyticsRes.status === 'fulfilled') {
        const analyticsData = analyticsRes.value?.data || analyticsRes.value || {};
        const summary = analyticsData?.summary || {};
        setStats(prev => ({
          ...prev,
          monthlyTokenConsumption: extractNumber(summary.totalTokens || summary.tokenUsage)
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
    if (!numValue && numValue !== 0) return '$0.0000';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(numValue);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader text="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={fetchDashboardData} className="ml-4 text-red-800 hover:text-red-900 underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Manage features and token estimates</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <button
            onClick={() => navigate('/usage-analytics')}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Usage Analytics
          </button>
          <button
            onClick={() => navigate('/features/new')}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Feature
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Link to="/features?status=active" className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-5 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Active Features</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stats.activeFeatures}</p>
            </div>
          </div>
        </Link>

        <Link to="/model-mapping" className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-5 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Mapped Features</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stats.mappedFeatures}</p>
            </div>
          </div>
        </Link>

        <Link to="/feature-cost" className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-5 hover:shadow-md transition-shadow h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Feature Cost Overview</p>
              <p className="text-base sm:text-lg font-bold text-gray-900 truncate">View Costs →</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Features and Cost Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Features */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Features</h2>
            <Link to="/features" className="text-xs sm:text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium whitespace-nowrap">
              View All
            </Link>
          </div>
          {features.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {features.slice(0, 5).map((feature) => (
                <Link
                  key={feature._id}
                  to={`/features/${feature._id}`}
                  className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-red-50/50 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{feature.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="truncate">{feature.model?.name || feature.modelDisplayName || 'Not Mapped'}</span>
                        {feature.project && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-blue-600 truncate">{feature.project.name || 'Project'}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-medium text-gray-900 text-xs sm:text-sm whitespace-nowrap">
                      {formatNumber(feature.tokenEstimates?.inputTokensPerRequest || 0) + '/' + formatNumber(feature.tokenEstimates?.outputTokensPerRequest || 0)}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${feature.status === 'active' ? 'bg-green-100 text-green-700' : feature.status === 'inactive' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {feature.status || 'active'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <p className="text-sm">No features yet.</p>
              <Link to="/features/new" className="text-[#DC2626] hover:underline text-sm">Create one</Link>
            </div>
          )}
        </div>

        {/* Estimated Feature Cost */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Estimated Feature Cost</h2>
            <Link to="/feature-cost" className="text-xs sm:text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium whitespace-nowrap">
              View All
            </Link>
          </div>
          {featureUsage.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {featureUsage.slice(0, 5).map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{feature.name}</p>
                    <p className="text-xs text-gray-500">
                      In: {formatNumber(feature.inputTokens)} / Out: {formatNumber(feature.outputTokens)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-medium text-gray-900 text-xs sm:text-sm">{formatCurrency(feature.estimatedCost)}</p>
                    <p className="text-xs text-gray-500">per request</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <p className="text-sm">No feature cost data.</p>
              <Link to="/features/new" className="text-[#DC2626] hover:underline text-sm">Add features</Link>
            </div>
          )}
        </div>
      </div>

      {/* Feature Usage Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Feature Usage Overview</h2>
          <Link to="/usage-analytics" className="text-xs sm:text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium whitespace-nowrap">
            View Analytics
          </Link>
        </div>
        {features.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Feature</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap hidden md:table-cell">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap hidden sm:table-cell">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap hidden lg:table-cell">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Tokens</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {features.slice(0, 6).map((feature) => (
                  <tr key={feature._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link to={`/features/${feature._id}`} className="font-medium text-gray-900 text-sm hover:text-[#DC2626] truncate block max-w-[150px] sm:max-w-none">
                        {feature.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                      {feature.project ? (
                        <Link
                          to={`/projects/${feature.project._id || feature.project}`}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          <span className="truncate max-w-[120px]">{feature.project.name || 'Project'}</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">No Project</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-sm hidden sm:table-cell">
                      {feature.model?.name || feature.modelDisplayName || <span className="text-yellow-600">Not Mapped</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                        {feature.category || 'other'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-gray-600 text-sm">
                      <span className="hidden sm:inline">In: {formatNumber(feature.tokenEstimates?.inputTokensPerRequest || 0)} / </span>
                      Out: {formatNumber(feature.tokenEstimates?.outputTokensPerRequest || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${feature.status === 'active' ? 'bg-green-100 text-green-700' : feature.status === 'inactive' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {feature.status || 'active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8 text-gray-500">
            <p className="text-sm">No features to display.</p>
            <Link to="/features/new" className="text-[#DC2626] hover:underline text-sm">Create your first feature</Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/features/new')}
            className="p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left h-full"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-2 sm:mb-3">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="font-medium text-gray-900 text-sm sm:text-base">Add Feature</p>
            <p className="text-xs text-gray-500 mt-1 hidden sm:block">Create new feature</p>
          </button>

          <button
            onClick={() => navigate('/model-mapping')}
            className="p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left h-full"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-2 sm:mb-3">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <p className="font-medium text-gray-900 text-sm sm:text-base">Model Mapping</p>
            <p className="text-xs text-gray-500 mt-1 hidden sm:block">Assign models to features</p>
          </button>

          <button
            onClick={() => navigate('/token-estimates')}
            className="p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left h-full"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-2 sm:mb-3">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900 text-sm sm:text-base">Token Estimates</p>
            <p className="text-xs text-gray-500 mt-1 hidden sm:block">Configure token usage</p>
          </button>

          <button
            onClick={() => navigate('/feature-cost')}
            className="p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left h-full"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-2 sm:mb-3">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900 text-sm sm:text-base">Feature Cost</p>
            <p className="text-xs text-gray-500 mt-1 hidden sm:block">View cost estimates</p>
          </button>
        </div>

        {/* Project Flow Info */}
        <div className="mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">Feature Hierarchy</p>
              <p className="text-xs text-blue-600 mt-1">
                Features must be linked to a Project/Product. When creating a feature, select the project it belongs to.
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-blue-700">
                <span className="px-2 py-0.5 bg-blue-100 rounded font-medium">Organization</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="px-2 py-0.5 bg-blue-100 rounded font-medium">Projects</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="px-2 py-0.5 bg-blue-100 rounded font-medium">Features</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductManagerDashboard;
