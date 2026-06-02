/**
 * Simulations Page
 *
 * Create and run simulation scenarios for forecasting.
 */

import Loader from '../../components/common/Loader.jsx';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import Modal from '../../components/common/Modal.jsx';
import simulationApi from '../../services/api/simulation.api.js';
import usePermissions from '../../hooks/usePermissions.js';
import ForecastCharts from '../../components/simulations/ForecastCharts.jsx';

const SIMULATION_TYPES = [
  { value: 'growth', label: 'User Growth Scenario', description: 'Model user growth and token usage projections' },
  { value: 'pricing_change', label: 'Pricing Change Impact', description: 'Analyze impact of AI pricing changes' },
  { value: 'expense_forecast', label: 'Expense Forecast', description: 'Forecast operational expenses' },
  { value: 'revenue_forecast', label: 'Revenue Forecast', description: 'Project revenue and profitability' },
  { value: 'custom', label: 'Custom Scenario', description: 'Build a custom simulation' }
];

function SimulationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { canRunSimulations, canViewSimulations } = usePermissions();
  const [simulations, setSimulations] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get organization ID from user
  const orgId = user?.organization?._id || user?.organization;

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
    if (orgId) {
      fetchSimulations();
    }
  }, [orgId]);

  const fetchSimulations = async () => {
    setIsLoading(true);
    try {
      const [simulationsData, statsData] = await Promise.all([
        simulationApi.getForOrganization(orgId),
        simulationApi.getStatistics(orgId)
      ]);
      // Extract array from API response
      const simulationsArray = Array.isArray(simulationsData)
        ? simulationsData
        : (simulationsData?.simulations || simulationsData?.data || []);
      setSimulations(simulationsArray);
      setStatistics(statsData || null);
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
        organizationId: orgId,
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

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DC2626] mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading simulations...</p>
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Organization</h2>
          <p className="text-gray-500">Please contact your administrator to be added to an organization.</p>
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
        size="3xl"
      >
        <form onSubmit={handleCreateSimulation} className="space-y-5">
          {/* Basic Information Section */}
          <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Simulation Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                  placeholder="Enter simulation name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Simulation Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white text-sm"
                >
                  {SIMULATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors resize-none text-sm"
                placeholder="Describe this simulation scenario (optional)"
              />
            </div>
          </div>

          {/* Date Range Section */}
          <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Simulation Period</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.parameters.startDate}
                  onChange={(e) => setFormData({
                    ...formData,
                    parameters: { ...formData.parameters, startDate: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.parameters.endDate}
                  onChange={(e) => setFormData({
                    ...formData,
                    parameters: { ...formData.parameters, endDate: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* Growth Parameters */}
          {(formData.type === 'growth' || formData.type === 'custom') && (
            <div className="bg-blue-50 rounded-xl p-4 sm:p-5 border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Growth Parameters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">User Growth Rate</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.parameters.growth.userGrowthRate}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.-]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            growth: { ...formData.parameters.growth, userGrowthRate: parseFloat(value) || 0 }
                          }
                        });
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%/mo</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Token Usage Growth</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.parameters.growth.tokenUsageGrowthRate}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.-]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            growth: { ...formData.parameters.growth, tokenUsageGrowthRate: parseFloat(value) || 0 }
                          }
                        });
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%/mo</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Users Per Month</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.parameters.growth.newUsersPerMonth}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setFormData({
                        ...formData,
                        parameters: {
                          ...formData.parameters,
                          growth: { ...formData.parameters.growth, newUsersPerMonth: parseInt(value) || 0 }
                        }
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Churn Rate</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.parameters.growth.churnRate}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.-]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            growth: { ...formData.parameters.growth, churnRate: parseFloat(value) || 0 }
                          }
                        });
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%/mo</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Revenue Parameters */}
          {(formData.type === 'revenue_forecast' || formData.type === 'custom') && (
            <div className="bg-green-50 rounded-xl p-4 sm:p-5 border border-green-100">
              <h3 className="text-sm font-semibold text-green-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Revenue Parameters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly Subscription Revenue</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.parameters.revenueForecast.subscriptionRevenue}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.-]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            revenueForecast: { ...formData.parameters.revenueForecast, subscriptionRevenue: parseFloat(value) || 0 }
                          }
                        });
                      }}
                      className="w-full px-3 py-2 pl-7 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Revenue Growth Rate</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.parameters.revenueForecast.revenueGrowthRate}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.-]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            revenueForecast: { ...formData.parameters.revenueForecast, revenueGrowthRate: parseFloat(value) || 0 }
                          }
                        });
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%/yr</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Average Revenue Per User</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.parameters.revenueForecast.averageRevenuePerUser}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.-]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            revenueForecast: { ...formData.parameters.revenueForecast, averageRevenuePerUser: parseFloat(value) || 0 }
                          }
                        });
                      }}
                      className="w-full px-3 py-2 pl-7 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Token Price Markup</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.parameters.revenueForecast.tokenPriceMarkup}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.-]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            revenueForecast: { ...formData.parameters.revenueForecast, tokenPriceMarkup: parseFloat(value) || 0 }
                          }
                        });
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expense Parameters */}
          {(formData.type === 'expense_forecast' || formData.type === 'custom') && (
            <div className="bg-orange-50 rounded-xl p-4 sm:p-5 border border-orange-100">
              <h3 className="text-sm font-semibold text-orange-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
                Operational Expenses
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly Infrastructure Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.parameters.operationalExpenses.infrastructureCost}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.-]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            operationalExpenses: { ...formData.parameters.operationalExpenses, infrastructureCost: parseFloat(value) || 0 }
                          }
                        });
                      }}
                      className="w-full px-3 py-2 pl-7 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Infrastructure Growth Rate</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.parameters.operationalExpenses.infrastructureGrowthRate}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.-]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            operationalExpenses: { ...formData.parameters.operationalExpenses, infrastructureGrowthRate: parseFloat(value) || 0 }
                          }
                        });
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%/mo</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly Labor Costs</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.parameters.operationalExpenses.laborCosts}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.-]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            operationalExpenses: { ...formData.parameters.operationalExpenses, laborCosts: parseFloat(value) || 0 }
                          }
                        });
                      }}
                      className="w-full px-3 py-2 pl-7 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cost Optimization Factor</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.parameters.operationalExpenses.costOptimizationFactor}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.-]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            operationalExpenses: { ...formData.parameters.operationalExpenses, costOptimizationFactor: parseFloat(value) || 0 }
                          }
                        });
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions - Sticky at bottom */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-white border-t border-gray-200 -mb-4 sm:-mb-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors font-medium shadow-sm text-sm order-1 sm:order-2"
              >
                Create Simulation
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Results Modal */}
      <Modal
        isOpen={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        title="Simulation Results"
        size="3xl"
      >
        {selectedSimulation?.results && (
          <div className="space-y-5">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 sm:p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Projected Revenue</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">
                  {formatCurrency(selectedSimulation.results.summary?.totalProjectedRevenue || 0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 sm:p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Projected Costs</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">
                  {formatCurrency(selectedSimulation.results.summary?.totalProjectedCost || 0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 border border-green-200">
                <p className="text-xs text-green-600 mb-1">Net Profit</p>
                <p className="text-lg sm:text-xl font-bold text-green-700">
                  {formatCurrency(selectedSimulation.results.summary?.totalProjectedProfit || 0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
                <p className="text-xs text-blue-600 mb-1">Profit Margin</p>
                <p className="text-lg sm:text-xl font-bold text-blue-700">
                  {(selectedSimulation.results.summary?.profitMargin || 0).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                <p className="text-xs text-gray-500 mb-1">Total Users (End)</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900">
                  {(selectedSimulation.results.summary?.totalProjectedUsers || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                <p className="text-xs text-gray-500 mb-1">Break-Even Users</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900">
                  {(selectedSimulation.results.summary?.breakEvenUsers || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                <p className="text-xs text-gray-500 mb-1">ROI</p>
                <p className={`text-base sm:text-lg font-semibold ${selectedSimulation.results.summary?.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(selectedSimulation.results.summary?.roi || 0)}
                </p>
              </div>
            </div>

            {/* Comparison */}
            {selectedSimulation.results.comparison && (
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-gray-900 mb-3">Change vs Baseline</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-gray-500">Cost Change</p>
                    <p className={`text-base sm:text-lg font-semibold ${selectedSimulation.results.comparison.costChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatPercent(selectedSimulation.results.comparison.costChange)}
                    </p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-gray-500">Revenue Change</p>
                    <p className={`text-base sm:text-lg font-semibold ${selectedSimulation.results.comparison.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(selectedSimulation.results.comparison.revenueChange)}
                    </p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-gray-500">User Growth</p>
                    <p className="text-base sm:text-lg font-semibold text-blue-600">
                      {formatPercent(selectedSimulation.results.comparison.userGrowthAchieved)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Projections Table */}
            {selectedSimulation.results.monthlyProjections && selectedSimulation.results.monthlyProjections.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Monthly Projections</h4>
                <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                  <div className="min-w-[600px]">
                    <table className="w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Users</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tokens</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedSimulation.results.monthlyProjections.map((month, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap">{month.month}/{month.year}</td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">{month.users?.total?.toLocaleString() || '-'}</td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">{month.tokens?.total?.toLocaleString() || '-'}</td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(month.revenue?.total || 0)}</td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(month.costs?.totalCost || 0)}</td>
                            <td className={`px-3 py-2 text-right whitespace-nowrap font-medium ${month.profit?.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(month.profit?.net || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowResultsModal(false)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                Close
              </button>
            </div>

            {/* Forecast Charts */}
            {selectedSimulation.results?.monthlyProjections && selectedSimulation.results.monthlyProjections.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <ForecastCharts data={selectedSimulation.results} type="simulation" />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SimulationsPage;