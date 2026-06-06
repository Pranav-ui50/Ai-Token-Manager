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
import PricingLimits from '../../components/pricing/PricingLimits.jsx';

const PlanCreatePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    costs: {
      fixedCostsPerMonth: 0,
      variableCostPercentage: 2.9
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

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value
      }));
    }
  };

  // Handle nested object change (2 levels deep)
  const handleNestedChange = (parent, child, field, value) => {
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Plan name is required');
      return;
    }

    if (!formData.billing.price || formData.billing.price < 0) {
      setError('Valid price is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await planApi.create(formData);
      if (response.success) {
        navigate(`/plans/${response.data._id}`);
      }
    } catch (err) {
      console.error('Plan creation error:', err.response?.data);
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create plan';
      setError(errorMessage);
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
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'GBP', label: 'GBP' },
    { value: 'INR', label: 'INR' }
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
    { id: 'basic', label: 'Basic Info' },
    { id: 'pricing', label: 'Pricing Model' },
    { id: 'credits', label: 'Credits' },
    { id: 'features', label: 'Features' },
    { id: 'limits', label: 'Limits' },
    { id: 'pricingLimits', label: 'Pricing Limits' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/plans')}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Plan</h1>
                <p className="text-sm text-gray-500">Configure a new subscription plan</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-soft mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#DC2626] text-[#DC2626]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="bg-white rounded-xl shadow-soft p-6 space-y-6">
              <Input
                label="Plan Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Professional Plan"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                  placeholder="Describe what this plan includes..."
                />
              </div>

              <Select
                label="Plan Tier"
                name="tier"
                value={formData.tier}
                onChange={handleChange}
                options={tierOptions}
              />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input
                    type="number"
                    name="billing.price"
                    value={formData.billing.price}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                <Select
                  label="Currency"
                  name="billing.currency"
                  value={formData.billing.currency}
                  onChange={handleChange}
                  options={currencyOptions}
                />
                <Select
                  label="Billing Interval"
                  name="billing.interval"
                  value={formData.billing.interval}
                  onChange={handleChange}
                  options={intervalOptions}
                />
              </div>

              <Input
                label="Trial Days"
                name="billing.trialDays"
                type="number"
                value={formData.billing.trialDays}
                onChange={handleChange}
                min="0"
                helperText="Number of free trial days (0 for no trial)"
              />
            </div>
          )}

          {/* Pricing Model Tab */}
          {activeTab === 'pricing' && (
            <div className="bg-white rounded-xl shadow-soft p-6 space-y-6">
              <Select
                label="Pricing Model Type"
                name="pricingModel.type"
                value={formData.pricingModel.type}
                onChange={handleChange}
                options={pricingTypeOptions}
              />

              {/* Usage-Based Pricing */}
              {formData.pricingModel.type === 'usage-based' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900">Usage-Based Pricing</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Price Per Token ($)"
                      type="number"
                      step="0.000001"
                      value={formData.pricingModel.usageBased.pricePerToken}
                      onChange={(e) => handleNestedChange('pricingModel', 'usageBased', 'pricePerToken', parseFloat(e.target.value))}
                    />
                    <Input
                      label="Price Per Request ($)"
                      type="number"
                      step="0.000001"
                      value={formData.pricingModel.usageBased.pricePerRequest}
                      onChange={(e) => handleNestedChange('pricingModel', 'usageBased', 'pricePerRequest', parseFloat(e.target.value))}
                    />
                    <Input
                      label="Included Tokens"
                      type="number"
                      value={formData.pricingModel.usageBased.includedTokens}
                      onChange={(e) => handleNestedChange('pricingModel', 'usageBased', 'includedTokens', parseInt(e.target.value))}
                    />
                    <Input
                      label="Included Requests"
                      type="number"
                      value={formData.pricingModel.usageBased.includedRequests}
                      onChange={(e) => handleNestedChange('pricingModel', 'usageBased', 'includedRequests', parseInt(e.target.value))}
                    />
                    <Input
                      label="Overage Multiplier"
                      type="number"
                      step="0.1"
                      value={formData.pricingModel.usageBased.overageMultiplier}
                      onChange={(e) => handleNestedChange('pricingModel', 'usageBased', 'overageMultiplier', parseFloat(e.target.value))}
                    />
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
                      className="text-sm text-[#DC2626] hover:text-[#B91C1C]"
                    >
                      + Add Tier
                    </button>
                  </div>
                  {formData.pricingModel.tiers.map((tier, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <Input
                        label="From"
                        type="number"
                        value={tier.from}
                        onChange={(e) => updateTier(index, 'from', parseInt(e.target.value))}
                      />
                      <Input
                        label="To"
                        type="number"
                        value={tier.to || ''}
                        onChange={(e) => updateTier(index, 'to', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Leave empty for unlimited"
                      />
                      <Input
                        label="Price/Unit"
                        type="number"
                        step="0.0001"
                        value={tier.pricePerUnit}
                        onChange={(e) => updateTier(index, 'pricePerUnit', parseFloat(e.target.value))}
                      />
                      <Select
                        label="Unit Type"
                        value={tier.unitType}
                        onChange={(e) => updateTier(index, 'unitType', e.target.value)}
                        options={[
                          { value: 'token', label: 'Tokens' },
                          { value: 'request', label: 'Requests' },
                          { value: 'user', label: 'Users' }
                        ]}
                      />
                      {formData.pricingModel.tiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTier(index)}
                          className="text-red-500 hover:text-red-700 mt-6"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Cost Analysis */}
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-gray-900">Cost Analysis</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Fixed Costs/Month ($)"
                    type="number"
                    step="0.01"
                    value={formData.costs.fixedCostsPerMonth}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      costs: { ...prev.costs, fixedCostsPerMonth: parseFloat(e.target.value) || 0 }
                    }))}
                  />
                  <Input
                    label="Variable Cost % (e.g., payment processing)"
                    type="number"
                    step="0.1"
                    value={formData.costs.variableCostPercentage}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      costs: { ...prev.costs, variableCostPercentage: parseFloat(e.target.value) || 0 }
                    }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Credits Tab */}
          {activeTab === 'credits' && (
            <div className="bg-white rounded-xl shadow-soft p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Included Credits"
                  type="number"
                  value={formData.credits.includedCredits}
                  onChange={(e) => handleNestedChange('credits', 'includedCredits', 'includedCredits', parseInt(e.target.value))}
                />
                <Select
                  label="Credit Type"
                  value={formData.credits.creditType}
                  onChange={(e) => handleNestedChange('credits', 'creditType', 'creditType', e.target.value)}
                  options={creditTypeOptions}
                />
              </div>

              {/* Rollover Settings */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Credit Rollover</h4>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.credits.rollover.enabled}
                      onChange={(e) => handleNestedChange('credits', 'rollover', 'enabled', e.target.checked)}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="ml-2 text-sm text-gray-600">Enable Rollover</span>
                  </label>
                </div>
                {formData.credits.rollover.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Max Rollover %"
                      type="number"
                      value={formData.credits.rollover.maxRolloverPercent}
                      onChange={(e) => handleNestedChange('credits', 'rollover', 'maxRolloverPercent', parseInt(e.target.value))}
                    />
                    <Input
                      label="Expiration (months)"
                      type="number"
                      value={formData.credits.rollover.expirationMonths}
                      onChange={(e) => handleNestedChange('credits', 'rollover', 'expirationMonths', parseInt(e.target.value))}
                    />
                  </div>
                )}
              </div>

              {/* Credit Pricing */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900">Credit Pricing</h4>
                <Input
                  label="Price Per Credit ($)"
                  type="number"
                  step="0.0001"
                  value={formData.credits.creditPricing.pricePerCredit}
                  onChange={(e) => handleNestedChange('credits', 'creditPricing', 'pricePerCredit', parseFloat(e.target.value))}
                />

                {/* Bulk Discounts */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-gray-700">Bulk Discounts</h5>
                    <button
                      type="button"
                      onClick={addBulkDiscount}
                      className="text-sm text-[#DC2626] hover:text-[#B91C1C]"
                    >
                      + Add Discount
                    </button>
                  </div>
                  {formData.credits.creditPricing.bulkDiscounts.map((discount, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <Input
                        label="Min Qty"
                        type="number"
                        value={discount.minQuantity}
                        onChange={(e) => {
                          const newDiscounts = [...formData.credits.creditPricing.bulkDiscounts];
                          newDiscounts[index] = { ...discount, minQuantity: parseInt(e.target.value) };
                          setFormData(prev => ({
                            ...prev,
                            credits: {
                              ...prev.credits,
                              creditPricing: { ...prev.credits.creditPricing, bulkDiscounts: newDiscounts }
                            }
                          }));
                        }}
                      />
                      <Input
                        label="Discount %"
                        type="number"
                        value={discount.discountPercent}
                        onChange={(e) => {
                          const newDiscounts = [...formData.credits.creditPricing.bulkDiscounts];
                          newDiscounts[index] = { ...discount, discountPercent: parseFloat(e.target.value) };
                          setFormData(prev => ({
                            ...prev,
                            credits: {
                              ...prev.credits,
                              creditPricing: { ...prev.credits.creditPricing, bulkDiscounts: newDiscounts }
                            }
                          }));
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeBulkDiscount(index)}
                        className="text-red-500 hover:text-red-700 mt-6"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Credit Packs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-gray-700">Credit Packs</h5>
                    <button
                      type="button"
                      onClick={addCreditPack}
                      className="text-sm text-[#DC2626] hover:text-[#B91C1C]"
                    >
                      + Add Pack
                    </button>
                  </div>
                  {formData.credits.creditPricing.creditPacks.map((pack, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <Input
                        label="Name"
                        value={pack.name}
                        onChange={(e) => {
                          const newPacks = [...formData.credits.creditPricing.creditPacks];
                          newPacks[index] = { ...pack, name: e.target.value };
                          setFormData(prev => ({
                            ...prev,
                            credits: {
                              ...prev.credits,
                              creditPricing: { ...prev.credits.creditPricing, creditPacks: newPacks }
                            }
                          }));
                        }}
                      />
                      <Input
                        label="Credits"
                        type="number"
                        value={pack.credits}
                        onChange={(e) => {
                          const newPacks = [...formData.credits.creditPricing.creditPacks];
                          newPacks[index] = { ...pack, credits: parseInt(e.target.value) };
                          setFormData(prev => ({
                            ...prev,
                            credits: {
                              ...prev.credits,
                              creditPricing: { ...prev.credits.creditPricing, creditPacks: newPacks }
                            }
                          }));
                        }}
                      />
                      <Input
                        label="Price ($)"
                        type="number"
                        step="0.01"
                        value={pack.price}
                        onChange={(e) => {
                          const newPacks = [...formData.credits.creditPricing.creditPacks];
                          newPacks[index] = { ...pack, price: parseFloat(e.target.value) };
                          setFormData(prev => ({
                            ...prev,
                            credits: {
                              ...prev.credits,
                              creditPricing: { ...prev.credits.creditPricing, creditPacks: newPacks }
                            }
                          }));
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeCreditPack(index)}
                        className="text-red-500 hover:text-red-700 mt-6"
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
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Auto-Recharge</h4>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.credits.autoRecharge.enabled}
                      onChange={(e) => handleNestedChange('credits', 'autoRecharge', 'enabled', e.target.checked)}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="ml-2 text-sm text-gray-600">Enable</span>
                  </label>
                </div>
                {formData.credits.autoRecharge.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Threshold (credits)"
                      type="number"
                      value={formData.credits.autoRecharge.threshold}
                      onChange={(e) => handleNestedChange('credits', 'autoRecharge', 'threshold', parseInt(e.target.value))}
                    />
                    <Input
                      label="Recharge Amount"
                      type="number"
                      value={formData.credits.autoRecharge.rechargeAmount}
                      onChange={(e) => handleNestedChange('credits', 'autoRecharge', 'rechargeAmount', parseInt(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="bg-white rounded-xl shadow-soft p-6 space-y-6">
              <h4 className="font-medium text-gray-900">Available Features</h4>
              {features.length === 0 ? (
                <p className="text-gray-500">No features available. Create features first.</p>
              ) : (
                <div className="space-y-2">
                  {features.map(feature => {
                    const selectedFeature = formData.features.find(f => f.feature === feature._id);
                    return (
                      <div key={feature._id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={!!selectedFeature}
                              onChange={() => toggleFeature(feature._id)}
                              className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                            />
                            <span className="ml-2">
                              <span className="font-medium text-gray-900">{feature.name}</span>
                              <span className="ml-2 text-xs text-gray-500">{feature.category}</span>
                            </span>
                          </label>
                          {selectedFeature && (
                            <span className="text-sm text-green-600">Included</span>
                          )}
                        </div>
                        {selectedFeature && (
                          <div className="mt-3 pl-6 grid grid-cols-3 gap-4">
                            <Input
                              label="Max Requests (null = unlimited)"
                              type="number"
                              value={selectedFeature.limits.maxRequests || ''}
                              onChange={(e) => updateFeatureLimits(feature._id, 'maxRequests', e.target.value ? parseInt(e.target.value) : null)}
                            />
                            <Input
                              label="Max Tokens (null = unlimited)"
                              type="number"
                              value={selectedFeature.limits.maxTokens || ''}
                              onChange={(e) => updateFeatureLimits(feature._id, 'maxTokens', e.target.value ? parseInt(e.target.value) : null)}
                            />
                            <Input
                              label="Multiplier"
                              type="number"
                              step="0.1"
                              value={selectedFeature.limits.multiplier}
                              onChange={(e) => updateFeatureLimits(feature._id, 'multiplier', parseFloat(e.target.value))}
                            />
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
            <div className="bg-white rounded-xl shadow-soft p-6 space-y-6">
              <h4 className="font-medium text-gray-900">Plan Limits</h4>
              <p className="text-sm text-gray-500">Set usage limits for the plan. Leave empty for unlimited.</p>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Max Users"
                  type="number"
                  value={formData.limits.maxUsers || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    limits: { ...prev.limits, maxUsers: e.target.value ? parseInt(e.target.value) : null }
                  }))}
                  placeholder="Unlimited"
                />
                <Input
                  label="Max API Calls"
                  type="number"
                  value={formData.limits.maxApiCalls || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    limits: { ...prev.limits, maxApiCalls: e.target.value ? parseInt(e.target.value) : null }
                  }))}
                  placeholder="Unlimited"
                />
                <Input
                  label="Max Tokens"
                  type="number"
                  value={formData.limits.maxTokens || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    limits: { ...prev.limits, maxTokens: e.target.value ? parseInt(e.target.value) : null }
                  }))}
                  placeholder="Unlimited"
                />
                <Input
                  label="Max Storage (MB)"
                  type="number"
                  value={formData.limits.maxStorage || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    limits: { ...prev.limits, maxStorage: e.target.value ? parseInt(e.target.value) : null }
                  }))}
                  placeholder="Unlimited"
                />
              </div>
            </div>
          )}

          {/* Pricing Limits Tab */}
          {activeTab === 'pricingLimits' && (
            <PricingLimits
              value={formData.pricingLimits || {}}
              onChange={(pricingLimits) => setFormData(prev => ({ ...prev, pricingLimits }))}
              planTier={formData.tier}
              isEditing={true}
            />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl shadow-soft p-6 space-y-6">
              <h4 className="font-medium text-gray-900">Plan Settings</h4>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="settings.isPublic"
                    checked={formData.settings.isPublic}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Publicly visible</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="settings.isDefault"
                    checked={formData.settings.isDefault}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Default plan for new users</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="settings.allowUpgrade"
                    checked={formData.settings.allowUpgrade}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Allow plan upgrades</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="settings.allowDowngrade"
                    checked={formData.settings.allowDowngrade}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Allow plan downgrades</span>
                </label>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/plans')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
            >
              Create Plan
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default PlanCreatePage;