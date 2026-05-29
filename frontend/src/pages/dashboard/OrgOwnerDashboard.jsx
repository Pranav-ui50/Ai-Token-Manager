/**
 * Organization Owner Dashboard
 *
 * Organization overview for ORG_OWNER role with real API data.
 * Responsive Red & White theme styling.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import organizationApi from '../../services/api/organization.api.js';
import analyticsApi from '../../services/api/analytics.api.js';
import projectApi from '../../services/api/project.api.js';

function OrgOwnerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [stats, setStats] = useState({
    members: 0,
    projects: 0,
    features: 0,
    monthlySpend: 0,
    tokenUsage: 0,
    activeFeatures: 0
  });
  const [dashboardData, setDashboardData] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Helper to extract numeric value from potentially nested object
  const extractNumber = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'object') {
      // Handle objects like { total: 10, active: 8, inactive: 2 }
      return value.total || value.count || value.active || 0;
    }
    return 0;
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get organization ID from user
      const orgId = user?.organization?._id || user?.organization;

      if (!orgId) {
        setError('No organization found. Please contact your administrator.');
        setIsLoading(false);
        return;
      }

      // Fetch all data in parallel
      const [orgResponse, analyticsResponse, projectsResponse] = await Promise.allSettled([
        organizationApi.getById(orgId),
        analyticsApi.getDashboard(),
        projectApi.getForOrganization(orgId)
      ]);

      // Process organization data
      if (orgResponse.status === 'fulfilled' && orgResponse.value) {
        setOrganization(orgResponse.value);
        // Update member count from organization data
        const memberCount = orgResponse.value?.members?.length || 0;
        setStats(prev => ({
          ...prev,
          members: memberCount
        }));
      }

      // Process analytics data
      // API returns: { data: { summary, recentActivity, costTrend, generatedAt }, success: true }
      if (analyticsResponse.status === 'fulfilled') {
        const apiResponse = analyticsResponse.value;
        // The analyticsApi returns response.data which is { data: {...}, success: true }
        // So the actual analytics data is in apiResponse.data
        const analyticsData = apiResponse?.data || apiResponse || {};
        const summary = analyticsData?.summary || {};

        setStats(prev => ({
          ...prev,
          projects: extractNumber(summary.projects || summary.projectCount) || prev.projects || 0,
          features: extractNumber(summary.features || summary.featureCount) || 0,
          monthlySpend: extractNumber(summary.monthlySpend || summary.totalCost) || 0,
          tokenUsage: extractNumber(summary.tokenUsage || summary.totalTokens) || 0,
          activeFeatures: extractNumber(summary.activeFeatures) || extractNumber(summary.features) || 0
        }));
        setDashboardData(analyticsData);
      }

      // Process projects data
      if (projectsResponse.status === 'fulfilled') {
        // projectApi.getForOrganization returns response.data.data which is the projects array
        const projects = projectsResponse.value || [];
        setRecentProjects(Array.isArray(projects) ? projects.slice(0, 5) : []);
        // Update project count from actual data
        setStats(prev => ({
          ...prev,
          projects: Array.isArray(projects) ? projects.length : prev.projects || 0
        }));
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    // Handle objects that might have been passed
    const numValue = typeof amount === 'object' ? (amount?.total || amount?.amount || 0) : amount;
    if (!numValue && numValue !== 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  };

  const formatNumber = (num) => {
    // Handle objects that might have been passed
    const numValue = typeof num === 'object' ? (num?.total || num?.count || 0) : num;
    if (!numValue && numValue !== 0) return '0';
    if (numValue >= 1000000) return `${(numValue / 1000000).toFixed(1)}M`;
    if (numValue >= 1000) return `${(numValue / 1000).toFixed(1)}K`;
    return numValue.toString();
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
      {/* Organization Header */}
      <div className="bg-gradient-to-r from-[#DC2626] to-[#B91C1C] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {organization?.logo ? (
              <img src={organization.logo} alt={organization.name} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold">{organization?.name?.charAt(0) || 'O'}</span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{organization?.name || 'Organization'}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/20">
                  {organization?.subscription?.plan || 'Free'} Plan
                </span>
                <span className="text-white/70 text-sm">
                  {stats.members} members
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/organizations/${organization?._id}`)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            Manage Organization
          </button>
        </div>
      </div>

      {/* Stats Grid - Fixed responsive layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Team</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.members}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Projects</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.projects}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
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
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Monthly</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">{formatCurrency(stats.monthlySpend)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Tokens</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{formatNumber(stats.tokenUsage)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Active</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.activeFeatures}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Add Project</p>
            <p className="text-xs text-gray-500 mt-1">Create a new project</p>
          </button>

          <button
            onClick={() => navigate('/team')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Manage Team</p>
            <p className="text-xs text-gray-500 mt-1">Add or remove members</p>
          </button>

          <button
            onClick={() => navigate('/billing')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Billing</p>
            <p className="text-xs text-gray-500 mt-1">Manage subscription</p>
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
            <p className="font-medium text-gray-900">Analytics</p>
            <p className="text-xs text-gray-500 mt-1">View reports</p>
          </button>
        </div>
      </div>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
            <button
              onClick={() => navigate('/projects')}
              className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <div
                key={project._id}
                onClick={() => navigate(`/projects/${project._id}`)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-red-50/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">{project.name?.charAt(0) || 'P'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{project.name}</p>
                    <p className="text-xs text-gray-500 truncate">{project.description || 'No description'}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{formatDate(project.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default OrgOwnerDashboard;