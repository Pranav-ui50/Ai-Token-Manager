/**
 * Admin Plans Management Page
 *
 * Super admin page for managing subscription plans (CRUD operations).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api/axios.js';

const AdminPlansPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state for create/edit
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    tier: 'starter',
    status: 'active',
    isPopular: false,
    billing: {
      price: 0,
      currency: 'USD',
      interval: 'month',
      trialDays: 14
    },
    pricingModel: {
      type: 'usage-based',
      usageBased: {
        includedTokens: 0,
        includedRequests: 0
      }
    },
    credits: {
      includedCredits: 0,
      creditType: 'token'
    },
    limits: {
      maxUsers: 1,
      maxApiCalls: 1000,
      maxTokens: 10000
    },
    settings: {
      isPublic: true,
      isDefault: false,
      allowUpgrade: true,
      allowDowngrade: true
    }
  });

  const tiers = [
    { value: 'free', label: 'Free' },
    { value: 'starter', label: 'Starter' },
    { value: 'professional', label: 'Professional' },
    { value: 'business', label: 'Business' }
  ];

  const statuses = [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
    { value: 'deprecated', label: 'Deprecated' }
  ];

  // Fetch all plans
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/plans');
      if (response.data.success) {
        setPlans(response.data.data.plans || []);
      }
    } catch (err) {
      setError('Failed to fetch plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      tier: 'starter',
      status: 'active',
      isPopular: false,
      billing: {
        price: 0,
        currency: 'USD',
        interval: 'month',
        trialDays: 14
      },
      pricingModel: {
        type: 'usage-based',
        usageBased: {
          includedTokens: 0,
          includedRequests: 0
        }
      },
      credits: {
        includedCredits: 0,
        creditType: 'token'
      },
      limits: {
        maxUsers: 1,
        maxApiCalls: 1000,
        maxTokens: 10000
      },
      settings: {
        isPublic: true,
        isDefault: false,
        allowUpgrade: true,
        allowDowngrade: true
      }
    });
    setEditingPlan(null);
  };

  // Open modal for new plan
  const handleNewPlan = () => {
    resetForm();
    setShowModal(true);
  };

  // Open modal for editing
  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || '',
      slug: plan.slug || '',
      description: plan.description || '',
      tier: plan.tier || 'starter',
      status: plan.status || 'active',
      isPopular: plan.isPopular || false,
      billing: {
        price: plan.billing?.price || 0,
        currency: plan.billing?.currency || 'USD',
        interval: plan.billing?.interval || 'month',
        trialDays: plan.billing?.trialDays || 14
      },
      pricingModel: {
        type: plan.pricingModel?.type || 'usage-based',
        usageBased: {
          includedTokens: plan.pricingModel?.usageBased?.includedTokens || 0,
          includedRequests: plan.pricingModel?.usageBased?.includedRequests || 0
        }
      },
      credits: {
        includedCredits: plan.credits?.includedCredits || 0,
        creditType: plan.credits?.creditType || 'token'
      },
      limits: {
        maxUsers: plan.limits?.maxUsers || 1,
        maxApiCalls: plan.limits?.maxApiCalls || 1000,
        maxTokens: plan.limits?.maxTokens || 10000
      },
      settings: {
        isPublic: plan.settings?.isPublic ?? true,
        isDefault: plan.settings?.isDefault ?? false,
        allowUpgrade: plan.settings?.allowUpgrade ?? true,
        allowDowngrade: plan.settings?.allowDowngrade ?? true
      }
    });
    setShowModal(true);
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'number' ? parseFloat(value) || 0 : (type === 'checkbox' ? checked : value)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : (type === 'checkbox' ? checked : value)
      }));
    }
  };

  // Handle nested object changes
  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  // Save plan (create or update)
  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Auto-generate slug from name
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const planData = {
        ...formData,
        slug,
        'billing.price': Number(formData.billing.price),
        'billing.trialDays': Number(formData.billing.trialDays),
        'credits.includedCredits': Number(formData.credits.includedCredits),
        'limits.maxUsers': formData.limits.maxUsers ? Number(formData.limits.maxUsers) : null,
        'limits.maxApiCalls': formData.limits.maxApiCalls ? Number(formData.limits.maxApiCalls) : null,
        'limits.maxTokens': formData.limits.maxTokens ? Number(formData.limits.maxTokens) : null
      };

      if (editingPlan) {
        // Update existing plan
        await api.put(`/admin/plans/${editingPlan._id}`, planData);
        setSuccess('Plan updated successfully!');
      } else {
        // Create new plan
        await api.post('/admin/plans', planData);
        setSuccess('Plan created successfully!');
      }

      setShowModal(false);
      fetchPlans();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save plan');
    } finally {
      setLoading(false);
    }
  };

  // Delete plan
  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/admin/plans/${planId}`);
      setSuccess('Plan deleted successfully!');
      fetchPlans();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete plan');
    } finally {
      setLoading(false);
    }
  };

  // Toggle plan status
  const handleToggleStatus = async (plan) => {
    try {
      const newStatus = plan.status === 'active' ? 'draft' : 'active';
      await api.patch(`/admin/plans/${plan._id}/status`, { status: newStatus });
      fetchPlans();
    } catch (err) {
      setError('Failed to update plan status');
    }
  };

  // Toggle public visibility
  const handleTogglePublic = async (plan) => {
    try {
      await api.patch(`/admin/plans/${plan._id}/visibility`, {
        isPublic: !plan.settings?.isPublic
      });
      fetchPlans();
    } catch (err) {
      setError('Failed to update plan visibility');
    }
  };

  // Get tier color
  const getTierColor = (tier) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      starter: 'bg-blue-100 text-blue-800',
      professional: 'bg-purple-100 text-purple-800',
      business: 'bg-yellow-100 text-yellow-800',
      enterprise: 'bg-red-100 text-red-800'
    };
    return colors[tier] || colors.starter;
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      archived: 'bg-yellow-100 text-yellow-800',
      deprecated: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.draft;
  };

  // Format price
  const formatPrice = (price, currency = 'USD') => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC2626]"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-600 mt-1">Manage billing plans for the landing page and subscriptions</p>
        </div>
        <button
          onClick={handleNewPlan}
          className="px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Plan
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Plans Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Public</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Popular</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {plans.filter(plan => plan.tier !== 'enterprise').map((plan) => (
                <tr key={plan._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                      <div className="text-sm text-gray-500">{plan.slug}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTierColor(plan.tier)}`}>
                      {plan.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatPrice(plan.billing?.price || 0, plan.billing?.currency)}
                      {plan.billing?.price > 0 && <span className="text-gray-500">/{plan.billing?.interval || 'mo'}</span>}
                    </div>
                    {plan.billing?.trialDays > 0 && (
                      <div className="text-xs text-gray-500">{plan.billing.trialDays}-day trial</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {plan.credits?.includedCredits?.toLocaleString() || 0} {plan.credits?.creditType || 'tokens'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(plan)}
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(plan.status)}`}
                    >
                      {plan.status}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleTogglePublic(plan)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        plan.settings?.isPublic ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          plan.settings?.isPublic ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {plan.isPopular && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⭐ Popular
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(plan)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(plan._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td col="8" className="px-6 py-12 text-center text-gray-500">
                    No plans found. Create your first plan to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)}></div>

            <div className="inline-block w-full max-w-2xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </h3>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      placeholder="Professional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tier *</label>
                    <select
                      name="tier"
                      value={formData.tier}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    >
                      {tiers.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    placeholder="Ideal for growing teams..."
                  />
                </div>

                {/* Pricing */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Pricing</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                      <input
                        type="number"
                        name="billing.price"
                        value={formData.billing.price}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                      <select
                        name="billing.currency"
                        value={formData.billing.currency}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Interval</label>
                      <select
                        name="billing.interval"
                        value={formData.billing.interval}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      >
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                        <option value="one-time">One-time</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Credits & Limits */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Credits & Limits</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Included Credits</label>
                      <input
                        type="number"
                        name="credits.includedCredits"
                        value={formData.credits.includedCredits}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                      <input
                        type="number"
                        name="limits.maxUsers"
                        value={formData.limits.maxUsers || ''}
                        onChange={handleChange}
                        min="1"
                        placeholder="Unlimited"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max API Calls</label>
                      <input
                        type="number"
                        name="limits.maxApiCalls"
                        value={formData.limits.maxApiCalls || ''}
                        onChange={handleChange}
                        min="1"
                        placeholder="Unlimited"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Settings</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="settings.isPublic"
                        checked={formData.settings.isPublic}
                        onChange={handleChange}
                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700">Show on landing page</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isPopular"
                        checked={formData.isPopular}
                        onChange={handleChange}
                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700">Mark as "Most Popular"</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="settings.isDefault"
                        checked={formData.settings.isDefault}
                        onChange={handleChange}
                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700">Default plan for new users</span>
                    </label>
                  </div>
                </div>

                {/* Status */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    {statuses.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.name}
                  className="px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPlansPage;