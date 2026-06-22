/**
 * Admin Pricing Management Page
 *
 * Allows Super Admin to manage AI pricing configurations.
 */

import { useState, useEffect, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../services/api/admin.api.js';
import { showToast } from '../../utils/toasts.jsx';
import Loader from '../../components/common/Loader.jsx';

function AdminPricingPage() {
  const navigate = useNavigate();
  const [pricingData, setPricingData] = useState([]);
  const [providers, setProviders] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState(null);
  const [formData, setFormData] = useState({
    inputPrice: '',
    outputPrice: '',
    currency: 'USD'
  });

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    try {
      setLoading(true);
      // Fetch providers and models with pricing
      const [providersRes, modelsRes] = await Promise.all([
        adminApi.getProviders(),
        adminApi.getModels()
      ]);

      setProviders(providersRes.providers || []);
      setModels(modelsRes.models || []);
    } catch (err) {
      console.error('Failed to fetch pricing data:', err);
      showToast.error('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPricing = (model) => {
    setEditingModel(model);
    setFormData({
      inputPrice: model.pricing?.inputPrice || '',
      outputPrice: model.pricing?.outputPrice || '',
      currency: model.pricing?.currency || 'USD'
    });
  };

  const handleUpdatePricing = async () => {
    if (!editingModel) return;

    try {
      await adminApi.updateModel(editingModel._id, {
        pricing: {
          inputPrice: parseFloat(formData.inputPrice) || 0,
          outputPrice: parseFloat(formData.outputPrice) || 0,
          currency: formData.currency
        }
      });

      showToast.success('Pricing updated successfully');
      setEditingModel(null);
      fetchPricingData();
    } catch (err) {
      console.error('Failed to update pricing:', err);
      showToast.error(err.response?.data?.message || 'Failed to update pricing');
    }
  };

  const formatPrice = (price, currency = 'USD') => {
    if (!price && price !== 0) return '-';
    return `$${price.toFixed(4)} per 1K tokens`;
  };

  const groupModelsByProvider = () => {
    const grouped = {};
    providers.forEach(provider => {
      grouped[provider._id] = {
        provider,
        models: models.filter(model => model.provider?._id === provider._id || model.provider === provider._id)
      };
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader text="Loading pricing data..." />
      </div>
    );
  }

  const groupedData = groupModelsByProvider();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Pricing Management</h1>
          <p className="text-sm text-gray-500 mt-1">Configure pricing for AI models</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => startTransition(() => navigate('/pricing-history'))}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pricing History
          </button>
          <button
            onClick={fetchPricingData}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Pricing Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Total Providers</p>
            <p className="text-2xl font-bold text-blue-900">{providers.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Total Models</p>
            <p className="text-2xl font-bold text-green-900">{models.length}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">Configured Models</p>
            <p className="text-2xl font-bold text-purple-900">
              {models.filter(m => m.pricing?.inputPrice || m.pricing?.outputPrice).length}
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-orange-600 font-medium">Needs Pricing</p>
            <p className="text-2xl font-bold text-orange-900">
              {models.filter(m => !m.pricing?.inputPrice && !m.pricing?.outputPrice).length}
            </p>
          </div>
        </div>
      </div>

      {/* Provider Pricing Cards */}
      {Object.entries(groupedData).map(([providerId, { provider, models: providerModels }]) => (
        <div key={providerId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {provider.logo ? (
                <img src={provider.logo} alt={provider.name} className="h-8 w-8 rounded-lg object-contain" />
              ) : (
                <div className="h-8 w-8 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{provider.name?.charAt(0)}</span>
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                <p className="text-xs text-gray-500">{providerModels.length} models</p>
              </div>
            </div>
            <button
              onClick={() => startTransition(() => navigate('/admin/providers'))}
              className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
            >
              Manage Provider
            </button>
          </div>

          {providerModels.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No models configured for this provider
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Input Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Output Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {providerModels.map((model) => (
                    <tr key={model._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{model.name}</p>
                            <p className="text-xs text-gray-500">{model.modelId || model.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {model.type || 'Chat'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {editingModel?._id === model._id ? (
                          <input
                            type="number"
                            step="0.0001"
                            value={formData.inputPrice}
                            onChange={(e) => setFormData({ ...formData, inputPrice: e.target.value })}
                            className="w-24 px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-[#DC2626]"
                            placeholder="0.00"
                          />
                        ) : (
                          formatPrice(model.pricing?.inputPrice, model.pricing?.currency)
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {editingModel?._id === model._id ? (
                          <input
                            type="number"
                            step="0.0001"
                            value={formData.outputPrice}
                            onChange={(e) => setFormData({ ...formData, outputPrice: e.target.value })}
                            className="w-24 px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-[#DC2626]"
                            placeholder="0.00"
                          />
                        ) : (
                          formatPrice(model.pricing?.outputPrice, model.pricing?.currency)
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          model.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {model.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingModel?._id === model._id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={handleUpdatePricing}
                              className="px-3 py-1 text-sm font-medium text-white bg-[#DC2626] rounded hover:bg-[#B91C1C] transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingModel(null)}
                              className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditPricing(model)}
                            className="p-2 text-[#DC2626] hover:text-[#B91C1C] hover:bg-red-50 rounded-lg transition-colors"
                            title="Edit pricing"
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
          )}
        </div>
      ))}

      {/* Empty State */}
      {providers.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Providers Found</h3>
          <p className="text-gray-500 mb-4">Add AI providers to configure pricing for their models.</p>
          <button
            onClick={() => startTransition(() => navigate('/admin/providers'))}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Provider
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminPricingPage;
