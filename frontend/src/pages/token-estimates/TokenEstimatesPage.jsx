/**
 * Token Estimates Page
 *
 * Product Manager can manage:
 * - Input tokens per request
 * - Output tokens per request
 * - Expected monthly usage
 * - Token consumption estimate
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';
import featureApi from '../../services/api/feature.api.js';
import { showToast } from '../../utils/toasts.js';

function TokenEstimatesPage() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [editingFeature, setEditingFeature] = useState(null);
  const [formData, setFormData] = useState({
    inputTokensPerRequest: '',
    outputTokensPerRequest: '',
    expectedMonthlyRequests: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      const response = await featureApi.getAll({ limit: 100 });
      const featuresData = response?.data || response || {};
      const featuresList = featuresData.features || featuresData.data || [];
      setFeatures(Array.isArray(featuresList) ? featuresList : []);
    } catch (err) {
      console.error('Failed to fetch features:', err);
      showToast.error('Failed to load features');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (feature) => {
    setEditingFeature(feature._id);
    setFormData({
      inputTokensPerRequest: feature.tokenEstimates?.inputTokensPerRequest || '',
      outputTokensPerRequest: feature.tokenEstimates?.outputTokensPerRequest || '',
      expectedMonthlyRequests: feature.tokenEstimates?.expectedMonthlyRequests || ''
    });
  };

  const handleSave = async (featureId) => {
    try {
      setSaving(featureId);
      await featureApi.update(featureId, {
        tokenEstimates: {
          inputTokensPerRequest: parseInt(formData.inputTokensPerRequest) || 0,
          outputTokensPerRequest: parseInt(formData.outputTokensPerRequest) || 0,
          expectedMonthlyRequests: parseInt(formData.expectedMonthlyRequests) || 0
        }
      });

      // Update local state
      setFeatures(prev => prev.map(f =>
        f._id === featureId
          ? { ...f, tokenEstimates: { ...formData } }
          : f
      ));

      showToast.success('Token estimates updated');
    } catch (err) {
      console.error('Failed to update token estimates:', err);
      showToast.error(err.response?.data?.error?.message || 'Failed to update');
    } finally {
      setSaving(null);
      setEditingFeature(null);
    }
  };

  const handleCancel = () => {
    setEditingFeature(null);
    setFormData({
      inputTokensPerRequest: '',
      outputTokensPerRequest: '',
      expectedMonthlyRequests: ''
    });
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const calculateMonthlyTokens = (feature) => {
    const input = feature.tokenEstimates?.inputTokensPerRequest || 0;
    const output = feature.tokenEstimates?.outputTokensPerRequest || 0;
    const requests = feature.tokenEstimates?.expectedMonthlyRequests || 0;
    return (input + output) * requests;
  };

  const filteredFeatures = features.filter(feature =>
    feature.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    feature.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const avgInputTokens = features.length > 0
    ? features.reduce((sum, f) => sum + (f.tokenEstimates?.inputTokensPerRequest || 0), 0) / features.length
    : 0;
  const avgOutputTokens = features.length > 0
    ? features.reduce((sum, f) => sum + (f.tokenEstimates?.outputTokensPerRequest || 0), 0) / features.length
    : 0;
  const totalMonthlyTokens = features.reduce((sum, f) => sum + calculateMonthlyTokens(f), 0);

  if (loading) {
    return <Loader fullPage text="Loading token estimates..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Token Estimates</h1>
          <p className="text-sm text-gray-500">Configure token consumption for each feature</p>
        </div>
        <Link
          to="/features/new"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Feature
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Avg Input Tokens</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatNumber(avgInputTokens)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Avg Output Tokens</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatNumber(avgOutputTokens)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Total Features</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{features.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Est. Monthly Tokens</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatNumber(totalMonthlyTokens)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
          />
        </div>
      </div>

      {/* Features Table/Card View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredFeatures.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No features found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Create features to configure token estimates'}
            </p>
            <Link
              to="/features/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Feature
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Feature
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Input Tokens
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Output Tokens
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Monthly Requests
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Monthly Tokens
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFeatures.map((feature) => (
                    <tr key={feature._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <Link to={`/features/${feature._id}`} className="hover:text-[#DC2626]">
                          <p className="font-medium text-gray-900">{feature.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{feature.category || 'other'}</p>
                        </Link>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        {editingFeature === feature._id ? (
                          <input
                            type="number"
                            value={formData.inputTokensPerRequest}
                            onChange={(e) => setFormData({ ...formData, inputTokensPerRequest: e.target.value })}
                            className="w-20 sm:w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                            placeholder="0"
                          />
                        ) : (
                          <span className="text-gray-900">{formatNumber(feature.tokenEstimates?.inputTokensPerRequest || 0)}</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        {editingFeature === feature._id ? (
                          <input
                            type="number"
                            value={formData.outputTokensPerRequest}
                            onChange={(e) => setFormData({ ...formData, outputTokensPerRequest: e.target.value })}
                            className="w-20 sm:w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                            placeholder="0"
                          />
                        ) : (
                          <span className="text-gray-900">{formatNumber(feature.tokenEstimates?.outputTokensPerRequest || 0)}</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        {editingFeature === feature._id ? (
                          <input
                            type="number"
                            value={formData.expectedMonthlyRequests}
                            onChange={(e) => setFormData({ ...formData, expectedMonthlyRequests: e.target.value })}
                            className="w-24 sm:w-32 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                            placeholder="0"
                          />
                        ) : (
                          <span className="text-gray-900">{formatNumber(feature.tokenEstimates?.expectedMonthlyRequests || 0)}</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{formatNumber(calculateMonthlyTokens(feature))}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        {editingFeature === feature._id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSave(feature._id)}
                              disabled={saving === feature._id}
                              className="px-3 py-1.5 bg-[#DC2626] text-white text-sm rounded-lg hover:bg-[#B91C1C] disabled:opacity-50 transition-colors"
                            >
                              {saving === feature._id ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancel}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(feature)}
                            className="text-[#DC2626] hover:text-[#B91C1C] text-sm font-medium transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredFeatures.map((feature) => (
                <div key={feature._id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/features/${feature._id}`} className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{feature.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{feature.category || 'other'}</p>
                    </Link>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${feature.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {feature.status || 'active'}
                    </span>
                  </div>

                  {editingFeature === feature._id ? (
                    <div className="space-y-3 bg-gray-50 rounded-lg p-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Input Tokens</label>
                        <input
                          type="number"
                          value={formData.inputTokensPerRequest}
                          onChange={(e) => setFormData({ ...formData, inputTokensPerRequest: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Output Tokens</label>
                        <input
                          type="number"
                          value={formData.outputTokensPerRequest}
                          onChange={(e) => setFormData({ ...formData, outputTokensPerRequest: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Monthly Requests</label>
                        <input
                          type="number"
                          value={formData.expectedMonthlyRequests}
                          onChange={(e) => setFormData({ ...formData, expectedMonthlyRequests: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(feature._id)}
                          disabled={saving === feature._id}
                          className="flex-1 px-4 py-2 bg-[#DC2626] text-white text-sm rounded-lg hover:bg-[#B91C1C] disabled:opacity-50 transition-colors"
                        >
                          {saving === feature._id ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500">In</p>
                          <p className="font-medium text-gray-900 text-sm">{formatNumber(feature.tokenEstimates?.inputTokensPerRequest || 0)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Out</p>
                          <p className="font-medium text-gray-900 text-sm">{formatNumber(feature.tokenEstimates?.outputTokensPerRequest || 0)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Req/Mo</p>
                          <p className="font-medium text-gray-900 text-sm">{formatNumber(feature.tokenEstimates?.expectedMonthlyRequests || 0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <p className="text-xs text-gray-500">Monthly Tokens</p>
                          <p className="font-medium text-gray-900">{formatNumber(calculateMonthlyTokens(feature))}</p>
                        </div>
                        <button
                          onClick={() => handleEdit(feature)}
                          className="text-[#DC2626] hover:text-[#B91C1C] text-sm font-medium transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Help Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900">Token Estimate Guidelines</h4>
            <ul className="text-sm text-blue-700 mt-1 space-y-1">
              <li>• <strong>Input Tokens:</strong> Average tokens sent per API request</li>
              <li>• <strong>Output Tokens:</strong> Average tokens received in response</li>
              <li>• <strong>Monthly Requests:</strong> Expected number of API calls per month</li>
              <li>• These estimates help calculate feature costs and plan capacity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TokenEstimatesPage;