/**
 * Admin Organizations Management Page
 *
 * Super admin page for managing all organizations.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../services/api/admin.api.js';

function AdminOrganizationsPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  // Form state for new organization
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    plan: 'free',
    ownerEmail: '',
    ownerFirstName: '',
    ownerLastName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch organizations
  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await adminApi.getOrganizations({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        plan: filterPlan !== 'all' ? filterPlan : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined
      });

      setOrganizations(response.organizations || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0,
        pages: response.pagination?.pages || 0
      }));
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setError(err.response?.data?.error?.message || 'Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [pagination.page, filterPlan, filterStatus]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        fetchOrganizations();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Create organization
  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await adminApi.createOrganization(formData);
      setShowModal(false);
      setFormData({
        name: '',
        description: '',
        plan: 'free',
        ownerEmail: '',
        ownerFirstName: '',
        ownerLastName: ''
      });
      fetchOrganizations();
    } catch (err) {
      console.error('Failed to create organization:', err);
      setError(err.response?.data?.error?.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update organization status
  const handleUpdateStatus = async (orgId, newStatus) => {
    try {
      await adminApi.updateOrganizationStatus(orgId, newStatus);
      fetchOrganizations();
    } catch (err) {
      console.error('Failed to update status:', err);
      setError(err.response?.data?.error?.message || 'Failed to update status');
    }
  };

  // Update organization plan
  const handleUpdatePlan = async (orgId, newPlan) => {
    try {
      await adminApi.updateOrganizationPlan(orgId, newPlan);
      fetchOrganizations();
    } catch (err) {
      console.error('Failed to update plan:', err);
      setError(err.response?.data?.error?.message || 'Failed to update plan');
    }
  };

  const getPlanBadge = (plan) => {
    const colors = {
      free: 'bg-gray-100 text-gray-700',
      starter: 'bg-blue-100 text-blue-700',
      professional: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700'
    };
    return colors[plan] || 'bg-gray-100 text-gray-700';
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      trial: 'bg-yellow-100 text-yellow-700',
      suspended: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      expired: 'bg-orange-100 text-orange-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const formatTokens = (tokens) => {
    if (!tokens) return '0';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  if (isLoading && organizations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DC2626]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Management</h1>
          <p className="text-sm text-gray-500">Manage all organizations and their subscriptions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors"
        >
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Organization
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total Organizations</p>
          <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{organizations.filter(o => o.subscription?.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">On Trial</p>
          <p className="text-2xl font-bold text-yellow-600">{organizations.filter(o => o.subscription?.status === 'trial').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Suspended</p>
          <p className="text-2xl font-bold text-red-600">{organizations.filter(o => o.subscription?.status === 'suspended').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Organizations Grid */}
      {organizations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new organization.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <div key={org._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-xl flex items-center justify-center">
                    <span className="text-lg font-bold text-white">{org.name?.charAt(0) || 'O'}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{org.name}</h3>
                    <p className="text-sm text-gray-500">{org.slug}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPlanBadge(org.subscription?.plan)}`}>
                    {org.subscription?.plan || 'free'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Members</p>
                  <p className="text-sm font-medium text-gray-900">{org.memberCount || org.members?.length || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Projects</p>
                  <p className="text-sm font-medium text-gray-900">{org.projectCount || 0}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(org.subscription?.status)}`}>
                  {org.subscription?.status || 'active'}
                </span>
                {org.owner && (
                  <p className="text-xs text-gray-500">
                    Owner: {org.owner.firstName} {org.owner.lastName}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/admin/organizations/${org._id}`)}
                    className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
                  >
                    View
                  </button>
                  <select
                    value={org.subscription?.status || 'active'}
                    onChange={(e) => handleUpdateStatus(org._id, e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1"
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Suspend</option>
                  </select>
                </div>
                <select
                  value={org.subscription?.plan || 'free'}
                  onChange={(e) => handleUpdatePlan(org._id, e.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1"
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Add Organization Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Organization</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  placeholder="Enter organization name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  placeholder="Optional description"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan
                </label>
                <select
                  value={formData.plan}
                  onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="border-t border-gray-100 pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Owner Information</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={formData.ownerFirstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownerFirstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                      placeholder="First name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={formData.ownerLastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownerLastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-gray-600 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, ownerEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="owner@example.com"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminOrganizationsPage;