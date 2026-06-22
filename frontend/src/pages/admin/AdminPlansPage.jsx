/**
 * Admin Plans Management Page
 *
 * Super admin page for managing subscription plans (CRUD operations).
 * Changes are automatically synced to all pages via PlansContext.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../../services/api/axios.js';
import { showToast } from '../../utils/toasts.js';
import { PLANS_REFRESH_EVENT } from '../../context/PlansContext.jsx';
import Loader from '../../components/common/Loader.jsx';

const AdminPlansPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state for create/edit
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    tier: 'starter',
    status: 'active',
    isPopular: false,
    billing: {
      price: '',
      currency: 'USD',
      interval: 'month',
      trialDays: ''
    },
    pricingModel: {
      type: 'usage-based',
      usageBased: {
        includedTokens: 0,
        includedRequests: 0
      }
    },
    credits: {
      includedCredits: '',
      creditType: 'token'
    },
    limits: {
      maxProjects: '',
      maxFeatures: '',
      maxSimulations: '',
      maxUsers: '',
      maxApiCalls: '',
      maxTokens: ''
    },
    settings: {
      isPublic: false,
      isDefault: false,
      allowUpgrade: false,
      allowDowngrade: false
    }
  });

  const tiers = [
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
      console.log('\n[DEBUG Frontend] ========================================');
      console.log('[DEBUG Frontend] fetchPlans called');
      const response = await api.get('/admin/plans');
      console.log('[DEBUG Frontend] Response status:', response.status);
      console.log('[DEBUG Frontend] Response data:', JSON.stringify(response.data, null, 2));
      if (response.data.success) {
        const fetchedPlans = response.data.data.plans || [];
        console.log('[DEBUG Frontend] Fetched plans count:', fetchedPlans.length);
        if (fetchedPlans.length > 0) {
          console.log('[DEBUG Frontend] First plan:', JSON.stringify(fetchedPlans[0], null, 2));
          console.log('[DEBUG Frontend] First plan limits:', fetchedPlans[0].limits);
          console.log('[DEBUG Frontend] First plan limits.maxProjects:', fetchedPlans[0].limits?.maxProjects);
          console.log('[DEBUG Frontend] First plan limits.maxFeatures:', fetchedPlans[0].limits?.maxFeatures);
          console.log('[DEBUG Frontend] First plan limits.maxSimulations:', fetchedPlans[0].limits?.maxSimulations);
        }
        setPlans(fetchedPlans);
      }
      console.log('[DEBUG Frontend] ========================================\n');
    } catch (err) {
      showToast.error('Failed to fetch plans');
      console.error('[DEBUG Frontend] Error fetching plans:', err);
      console.error('[DEBUG Frontend] Error response:', err.response?.data);
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
        price: '',
        currency: 'USD',
        interval: 'month',
        trialDays: ''
      },
      pricingModel: {
        type: 'usage-based',
        usageBased: {
          includedTokens: 0,
          includedRequests: 0
        }
      },
      credits: {
        includedCredits: '',
        creditType: 'token'
      },
      limits: {
        // Empty string means unlimited - user can leave blank
        maxProjects: '',
        maxFeatures: '',
        maxSimulations: '',
        maxUsers: '',
        maxApiCalls: '',
        maxTokens: ''
      },
      settings: {
        isPublic: false,
        isDefault: false,
        allowUpgrade: false,
        allowDowngrade: false
      }
    });
    setFormErrors({});
    setEditingPlan(null);
  };

  // Open modal for new plan
  const handleNewPlan = () => {
    resetForm();
    setShowModal(true);
  };

  // Open modal for editing
  const handleEdit = (plan) => {
    console.log('\n[DEBUG Frontend] ========================================');
    console.log('[DEBUG Frontend] handleEdit called');
    console.log('[DEBUG Frontend] plan._id:', plan._id);
    console.log('[DEBUG Frontend] plan.name:', plan.name);
    console.log('[DEBUG Frontend] plan.limits (raw):', JSON.stringify(plan.limits, null, 2));
    console.log('[DEBUG Frontend] plan.limits.maxProjects:', plan.limits?.maxProjects, '(type:', typeof plan.limits?.maxProjects, ')');
    console.log('[DEBUG Frontend] plan.limits.maxFeatures:', plan.limits?.maxFeatures, '(type:', typeof plan.limits?.maxFeatures, ')');
    console.log('[DEBUG Frontend] plan.limits.maxSimulations:', plan.limits?.maxSimulations, '(type:', typeof plan.limits?.maxSimulations, ')');
    console.log('[DEBUG Frontend] ========================================\n');

    // Helper function to safely convert to string for input fields
    const toString = (value) => {
      if (value === null || value === undefined) return '';
      return String(value);
    };

    // Build the form data object
    const newFormData = {
      name: plan.name || '',
      slug: plan.slug || '',
      description: plan.description || '',
      tier: plan.tier || 'starter',
      status: plan.status || 'active',
      isPopular: plan.isPopular || false,
      billing: {
        price: toString(plan.billing?.price),
        currency: plan.billing?.currency || 'USD',
        interval: plan.billing?.interval || 'month',
        trialDays: toString(plan.billing?.trialDays)
      },
      pricingModel: {
        type: plan.pricingModel?.type || 'usage-based',
        usageBased: {
          includedTokens: plan.pricingModel?.usageBased?.includedTokens ?? 0,
          includedRequests: plan.pricingModel?.usageBased?.includedRequests ?? 0
        }
      },
      credits: {
        includedCredits: toString(plan.credits?.includedCredits),
        creditType: plan.credits?.creditType || 'token'
      },
      limits: {
        maxProjects: toString(plan.limits?.maxProjects),
        maxFeatures: toString(plan.limits?.maxFeatures),
        maxSimulations: toString(plan.limits?.maxSimulations),
        maxUsers: toString(plan.limits?.maxUsers),
        maxApiCalls: toString(plan.limits?.maxApiCalls),
        maxTokens: toString(plan.limits?.maxTokens)
      },
      settings: {
        isPublic: plan.settings?.isPublic ?? true,
        isDefault: plan.settings?.isDefault ?? false,
        allowUpgrade: plan.settings?.allowUpgrade ?? true,
        allowDowngrade: plan.settings?.allowDowngrade ?? true
      }
    };

    console.log('[DEBUG Frontend] newFormData.limits:', JSON.stringify(newFormData.limits, null, 2));
    console.log('[DEBUG Frontend] newFormData.billing:', JSON.stringify(newFormData.billing, null, 2));

    setEditingPlan(plan);
    setFormData(newFormData);
    setFormErrors({});
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

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Plan name is required';
    } else if (formData.name.length > 60) {
      errors.name = 'Plan name cannot exceed 60 characters';
    }

    // Description validation
    if (formData.description && formData.description.length > 200) {
      errors.description = 'Description cannot exceed 200 characters';
    }

    // Price validation - allow empty or valid number
    if (formData.billing.price && formData.billing.price !== '' && !/^\d{1,10}$/.test(formData.billing.price) && !/^\d{1,8}\.\d{0,2}$/.test(formData.billing.price)) {
      errors.price = 'Price must be a valid number (max 10 digits)';
    }

    // Credits validation - allow empty or valid number
    if (formData.credits.includedCredits && formData.credits.includedCredits !== '' && !/^\d{1,10}$/.test(formData.credits.includedCredits)) {
      errors.credits = 'Included credits must be a valid number (max 10 digits)';
    }

    // Max users validation - allow empty or valid number
    if (formData.limits.maxUsers && formData.limits.maxUsers !== '' && !/^\d{1,10}$/.test(formData.limits.maxUsers)) {
      errors.maxUsers = 'Max users must be a valid number (max 10 digits)';
    }

    // Max API calls validation - allow empty or valid number
    if (formData.limits.maxApiCalls && formData.limits.maxApiCalls !== '' && !/^\d{1,10}$/.test(formData.limits.maxApiCalls)) {
      errors.maxApiCalls = 'Max API calls must be a valid number (max 10 digits)';
    }

    // Trial days validation - allow empty or valid positive number
    if (formData.billing.trialDays && formData.billing.trialDays !== '') {
      const trialDaysValue = parseInt(formData.billing.trialDays, 10);
      if (isNaN(trialDaysValue) || trialDaysValue < 0) {
        errors.trialDays = 'Trial days must be a valid positive number';
      } else if (trialDaysValue > 10000000) {
        errors.trialDays = 'Trial days cannot exceed 10,000,000';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save plan (create or update)
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Auto-generate slug from name
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Helper function to convert string to number or return default
      const parseNumber = (value, defaultValue = 0) => {
        if (value === '' || value === null || value === undefined) return defaultValue;
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      };

      // Helper function to convert string to number or return null
      const parseNumberOrNull = (value) => {
        if (value === '' || value === null || value === undefined) return null;
        // If already a number, return it (unless NaN)
        if (typeof value === 'number') {
          return isNaN(value) ? null : Math.floor(value);
        }
        // Convert string to number
        const num = parseInt(String(value), 10);
        return isNaN(num) ? null : num;
      };

      // Prepare data with proper nested structure
      const planData = {
        name: formData.name,
        slug,
        description: formData.description,
        tier: formData.tier,
        status: formData.status,
        isPopular: formData.isPopular,
        billing: {
          price: parseNumber(formData.billing.price, 0),
          currency: formData.billing.currency,
          interval: formData.billing.interval,
          trialDays: parseNumber(formData.billing.trialDays, 0)
        },
        pricingModel: {
          type: formData.pricingModel.type,
          usageBased: {
            includedTokens: parseNumber(formData.pricingModel.usageBased.includedTokens, 0),
            includedRequests: parseNumber(formData.pricingModel.usageBased.includedRequests, 0)
          }
        },
        credits: {
          includedCredits: parseNumber(formData.credits.includedCredits, 0),
          creditType: formData.credits.creditType
        },
        limits: {
          maxProjects: parseNumberOrNull(formData.limits.maxProjects),
          maxFeatures: parseNumberOrNull(formData.limits.maxFeatures),
          maxSimulations: parseNumberOrNull(formData.limits.maxSimulations),
          maxUsers: parseNumberOrNull(formData.limits.maxUsers),
          maxApiCalls: parseNumberOrNull(formData.limits.maxApiCalls),
          maxTokens: parseNumberOrNull(formData.limits.maxTokens)
        },
        settings: {
          isPublic: formData.settings.isPublic,
          isDefault: formData.settings.isDefault,
          allowUpgrade: formData.settings.allowUpgrade,
          allowDowngrade: formData.settings.allowDowngrade
        }
      };

      console.log('\n[DEBUG Frontend] ========================================');
      console.log('[DEBUG Frontend] handleSave called');
      console.log('[DEBUG Frontend] editingPlan:', editingPlan?._id || 'new plan');
      console.log('[DEBUG Frontend] formData.limits:', JSON.stringify(formData.limits, null, 2));
      console.log('[DEBUG Frontend] planData.limits:', JSON.stringify(planData.limits, null, 2));
      console.log('[DEBUG Frontend] maxProjects:', planData.limits.maxProjects, '(type:', typeof planData.limits.maxProjects, ')');
      console.log('[DEBUG Frontend] maxFeatures:', planData.limits.maxFeatures, '(type:', typeof planData.limits.maxFeatures, ')');
      console.log('[DEBUG Frontend] maxSimulations:', planData.limits.maxSimulations, '(type:', typeof planData.limits.maxSimulations, ')');
      console.log('[DEBUG Frontend] About to send API request...');
      console.log('[DEBUG Frontend] ========================================\n');

      if (editingPlan) {
        // Update existing plan
        console.log('[DEBUG Frontend] Updating plan with ID:', editingPlan._id);
        const response = await api.put(`/admin/plans/${editingPlan._id}`, planData);
        console.log('\n[DEBUG Frontend] ====== UPDATE RESPONSE ======');
        console.log('[DEBUG Frontend] response.status:', response.status);
        console.log('[DEBUG Frontend] response.data:', JSON.stringify(response.data, null, 2));
        console.log('[DEBUG Frontend] response.data.data?.plan?.limits:', JSON.stringify(response.data.data?.plan?.limits, null, 2));
        console.log('[DEBUG Frontend] ========================================\n');
        showToast.planUpdated();
      } else {
        // Create new plan
        console.log('[DEBUG Frontend] Creating new plan...');
        const response = await api.post('/admin/plans', planData);
        console.log('\n[DEBUG Frontend] ====== CREATE RESPONSE ======');
        console.log('[DEBUG Frontend] response.status:', response.status);
        console.log('[DEBUG Frontend] response.data:', JSON.stringify(response.data, null, 2));
        console.log('[DEBUG Frontend] response.data.data?.plan?.limits:', JSON.stringify(response.data.data?.plan?.limits, null, 2));
        console.log('[DEBUG Frontend] ========================================\n');
        showToast.planCreated();
      }

      // Dispatch event to refresh plans across all pages
      window.dispatchEvent(new CustomEvent(PLANS_REFRESH_EVENT));

      // Close modal and reset form
      setShowModal(false);
      resetForm();

      // Fetch updated plans
      await fetchPlans();
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save plan';
      console.error('\n[DEBUG Frontend] ====== ERROR ======');
      console.error('[DEBUG Frontend] Error saving plan:', err);
      console.error('[DEBUG Frontend] Error response:', err.response?.data);
      console.error('[DEBUG Frontend] ================================\n');
      showToast.error(errorMessage);
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
      showToast.planDeleted();

      // Dispatch event to refresh plans across all pages
      window.dispatchEvent(new CustomEvent(PLANS_REFRESH_EVENT));

      fetchPlans();
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to delete plan';
      showToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Toggle plan status
  const handleToggleStatus = async (plan) => {
    try {
      const newStatus = plan.status === 'active' ? 'draft' : 'active';
      await api.patch(`/admin/plans/${plan._id}/status`, { status: newStatus });

      // Dispatch event to refresh plans across all pages
      window.dispatchEvent(new CustomEvent(PLANS_REFRESH_EVENT));

      fetchPlans();
    } catch (err) {
      showToast.error('Failed to update plan status');
    }
  };

  // Toggle public visibility
  const handleTogglePublic = async (plan) => {
    try {
      await api.patch(`/admin/plans/${plan._id}/visibility`, {
        isPublic: !plan.settings?.isPublic
      });

      // Dispatch event to refresh plans across all pages
      window.dispatchEvent(new CustomEvent(PLANS_REFRESH_EVENT));

      fetchPlans();
    } catch (err) {
      showToast.error('Failed to update plan visibility');
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
        <Loader />
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
      {/* Plans Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Limits</th>
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
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {plan.limits?.maxProjects !== null && plan.limits?.maxProjects !== undefined && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {plan.limits.maxProjects} Projects
                        </span>
                      )}
                      {plan.limits?.maxFeatures !== null && plan.limits?.maxFeatures !== undefined && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {plan.limits.maxFeatures} Features
                        </span>
                      )}
                      {plan.limits?.maxSimulations !== null && plan.limits?.maxSimulations !== undefined && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {plan.limits.maxSimulations} Sims
                        </span>
                      )}
                      {plan.limits?.maxUsers !== null && plan.limits?.maxUsers !== undefined && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          {plan.limits.maxUsers} Users
                        </span>
                      )}
                      {plan.limits?.maxApiCalls !== null && plan.limits?.maxApiCalls !== undefined && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          {plan.limits.maxApiCalls?.toLocaleString()} API
                        </span>
                      )}
                      {plan.limits?.maxTokens !== null && plan.limits?.maxTokens !== undefined && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          {plan.limits.maxTokens?.toLocaleString()} Tokens
                        </span>
                      )}
                      {!plan.limits?.maxProjects && !plan.limits?.maxFeatures && !plan.limits?.maxSimulations &&
                       !plan.limits?.maxUsers && !plan.limits?.maxApiCalls && !plan.limits?.maxTokens && (
                        <span className="text-xs text-gray-400">No limits set</span>
                      )}
                    </div>
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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(plan)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit plan"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(plan._id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete plan"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
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
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-5">
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Plan Name<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={(e) => {
                        handleChange(e);
                        if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                      }}
                      maxLength={60}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all ${formErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                      placeholder="e.g., Professional"
                    />
                    <div className="flex justify-between items-center mt-1">
                      {formErrors.name ? (
                        <span className="text-xs text-red-500">{formErrors.name}</span>
                      ) : (
                        <span></span>
                      )}
                      <span className="text-xs text-gray-400">{formData.name.length}/60</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Tier<span className="text-red-500">*</span>
                    </label>
                    <select
                      name="tier"
                      value={formData.tier}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all"
                    >
                      {tiers.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={(e) => {
                      handleChange(e);
                      if (formErrors.description) setFormErrors(prev => ({ ...prev, description: '' }));
                    }}
                    maxLength={200}
                    rows={3}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all resize-none overflow-y-auto ${formErrors.description ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    placeholder="Brief description of the plan (e.g., Ideal for growing teams...)"
                  />
                  <div className="flex justify-between items-center mt-1">
                    {formErrors.description ? (
                      <span className="text-xs text-red-500">{formErrors.description}</span>
                    ) : (
                      <span></span>
                    )}
                    <span className="text-xs text-gray-400">{formData.description.length}/200</span>
                  </div>
                </div>

                {/* Pricing */}
                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Pricing</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Price</label>
                      <input
                        type="text"
                        name="billing.price"
                        value={formData.billing.price ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty value or valid number up to 10 digits (with decimals)
                          if (value === '' || /^\d{1,10}$/.test(value) || /^\d{1,8}\.\d{0,2}$/.test(value)) {
                            handleNestedChange('billing', 'price', value);
                          }
                        }}
                        maxLength={10}
                        placeholder="0"
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all ${formErrors.price ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                      />
                      {formErrors.price && (
                        <span className="text-xs text-red-500 mt-1">{formErrors.price}</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                      <select
                        name="billing.currency"
                        value={formData.billing.currency}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Billing Interval</label>
                      <select
                        name="billing.interval"
                        value={formData.billing.interval}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all"
                      >
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                        <option value="one-time">One-time</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Trial Days</label>
                    <input
                      type="text"
                      name="billing.trialDays"
                      value={formData.billing.trialDays ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty value or valid integer up to 10000000
                        if (value === '' || /^\d+$/.test(value)) {
                          const numValue = parseInt(value, 10);
                          if (value === '' || numValue <= 10000000) {
                            handleNestedChange('billing', 'trialDays', value === '' ? '' : value);
                          }
                        }
                      }}
                      maxLength={10}
                      placeholder="0"
                      className={`w-full sm:w-1/3 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all ${formErrors.trialDays ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    />
                    {formErrors.trialDays && (
                      <span className="text-xs text-red-500 mt-1 block">{formErrors.trialDays}</span>
                    )}
                  </div>
                </div>

                {/* Plan Limits */}
                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    Plan Limits
                  </h4>
                  <p className="text-xs text-gray-500 mb-4">
                    Define the usage limits for this plan. Leave fields empty for unlimited access.
                  </p>

                  {/* Resource Limits */}
                  <div className="mb-4">
                    <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Resources</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Max Projects
                          <span className="text-gray-400 font-normal ml-1">(e.g., 5)</span>
                        </label>
                        <input
                          type="text"
                          name="limits.maxProjects"
                          value={formData.limits.maxProjects ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d{1,10}$/.test(value)) {
                              handleNestedChange('limits', 'maxProjects', value);
                            }
                          }}
                          maxLength={10}
                          placeholder="Unlimited"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Max Features
                          <span className="text-gray-400 font-normal ml-1">(e.g., 10)</span>
                        </label>
                        <input
                          type="text"
                          name="limits.maxFeatures"
                          value={formData.limits.maxFeatures ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d{1,10}$/.test(value)) {
                              handleNestedChange('limits', 'maxFeatures', value);
                            }
                          }}
                          maxLength={10}
                          placeholder="Unlimited"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Max Simulations
                          <span className="text-gray-400 font-normal ml-1">(e.g., 100)</span>
                        </label>
                        <input
                          type="text"
                          name="limits.maxSimulations"
                          value={formData.limits.maxSimulations ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d{1,10}$/.test(value)) {
                              handleNestedChange('limits', 'maxSimulations', value);
                            }
                          }}
                          maxLength={10}
                          placeholder="Unlimited"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Team & API Limits */}
                  <div className="mb-4">
                    <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Team & API</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Max Team Members
                          <span className="text-gray-400 font-normal ml-1">(e.g., 3)</span>
                        </label>
                        <input
                          type="text"
                          name="limits.maxUsers"
                          value={formData.limits.maxUsers ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d{1,10}$/.test(value)) {
                              handleNestedChange('limits', 'maxUsers', value);
                            }
                          }}
                          maxLength={10}
                          placeholder="Unlimited"
                          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all ${formErrors.maxUsers ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                        {formErrors.maxUsers && (
                          <span className="text-xs text-red-500 mt-1">{formErrors.maxUsers}</span>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Max API Calls
                          <span className="text-gray-400 font-normal ml-1">(e.g., 10000)</span>
                        </label>
                        <input
                          type="text"
                          name="limits.maxApiCalls"
                          value={formData.limits.maxApiCalls ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d{1,10}$/.test(value)) {
                              handleNestedChange('limits', 'maxApiCalls', value);
                            }
                          }}
                          maxLength={10}
                          placeholder="Unlimited"
                          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all ${formErrors.maxApiCalls ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                        {formErrors.maxApiCalls && (
                          <span className="text-xs text-red-500 mt-1">{formErrors.maxApiCalls}</span>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Max Tokens
                          <span className="text-gray-400 font-normal ml-1">(e.g., 100000)</span>
                        </label>
                        <input
                          type="text"
                          name="limits.maxTokens"
                          value={formData.limits.maxTokens ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d{1,10}$/.test(value)) {
                              handleNestedChange('limits', 'maxTokens', value);
                            }
                          }}
                          maxLength={10}
                          placeholder="Unlimited"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Credits */}
                  <div>
                    <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Credits Included</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Included Credits</label>
                        <input
                          type="text"
                          name="credits.includedCredits"
                          value={formData.credits.includedCredits ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d{1,10}$/.test(value)) {
                              handleNestedChange('credits', 'includedCredits', value);
                            }
                          }}
                          maxLength={10}
                          placeholder="0"
                          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all ${formErrors.credits ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                        {formErrors.credits && (
                          <span className="text-xs text-red-500 mt-1">{formErrors.credits}</span>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Credit Type</label>
                        <select
                          name="credits.creditType"
                          value={formData.credits.creditType}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all"
                        >
                          <option value="token">Tokens</option>
                          <option value="request">API Requests</option>
                          <option value="point">Points</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Settings</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="settings.isPublic"
                        checked={formData.settings.isPublic}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] focus:ring-offset-0"
                      />
                      <span className="text-sm text-gray-700">Show on landing page</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isPopular"
                        checked={formData.isPopular}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] focus:ring-offset-0"
                      />
                      <span className="text-sm text-gray-700">Mark as "Most Popular"</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="settings.isDefault"
                        checked={formData.settings.isDefault}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] focus:ring-offset-0"
                      />
                      <span className="text-sm text-gray-700">Default plan for new users</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="settings.allowUpgrade"
                        checked={formData.settings.allowUpgrade}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] focus:ring-offset-0"
                      />
                      <span className="text-sm text-gray-700">Allow upgrade</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="settings.allowDowngrade"
                        checked={formData.settings.allowDowngrade}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] focus:ring-offset-0"
                      />
                      <span className="text-sm text-gray-700">Allow downgrade</span>
                    </label>
                  </div>
                </div>

                {/* Status */}
                <div className="border-t border-gray-100 pt-5">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full sm:w-1/2 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all"
                  >
                    {statuses.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Saving...' : (editingPlan ? 'Update Plan' : 'Create Plan')}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default AdminPlansPage;