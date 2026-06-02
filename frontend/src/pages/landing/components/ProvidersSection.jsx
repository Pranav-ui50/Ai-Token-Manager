/**
 * Providers Section
 *
 * Displays supported AI providers dynamically with styled initials.
 */

import { useState, useEffect } from 'react';
import publicApi from '../../../services/api/public.api.js';

const ProvidersSection = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await publicApi.getProviders();
      if (response.success) {
        setProviders(response.data || []);
      }
    } catch (err) {
      setError('Failed to load providers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fallback providers if API fails or returns empty
  const fallbackProviders = [
    { id: 'openai', name: 'OpenAI', displayName: 'OpenAI', modelCount: 20, capabilities: { supportsVision: true, supportsFunctionCalling: true } },
    { id: 'anthropic', name: 'Anthropic', displayName: 'Anthropic', modelCount: 5, capabilities: { supportsVision: true, supportsFunctionCalling: true } },
    { id: 'google', name: 'Google', displayName: 'Google AI', modelCount: 8, capabilities: { supportsVision: true, supportsFunctionCalling: true } },
    { id: 'meta', name: 'Meta', displayName: 'Meta AI', modelCount: 6, capabilities: { supportsVision: false, supportsFunctionCalling: false } },
    { id: 'mistral', name: 'Mistral', displayName: 'Mistral AI', modelCount: 7, capabilities: { supportsVision: false, supportsFunctionCalling: true } },
    { id: 'cohere', name: 'Cohere', displayName: 'Cohere', modelCount: 4, capabilities: { supportsVision: false, supportsFunctionCalling: true } },
    { id: 'stability', name: 'Stability', displayName: 'Stability AI', modelCount: 3, capabilities: { supportsVision: true, supportsFunctionCalling: false } },
    { id: 'perplexity', name: 'Perplexity', displayName: 'Perplexity', modelCount: 2, capabilities: { supportsVision: false, supportsFunctionCalling: true } },
    { id: 'huggingface', name: 'HuggingFace', displayName: 'Hugging Face', modelCount: 10, capabilities: { supportsVision: true, supportsFunctionCalling: false } },
    { id: 'replicate', name: 'Replicate', displayName: 'Replicate', modelCount: 15, capabilities: { supportsVision: true, supportsFunctionCalling: true } },
    { id: 'alephalpha', name: 'AlephAlpha', displayName: 'Aleph Alpha', modelCount: 3, capabilities: { supportsVision: true, supportsFunctionCalling: true } },
    { id: 'midjourney', name: 'Midjourney', displayName: 'Midjourney', modelCount: 2, capabilities: { supportsVision: true, supportsFunctionCalling: false } }
  ];

  const displayProviders = providers.length > 0 ? providers : fallbackProviders;

  // Get single initial for provider
  const getInitial = (provider) => {
    const name = provider.displayName || provider.name || 'Unknown';
    return name.charAt(0).toUpperCase();
  };

  // Get color for provider card (multiple colors)
  const getProviderColor = (provider, index) => {
    const colors = [
      { bg: 'bg-red-500', gradient: 'from-red-500 to-red-600', text: 'text-white' },           // Red
      { bg: 'bg-orange-500', gradient: 'from-orange-500 to-orange-600', text: 'text-white' }, // Orange
      { bg: 'bg-amber-500', gradient: 'from-amber-500 to-amber-600', text: 'text-white' },    // Yellow/Amber
      { bg: 'bg-green-500', gradient: 'from-green-500 to-green-600', text: 'text-white' },    // Green
      { bg: 'bg-emerald-500', gradient: 'from-emerald-500 to-emerald-600', text: 'text-white' }, // Emerald
      { bg: 'bg-teal-500', gradient: 'from-teal-500 to-teal-600', text: 'text-white' },       // Teal
      { bg: 'bg-cyan-500', gradient: 'from-cyan-500 to-cyan-600', text: 'text-white' },       // Cyan
      { bg: 'bg-sky-500', gradient: 'from-sky-500 to-sky-600', text: 'text-white' },          // Light Blue
      { bg: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600', text: 'text-white' },       // Blue
      { bg: 'bg-indigo-500', gradient: 'from-indigo-500 to-indigo-600', text: 'text-white' }, // Indigo
      { bg: 'bg-violet-500', gradient: 'from-violet-500 to-violet-600', text: 'text-white' }, // Violet
      { bg: 'bg-purple-500', gradient: 'from-purple-500 to-purple-600', text: 'text-white' }, // Purple
      { bg: 'bg-fuchsia-500', gradient: 'from-fuchsia-500 to-fuchsia-600', text: 'text-white' }, // Fuchsia
      { bg: 'bg-pink-500', gradient: 'from-pink-500 to-pink-600', text: 'text-white' },       // Pink
      { bg: 'bg-rose-500', gradient: 'from-rose-500 to-rose-600', text: 'text-white' },      // Rose
    ];
    // Use provider id or index to pick a color
    const hash = provider.id ? provider.id.charCodeAt(0) % colors.length : index % colors.length;
    return colors[hash];
  };

  return (
    <section id="providers" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Support for All Major AI Providers
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Track and manage AI models from leading providers in one unified platform.
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
            <div className="text-4xl font-bold text-[#DC2626] mb-2">15+</div>
            <div className="text-gray-600">AI Providers</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
            <div className="text-4xl font-bold text-[#DC2626] mb-2">100+</div>
            <div className="text-gray-600">AI Models</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
            <div className="text-4xl font-bold text-[#DC2626] mb-2">99.9%</div>
            <div className="text-gray-600">Uptime SLA</div>
          </div>
        </div>

        {/* Providers Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DC2626] mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading providers...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
            <button onClick={fetchProviders} className="mt-2 text-[#DC2626] hover:underline">
              Try again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-12">
            {displayProviders.map((provider, index) => {
              const color = getProviderColor(provider, index);
              return (
                <div
                  key={provider.id || index}
                  className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all group cursor-pointer"
                >
                  {/* Provider Logo Container */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
                    <span className="text-white text-2xl font-bold">
                      {getInitial(provider)}
                    </span>
                  </div>

                  {/* Provider Info */}
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm">
                    {provider.displayName || provider.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">
                    {provider.modelCount || 0} models
                  </p>

                  {/* Capability Badges */}
                  <div className="flex flex-wrap gap-1">
                    {provider.capabilities?.supportsVision && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded">
                        Vision
                      </span>
                    )}
                    {provider.capabilities?.supportsFunctionCalling && (
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-medium rounded">
                        Functions
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900">Unified API</h4>
            </div>
            <p className="text-sm text-gray-600">
              Single API key to manage all your AI providers.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-2.332 9-7.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900">Secure Storage</h4>
            </div>
            <p className="text-sm text-gray-600">
              Enterprise-grade encryption for all API keys.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900">Real-Time Sync</h4>
            </div>
            <p className="text-sm text-gray-600">
              Automatic synchronization of pricing and model updates.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900">Usage History</h4>
            </div>
            <p className="text-sm text-gray-600">
              Complete audit trail of all API calls and costs.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Don't see your provider? We're constantly adding new integrations.
          </p>
          <button
            onClick={() => window.location.href = '/contact'}
            className="px-6 py-2 text-[#DC2626] font-medium hover:underline"
          >
            Request a Provider →
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProvidersSection;