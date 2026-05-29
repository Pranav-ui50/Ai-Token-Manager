/**
 * Admin Providers Page
 *
 * Super admin page for managing AI providers.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../services/api/admin.api.js';

const PROVIDER_COLORS = {
  openai: 'from-green-500 to-green-600',
  anthropic: 'from-orange-500 to-orange-600',
  google: 'from-blue-500 to-blue-600',
  meta: 'from-blue-600 to-indigo-600',
  mistral: 'from-purple-500 to-purple-600',
  ollama: 'from-gray-600 to-gray-700',
  zhipu: 'from-teal-500 to-teal-600',
  default: 'from-[#DC2626] to-[#B91C1C]'
};

function AdminProvidersPage() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    logo: '',
    website: '',
    settings: {
      supportsStreaming: false,
      supportsVision: false,
      supportsFunctionCalling: false,
      requiresApiKey: true
    }
  });

  // Fetch providers
  const fetchProviders = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await adminApi.getProviders({
        search: searchQuery || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined
      });

      setProviders(response.providers || []);
    } catch (err) {
      console.error('Failed to fetch providers:', err);
      setError(err.response?.data?.error?.message || 'Failed to load providers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [filterStatus]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProviders();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Create provider
  const handleCreateProvider = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await adminApi.createProvider(formData);
      setShowModal(false);
      resetForm();
      fetchProviders();
    } catch (err) {
      console.error('Failed to create provider:', err);
      setError(err.response?.data?.error?.message || 'Failed to create provider');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update provider
  const handleUpdateProvider = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await adminApi.updateProvider(selectedProvider._id, formData);
      setShowEditModal(false);
      setSelectedProvider(null);
      resetForm();
      fetchProviders();
    } catch (err) {
      console.error('Failed to update provider:', err);
      setError(err.response?.data?.error?.message || 'Failed to update provider');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle provider status
  const handleToggleStatus = async (provider) => {
    try {
      await adminApi.toggleProviderStatus(provider._id, !provider.isActive);
      fetchProviders();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setError(err.response?.data?.error?.message || 'Failed to update status');
    }
  };

  // Delete provider
  const handleDeleteProvider = async (provider) => {
    if (!window.confirm(`Are you sure you want to delete ${provider.displayName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await adminApi.deleteProvider(provider._id);
      fetchProviders();
    } catch (err) {
      console.error('Failed to delete provider:', err);
      setError(err.response?.data?.error?.message || 'Failed to delete provider');
    }
  };

  // Open edit modal
  const openEditModal = (provider) => {
    setSelectedProvider(provider);
    setFormData({
      name: provider.name,
      displayName: provider.displayName || '',
      description: provider.description || '',
      logo: provider.logo || '',
      website: provider.website || '',
      settings: {
        supportsStreaming: provider.settings?.supportsStreaming || false,
        supportsVision: provider.settings?.supportsVision || false,
        supportsFunctionCalling: provider.settings?.supportsFunctionCalling || false,
        requiresApiKey: provider.settings?.requiresApiKey !== false
      }
    });
    setShowEditModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      logo: '',
      website: '',
      settings: {
        supportsStreaming: false,
        supportsVision: false,
        supportsFunctionCalling: false,
        requiresApiKey: true
      }
    });
  };

  const getProviderColor = (providerName) => {
    const name = providerName?.toLowerCase() || '';
    if (name.includes('openai')) return PROVIDER_COLORS.openai;
    if (name.includes('anthropic')) return PROVIDER_COLORS.anthropic;
    if (name.includes('google') || name.includes('gemini')) return PROVIDER_COLORS.google;
    if (name.includes('meta') || name.includes('llama')) return PROVIDER_COLORS.meta;
    if (name.includes('mistral')) return PROVIDER_COLORS.mistral;
    if (name.includes('ollama')) return PROVIDER_COLORS.ollama;
    if (name.includes('zhipu')) return PROVIDER_COLORS.zhipu;
    return PROVIDER_COLORS.default;
  };

  if (isLoading && providers.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">AI Providers</h1>
          <p className="text-sm text-gray-500">Manage AI service providers and their configurations</p>
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
          Add Provider
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
          <p className="text-sm text-gray-500">Total Providers</p>
          <p className="text-2xl font-bold text-gray-900">{providers.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{providers.filter(p => p.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Inactive</p>
          <p className="text-2xl font-bold text-red-600">{providers.filter(p => !p.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total Models</p>
          <p className="text-2xl font-bold text-gray-900">{providers.reduce((sum, p) => sum + (p.modelCount || 0), 0)}</p>
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
                placeholder="Search providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Providers Grid */}
      {providers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No providers found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new provider.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <div key={provider._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {provider.logo ? (
                    <img
                      src={provider.logo}
                      alt={provider.displayName}
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${getProviderColor(provider.name)} flex items-center justify-center`}>
                      <span className="text-lg font-bold text-white">
                        {provider.displayName?.charAt(0).toUpperCase() || 'P'}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{provider.displayName}</h3>
                    <p className="text-sm text-gray-500">{provider.name}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${provider.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {provider.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {provider.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{provider.description}</p>
              )}

              <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 flex-wrap">
                <span className="bg-gray-100 px-2 py-1 rounded">{provider.modelCount || 0} models</span>
                {provider.settings?.supportsStreaming && (
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded">Streaming</span>
                )}
                {provider.settings?.supportsVision && (
                  <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">Vision</span>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleToggleStatus(provider)}
                  className={`text-xs px-3 py-1 rounded ${provider.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                >
                  {provider.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(provider)}
                    className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProvider(provider)}
                    className="text-sm text-gray-500 hover:text-red-600 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Provider Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Provider</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateProvider} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (slug) *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  placeholder="e.g., openai"
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
                  placeholder="e.g., OpenAI"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  placeholder="Provider description"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input
                  type="url"
                  value={formData.logo}
                  onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Features</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.settings.supportsStreaming}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, supportsStreaming: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-600">Supports Streaming</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.settings.supportsVision}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, supportsVision: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-600">Supports Vision</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.settings.supportsFunctionCalling}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, supportsFunctionCalling: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-600">Supports Function Calling</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.settings.requiresApiKey}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, requiresApiKey: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-600">Requires API Key</span>
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
                  {isSubmitting ? 'Creating...' : 'Create Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Provider Modal */}
      {showEditModal && selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Provider</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedProvider(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateProvider} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input
                  type="url"
                  value={formData.logo}
                  onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Features</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.settings.supportsStreaming}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, supportsStreaming: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-600">Supports Streaming</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.settings.supportsVision}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, supportsVision: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-600">Supports Vision</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.settings.supportsFunctionCalling}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, supportsFunctionCalling: e.target.checked }
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
                    setSelectedProvider(null);
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

export default AdminProvidersPage;