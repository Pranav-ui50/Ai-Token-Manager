/**
 * Models Page
 *
 * Displays list of all AI models across providers.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import modelApi from '../../services/api/model.api.js';
import providerApi from '../../services/api/provider.api.js';
import Button from '../../components/common/Button.jsx';
import Select from '../../components/common/Select.jsx';

const MODEL_TYPES = {
  chat: 'Chat',
  completion: 'Completion',
  embedding: 'Embedding',
  image: 'Image',
  audio: 'Audio',
  other: 'Other'
};

function ModelsPage() {
  const navigate = useNavigate();
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
      setProviders(response.data);
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

  const formatPrice = (price, unit = 'per_token') => {
    if (!price) return 'Free';
    return `$${price.toFixed(4)}/1M tokens`;
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

  if (isLoading && models.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Models</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and manage AI models across providers
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <Select
              name="provider"
              value={selectedProvider}
              onChange={(e) => handleFilterChange('provider', e.target.value)}
              options={[
                { value: '', label: 'All Providers' },
                ...providers.map(p => ({ value: p._id, label: p.displayName }))
              ]}
              placeholder="Filter by provider"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Select
              name="type"
              value={selectedType}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              options={[
                { value: '', label: 'All Types' },
                ...Object.entries(MODEL_TYPES).map(([value, label]) => ({ value, label }))
              ]}
              placeholder="Filter by type"
            />
          </div>
          {(selectedProvider || selectedType) && (
            <Button variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Models table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Context
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pricing (per 1M tokens)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {models.map((model) => (
              <tr
                key={model._id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/models/${model._id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {model.displayName}
                    </div>
                    <div className="text-sm text-gray-500">{model.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {model.provider?.logo && (
                      <img
                        src={model.provider.logo}
                        alt={model.provider.displayName}
                        className="h-6 w-6 rounded mr-2"
                      />
                    )}
                    <span className="text-sm text-gray-900">
                      {model.provider?.displayName || '-'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {MODEL_TYPES[model.type] || model.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatNumber(model.capabilities?.contextWindow)} tokens
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="text-gray-900">
                    Input: {formatPrice(model.pricing?.inputPrice)}
                  </div>
                  <div className="text-gray-500">
                    Output: {formatPrice(model.pricing?.outputPrice)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {model.deprecated?.isDeprecated ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Deprecated
                    </span>
                  ) : model.isActive ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {models.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No models found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-4 flex justify-center">
          <nav className="flex items-center space-x-2">
            <Button
              variant="secondary"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="secondary"
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </Button>
          </nav>
        </div>
      )}
    </div>
  );
}

export default ModelsPage;