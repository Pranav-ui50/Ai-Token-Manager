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
import { showToast } from '../../utils/toasts.jsx';

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
  const [showGuidelines, setShowGuidelines] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  // Handle numeric input - only allow digits, max 10 digits, no negative numbers
  const handleNumericInput = (value) => {
    // Remove any non-digit characters and limit to 10 digits
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 10);
    return cleaned;
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    if (!isFinite(num)) return num > 0 ? '∞' : '-∞';

    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';

    // Handle very large numbers
    if (absNum >= 1e15) {
      return `${sign}${(absNum / 1e12).toFixed(1)}T`;
    }
    if (absNum >= 1e12) {
      return `${sign}${(absNum / 1e12).toFixed(2)}T`;
    }
    if (absNum >= 1e9) {
      return `${sign}${(absNum / 1e9).toFixed(1)}B`;
    }
    if (absNum >= 1e6) {
      return `${sign}${(absNum / 1e6).toFixed(1)}M`;
    }
    if (absNum >= 1e3) {
      return `${sign}${(absNum / 1e3).toFixed(1)}K`;
    }
    return `${sign}${absNum.toLocaleString()}`;
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

  // Pagination logic
  const totalPages = Math.ceil(filteredFeatures.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedFeatures = filteredFeatures.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Handle page size change
  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page
  };

  // Pagination controls
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

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
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs text-gray-500 truncate">Avg Input Tokens</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate" title={avgInputTokens.toLocaleString()}>
                {formatNumber(avgInputTokens)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs text-gray-500 truncate">Avg Output Tokens</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate" title={avgOutputTokens.toLocaleString()}>
                {formatNumber(avgOutputTokens)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs text-gray-500 truncate">Total Features</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">
                {features.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs text-gray-500 truncate">Est. Monthly Tokens</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate" title={totalMonthlyTokens.toLocaleString()}>
                {formatNumber(totalMonthlyTokens)}
              </p>
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
            onChange={(e) => {
              if (e.target.value.length <= 200) {
                setSearchTerm(e.target.value);
              }
            }}
            maxLength={200}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
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
            <p className="text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search' : 'Create features to configure token estimates'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      S.No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Feature
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Input Tokens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Output Tokens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Monthly Requests
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Monthly Tokens
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedFeatures.map((feature, index) => (
                    <tr key={feature._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/features/${feature._id}`} className="hover:text-[#DC2626]">
                          <p className="font-medium text-gray-900">{feature.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{feature.category || 'other'}</p>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingFeature === feature._id ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formData.inputTokensPerRequest}
                            onChange={(e) => setFormData({ ...formData, inputTokensPerRequest: handleNumericInput(e.target.value) })}
                            className="w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                            placeholder="0"
                            maxLength={10}
                          />
                        ) : (
                          <span className="text-gray-900">{formatNumber(feature.tokenEstimates?.inputTokensPerRequest || 0)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingFeature === feature._id ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formData.outputTokensPerRequest}
                            onChange={(e) => setFormData({ ...formData, outputTokensPerRequest: handleNumericInput(e.target.value) })}
                            className="w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                            placeholder="0"
                            maxLength={10}
                          />
                        ) : (
                          <span className="text-gray-900">{formatNumber(feature.tokenEstimates?.outputTokensPerRequest || 0)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingFeature === feature._id ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formData.expectedMonthlyRequests}
                            onChange={(e) => setFormData({ ...formData, expectedMonthlyRequests: handleNumericInput(e.target.value) })}
                            className="w-28 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                            placeholder="0"
                            maxLength={10}
                          />
                        ) : (
                          <span className="text-gray-900">{formatNumber(feature.tokenEstimates?.expectedMonthlyRequests || 0)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{formatNumber(calculateMonthlyTokens(feature))}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
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
                            className="text-purple-600 hover:text-purple-700 p-2 rounded-lg hover:bg-purple-50 transition-colors"
                            title="Edit token estimates"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls - Desktop */}
            {totalPages > 1 && (
              <div className="hidden md:flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredFeatures.length)} of {filteredFeatures.length} entries
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="First page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {(() => {
                      const pages = [];
                      const maxVisiblePages = 5;
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }

                      if (startPage > 1) {
                        pages.push(
                          <button
                            key={1}
                            onClick={() => goToPage(1)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                          >
                            1
                          </button>
                        );
                        if (startPage > 2) {
                          pages.push(
                            <span key="ellipsis-start" className="px-1 text-gray-400">...</span>
                          );
                        }
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => goToPage(i)}
                            className={`px-3 py-1 text-sm border rounded ${
                              i === currentPage
                                ? 'bg-[#DC2626] text-white border-[#DC2626]'
                                : 'border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }

                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(
                            <span key="ellipsis-end" className="px-1 text-gray-400">...</span>
                          );
                        }
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => goToPage(totalPages)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                          >
                            {totalPages}
                          </button>
                        );
                      }

                      return pages;
                    })()}
                  </div>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Last page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {paginatedFeatures.map((feature) => (
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
                          type="text"
                          inputMode="numeric"
                          value={formData.inputTokensPerRequest}
                          onChange={(e) => setFormData({ ...formData, inputTokensPerRequest: handleNumericInput(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                          placeholder="0"
                          maxLength={10}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Output Tokens</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.outputTokensPerRequest}
                          onChange={(e) => setFormData({ ...formData, outputTokensPerRequest: handleNumericInput(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                          placeholder="0"
                          maxLength={10}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Monthly Requests</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.expectedMonthlyRequests}
                          onChange={(e) => setFormData({ ...formData, expectedMonthlyRequests: handleNumericInput(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                          placeholder="0"
                          maxLength={10}
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
                          className="text-purple-600 hover:text-purple-700 p-2 rounded-lg hover:bg-purple-50 transition-colors"
                          title="Edit token estimates"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {/* Pagination Controls - Mobile */}
              {totalPages > 1 && (
                <div className="md:hidden border-t border-gray-200 bg-gray-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={pageSize}
                      onChange={handlePageSizeChange}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                    >
                      <option value={10}>10 rows</option>
                      <option value={25}>25 rows</option>
                      <option value={50}>50 rows</option>
                      <option value={100}>100 rows</option>
                    </select>
                    <span className="text-xs text-gray-600 flex-1 text-center">
                      {startIndex + 1}-{Math.min(endIndex, filteredFeatures.length)} of {filteredFeatures.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    <button
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      className="p-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="First page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    {/* Page Numbers - Mobile */}
                    {(() => {
                      const pages = [];
                      const maxVisiblePages = 3;
                      let startPage = Math.max(1, currentPage - 1);
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }

                      if (startPage > 1) {
                        pages.push(
                          <button
                            key={1}
                            onClick={() => goToPage(1)}
                            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
                          >
                            1
                          </button>
                        );
                        if (startPage > 2) {
                          pages.push(
                            <span key="ellipsis-start" className="text-gray-400">...</span>
                          );
                        }
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => goToPage(i)}
                            className={`px-2.5 py-1.5 text-sm border rounded ${
                              i === currentPage
                                ? 'bg-[#DC2626] text-white border-[#DC2626]'
                                : 'border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }

                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(
                            <span key="ellipsis-end" className="text-gray-400">...</span>
                          );
                        }
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => goToPage(totalPages)}
                            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
                          >
                            {totalPages}
                          </button>
                        );
                      }

                      return pages;
                    })()}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Last page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Token Estimate Guidelines - Collapsible Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowGuidelines(!showGuidelines)}
          className="w-full px-4 sm:px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">Token Estimate Guidelines</h3>
              <p className="text-xs text-gray-500">Learn how to configure token estimates for accurate cost calculations</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showGuidelines ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showGuidelines && (
          <div className="px-4 sm:px-6 py-5 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Input Tokens */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-blue-900">Input Tokens</h4>
                </div>
                <p className="text-sm text-blue-700 mb-2">Average tokens sent per API request</p>
                <div className="text-xs text-blue-600 space-y-1">
                  <p>• Includes prompt text, instructions, and context</p>
                  <p>• Typical range: 100-4,000 tokens</p>
                  <p>• Longer prompts = more input tokens</p>
                </div>
              </div>

              {/* Output Tokens */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-green-900">Output Tokens</h4>
                </div>
                <p className="text-sm text-green-700 mb-2">Average tokens received in response</p>
                <div className="text-xs text-green-600 space-y-1">
                  <p>• The AI-generated response length</p>
                  <p>• Typical range: 100-2,000 tokens</p>
                  <p>• Complex responses = more output tokens</p>
                </div>
              </div>

              {/* Monthly Requests */}
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-orange-900">Monthly Requests</h4>
                </div>
                <p className="text-sm text-orange-700 mb-2">Expected API calls per month</p>
                <div className="text-xs text-orange-600 space-y-1">
                  <p>• Forecast your expected usage volume</p>
                  <p>• Used for cost projections</p>
                  <p>• Helps with capacity planning</p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Start with conservative estimates
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Update as usage patterns emerge
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                </svg>
                Review monthly for accuracy
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TokenEstimatesPage;
