/**
 * Providers Page
 *
 * Displays list of AI providers.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import providerApi from '../../services/api/provider.api.js';
import Button from '../../components/common/Button.jsx';

const MODEL_TYPES = {
  chat: 'Chat',
  completion: 'Completion',
  embedding: 'Embedding',
  image: 'Image',
  audio: 'Audio',
  other: 'Other'
};

function ProvidersPage() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setIsLoading(true);
      const response = await providerApi.getAll({ limit: 100 });
      setProviders(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch providers');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">AI Providers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage AI service providers and their models
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Providers grid */}
      {providers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No providers</h3>
          <p className="mt-1 text-sm text-gray-500">
            No AI providers have been configured yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <div
              key={provider._id}
              onClick={() => navigate(`/providers/${provider._id}`)}
              className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:border-primary-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center space-x-4">
                {provider.logo ? (
                  <img
                    src={provider.logo}
                    alt={provider.displayName}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <span className="text-lg font-semibold text-white">
                      {provider.displayName.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {provider.displayName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {provider.name}
                  </p>
                </div>
              </div>
              {provider.description && (
                <p className="mt-4 text-sm text-gray-600 line-clamp-2">
                  {provider.description}
                </p>
              )}
              <div className="mt-4 flex items-center text-xs text-gray-400 space-x-4">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProvidersPage;