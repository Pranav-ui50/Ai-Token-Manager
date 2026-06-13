/**
 * Super Admin Dashboard Page
 *
 * Main dashboard for super admins with platform statistics and overview.
 * Shows: Total Organizations, Active Subscriptions, Total Users, AI Providers, System Usage
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../services/api/admin.api.js';

function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentOrganizations, setRecentOrganizations] = useState([]);
  const [organizationsByPlan, setOrganizationsByPlan] = useState({});
  const [organizationsByStatus, setOrganizationsByStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await adminApi.getDashboardStats();

      setStats(response.counts);
      setRecentOrganizations(response.recentOrganizations || []);
      setOrganizationsByPlan(response.organizationsByPlan || {});
      setOrganizationsByStatus(response.organizationsByStatus || {});
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '-';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626] mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
        <div className="flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your SaaS platform</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Primary Stats Grid - Equal sized cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Organizations */}
        <Link
          to="/admin/organizations"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all hover:border-[#DC2626]/20"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Organizations</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(stats?.organizations)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                  {stats?.activeOrganizations || 0} active
                </span>
              </div>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Active Subscriptions */}
        <Link
          to="/admin/plans"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all hover:border-[#DC2626]/20"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">Active Subscriptions</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(stats?.activeOrganizations)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  {organizationsByPlan.professional || 0} pro
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                  {organizationsByPlan.starter || 0} starter
                </span>
              </div>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Total Users */}
        <Link
          to="/admin/users"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all hover:border-[#DC2626]/20"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(stats?.users)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">Across all organizations</span>
              </div>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </Link>

        {/* AI Providers */}
        <Link
          to="/admin/providers"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all hover:border-[#DC2626]/20"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">AI Providers</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(stats?.providers)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                  {formatNumber(stats?.models)} models
                </span>
              </div>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organizations by Plan */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Organizations by Plan</h3>
            <Link to="/admin/plans" className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
              Manage Plans
            </Link>
          </div>
          <div className="space-y-4">
            {[
              { plan: 'enterprise', count: organizationsByPlan.enterprise || 0, color: 'bg-purple-500', label: 'Enterprise' },
              { plan: 'professional', count: organizationsByPlan.professional || 0, color: 'bg-blue-500', label: 'Professional' },
              { plan: 'starter', count: organizationsByPlan.starter || 0, color: 'bg-green-500', label: 'Starter' },
              { plan: 'free', count: organizationsByPlan.free || 0, color: 'bg-gray-400', label: 'Free' }
            ].map(({ plan, count, color, label }) => {
              const total = stats?.organizations || 1;
              const percentage = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={plan} className="flex items-center gap-4">
                  <span className="w-24 text-sm text-gray-600">{label}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-sm font-semibold text-gray-900 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Organizations by Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Organizations by Status</h3>
            <Link to="/admin/organizations" className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {[
              { status: 'active', count: organizationsByStatus.active || 0, color: 'bg-green-500', label: 'Active' },
              { status: 'trial', count: organizationsByStatus.trial || 0, color: 'bg-yellow-500', label: 'Trial' },
              { status: 'suspended', count: organizationsByStatus.suspended || 0, color: 'bg-red-500', label: 'Suspended' },
              { status: 'cancelled', count: organizationsByStatus.cancelled || 0, color: 'bg-gray-400', label: 'Cancelled' }
            ].map(({ status, count, color, label }) => {
              const total = stats?.organizations || 1;
              const percentage = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-4">
                  <span className="w-24 text-sm text-gray-600">{label}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-sm font-semibold text-gray-900 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Organizations & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Organizations */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Organizations</h3>
            <Link to="/admin/organizations" className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
              View All
            </Link>
          </div>
          {recentOrganizations.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-gray-500">No organizations yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentOrganizations.slice(0, 5).map((org) => (
                <Link
                  key={org._id}
                  to={`/admin/organizations/${org._id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-white">{org.name?.charAt(0) || 'O'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{org.name}</p>
                      <p className="text-xs text-gray-500">{org.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      org.subscription?.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                      org.subscription?.plan === 'professional' ? 'bg-blue-100 text-blue-700' :
                      org.subscription?.plan === 'starter' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {org.subscription?.plan || 'free'}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(org.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/admin/organizations"
              className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Create Organization</p>
                <p className="text-xs text-blue-700">Add new customer</p>
              </div>
            </Link>

            <Link
              to="/admin/providers"
              className="flex items-center gap-3 px-4 py-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-900">Manage Providers</p>
                <p className="text-xs text-green-700">Add AI providers</p>
              </div>
            </Link>

            <Link
              to="/admin/plans"
              className="flex items-center gap-3 px-4 py-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-purple-900">Manage Plans</p>
                <p className="text-xs text-purple-700">Configure pricing</p>
              </div>
            </Link>

            <Link
              to="/audit-logs"
              className="flex items-center gap-3 px-4 py-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 00-2-2h-2a2 2 0 00-2 2m3 10h.01M9 17h.01M15 13h.01M15 17h.01" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">View Audit Logs</p>
                <p className="text-xs text-orange-700">System activity</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* System Usage Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">System Usage Overview</h3>
          <Link to="/admin/settings" className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
            View Details
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Total Projects</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stats?.projects)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Total Features</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stats?.features)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">API Calls (30d)</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stats?.apiCalls || 0)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Active Users (24h)</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stats?.activeUsers || 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;