/**
 * Models Page
 *
 * Displays list of all AI models across providers.
 * Red & White theme styling.
 */

import Loader from '../../components/common/Loader.jsx';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import modelApi from '../../services/api/model.api.js';
import providerApi from '../../services/api/provider.api.js';
import usePermissions from '../../hooks/usePermissions.js';
import { showToast } from '../../utils/toasts.jsx';

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

function ModelsPage() {
  const navigate = useNavigate();
  const { canManageModels, canManagePricing, isSuperAdmin, isOwner } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [models, setModels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [liveModels, setLiveModels] = useState([]);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [showLiveModels, setShowLiveModels] = useState(false);

  // Filters
  const [selectedProvider, setSelectedProvider] = useState(searchParams.get('provider') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');

  useEffect(() => {
    fetchProviders();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchModels();
  }, [selectedProvider, selectedType, debouncedSearch, pagination.page, pagination.limit]);

  const fetchProviders = async () => {
    try {
      const response = await providerApi.getAll({ limit: 100 });
      setProviders(response.providers || []);
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    }
  };

  const fetchModels = async () => {
    try {
      setIsLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (selectedProvider) params.providerId = selectedProvider;
      if (selectedType) params.type = selectedType;
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await modelApi.getAll(params);
      setModels(response.data);
      setPagination(prev => ({ ...prev, ...response.pagination }));
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to fetch models');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch live models from provider's API
  const fetchLiveModels = async () => {
    if (!selectedProvider) {
      showToast.warning('Please select a provider first');
      return;
    }

    try {
      setIsLoadingLive(true);
      setShowLiveModels(true);
      const response = await providerApi.getDynamicModels(selectedProvider, { forceRefresh: true });
      const liveModelsData = response.models || [];

      // Process live models
      const processed = liveModelsData.map(model => ({
        ...model,
        _id: model._id || model.id,
        displayName: model.displayName || model.name,
        isLiveModel: !model._id,
        source: model.source || 'api'
      }));

      setLiveModels(processed);
      showToast.success('Live models fetched successfully');
    } catch (err) {
      console.error('Failed to fetch live models:', err);
      showToast.error('Failed to fetch live models from provider API. Please check if the provider has API credentials configured.');
      setShowLiveModels(false);
    } finally {
      setIsLoadingLive(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'Free';
    return `$${price.toFixed(4)}/1M`;
  };

  const formatNumber = (num) => {
    if (!num) return '-';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleFilterChange = (key, value) => {
    if (key === 'provider') {
      setSelectedProvider(value);
    } else if (key === 'type') {
      setSelectedType(value);
    } else if (key === 'search') {
      setSearchQuery(value);
    }
    setPagination(prev => ({ ...prev, page: 1 }));

    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSelectedProvider('');
    setSelectedType('');
    setSearchQuery('');
    setDebouncedSearch('');
    setSearchParams({});
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#DC2626] rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Models</h1>
                <p className="text-xs text-gray-500">Browse and manage AI models across providers</p>
              </div>
            </div>
            {canManageModels() && (
              <button
                onClick={() => navigate('/models/new')}
                className="flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Model
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Input */}
            <div className="flex-1 min-w-[250px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Search Models</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search by model name..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleFilterChange('search', '')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  handleFilterChange('provider', e.target.value);
                  setShowLiveModels(false);
                  setLiveModels([]);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 text-sm"
              >
                <option value="">All Providers</option>
                {providers.map(p => (
                  <option key={p._id} value={p._id}>{p.displayName}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Type</label>
              <select
                value={selectedType}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 text-sm"
              >
                <option value="">All Types</option>
                {Object.entries(MODEL_TYPES).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            {/* Sync Live Models Button */}
            {selectedProvider && (
              <button
                onClick={fetchLiveModels}
                disabled={isLoadingLive}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingLive ? (
                  <>
                    <Loader size="sm" inline />
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync Live Models
                  </>
                )}
              </button>
            )}
            {(selectedProvider || selectedType || searchQuery) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-[#DC2626] transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Live Models Section */}
        {showLiveModels && liveModels.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Live Models from API</h3>
                  <p className="text-xs text-gray-500">Fresh models fetched from {providers.find(p => p._id === selectedProvider)?.displayName}'s API</p>
                </div>
              </div>
              <button
                onClick={() => setShowLiveModels(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {liveModels.map((model, index) => (
                <div
                  key={model._id || model.id || index}
                  className="bg-white rounded-lg p-3 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {model.displayName || model.name}
                        </h4>
                        {model.source === 'api' && (
                          <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">Live</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{model.name}</p>
                      {model.pricing && (
                        <p className="text-xs text-gray-600 mt-1">
                          ${model.pricing.inputPrice?.toFixed(2) || '0'}/$
                          {model.pricing.outputPrice?.toFixed(2) || '0'} per 1M
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      model.type === 'chat' ? 'bg-blue-100 text-blue-700' :
                      model.type === 'embedding' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {model.type || 'chat'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-64">
            <Loader text="Loading models..." />
          </div>
        ) : models.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No models found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {selectedProvider || selectedType || searchQuery
                ? 'No models match your current filters. Try adjusting your criteria.'
                : 'AI models will appear here once they are configured in the system.'}
            </p>
          </div>
        ) : (
          /* Models Table */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Context
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Pricing
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {models.map((model) => (
                    <tr
                      key={model._id}
                      onClick={() => navigate(`/models/${model._id}`)}
                      className="hover:bg-red-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {model.displayName}
                          </div>
                          <div className="text-xs text-gray-500">{model.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {model.provider?.logo && (
                            <img
                              src={model.provider.logo}
                              alt={model.provider.displayName}
                              className="h-6 w-6 rounded"
                            />
                          )}
                          <span className="text-sm text-gray-900">
                            {model.provider?.displayName || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${MODEL_TYPES[model.type]?.color || MODEL_TYPES.other.color}`}>
                          {MODEL_TYPES[model.type]?.label || model.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatNumber(model.capabilities?.contextWindow)} tokens
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="text-gray-900">Input: {formatPrice(model.pricing?.inputPrice)}</div>
                          <div className="text-gray-500">Output: {formatPrice(model.pricing?.outputPrice)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {model.deprecated?.isDeprecated ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS.deprecated}`}>
                            Deprecated
                          </span>
                        ) : model.isActive ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS.active}`}>
                            Active
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS.inactive}`}>
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Rows per page:</span>
                    <select
                      value={pagination.limit}
                      onChange={(e) => {
                        const newLimit = parseInt(e.target.value, 10);
                        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                      disabled={pagination.page === 1}
                      className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="First page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {(() => {
                        const pages = [];
                        const maxVisiblePages = 5;
                        let startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
                        let endPage = Math.min(pagination.pages, startPage + maxVisiblePages - 1);

                        if (endPage - startPage + 1 < maxVisiblePages) {
                          startPage = Math.max(1, endPage - maxVisiblePages + 1);
                        }

                        if (startPage > 1) {
                          pages.push(
                            <button
                              key={1}
                              onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                            >
                              1
                            </button>
                          );
                          if (startPage > 2) {
                            pages.push(
                              <span key="ellipsis-start" className="px-1 text-gray-400">...</span>
                            );
                          }
                        }

                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => setPagination(prev => ({ ...prev, page: i }))}
                              className={`px-3 py-1 text-sm border rounded ${
                                i === pagination.page
                                  ? 'bg-[#DC2626] text-white border-[#DC2626]'
                                  : 'border-gray-300 hover:bg-gray-100'
                              }`}
                            >
                              {i}
                            </button>
                          );
                        }

                        if (endPage < pagination.pages) {
                          if (endPage < pagination.pages - 1) {
                            pages.push(
                              <span key="ellipsis-end" className="px-1 text-gray-400">...</span>
                            );
                          }
                          pages.push(
                            <button
                              key={pagination.pages}
                              onClick={() => setPagination(prev => ({ ...prev, page: pagination.pages }))}
                              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                            >
                              {pagination.pages}
                            </button>
                          );
                        }

                        return pages;
                      })()}
                    </div>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.pages}
                      className="px-3 py-1 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: pagination.pages }))}
                      disabled={pagination.page === pagination.pages}
                      className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Last page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default ModelsPage;
