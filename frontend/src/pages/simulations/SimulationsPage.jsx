/**
 * Simulations Page
 *
 * Create and run simulation scenarios for forecasting.
 */

import Loader from '../../components/common/Loader.jsx';
import { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import simulationApi from '../../services/api/simulation.api.js';
import usePermissions from '../../hooks/usePermissions.js';

const SIMULATION_TYPES = [
  { value: 'growth', label: 'User Growth Scenario', description: 'Model user growth and token usage projections' },
  { value: 'pricing_change', label: 'Pricing Change Impact', description: 'Analyze impact of AI pricing changes' },
  { value: 'expense_forecast', label: 'Expense Forecast', description: 'Forecast operational expenses' },
  { value: 'revenue_forecast', label: 'Revenue Forecast', description: 'Project revenue and profitability' },
  { value: 'custom', label: 'Custom Scenario', description: 'Build a custom simulation' }
];

function SimulationsPage() {
  const { currentOrganization } = useOrganization();
  const { canRunSimulations, canViewSimulations } = usePermissions();
  const [simulations, setSimulations] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedSimulation, setSelectedSimulation] = useState(null);
  const [runningId, setRunningId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'growth',
    parameters: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      growth: {
        userGrowthRate: 10,
        tokenUsageGrowthRate: 15,
        newUsersPerMonth: 100,
        churnRate: 5
      },
      pricingChange: {
        currentInputPrice: 0,
        currentOutputPrice: 0,
        newInputPrice: 0,
        newOutputPrice: 0
      },
      operationalExpenses: {
        infrastructureCost: 0,
        infrastructureGrowthRate: 5,
        laborCosts: 0,
        otherCosts: 0,
        costOptimizationFactor: 0
      },
      revenueForecast: {
        subscriptionRevenue: 0,
        usageBasedRevenue: 0,
        revenueGrowthRate: 10,
        averageRevenuePerUser: 50,
        tokenPriceMarkup: 20
      }
    }
  });

  useEffect(() => {
    if (currentOrganization) {
      fetchSimulations();
    }
  }, [currentOrganization]);

  const fetchSimulations = async () => {
    setIsLoading(true);
    try {
      const [simulationsData, statsData] = await Promise.all([
        simulationApi.getForOrganization(currentOrganization._id),
        simulationApi.getStatistics(currentOrganization._id)
      ]);
      setSimulations(simulationsData || []);
      setStatistics(statsData);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load simulations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSimulation = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const simulation = await simulationApi.create({
        organizationId: currentOrganization._id,
        ...formData
      });
      setSimulations(prev => [simulation, ...prev]);
      setShowCreateModal(false);
      resetForm();
      setSuccess('Simulation created successfully');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create simulation');
    }
  };

  const handleRunSimulation = async (simulationId) => {
    setRunningId(simulationId);
    setError('');

    try {
      const result = await simulationApi.run(simulationId);
      setSimulations(prev => prev.map(s => s._id === simulationId ? result : s));
      setSelectedSimulation(result);
      setShowResultsModal(true);
      setSuccess('Simulation completed successfully');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to run simulation');
    } finally {
      setRunningId(null);
    }
  };

  const handleDeleteSimulation = async (simulation) => {
    if (!confirm(`Are you sure you want to delete "${simulation.name}"?`)) return;

    try {
      await simulationApi.delete(simulation._id);
      setSimulations(prev => prev.filter(s => s._id !== simulation._id));
      setSuccess('Simulation deleted successfully');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete simulation');
    }
  };

  const handleDuplicateSimulation = async (simulation) => {
    try {
      const duplicate = await simulationApi.duplicate(simulation._id);
      setSimulations(prev => [duplicate, ...prev]);
      setSuccess('Simulation duplicated successfully');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to duplicate simulation');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'growth',
      parameters: {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        growth: {
          userGrowthRate: 10,
          tokenUsageGrowthRate: 15,
          newUsersPerMonth: 100,
          churnRate: 5
        },
        pricingChange: {
          currentInputPrice: 0,
          currentOutputPrice: 0,
          newInputPrice: 0,
          newOutputPrice: 0
        },
        operationalExpenses: {
          infrastructureCost: 0,
          infrastructureGrowthRate: 5,
          laborCosts: 0,
          otherCosts: 0,
          costOptimizationFactor: 0
        },
        revenueForecast: {
          subscriptionRevenue: 0,
          usageBasedRevenue: 0,
          revenueGrowthRate: 10,
          averageRevenuePerUser: 50,
          tokenPriceMarkup: 20
        }
      }
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'running': return 'bg-blue-100 text-blue-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type) => {
    return SIMULATION_TYPES.find(t => t.value === type)?.label || type;
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Organization Selected</h2>
          <p className="text-gray-500">Please select an organization to manage simulations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulations</h1>
          <p className="text-sm text-gray-500">Create and run forecasting scenarios</p>
        </div>
        {canRunSimulations() && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Simulation</span>
          </button>
        )}
      </div>

      {/* Statistics */}
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
                <p className="text-xs text-gray-500">Total Simulations</p>
                <p className="text-xl font-bold text-gray-900">{statistics.total || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Completed</p>
                <p className="text-xl font-bold text-gray-900">{statistics.completed || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Profit Margin</p>
                <p className="text-xl font-bold text-gray-900">{(statistics.avgProfitMargin || 0).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Projected Profit</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(statistics.totalProjectedProfit || 0)}</p>
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

      {/* Simulations List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC2626]"></div>
        </div>
      ) : simulations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No simulations yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-4">
              Create your first simulation to start forecasting costs and revenue.
            </p>
            {canRunSimulations() && (
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Simulation</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit Margin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {simulations.map((sim) => (
                <tr key={sim._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{sim.name}</div>
                    <div className="text-sm text-gray-500">{sim.description || 'No description'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{getTypeLabel(sim.type)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(sim.parameters?.startDate)} - {formatDate(sim.parameters?.endDate)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sim.status)}`}>
                      {sim.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {sim.status === 'completed' ? (
                      <span className={sim.results?.summary?.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {(sim.results?.summary?.profitMargin || 0).toFixed(1)}%
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {sim.status === 'draft' && (
                        <button
                          onClick={() => handleRunSimulation(sim._id)}
                          disabled={runningId === sim._id}
                          className="text-[#DC2626] hover:text-[#B91C1C] font-medium text-sm disabled:opacity-50"
                        >
                          {runningId === sim._id ? 'Running...' : 'Run'}
                        </button>
                      )}
                      {sim.status === 'completed' && (
                        <button
                          onClick={() => {
                            setSelectedSimulation(sim);
                            setShowResultsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          View Results
                        </button>
                      )}
                      <button
                        onClick={() => handleDuplicateSimulation(sim)}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDeleteSimulation(sim)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Simulation Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Simulation"
        size="lg"
      >
        <form onSubmit={handleCreateSimulation} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name<span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg "
                placeholder="Simulation name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type<span className="text-red-500">*</span></label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg "
              >
                {SIMULATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
              placeholder="Describe this simulation scenario"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date<span className="text-red-500">*</span></label>
              <input
                type="date"
                value={formData.parameters.startDate}
                onChange={(e) => setFormData({
                  ...formData,
                  parameters: { ...formData.parameters, startDate: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg "
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date<span className="text-red-500">*</span></label>
              <input
                type="date"
                value={formData.parameters.endDate}
                onChange={(e) => setFormData({
                  ...formData,
                  parameters: { ...formData.parameters, endDate: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg "
                required
              />
            </div>
          </div>

          {/* Growth Parameters */}
          {(formData.type === 'growth' || formData.type === 'custom') && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Growth Parameters</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">User Growth Rate (%/month)</label>
                  <input
                    type="number"
                    value={formData.parameters.growth.userGrowthRate}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        growth: { ...formData.parameters.growth, userGrowthRate: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Token Usage Growth (%/month)</label>
                  <input
                    type="number"
                    value={formData.parameters.growth.tokenUsageGrowthRate}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        growth: { ...formData.parameters.growth, tokenUsageGrowthRate: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">New Users/Month</label>
                  <input
                    type="number"
                    value={formData.parameters.growth.newUsersPerMonth}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        growth: { ...formData.parameters.growth, newUsersPerMonth: parseInt(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Churn Rate (%/month)</label>
                  <input
                    type="number"
                    value={formData.parameters.growth.churnRate}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        growth: { ...formData.parameters.growth, churnRate: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Revenue Parameters */}
          {(formData.type === 'revenue_forecast' || formData.type === 'custom') && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Revenue Parameters</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Monthly Subscription Revenue ($)</label>
                  <input
                    type="number"
                    value={formData.parameters.revenueForecast.subscriptionRevenue}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        revenueForecast: { ...formData.parameters.revenueForecast, subscriptionRevenue: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Revenue Growth Rate (%/year)</label>
                  <input
                    type="number"
                    value={formData.parameters.revenueForecast.revenueGrowthRate}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        revenueForecast: { ...formData.parameters.revenueForecast, revenueGrowthRate: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Avg Revenue Per User ($)</label>
                  <input
                    type="number"
                    value={formData.parameters.revenueForecast.averageRevenuePerUser}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        revenueForecast: { ...formData.parameters.revenueForecast, averageRevenuePerUser: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Token Price Markup (%)</label>
                  <input
                    type="number"
                    value={formData.parameters.revenueForecast.tokenPriceMarkup}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        revenueForecast: { ...formData.parameters.revenueForecast, tokenPriceMarkup: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Expense Parameters */}
          {(formData.type === 'expense_forecast' || formData.type === 'custom') && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Operational Expenses</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Monthly Infrastructure Cost ($)</label>
                  <input
                    type="number"
                    value={formData.parameters.operationalExpenses.infrastructureCost}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        operationalExpenses: { ...formData.parameters.operationalExpenses, infrastructureCost: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Infrastructure Growth (%/month)</label>
                  <input
                    type="number"
                    value={formData.parameters.operationalExpenses.infrastructureGrowthRate}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        operationalExpenses: { ...formData.parameters.operationalExpenses, infrastructureGrowthRate: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Monthly Labor Costs ($)</label>
                  <input
                    type="number"
                    value={formData.parameters.operationalExpenses.laborCosts}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        operationalExpenses: { ...formData.parameters.operationalExpenses, laborCosts: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Cost Optimization Factor (%)</label>
                  <input
                    type="number"
                    value={formData.parameters.operationalExpenses.costOptimizationFactor}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        operationalExpenses: { ...formData.parameters.operationalExpenses, costOptimizationFactor: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors"
            >
              Create Simulation
            </button>
          </div>
        </form>
      </Modal>

      {/* Results Modal */}
      <Modal
        isOpen={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        title="Simulation Results"
        size="lg"
      >
        {selectedSimulation?.results && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Projected Revenue</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(selectedSimulation.results.summary?.totalProjectedRevenue || 0)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Projected Costs</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(selectedSimulation.results.summary?.totalProjectedCost || 0)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Net Profit</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(selectedSimulation.results.summary?.totalProjectedProfit || 0)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Profit Margin</p>
                <p className="text-xl font-bold text-blue-600">
                  {(selectedSimulation.results.summary?.profitMargin || 0).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Total Users (End)</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(selectedSimulation.results.summary?.totalProjectedUsers || 0).toLocaleString()}
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Break-Even Users</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(selectedSimulation.results.summary?.breakEvenUsers || 0).toLocaleString()}
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">ROI</p>
                <p className={`text-lg font-semibold ${selectedSimulation.results.summary?.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(selectedSimulation.results.summary?.roi || 0)}
                </p>
              </div>
            </div>

            {/* Comparison */}
            {selectedSimulation.results.comparison && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Change vs Baseline</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Cost Change</p>
                    <p className={`text-lg font-semibold ${selectedSimulation.results.comparison.costChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatPercent(selectedSimulation.results.comparison.costChange)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Revenue Change</p>
                    <p className={`text-lg font-semibold ${selectedSimulation.results.comparison.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(selectedSimulation.results.comparison.revenueChange)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">User Growth</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatPercent(selectedSimulation.results.comparison.userGrowthAchieved)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Projections Table */}
            {selectedSimulation.results.monthlyProjections && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Monthly Projections</h4>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Month</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Users</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Tokens</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Revenue</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Cost</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedSimulation.results.monthlyProjections.map((month, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">{month.month}/{month.year}</td>
                          <td className="px-3 py-2 text-right">{month.users?.total?.toLocaleString() || '-'}</td>
                          <td className="px-3 py-2 text-right">{month.tokens?.total?.toLocaleString() || '-'}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(month.revenue?.total || 0)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(month.costs?.totalCost || 0)}</td>
                          <td className={`px-3 py-2 text-right font-medium ${month.profit?.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(month.profit?.net || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => setShowResultsModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SimulationsPage;