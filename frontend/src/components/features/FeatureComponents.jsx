/**
 * Feature Components
 *
 * Feature-specific components for the API Token Management pricing calculator.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { LineChartComponent, BarChartComponent, PieChartComponent, DonutChartComponent, UsageChart } from '../charts';
import { Input, Select, Toggle, Form, FormActions, FormError, FormSuccess } from '../forms';

/**
 * Pricing Tier Card Component
 */
export const PricingTierCard = ({
  tier,
  selected = false,
  onSelect,
  billingCycle = 'monthly',
  className = ''
}) => {
  // Handle both old format (monthlyPrice/annualPrice) and new API format (price/billingCycle)
  const monthlyPrice = tier.monthlyPrice || tier.price || 0;
  const annualPrice = tier.annualPrice || (tier.yearlyDiscount
    ? monthlyPrice * 12 * (1 - tier.yearlyDiscount / 100)
    : monthlyPrice * 12 * 0.8); // Default 20% yearly discount

  const price = billingCycle === 'yearly' || billingCycle === 'annual' ? annualPrice : monthlyPrice;
  const monthlyDisplayPrice = billingCycle === 'yearly' || billingCycle === 'annual'
    ? Math.round(annualPrice / 12)
    : monthlyPrice;

  const savings = billingCycle === 'yearly' || billingCycle === 'annual' && monthlyPrice > 0
    ? Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100)
    : 0;

  // Handle features array - could be strings or objects
  const featureList = Array.isArray(tier.features)
    ? tier.features.map(f => typeof f === 'string' ? f : f?.feature?.name || f?.name || '')
    : [];

  return (
    <div
      className={`
        relative rounded-2xl p-6 border-2 transition-all duration-200
        ${selected
          ? 'border-blue-500 ring-2 ring-blue-500 shadow-lg'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
        }
        ${tier.isPopular || tier.popular ? 'ring-2 ring-blue-500' : ''}
        ${className}
      `}
    >
      {(tier.isPopular || tier.popular) && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {tier.displayName || tier.name}
        </h3>
        {tier.description && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{tier.description}</p>
        )}

        <div className="mt-4">
          {tier.price === 'custom' || tier.tier === 'enterprise' ? (
            <div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                Contact Sales
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Custom pricing</p>
            </div>
          ) : (
            <>
              <span className="text-4xl font-bold text-gray-900 dark:text-white">
                ${tier.currency === 'USD' || !tier.currency ? '' : tier.currency}{monthlyDisplayPrice}
              </span>
              <span className="text-gray-500 dark:text-gray-400">/{billingCycle === 'yearly' || billingCycle === 'annual' ? 'mo' : 'month'}</span>
              {(billingCycle === 'yearly' || billingCycle === 'annual') && savings > 0 && (
                <p className="text-sm text-green-500 mt-1">Save {savings}% annually</p>
              )}
            </>
          )}
        </div>

        {/* Display limits */}
        {tier.limits && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
            {tier.limits.maxUsers && (
              <div>Up to {tier.limits.maxUsers} users</div>
            )}
            {tier.limits.maxProjects && (
              <div>Up to {tier.limits.maxProjects} projects</div>
            )}
            {tier.limits.maxFeatures && (
              <div>Up to {tier.limits.maxFeatures} features</div>
            )}
            {tier.limits.maxApiCalls && (
              <div>{tier.limits.maxApiCalls.toLocaleString()} API calls</div>
            )}
          </div>
        )}

        <ul className="mt-6 space-y-3">
          {featureList.filter(f => f).map((feature, index) => (
            <li key={index} className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => onSelect?.(tier.id)}
          className={`
            mt-6 w-full py-2 px-4 rounded-lg font-medium transition-colors
            ${selected
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-500 hover:text-white'
            }
          `}
        >
          {selected ? 'Current Plan' : 'Select Plan'}
        </button>
      </div>
    </div>
  );
};

/**
 * Usage Progress Component
 */
export const UsageProgress = ({
  current,
  limit,
  label,
  unit = '',
  showPercentage = true,
  color = 'blue',
  className = ''
}) => {
  // Handle unlimited or null limits
  const isUnlimited = limit === 'unlimited' || limit === null || limit === undefined;
  const numericLimit = isUnlimited ? null : Number(limit);
  const percentage = !isUnlimited && numericLimit > 0 ? Math.min((current / numericLimit) * 100, 100) : 0;
  const isWarning = percentage >= 80 && percentage < 100;
  const isCritical = percentage >= 100;

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    cyan: 'bg-cyan-500'
  };

  const bgColorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/20',
    green: 'bg-green-100 dark:bg-green-900/20',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20',
    red: 'bg-red-100 dark:bg-red-900/20',
    purple: 'bg-purple-100 dark:bg-purple-900/20',
    orange: 'bg-orange-100 dark:bg-orange-900/20',
    cyan: 'bg-cyan-100 dark:bg-cyan-900/20'
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {showPercentage && !isUnlimited && (
          <span className={`text-sm font-medium ${isCritical ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-gray-600 dark:text-gray-400'}`}>
            {percentage.toFixed(1)}%
          </span>
        )}
        {isUnlimited && (
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            Unlimited
          </span>
        )}
      </div>
      {!isUnlimited && (
        <div className={`h-2 rounded-full ${bgColorClasses[color]}`}>
          <div
            className={`h-full rounded-full transition-all duration-300 ${isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : colorClasses[color]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      {isUnlimited && (
        <div className="h-2 rounded-full bg-green-100 dark:bg-green-900/20">
          <div className="h-full rounded-full bg-green-500" style={{ width: '0%' }} />
        </div>
      )}
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {current.toLocaleString()}{unit} used
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {isUnlimited ? 'Unlimited' : numericLimit?.toLocaleString() + unit}
        </span>
      </div>
    </div>
  );
};

/**
 * Cost Calculator Component
 */
export const CostCalculator = ({
  providers,
  models,
  onCalculate,
  defaultProvider,
  className = ''
}) => {
  const [provider, setProvider] = useState(defaultProvider || '');
  const [model, setModel] = useState('');
  const [inputTokens, setInputTokens] = useState(1000);
  const [outputTokens, setOutputTokens] = useState(500);
  const [requests, setRequests] = useState(100);

  const availableModels = useMemo(() => {
    if (!provider) return [];
    return models.filter(m => m.provider === provider);
  }, [provider, models]);

  const calculateCost = useCallback(() => {
    const selectedModel = models.find(m => m.id === model);
    if (!selectedModel) return null;

    const inputCost = (inputTokens / 1000) * selectedModel.inputPrice;
    const outputCost = (outputTokens / 1000) * selectedModel.outputPrice;
    const totalPerRequest = inputCost + outputCost;
    const monthlyCost = totalPerRequest * requests;

    return {
      inputCost,
      outputCost,
      totalPerRequest,
      monthlyCost,
      model: selectedModel
    };
  }, [provider, model, inputTokens, outputTokens, requests, models]);

  const handleCalculate = () => {
    const result = calculateCost();
    if (result && onCalculate) {
      onCalculate(result);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Cost Calculator
      </h3>

      <Form onSubmit={handleCalculate}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Provider"
            options={providers.map(p => ({ value: p.id, label: p.name }))}
            value={provider}
            onChange={setProvider}
            placeholder="Select provider"
            required
          />

          <Select
            label="Model"
            options={availableModels.map(m => ({ value: m.id, label: m.name }))}
            value={model}
            onChange={setModel}
            placeholder="Select model"
            required
            disabled={!provider}
          />

          <Input
            type="number"
            label="Input Tokens (per request)"
            value={inputTokens}
            onChange={(e) => setInputTokens(Number(e.target.value))}
            min={0}
          />

          <Input
            type="number"
            label="Output Tokens (per request)"
            value={outputTokens}
            onChange={(e) => setOutputTokens(Number(e.target.value))}
            min={0}
          />

          <Input
            type="number"
            label="Requests per Month"
            value={requests}
            onChange={(e) => setRequests(Number(e.target.value))}
            min={0}
            className="md:col-span-2"
          />
        </div>

        <FormActions submitLabel="Calculate Cost" className="mt-6" />
      </Form>
    </div>
  );
};

/**
 * Cost Breakdown Component
 */
export const CostBreakdown = ({ cost, className = '' }) => {
  if (!cost) return null;

  const breakdownData = [
    { name: 'Input Tokens', value: cost.inputCost, color: '#6366f1' },
    { name: 'Output Tokens', value: cost.outputCost, color: '#8b5cf6' }
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Cost Breakdown - {cost.model?.name}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Per Request</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${cost.totalPerRequest.toFixed(6)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Cost</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${cost.monthlyCost.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Annual Cost</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${(cost.monthlyCost * 12).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="h-64">
        <DonutChartComponent
          data={breakdownData}
          dataKey="value"
          nameKey="name"
          centerText={`$${cost.totalPerRequest.toFixed(4)}`}
          formatter={(v) => `$${v.toFixed(4)}`}
        />
      </div>
    </div>
  );
};

/**
 * Usage Dashboard Component
 */
export const UsageDashboard = ({
  usageData,
  timeRange = '7d',
  onTimeRangeChange,
  className = ''
}) => {
  const timeRanges = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' }
  ];

  const totalTokens = usageData?.reduce((sum, d) => sum + (d.inputTokens || 0) + (d.outputTokens || 0), 0) || 0;
  const totalCost = usageData?.reduce((sum, d) => sum + (d.cost || 0), 0) || 0;
  const totalRequests = usageData?.reduce((sum, d) => sum + (d.requests || 0), 0) || 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Usage Overview
        </h3>
        <Select
          options={timeRanges}
          value={timeRange}
          onChange={onTimeRangeChange}
          className="w-40"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400">Total Tokens</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {totalTokens.toLocaleString()}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400">Total Cost</p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            ${totalCost.toFixed(2)}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <p className="text-sm text-purple-600 dark:text-purple-400">API Requests</p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {totalRequests.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="h-80">
        <UsageChart data={usageData} type="tokens" />
      </div>
    </div>
  );
};

/**
 * Organization Settings Component
 */
export const OrganizationSettings = ({
  organization,
  onUpdate,
  className = ''
}) => {
  const [settings, setSettings] = useState({
    name: organization?.name || '',
    slug: organization?.slug || '',
    timezone: organization?.timezone || 'UTC',
    currency: organization?.currency || 'USD',
    notifications: {
      email: organization?.notifications?.email ?? true,
      slack: organization?.notifications?.slack ?? false,
      webhook: organization?.notifications?.webhook ?? false
    }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (onUpdate) {
        await onUpdate(settings);
        setSuccess('Settings saved successfully');
      }
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Organization Settings
      </h3>

      <Form onSubmit={handleSave}>
        {error && <FormError error={error} className="mb-4" />}
        {success && <FormSuccess message={success} className="mb-4" />}

        <Input
          label="Organization Name"
          value={settings.name}
          onChange={(e) => setSettings({ ...settings, name: e.target.value })}
          required
        />

        <Input
          label="Slug"
          value={settings.slug}
          onChange={(e) => setSettings({ ...settings, slug: e.target.value })}
          hint="Used in API URLs"
          className="mt-4"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Select
            label="Timezone"
            options={[
              { value: 'UTC', label: 'UTC' },
              { value: 'America/New_York', label: 'Eastern Time' },
              { value: 'America/Chicago', label: 'Central Time' },
              { value: 'America/Denver', label: 'Mountain Time' },
              { value: 'America/Los_Angeles', label: 'Pacific Time' },
              { value: 'Europe/London', label: 'London' },
              { value: 'Europe/Paris', label: 'Paris' },
              { value: 'Asia/Tokyo', label: 'Tokyo' }
            ]}
            value={settings.timezone}
            onChange={(v) => setSettings({ ...settings, timezone: v })}
          />

          <Select
            label="Currency"
            options={[
              { value: 'USD', label: 'USD ($)' },
              { value: 'EUR', label: 'EUR (€)' },
              { value: 'GBP', label: 'GBP (£)' },
              { value: 'JPY', label: 'JPY (¥)' },
              { value: 'INR', label: 'INR (₹)' }
            ]}
            value={settings.currency}
            onChange={(v) => setSettings({ ...settings, currency: v })}
          />
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Notifications
          </h4>
          <div className="space-y-3">
            <Toggle
              label="Email Notifications"
              checked={settings.notifications.email}
              onChange={(v) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, email: v }
              })}
            />
            <Toggle
              label="Slack Notifications"
              checked={settings.notifications.slack}
              onChange={(v) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, slack: v }
              })}
            />
            <Toggle
              label="Webhook Notifications"
              checked={settings.notifications.webhook}
              onChange={(v) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, webhook: v }
              })}
            />
          </div>
        </div>

        <FormActions submitLabel="Save Settings" isSubmitting={saving} className="mt-6" />
      </Form>
    </div>
  );
};

/**
 * Plan Comparison Component
 */
export const PlanComparison = ({
  plans,
  currentPlan,
  onSelectPlan,
  className = ''
}) => {
  const features = plans[0]?.features || [];

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">
              Features
            </th>
            {plans.map(plan => (
              <th
                key={plan.id}
                className={`
                  py-4 px-4 text-center font-semibold
                  ${currentPlan === plan.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                `}
              >
                {plan.name}
                {currentPlan === plan.id && (
                  <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                    Current
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-200 dark:border-gray-700">
            <td className="py-4 px-4 text-gray-700 dark:text-gray-300">Monthly Price</td>
            {plans.map(plan => (
              <td
                key={plan.id}
                className={`
                  py-4 px-4 text-center
                  ${currentPlan === plan.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                `}
              >
                ${plan.monthlyPrice}/mo
              </td>
            ))}
          </tr>
          {features.map((feature, index) => (
            <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
              <td className="py-4 px-4 text-gray-700 dark:text-gray-300">{feature}</td>
              {plans.map(plan => (
                <td
                  key={plan.id}
                  className={`
                    py-4 px-4 text-center
                    ${currentPlan === plan.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  `}
                >
                  {plan.featureDetails?.[feature] ? (
                    <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-gray-200 dark:border-gray-700">
            <td className="py-4 px-4"></td>
            {plans.map(plan => (
              <td
                key={plan.id}
                className={`
                  py-4 px-4 text-center
                  ${currentPlan === plan.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                `}
              >
                <button
                  onClick={() => onSelectPlan?.(plan.id)}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-colors
                    ${currentPlan === plan.id
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                    }
                  `}
                >
                  {currentPlan === plan.id ? 'Current Plan' : 'Select'}
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default {
  PricingTierCard,
  UsageProgress,
  CostCalculator,
  CostBreakdown,
  UsageDashboard,
  OrganizationSettings,
  PlanComparison
};
