/**
 * Feature Cost Page
 *
 * Product Manager can view:
 * - Estimated AI cost per feature
 * - Token usage impact
 * - Cost comparison between features
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';
import featureApi from '../../services/api/feature.api.js';
import { formatCurrencyWithSymbol } from '../../utils/currency.js';

function FeatureCostPage() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currency] = useState('USD');

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
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount) => {
    return formatCurrencyWithSymbol(amount || 0, currency);
  };

  // Calculate cost per request (simplified - in real app this would use model pricing)
  const calculateCostPerRequest = (feature) => {
    const inputTokens = feature.tokenEstimates?.inputTokensPerRequest || 0;
    const outputTokens = feature.tokenEstimates?.outputTokensPerRequest || 0;
    // Assuming average cost of $0.01 per 1K input tokens and $0.03 per 1K output tokens
    const inputCost = (inputTokens / 1000) * 0.01;
    const outputCost = (outputTokens / 1000) * 0.03;
    return inputCost + outputCost;
  };

  // Calculate monthly cost
  const calculateMonthlyCost = (feature) => {
    const costPerRequest = calculateCostPerRequest(feature);
    const monthlyRequests = feature.tokenEstimates?.expectedMonthlyRequests || 0;
    return costPerRequest * monthlyRequests;
  };

  // Sort features
  const sortedFeatures = [...features]
    .filter(feature =>
      feature.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feature.model?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name':
          aVal = a.name?.toLowerCase() || '';
          bVal = b.name?.toLowerCase() || '';
          break;
        case 'inputTokens':
          aVal = a.tokenEstimates?.inputTokensPerRequest || 0;
          bVal = b.tokenEstimates?.inputTokensPerRequest || 0;
          break;
        case 'outputTokens':
          aVal = a.tokenEstimates?.outputTokensPerRequest || 0;
          bVal = b.tokenEstimates?.outputTokensPerRequest || 0;
          break;
        case 'costPerRequest':
          aVal = calculateCostPerRequest(a);
          bVal = calculateCostPerRequest(b);
          break;
        case 'monthlyCost':
          aVal = calculateMonthlyCost(a);
          bVal = calculateMonthlyCost(b);
          break;
        default:
          aVal = a.name?.toLowerCase() || '';
          bVal = b.name?.toLowerCase() || '';
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });

  // Calculate totals
  const totalInputTokens = features.reduce((sum, f) => sum + (f.tokenEstimates?.inputTokensPerRequest || 0), 0);
  const totalOutputTokens = features.reduce((sum, f) => sum + (f.tokenEstimates?.outputTokensPerRequest || 0), 0);
  const totalMonthlyTokens = features.reduce((sum, f) => {
    const input = f.tokenEstimates?.inputTokensPerRequest || 0;
    const output = f.tokenEstimates?.outputTokensPerRequest || 0;
    const requests = f.tokenEstimates?.expectedMonthlyRequests || 0;
    return sum + ((input + output) * requests);
  }, 0);
  const totalMonthlyCost = features.reduce((sum, f) => sum + calculateMonthlyCost(f), 0);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return <Loader fullPage text="Loading feature costs..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Estimated Feature Cost</h1>
          <p className="text-sm text-gray-500">Estimated AI costs for each feature</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Link
            to="/token-estimates"
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            Configure Estimates
          </Link>
          <Link
            to="/features/new"
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors text-center"
          >
            Add Feature
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Total Input Tokens</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatNumber(totalInputTokens)}</p>
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
              <p className="text-xs text-gray-500 truncate">Total Output Tokens</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatNumber(totalOutputTokens)}</p>
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
              <p className="text-xs text-gray-500 truncate">Monthly Tokens</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatNumber(totalMonthlyTokens)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 h-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Est. Monthly Cost</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(totalMonthlyCost)}</p>
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
            placeholder="Search features or models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
          />
        </div>
      </div>

      {/* Cost Comparison Table/Card View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {sortedFeatures.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No features found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Create features to see cost estimates'}
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
                    <th
                      className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Feature
                        {sortBy === 'name' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Model
                    </th>
                    <th
                      className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('inputTokens')}
                    >
                      <div className="flex items-center gap-1">
                        Input Tokens
                        {sortBy === 'inputTokens' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('outputTokens')}
                    >
                      <div className="flex items-center gap-1">
                        Output Tokens
                        {sortBy === 'outputTokens' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('costPerRequest')}
                    >
                      <div className="flex items-center gap-1">
                        Cost/Request
                        {sortBy === 'costPerRequest' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('monthlyCost')}
                    >
                      <div className="flex items-center gap-1">
                        Monthly Cost
                        {sortBy === 'monthlyCost' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedFeatures.map((feature) => {
                    const costPerRequest = calculateCostPerRequest(feature);
                    const monthlyCost = calculateMonthlyCost(feature);
                    const monthlyRequests = feature.tokenEstimates?.expectedMonthlyRequests || 0;

                    return (
                      <tr key={feature._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <Link to={`/features/${feature._id}`} className="hover:text-[#DC2626]">
                            <p className="font-medium text-gray-900">{feature.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{feature.category || 'other'}</p>
                          </Link>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${feature.model ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {feature.model?.name || 'Not Mapped'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                          {formatNumber(feature.tokenEstimates?.inputTokensPerRequest || 0)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                          {formatNumber(feature.tokenEstimates?.outputTokensPerRequest || 0)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900 text-sm">
                            {formatCurrency(costPerRequest)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div>
                            <span className="font-bold text-gray-900 text-sm">{formatCurrency(monthlyCost)}</span>
                            <p className="text-xs text-gray-500">{formatNumber(monthlyRequests)} requests</p>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                          <Link
                            to={`/features/${feature._id}`}
                            className="text-[#DC2626] hover:text-[#B91C1C] p-1.5 rounded-lg hover:bg-red-50 transition-colors inline-flex items-center justify-center"
                            title="View Details"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {sortedFeatures.map((feature) => {
                const costPerRequest = calculateCostPerRequest(feature);
                const monthlyCost = calculateMonthlyCost(feature);
                const monthlyRequests = feature.tokenEstimates?.expectedMonthlyRequests || 0;

                return (
                  <div key={feature._id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/features/${feature._id}`} className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{feature.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{feature.category || 'other'}</p>
                      </Link>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${feature.model ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {feature.model?.name || 'Not Mapped'}
                      </span>
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

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500">Cost per request</p>
                        <p className="font-medium text-gray-900">{formatCurrency(costPerRequest)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Monthly Cost</p>
                        <p className="font-bold text-gray-900">{formatCurrency(monthlyCost)}</p>
                        <p className="text-xs text-gray-500">{formatNumber(monthlyRequests)} requests</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Cost Impact Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Cost Impact Summary</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Top Features by Cost</h4>
            <div className="space-y-2 sm:space-y-3">
              {sortedFeatures.slice(0, 5).map((feature, index) => {
                const monthlyCost = calculateMonthlyCost(feature);
                const percentage = totalMonthlyCost > 0 ? (monthlyCost / totalMonthlyCost) * 100 : 0;
                return (
                  <div key={feature._id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-4 flex-shrink-0">{index + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">{feature.name}</span>
                        <span className="text-sm text-gray-600 flex-shrink-0 ml-2">{formatCurrency(monthlyCost)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#DC2626] h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Token Distribution</h4>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Input Tokens</span>
                  <span className="text-sm font-medium text-gray-900">{formatNumber(totalInputTokens)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full"
                    style={{ width: `${totalInputTokens + totalOutputTokens > 0 ? (totalInputTokens / (totalInputTokens + totalOutputTokens)) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Output Tokens</span>
                  <span className="text-sm font-medium text-gray-900">{formatNumber(totalOutputTokens)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full"
                    style={{ width: `${totalInputTokens + totalOutputTokens > 0 ? (totalOutputTokens / (totalInputTokens + totalOutputTokens)) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-yellow-900">Cost Estimates</h4>
            <p className="text-sm text-yellow-700 mt-1">
              These are estimated costs based on token estimates and average AI pricing. Actual costs may vary based on:
            </p>
            <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
              <li>Actual model pricing from your AI provider</li>
              <li>Real-time usage patterns</li>
              <li>Infrastructure overhead costs</li>
              <li>Caching and optimization strategies</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureCostPage;