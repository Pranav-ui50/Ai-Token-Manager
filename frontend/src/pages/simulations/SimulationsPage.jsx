/**
 * Simulations Page
 *
 * Create and run simulation scenarios for forecasting.
 */

import Loader from '../../components/common/Loader.jsx';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useSubscription } from '../../context/SubscriptionContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import simulationApi from '../../services/api/simulation.api.js';
import usePermissions from '../../hooks/usePermissions.js';
import ForecastCharts from '../../components/simulations/ForecastCharts.jsx';
import { showToast } from '../../utils/toasts.jsx';
import { handleSubscriptionError, isSubscriptionError } from '../../utils/subscriptionErrorHandler.jsx';

const SIMULATION_TYPES = [
  { value: 'growth', label: 'User Growth Scenario', description: 'Model user growth and token usage projections' },
  { value: 'pricing_change', label: 'Pricing Change Impact', description: 'Analyze impact of AI pricing changes' },
  { value: 'expense_forecast', label: 'Expense Forecast', description: 'Forecast operational expenses' },
  { value: 'revenue_forecast', label: 'Revenue Forecast', description: 'Project revenue and profitability' },
  { value: 'custom', label: 'Custom Scenario', description: 'Build a custom simulation' }
];

function SimulationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { canRunSimulations, canViewSimulations, role } = usePermissions();
  const { checkLimit, subscription } = useSubscription();
  const isViewer = role === 'viewer';
  const [simulations, setSimulations] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Get organization ID from user
  const orgId = user?.organization?._id || user?.organization;

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSimulation, setSelectedSimulation] = useState(null);
  const [runningId, setRunningId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    parameters: {
      startDate: '',
      endDate: '',
      growth: {
        userGrowthRate: '',
        tokenUsageGrowthRate: '',
        newUsersPerMonth: '',
        churnRate: ''
      },
      pricingChange: {
        currentInputPrice: '',
        currentOutputPrice: '',
        newInputPrice: '',
        newOutputPrice: ''
      },
      operationalExpenses: {
        infrastructureCost: '',
        infrastructureGrowthRate: '',
        laborCosts: '',
        otherCosts: '',
        costOptimizationFactor: ''
      },
      revenueForecast: {
        subscriptionRevenue: '',
        usageBasedRevenue: '',
        revenueGrowthRate: '',
        averageRevenuePerUser: '',
        tokenPriceMarkup: ''
      }
    }
  });

  // Form errors state
  const [formErrors, setFormErrors] = useState({});

  // Pagination calculations
  const totalRecords = simulations.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSimulations = simulations.slice(startIndex, endIndex);

  // Reset to first page when simulations change
  useEffect(() => {
    setCurrentPage(1);
  }, [simulations.length]);

  // Get min date for date inputs (today for start date)
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const getMaxDate = () => '2100-12-31';

  useEffect(() => {
    // Fetch data on mount - don't wait for orgId
    fetchSimulations();
  }, []);

  const fetchSimulations = async () => {
    setIsLoading(true);
    try {
      // If no organization, set empty data
      if (!orgId) {
        setSimulations([]);
        setStatistics(null);
        setIsLoading(false);
        return;
      }

      const [simulationsData, statsData] = await Promise.all([
        simulationApi.getForOrganization(orgId).catch(() => ({ simulations: [] })),
        simulationApi.getStatistics(orgId).catch(() => null)
      ]);
      // Extract array from API response
      const simulationsArray = Array.isArray(simulationsData)
        ? simulationsData
        : (simulationsData?.simulations || simulationsData?.data || []);
      setSimulations(simulationsArray);
      setStatistics(statsData || null);
    } catch (err) {
      console.error('Failed to load simulations:', err);
      // Set empty data instead of showing error
      setSimulations([]);
      setStatistics(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch only statistics (for refreshing after operations)
  const fetchStatistics = async () => {
    if (!orgId) return;
    try {
      const statsData = await simulationApi.getStatistics(orgId).catch(() => null);
      setStatistics(statsData || null);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  const handleCreateSimulation = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      showToast.error('Please fix the errors in the form');
      return;
    }

    // Check subscription limits before creating
    try {
      if (checkLimit && typeof checkLimit === 'function') {
        const limitCheck = checkLimit('simulations', 1);
        if (limitCheck && !limitCheck.allowed) {
          showToast.error(limitCheck.reason || 'Simulation limit reached. Please upgrade your subscription to create more simulations.', {
            action: {
              label: 'Upgrade',
              onClick: () => {
                window.location.href = '/subscription';
              }
            }
          });
          return;
        }
      }
    } catch (err) {
      // If limit check fails (subscription context not available), proceed with creation
      // The backend will validate limits
      console.log('Subscription check not available, proceeding with backend validation');
    }

    try {
      const simulation = await simulationApi.create({
        organizationId: orgId,
        ...formData,
        parameters: {
          ...formData.parameters,
          growth: {
            userGrowthRate: parseFloat(formData.parameters.growth.userGrowthRate) || 0,
            tokenUsageGrowthRate: parseFloat(formData.parameters.growth.tokenUsageGrowthRate) || 0,
            newUsersPerMonth: parseInt(formData.parameters.growth.newUsersPerMonth) || 0,
            churnRate: parseFloat(formData.parameters.growth.churnRate) || 0
          },
          pricingChange: {
            currentInputPrice: parseFloat(formData.parameters.pricingChange.currentInputPrice) || 0,
            currentOutputPrice: parseFloat(formData.parameters.pricingChange.currentOutputPrice) || 0,
            newInputPrice: parseFloat(formData.parameters.pricingChange.newInputPrice) || 0,
            newOutputPrice: parseFloat(formData.parameters.pricingChange.newOutputPrice) || 0
          },
          operationalExpenses: {
            infrastructureCost: parseFloat(formData.parameters.operationalExpenses.infrastructureCost) || 0,
            infrastructureGrowthRate: parseFloat(formData.parameters.operationalExpenses.infrastructureGrowthRate) || 0,
            laborCosts: parseFloat(formData.parameters.operationalExpenses.laborCosts) || 0,
            otherCosts: parseFloat(formData.parameters.operationalExpenses.otherCosts) || 0,
            costOptimizationFactor: parseFloat(formData.parameters.operationalExpenses.costOptimizationFactor) || 0
          },
          revenueForecast: {
            subscriptionRevenue: parseFloat(formData.parameters.revenueForecast.subscriptionRevenue) || 0,
            usageBasedRevenue: parseFloat(formData.parameters.revenueForecast.usageBasedRevenue) || 0,
            revenueGrowthRate: parseFloat(formData.parameters.revenueForecast.revenueGrowthRate) || 0,
            averageRevenuePerUser: parseFloat(formData.parameters.revenueForecast.averageRevenuePerUser) || 0,
            tokenPriceMarkup: parseFloat(formData.parameters.revenueForecast.tokenPriceMarkup) || 0
          }
        }
      });
      setSimulations(prev => [simulation, ...prev]);
      setShowCreateModal(false);
      resetForm();
      showToast.success('Simulation created successfully');
      // Refresh statistics after creating
      fetchStatistics();
    } catch (err) {
      // Handle subscription limit errors specifically
      if (isSubscriptionError(err)) {
        handleSubscriptionError(err);
        return;
      }
      showToast.error(err.response?.data?.error?.message || 'Failed to create simulation');
    }
  };

  const handleRunSimulation = async (simulationId) => {
    setRunningId(simulationId);

    try {
      const result = await simulationApi.run(simulationId);
      setSimulations(prev => prev.map(s => s._id === simulationId ? result : s));
      setSelectedSimulation(result);
      setShowResultsModal(true);
      showToast.success('Simulation completed successfully');
      // Refresh statistics after running
      fetchStatistics();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to run simulation');
    } finally {
      setRunningId(null);
    }
  };

  const handleDeleteSimulation = async (simulation) => {
    setSelectedSimulation(simulation);
    setShowDeleteModal(true);
  };

  const confirmDeleteSimulation = async () => {
    if (!selectedSimulation) return;

    const simulationId = selectedSimulation._id || selectedSimulation.id;
    if (!simulationId) {
      showToast.error('Invalid simulation ID');
      return;
    }

    console.log('[SimulationsPage] Deleting simulation:', simulationId);

    try {
      const response = await simulationApi.delete(simulationId);
      console.log('[SimulationsPage] Delete response:', response);

      // Update state to remove the deleted simulation
      setSimulations(prev => prev.filter(s => (s._id || s.id) !== simulationId));

      console.log('[SimulationsPage] State updated, showing success toast');
      setShowDeleteModal(false);
      setSelectedSimulation(null);
      showToast.success('Simulation deleted successfully');
      // Refresh statistics after deleting
      fetchStatistics();
    } catch (err) {
      console.error('[SimulationsPage] Delete simulation error:', err);
      console.error('[SimulationsPage] Error response:', err?.response);
      console.error('[SimulationsPage] Error data:', err?.response?.data);

      const errorMessage = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Failed to delete simulation';
      showToast.error(errorMessage);
    }
  };

  const handleDuplicateSimulation = async (simulation) => {
    // Check subscription limits before duplicating
    try {
      if (checkLimit && typeof checkLimit === 'function') {
        const limitCheck = checkLimit('simulations', 1);
        if (limitCheck && !limitCheck.allowed) {
          showToast.error(limitCheck.reason || 'Simulation limit reached. Please upgrade your subscription to create more simulations.', {
            action: {
              label: 'Upgrade',
              onClick: () => {
                window.location.href = '/subscription';
              }
            }
          });
          return;
        }
      }
    } catch (err) {
      // If limit check fails (subscription context not available), proceed with duplication
      // The backend will validate limits
      console.log('Subscription check not available, proceeding with backend validation');
    }

    try {
      const duplicate = await simulationApi.duplicate(simulation._id);
      setSimulations(prev => [duplicate, ...prev]);
      showToast.success('Simulation duplicated successfully');
      // Refresh statistics after duplicating
      fetchStatistics();
    } catch (err) {
      console.error('Duplicate simulation error:', err);

      // Handle subscription limit errors specifically
      if (isSubscriptionError(err)) {
        handleSubscriptionError(err);
        return;
      }

      showToast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to duplicate simulation');
    }
  };

  const handleEditSimulation = (simulation) => {
    setSelectedSimulation(simulation);
    // Populate form with existing simulation data
    setFormData({
      name: simulation.name || '',
      description: simulation.description || '',
      type: simulation.type || '',
      parameters: {
        startDate: simulation.parameters?.startDate ? new Date(simulation.parameters.startDate).toISOString().split('T')[0] : '',
        endDate: simulation.parameters?.endDate ? new Date(simulation.parameters.endDate).toISOString().split('T')[0] : '',
        growth: {
          userGrowthRate: String(simulation.parameters?.growth?.userGrowthRate || ''),
          tokenUsageGrowthRate: String(simulation.parameters?.growth?.tokenUsageGrowthRate || ''),
          newUsersPerMonth: String(simulation.parameters?.growth?.newUsersPerMonth || ''),
          churnRate: String(simulation.parameters?.growth?.churnRate || '')
        },
        pricingChange: {
          currentInputPrice: String(simulation.parameters?.pricingChange?.currentInputPrice || ''),
          currentOutputPrice: String(simulation.parameters?.pricingChange?.currentOutputPrice || ''),
          newInputPrice: String(simulation.parameters?.pricingChange?.newInputPrice || ''),
          newOutputPrice: String(simulation.parameters?.pricingChange?.newOutputPrice || '')
        },
        operationalExpenses: {
          infrastructureCost: String(simulation.parameters?.operationalExpenses?.infrastructureCost || ''),
          infrastructureGrowthRate: String(simulation.parameters?.operationalExpenses?.infrastructureGrowthRate || ''),
          laborCosts: String(simulation.parameters?.operationalExpenses?.laborCosts || ''),
          otherCosts: String(simulation.parameters?.operationalExpenses?.otherCosts || ''),
          costOptimizationFactor: String(simulation.parameters?.operationalExpenses?.costOptimizationFactor || '')
        },
        revenueForecast: {
          subscriptionRevenue: String(simulation.parameters?.revenueForecast?.subscriptionRevenue || ''),
          usageBasedRevenue: String(simulation.parameters?.revenueForecast?.usageBasedRevenue || ''),
          revenueGrowthRate: String(simulation.parameters?.revenueForecast?.revenueGrowthRate || ''),
          averageRevenuePerUser: String(simulation.parameters?.revenueForecast?.averageRevenuePerUser || ''),
          tokenPriceMarkup: String(simulation.parameters?.revenueForecast?.tokenPriceMarkup || '')
        }
      }
    });
    setShowEditModal(true);
  };

  const handleUpdateSimulation = async (e) => {
    e.preventDefault();

    if (!selectedSimulation) return;

    // Validate form
    if (!validateForm()) {
      showToast.error('Please fix the errors in the form');
      return;
    }

    try {
      const updatedSimulation = await simulationApi.update(selectedSimulation._id, {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        parameters: {
          ...formData.parameters,
          startDate: formData.parameters.startDate,
          endDate: formData.parameters.endDate,
          growth: {
            userGrowthRate: parseFloat(formData.parameters.growth.userGrowthRate) || 0,
            tokenUsageGrowthRate: parseFloat(formData.parameters.growth.tokenUsageGrowthRate) || 0,
            newUsersPerMonth: parseInt(formData.parameters.growth.newUsersPerMonth) || 0,
            churnRate: parseFloat(formData.parameters.growth.churnRate) || 0
          },
          pricingChange: {
            currentInputPrice: parseFloat(formData.parameters.pricingChange.currentInputPrice) || 0,
            currentOutputPrice: parseFloat(formData.parameters.pricingChange.currentOutputPrice) || 0,
            newInputPrice: parseFloat(formData.parameters.pricingChange.newInputPrice) || 0,
            newOutputPrice: parseFloat(formData.parameters.pricingChange.newOutputPrice) || 0
          },
          operationalExpenses: {
            infrastructureCost: parseFloat(formData.parameters.operationalExpenses.infrastructureCost) || 0,
            infrastructureGrowthRate: parseFloat(formData.parameters.operationalExpenses.infrastructureGrowthRate) || 0,
            laborCosts: parseFloat(formData.parameters.operationalExpenses.laborCosts) || 0,
            otherCosts: parseFloat(formData.parameters.operationalExpenses.otherCosts) || 0,
            costOptimizationFactor: parseFloat(formData.parameters.operationalExpenses.costOptimizationFactor) || 0
          },
          revenueForecast: {
            subscriptionRevenue: parseFloat(formData.parameters.revenueForecast.subscriptionRevenue) || 0,
            usageBasedRevenue: parseFloat(formData.parameters.revenueForecast.usageBasedRevenue) || 0,
            revenueGrowthRate: parseFloat(formData.parameters.revenueForecast.revenueGrowthRate) || 0,
            averageRevenuePerUser: parseFloat(formData.parameters.revenueForecast.averageRevenuePerUser) || 0,
            tokenPriceMarkup: parseFloat(formData.parameters.revenueForecast.tokenPriceMarkup) || 0
          }
        }
      });

      setSimulations(prev => prev.map(s => s._id === selectedSimulation._id ? updatedSimulation : s));
      setShowEditModal(false);
      setSelectedSimulation(null);
      resetForm();
      showToast.success('Simulation updated successfully');
      fetchStatistics();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to update simulation');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: '',
      parameters: {
        startDate: '',
        endDate: '',
        growth: {
          userGrowthRate: '',
          tokenUsageGrowthRate: '',
          newUsersPerMonth: '',
          churnRate: ''
        },
        pricingChange: {
          currentInputPrice: '',
          currentOutputPrice: '',
          newInputPrice: '',
          newOutputPrice: ''
        },
        operationalExpenses: {
          infrastructureCost: '',
          infrastructureGrowthRate: '',
          laborCosts: '',
          otherCosts: '',
          costOptimizationFactor: ''
        },
        revenueForecast: {
          subscriptionRevenue: '',
          usageBasedRevenue: '',
          revenueGrowthRate: '',
          averageRevenuePerUser: '',
          tokenPriceMarkup: ''
        }
      }
    });
    setFormErrors({});
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Validate name
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Simulation name is required';
    } else if (formData.name.length > 60) {
      errors.name = 'Simulation name must be 60 characters or less';
    }

    // Validate start date
    if (!formData.parameters.startDate) {
      errors.startDate = 'Start date is required';
    }

    // Validate end date
    if (!formData.parameters.endDate) {
      errors.endDate = 'End date is required';
    } else if (formData.parameters.startDate && formData.parameters.endDate < formData.parameters.startDate) {
      errors.endDate = 'End date must be on or after start date';
    }

    // Validate numeric fields for growth parameters
    if (formData.type === 'growth' || formData.type === 'custom') {
      if (formData.parameters.growth.userGrowthRate && isNaN(parseFloat(formData.parameters.growth.userGrowthRate))) {
        errors.userGrowthRate = 'User growth rate must be a valid number';
      }
      if (formData.parameters.growth.tokenUsageGrowthRate && isNaN(parseFloat(formData.parameters.growth.tokenUsageGrowthRate))) {
        errors.tokenUsageGrowthRate = 'Token usage growth must be a valid number';
      }
      if (formData.parameters.growth.newUsersPerMonth && isNaN(parseInt(formData.parameters.growth.newUsersPerMonth))) {
        errors.newUsersPerMonth = 'New users per month must be a valid number';
      }
      if (formData.parameters.growth.churnRate && isNaN(parseFloat(formData.parameters.growth.churnRate))) {
        errors.churnRate = 'Churn rate must be a valid number';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount) || !isFinite(amount)) return '$0';
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    // Handle very large numbers (scientific notation)
    if (absAmount >= 1e15) {
      return `${sign}$${(absAmount / 1e12).toFixed(1)}T`;
    }
    if (absAmount >= 1e12) {
      return `${sign}$${(absAmount / 1e12).toFixed(2)}T`;
    }
    if (absAmount >= 1000000000) {
      return `${sign}$${(absAmount / 1000000000).toFixed(1)}B`;
    }
    if (absAmount >= 1000000) {
      return `${sign}$${(absAmount / 1000000).toFixed(1)}M`;
    }
    if (absAmount >= 10000) {
      return `${sign}$${(absAmount / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0%';
    if (!isFinite(value)) return value > 0 ? '+∞%' : '-∞%';
    // Handle very large percentages
    if (Math.abs(value) > 1e6) {
      return value >= 0 ? `+${(value / 1e6).toFixed(1)}M%` : `-${(Math.abs(value) / 1e6).toFixed(1)}M%`;
    }
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '0';
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1e15) {
      return `${sign}${(absValue / 1e12).toFixed(1)}T`;
    }
    if (absValue >= 1e12) {
      return `${sign}${(absValue / 1e12).toFixed(2)}T`;
    }
    if (absValue >= 1000000000) {
      return `${sign}${(absValue / 1000000000).toFixed(1)}B`;
    }
    if (absValue >= 1000000) {
      return `${sign}${(absValue / 1000000).toFixed(1)}M`;
    }
    if (absValue >= 10000) {
      return `${sign}${(absValue / 1000).toFixed(1)}K`;
    }
    return `${sign}${absValue.toLocaleString()}`;
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
        <Loader text="Loading simulations..." />
      </div>
    );
  }

  // No organization state - show empty state instead of blocking
  const showNoOrgState = !orgId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulations</h1>
          <p className="text-sm text-gray-500">Create and run forecasting scenarios</p>
        </div>
        {canRunSimulations() && !showNoOrgState && (
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="text-xs text-gray-500">Total Simulations</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">{statistics.total || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="text-xs text-gray-500">Completed</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">{statistics.completed || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="text-xs text-gray-500">Avg Profit Margin</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">{(statistics.avgProfitMargin || 0).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="text-xs text-gray-500">Projected Profit</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">{formatCurrency(statistics.totalProjectedProfit || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulations List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      ) : showNoOrgState ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Organization</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              You need to be part of an organization to create and run simulations. Please contact your administrator.
            </p>
          </div>
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
            {canRunSimulations() && !showNoOrgState && (
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit Margin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedSimulations.map((sim, index) => (
                <tr key={sim._id} className={`hover:bg-gray-50 ${sim.disabledAt ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {startIndex + index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {sim.name}
                      {sim.disabledAt && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{sim.description || 'No description'}</div>
                    {sim.disabledNote && (
                      <div className="text-xs text-red-600 mt-1">{sim.disabledNote}</div>
                    )}
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
                      {sim.status === 'draft' && !isViewer && (
                        <>
                          <button
                            onClick={() => handleRunSimulation(sim._id)}
                            disabled={runningId === sim._id || sim.disabledAt}
                            className={`p-2 rounded-lg transition-colors ${
                              sim.disabledAt
                                ? 'text-gray-300 cursor-not-allowed'
                                : runningId === sim._id
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-[#DC2626] hover:text-[#B91C1C] hover:bg-red-50'
                            }`}
                            title={sim.disabledAt ? 'Simulation is disabled due to plan limit' : (runningId === sim._id ? 'Running...' : 'Run Simulation')}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditSimulation(sim)}
                            disabled={sim.disabledAt}
                            className={`p-2 rounded-lg transition-colors ${
                              sim.disabledAt
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                            }`}
                            title={sim.disabledAt ? 'Simulation is disabled due to plan limit' : 'Edit'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </>
                      )}
                      {sim.status === 'completed' && (
                        <button
                          onClick={() => {
                            setSelectedSimulation(sim);
                            setShowResultsModal(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Results"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      )}
                      {!isViewer && (
                        <>
                          <button
                            onClick={() => handleDuplicateSimulation(sim)}
                            disabled={sim.disabledAt}
                            className={`p-2 rounded-lg transition-colors ${
                              sim.disabledAt
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                            title={sim.disabledAt ? 'Simulation is disabled due to plan limit' : 'Duplicate'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteSimulation(sim)}
                            disabled={sim.disabledAt}
                            className={`p-2 rounded-lg transition-colors ${
                              sim.disabledAt
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                            }`}
                            title={sim.disabledAt ? 'Simulation is disabled due to plan limit' : 'Delete'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(parseInt(e.target.value, 10));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of {totalRecords} entries
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="First page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            onClick={() => setCurrentPage(1)}
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
                            onClick={() => setCurrentPage(i)}
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
                            onClick={() => setCurrentPage(totalPages)}
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
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
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
            </div>
          )}
        </div>
      )}

      {/* Create Simulation Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        title="Create New Simulation"
        size="3xl"
        closeOnBackdropClick={false}
      >
        <form onSubmit={handleCreateSimulation} className="space-y-5">
          {/* Basic Information Section */}
          <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Simulation Name<span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-gray-400">{formData.name.length}/60</span>
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                  }}
                  maxLength={60}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 transition-colors text-sm ${formErrors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-red-500'}`}
                  placeholder="Enter simulation name"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Simulation Type<span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white text-sm"
                >
                  <option value="">Select Simulation Type</option>
                  {SIMULATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <span className="text-xs text-gray-400">{formData.description.length}/300</span>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                maxLength={300}
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
                  Start Date<span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.parameters.startDate}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    // If end date is before new start date, update it to match start date
                    const newEndDate = formData.parameters.endDate && formData.parameters.endDate < newStartDate
                      ? newStartDate
                      : formData.parameters.endDate;
                    setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        startDate: newStartDate,
                        endDate: newEndDate
                      }
                    });
                    if (formErrors.startDate) setFormErrors({ ...formErrors, startDate: null });
                  }}
                  min={getTodayDate()}
                  max={getMaxDate()}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 transition-colors text-sm ${formErrors.startDate ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-red-500'}`}
                />
                {formErrors.startDate && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.startDate}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  End Date<span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.parameters.endDate}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      parameters: { ...formData.parameters, endDate: e.target.value }
                    });
                    if (formErrors.endDate) setFormErrors({ ...formErrors, endDate: null });
                  }}
                  min={formData.parameters.startDate || getTodayDate()}
                  max={getMaxDate()}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 transition-colors text-sm ${formErrors.endDate ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-red-500'}`}
                />
                {formErrors.endDate && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.endDate}</p>
                )}
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
                      maxLength={12}
                      value={formData.parameters.growth.userGrowthRate}
                      placeholder="e.g., 10"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            growth: { ...formData.parameters.growth, userGrowthRate: value }
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
                      maxLength={12}
                      value={formData.parameters.growth.tokenUsageGrowthRate}
                      placeholder="e.g., 15"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            growth: { ...formData.parameters.growth, tokenUsageGrowthRate: value }
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
                    maxLength={12}
                    value={formData.parameters.growth.newUsersPerMonth}
                    placeholder="e.g., 100"
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 12).replace(/[^0-9]/g, '');
                      setFormData({
                        ...formData,
                        parameters: {
                          ...formData.parameters,
                          growth: { ...formData.parameters.growth, newUsersPerMonth: value }
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
                      maxLength={12}
                      value={formData.parameters.growth.churnRate}
                      placeholder="e.g., 5"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            growth: { ...formData.parameters.growth, churnRate: value }
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
                      maxLength={12}
                      value={formData.parameters.revenueForecast.subscriptionRevenue}
                      placeholder="e.g., 1000"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            revenueForecast: { ...formData.parameters.revenueForecast, subscriptionRevenue: value }
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
                      maxLength={12}
                      value={formData.parameters.revenueForecast.revenueGrowthRate}
                      placeholder="e.g., 10"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            revenueForecast: { ...formData.parameters.revenueForecast, revenueGrowthRate: value }
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
                      maxLength={12}
                      value={formData.parameters.revenueForecast.averageRevenuePerUser}
                      placeholder="e.g., 50"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            revenueForecast: { ...formData.parameters.revenueForecast, averageRevenuePerUser: value }
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
                      maxLength={12}
                      value={formData.parameters.revenueForecast.tokenPriceMarkup}
                      placeholder="e.g., 20"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            revenueForecast: { ...formData.parameters.revenueForecast, tokenPriceMarkup: value }
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
                      maxLength={12}
                      value={formData.parameters.operationalExpenses.infrastructureCost}
                      placeholder="e.g., 1000"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            operationalExpenses: { ...formData.parameters.operationalExpenses, infrastructureCost: value }
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
                      maxLength={12}
                      value={formData.parameters.operationalExpenses.infrastructureGrowthRate}
                      placeholder="e.g., 5"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            operationalExpenses: { ...formData.parameters.operationalExpenses, infrastructureGrowthRate: value }
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
                      maxLength={12}
                      value={formData.parameters.operationalExpenses.laborCosts}
                      placeholder="e.g., 5000"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            operationalExpenses: { ...formData.parameters.operationalExpenses, laborCosts: value }
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
                      maxLength={12}
                      value={formData.parameters.operationalExpenses.costOptimizationFactor}
                      placeholder="e.g., 10"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            operationalExpenses: { ...formData.parameters.operationalExpenses, costOptimizationFactor: value }
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
                onClick={() => { setShowCreateModal(false); resetForm(); }}
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

      {/* Edit Simulation Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedSimulation(null);
          resetForm();
        }}
        title="Edit Simulation"
        size="3xl"
        closeOnBackdropClick={false}
      >
        <form onSubmit={handleUpdateSimulation} className="space-y-5">
          {/* Basic Information Section */}
          <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Simulation Name<span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-gray-400">{formData.name.length}/60</span>
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                  }}
                  maxLength={60}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 transition-colors text-sm ${formErrors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-red-500'}`}
                  placeholder="Enter simulation name"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Simulation Type<span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white text-sm"
                >
                  <option value="">Select Simulation Type</option>
                  {SIMULATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <span className="text-xs text-gray-400">{formData.description.length}/300</span>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                maxLength={300}
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
                  Start Date<span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.parameters.startDate}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    const newEndDate = formData.parameters.endDate && formData.parameters.endDate < newStartDate
                      ? newStartDate
                      : formData.parameters.endDate;
                    setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        startDate: newStartDate,
                        endDate: newEndDate
                      }
                    });
                  }}
                  min={getTodayDate()}
                  max={getMaxDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  End Date<span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.parameters.endDate}
                  onChange={(e) => setFormData({
                    ...formData,
                    parameters: { ...formData.parameters, endDate: e.target.value }
                  })}
                  min={formData.parameters.startDate || getTodayDate()}
                  max={getMaxDate()}
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
                      maxLength={12}
                      value={formData.parameters.growth.userGrowthRate}
                      placeholder="e.g., 10"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            growth: { ...formData.parameters.growth, userGrowthRate: value }
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
                      maxLength={12}
                      value={formData.parameters.growth.tokenUsageGrowthRate}
                      placeholder="e.g., 15"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            growth: { ...formData.parameters.growth, tokenUsageGrowthRate: value }
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
                    maxLength={12}
                    value={formData.parameters.growth.newUsersPerMonth}
                    placeholder="e.g., 100"
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 12).replace(/[^0-9]/g, '');
                      setFormData({
                        ...formData,
                        parameters: {
                          ...formData.parameters,
                          growth: { ...formData.parameters.growth, newUsersPerMonth: value }
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
                      maxLength={12}
                      value={formData.parameters.growth.churnRate}
                      placeholder="e.g., 5"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            growth: { ...formData.parameters.growth, churnRate: value }
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
                      maxLength={12}
                      value={formData.parameters.revenueForecast.subscriptionRevenue}
                      placeholder="e.g., 1000"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            revenueForecast: { ...formData.parameters.revenueForecast, subscriptionRevenue: value }
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
                      maxLength={12}
                      value={formData.parameters.revenueForecast.revenueGrowthRate}
                      placeholder="e.g., 10"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            revenueForecast: { ...formData.parameters.revenueForecast, revenueGrowthRate: value }
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
                      maxLength={12}
                      value={formData.parameters.revenueForecast.averageRevenuePerUser}
                      placeholder="e.g., 50"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            revenueForecast: { ...formData.parameters.revenueForecast, averageRevenuePerUser: value }
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
                      maxLength={12}
                      value={formData.parameters.revenueForecast.tokenPriceMarkup}
                      placeholder="e.g., 20"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            revenueForecast: { ...formData.parameters.revenueForecast, tokenPriceMarkup: value }
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
                      maxLength={12}
                      value={formData.parameters.operationalExpenses.infrastructureCost}
                      placeholder="e.g., 1000"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            operationalExpenses: { ...formData.parameters.operationalExpenses, infrastructureCost: value }
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
                      maxLength={12}
                      value={formData.parameters.operationalExpenses.infrastructureGrowthRate}
                      placeholder="e.g., 5"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            operationalExpenses: { ...formData.parameters.operationalExpenses, infrastructureGrowthRate: value }
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
                      maxLength={12}
                      value={formData.parameters.operationalExpenses.laborCosts}
                      placeholder="e.g., 5000"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            operationalExpenses: { ...formData.parameters.operationalExpenses, laborCosts: value }
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
                      maxLength={12}
                      value={formData.parameters.operationalExpenses.costOptimizationFactor}
                      placeholder="e.g., 10"
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12).replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            operationalExpenses: { ...formData.parameters.operationalExpenses, costOptimizationFactor: value }
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
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSimulation(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors font-medium shadow-sm text-sm order-1 sm:order-2"
              >
                Save Changes
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
          <div className="space-y-4 sm:space-y-5">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 sm:p-5 border border-gray-200 min-h-[80px] sm:min-h-[100px] overflow-hidden">
                <p className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2">Projected Revenue</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words overflow-hidden">
                  {formatCurrency(selectedSimulation.results.summary?.totalProjectedRevenue || 0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 sm:p-5 border border-gray-200 min-h-[80px] sm:min-h-[100px] overflow-hidden">
                <p className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2">Projected Costs</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words overflow-hidden">
                  {formatCurrency(selectedSimulation.results.summary?.totalProjectedCost || 0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 sm:p-5 border border-green-200 min-h-[80px] sm:min-h-[100px] overflow-hidden">
                <p className="text-xs sm:text-sm text-green-600 mb-1 sm:mb-2">Net Profit</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-700 break-words overflow-hidden">
                  {formatCurrency(selectedSimulation.results.summary?.totalProjectedProfit || 0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 sm:p-5 border border-blue-200 min-h-[80px] sm:min-h-[100px] overflow-hidden">
                <p className="text-xs sm:text-sm text-blue-600 mb-1 sm:mb-2">Profit Margin</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-700 break-words overflow-hidden">
                  {formatPercent(selectedSimulation.results.summary?.profitMargin || 0)}
                </p>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 min-h-[70px] sm:min-h-[80px] overflow-hidden">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Total Users (End)</p>
                <p className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 break-words">
                  {formatNumber(selectedSimulation.results.summary?.totalProjectedUsers || 0)}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 min-h-[70px] sm:min-h-[80px] overflow-hidden">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Break-Even Users</p>
                <p className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 break-words">
                  {formatNumber(selectedSimulation.results.summary?.breakEvenUsers || 0)}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 min-h-[70px] sm:min-h-[80px] overflow-hidden">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">ROI</p>
                <p className={`text-base sm:text-lg md:text-xl font-semibold break-words ${(selectedSimulation.results.summary?.roi || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(selectedSimulation.results.summary?.roi || 0)}
                </p>
              </div>
            </div>

            {/* Comparison */}
            {selectedSimulation.results.comparison && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
                <h4 className="font-medium text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Change vs Baseline</h4>
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="text-center bg-gray-50 rounded-lg p-3 sm:p-4 overflow-hidden">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Cost Change</p>
                    <p className={`text-base sm:text-lg font-semibold break-words ${selectedSimulation.results.comparison.costChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatPercent(selectedSimulation.results.comparison.costChange)}
                    </p>
                  </div>
                  <div className="text-center bg-gray-50 rounded-lg p-3 sm:p-4 overflow-hidden">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Revenue Change</p>
                    <p className={`text-base sm:text-lg font-semibold break-words ${selectedSimulation.results.comparison.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(selectedSimulation.results.comparison.revenueChange)}
                    </p>
                  </div>
                  <div className="text-center bg-gray-50 rounded-lg p-3 sm:p-4 overflow-hidden">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">User Growth</p>
                    <p className="text-base sm:text-lg font-semibold text-blue-600 break-words">
                      {formatPercent(selectedSimulation.results.comparison.userGrowthAchieved)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Projections Table */}
            {selectedSimulation.results.monthlyProjections && selectedSimulation.results.monthlyProjections.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Monthly Projections</h4>
                <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                  <div className="min-w-[600px] sm:min-w-[700px]">
                    <table className="w-full divide-y divide-gray-200 text-xs sm:text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Month</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Users</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Tokens</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Revenue</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Cost</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedSimulation.results.monthlyProjections.map((month, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-4 py-3 whitespace-nowrap font-medium">{month.month}/{month.year}</td>
                            <td className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">{month.users?.total?.toLocaleString() || '-'}</td>
                            <td className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">{month.tokens?.total?.toLocaleString() || '-'}</td>
                            <td className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">{formatCurrency(month.revenue?.total || 0)}</td>
                            <td className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">{formatCurrency(month.costs?.totalCost || 0)}</td>
                            <td className={`px-3 sm:px-4 py-3 text-right whitespace-nowrap font-semibold ${month.profit?.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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

            {/* Forecast Charts */}
            {selectedSimulation.results?.monthlyProjections && selectedSimulation.results.monthlyProjections.length > 0 && (
              <div className="pt-4 sm:pt-5 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Forecast Charts</h4>
                <div className="overflow-hidden">
                  <ForecastCharts data={selectedSimulation.results} type="simulation" />
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-4 sm:pt-5 border-t border-gray-200">
              <button
                onClick={() => setShowResultsModal(false)}
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedSimulation(null); }}
        title="Delete Simulation"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-medium text-red-800">This action cannot be undone</h4>
                <p className="text-sm text-red-700 mt-1">
                  Are you sure you want to delete <span className="font-semibold">{selectedSimulation?.name}</span>? This will permanently remove the simulation and all associated data.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setShowDeleteModal(false); setSelectedSimulation(null); }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteSimulation}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Simulation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default SimulationsPage;
