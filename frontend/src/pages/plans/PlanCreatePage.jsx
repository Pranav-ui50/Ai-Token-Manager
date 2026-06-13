/**
 * Plan Create Page
 *
 * Create new subscription plans with pricing models, credits, and features.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import planApi from '../../services/api/plan.api.js';
import featureApi from '../../services/api/feature.api.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import { showToast } from '../../utils/toasts.js';

const PlanCreatePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [features, setFeatures] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tier: 'starter',
    billing: {
      price: '',
      currency: 'USD',
      interval: 'month',
      trialDays: 0
    },
    pricingModel: {
      type: 'flat',
      usageBased: {
        pricePerToken: 0,
        pricePerRequest: 0,
        includedTokens: 0,
        includedRequests: 0,
        overageMultiplier: 1
      },
      tiers: []
    },
    credits: {
      includedCredits: 0,
      creditType: 'token',
      rollover: {
        enabled: false,
        maxRolloverPercent: 0,
        expirationMonths: 3
      },
      creditPricing: {
        pricePerCredit: 0,
        bulkDiscounts: [],
        creditPacks: []
      },
      autoRecharge: {
        enabled: false,
        threshold: 100,
        rechargeAmount: 500
      }
    },
    features: [],
    limits: {
      maxUsers: null,
      maxApiCalls: null,
      maxTokens: null,
      maxStorage: null
    },
    settings: {
      isPublic: true,
      isDefault: false,
      allowUpgrade: true,
      allowDowngrade: true
    }
  });

  // Fetch available features
  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const response = await featureApi.getAll({ limit: 100 });
        if (response.success) {
          setFeatures(response.data.features || []);
        }
      } catch (err) {
        console.error('Failed to fetch features:', err);
      }
    };
    fetchFeatures();
  }, []);

  // Handle simple input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : type === 'number' ? (parseFloat(value) || 0) : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : type === 'number' ? (parseFloat(value) || 0) : value
      }));
    }
  };

  // Handle deep nested change (2 levels)
  const handleDeepChange = (parent, child, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: {
          ...prev[parent][child],
          [field]: value
        }
      }
    }));
  };

  // Update formData directly
  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Add pricing tier
  const addTier = () => {
    setFormData(prev => ({
      ...prev,
      pricingModel: {
        ...prev.pricingModel,
        tiers: [
          ...prev.pricingModel.tiers,
          { from: 0, to: null, pricePerUnit: 0, unitType: 'token' }
        ]
      }
    }));
  };

  // Remove pricing tier
  const removeTier = (index) => {
    setFormData(prev => ({
      ...prev,
      pricingModel: {
        ...prev.pricingModel,
        tiers: prev.pricingModel.tiers.filter((_, i) => i !== index)
      }
    }));
  };

  // Update pricing tier
  const updateTier = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      pricingModel: {
        ...prev.pricingModel,
        tiers: prev.pricingModel.tiers.map((tier, i) =>
          i === index ? { ...tier, [field]: value } : tier
        )
      }
    }));
  };

  // Add bulk discount
  const addBulkDiscount = () => {
    setFormData(prev => ({
      ...prev,
      credits: {
        ...prev.credits,
        creditPricing: {
          ...prev.credits.creditPricing,
          bulkDiscounts: [
            ...prev.credits.creditPricing.bulkDiscounts,
            { minQuantity: 0, discountPercent: 0 }
          ]
        }
      }
    }));
  };

  // Remove bulk discount
  const removeBulkDiscount = (index) => {
    setFormData(prev => ({
      ...prev,
      credits: {
        ...prev.credits,
        creditPricing: {
          ...prev.credits.creditPricing,
          bulkDiscounts: prev.credits.creditPricing.bulkDiscounts.filter((_, i) => i !== index)
        }
      }
    }));
  };

  // Add credit pack
  const addCreditPack = () => {
    setFormData(prev => ({
      ...prev,
      credits: {
        ...prev.credits,
        creditPricing: {
          ...prev.credits.creditPricing,
          creditPacks: [
            ...prev.credits.creditPricing.creditPacks,
            { name: '', credits: 0, price: 0 }
          ]
        }
      }
    }));
  };

  // Remove credit pack
  const removeCreditPack = (index) => {
    setFormData(prev => ({
      ...prev,
      credits: {
        ...prev.credits,
        creditPricing: {
          ...prev.credits.creditPricing,
          creditPacks: prev.credits.creditPricing.creditPacks.filter((_, i) => i !== index)
        }
      }
    }));
  };

  // Toggle feature selection
  const toggleFeature = (featureId) => {
    setFormData(prev => {
      const isSelected = prev.features.some(f => f.feature === featureId);
      if (isSelected) {
        return {
          ...prev,
          features: prev.features.filter(f => f.feature !== featureId)
        };
      } else {
        return {
          ...prev,
          features: [
            ...prev.features,
            { feature: featureId, enabled: true, limits: { maxRequests: null, maxTokens: null, multiplier: 1 } }
          ]
        };
      }
    });
  };

  // Update feature limits
  const updateFeatureLimits = (featureId, field, value) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map(f =>
        f.feature === featureId
          ? { ...f, limits: { ...f.limits, [field]: value || null } }
          : f
      )
    }));
  };

  // Clean form data before submission - remove empty values and convert types
  const cleanFormData = (data) => {
    const clean = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) {
        return obj.map(clean).filter(item => item !== null && item !== undefined && item !== '');
      }

      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip null, undefined, empty strings for optional fields
        if (value === null || value === undefined || value === '') {
          continue;
        }

        // Handle nested objects
        if (typeof value === 'object' && !Array.isArray(value)) {
          const cleaned = clean(value);
          if (Object.keys(cleaned).length > 0) {
            result[key] = cleaned;
          }
          continue;
        }

        // Handle arrays
        if (Array.isArray(value)) {
          const cleaned = clean(value);
          if (cleaned.length > 0) {
            result[key] = cleaned;
          }
          continue;
        }

        result[key] = value;
      }
      return result;
    };

    return clean(data);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast.error('Plan name is required');
      return;
    }

    if (!formData.billing.price || formData.billing.price < 0) {
      showToast.error('Valid price is required');
      return;
    }

    setLoading(true);

    try {
      // Clean the form data before submission
      const cleanedData = cleanFormData(formData);

      // Ensure required fields are present
      const submitData = {
        name: cleanedData.name,
        description: cleanedData.description || '',
        tier: cleanedData.tier || 'starter',
        billing: {
          price: parseFloat(cleanedData.billing?.price) || 0,
          currency: cleanedData.billing?.currency || 'USD',
          interval: cleanedData.billing?.interval || 'month',
          trialDays: parseInt(cleanedData.billing?.trialDays) || 0
        }
      };

      // Add optional fields only if they have values
      if (cleanedData.pricingModel && cleanedData.pricingModel.type !== 'flat') {
        submitData.pricingModel = cleanedData.pricingModel;
      }

      if (cleanedData.credits && (cleanedData.credits.includedCredits > 0 || cleanedData.credits.creditPricing?.pricePerCredit > 0)) {
        submitData.credits = cleanedData.credits;
      }

      if (cleanedData.features && cleanedData.features.length > 0) {
        submitData.features = cleanedData.features;
      }

      if (cleanedData.limits) {
        const limits = {};
        if (cleanedData.limits.maxUsers) limits.maxUsers = parseInt(cleanedData.limits.maxUsers);
        if (cleanedData.limits.maxApiCalls) limits.maxApiCalls = parseInt(cleanedData.limits.maxApiCalls);
        if (cleanedData.limits.maxTokens) limits.maxTokens = parseInt(cleanedData.limits.maxTokens);
        if (cleanedData.limits.maxStorage) limits.maxStorage = parseInt(cleanedData.limits.maxStorage);
        if (Object.keys(limits).length > 0) submitData.limits = limits;
      }

      if (cleanedData.settings) {
        submitData.settings = {
          isPublic: cleanedData.settings.isPublic ?? true,
          isDefault: cleanedData.settings.isDefault ?? false,
          allowUpgrade: cleanedData.settings.allowUpgrade ?? true,
          allowDowngrade: cleanedData.settings.allowDowngrade ?? true
        };
      }

      console.log('Submitting plan data:', submitData);

      const response = await planApi.create(submitData);
      if (response.success) {
        showToast.success('Plan created successfully');
        navigate(`/plans/${response.data._id}`);
      }
    } catch (err) {
      console.error('Plan creation error:', err.response?.data);
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create plan';
      showToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const tierOptions = [
    { value: 'free', label: 'Free' },
    { value: 'starter', label: 'Starter' },
    { value: 'professional', label: 'Professional' },
    { value: 'business', label: 'Business' },
    { value: 'enterprise', label: 'Enterprise' }
  ];

  const currencyOptions = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'INR', label: 'INR (₹)' }
  ];

  const intervalOptions = [
    { value: 'month', label: 'Monthly' },
    { value: 'year', label: 'Yearly' },
    { value: 'one-time', label: 'One-time' }
  ];

  const pricingTypeOptions = [
    { value: 'flat', label: 'Flat Rate' },
    { value: 'usage-based', label: 'Usage-Based' },
    { value: 'tiered', label: 'Tiered Pricing' },
    { value: 'hybrid', label: 'Hybrid' }
  ];

  const creditTypeOptions = [
    { value: 'token', label: 'Tokens' },
    { value: 'request', label: 'Requests' },
    { value: 'point', label: 'Points' }
  ];

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: 'document' },
    { id: 'pricing', label: 'Pricing', icon: 'currency' },
    { id: 'credits', label: 'Credits', icon: 'credit' },
    { id: 'features', label: 'Features', icon: 'cube' },
    { id: 'limits', label: 'Limits', icon: 'limits' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  const renderIcon = (icon) => {
    switch (icon) {
      case 'document':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'currency':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'credit':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'cube':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'limits':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'settings':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/plans')}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Create New Plan</h1>
                <p className="text-sm text-gray-500">Configure a new subscription plan</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/plans')}
              >
                Cancel
              </Button>
              <Button
                type="button"
                loading={loading}
                onClick={handleSubmit}
              >
                Create Plan
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#DC2626] text-[#DC2626] bg-red-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {renderIcon(tab.icon)}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plan Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                      placeholder="e.g., Professional Plan"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                      placeholder="Describe what this plan includes..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan Tier</label>
                    <select
                      name="tier"
                      value={formData.tier}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                    >
                      {tierOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Interval</label>
                    <select
                      name="billing.interval"
                      value={formData.billing.interval}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                    >
                      {intervalOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="billing.price"
                      value={formData.billing.price}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      name="billing.currency"
                      value={formData.billing.currency}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                    >
                      {currencyOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trial Days</label>
                    <input
                      type="number"
                      name="billing.trialDays"
                      value={formData.billing.trialDays}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Number of free trial days (0 = no trial)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Model</h3>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Type</label>
                  <select
                    name="pricingModel.type"
                    value={formData.pricingModel.type}
                    onChange={handleChange}
                    className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                  >
                    {pricingTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* Usage-Based Pricing */}
                {formData.pricingModel.type === 'usage-based' && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-gray-900">Usage-Based Pricing</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Token ($)</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={formData.pricingModel.usageBased.pricePerToken}
                          onChange={(e) => handleDeepChange('pricingModel', 'usageBased', 'pricePerToken', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Request ($)</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={formData.pricingModel.usageBased.pricePerRequest}
                          onChange={(e) => handleDeepChange('pricingModel', 'usageBased', 'pricePerRequest', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Included Tokens</label>
                        <input
                          type="number"
                          value={formData.pricingModel.usageBased.includedTokens}
                          onChange={(e) => handleDeepChange('pricingModel', 'usageBased', 'includedTokens', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Included Requests</label>
                        <input
                          type="number"
                          value={formData.pricingModel.usageBased.includedRequests}
                          onChange={(e) => handleDeepChange('pricingModel', 'usageBased', 'includedRequests', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Overage Multiplier</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.pricingModel.usageBased.overageMultiplier}
                          onChange={(e) => handleDeepChange('pricingModel', 'usageBased', 'overageMultiplier', parseFloat(e.target.value) || 1)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tiered Pricing */}
                {formData.pricingModel.type === 'tiered' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Pricing Tiers</h4>
                      <button
                        type="button"
                        onClick={addTier}
                        className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
                      >
                        + Add Tier
                      </button>
                    </div>
                    {formData.pricingModel.tiers.length === 0 ? (
                      <p className="text-gray-500 text-sm">No tiers added. Click "Add Tier" to create pricing tiers.</p>
                    ) : (
                      <div className="space-y-3">
                        {formData.pricingModel.tiers.map((tier, index) => (
                          <div key={index} className="flex items-end gap-4 bg-gray-50 p-4 rounded-lg">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                              <input
                                type="number"
                                value={tier.from}
                                onChange={(e) => updateTier(index, 'from', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                              <input
                                type="number"
                                value={tier.to || ''}
                                onChange={(e) => updateTier(index, 'to', e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="Unlimited"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Price/Unit ($)</label>
                              <input
                                type="number"
                                step="0.0001"
                                value={tier.pricePerUnit}
                                onChange={(e) => updateTier(index, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type</label>
                              <select
                                value={tier.unitType}
                                onChange={(e) => updateTier(index, 'unitType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                              >
                                <option value="token">Tokens</option>
                                <option value="request">Requests</option>
                                <option value="user">Users</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTier(index)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Credits Tab */}
          {activeTab === 'credits' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Included Credits</label>
                    <input
                      type="number"
                      value={formData.credits.includedCredits}
                      onChange={(e) => updateFormData({
                        credits: { ...formData.credits, includedCredits: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credit Type</label>
                    <select
                      value={formData.credits.creditType}
                      onChange={(e) => updateFormData({
                        credits: { ...formData.credits, creditType: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                    >
                      {creditTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Rollover Settings */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Credit Rollover</h4>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.credits.rollover.enabled}
                      onChange={(e) => updateFormData({
                        credits: { ...formData.credits, rollover: { ...formData.credits.rollover, enabled: e.target.checked } }
                      })}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="ml-2 text-sm text-gray-600">Enable Rollover</span>
                  </label>
                </div>
                {formData.credits.rollover.enabled && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Rollover %</label>
                        <input
                          type="number"
                          value={formData.credits.rollover.maxRolloverPercent}
                          onChange={(e) => updateFormData({
                            credits: { ...formData.credits, rollover: { ...formData.credits.rollover, maxRolloverPercent: parseInt(e.target.value) || 0 } }
                          })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiration (months)</label>
                        <input
                          type="number"
                          value={formData.credits.rollover.expirationMonths}
                          onChange={(e) => updateFormData({
                            credits: { ...formData.credits, rollover: { ...formData.credits.rollover, expirationMonths: parseInt(e.target.value) || 3 } }
                          })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Credit Pricing */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Credit Pricing</h4>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Credit ($)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.credits.creditPricing.pricePerCredit}
                    onChange={(e) => updateFormData({
                      credits: { ...formData.credits, creditPricing: { ...formData.credits.creditPricing, pricePerCredit: parseFloat(e.target.value) || 0 } }
                    })}
                    className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                  />
                </div>

                {/* Bulk Discounts */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-gray-700">Bulk Discounts</h5>
                    <button
                      type="button"
                      onClick={addBulkDiscount}
                      className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
                    >
                      + Add Discount
                    </button>
                  </div>
                  {formData.credits.creditPricing.bulkDiscounts.map((discount, index) => (
                    <div key={index} className="flex items-end gap-4 mb-3">
                      <div className="flex-1">
                        <label className="block text-sm text-gray-600 mb-1">Min Qty</label>
                        <input
                          type="number"
                          value={discount.minQuantity}
                          onChange={(e) => {
                            const newDiscounts = [...formData.credits.creditPricing.bulkDiscounts];
                            newDiscounts[index] = { ...discount, minQuantity: parseInt(e.target.value) || 0 };
                            updateFormData({
                              credits: { ...formData.credits, creditPricing: { ...formData.credits.creditPricing, bulkDiscounts: newDiscounts } }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm text-gray-600 mb-1">Discount %</label>
                        <input
                          type="number"
                          value={discount.discountPercent}
                          onChange={(e) => {
                            const newDiscounts = [...formData.credits.creditPricing.bulkDiscounts];
                            newDiscounts[index] = { ...discount, discountPercent: parseFloat(e.target.value) || 0 };
                            updateFormData({
                              credits: { ...formData.credits, creditPricing: { ...formData.credits.creditPricing, bulkDiscounts: newDiscounts } }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBulkDiscount(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Credit Packs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-gray-700">Credit Packs</h5>
                    <button
                      type="button"
                      onClick={addCreditPack}
                      className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
                    >
                      + Add Pack
                    </button>
                  </div>
                  {formData.credits.creditPricing.creditPacks.map((pack, index) => (
                    <div key={index} className="flex items-end gap-4 mb-3">
                      <div className="flex-1">
                        <label className="block text-sm text-gray-600 mb-1">Name</label>
                        <input
                          type="text"
                          value={pack.name}
                          onChange={(e) => {
                            const newPacks = [...formData.credits.creditPricing.creditPacks];
                            newPacks[index] = { ...pack, name: e.target.value };
                            updateFormData({
                              credits: { ...formData.credits, creditPricing: { ...formData.credits.creditPricing, creditPacks: newPacks } }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                          placeholder="Pack name"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-sm text-gray-600 mb-1">Credits</label>
                        <input
                          type="number"
                          value={pack.credits}
                          onChange={(e) => {
                            const newPacks = [...formData.credits.creditPricing.creditPacks];
                            newPacks[index] = { ...pack, credits: parseInt(e.target.value) || 0 };
                            updateFormData({
                              credits: { ...formData.credits, creditPricing: { ...formData.credits.creditPricing, creditPacks: newPacks } }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-sm text-gray-600 mb-1">Price ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={pack.price}
                          onChange={(e) => {
                            const newPacks = [...formData.credits.creditPricing.creditPacks];
                            newPacks[index] = { ...pack, price: parseFloat(e.target.value) || 0 };
                            updateFormData({
                              credits: { ...formData.credits, creditPricing: { ...formData.credits.creditPricing, creditPacks: newPacks } }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCreditPack(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-Recharge */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Auto-Recharge</h4>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.credits.autoRecharge.enabled}
                      onChange={(e) => updateFormData({
                        credits: { ...formData.credits, autoRecharge: { ...formData.credits.autoRecharge, enabled: e.target.checked } }
                      })}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="ml-2 text-sm text-gray-600">Enable</span>
                  </label>
                </div>
                {formData.credits.autoRecharge.enabled && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Threshold (credits)</label>
                        <input
                          type="number"
                          value={formData.credits.autoRecharge.threshold}
                          onChange={(e) => updateFormData({
                            credits: { ...formData.credits, autoRecharge: { ...formData.credits.autoRecharge, threshold: parseInt(e.target.value) || 100 } }
                          })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Recharge Amount</label>
                        <input
                          type="number"
                          value={formData.credits.autoRecharge.rechargeAmount}
                          onChange={(e) => updateFormData({
                            credits: { ...formData.credits, autoRecharge: { ...formData.credits.autoRecharge, rechargeAmount: parseInt(e.target.value) || 500 } }
                          })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Features</h3>
              {features.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-gray-500 mb-2">No features available</p>
                  <p className="text-sm text-gray-400">Create features first to add them to this plan.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {features.map(feature => {
                    const selectedFeature = formData.features.find(f => f.feature === feature._id);
                    return (
                      <div key={feature._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!selectedFeature}
                              onChange={() => toggleFeature(feature._id)}
                              className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                            />
                            <div className="ml-3">
                              <span className="font-medium text-gray-900">{feature.name}</span>
                              <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{feature.category}</span>
                            </div>
                          </label>
                          {selectedFeature && (
                            <span className="text-sm text-green-600 font-medium">Included</span>
                          )}
                        </div>
                        {selectedFeature && (
                          <div className="mt-4 pl-8 grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">Max Requests</label>
                              <input
                                type="number"
                                value={selectedFeature.limits.maxRequests || ''}
                                onChange={(e) => updateFeatureLimits(feature._id, 'maxRequests', e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="Unlimited"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">Max Tokens</label>
                              <input
                                type="number"
                                value={selectedFeature.limits.maxTokens || ''}
                                onChange={(e) => updateFeatureLimits(feature._id, 'maxTokens', e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="Unlimited"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">Multiplier</label>
                              <input
                                type="number"
                                step="0.1"
                                value={selectedFeature.limits.multiplier}
                                onChange={(e) => updateFeatureLimits(feature._id, 'multiplier', parseFloat(e.target.value) || 1)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Limits Tab */}
          {activeTab === 'limits' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Plan Limits</h3>
              <p className="text-sm text-gray-500 mb-6">Set usage limits for the plan. Leave empty for unlimited.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                  <input
                    type="number"
                    value={formData.limits.maxUsers || ''}
                    onChange={(e) => updateFormData({
                      limits: { ...formData.limits, maxUsers: e.target.value ? parseInt(e.target.value) : null }
                    })}
                    placeholder="Unlimited"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max API Calls</label>
                  <input
                    type="number"
                    value={formData.limits.maxApiCalls || ''}
                    onChange={(e) => updateFormData({
                      limits: { ...formData.limits, maxApiCalls: e.target.value ? parseInt(e.target.value) : null }
                    })}
                    placeholder="Unlimited"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
                  <input
                    type="number"
                    value={formData.limits.maxTokens || ''}
                    onChange={(e) => updateFormData({
                      limits: { ...formData.limits, maxTokens: e.target.value ? parseInt(e.target.value) : null }
                    })}
                    placeholder="Unlimited"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Storage (MB)</label>
                  <input
                    type="number"
                    value={formData.limits.maxStorage || ''}
                    onChange={(e) => updateFormData({
                      limits: { ...formData.limits, maxStorage: e.target.value ? parseInt(e.target.value) : null }
                    })}
                    placeholder="Unlimited"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Presets</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateFormData({
                      limits: { maxUsers: 1, maxApiCalls: 1000, maxTokens: 10000, maxStorage: 100 }
                    })}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Free Tier
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData({
                      limits: { maxUsers: 5, maxApiCalls: 10000, maxTokens: 100000, maxStorage: 1000 }
                    })}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Starter
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData({
                      limits: { maxUsers: 25, maxApiCalls: 100000, maxTokens: 1000000, maxStorage: 10000 }
                    })}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Professional
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData({
                      limits: { maxUsers: 100, maxApiCalls: 500000, maxTokens: 5000000, maxStorage: 50000 }
                    })}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Business
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData({
                      limits: { maxUsers: null, maxApiCalls: null, maxTokens: null, maxStorage: null }
                    })}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Unlimited
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Settings</h3>
              <div className="space-y-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="settings.isPublic"
                    checked={formData.settings.isPublic}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">Publicly visible</span>
                    <p className="text-sm text-gray-500">Plan will be visible to all users on the pricing page</p>
                  </div>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="settings.isDefault"
                    checked={formData.settings.isDefault}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">Default plan</span>
                    <p className="text-sm text-gray-500">New users will be assigned this plan by default</p>
                  </div>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="settings.allowUpgrade"
                    checked={formData.settings.allowUpgrade}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">Allow upgrades</span>
                    <p className="text-sm text-gray-500">Users can upgrade to a higher tier plan</p>
                  </div>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="settings.allowDowngrade"
                    checked={formData.settings.allowDowngrade}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">Allow downgrades</span>
                    <p className="text-sm text-gray-500">Users can downgrade to a lower tier plan</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              {activeTab !== 'basic' && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = tabs.findIndex(t => t.id === activeTab);
                    if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1].id);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  ← Previous
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeTab !== 'settings' && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = tabs.findIndex(t => t.id === activeTab);
                    if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1].id);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Next →
                </button>
              )}
              <Button
                type="submit"
                loading={loading}
                className="bg-[#DC2626] hover:bg-[#B91C1C]"
              >
                Create Plan
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanCreatePage;