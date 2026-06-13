/**
 * Feature Create Page
 *
 * Create a new feature with model, provider, and pricing configuration.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import featureApi from '../../services/api/feature.api.js';
import modelApi from '../../services/api/model.api.js';
import providerApi from '../../services/api/provider.api.js';
import { getCurrencySymbol, formatCurrencyWithSymbol, getCurrencyLabel } from '../../utils/currency.js';

function FeatureCreatePage() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();

  // Get currency from organization settings or default to USD
  const currency = currentOrganization?.settings?.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providers, setProviders] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelSource, setModelSource] = useState(null);
  const [modelFetchError, setModelFetchError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    status: 'active',
    model: '',
    provider: '',
    modelIdentifier: '',
    modelDisplayName: '',
    // Token estimates
    inputTokensPerRequest: 0,
    outputTokensPerRequest: 0,
    calculationMethod: 'fixed',
    dynamicMultiplier: 1,
    // Infrastructure costs
    fixedCostPerRequest: 0,
    overheadPercentage: 0,
    monthlyFixedCost: 0,
    infrastructureType: 'serverless',
    // Limits
    maxRequestsPerUser: '',
    maxTokensPerUser: '',
    maxRequestsPerMonth: '',
    // Settings
    enabled: true,
    requiresAuth: true,
    cacheEnabled: false,
    cacheTTL: 3600
  });

  // Fetch providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        // Fetch all providers with a high limit to ensure we get all
        const providersRes = await providerApi.getAll({ limit: 100, activeOnly: false });
        console.log('[FeatureCreatePage] Providers fetched:', providersRes.providers?.length, providersRes.providers?.map(p => ({ id: p._id, name: p.name, displayName: p.displayName })));
        if (providersRes.providers) {
          setProviders(providersRes.providers);
        }
      } catch (err) {
        console.error('Failed to fetch providers:', err);
      }
    };

    fetchProviders();
  }, []);

  // Debug: Log when filteredModels changes
  useEffect(() => {
    console.log('[FeatureCreatePage] ====== FILTERED MODELS STATE UPDATED ======');
    console.log('[FeatureCreatePage] Count:', filteredModels.length);
    if (filteredModels.length > 0) {
      console.log('[FeatureCreatePage] Model names:', filteredModels.map(m => m.displayName || m.name).join(', '));
    }
  }, [filteredModels]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

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
        // Fetch models for selected provider
        fetchModels(value);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
      }));
    }
  };

  // Fetch models for a provider (from live API with database fallback)
  const fetchModels = async (providerId) => {
    setIsLoadingModels(true);
    setModelFetchError(null);
    setFilteredModels([]);

    try {
      // Try to fetch from provider's live API first (force refresh to get latest)
      const response = await providerApi.getDynamicModels(providerId, { forceRefresh: true });
      const liveModels = response.models || [];

      // Process models for the dropdown
      const processedModels = liveModels.map(model => ({
        ...model,
        id: model._id || model.id,
        isDatabaseModel: !!model._id,
        source: response.meta?.source || 'unknown'
      }));

      // Sort by display name
      processedModels.sort((a, b) => {
        const nameA = a.displayName || a.name || '';
        const nameB = b.displayName || b.name || '';
        return nameA.localeCompare(nameB);
      });

      setFilteredModels(processedModels);
      setModelSource(response.meta?.source || 'api');

      // Auto-select the first model
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

  // Get the best model ID from filtered models (for highlighting in dropdown)
  const getBestModelId = () => {
    if (filteredModels.length === 0) return '';

    // First try to find a recommended model
    const recommendedModel = filteredModels.find(m => m.isRecommended);
    if (recommendedModel) {
      return recommendedModel.isDatabaseModel ? recommendedModel._id : (recommendedModel.rawId || recommendedModel.id);
    }

    // Otherwise, sort by context window (larger = more capable)
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
    setError('');

    if (!currentOrganization) {
      setError('No organization selected. Please select an organization first.');
      return;
    }

    if (!formData.name.trim()) {
      setError('Feature name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Find the selected model to get its details
      const selectedModel = filteredModels.find(m => (m.rawId || m.id) === formData.model);

      const featureData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category || 'other',
        status: formData.status || 'active',
        organization: currentOrganization._id,
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
          maxRequestsPerUser: formData.maxRequestsPerUser ? Number(formData.maxRequestsPerUser) : null,
          maxTokensPerUser: formData.maxTokensPerUser ? Number(formData.maxTokensPerUser) : null,
          maxRequestsPerMonth: formData.maxRequestsPerMonth ? Number(formData.maxRequestsPerMonth) : null
        },
        settings: {
          enabled: formData.enabled,
          requiresAuth: formData.requiresAuth,
          cacheEnabled: formData.cacheEnabled,
          cacheTTL: Number(formData.cacheTTL) || 3600
        }
      };

      // Handle model reference - use ObjectId for DB models, identifier for dynamic models
      if (selectedModel) {
        if (selectedModel.isDatabaseModel) {
          // Database model - use ObjectId reference
          featureData.model = selectedModel.id;
        } else {
          // Dynamic model - use identifier
          featureData.modelIdentifier = selectedModel.rawId || selectedModel.id;
          featureData.modelDisplayName = selectedModel.displayName || selectedModel.name;
          if (selectedModel.capabilities) {
            featureData.modelCapabilities = selectedModel.capabilities;
          }
        }
      }

      const response = await featureApi.create(featureData);

      if (response.success) {
        navigate('/features');
      } else {
        setError(response.message || 'Failed to create feature');
      }
    } catch (err) {
      console.error('Feature creation error:', err.response?.data);
      const errorData = err.response?.data?.error;
      let errorMessage = 'Failed to create feature';

      if (errorData?.details && Array.isArray(errorData.details)) {
        // Format validation errors
        errorMessage = errorData.details.map(e => `${e.field}: ${e.message}`).join(', ');
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
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

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feature Name<span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="e.g., Chat Assistant, Image Generator"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent resize-none"
                placeholder="Brief description of this feature"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Model & Provider */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Model & Provider</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider
              </label>
              <select
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              >
                <option value="">Select Provider</option>
                {providers.map(provider => (
                  <option key={provider._id} value={provider._id}>
                    {provider.displayName || provider.name}
                  </option>
                ))}
              </select>
              {providers.length === 0 && (
                <p className="mt-1 text-sm text-amber-600">
                  No providers available. <button type="button" onClick={() => navigate('/providers')} className="underline">Create one</button>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Model
              </label>
              <select
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
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

              {/* Loading state */}
              {isLoadingModels && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Fetching latest models from provider API...</span>
                </div>
              )}

              {/* Model source indicator */}
              {!isLoadingModels && modelSource && (
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(modelSource === 'api' || modelSource === 'database_fallback') && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {modelSource === 'database_fallback' ? 'API + Database' : 'Live from API'}
                      </span>
                    )}
                    {modelSource === 'database' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                        From Database
                      </span>
                    )}
                    {modelSource === 'hybrid' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        API + Database
                      </span>
                    )}
                    {modelSource === 'error' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        Error
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''} available
                    </span>
                  </div>
                  {formData.provider && (
                    <button
                      type="button"
                      onClick={() => fetchModels(formData.provider)}
                      disabled={isLoadingModels}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingModels ? 'Refreshing...' : 'Refresh'}
                    </button>
                  )}
                </div>
              )}

              {/* Error state */}
              {modelFetchError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-red-700">{modelFetchError}</p>
                      <button
                        type="button"
                        onClick={() => formData.provider && fetchModels(formData.provider)}
                        className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Success state */}
              {formData.provider && formData.model && !isLoadingModels && (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {filteredModels.find(m => (m.isDatabaseModel ? m._id : (m.rawId || m.id)) === formData.model)?.isRecommended
                    ? 'Recommended model selected'
                    : 'Model selected'}
                </p>
              )}

              {/* No provider selected */}
              {!formData.provider && (
                <p className="mt-1 text-xs text-gray-500">Select a provider to see available models</p>
              )}

              {/* No models available */}
              {formData.provider && !isLoadingModels && filteredModels.length === 0 && !modelFetchError && (
                <p className="mt-1 text-xs text-amber-600">
                  No models for this provider. <button type="button" onClick={() => navigate('/models')} className="underline">Create one</button>
                </p>
              )}
            </div>
          </div>
          {formData.model && filteredModels.find(m => (m.isDatabaseModel ? m._id : (m.rawId || m.id)) === formData.model)?.pricing && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-2">Selected Model Pricing:</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-xs text-gray-500">Input Price</span>
                  <p className="text-lg font-semibold text-gray-900">
                    {currencySymbol}{(filteredModels.find(m => (m.isDatabaseModel ? m._id : (m.rawId || m.id)) === formData.model)?.pricing?.inputPrice || 0).toFixed(2)}/1M tokens
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-xs text-gray-500">Output Price</span>
                  <p className="text-lg font-semibold text-gray-900">
                    {currencySymbol}{(filteredModels.find(m => (m.isDatabaseModel ? m._id : (m.rawId || m.id)) === formData.model)?.pricing?.outputPrice || 0).toFixed(2)}/1M tokens
                  </p>
                </div>
              </div>
            </div>
          )}
          {formData.model && !filteredModels.find(m => (m.rawId || m.id) === formData.model)?.pricing && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-amber-600 mb-2">
                <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Pricing not available for this model. Please configure pricing manually.
              </p>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Input Tokens / Request
              </label>
              <input
                type="number"
                name="inputTokensPerRequest"
                value={formData.inputTokensPerRequest}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 500"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Output Tokens / Request
              </label>
              <input
                type="number"
                name="outputTokensPerRequest"
                value={formData.outputTokensPerRequest}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 1000"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calculation Method
              </label>
              <select
                name="calculationMethod"
                value={formData.calculationMethod}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              >
                <option value="fixed">Fixed</option>
                <option value="dynamic">Dynamic</option>
                <option value="user-based">User Based</option>
              </select>
            </div>
            {formData.calculationMethod === 'dynamic' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dynamic Multiplier
                </label>
                <input
                  type="number"
                  name="dynamicMultiplier"
                  value={formData.dynamicMultiplier}
                  onChange={handleChange}
                  min="0.1"
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            )}
          </div>
          {formData.inputTokensPerRequest > 0 && formData.outputTokensPerRequest > 0 && formData.model && filteredModels.find(m => (m.isDatabaseModel ? m._id : (m.rawId || m.id)) === formData.model)?.pricing && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-2">Estimated Cost per 1000 Requests:</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-[#DC2626]">
                  {formatCurrencyWithSymbol(
                    ((filteredModels.find(m => (m.isDatabaseModel ? m._id : (m.rawId || m.id)) === formData.model)?.pricing?.inputPrice || 0) / 1000000) * formData.inputTokensPerRequest * 1000 +
                    ((filteredModels.find(m => (m.isDatabaseModel ? m._id : (m.rawId || m.id)) === formData.model)?.pricing?.outputPrice || 0) / 1000000) * formData.outputTokensPerRequest * 1000,
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getCurrencyLabel('Fixed Cost / Request', currency)}
              </label>
              <input
                type="number"
                name="fixedCostPerRequest"
                value={formData.fixedCostPerRequest}
                onChange={handleChange}
                min="0"
                step="0.00001"
                placeholder="0.00001"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Overhead Percentage (%)
              </label>
              <input
                type="number"
                name="overheadPercentage"
                value={formData.overheadPercentage}
                onChange={handleChange}
                min="0"
                max="100"
                placeholder="10"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getCurrencyLabel('Monthly Fixed Cost', currency)}
              </label>
              <input
                type="number"
                name="monthlyFixedCost"
                value={formData.monthlyFixedCost}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="100"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Infrastructure Type
              </label>
              <select
                name="infrastructureType"
                value={formData.infrastructureType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Requests / User
              </label>
              <input
                type="number"
                name="maxRequestsPerUser"
                value={formData.maxRequestsPerUser}
                onChange={handleChange}
                min="0"
                placeholder="Unlimited"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <p className="mt-1 text-xs text-gray-500">Leave empty for unlimited</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Tokens / User
              </label>
              <input
                type="number"
                name="maxTokensPerUser"
                value={formData.maxTokensPerUser}
                onChange={handleChange}
                min="0"
                placeholder="Unlimited"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Requests / Month
              </label>
              <input
                type="number"
                name="maxRequestsPerMonth"
                value={formData.maxRequestsPerMonth}
                onChange={handleChange}
                min="0"
                placeholder="Unlimited"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
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
                className="w-4 h-4 text-[#DC2626] border-gray-300 rounded "
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
                className="w-4 h-4 text-[#DC2626] border-gray-300 rounded "
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
                className="w-4 h-4 text-[#DC2626] border-gray-300 rounded "
              />
              <label htmlFor="cacheEnabled" className="text-sm text-gray-700">
                Enable Response Caching
              </label>
            </div>
            {formData.cacheEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cache TTL (seconds)
                </label>
                <input
                  type="number"
                  name="cacheTTL"
                  value={formData.cacheTTL}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
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
            className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Feature'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FeatureCreatePage;