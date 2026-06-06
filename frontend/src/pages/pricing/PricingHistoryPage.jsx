/**
 * Pricing History Page
 *
 * View and manage AI model pricing history.
 */

import Loader from '../../components/common/Loader.jsx';
import { useState, useEffect } from 'react';
import pricingHistoryApi from '../../services/api/pricingHistory.api.js';
import providerApi from '../../services/api/provider.api.js';

function PricingHistoryPage() {
  const [history, setHistory] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter state
  const [daysFilter, setDaysFilter] = useState(30);
  const [showCompare, setShowCompare] = useState(false);
  const [compareModels, setCompareModels] = useState([]);

  useEffect(() => {
    fetchData();
  }, [selectedProvider, daysFilter]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch providers list first (needed for both cases)
      const providersData = await providerApi.getAll();
      const providersArray = Array.isArray(providersData) ? providersData : (providersData?.providers || []);
      setProviders(providersArray);

      // Fetch history based on provider filter
      let historyData;
      if (selectedProvider) {
        // Get history for specific provider
        historyData = await pricingHistoryApi.getByProvider(selectedProvider, { limit: 50 });
      } else {
        // Get all recent changes
        historyData = await pricingHistoryApi.getRecentChanges({ days: daysFilter, limit: 50 });
      }

      // Fetch statistics with provider filter
      const statsData = await pricingHistoryApi.getStatistics(selectedProvider || null);

      // Extract arrays from API responses
      const historyArray = Array.isArray(historyData) ? historyData : (historyData?.history || historyData?.data || []);

      setHistory(historyArray);
      setStatistics(statsData || null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load pricing history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (historyId) => {
    try {
      await pricingHistoryApi.verify(historyId);
      setSuccess('Pricing change verified successfully');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to verify pricing change');
    }
  };

  const formatPrice = (price, currency = 'USD') => {
    if (!price && price !== 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 4
    }).format(price);
  };

  const formatPercent = (percent) => {
    if (!percent && percent !== 0) return '0%';
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const getChangeTypeColor = (type) => {
    switch (type) {
      case 'price_increase':
        return 'text-red-600 bg-red-50';
      case 'price_decrease':
        return 'text-green-600 bg-green-50';
      case 'initial':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DC2626] mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading pricing history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing History</h1>
          <p className="text-sm text-gray-500">Track and analyze AI model pricing changes</p>
        </div>
      </div>

      {/* Stats Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Changes</p>
                <p className="text-xl font-bold text-gray-900">{statistics.totalChanges || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Input Change</p>
                <p className="text-xl font-bold text-gray-900">{formatPercent(statistics.avgInputChange || 0)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Output Change</p>
                <p className="text-xl font-bold text-gray-900">{formatPercent(statistics.avgOutputChange || 0)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Recent (7 days)</p>
                <p className="text-xl font-bold text-gray-900">{statistics.recentChanges || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none "
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none "
            >
              <option value="">All Providers</option>
              {providers.map((provider) => (
                <option key={provider._id} value={provider._id}>
                  {provider.displayName || provider.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Input Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Output Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No pricing changes found for the selected period
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.model?.displayName || item.model?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">{item.model?.type || '-'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.provider?.displayName || item.provider?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getChangeTypeColor(item.priceChange?.inputPriceChangePercent > 0 ? 'price_increase' : item.priceChange?.inputPriceChangePercent < 0 ? 'price_decrease' : 'initial')}`}>
                        {item.priceChange?.inputPriceChangePercent > 0 ? 'Increase' : item.priceChange?.inputPriceChangePercent < 0 ? 'Decrease' : 'Initial'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-gray-900">{formatPrice(item.newPricing?.inputPrice)}</div>
                        <div className={`text-xs ${item.priceChange?.inputPriceChangePercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {formatPercent(item.priceChange?.inputPriceChangePercent || 0)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-gray-900">{formatPrice(item.newPricing?.outputPrice)}</div>
                        <div className={`text-xs ${item.priceChange?.outputPriceChangePercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {formatPercent(item.priceChange?.outputPriceChangePercent || 0)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.isVerified ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!item.isVerified && (
                        <button
                          onClick={() => handleVerify(item._id)}
                          className="text-[#DC2626] hover:text-[#B91C1C] font-medium"
                        >
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PricingHistoryPage;