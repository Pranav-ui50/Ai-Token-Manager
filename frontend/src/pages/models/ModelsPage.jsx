/**
 * Models Page
 *
 * Displays list of all AI models across providers.
 * Red & White theme styling.
 */

import Loader from '../../components/common/Loader.jsx';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import modelApi from '../../services/api/model.api.js';
import providerApi from '../../services/api/provider.api.js';
import usePermissions from '../../hooks/usePermissions.js';

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
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [selectedProvider, setSelectedProvider] = useState(searchParams.get('provider') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    fetchModels();
  }, [selectedProvider, selectedType, pagination.page]);

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

      const response = await modelApi.getAll(params);
      setModels(response.data);
      setPagination(prev => ({ ...prev, ...response.pagination }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch models');
    } finally {
      setIsLoading(false);
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
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => handleFilterChange('provider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent text-sm"
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent text-sm"
              >
                <option value="">All Types</option>
                {Object.entries(MODEL_TYPES).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            {(selectedProvider || selectedType) && (
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

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <svg className="animate-spin h-10 w-10 text-[#DC2626] mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="mt-4 text-gray-500">Loading models...</p>
            </div>
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
              {selectedProvider || selectedType
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
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing page {pagination.page} of {pagination.pages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.pages}
                      className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
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