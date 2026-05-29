/**
 * Provider Detail Page
 *
 * Displays provider details and its models.
 */

import Loader from '../../components/common/Loader.jsx';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import providerApi from '../../services/api/provider.api.js';
import Button from '../../components/common/Button.jsx';
import Tabs from '../../components/common/Tabs.jsx';

const MODEL_TYPES = {
  chat: 'Chat',
  completion: 'Completion',
  embedding: 'Embedding',
  image: 'Image',
  audio: 'Audio',
  other: 'Other'
};

function ProviderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('models');

  useEffect(() => {
    fetchProvider();
    fetchModels();
  }, [id]);

  const fetchProvider = async () => {
    try {
      const data = await providerApi.getById(id);
      setProvider(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch provider');
    }
  };

  const fetchModels = async () => {
    try {
      setIsLoading(true);
      const data = await providerApi.getModels(id);
      setModels(data || []);
    } catch (err) {
      console.error('Failed to fetch models:', err);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price, unit = 'per_token') => {
    if (!price) return 'Free';
    const per = unit === 'per_token' ? '1M tokens' : unit;
    return `$${price.toFixed(4)}/${per}`;
  };

  if (isLoading && !provider) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Provider not found</p>
        <Button className="mt-4" onClick={() => navigate('/providers')}>
          Back to Providers
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: 'models', label: 'Models', count: models.length },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/providers')}
          className="text-gray-400 hover:text-gray-600 mb-4 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Providers
        </button>

        <div className="flex items-center space-x-4">
          {provider.logo ? (
            <img
              src={provider.logo}
              alt={provider.displayName}
              className="h-16 w-16 rounded-lg object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <span className="text-2xl font-semibold text-white">
                {provider.displayName.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{provider.displayName}</h1>
            <p className="text-gray-500">{provider.name}</p>
          </div>
        </div>

        {provider.description && (
          <p className="mt-4 text-gray-600">{provider.description}</p>
        )}

        <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
          {provider.website && (
            <a
              href={provider.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:text-primary-600"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Website
            </a>
          )}
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            {provider.settings?.supportsStreaming ? 'Streaming' : 'No Streaming'}
          </span>
          {provider.settings?.supportsVision && (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Vision
            </span>
          )}
          {provider.settings?.supportsFunctionCalling && (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Function Calling
            </span>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'models' && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {models.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No models available for this provider</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Context Window
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Input Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Output Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {models.map((model) => (
                    <tr key={model._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {model.displayName}
                            </div>
                            <div className="text-sm text-gray-500">{model.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {MODEL_TYPES[model.type] || model.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {model.capabilities?.contextWindow?.toLocaleString() || '-'} tokens
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPrice(model.pricing?.inputPrice, model.pricing?.unit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPrice(model.pricing?.outputPrice, model.pricing?.unit)}
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
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Provider Settings</h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Auth Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{provider.authType || 'api_key'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Default Max Tokens</dt>
                <dd className="mt-1 text-sm text-gray-900">{provider.settings?.defaultMaxTokens?.toLocaleString() || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Request Timeout</dt>
                <dd className="mt-1 text-sm text-gray-900">{provider.settings?.requestTimeout?.toLocaleString() || '-'} ms</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Rate Limit</dt>
                <dd className="mt-1 text-sm text-gray-900">{provider.settings?.rateLimitPerMinute || '-'} requests/minute</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProviderDetailPage;