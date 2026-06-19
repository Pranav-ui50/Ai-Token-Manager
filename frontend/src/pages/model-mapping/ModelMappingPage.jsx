/**
 * Model Mapping Page
 *
 * Product Manager can:
 * - Select existing AI models (view only)
 * - Assign AI models to features
 * - Configure token usage per feature
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';
import featureApi from '../../services/api/feature.api.js';
import modelApi from '../../services/api/model.api.js';
import { showToast } from '../../utils/toasts.js';

function ModelMappingPage() {
  const [features, setFeatures] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [editingFeature, setEditingFeature] = useState(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [featuresRes, modelsRes] = await Promise.all([
        featureApi.getAll({ limit: 100 }),
        modelApi.getAll({ limit: 100 })
      ]);

      const featuresData = featuresRes?.data || featuresRes || {};
      const featuresList = featuresData.features || featuresData.data || [];
      setFeatures(Array.isArray(featuresList) ? featuresList : []);

      const modelsData = modelsRes?.data || modelsRes || {};
      const modelsList = modelsData.models || modelsData.data || [];
      setModels(Array.isArray(modelsList) ? modelsList : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      showToast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignModel = async (featureId, modelId) => {
    try {
      setSaving(featureId);
      await featureApi.update(featureId, { model: modelId });

      // Update local state
      setFeatures(prev => prev.map(f =>
        f._id === featureId
          ? { ...f, model: models.find(m => m._id === modelId) }
          : f
      ));

      showToast.success('Model assigned successfully');
    } catch (err) {
      console.error('Failed to assign model:', err);
      showToast.error(err.response?.data?.error?.message || 'Failed to assign model');
    } finally {
      setSaving(null);
      setEditingFeature(null);
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const filteredFeatures = features.filter(feature => {
    const matchesSearch = feature.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          feature.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || feature.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      case 'maintenance': return 'bg-yellow-100 text-yellow-700';
      case 'deprecated': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return <Loader fullPage text="Loading model mappings..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Model Mapping</h1>
          <p className="text-sm text-gray-500">Assign AI models to your features</p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Mapped</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {features.filter(f => f.model && f.model._id).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Unmapped</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {features.filter(f => !f.model || !f.model._id).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Available Models</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{models.filter(m => m.isActive !== false).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative">
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
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Features List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredFeatures.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No features found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm || filterStatus ? 'Try adjusting your filters' : 'Create your first feature to get started'}
            </p>
            {!searchTerm && !filterStatus && (
              <Link
                to="/features/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Feature
              </Link>
            )}
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
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Category
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      AI Model
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Token Usage
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
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
                        <div>
                          <p className="font-medium text-gray-900">{feature.name}</p>
                          {feature.description && (
                            <p className="text-xs text-gray-500 truncate max-w-xs">{feature.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {feature.category || 'other'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        {editingFeature === feature._id ? (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <select
                              value={selectedModel}
                              onChange={(e) => setSelectedModel(e.target.value)}
                              className="w-full sm:w-auto px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                            >
                              <option value="">Select Model</option>
                              {models.filter(m => m.isActive !== false).map(model => (
                                <option key={model._id} value={model._id}>
                                  {model.name} ({model.provider?.name || 'Unknown'})
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAssignModel(feature._id, selectedModel)}
                                disabled={saving === feature._id || !selectedModel}
                                className="px-2 py-1 bg-[#DC2626] text-white text-sm rounded hover:bg-[#B91C1C] disabled:opacity-50 transition-colors"
                              >
                                {saving === feature._id ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingFeature(null);
                                  setSelectedModel('');
                                }}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {feature.model && feature.model._id ? (
                              <div>
                                <p className="text-sm font-medium text-gray-900">{feature.model.name}</p>
                                <p className="text-xs text-gray-500">{feature.model.provider?.name || 'Unknown provider'}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-yellow-600 font-medium">Not Mapped</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                        <div>
                          <p>In: {formatNumber(feature.tokenEstimates?.inputTokensPerRequest || 0)}</p>
                          <p>Out: {formatNumber(feature.tokenEstimates?.outputTokensPerRequest || 0)}</p>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(feature.status)}`}>
                          {feature.status || 'active'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingFeature !== feature._id && (
                            <button
                              onClick={() => {
                                setEditingFeature(feature._id);
                                setSelectedModel(feature.model?._id || '');
                              }}
                              className="text-[#DC2626] hover:text-[#B91C1C] text-sm font-medium transition-colors"
                            >
                              {feature.model && feature.model._id ? 'Change' : 'Assign'}
                            </button>
                          )}
                          <Link
                            to={`/features/${feature._id}`}
                            className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                          >
                            View
                          </Link>
                        </div>
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
                    <div className="flex-1 min-w-0">
                      <Link to={`/features/${feature._id}`} className="font-medium text-gray-900 hover:text-[#DC2626]">
                        {feature.name}
                      </Link>
                      <p className="text-xs text-gray-500 capitalize">{feature.category || 'other'}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getStatusColor(feature.status)}`}>
                      {feature.status || 'active'}
                    </span>
                  </div>

                  {editingFeature === feature._id ? (
                    <div className="space-y-3 bg-gray-50 rounded-lg p-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Select Model</label>
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                        >
                          <option value="">Select Model</option>
                          {models.filter(m => m.isActive !== false).map(model => (
                            <option key={model._id} value={model._id}>
                              {model.name} ({model.provider?.name || 'Unknown'})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAssignModel(feature._id, selectedModel)}
                          disabled={saving === feature._id || !selectedModel}
                          className="flex-1 px-4 py-2 bg-[#DC2626] text-white text-sm rounded-lg hover:bg-[#B91C1C] disabled:opacity-50 transition-colors"
                        >
                          {saving === feature._id ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingFeature(null);
                            setSelectedModel('');
                          }}
                          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Model</p>
                          {feature.model && feature.model._id ? (
                            <p className="text-sm font-medium text-gray-900">{feature.model.name}</p>
                          ) : (
                            <span className="text-sm text-yellow-600 font-medium">Not Mapped</span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setEditingFeature(feature._id);
                            setSelectedModel(feature.model?._id || '');
                          }}
                          className="text-[#DC2626] hover:text-[#B91C1C] text-sm font-medium transition-colors"
                        >
                          {feature.model && feature.model._id ? 'Change' : 'Assign'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Input Tokens</p>
                          <p className="font-medium text-gray-900 text-sm">{formatNumber(feature.tokenEstimates?.inputTokensPerRequest || 0)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Output Tokens</p>
                          <p className="font-medium text-gray-900 text-sm">{formatNumber(feature.tokenEstimates?.outputTokensPerRequest || 0)}</p>
                        </div>
                      </div>

                      <Link
                        to={`/features/${feature._id}`}
                        className="block text-center text-[#DC2626] hover:text-[#B91C1C] p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="View Details"
                      >
                        <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900">About Model Mapping</h4>
            <p className="text-sm text-blue-700 mt-1">
              Assign AI models to your features to enable token estimation and cost calculations.
              Models are managed by administrators. Contact your admin if you need a new model added.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelMappingPage;