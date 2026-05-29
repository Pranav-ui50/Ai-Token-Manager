/**
 * Admin Models Page
 *
 * Super admin page for managing AI models.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../services/api/admin.api.js';
import providerApi from '../../services/api/provider.api.js';

const MODEL_TYPES = {
  chat: { label: 'Chat', color: 'bg-blue-100 text-blue-800' },
  completion: { label: 'Completion', color: 'bg-green-100 text-green-800' },
  embedding: { label: 'Embedding', color: 'bg-purple-100 text-purple-800' },
  image: { label: 'Image', color: 'bg-yellow-100 text-yellow-800' },
  audio: { label: 'Audio', color: 'bg-pink-100 text-pink-800' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-800' }
};

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  deprecated: 'bg-red-100 text-red-800'
};

function AdminModelsPage() {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    provider: '',
    type: 'chat',
    pricing: {
      inputPrice: 0,
      outputPrice: 0,
      currency: 'USD'
    },
    capabilities: {
      contextWindow: 4096,
      maxOutput: 2048,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false
    },
    settings: {
      requiresApiKey: true,
      baseUrl: ''
    }
  });

  // Fetch providers for dropdown
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await providerApi.getAll({ limit: 100 });
        setProviders(response.providers || []);
      } catch (err) {
        console.error('Failed to fetch providers:', err);
      }
    };
    fetchProviders();
  }, []);

  // Fetch models
  const fetchModels = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await adminApi.getModels({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        provider: selectedProvider || undefined,
        type: selectedType || undefined,
        status: selectedStatus || undefined
      });

      setModels(response.models || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0,
        pages: response.pagination?.pages || 0
      }));
    } catch (err) {
      console.error('Failed to fetch models:', err);
      setError(err.response?.data?.error?.message || 'Failed to load models');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [pagination.page, selectedProvider, selectedType, selectedStatus]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        fetchModels();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Create model
  const handleCreateModel = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await adminApi.createModel(formData);
      setShowModal(false);
      resetForm();
      fetchModels();
    } catch (err) {
      console.error('Failed to create model:', err);
      setError(err.response?.data?.error?.message || 'Failed to create model');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update model
  const handleUpdateModel = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await adminApi.updateModel(selectedModel._id, formData);
      setShowEditModal(false);
      setSelectedModel(null);
      resetForm();
      fetchModels();
    } catch (err) {
      console.error('Failed to update model:', err);
      setError(err.response?.data?.error?.message || 'Failed to update model');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle model status
  const handleToggleStatus = async (model) => {
    try {
      await adminApi.toggleModelStatus(model._id, !model.isActive);
      fetchModels();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setError(err.response?.data?.error?.message || 'Failed to update status');
    }
  };

  // Delete model
  const handleDeleteModel = async (model) => {
    if (!window.confirm(`Are you sure you want to delete ${model.displayName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await adminApi.deleteModel(model._id);
      fetchModels();
    } catch (err) {
      console.error('Failed to delete model:', err);
      setError(err.response?.data?.error?.message || 'Failed to delete model');
    }
  };

  // Open edit modal
  const openEditModal = (model) => {
    setSelectedModel(model);
    setFormData({
      name: model.name,
      displayName: model.displayName || '',
      provider: model.provider?._id || model.provider || '',
      type: model.type || 'chat',
      pricing: {
        inputPrice: model.pricing?.inputPrice || 0,
        outputPrice: model.pricing?.outputPrice || 0,
        currency: model.pricing?.currency || 'USD'
      },
      capabilities: {
        contextWindow: model.capabilities?.contextWindow || 4096,
        maxOutput: model.capabilities?.maxOutput || 2048,
        supportsStreaming: model.capabilities?.supportsStreaming ?? true,
        supportsVision: model.capabilities?.supportsVision ?? false,
        supportsFunctionCalling: model.capabilities?.supportsFunctionCalling ?? false
      },
      settings: {
        requiresApiKey: model.settings?.requiresApiKey ?? true,
        baseUrl: model.settings?.baseUrl || ''
      }
    });
    setShowEditModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      provider: '',
      type: 'chat',
      pricing: {
        inputPrice: 0,
        outputPrice: 0,
        currency: 'USD'
      },
      capabilities: {
        contextWindow: 4096,
        maxOutput: 2048,
        supportsStreaming: true,
        supportsVision: false,
        supportsFunctionCalling: false
      },
      settings: {
        requiresApiKey: true,
        baseUrl: ''
      }
    });
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return '-';
    if (price === 0) return 'Free';
    return `$${price.toFixed(4)}/1M`;
  };

  const formatNumber = (num) => {
    if (!num) return '-';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading && models.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DC2626]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Models</h1>
          <p className="text-sm text-gray-500">Manage AI models across all providers</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors"
        >
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Model
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-800 hover:text-red-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total Models</p>
          <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{models.filter(m => m.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Inactive</p>
          <p className="text-2xl font-bold text-red-600">{models.filter(m => !m.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Providers</p>
          <p className="text-2xl font-bold text-gray-900">{providers.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
          >
            <option value="">All Providers</option>
            {providers.map(p => (
              <option key={p._id} value={p._id}>{p.displayName}</option>
            ))}
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
          >
            <option value="">All Types</option>
            {Object.entries(MODEL_TYPES).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Models Table */}
      {models.length === 0 && !isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No models found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new model.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Context</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {models.map((model) => (
                  <tr key={model._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{model.displayName}</div>
                        <div className="text-xs text-gray-500">{model.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {model.provider?.logo && (
                          <img src={model.provider.logo} alt={model.provider.displayName} className="h-6 w-6 rounded" />
                        )}
                        <span className="text-sm text-gray-900">{model.provider?.displayName || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${MODEL_TYPES[model.type]?.color || MODEL_TYPES.other.color}`}>
                        {MODEL_TYPES[model.type]?.label || model.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(model.capabilities?.contextWindow)} tokens
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-gray-900">In: {formatPrice(model.pricing?.inputPrice)}</div>
                        <div className="text-gray-500">Out: {formatPrice(model.pricing?.outputPrice)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${model.isActive ? STATUS_COLORS.active : STATUS_COLORS.inactive}`}>
                        {model.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(model)}
                          className={`text-xs px-2 py-1 rounded ${model.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                        >
                          {model.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => openEditModal(model)}
                          className="text-xs text-[#DC2626] hover:text-[#B91C1C] font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteModel(model)}
                          className="text-xs text-gray-500 hover:text-red-600 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Model Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Model</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateModel} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (slug) *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="e.g., gpt-4"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="e.g., GPT-4"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider *</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    required
                  >
                    <option value="">Select Provider</option>
                    {providers.map(p => (
                      <option key={p._id} value={p._id}>{p.displayName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    required
                  >
                    {Object.entries(MODEL_TYPES).map(([value, { label }]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Pricing (per 1M tokens)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Input Price ($)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.pricing.inputPrice}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        pricing: { ...prev.pricing, inputPrice: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Output Price ($)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.pricing.outputPrice}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        pricing: { ...prev.pricing, outputPrice: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Capabilities</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Context Window</label>
                    <input
                      type="number"
                      value={formData.capabilities.contextWindow}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        capabilities: { ...prev.capabilities, contextWindow: parseInt(e.target.value) || 4096 }
                      }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Max Output</label>
                    <input
                      type="number"
                      value={formData.capabilities.maxOutput}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        capabilities: { ...prev.capabilities, maxOutput: parseInt(e.target.value) || 2048 }
                      }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.capabilities.supportsStreaming}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        capabilities: { ...prev.capabilities, supportsStreaming: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-600">Supports Streaming</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.capabilities.supportsVision}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        capabilities: { ...prev.capabilities, supportsVision: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-600">Supports Vision</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.capabilities.supportsFunctionCalling}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        capabilities: { ...prev.capabilities, supportsFunctionCalling: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-600">Supports Function Calling</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Model'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Model Modal */}
      {showEditModal && selectedModel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Model</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedModel(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateModel} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    required
                  >
                    {Object.entries(MODEL_TYPES).map(([value, { label }]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Pricing (per 1M tokens)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Input Price ($)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.pricing.inputPrice}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        pricing: { ...prev.pricing, inputPrice: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Output Price ($)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.pricing.outputPrice}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        pricing: { ...prev.pricing, outputPrice: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Capabilities</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Context Window</label>
                    <input
                      type="number"
                      value={formData.capabilities.contextWindow}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        capabilities: { ...prev.capabilities, contextWindow: parseInt(e.target.value) || 4096 }
                      }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Max Output</label>
                    <input
                      type="number"
                      value={formData.capabilities.maxOutput}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        capabilities: { ...prev.capabilities, maxOutput: parseInt(e.target.value) || 2048 }
                      }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.capabilities.supportsStreaming}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        capabilities: { ...prev.capabilities, supportsStreaming: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-600">Supports Streaming</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.capabilities.supportsVision}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        capabilities: { ...prev.capabilities, supportsVision: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-600">Supports Vision</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.capabilities.supportsFunctionCalling}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        capabilities: { ...prev.capabilities, supportsFunctionCalling: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-600">Supports Function Calling</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedModel(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminModelsPage;