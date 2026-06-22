/**
 * Feature Edit Page
 *
 * Edit a feature including model, provider, and pricing configuration.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';
import featureApi from '../../services/api/feature.api.js';
import modelApi from '../../services/api/model.api.js';
import providerApi from '../../services/api/provider.api.js';
import { useFeatureCurrency } from '../../hooks/useProjectCurrency.js';
import { getCurrencySymbol, formatCurrencyWithSymbol, getCurrencyLabel } from '../../utils/currency.js';
import { showToast } from '../../utils/toasts.jsx';

// Validation constants
const VALIDATION_RULES = {
  name: { minLength: 2, maxLength: 100, required: true },
  description: { maxLength: 500 },
  inputTokensPerRequest: { min: 0, max: 999999999999999, maxLength: 15 },
  outputTokensPerRequest: { min: 0, max: 999999999999999, maxLength: 15 },
  dynamicMultiplier: { min: 0.1, max: 100, maxLength: 15 },
  fixedCostPerRequest: { min: 0, max: 1000, maxLength: 15 },
  overheadPercentage: { min: 0, max: 100, maxLength: 3 },
  monthlyFixedCost: { min: 0, max: 1000000, maxLength: 15 },
  maxRequestsPerUser: { min: 0, max: 1000000000, maxLength: 15 },
  maxTokensPerUser: { min: 0, max: 1000000000000, maxLength: 15 },
  maxRequestsPerMonth: { min: 0, max: 1000000000, maxLength: 15 },
  cacheTTL: { min: 0, max: 86400, maxLength: 15 }
};

// Input field component - defined outside to prevent re-creation on every render
const InputField = ({ name, label, required, type = 'text', placeholder, maxLength, helpText, disabled, value, onChange, onBlur, error, touched, numericOnly }) => {
  const hasError = touched && error;
  const currentValue = value ?? '';

  const handleChange = (e) => {
    if (numericOnly) {
      // Only allow digits (0-9)
      const numericValue = e.target.value.replace(/[^0-9]/g, '');
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: numericValue,
          name: e.target.name
        }
      };
      onChange(syntheticEvent);
    } else {
      onChange(e);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        inputMode={type === 'number' ? 'numeric' : undefined}
        name={name}
        value={currentValue}
        onChange={handleChange}
        onBlur={onBlur}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md ${
          hasError ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
      <div className="min-h-[20px] mt-1">
        {hasError && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        {helpText && !hasError && (
          <p className="text-xs text-gray-500">{helpText}</p>
        )}
      </div>
    </div>
  );
};

function FeatureEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  const [feature, setFeature] = useState(null);

  // Field-level validation errors and touched state
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Get currency from feature's project
  const { currency, currencySymbol } = useFeatureCurrency(feature);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    status: 'active',
    model: '',
    provider: '',
    // Token estimates
    inputTokensPerRequest: '',
    outputTokensPerRequest: '',
    calculationMethod: 'fixed',
    dynamicMultiplier: '',
    // Infrastructure costs
    fixedCostPerRequest: '',
    overheadPercentage: '',
    monthlyFixedCost: '',
    infrastructureType: 'serverless',
    // Limits
    maxRequestsPerUser: '',
    maxTokensPerUser: '',
    maxRequestsPerMonth: '',
    // Settings
    enabled: true,
    requiresAuth: true,
    cacheEnabled: false,
    cacheTTL: ''
  });

  // Validation function for a single field
  const validateField = (name, value) => {
    const rules = VALIDATION_RULES[name];
    if (!rules) return '';

    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`;
    }

    if (!value && !rules.required) return '';

    const stringValue = String(value);

    if (rules.minLength && stringValue.length < rules.minLength) {
      return `Minimum ${rules.minLength} characters required`;
    }

    if (rules.maxLength && stringValue.length > rules.maxLength) {
      // Use "digits" for numeric fields
      const digitFields = [
        'inputTokensPerRequest', 'outputTokensPerRequest', 'dynamicMultiplier',
        'fixedCostPerRequest', 'overheadPercentage', 'monthlyFixedCost',
        'maxRequestsPerUser', 'maxTokensPerUser', 'maxRequestsPerMonth', 'cacheTTL'
      ];
      if (digitFields.includes(name)) {
        return `Maximum ${rules.maxLength} digits allowed`;
      }
      return `Maximum ${rules.maxLength} characters allowed`;
    }

    if (rules.min !== undefined && value !== '' && Number(value) < rules.min) {
      return `Value must be at least ${rules.min}`;
    }

    if (rules.max !== undefined && value !== '' && Number(value) > rules.max) {
      return `Value must not exceed ${rules.max.toLocaleString()}`;
    }

    // Special validation for overhead percentage (1-100)
    if (name === 'overheadPercentage' && value !== '') {
      const numValue = Number(value);
      if (numValue < 1 || numValue > 100) {
        return 'Value must be between 1 and 100';
      }
    }

    return '';
  };

  // Validate all fields
  const validateForm = () => {
    const errors = {};

    const nameError = validateField('name', formData.name);
    if (nameError) errors.name = nameError;

    const descError = validateField('description', formData.description);
    if (descError) errors.description = descError;

    // Provider is required
    if (!formData.provider) {
      errors.provider = 'Provider selection is required';
    }

    // Model is required
    if (!formData.model) {
      errors.model = 'AI Model selection is required';
    }

    const numericFields = [
      'inputTokensPerRequest', 'outputTokensPerRequest', 'dynamicMultiplier',
      'fixedCostPerRequest', 'overheadPercentage', 'monthlyFixedCost',
      'maxRequestsPerUser', 'maxTokensPerUser', 'maxRequestsPerMonth', 'cacheTTL'
    ];

    numericFields.forEach(field => {
      if (formData[field] !== '' && formData[field] !== undefined) {
        const error = validateField(field, formData[field]);
        if (error) errors[field] = error;
      }
    });

    return errors;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch feature, models, and providers in parallel
        const [featureRes, modelsRes, providersRes] = await Promise.all([
          featureApi.getById(id),
          modelApi.getAll(),
          providerApi.getAll()
        ]);

        // Set models and providers first
        let modelsData = [];
        let providersData = [];

        if (modelsRes.data) {
          modelsData = modelsRes.data;
          setModels(modelsData);
        }
        if (providersRes.providers) {
          providersData = providersRes.providers;
          setProviders(providersData);
        }

        // Set feature data
        if (featureRes.success && featureRes.data?.feature) {
          const feature = featureRes.data.feature;
          setFeature(feature); // Store feature for currency hook
          const providerId = feature.provider?._id || feature.provider || '';

          // Filter models by provider
          if (providerId && modelsData.length > 0) {
            setFilteredModels(modelsData.filter(m => m.provider?._id === providerId || m.provider === providerId));
          } else {
            setFilteredModels(modelsData);
          }

          setFormData({
            name: feature.name || '',
            description: feature.description || '',
            category: feature.category || 'other',
            status: feature.status || 'active',
            model: feature.model?._id || feature.model || '',
            provider: providerId,
            inputTokensPerRequest: feature.tokenEstimates?.inputTokensPerRequest?.toString() || '',
            outputTokensPerRequest: feature.tokenEstimates?.outputTokensPerRequest?.toString() || '',
            calculationMethod: feature.tokenEstimates?.calculationMethod || 'fixed',
            dynamicMultiplier: feature.tokenEstimates?.dynamicMultiplier?.toString() || '',
            fixedCostPerRequest: feature.infrastructureCost?.fixedCostPerRequest?.toString() || '',
            overheadPercentage: feature.infrastructureCost?.overheadPercentage?.toString() || '',
            monthlyFixedCost: feature.infrastructureCost?.monthlyFixedCost?.toString() || '',
            infrastructureType: feature.infrastructureCost?.infrastructureType || 'serverless',
            maxRequestsPerUser: feature.limits?.maxRequestsPerUser?.toString() || '',
            maxTokensPerUser: feature.limits?.maxTokensPerUser?.toString() || '',
            maxRequestsPerMonth: feature.limits?.maxRequestsPerMonth?.toString() || '',
            enabled: feature.settings?.enabled ?? true,
            requiresAuth: feature.settings?.requiresAuth ?? true,
            cacheEnabled: feature.settings?.cacheEnabled ?? false,
            cacheTTL: feature.settings?.cacheTTL?.toString() || ''
          });
        }

      } catch (err) {
        showToast.error(err.response?.data?.error?.message || 'Failed to load feature');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Clear error for this field if exists
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Handle provider change - filter models and clear model selection
    if (name === 'provider') {
      const filtered = value
        ? models.filter(m => m.provider?._id === value || m.provider === value)
        : models;
      setFilteredModels(filtered);
      setFormData(prev => ({
        ...prev,
        provider: value,
        model: '' // Clear model when provider changes
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    // Mark as touched on blur
    setTouched(prev => ({ ...prev, [name]: true }));

    // Validate on blur
    const error = validateField(name, value);
    if (error) {
      setFieldErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const newTouched = {};
      Object.keys(errors).forEach(field => {
        newTouched[field] = true;
      });
      setTouched(prev => ({ ...prev, ...newTouched }));

      // Show toast for validation errors
      const errorMessages = Object.values(errors);
      if (errorMessages.length > 0) {
        showToast.validationError(errorMessages[0]);
      }

      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        status: formData.status,
        model: formData.model || undefined,
        provider: formData.provider || undefined,
        tokenEstimates: {
          inputTokensPerRequest: Number(formData.inputTokensPerRequest) || 0,
          outputTokensPerRequest: Number(formData.outputTokensPerRequest) || 0,
          calculationMethod: formData.calculationMethod,
          dynamicMultiplier: Number(formData.dynamicMultiplier) || 1
        },
        infrastructureCost: {
          fixedCostPerRequest: Number(formData.fixedCostPerRequest) || 0,
          overheadPercentage: Number(formData.overheadPercentage) || 0,
          monthlyFixedCost: Number(formData.monthlyFixedCost) || 0,
          infrastructureType: formData.infrastructureType
        },
        limits: {
          maxRequestsPerUser: formData.maxRequestsPerUser && formData.maxRequestsPerUser.trim() !== '' ? Number(formData.maxRequestsPerUser) : null,
          maxTokensPerUser: formData.maxTokensPerUser && formData.maxTokensPerUser.trim() !== '' ? Number(formData.maxTokensPerUser) : null,
          maxRequestsPerMonth: formData.maxRequestsPerMonth && formData.maxRequestsPerMonth.trim() !== '' ? Number(formData.maxRequestsPerMonth) : null
        },
        settings: {
          enabled: formData.enabled,
          requiresAuth: formData.requiresAuth,
          cacheEnabled: formData.cacheEnabled,
          cacheTTL: Number(formData.cacheTTL) || 3600
        }
      };

      const response = await featureApi.update(id, updateData);

      if (response.success) {
        showToast.featureUpdated();
        navigate(`/features/${id}`);
      } else {
        showToast.error(response.message || 'Failed to update feature');
      }
    } catch (err) {
      const errorData = err.response?.data?.error;
      let errorMessage = 'Failed to update feature';

      if (errorData?.details && Array.isArray(errorData.details)) {
        errorMessage = errorData.details.map(e => `${e.field}: ${e.message}`).join(', ');
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      showToast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/features/${id}`}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Feature
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Feature</h1>
        <p className="text-gray-600 mt-1">Configure model, provider, and pricing</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              name="name"
              label="Feature Name"
              required
              maxLength={100}
              placeholder="e.g., Chat Assistant, Image Generator"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              error={fieldErrors.name}
              touched={touched.name}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="chat">Chat</option>
                <option value="completion">Completion</option>
                <option value="embedding">Embedding</option>
                <option value="image">Image</option>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <InputField
                name="description"
                label="Description"
                maxLength={500}
                placeholder="Brief description of this feature"
                value={formData.description}
                onChange={handleChange}
                onBlur={handleBlur}
                error={fieldErrors.description}
                touched={touched.description}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Model & Provider */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">AI Model & Provider</h2>
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">Required</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider<span className="text-red-500">*</span>
              </label>
              <select
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-md ${
                  touched.provider && fieldErrors.provider ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Provider</option>
                {providers.map(provider => (
                  <option key={provider._id} value={provider._id}>
                    {provider.displayName || provider.name}
                  </option>
                ))}
              </select>
              {touched.provider && fieldErrors.provider && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.provider}</p>
              )}
              {providers.length === 0 && (
                <p className="mt-1 text-sm text-amber-600">
                  No providers available. <Link to="/providers" className="underline">Create one</Link>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Model<span className="text-red-500">*</span>
              </label>
              <select
                name="model"
                value={formData.model}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  touched.model && fieldErrors.model ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={!formData.provider}
              >
                <option value="">Select Model</option>
                {filteredModels.map(model => (
                  <option key={model._id} value={model._id}>
                    {model.displayName || model.name} {model.pricing ? `(${currencySymbol}${model.pricing.inputPrice}/${currencySymbol}${model.pricing.outputPrice} per 1M tokens)` : ''}
                  </option>
                ))}
              </select>
              {touched.model && fieldErrors.model && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.model}</p>
              )}
              {!formData.provider && (
                <p className="mt-1 text-xs text-gray-500">Please select a provider first</p>
              )}
              {formData.provider && filteredModels.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No models for this provider. <Link to="/models" className="underline">Create one</Link>
                </p>
              )}
            </div>
          </div>
          {formData.model && filteredModels.find(m => m._id === formData.model)?.pricing && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-2">Selected Model Pricing:</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-xs text-gray-500">Input Price</span>
                  <p className="text-lg font-semibold text-gray-900">
                    {currencySymbol}{(filteredModels.find(m => m._id === formData.model)?.pricing?.inputPrice || 0).toFixed(2)}/1M tokens
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-xs text-gray-500">Output Price</span>
                  <p className="text-lg font-semibold text-gray-900">
                    {currencySymbol}{(filteredModels.find(m => m._id === formData.model)?.pricing?.outputPrice || 0).toFixed(2)}/1M tokens
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Token Estimates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Token Estimates</h2>
          <p className="text-sm text-gray-500 mb-4">
            Estimate how many tokens each API request will consume. This is used for cost calculations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              name="inputTokensPerRequest"
              label="Input Tokens / Request"
              type="number"
              maxLength={15}
              numericOnly
              placeholder="e.g., 500"
              value={formData.inputTokensPerRequest}
              onChange={handleChange}
              onBlur={handleBlur}
              error={fieldErrors.inputTokensPerRequest}
              touched={touched.inputTokensPerRequest}
            />
            <InputField
              name="outputTokensPerRequest"
              label="Output Tokens / Request"
              type="number"
              maxLength={15}
              numericOnly
              placeholder="e.g., 1000"
              value={formData.outputTokensPerRequest}
              onChange={handleChange}
              onBlur={handleBlur}
              error={fieldErrors.outputTokensPerRequest}
              touched={touched.outputTokensPerRequest}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calculation Method</label>
              <select
                name="calculationMethod"
                value={formData.calculationMethod}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="fixed">Fixed</option>
                <option value="dynamic">Dynamic</option>
                <option value="user-based">User Based</option>
              </select>
            </div>
            {formData.calculationMethod === 'dynamic' && (
              <InputField
                name="dynamicMultiplier"
                label="Dynamic Multiplier"
                type="number"
                maxLength={15}
                numericOnly
                placeholder="1"
                helpText="Multiplier value (max 15 digits)"
                value={formData.dynamicMultiplier}
                onChange={handleChange}
                onBlur={handleBlur}
                error={fieldErrors.dynamicMultiplier}
                touched={touched.dynamicMultiplier}
              />
            )}
          </div>
          {formData.inputTokensPerRequest > 0 && formData.outputTokensPerRequest > 0 && formData.model && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-2">Estimated Cost per 1000 Requests:</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-[#DC2626]">
                  {formatCurrencyWithSymbol(
                    ((filteredModels.find(m => m._id === formData.model)?.pricing?.inputPrice || 0) / 1000000) * formData.inputTokensPerRequest * 1000 +
                    ((filteredModels.find(m => m._id === formData.model)?.pricing?.outputPrice || 0) / 1000000) * formData.outputTokensPerRequest * 1000,
                    currency
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {formData.inputTokensPerRequest + formData.outputTokensPerRequest} tokens/request × 1000 requests
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Infrastructure Costs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Infrastructure Costs (Optional)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Additional costs beyond API token usage (e.g., server hosting, caching overhead).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <InputField
              name="fixedCostPerRequest"
              label={`${getCurrencyLabel('Fixed Cost / Request', 'INR')}`}
              type="number"
              maxLength={15}
              numericOnly
              placeholder="1"
              value={formData.fixedCostPerRequest}
              onChange={handleChange}
              onBlur={handleBlur}
              error={fieldErrors.fixedCostPerRequest}
              touched={touched.fixedCostPerRequest}
            />
            <InputField
              name="overheadPercentage"
              label="Overhead Percentage (%)"
              type="number"
              maxLength={3}
              numericOnly
              placeholder="10"
              value={formData.overheadPercentage}
              onChange={handleChange}
              onBlur={handleBlur}
              error={fieldErrors.overheadPercentage}
              touched={touched.overheadPercentage}
            />
            <InputField
              name="monthlyFixedCost"
              label={`${getCurrencyLabel('Monthly Fixed Cost', 'INR')}`}
              type="number"
              maxLength={15}
              numericOnly
              placeholder="100"
              value={formData.monthlyFixedCost}
              onChange={handleChange}
              onBlur={handleBlur}
              error={fieldErrors.monthlyFixedCost}
              touched={touched.monthlyFixedCost}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Infrastructure Type</label>
              <select
                name="infrastructureType"
                value={formData.infrastructureType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="serverless">Serverless</option>
                <option value="dedicated">Dedicated</option>
                <option value="hybrid">Hybrid</option>
                <option value="shared">Shared</option>
              </select>
            </div>
          </div>
        </div>

        {/* Usage Limits */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Limits (Optional)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Set limits on feature usage per user or per month.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              name="maxRequestsPerUser"
              label="Max Requests / User"
              type="number"
              maxLength={15}
              numericOnly
              placeholder="Unlimited"
              value={formData.maxRequestsPerUser}
              onChange={handleChange}
              onBlur={handleBlur}
              error={fieldErrors.maxRequestsPerUser}
              touched={touched.maxRequestsPerUser}
            />
            <InputField
              name="maxTokensPerUser"
              label="Max Tokens / User"
              type="number"
              maxLength={15}
              numericOnly
              placeholder="Unlimited"
              value={formData.maxTokensPerUser}
              onChange={handleChange}
              onBlur={handleBlur}
              error={fieldErrors.maxTokensPerUser}
              touched={touched.maxTokensPerUser}
            />
            <InputField
              name="maxRequestsPerMonth"
              label="Max Requests / Month"
              type="number"
              maxLength={15}
              numericOnly
              placeholder="Unlimited"
              value={formData.maxRequestsPerMonth}
              onChange={handleChange}
              onBlur={handleBlur}
              error={fieldErrors.maxRequestsPerMonth}
              touched={touched.maxRequestsPerMonth}
            />
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="enabled"
                id="enabled"
                checked={formData.enabled}
                onChange={handleChange}
                className="w-4 h-4 text-red-600 border-gray-300 rounded"
              />
              <label htmlFor="enabled" className="text-sm text-gray-700">
                Feature Enabled
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="requiresAuth"
                id="requiresAuth"
                checked={formData.requiresAuth}
                onChange={handleChange}
                className="w-4 h-4 text-red-600 border-gray-300 rounded"
              />
              <label htmlFor="requiresAuth" className="text-sm text-gray-700">
                Requires Authentication
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="cacheEnabled"
                id="cacheEnabled"
                checked={formData.cacheEnabled}
                onChange={handleChange}
                className="w-4 h-4 text-red-600 border-gray-300 rounded"
              />
              <label htmlFor="cacheEnabled" className="text-sm text-gray-700">
                Enable Response Caching
              </label>
            </div>
            {formData.cacheEnabled && (
              <InputField
                name="cacheTTL"
                label="Cache TTL (seconds)"
                type="number"
                helpText="Time to live for cached responses (max 24 hours)"
                value={formData.cacheTTL}
                onChange={handleChange}
                onBlur={handleBlur}
                error={fieldErrors.cacheTTL}
                touched={touched.cacheTTL}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`/features/${id}`)}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FeatureEditPage;
