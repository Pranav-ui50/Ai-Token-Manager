/**
 * Admin Providers Page
 *
 * Super admin page for managing AI providers.
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../services/api/admin.api.js';
import { showToast } from '../../utils/toasts.js';
import Loader from '../../components/common/Loader.jsx';

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
      requiresApiKey: false
    }
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch providers
  const fetchProviders = async () => {
    try {
      setIsLoading(true);

      const response = await adminApi.getProviders({
        search: searchQuery || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined
      });

      setProviders(response.providers || []);
    } catch (err) {
      console.error('Failed to fetch providers:', err);
      showToast.error(err.response?.data?.error?.message || 'Failed to load providers');
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

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      await adminApi.createProvider(formData);
      showToast.providerCreated();
      setShowModal(false);
      resetForm();
      fetchProviders();
    } catch (err) {
      console.error('Failed to create provider:', err);
      showToast.error(err.response?.data?.error?.message || 'Failed to create provider');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validate edit form
  const validateEditForm = () => {
    const errors = {};

    // Display Name validation
    if (!formData.displayName.trim()) {
      errors.displayName = 'Display name is required';
    } else if (formData.displayName.length > 60) {
      errors.displayName = 'Display name cannot exceed 60 characters';
    }

    // Description validation
    if (formData.description && formData.description.length > 200) {
      errors.description = 'Description cannot exceed 200 characters';
    }

    // Logo URL validation
    if (formData.logo && formData.logo.length > 255) {
      errors.logo = 'Logo URL cannot exceed 255 characters';
    } else if (formData.logo && !/^https?:\/\/.+/i.test(formData.logo)) {
      errors.logo = 'Logo URL must be a valid URL starting with http:// or https://';
    }

    // Website URL validation
    if (formData.website && formData.website.length > 255) {
      errors.website = 'Website URL cannot exceed 255 characters';
    } else if (formData.website && !/^https?:\/\/.+/i.test(formData.website)) {
      errors.website = 'Website URL must be a valid URL starting with http:// or https://';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update provider
  const handleUpdateProvider = async (e) => {
    e.preventDefault();

    if (!validateEditForm()) return;

    try {
      setIsSubmitting(true);
      await adminApi.updateProvider(selectedProvider._id, formData);
      showToast.providerUpdated();
      setShowEditModal(false);
      setSelectedProvider(null);
      resetForm();
      fetchProviders();
    } catch (err) {
      console.error('Failed to update provider:', err);
      showToast.error(err.response?.data?.error?.message || 'Failed to update provider');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle provider status
  const handleToggleStatus = async (provider) => {
    try {
      await adminApi.toggleProviderStatus(provider._id, !provider.isActive);
      showToast.providerStatusChanged(provider.isActive ? 'inactive' : 'active');
      fetchProviders();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      showToast.error(err.response?.data?.error?.message || 'Failed to update status');
    }
  };

  // Delete provider
  const handleDeleteProvider = async (provider) => {
    if (!window.confirm(`Are you sure you want to delete ${provider.displayName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await adminApi.deleteProvider(provider._id);
      showToast.providerDeleted();
      fetchProviders();
    } catch (err) {
      console.error('Failed to delete provider:', err);
      showToast.error(err.response?.data?.error?.message || 'Failed to delete provider');
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
        requiresApiKey: provider.settings?.requiresApiKey || false
      }
    });
    setFormErrors({});
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
        requiresApiKey: false
      }
    });
    setFormErrors({});
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Name (slug) is required';
    } else if (formData.name.length > 60) {
      errors.name = 'Name cannot exceed 60 characters';
    } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
      errors.name = 'Name can only contain lowercase letters, numbers, and hyphens';
    }

    // Display Name validation
    if (!formData.displayName.trim()) {
      errors.displayName = 'Display name is required';
    } else if (formData.displayName.length > 60) {
      errors.displayName = 'Display name cannot exceed 60 characters';
    }

    // Description validation
    if (formData.description && formData.description.length > 200) {
      errors.description = 'Description cannot exceed 200 characters';
    }

    // Logo URL validation
    if (formData.logo && formData.logo.length > 255) {
      errors.logo = 'Logo URL cannot exceed 255 characters';
    } else if (formData.logo && !/^https?:\/\/.+/i.test(formData.logo)) {
      errors.logo = 'Logo URL must be a valid URL starting with http:// or https://';
    }

    // Website URL validation
    if (formData.website && formData.website.length > 255) {
      errors.website = 'Website URL cannot exceed 255 characters';
    } else if (formData.website && !/^https?:\/\/.+/i.test(formData.website)) {
      errors.website = 'Website URL must be a valid URL starting with http:// or https://';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
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
        <Loader />
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
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit provider"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteProvider(provider)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete provider"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Provider Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add Provider</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateProvider} className="p-6 space-y-5">
              {/* Name (slug) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Name (slug)<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                    setFormData(prev => ({ ...prev, name: value }));
                    if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                  }}
                  maxLength={60}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all ${formErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  placeholder="e.g., openai"
                />
                <div className="flex justify-between items-center mt-1">
                  {formErrors.name ? (
                    <span className="text-xs text-red-500">{formErrors.name}</span>
                  ) : (
                    <span className="text-xs text-gray-400">Lowercase letters, numbers, and hyphens only</span>
                  )}
                  <span className="text-xs text-gray-400">{formData.name.length}/60</span>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Display Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, displayName: e.target.value }));
                    if (formErrors.displayName) setFormErrors(prev => ({ ...prev, displayName: '' }));
                  }}
                  maxLength={60}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all ${formErrors.displayName ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  placeholder="e.g., OpenAI"
                />
                <div className="flex justify-between items-center mt-1">
                  {formErrors.displayName ? (
                    <span className="text-xs text-red-500">{formErrors.displayName}</span>
                  ) : (
                    <span></span>
                  )}
                  <span className="text-xs text-gray-400">{formData.displayName.length}/60</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                    if (formErrors.description) setFormErrors(prev => ({ ...prev, description: '' }));
                  }}
                  maxLength={200}
                  rows={3}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all resize-none overflow-y-auto ${formErrors.description ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  placeholder="Brief description of the provider"
                />
                <div className="flex justify-between items-center mt-1">
                  {formErrors.description ? (
                    <span className="text-xs text-red-500">{formErrors.description}</span>
                  ) : (
                    <span></span>
                  )}
                  <span className="text-xs text-gray-400">{formData.description.length}/200</span>
                </div>
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Logo URL
                </label>
                <input
                  type="text"
                  value={formData.logo}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, logo: e.target.value }));
                    if (formErrors.logo) setFormErrors(prev => ({ ...prev, logo: '' }));
                  }}
                  maxLength={255}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all ${formErrors.logo ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  placeholder="https://example.com/logo.png"
                />
                <div className="flex justify-between items-center mt-1">
                  {formErrors.logo ? (
                    <span className="text-xs text-red-500">{formErrors.logo}</span>
                  ) : (
                    <span className="text-xs text-gray-400">Valid URL starting with http:// or https://</span>
                  )}
                  <span className="text-xs text-gray-400">{formData.logo.length}/255</span>
                </div>
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Website URL
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, website: e.target.value }));
                    if (formErrors.website) setFormErrors(prev => ({ ...prev, website: '' }));
                  }}
                  maxLength={255}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all ${formErrors.website ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  placeholder="https://example.com"
                />
                <div className="flex justify-between items-center mt-1">
                  {formErrors.website ? (
                    <span className="text-xs text-red-500">{formErrors.website}</span>
                  ) : (
                    <span className="text-xs text-gray-400">Valid URL starting with http:// or https://</span>
                  )}
                  <span className="text-xs text-gray-400">{formData.website.length}/255</span>
                </div>
              </div>

              {/* Features */}
              <div className="border-t border-gray-100 pt-5">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Features</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.supportsStreaming}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, supportsStreaming: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-700">Supports Streaming</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.supportsVision}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, supportsVision: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-700">Supports Vision</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.supportsFunctionCalling}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, supportsFunctionCalling: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-700">Supports Function Calling</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.requiresApiKey}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, requiresApiKey: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-700">Requires API Key</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isSubmitting ? 'Creating...' : 'Create Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Edit Provider Modal */}
      {showEditModal && selectedProvider && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Edit Provider</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedProvider(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateProvider} className="p-6 space-y-5">
              {/* Provider Name (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Provider Name
                </label>
                <input
                  type="text"
                  value={selectedProvider.name}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Provider name cannot be changed</p>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Display Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, displayName: e.target.value }));
                    if (formErrors.displayName) setFormErrors(prev => ({ ...prev, displayName: '' }));
                  }}
                  maxLength={60}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all ${formErrors.displayName ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                />
                <div className="flex justify-between items-center mt-1">
                  {formErrors.displayName ? (
                    <span className="text-xs text-red-500">{formErrors.displayName}</span>
                  ) : (
                    <span></span>
                  )}
                  <span className="text-xs text-gray-400">{formData.displayName.length}/60</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                    if (formErrors.description) setFormErrors(prev => ({ ...prev, description: '' }));
                  }}
                  maxLength={200}
                  rows={3}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all resize-none overflow-y-auto ${formErrors.description ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                />
                <div className="flex justify-between items-center mt-1">
                  {formErrors.description ? (
                    <span className="text-xs text-red-500">{formErrors.description}</span>
                  ) : (
                    <span></span>
                  )}
                  <span className="text-xs text-gray-400">{formData.description.length}/200</span>
                </div>
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Logo URL
                </label>
                <input
                  type="text"
                  value={formData.logo}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, logo: e.target.value }));
                    if (formErrors.logo) setFormErrors(prev => ({ ...prev, logo: '' }));
                  }}
                  maxLength={255}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all ${formErrors.logo ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  placeholder="https://example.com/logo.png"
                />
                <div className="flex justify-between items-center mt-1">
                  {formErrors.logo ? (
                    <span className="text-xs text-red-500">{formErrors.logo}</span>
                  ) : (
                    <span className="text-xs text-gray-400">Valid URL starting with http:// or https://</span>
                  )}
                  <span className="text-xs text-gray-400">{formData.logo.length}/255</span>
                </div>
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Website URL
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, website: e.target.value }));
                    if (formErrors.website) setFormErrors(prev => ({ ...prev, website: '' }));
                  }}
                  maxLength={255}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all ${formErrors.website ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  placeholder="https://example.com"
                />
                <div className="flex justify-between items-center mt-1">
                  {formErrors.website ? (
                    <span className="text-xs text-red-500">{formErrors.website}</span>
                  ) : (
                    <span className="text-xs text-gray-400">Valid URL starting with http:// or https://</span>
                  )}
                  <span className="text-xs text-gray-400">{formData.website.length}/255</span>
                </div>
              </div>

              {/* Features */}
              <div className="border-t border-gray-100 pt-5">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Features</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.supportsStreaming}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, supportsStreaming: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-700">Supports Streaming</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.supportsVision}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, supportsVision: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-700">Supports Vision</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.supportsFunctionCalling}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, supportsFunctionCalling: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-700">Supports Function Calling</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.requiresApiKey}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, requiresApiKey: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-700">Requires API Key</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedProvider(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

export default AdminProvidersPage;