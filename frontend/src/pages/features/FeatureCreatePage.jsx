/**
 * Feature Create Page
 *
 * Create a new feature with model, provider, and pricing configuration.
 * Features must be linked to a Project/Product.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useSubscription } from '../../context/SubscriptionContext.jsx';
import { handleSubscriptionError, isSubscriptionError } from '../../utils/subscriptionErrorHandler.jsx';
import featureApi from '../../services/api/feature.api.js';
import modelApi from '../../services/api/model.api.js';
import providerApi from '../../services/api/provider.api.js';
import projectApi from '../../services/api/project.api.js';
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
  overheadPercentage: { min: 0, max: 100, maxLength: 15 },
  monthlyFixedCost: { min: 0, max: 1000000, maxLength: 15 },
  maxRequestsPerUser: { min: 0, max: 1000000000, maxLength: 15 },
  maxTokensPerUser: { min: 0, max: 1000000000000, maxLength: 15 },
  maxRequestsPerMonth: { min: 0, max: 1000000000, maxLength: 15 },
  cacheTTL: { min: 0, max: 86400, maxLength: 15 }
};

// Input field component - defined outside to prevent re-creation on every render
const InputField = ({ name, label, required, type = 'text', placeholder, maxLength, helpText, disabled, value, onChange, onBlur, error, touched, numericOnly, alphaOnly }) => {
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
    } else if (alphaOnly) {
      // Only allow letters, spaces, and common word characters
      const alphaValue = e.target.value.replace(/[^a-zA-Z\s]/g, '');
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: alphaValue,
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

function FeatureCreatePage() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { checkLimit, subscription } = useSubscription();

  const currency = currentOrganization?.settings?.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providers, setProviders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [filteredModels, setFilteredModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelSource, setModelSource] = useState(null);
  const [modelFetchError, setModelFetchError] = useState(null);

  // Field-level validation errors and touched state
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [formData, setFormData] = useState({
    project: '',
    name: '',
    description: '',
    category: 'other',
    status: 'active',
    model: '',
    provider: '',
    modelIdentifier: '',
    modelDisplayName: '',
    inputTokensPerRequest: '',
    outputTokensPerRequest: '',
    calculationMethod: 'fixed',
    dynamicMultiplier: '1',
    fixedCostPerRequest: '',
    overheadPercentage: '',
    monthlyFixedCost: '',
    infrastructureType: 'serverless',
    maxRequestsPerUser: '',
    maxTokensPerUser: '',
    maxRequestsPerMonth: '',
    enabled: true,
    requiresAuth: true,
    cacheEnabled: false,
    cacheTTL: '3600'
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

    if (!formData.project) {
      errors.project = 'Project selection is required';
    }

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

  // Fetch providers on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const providersRes = await providerApi.getAll({ limit: 100, activeOnly: false });
        if (providersRes.providers) {
          setProviders(providersRes.providers);
        }
      } catch (err) {
        console.error('Failed to fetch providers:', err);
      }
    };

    fetchData();
  }, []);

  // Fetch projects when organization changes
  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentOrganization?._id) return;

      setIsLoadingProjects(true);
      try {
        const orgId = currentOrganization._id;
        const response = await projectApi.getForOrganization(orgId);
        const projectsList = response?.projects || response?.data || response || [];
        setProjects(Array.isArray(projectsList) ? projectsList : []);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
        setProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [currentOrganization]);

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

    // Handle provider change - fetch models
    if (name === 'provider') {
      setFormData(prev => ({
        ...prev,
        provider: value,
        model: '',
        modelIdentifier: '',
        modelDisplayName: ''
      }));
      setFilteredModels([]);
      setModelSource(null);
      setModelFetchError(null);

      if (value) {
        fetchModels(value);
      }
    } else {
      // Update form data - keep values as strings for smooth typing
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

  const fetchModels = async (providerId) => {
    setIsLoadingModels(true);
    setModelFetchError(null);
    setFilteredModels([]);

    try {
      const response = await providerApi.getDynamicModels(providerId, { forceRefresh: true });
      const liveModels = response.models || [];

      const processedModels = liveModels.map(model => ({
        ...model,
        id: model._id || model.id,
        isDatabaseModel: !!model._id,
        source: response.meta?.source || 'unknown'
      }));

      processedModels.sort((a, b) => {
        const nameA = a.displayName || a.name || '';
        const nameB = b.displayName || b.name || '';
        return nameA.localeCompare(nameB);
      });

      setFilteredModels(processedModels);
      setModelSource(response.meta?.source || 'api');

      if (processedModels.length > 0) {
        const firstModel = processedModels[0];
        setFormData(prev => ({
          ...prev,
          model: firstModel._id || firstModel.id,
          modelIdentifier: firstModel._id ? null : firstModel.id,
          modelDisplayName: firstModel.displayName || firstModel.name
        }));
      }

    } catch (err) {
      console.error('Failed to fetch models:', err);
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to fetch models';
      setModelFetchError(errorMsg);
      setFilteredModels([]);
      setModelSource('error');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const getBestModelId = () => {
    if (filteredModels.length === 0) return '';

    const recommendedModel = filteredModels.find(m => m.isRecommended);
    if (recommendedModel) {
      return recommendedModel.isDatabaseModel ? recommendedModel._id : (recommendedModel.rawId || recommendedModel.id);
    }

    const sortedModels = [...filteredModels].sort((a, b) => {
      const ctxA = a.capabilities?.contextWindow || 0;
      const ctxB = b.capabilities?.contextWindow || 0;
      return ctxB - ctxA;
    });
    const bestModel = sortedModels[0];
    return bestModel.isDatabaseModel ? bestModel._id : (bestModel.rawId || bestModel.id);
  };

  const bestModelId = formData.provider ? getBestModelId() : '';

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

    if (!currentOrganization) {
      showToast.error('No organization selected. Please select an organization first.');
      return;
    }

    try {
      if (checkLimit && typeof checkLimit === 'function') {
        const limitCheck = checkLimit('features', 1);
        if (limitCheck && !limitCheck.allowed) {
          showToast.limitExceeded(limitCheck.reason || 'Feature limit reached. Please upgrade your subscription to create more features.');
          setIsSubmitting(false);
          return;
        }
      }
    } catch (err) {
      console.log('Subscription check not available, proceeding with backend validation');
    }

    setIsSubmitting(true);

    try {
      const selectedModel = filteredModels.find(m => (m.rawId || m.id) === formData.model);

      const featureData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category || 'other',
        status: formData.status || 'active',
        organization: currentOrganization._id,
        project: formData.project,
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

      if (selectedModel) {
        if (selectedModel.isDatabaseModel) {
          featureData.model = selectedModel.id;
        } else {
          featureData.modelIdentifier = selectedModel.rawId || selectedModel.id;
          featureData.modelDisplayName = selectedModel.displayName || selectedModel.name;
          if (selectedModel.capabilities) {
            featureData.modelCapabilities = selectedModel.capabilities;
          }
        }
      }

      const response = await featureApi.create(featureData);

      if (response.success) {
        showToast.featureCreated();
        navigate('/features');
      } else {
        showToast.error(response.message || 'Failed to create feature');
      }
    } catch (err) {
      console.error('Feature creation error:', err.response?.data);

      if (isSubscriptionError(err)) {
        handleSubscriptionError(err);
        setIsSubmitting(false);
        return;
      }

      const errorData = err.response?.data?.error;
      let errorMessage = 'Failed to create feature';

      if (errorData?.details && Array.isArray(errorData.details)) {
        errorMessage = errorData.details.map(e => `${e.field}: ${e.message}`).join(', ');
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/features')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Features
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Feature</h1>
        <p className="text-gray-600 mt-1">Define a new AI feature with model and pricing configuration</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Project / Product</h2>
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">Required</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Features must be linked to a Project/Product. Select the project this feature belongs to.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project / Product<span className="text-red-500">*</span>
              </label>
              <select
                name="project"
                value={formData.project}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-md ${
                  touched.project && fieldErrors.project ? 'border-red-500' : 'border-gray-300'
                }`}
                required
                disabled={isLoadingProjects}
              >
                <option value="">
                  {isLoadingProjects ? 'Loading projects...' : 'Select a project'}
                </option>
                {projects.map(project => (
                  <option key={project._id} value={project._id}>
                    {project.name} {project.status ? `(${project.status})` : ''}
                  </option>
                ))}
              </select>
              {touched.project && fieldErrors.project && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.project}</p>
              )}
              {projects.length === 0 && !isLoadingProjects && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">No projects available. Create a project first.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              name="name"
              label="Feature Name"
              required
              alphaOnly
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
              </select>
            </div>
          </div>
        </div>

        {/* Model & Provider */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                  No providers available. <button type="button" onClick={() => navigate('/providers')} className="underline">Create one</button>
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
                disabled={!formData.provider || isLoadingModels}
              >
                <option value="">
                  {isLoadingModels ? 'Loading models...' : 'Select Model'}
                </option>
                {filteredModels.map(model => {
                  const modelValue = model.isDatabaseModel ? model._id : (model.rawId || model.id);
                  const isBest = modelValue === bestModelId;
                  const pricingInfo = model.pricing?.inputPrice
                    ? `(${currencySymbol}${model.pricing.inputPrice}/${currencySymbol}${model.pricing.outputPrice || 0} per 1M)`
                    : '';
                  const contextInfo = model.capabilities?.contextWindow
                    ? `${Math.round(model.capabilities.contextWindow / 1000)}K ctx`
                    : '';

                  return (
                    <option key={modelValue} value={modelValue}>
                      {model.displayName || model.name} {pricingInfo} {contextInfo} {isBest ? '⭐' : ''}
                    </option>
                  );
                })}
              </select>
              {touched.model && fieldErrors.model && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.model}</p>
              )}
              {isLoadingModels && (
                <p className="mt-1 text-sm text-blue-600">Loading models...</p>
              )}
              {!formData.provider && (
                <p className="mt-1 text-sm text-gray-500">Select a provider to see available models</p>
              )}
            </div>
          </div>
        </div>

        {/* Token Estimates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
        </div>

        {/* Infrastructure Costs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
            onClick={() => navigate('/features')}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Feature'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FeatureCreatePage;
