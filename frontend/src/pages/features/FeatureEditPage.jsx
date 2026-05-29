/**
 * Feature Edit Page
 *
 * Edit a feature including model, provider, and pricing configuration.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import featureApi from '../../services/api/feature.api.js';
import modelApi from '../../services/api/model.api.js';
import providerApi from '../../services/api/provider.api.js';

function FeatureEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [models, setModels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    status: 'active',
    model: '',
    provider: '',
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
            inputTokensPerRequest: feature.tokenEstimates?.inputTokensPerRequest || 0,
            outputTokensPerRequest: feature.tokenEstimates?.outputTokensPerRequest || 0,
            calculationMethod: feature.tokenEstimates?.calculationMethod || 'fixed',
            dynamicMultiplier: feature.tokenEstimates?.dynamicMultiplier || 1,
            fixedCostPerRequest: feature.infrastructureCost?.fixedCostPerRequest || 0,
            overheadPercentage: feature.infrastructureCost?.overheadPercentage || 0,
            monthlyFixedCost: feature.infrastructureCost?.monthlyFixedCost || 0,
            infrastructureType: feature.infrastructureCost?.infrastructureType || 'serverless',
            maxRequestsPerUser: feature.limits?.maxRequestsPerUser || '',
            maxTokensPerUser: feature.limits?.maxTokensPerUser || '',
            maxRequestsPerMonth: feature.limits?.maxRequestsPerMonth || '',
            enabled: feature.settings?.enabled ?? true,
            requiresAuth: feature.settings?.requiresAuth ?? true,
            cacheEnabled: feature.settings?.cacheEnabled ?? false,
            cacheTTL: feature.settings?.cacheTTL || 3600
          });
        }

      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load feature');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

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
        [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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

      const response = await featureApi.update(id, updateData);

      if (response.success) {
        navigate(`/features/${id}`);
      } else {
        setError(response.message || 'Failed to update feature');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update feature');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626]"></div>
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
                <option value="deprecated">Deprecated</option>
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
                  No providers available. <Link to="/providers" className="underline">Create one</Link>
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
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={!formData.provider}
              >
                <option value="">Select Model</option>
                {filteredModels.map(model => (
                  <option key={model._id} value={model._id}>
                    {model.displayName || model.name} {model.pricing ? `($${model.pricing.inputPrice}/$${model.pricing.outputPrice} per 1M tokens)` : ''}
                  </option>
                ))}
              </select>
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
                    ${(filteredModels.find(m => m._id === formData.model)?.pricing?.inputPrice || 0).toFixed(2)}/1M tokens
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-xs text-gray-500">Output Price</span>
                  <p className="text-lg font-semibold text-gray-900">
                    ${(filteredModels.find(m => m._id === formData.model)?.pricing?.outputPrice || 0).toFixed(2)}/1M tokens
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
          {formData.inputTokensPerRequest > 0 && formData.outputTokensPerRequest > 0 && formData.model && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-2">Estimated Cost per 1000 Requests:</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-[#DC2626]">
                  ${(
                    ((filteredModels.find(m => m._id === formData.model)?.pricing?.inputPrice || 0) / 1000000) * formData.inputTokensPerRequest * 1000 +
                    ((filteredModels.find(m => m._id === formData.model)?.pricing?.outputPrice || 0) / 1000000) * formData.outputTokensPerRequest * 1000
                  ).toFixed(4)}
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
                Fixed Cost / Request ($)
              </label>
              <input
                type="number"
                name="fixedCostPerRequest"
                value={formData.fixedCostPerRequest}
                onChange={handleChange}
                min="0"
                step="0.00001"
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
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Fixed Cost ($)
              </label>
              <input
                type="number"
                name="monthlyFixedCost"
                value={formData.monthlyFixedCost}
                onChange={handleChange}
                min="0"
                step="0.01"
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