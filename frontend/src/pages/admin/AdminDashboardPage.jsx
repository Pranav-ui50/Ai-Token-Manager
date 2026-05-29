/**
 * Admin Dashboard Page
 *
 * Main dashboard for super admins with system statistics and overview.
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
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DC2626]"></div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">System overview and management</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/admin/organizations" className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Organizations</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(stats?.organizations)}</p>
              <p className="text-xs text-green-600 mt-1">
                {stats?.activeOrganizations || 0} active
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </Link>

        <Link to="/admin/users" className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(stats?.users)}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </Link>

        <Link to="/admin/providers" className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">AI Providers</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(stats?.providers)}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
          </div>
        </Link>

        <Link to="/admin/models" className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">AI Models</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(stats?.models)}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Projects</h3>
            <span className="text-2xl font-bold text-gray-900">{formatNumber(stats?.projects)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Features</h3>
            <span className="text-2xl font-bold text-gray-900">{formatNumber(stats?.features)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: '45%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Active Organizations</h3>
            <span className="text-2xl font-bold text-gray-900">{formatNumber(stats?.activeOrganizations)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(stats?.activeOrganizations / stats?.organizations) * 100 || 0}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organizations by Plan */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Organizations by Plan</h3>
          <div className="space-y-3">
            {['enterprise', 'professional', 'starter', 'free'].map((plan) => {
              const count = organizationsByPlan[plan] || 0;
              const total = stats?.organizations || 1;
              const percentage = (count / total) * 100;
              const colors = {
                enterprise: 'bg-purple-500',
                professional: 'bg-blue-500',
                starter: 'bg-green-500',
                free: 'bg-gray-400'
              };
              return (
                <div key={plan} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-gray-600 capitalize">{plan}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[plan]} rounded-full`} style={{ width: `${percentage}%` }}></div>
                  </div>
                  <span className="w-10 text-sm font-medium text-gray-900 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Organizations by Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Organizations by Status</h3>
          <div className="space-y-3">
            {['active', 'trial', 'suspended', 'cancelled'].map((status) => {
              const count = organizationsByStatus[status] || 0;
              const total = stats?.organizations || 1;
              const percentage = (count / total) * 100;
              const colors = {
                active: 'bg-green-500',
                trial: 'bg-yellow-500',
                suspended: 'bg-red-500',
                cancelled: 'bg-gray-400'
              };
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-gray-600 capitalize">{status}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[status]} rounded-full`} style={{ width: `${percentage}%` }}></div>
                  </div>
                  <span className="w-10 text-sm font-medium text-gray-900 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Organizations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Recent Organizations</h3>
          <Link to="/admin/organizations" className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium">
            View All
          </Link>
        </div>
        {recentOrganizations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No organizations yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentOrganizations.map((org) => (
              <Link
                key={org._id}
                to={`/admin/organizations/${org._id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{org.name?.charAt(0) || 'O'}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{org.name}</p>
                    <p className="text-xs text-gray-500">{org.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            to="/admin/organizations"
            className="flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-sm font-medium text-blue-700">Manage Orgs</span>
          </Link>
          <Link
            to="/admin/providers"
            className="flex items-center gap-2 px-4 py-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            <span className="text-sm font-medium text-green-700">Manage Providers</span>
          </Link>
          <Link
            to="/admin/models"
            className="flex items-center gap-2 px-4 py-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <span className="text-sm font-medium text-orange-700">Manage Models</span>
          </Link>
          <Link
            to="/admin/settings"
            className="flex items-center gap-2 px-4 py-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-purple-700">System Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;