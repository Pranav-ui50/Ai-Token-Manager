/**
 * Model Detail Page
 *
 * Displays detailed information about an AI model.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import modelApi from '../../services/api/model.api.js';
import Button from '../../components/common/Button.jsx';

const MODEL_TYPES = {
  chat: 'Chat',
  completion: 'Completion',
  embedding: 'Embedding',
  image: 'Image',
  audio: 'Audio',
  other: 'Other'
};

function ModelDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [model, setModel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Cost calculator
  const [costInput, setCostInput] = useState({ inputTokens: '', outputTokens: '' });
  const [costResult, setCostResult] = useState(null);

  useEffect(() => {
    fetchModel();
  }, [id]);

  const fetchModel = async () => {
    try {
      setIsLoading(true);
      const data = await modelApi.getById(id);
      setModel(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch model');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCost = async () => {
    if (!costInput.inputTokens) return;

    try {
      const result = await modelApi.calculateCost(
        id,
        parseInt(costInput.inputTokens),
        parseInt(costInput.outputTokens) || 0
      );
      setCostResult(result);
    } catch (err) {
      console.error('Failed to calculate cost:', err);
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'Free';
    return `$${price.toFixed(6)} per 1M tokens`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Model not found</p>
        <Button className="mt-4" onClick={() => navigate('/models')}>
          Back to Models
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/models')}
          className="text-gray-400 hover:text-gray-600 mb-4 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Models
        </button>

        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{model.displayName}</h1>
              {model.deprecated?.isDeprecated && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Deprecated
                </span>
              )}
              {!model.isActive && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-1">{model.name}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {MODEL_TYPES[model.type] || model.type}
            </span>
          </div>
        </div>

        {model.description && (
          <p className="mt-4 text-gray-600">{model.description}</p>
        )}

        <div className="mt-4 flex items-center space-x-4 text-sm">
          <span className="text-gray-500">
            Provider: <span
              className="text-primary-600 cursor-pointer hover:underline"
              onClick={() => navigate(`/providers/${model.provider?._id}`)}
            >
              {model.provider?.displayName || '-'}
            </span>
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capabilities */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Capabilities</h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Context Window</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {model.capabilities?.contextWindow?.toLocaleString() || '-'} tokens
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Max Output</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {model.capabilities?.maxOutputTokens?.toLocaleString() || '-'} tokens
              </dd>
            </div>
          </dl>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Streaming</span>
              <span className={`text-sm ${model.capabilities?.supportsStreaming ? 'text-green-600' : 'text-gray-400'}`}>
                {model.capabilities?.supportsStreaming ? 'Supported' : 'Not supported'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Vision</span>
              <span className={`text-sm ${model.capabilities?.supportsVision ? 'text-green-600' : 'text-gray-400'}`}>
                {model.capabilities?.supportsVision ? 'Supported' : 'Not supported'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Function Calling</span>
              <span className={`text-sm ${model.capabilities?.supportsFunctionCalling ? 'text-green-600' : 'text-gray-400'}`}>
                {model.capabilities?.supportsFunctionCalling ? 'Supported' : 'Not supported'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">JSON Mode</span>
              <span className={`text-sm ${model.capabilities?.supportsJsonMode ? 'text-green-600' : 'text-gray-400'}`}>
                {model.capabilities?.supportsJsonMode ? 'Supported' : 'Not supported'}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing</h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Input Price</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {formatPrice(model.pricing?.inputPrice)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Output Price</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {formatPrice(model.pricing?.outputPrice)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Currency</dt>
              <dd className="mt-1 text-sm text-gray-900">{model.pricing?.currency || 'USD'}</dd>
            </div>
          </dl>

          {/* Cost Calculator */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Cost Calculator</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Input Tokens</label>
                <input
                  type="number"
                  value={costInput.inputTokens}
                  onChange={(e) => setCostInput(prev => ({ ...prev, inputTokens: e.target.value }))}
                  placeholder="e.g., 1000"
                  className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Output Tokens</label>
                <input
                  type="number"
                  value={costInput.outputTokens}
                  onChange={(e) => setCostInput(prev => ({ ...prev, outputTokens: e.target.value }))}
                  placeholder="e.g., 500"
                  className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>
              <Button onClick={calculateCost} className="w-full">
                Calculate Cost
              </Button>
              {costResult && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600">
                    <div>Input cost: ${costResult.breakdown.inputCost.toFixed(6)}</div>
                    <div>Output cost: ${costResult.breakdown.outputCost.toFixed(6)}</div>
                    <div className="font-semibold mt-1 pt-1 border-t border-gray-200">
                      Total: ${costResult.totalCost.toFixed(6)} {costResult.currency}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Default Parameters */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Default Parameters</h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Temperature</dt>
              <dd className="mt-1 text-sm text-gray-900">{model.defaults?.temperature ?? 0.7}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Top P</dt>
              <dd className="mt-1 text-sm text-gray-900">{model.defaults?.topP ?? 1}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Frequency Penalty</dt>
              <dd className="mt-1 text-sm text-gray-900">{model.defaults?.frequencyPenalty ?? 0}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Presence Penalty</dt>
              <dd className="mt-1 text-sm text-gray-900">{model.defaults?.presencePenalty ?? 0}</dd>
            </div>
          </dl>
        </div>

        {/* Deprecation Info */}
        {model.deprecated?.isDeprecated && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-yellow-800 mb-2">Deprecation Notice</h3>
            <p className="text-sm text-yellow-700">
              This model has been deprecated and may be removed in the future.
            </p>
            {model.deprecated.sunsetDate && (
              <p className="text-sm text-yellow-700 mt-2">
                Sunset date: {new Date(model.deprecated.sunsetDate).toLocaleDateString()}
              </p>
            )}
            {model.deprecated.replacementModel && (
              <p className="text-sm text-yellow-700 mt-2">
                Recommended replacement:{' '}
                <span
                  className="text-primary-600 cursor-pointer hover:underline"
                  onClick={() => navigate(`/models/${model.deprecated.replacementModel._id}`)}
                >
                  {model.deprecated.replacementModel.displayName}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModelDetailPage;