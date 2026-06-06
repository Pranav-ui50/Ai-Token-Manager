/**
 * Model Create/Edit Page
 *
 * Create or edit an AI model with pricing information.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import modelApi from '../../services/api/model.api.js';
import providerApi from '../../services/api/provider.api.js';

function ModelCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams(); // If id exists, we're editing
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [providers, setProviders] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    provider: '',
    type: 'chat',
    // Capabilities
    contextWindow: 4096,
    maxOutputTokens: 4096,
    supportsVision: false,
    supportsFunctionCalling: false,
    supportsStreaming: true,
    supportsJsonMode: false,
    // Pricing
    inputPrice: 0,
    outputPrice: 0,
    currency: 'USD',
    // Defaults
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    // Status
    isActive: true
  });

  useEffect(() => {
    fetchProviders();
    if (isEditing) {
      fetchModel();
    }
  }, [id]);

  const fetchProviders = async () => {
    try {
      const response = await providerApi.getAll({ limit: 100 });
      setProviders(response.providers || []);
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    }
  };

  const fetchModel = async () => {
    try {
      setLoading(true);
      const model = await modelApi.getById(id);
      setFormData({
        name: model.name || '',
        displayName: model.displayName || '',
        description: model.description || '',
        provider: model.provider?._id || model.provider || '',
        type: model.type || 'chat',
        contextWindow: model.capabilities?.contextWindow || 4096,
        maxOutputTokens: model.capabilities?.maxOutputTokens || 4096,
        supportsVision: model.capabilities?.supportsVision || false,
        supportsFunctionCalling: model.capabilities?.supportsFunctionCalling || false,
        supportsStreaming: model.capabilities?.supportsStreaming ?? true,
        supportsJsonMode: model.capabilities?.supportsJsonMode || false,
        inputPrice: model.pricing?.inputPrice || 0,
        outputPrice: model.pricing?.outputPrice || 0,
        currency: model.pricing?.currency || 'USD',
        temperature: model.defaults?.temperature ?? 0.7,
        topP: model.defaults?.topP ?? 1,
        frequencyPenalty: model.defaults?.frequencyPenalty ?? 0,
        presencePenalty: model.defaults?.presencePenalty ?? 0,
        isActive: model.isActive ?? true
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch model');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const modelData = {
        name: formData.name.trim(),
        displayName: formData.displayName.trim() || formData.name.trim(),
        description: formData.description.trim() || undefined,
        providerId: formData.provider, // Backend expects providerId, not provider
        type: formData.type,
        capabilities: {
          contextWindow: Number(formData.contextWindow) || 4096,
          maxOutputTokens: Number(formData.maxOutputTokens) || 4096,
          supportsVision: formData.supportsVision,
          supportsFunctionCalling: formData.supportsFunctionCalling,
          supportsStreaming: formData.supportsStreaming,
          supportsJsonMode: formData.supportsJsonMode
        },
        pricing: {
          inputPrice: Number(formData.inputPrice) || 0,
          outputPrice: Number(formData.outputPrice) || 0,
          currency: formData.currency,
          unit: 'per_token',
          pricePerUnit: 1000000
        },
        defaults: {
          temperature: Number(formData.temperature) ?? 0.7,
          topP: Number(formData.topP) ?? 1,
          frequencyPenalty: Number(formData.frequencyPenalty) ?? 0,
          presencePenalty: Number(formData.presencePenalty) ?? 0
        },
        isActive: formData.isActive
      };

      if (isEditing) {
        await modelApi.update(id, modelData);
        navigate(`/models/${id}`);
      } else {
        const response = await modelApi.create(modelData);
        navigate(`/models/${response._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save model');
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
        <button
          onClick={() => navigate('/models')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Models
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Model' : 'Create New Model'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditing ? 'Update model information and pricing' : 'Add a new AI model with pricing'}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <span className="text-sm">{error}</span>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Name<span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., gpt-4-turbo"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Internal identifier (e.g., gpt-4-turbo)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name<span className="text-red-500">*</span></label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="e.g., GPT-4 Turbo"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">User-friendly name (defaults to model name)</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider<span className="text-red-500">*</span></label>
              <select
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
                required
              >
                <option value="">Select Provider</option>
                {providers.map(p => (
                  <option key={p._id} value={p._id}>{p.displayName || p.name}</option>
                ))}
              </select>
              {providers.length === 0 && (
                <p className="mt-1 text-sm text-amber-600">
                  No providers available. <button type="button" onClick={() => navigate('/providers')} className="underline">Create one first</button>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              >
                <option value="chat">Chat</option>
                <option value="completion">Completion</option>
                <option value="embedding">Embedding</option>
                <option value="image">Image</option>
                <option value="audio">Audio</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="isActive"
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
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
                placeholder="Brief description of this model"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing (per 1M tokens)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Set the cost per million tokens. Most AI providers price per 1,000,000 tokens.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Input Price ($)
              </label>
              <input
                type="number"
                name="inputPrice"
                value={formData.inputPrice}
                onChange={handleChange}
                min="0"
                step="0.000001"
                placeholder="e.g., 30"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Cost per 1M input tokens</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Output Price ($)
              </label>
              <input
                type="number"
                name="outputPrice"
                value={formData.outputPrice}
                onChange={handleChange}
                min="0"
                step="0.000001"
                placeholder="e.g., 60"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Cost per 1M output tokens</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>
          {formData.inputPrice > 0 && formData.outputPrice > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Example costs:</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">1K tokens:</span>
                  <span className="ml-2 font-medium">${((formData.inputPrice + formData.outputPrice) / 1000).toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-gray-500">100K tokens:</span>
                  <span className="ml-2 font-medium">${((formData.inputPrice + formData.outputPrice) / 10).toFixed(4)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Capabilities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Context Window (tokens)
              </label>
              <input
                type="number"
                name="contextWindow"
                value={formData.contextWindow}
                onChange={handleChange}
                min="1"
                placeholder="e.g., 128000"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Output Tokens
              </label>
              <input
                type="number"
                name="maxOutputTokens"
                value={formData.maxOutputTokens}
                onChange={handleChange}
                min="1"
                placeholder="e.g., 4096"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="supportsStreaming"
                id="supportsStreaming"
                checked={formData.supportsStreaming}
                onChange={handleChange}
                className="w-4 h-4 text-[#DC2626] border-gray-300 rounded "
              />
              <label htmlFor="supportsStreaming" className="text-sm text-gray-700">Streaming</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="supportsVision"
                id="supportsVision"
                checked={formData.supportsVision}
                onChange={handleChange}
                className="w-4 h-4 text-[#DC2626] border-gray-300 rounded "
              />
              <label htmlFor="supportsVision" className="text-sm text-gray-700">Vision</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="supportsFunctionCalling"
                id="supportsFunctionCalling"
                checked={formData.supportsFunctionCalling}
                onChange={handleChange}
                className="w-4 h-4 text-[#DC2626] border-gray-300 rounded "
              />
              <label htmlFor="supportsFunctionCalling" className="text-sm text-gray-700">Function Calling</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="supportsJsonMode"
                id="supportsJsonMode"
                checked={formData.supportsJsonMode}
                onChange={handleChange}
                className="w-4 h-4 text-[#DC2626] border-gray-300 rounded "
              />
              <label htmlFor="supportsJsonMode" className="text-sm text-gray-700">JSON Mode</label>
            </div>
          </div>
        </div>

        {/* Default Parameters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Default Parameters</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature
              </label>
              <input
                type="number"
                name="temperature"
                value={formData.temperature}
                onChange={handleChange}
                min="0"
                max="2"
                step="0.1"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Top P
              </label>
              <input
                type="number"
                name="topP"
                value={formData.topP}
                onChange={handleChange}
                min="0"
                max="1"
                step="0.1"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Freq. Penalty
              </label>
              <input
                type="number"
                name="frequencyPenalty"
                value={formData.frequencyPenalty}
                onChange={handleChange}
                min="-2"
                max="2"
                step="0.1"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pres. Penalty
              </label>
              <input
                type="number"
                name="presencePenalty"
                value={formData.presencePenalty}
                onChange={handleChange}
                min="-2"
                max="2"
                step="0.1"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(isEditing ? `/models/${id}` : '/models')}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Model')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ModelCreatePage;