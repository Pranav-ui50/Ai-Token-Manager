/**
 * Model Detail Page
 *
 * Displays detailed information about an AI model including pricing history.
 */

import Loader from '../../components/common/Loader.jsx';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import modelApi from '../../services/api/model.api.js';
import pricingHistoryApi from '../../services/api/pricingHistory.api.js';
import Button from '../../components/common/Button.jsx';
import usePermissions from '../../hooks/usePermissions.js';

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
  const { canManageModels, canManagePricing, isSuperAdmin, isOwner } = usePermissions();
  const [model, setModel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Cost calculator
  const [costInput, setCostInput] = useState({ inputTokens: '', outputTokens: '' });
  const [costResult, setCostResult] = useState(null);

  // Pricing history
  const [pricingHistory, setPricingHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchModel();
  }, [id]);

  useEffect(() => {
    if (model && activeTab === 'history') {
      fetchPricingHistory();
    }
  }, [model, activeTab]);

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

  const fetchPricingHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await pricingHistoryApi.getByModel(id);
      setPricingHistory(response.history || []);
    } catch (err) {
      console.error('Failed to fetch pricing history:', err);
      setPricingHistory([]);
    } finally {
      setIsLoadingHistory(false);
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

  const formatPriceChange = (percent) => {
    const sign = percent >= 0 ? '+' : '';
    const color = percent > 0 ? 'text-red-600' : percent < 0 ? 'text-green-600' : 'text-gray-600';
    return (
      <span className={color}>
        {sign}{percent.toFixed(2)}%
      </span>
    );
  };

  const getReasonLabel = (reason) => {
    const labels = {
      provider_update: 'Provider Update',
      manual_adjustment: 'Manual Adjustment',
      market_adjustment: 'Market Adjustment',
      promotional: 'Promotional',
      other: 'Other'
    };
    return labels[reason] || reason;
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

        <div className="flex items-start justify-between">
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
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {MODEL_TYPES[model.type] || model.type}
            </span>
            {canManageModels() && (
              <button
                onClick={() => navigate(`/models/${id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Model
              </button>
            )}
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

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pricing History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
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
                    className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:border-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Output Tokens</label>
                  <input
                    type="number"
                    value={costInput.outputTokens}
                    onChange={(e) => setCostInput(prev => ({ ...prev, outputTokens: e.target.value }))}
                    placeholder="e.g., 500"
                    className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:border-primary-500 text-sm"
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
      )}

      {/* Pricing History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Price Change Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Price Change History</h3>

            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : pricingHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="mt-2">No pricing history available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Input Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Output Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Changed By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pricingHistory.map((entry, index) => (
                      <tr key={entry._id} className={index === 0 ? 'bg-green-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(entry.createdAt).toLocaleDateString()}
                          {index === 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">${entry.newPricing.inputPrice.toFixed(6)}/1M</div>
                          {index === 0 && entry.previousPricing && (
                            <div className="text-xs text-gray-500">
                              Prev: ${entry.previousPricing.inputPrice.toFixed(6)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">${entry.newPricing.outputPrice.toFixed(6)}/1M</div>
                          {index === 0 && entry.previousPricing && (
                            <div className="text-xs text-gray-500">
                              Prev: ${entry.previousPricing.outputPrice.toFixed(6)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div>
                              Input: {formatPriceChange(entry.priceChange.inputPriceChangePercent)}
                            </div>
                            <div>
                              Output: {formatPriceChange(entry.priceChange.outputPriceChangePercent)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getReasonLabel(entry.reason)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.changedBy?.firstName} {entry.changedBy?.lastName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Price Trend Chart Placeholder */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Price Trends</h3>
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <p className="mt-2">Price trend charts coming soon</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelDetailPage;