/**
 * Admin Organizations Management Page
 *
 * Super admin page for managing all organizations.
 * According to SRS:
 * - Super Admin can create Organization
 * - Do NOT make Super Admin pay subscription
 * - Subscription belongs to Organization
 * - Set subscription status as Pending/Trial until Organization Owner completes payment
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../services/api/admin.api.js';
import { showToast } from '../../utils/toasts.js';

// Available plan tiers (excluding free and enterprise)
const AVAILABLE_PLANS = [
  { value: 'starter', label: 'Starter', description: 'For small teams', color: 'bg-blue-100 text-blue-700' },
  { value: 'professional', label: 'Professional', description: 'For growing teams', color: 'bg-purple-100 text-purple-700' },
  { value: 'business', label: 'Business', description: 'For larger organizations', color: 'bg-amber-100 text-amber-700' }
];

function AdminOrganizationsPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, pages: 0 });

  // Form state for new organization
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    plan: 'starter',
    ownerEmail: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerPassword: '',
    sendInvitation: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrg, setCreatedOrg] = useState(null); // Store created org data for password display
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility

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

  // Generate slug from name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Auto-generate slug from name
    if (name === 'name') {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(value)
      }));
    }

    // Clear error when field changes
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Organization name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Organization name must be at least 2 characters';
    } else if (formData.name.length > 60) {
      errors.name = 'Organization name cannot exceed 60 characters';
    }

    if (formData.description && formData.description.length > 200) {
      errors.description = 'Description cannot exceed 200 characters';
    }

    if (!formData.plan) {
      errors.plan = 'Please select a plan';
    }

    if (!formData.ownerEmail.trim()) {
      errors.ownerEmail = 'Owner email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
      errors.ownerEmail = 'Please enter a valid email address (e.g., user@example.com)';
    } else if (formData.ownerEmail.length > 60) {
      errors.ownerEmail = 'Email cannot exceed 60 characters';
    }

    if (!formData.ownerFirstName.trim()) {
      errors.ownerFirstName = 'First name is required';
    } else if (formData.ownerFirstName.length > 30) {
      errors.ownerFirstName = 'First name cannot exceed 30 characters';
    }

    if (!formData.ownerLastName.trim()) {
      errors.ownerLastName = 'Last name is required';
    } else if (formData.ownerLastName.length > 30) {
      errors.ownerLastName = 'Last name cannot exceed 30 characters';
    }

    // Password validation (required for new users)
    if (!formData.ownerPassword.trim()) {
      errors.ownerPassword = 'Password is required';
    } else if (formData.ownerPassword.length < 8) {
      errors.ownerPassword = 'Password must be at least 8 characters';
    } else if (formData.ownerPassword.length > 60) {
      errors.ownerPassword = 'Password cannot exceed 60 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create organization
  const handleCreateOrganization = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setFormErrors({});

      const response = await adminApi.createOrganization({
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        plan: formData.plan,
        ownerEmail: formData.ownerEmail,
        ownerFirstName: formData.ownerFirstName,
        ownerLastName: formData.ownerLastName,
        ownerPassword: formData.ownerPassword,
        sendInvitation: formData.sendInvitation,
        // Super Admin creates org - subscription status is set to trial
        subscriptionStatus: 'trial'
      });

      // Store created org data to show password
      setCreatedOrg({
        ...response,
        ownerPassword: formData.ownerPassword // Include password for display
      });

      showToast.success('Organization created successfully!');

      // Reset form
      setFormData({
        name: '',
        slug: '',
        description: '',
        plan: 'starter',
        ownerEmail: '',
        ownerFirstName: '',
        ownerLastName: '',
        ownerPassword: '',
        sendInvitation: true
      });
      fetchOrganizations();
    } catch (err) {
      console.error('Failed to create organization:', err);
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create organization';
      setFormErrors({ submit: errorMessage });
      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update organization status
  const handleUpdateStatus = async (orgId, newStatus) => {
    try {
      await adminApi.updateOrganizationStatus(orgId, newStatus);
      showToast.success('Organization status updated');
      fetchOrganizations();
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast.error(err.response?.data?.error?.message || 'Failed to update status');
    }
  };

  // Update organization plan
  const handleUpdatePlan = async (orgId, newPlan) => {
    try {
      await adminApi.updateOrganizationPlan(orgId, newPlan);
      showToast.success('Organization plan updated');
      fetchOrganizations();
    } catch (err) {
      console.error('Failed to update plan:', err);
      showToast.error(err.response?.data?.error?.message || 'Failed to update plan');
    }
  };

  const getPlanBadge = (plan) => {
    const planConfig = AVAILABLE_PLANS.find(p => p.value === plan);
    if (planConfig) {
      return planConfig.color;
    }
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      trial: 'bg-yellow-100 text-yellow-700',
      pending_payment: 'bg-blue-100 text-blue-700',
      past_due: 'bg-orange-100 text-orange-700',
      expired: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Active',
      trial: 'Trial',
      pending_payment: 'Pending Payment',
      past_due: 'Past Due',
      expired: 'Expired',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  // Subscription status options matching Organization schema
  const SUBSCRIPTION_STATUSES = [
    { value: 'trial', label: 'Trial' },
    { value: 'active', label: 'Active' },
    { value: 'pending_payment', label: 'Pending Payment' },
    { value: 'past_due', label: 'Past Due' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading && organizations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626] mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all organizations and their subscriptions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Organization
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-800 hover:text-red-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <p className="text-sm text-gray-500">Expired/Past Due</p>
          <p className="text-2xl font-bold text-red-600">{organizations.filter(o => ['expired', 'past_due', 'cancelled'].includes(o.subscription?.status)).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
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
            {AVAILABLE_PLANS.map(plan => (
              <option key={plan.value} value={plan.value}>{plan.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
          >
            <option value="all">All Status</option>
            {SUBSCRIPTION_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Organizations Grid */}
      {organizations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new organization.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Organization
          </button>
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
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadge(org.subscription?.plan)}`}>
                  {org.subscription?.plan || 'starter'}
                </span>
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
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(org.subscription?.status)}`}>
                  {getStatusLabel(org.subscription?.status) || 'Trial'}
                </span>
                {org.owner && (
                  <p className="text-xs text-gray-500">
                    Owner: {org.owner.firstName} {org.owner.lastName}
                  </p>
                )}
              </div>

              <div className="text-xs text-gray-400 mb-3">
                Created: {formatDate(org.createdAt)}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  onClick={() => navigate(`/admin/organizations/${org._id}`)}
                  className="text-[#DC2626] hover:text-[#B91C1C] p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  title="View Details"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <div className="flex gap-2">
                  <select
                    value={org.subscription?.status || 'trial'}
                    onChange={(e) => handleUpdateStatus(org._id, e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-[#DC2626]"
                  >
                    {SUBSCRIPTION_STATUSES.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
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
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Create Organization</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Create a new organization. The owner will receive an invitation to set up their account.
              </p>
            </div>

            <form onSubmit={handleCreateOrganization} className="p-6 space-y-4">
              {formErrors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formErrors.submit}
                </div>
              )}

              {/* Organization Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Organization Information</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent ${
                      formErrors.name ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="Acme Corporation"
                    maxLength={60}
                  />
                  <div className="flex justify-between mt-1">
                    {formErrors.name && (
                      <p className="text-sm text-red-500">{formErrors.name}</p>
                    )}
                    <p className="text-xs text-gray-400 ml-auto">{formData.name.length}/60</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent resize-none overflow-y-auto ${
                      formErrors.description ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="Brief description of the organization"
                    rows={3}
                    maxLength={200}
                    style={{ minHeight: '80px', maxHeight: '80px' }}
                  />
                  <div className="flex justify-between mt-1">
                    {formErrors.description && (
                      <p className="text-sm text-red-500">{formErrors.description}</p>
                    )}
                    <p className="text-xs text-gray-400 ml-auto">{formData.description?.length || 0}/200</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription Plan<span className="text-red-500">*</span>
                  </label>
                  <select
                    name="plan"
                    value={formData.plan}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent ${
                      formErrors.plan ? 'border-red-300' : 'border-gray-200'
                    }`}
                  >
                    {AVAILABLE_PLANS.map(plan => (
                      <option key={plan.value} value={plan.value}>{plan.label} - {plan.description}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Organization will be set to Trial status. Owner completes payment separately.
                  </p>
                </div>
              </div>

              {/* Owner Info */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-900">Organization Owner</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="ownerFirstName"
                      value={formData.ownerFirstName}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent ${
                        formErrors.ownerFirstName ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="John"
                      maxLength={30}
                    />
                    {formErrors.ownerFirstName && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.ownerFirstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="ownerLastName"
                      value={formData.ownerLastName}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent ${
                        formErrors.ownerLastName ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="Doe"
                      maxLength={30}
                    />
                    {formErrors.ownerLastName && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.ownerLastName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="ownerEmail"
                    value={formData.ownerEmail}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent ${
                      formErrors.ownerEmail ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="john@acme.com"
                    maxLength={60}
                  />
                  {formErrors.ownerEmail && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.ownerEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password<span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="ownerPassword"
                      value={formData.ownerPassword}
                      onChange={handleChange}
                      className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent ${
                        formErrors.ownerPassword ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="Admin@123"
                      maxLength={60}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {formErrors.ownerPassword && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.ownerPassword}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Password must be at least 8 characters. The owner will need to change this on first login.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendInvitation"
                    name="sendInvitation"
                    checked={formData.sendInvitation}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                  />
                  <label htmlFor="sendInvitation" className="text-sm text-gray-700">
                    Send invitation email to owner
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
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
      , document.body)}

      {/* Password Display Modal */}
      {createdOrg && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Organization Created!</h2>
                  <p className="text-sm text-gray-500">Share these credentials with the owner</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Organization</p>
                  <p className="text-lg font-semibold text-gray-900">{createdOrg.organization?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Plan</p>
                  <p className="text-sm font-medium text-gray-700 capitalize">{createdOrg.organization?.subscription?.plan}</p>
                </div>
              </div>

              {createdOrg.ownerPassword && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Important: Share these credentials</p>
                      <p className="text-xs text-yellow-700 mt-1">The owner will need to change the password on first login.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono">{createdOrg.owner?.email}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(createdOrg.owner?.email)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      title="Copy email"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {createdOrg.ownerPassword && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Password</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono text-lg font-bold">{createdOrg.ownerPassword}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(createdOrg.ownerPassword)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title="Copy password"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setCreatedOrg(null);
                  setShowModal(false);
                }}
                className="w-full px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

export default AdminOrganizationsPage;