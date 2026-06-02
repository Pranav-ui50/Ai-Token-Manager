/**
 * Pricing Limits Component
 *
 * Configure pricing limits, thresholds, and overage rules for plans.
 */

import { useState } from 'react';

const PricingLimits = ({
  value = {},
  onChange,
  planTier = 'starter',
  isEditing = true
}) => {
  const [activeSection, setActiveSection] = useState('thresholds');

  // Default values based on plan tier
  const defaultLimits = {
    free: {
      maxMonthlySpend: 0,
      maxOverageRate: 1,
      alertThresholds: [50, 75, 90],
      hardLimits: {
        maxApiCalls: 1000,
        maxTokens: 10000,
        maxStorage: 100
      },
      overagePricing: {
        enabled: false,
        tokenRate: 0,
        callRate: 0
      },
      rateLimits: {
        requestsPerMinute: 10,
        tokensPerMinute: 1000
      }
    },
    starter: {
      maxMonthlySpend: 100,
      maxOverageRate: 1.5,
      alertThresholds: [50, 75, 90, 100],
      hardLimits: {
        maxApiCalls: 10000,
        maxTokens: 100000,
        maxStorage: 1000
      },
      overagePricing: {
        enabled: true,
        tokenRate: 0.0001,
        callRate: 0.01
      },
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 10000
      }
    },
    professional: {
      maxMonthlySpend: 500,
      maxOverageRate: 1.3,
      alertThresholds: [70, 85, 95, 100],
      hardLimits: {
        maxApiCalls: 100000,
        maxTokens: 1000000,
        maxStorage: 10000
      },
      overagePricing: {
        enabled: true,
        tokenRate: 0.00005,
        callRate: 0.005
      },
      rateLimits: {
        requestsPerMinute: 300,
        tokensPerMinute: 50000
      }
    },
    business: {
      maxMonthlySpend: 2000,
      maxOverageRate: 1.2,
      alertThresholds: [75, 90, 100],
      hardLimits: {
        maxApiCalls: 500000,
        maxTokens: 5000000,
        maxStorage: 50000
      },
      overagePricing: {
        enabled: true,
        tokenRate: 0.00003,
        callRate: 0.003
      },
      rateLimits: {
        requestsPerMinute: 1000,
        tokensPerMinute: 200000
      }
    },
    enterprise: {
      maxMonthlySpend: -1, // Unlimited
      maxOverageRate: 1,
      alertThresholds: [80, 95],
      hardLimits: {
        maxApiCalls: -1, // Unlimited
        maxTokens: -1,
        maxStorage: -1
      },
      overagePricing: {
        enabled: false,
        tokenRate: 0,
        callRate: 0
      },
      rateLimits: {
        requestsPerMinute: 5000,
        tokensPerMinute: 1000000
      }
    }
  };

  // Merge provided value with defaults
  const limits = {
    ...defaultLimits[planTier] || defaultLimits.starter,
    ...value
  };

  // Handle changes
  const handleChange = (section, field, fieldValue) => {
    if (!isEditing) return;

    onChange({
      ...limits,
      [section]: {
        ...limits[section],
        [field]: fieldValue
      }
    });
  };

  // Handle nested changes
  const handleNestedChange = (section, parent, field, fieldValue) => {
    if (!isEditing) return;

    onChange({
      ...limits,
      [section]: {
        ...limits[section],
        [parent]: {
          ...(limits[section]?.[parent] || {}),
          [field]: fieldValue
        }
      }
    });
  };

  // Add alert threshold
  const addThreshold = () => {
    if (!isEditing) return;
    const currentThresholds = limits.alertThresholds || [];
    if (currentThresholds.length >= 5) return;
    const newThreshold = Math.min(100, Math.max(...currentThresholds) + 10);
    onChange({
      ...limits,
      alertThresholds: [...currentThresholds, newThreshold].sort((a, b) => a - b)
    });
  };

  // Remove alert threshold
  const removeThreshold = (index) => {
    if (!isEditing) return;
    onChange({
      ...limits,
      alertThresholds: limits.alertThresholds.filter((_, i) => i !== index)
    });
  };

  // Format currency
  const formatCurrency = (value) => {
    if (value === -1) return 'Unlimited';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  // Format number
  const formatNumber = (value) => {
    if (value === -1) return 'Unlimited';
    return (value || 0).toLocaleString();
  };

  const sections = [
    { id: 'thresholds', label: 'Alert Thresholds' },
    { id: 'hardLimits', label: 'Hard Limits' },
    { id: 'overagePricing', label: 'Overage Pricing' },
    { id: 'rateLimits', label: 'Rate Limits' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-soft">
      {/* Section Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeSection === section.id
                  ? 'border-[#DC2626] text-[#DC2626]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Alert Thresholds Section */}
        {activeSection === 'thresholds' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Usage Alert Thresholds</h3>
              <p className="text-sm text-gray-500 mb-4">
                Configure at what usage percentages users should receive alerts.
              </p>

              {/* Max Monthly Spend */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Monthly Spend
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={limits.maxMonthlySpend === -1 ? '' : limits.maxMonthlySpend}
                      onChange={(e) => onChange({ ...limits, maxMonthlySpend: parseFloat(e.target.value) || 0 })}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 disabled:bg-gray-100"
                      placeholder="Enter max spend (-1 for unlimited)"
                    />
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={limits.maxMonthlySpend === -1}
                      onChange={(e) => onChange({ ...limits, maxMonthlySpend: e.target.checked ? -1 : 0 })}
                      disabled={!isEditing}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="ml-2 text-sm text-gray-600">Unlimited</span>
                  </label>
                </div>
              </div>

              {/* Alert Thresholds */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Thresholds (%)
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {limits.alertThresholds?.map((threshold, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="number"
                          value={threshold}
                          onChange={(e) => {
                            const newThresholds = [...limits.alertThresholds];
                            newThresholds[index] = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            onChange({ ...limits, alertThresholds: newThresholds });
                          }}
                          disabled={!isEditing}
                          className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 disabled:bg-gray-100"
                          min="0"
                          max="100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                      </div>
                      {isEditing && limits.alertThresholds.length > 1 && (
                        <button
                          onClick={() => removeThreshold(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  {isEditing && limits.alertThresholds?.length < 5 && (
                    <button
                      onClick={addThreshold}
                      className="px-3 py-2 text-sm text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg transition-colors"
                    >
                      + Add Threshold
                    </button>
                  )}
                </div>

                {/* Threshold Visualization */}
                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className="absolute inset-0 flex">
                    {[0, 25, 50, 75, 100].map((mark) => (
                      <div key={mark} className="flex-1 border-r border-gray-300" />
                    ))}
                  </div>
                  {limits.alertThresholds?.map((threshold, index) => (
                    <div
                      key={index}
                      className={`absolute top-0 bottom-0 w-1 ${index === 0 ? 'bg-green-500' : index === limits.alertThresholds.length - 1 ? 'bg-red-500' : 'bg-yellow-500'}`}
                      style={{ left: `${threshold}%` }}
                      title={`${threshold}%`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Overage Rate Multiplier */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overage Rate Multiplier
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={limits.maxOverageRate}
                    onChange={(e) => onChange({ ...limits, maxOverageRate: parseFloat(e.target.value) || 1 })}
                    disabled={!isEditing}
                    className="w-32 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 disabled:bg-gray-100"
                    min="1"
                    max="5"
                    step="0.1"
                  />
                  <span className="text-sm text-gray-500">x normal rate</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Maximum multiplier applied to overage rates</p>
              </div>
            </div>
          </div>
        )}

        {/* Hard Limits Section */}
        {activeSection === 'hardLimits' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Hard Usage Limits</h3>
              <p className="text-sm text-gray-500 mb-4">
                Set absolute limits on resource usage. Set to -1 for unlimited.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Max API Calls */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max API Calls / Month
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={limits.hardLimits?.maxApiCalls === -1 ? '' : limits.hardLimits?.maxApiCalls}
                      onChange={(e) => handleNestedChange('hardLimits', 'maxApiCalls', 'maxApiCalls', parseInt(e.target.value) || 0)}
                      disabled={!isEditing}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 disabled:bg-gray-100"
                      placeholder="Enter limit"
                    />
                    <button
                      onClick={() => handleNestedChange('hardLimits', 'maxApiCalls', 'maxApiCalls', -1)}
                      disabled={!isEditing}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        limits.hardLimits?.maxApiCalls === -1
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      ∞
                    </button>
                  </div>
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Tokens / Month
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={limits.hardLimits?.maxTokens === -1 ? '' : limits.hardLimits?.maxTokens}
                      onChange={(e) => handleNestedChange('hardLimits', 'maxTokens', 'maxTokens', parseInt(e.target.value) || 0)}
                      disabled={!isEditing}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 disabled:bg-gray-100"
                      placeholder="Enter limit"
                    />
                    <button
                      onClick={() => handleNestedChange('hardLimits', 'maxTokens', 'maxTokens', -1)}
                      disabled={!isEditing}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        limits.hardLimits?.maxTokens === -1
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      ∞
                    </button>
                  </div>
                </div>

                {/* Max Storage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Storage (MB)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={limits.hardLimits?.maxStorage === -1 ? '' : limits.hardLimits?.maxStorage}
                      onChange={(e) => handleNestedChange('hardLimits', 'maxStorage', 'maxStorage', parseInt(e.target.value) || 0)}
                      disabled={!isEditing}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 disabled:bg-gray-100"
                      placeholder="Enter limit"
                    />
                    <button
                      onClick={() => handleNestedChange('hardLimits', 'maxStorage', 'maxStorage', -1)}
                      disabled={!isEditing}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        limits.hardLimits?.maxStorage === -1
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      ∞
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Presets</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Starter', values: { maxApiCalls: 10000, maxTokens: 100000, maxStorage: 1000 } },
                    { label: 'Pro', values: { maxApiCalls: 100000, maxTokens: 1000000, maxStorage: 10000 } },
                    { label: 'Business', values: { maxApiCalls: 500000, maxTokens: 5000000, maxStorage: 50000 } },
                    { label: 'Enterprise', values: { maxApiCalls: -1, maxTokens: -1, maxStorage: -1 } }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        if (!isEditing) return;
                        onChange({
                          ...limits,
                          hardLimits: {
                            ...limits.hardLimits,
                            ...preset.values
                          }
                        });
                      }}
                      disabled={!isEditing}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overage Pricing Section */}
        {activeSection === 'overagePricing' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Overage Pricing</h3>
              <p className="text-sm text-gray-500 mb-4">
                Configure pricing for usage above included limits.
              </p>

              {/* Enable Overage Pricing */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Enable Overage Pricing</h4>
                  <p className="text-xs text-gray-500">Charge for usage above included amounts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={limits.overagePricing?.enabled || false}
                    onChange={(e) => handleNestedChange('overagePricing', 'enabled', 'enabled', e.target.checked)}
                    disabled={!isEditing}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#DC2626]"></div>
                </label>
              </div>

              {limits.overagePricing?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Token Overage Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Token Overage Rate
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={limits.overagePricing?.tokenRate || 0}
                        onChange={(e) => handleNestedChange('overagePricing', 'tokenRate', 'tokenRate', parseFloat(e.target.value) || 0)}
                        disabled={!isEditing}
                        className="w-full pl-7 pr-16 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 disabled:bg-gray-100"
                        step="0.00001"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/ 1K tokens</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Price per 1,000 tokens over limit</p>
                  </div>

                  {/* API Call Overage Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Call Overage Rate
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={limits.overagePricing?.callRate || 0}
                        onChange={(e) => handleNestedChange('overagePricing', 'callRate', 'callRate', parseFloat(e.target.value) || 0)}
                        disabled={!isEditing}
                        className="w-full pl-7 pr-16 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 disabled:bg-gray-100"
                        step="0.001"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/ call</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Price per API call over limit</p>
                  </div>

                  {/* Overage Cap */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Overage Cap (per billing period)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={limits.overagePricing?.cap || 0}
                        onChange={(e) => handleNestedChange('overagePricing', 'cap', 'cap', parseFloat(e.target.value) || 0)}
                        disabled={!isEditing}
                        className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 disabled:bg-gray-100"
                        placeholder="0 = no cap"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Maximum overage charge per billing period (0 = unlimited)</p>
                  </div>
                </div>
              )}

              {/* Overage Warning */}
              {limits.overagePricing?.enabled && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Important</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Overage charges are applied after the included usage is exceeded. Ensure users are notified of potential charges.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rate Limits Section */}
        {activeSection === 'rateLimits' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">API Rate Limits</h3>
              <p className="text-sm text-gray-500 mb-4">
                Configure API rate limiting to prevent abuse.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Requests Per Minute */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requests Per Minute
                  </label>
                  <input
                    type="number"
                    value={limits.rateLimits?.requestsPerMinute || 0}
                    onChange={(e) => handleNestedChange('rateLimits', 'requestsPerMinute', 'requestsPerMinute', parseInt(e.target.value) || 0)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 disabled:bg-gray-100"
                    min="1"
                  />
                  <p className="text-xs text-gray-400 mt-1">Maximum API requests per minute</p>
                </div>

                {/* Tokens Per Minute */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tokens Per Minute
                  </label>
                  <input
                    type="number"
                    value={limits.rateLimits?.tokensPerMinute || 0}
                    onChange={(e) => handleNestedChange('rateLimits', 'tokensPerMinute', 'tokensPerMinute', parseInt(e.target.value) || 0)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 disabled:bg-gray-100"
                    min="1"
                  />
                  <p className="text-xs text-gray-400 mt-1">Maximum tokens processed per minute</p>
                </div>

                {/* Burst Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Burst Limit
                  </label>
                  <input
                    type="number"
                    value={limits.rateLimits?.burstLimit || 0}
                    onChange={(e) => handleNestedChange('rateLimits', 'burstLimit', 'burstLimit', parseInt(e.target.value) || 0)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 disabled:bg-gray-100"
                    min="1"
                  />
                  <p className="text-xs text-gray-400 mt-1">Maximum concurrent requests allowed</p>
                </div>

                {/* Cooldown Period */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cooldown Period (seconds)
                  </label>
                  <input
                    type="number"
                    value={limits.rateLimits?.cooldownPeriod || 0}
                    onChange={(e) => handleNestedChange('rateLimits', 'cooldownPeriod', 'cooldownPeriod', parseInt(e.target.value) || 0)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 disabled:bg-gray-100"
                    min="0"
                  />
                  <p className="text-xs text-gray-400 mt-1">Time to wait after rate limit is exceeded</p>
                </div>
              </div>

              {/* Rate Limit Preview */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Rate Limit Preview</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(limits.rateLimits?.requestsPerMinute || 0)}</p>
                    <p className="text-xs text-gray-500">req/min</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(limits.rateLimits?.tokensPerMinute || 0)}</p>
                    <p className="text-xs text-gray-500">tokens/min</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{limits.rateLimits?.burstLimit || 'N/A'}</p>
                    <p className="text-xs text-gray-500">burst</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{limits.rateLimits?.cooldownPeriod || 0}s</p>
                    <p className="text-xs text-gray-500">cooldown</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <span className="font-medium">Tier:</span> {planTier.charAt(0).toUpperCase() + planTier.slice(1)}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-gray-500">
              <span className="font-medium">Max Spend:</span> {limits.maxMonthlySpend === -1 ? 'Unlimited' : formatCurrency(limits.maxMonthlySpend)}
            </div>
            <div className="text-gray-500">
              <span className="font-medium">Overage:</span> {limits.overagePricing?.enabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingLimits;