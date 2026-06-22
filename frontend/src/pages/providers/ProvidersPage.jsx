/**
 * Providers Page
 *
 * Displays list of AI providers with Red & White theme.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import Loader from '../../components/common/Loader.jsx';
import providerApi from '../../services/api/provider.api.js';
import { showToast } from '../../utils/toasts.jsx';

const PROVIDER_COLORS = {
  openai: 'from-green-500 to-green-600',
  anthropic: 'from-orange-500 to-orange-600',
  google: 'from-blue-500 to-blue-600',
  meta: 'from-blue-600 to-indigo-600',
  mistral: 'from-purple-500 to-purple-600',
  default: 'from-[#DC2626] to-[#B91C1C]'
};

function ProvidersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const canManageProviders = user?.role?.name === 'super_admin';

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setIsLoading(true);
      const response = await providerApi.getAll({ limit: 100 });
      setProviders(response.providers || []);
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch providers');
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderColor = (providerName) => {
    const name = providerName?.toLowerCase() || '';
    if (name.includes('openai')) return PROVIDER_COLORS.openai;
    if (name.includes('anthropic')) return PROVIDER_COLORS.anthropic;
    if (name.includes('google') || name.includes('gemini')) return PROVIDER_COLORS.google;
    if (name.includes('meta') || name.includes('llama')) return PROVIDER_COLORS.meta;
    if (name.includes('mistral')) return PROVIDER_COLORS.mistral;
    return PROVIDER_COLORS.default;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Providers</h1>
          <p className="text-sm text-gray-500">Manage AI service providers and their models</p>
        </div>
        {canManageProviders && (
          <button
            onClick={() => navigate('/providers/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Provider</span>
          </button>
        )}
      </div>

      {/* Info Banner for non-admin users */}
      {!canManageProviders && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">Providers are managed at the system level. Contact your administrator to add new providers.</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-64">
          <Loader text="Loading providers..." />
        </div>
      ) : providers.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No providers configured</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-4">
            {canManageProviders
              ? 'Get started by adding your first AI provider to the system.'
              : 'AI providers will appear here once they are configured by an administrator.'}
          </p>
          {canManageProviders && (
            <button
              onClick={() => navigate('/providers/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Provider</span>
            </button>
          )}
        </div>
      ) : (
        /* Providers Grid */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <div
              key={provider._id}
              onClick={() => navigate(`/providers/${provider._id}`)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-red-200 transition-all group"
            >
              <div className="flex items-start gap-4">
                {provider.logo ? (
                  <img
                    src={provider.logo}
                    alt={provider.displayName}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${getProviderColor(provider.name)} flex items-center justify-center shadow-sm`}>
                    <span className="text-xl font-bold text-white">
                      {provider.displayName?.charAt(0).toUpperCase() || 'P'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-[#DC2626] transition-colors">
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

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                {provider.settings?.supportsStreaming && (
                  <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Streaming
                  </span>
                )}
                {provider.settings?.supportsVision && (
                  <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-md">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Vision
                  </span>
                )}
                {provider.settings?.supportsFunctionCalling && (
                  <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Functions
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
