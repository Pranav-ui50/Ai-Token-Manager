/**
 * Scenario Comparison Page
 *
 * Compare multiple simulation scenarios side by side.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import simulationApi from '../../services/api/simulation.api.js';
import { useAuth } from '../../hooks/useAuth.js';
import Loader from '../../components/common/Loader.jsx';

const ScenarioComparisonPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [simulations, setSimulations] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comparisonData, setComparisonData] = useState(null);
  const [activeView, setActiveView] = useState('table'); // 'table' | 'chart'

  // Get organization ID from user
  const orgId = user?.organization?._id || user?.organization;

  // Get pre-selected IDs from URL params
  useEffect(() => {
    const ids = searchParams.get('ids');
    if (ids) {
      setSelectedIds(ids.split(','));
    }
  }, [searchParams]);

  // Fetch all completed simulations
  useEffect(() => {
    const fetchSimulations = async () => {
      if (!orgId) return;

      try {
        setLoading(true);
        const response = await simulationApi.getForOrganization(orgId);
        const simulationsArray = Array.isArray(response)
          ? response
          : (response?.simulations || response?.data || []);
        // Filter to only completed simulations
        setSimulations(simulationsArray.filter(s => s.status === 'completed'));
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load simulations');
      } finally {
        setLoading(false);
      }
    };
    fetchSimulations();
  }, [orgId]);

  // Compare selected simulations
  useEffect(() => {
    const compareSimulations = async () => {
      if (selectedIds.length < 2) {
        setComparisonData(null);
        return;
      }

      try {
        setLoading(true);
        const results = await Promise.all(
          selectedIds.map(id => simulationApi.getById(id))
        );
        setComparisonData(results);
      } catch (err) {
        setError('Failed to compare simulations');
      } finally {
        setLoading(false);
      }
    };

    compareSimulations();
  }, [selectedIds]);

  // Toggle simulation selection
  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 4) {
        setError('Maximum 4 scenarios can be compared at once');
        return prev;
      }
      return [...prev, id];
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage
  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${(value || 0).toFixed(1)}%`;
  };

  // Get color for scenario
  const getScenarioColor = (index) => {
    const colors = [
      { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', chart: '#3B82F6' },
      { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', chart: '#10B981' },
      { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', chart: '#8B5CF6' },
      { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', chart: '#F97316' }
    ];
    return colors[index % colors.length];
  };

  // Calculate percentage difference from baseline
  const calculateDiff = (value, baseline) => {
    if (!baseline || baseline === 0) return 0;
    return ((value - baseline) / baseline) * 100;
  };

  // Find best value
  const findBest = (field, higherIsBetter = true) => {
    if (!comparisonData || comparisonData.length === 0) return null;
    const values = comparisonData.map(s => ({
      id: s._id,
      value: s.results?.summary?.[field] || 0
    }));
    if (higherIsBetter) {
      return values.reduce((best, curr) => curr.value > best.value ? curr : best);
    }
    return values.reduce((best, curr) => curr.value < best.value ? curr : best);
  };

  if (loading && !comparisonData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader text="Loading simulations..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/simulations')}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Scenario Comparison</h1>
                <p className="text-sm text-gray-500">Compare up to 4 simulation scenarios</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Simulation Selection */}
        <div className="bg-white rounded-xl shadow-soft p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Scenarios to Compare</h2>
          {simulations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No completed simulations available for comparison.</p>
              <button
                onClick={() => navigate('/simulations')}
                className="mt-4 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]"
              >
                Create Simulations
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {simulations.map((sim) => {
                const isSelected = selectedIds.includes(sim._id);
                const selectedIndex = selectedIds.indexOf(sim._id);
                const color = isSelected ? getScenarioColor(selectedIndex) : null;

                return (
                  <button
                    key={sim._id}
                    onClick={() => toggleSelection(sim._id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? `${color.bg} ${color.border}`
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${isSelected ? color.text : 'text-gray-900'}`}>
                        {sim.name}
                      </span>
                      {isSelected && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                          #{selectedIndex + 1}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-2 line-clamp-1">{sim.description || 'No description'}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{sim.type}</span>
                      <span>{(sim.results?.summary?.profitMargin || 0).toFixed(1)}% margin</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Comparison Results */}
        {comparisonData && comparisonData.length >= 2 && (
          <>
            {/* View Toggle */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Comparison Results</h2>
              <div className="flex items-center gap-2 bg-white rounded-lg p-1">
                <button
                  onClick={() => setActiveView('table')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'table'
                      ? 'bg-[#DC2626] text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Table View
                </button>
                <button
                  onClick={() => setActiveView('chart')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'chart'
                      ? 'bg-[#DC2626] text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Chart View
                </button>
              </div>
            </div>

            {/* Key Metrics Summary */}
            <div className="bg-white rounded-xl shadow-soft p-6 mb-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">Key Metrics Comparison</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Metric
                      </th>
                      {comparisonData.map((sim, idx) => {
                        const color = getScenarioColor(idx);
                        return (
                          <th key={sim._id} className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${color.text}`}>
                            {sim.name}
                          </th>
                        );
                      })}
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Best
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Total Revenue */}
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Total Revenue</td>
                      {comparisonData.map((sim, idx) => {
                        const color = getScenarioColor(idx);
                        const best = findBest('totalProjectedRevenue', true);
                        const isBest = best?.id === sim._id;
                        return (
                          <td key={sim._id} className={`px-4 py-3 text-right text-sm ${isBest ? 'font-bold text-green-600' : 'text-gray-900'}`}>
                            {formatCurrency(sim.results?.summary?.totalProjectedRevenue || 0)}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                        {formatCurrency(findBest('totalProjectedRevenue', true)?.value || 0)}
                      </td>
                    </tr>

                    {/* Total Costs */}
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Total Costs</td>
                      {comparisonData.map((sim, idx) => {
                        const best = findBest('totalProjectedCost', false);
                        const isBest = best?.id === sim._id;
                        return (
                          <td key={sim._id} className={`px-4 py-3 text-right text-sm ${isBest ? 'font-bold text-green-600' : 'text-gray-900'}`}>
                            {formatCurrency(sim.results?.summary?.totalProjectedCost || 0)}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                        {formatCurrency(findBest('totalProjectedCost', false)?.value || 0)}
                      </td>
                    </tr>

                    {/* Net Profit */}
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Net Profit</td>
                      {comparisonData.map((sim, idx) => {
                        const color = getScenarioColor(idx);
                        const best = findBest('totalProjectedProfit', true);
                        const isBest = best?.id === sim._id;
                        const value = sim.results?.summary?.totalProjectedProfit || 0;
                        return (
                          <td key={sim._id} className={`px-4 py-3 text-right text-sm ${isBest ? 'font-bold text-green-600' : value >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                            {formatCurrency(value)}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                        {formatCurrency(findBest('totalProjectedProfit', true)?.value || 0)}
                      </td>
                    </tr>

                    {/* Profit Margin */}
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Profit Margin</td>
                      {comparisonData.map((sim, idx) => {
                        const best = findBest('profitMargin', true);
                        const isBest = best?.id === sim._id;
                        const value = sim.results?.summary?.profitMargin || 0;
                        return (
                          <td key={sim._id} className={`px-4 py-3 text-right text-sm ${isBest ? 'font-bold text-green-600' : value >= 50 ? 'text-green-600' : value >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {value.toFixed(1)}%
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                        {(findBest('profitMargin', true)?.value || 0).toFixed(1)}%
                      </td>
                    </tr>

                    {/* ROI */}
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">ROI</td>
                      {comparisonData.map((sim, idx) => {
                        const best = findBest('roi', true);
                        const isBest = best?.id === sim._id;
                        const value = sim.results?.summary?.roi || 0;
                        return (
                          <td key={sim._id} className={`px-4 py-3 text-right text-sm ${isBest ? 'font-bold text-green-600' : value >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                            {formatPercent(value)}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                        {formatPercent(findBest('roi', true)?.value || 0)}
                      </td>
                    </tr>

                    {/* Break-Even Users */}
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Break-Even Users</td>
                      {comparisonData.map((sim, idx) => {
                        const best = findBest('breakEvenUsers', false);
                        const isBest = best?.id === sim._id;
                        return (
                          <td key={sim._id} className={`px-4 py-3 text-right text-sm ${isBest ? 'font-bold text-green-600' : 'text-gray-900'}`}>
                            {(sim.results?.summary?.breakEvenUsers || 0).toLocaleString()}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                        {(findBest('breakEvenUsers', false)?.value || 0).toLocaleString()}
                      </td>
                    </tr>

                    {/* Total Users (End) */}
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Users (End of Period)</td>
                      {comparisonData.map((sim, idx) => {
                        const best = findBest('totalProjectedUsers', true);
                        const isBest = best?.id === sim._id;
                        return (
                          <td key={sim._id} className={`px-4 py-3 text-right text-sm ${isBest ? 'font-bold text-green-600' : 'text-gray-900'}`}>
                            {(sim.results?.summary?.totalProjectedUsers || 0).toLocaleString()}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                        {(findBest('totalProjectedUsers', true)?.value || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chart View */}
            {activeView === 'chart' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Revenue Over Time Chart */}
                <div className="bg-white rounded-xl shadow-soft p-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Revenue Over Time</h3>
                  <div className="h-64 relative">
                    {/* Simple bar chart representation */}
                    <div className="absolute inset-0 flex items-end justify-around gap-2 pb-8">
                      {comparisonData.map((sim, idx) => {
                        const color = getScenarioColor(idx);
                        const revenue = sim.results?.summary?.totalProjectedRevenue || 0;
                        const maxRevenue = Math.max(...comparisonData.map(s => s.results?.summary?.totalProjectedRevenue || 0));
                        const height = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;

                        return (
                          <div key={sim._id} className="flex flex-col items-center flex-1">
                            <div
                              className="w-full max-w-16 rounded-t-md transition-all"
                              style={{
                                height: `${height}%`,
                                backgroundColor: color.chart,
                                minHeight: '20px'
                              }}
                            />
                            <div className="mt-2 text-xs text-gray-500 text-center truncate w-full px-1">
                              {sim.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-400">
                      <span>{formatCurrency(Math.max(...comparisonData.map(s => s.results?.summary?.totalProjectedRevenue || 0)))}</span>
                      <span>{formatCurrency(Math.max(...comparisonData.map(s => s.results?.summary?.totalProjectedRevenue || 0)) / 2)}</span>
                      <span>$0</span>
                    </div>
                  </div>
                </div>

                {/* Profit Margin Chart */}
                <div className="bg-white rounded-xl shadow-soft p-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Profit Margin Comparison</h3>
                  <div className="h-64 relative">
                    {/* Horizontal bar chart */}
                    <div className="space-y-6 pt-4">
                      {comparisonData.map((sim, idx) => {
                        const color = getScenarioColor(idx);
                        const margin = sim.results?.summary?.profitMargin || 0;
                        const width = Math.min(Math.max(margin, -20), 100);
                        const absoluteWidth = Math.abs(width);

                        return (
                          <div key={sim._id} className="flex items-center gap-4">
                            <div className="w-24 text-sm text-gray-600 truncate">
                              {sim.name}
                            </div>
                            <div className="flex-1 relative h-6 bg-gray-100 rounded overflow-hidden">
                              <div
                                className={`absolute h-full rounded transition-all ${
                                  margin >= 50 ? 'bg-green-500' :
                                  margin >= 30 ? 'bg-green-400' :
                                  margin >= 0 ? 'bg-yellow-400' :
                                  'bg-red-500'
                                }`}
                                style={{
                                  width: `${absoluteWidth}%`,
                                  left: margin >= 0 ? '0' : `${50 - absoluteWidth / 2}%`
                                }}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                                {margin.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown Chart */}
                <div className="bg-white rounded-xl shadow-soft p-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Cost vs Revenue</h3>
                  <div className="h-64">
                    {comparisonData.map((sim, idx) => {
                      const color = getScenarioColor(idx);
                      const revenue = sim.results?.summary?.totalProjectedRevenue || 0;
                      const costs = sim.results?.summary?.totalProjectedCost || 0;
                      const profit = sim.results?.summary?.totalProjectedProfit || 0;
                      const total = revenue || 1;

                      return (
                        <div key={sim._id} className="mb-4">
                          <div className="text-sm text-gray-600 mb-1">{sim.name}</div>
                          <div className="flex h-6 rounded overflow-hidden bg-gray-100">
                            <div
                              className="bg-blue-500"
                              style={{ width: `${(costs / total) * 100}%` }}
                              title={`Costs: ${formatCurrency(costs)}`}
                            />
                            <div
                              className={profit >= 0 ? 'bg-green-500' : 'bg-red-500'}
                              style={{ width: `${(Math.abs(profit) / total) * 100}%` }}
                              title={`Profit: ${formatCurrency(profit)}`}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Costs: {formatCurrency(costs)}</span>
                            <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                              Profit: {formatCurrency(profit)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ROI Comparison */}
                <div className="bg-white rounded-xl shadow-soft p-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">ROI Comparison</h3>
                  <div className="h-64 flex items-center justify-center">
                    <div className="w-full max-w-md">
                      {comparisonData.map((sim, idx) => {
                        const color = getScenarioColor(idx);
                        const roi = sim.results?.summary?.roi || 0;
                        const maxROI = Math.max(...comparisonData.map(s => Math.abs(s.results?.summary?.roi || 0)));
                        const barWidth = maxROI > 0 ? (Math.abs(roi) / maxROI) * 100 : 0;

                        return (
                          <div key={sim._id} className="flex items-center gap-3 mb-4">
                            <div className="w-24 text-sm text-gray-600 truncate">
                              {sim.name}
                            </div>
                            <div className="flex-1 h-8 bg-gray-100 rounded overflow-hidden">
                              <div
                                className={`h-full transition-all ${roi >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <div className={`w-16 text-right text-sm font-medium ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(roi)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Projections Comparison (Table View) */}
            {activeView === 'table' && comparisonData[0]?.results?.monthlyProjections && (
              <div className="bg-white rounded-xl shadow-soft p-6 mb-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Monthly Projections Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                        {comparisonData.map((sim, idx) => {
                          const color = getScenarioColor(idx);
                          return (
                            <th key={sim._id} colSpan={3} className={`px-4 py-3 text-center text-xs font-medium uppercase ${color.text}`}>
                              {sim.name}
                            </th>
                          );
                        })}
                      </tr>
                      <tr>
                        <th className="px-4 py-2"></th>
                        {comparisonData.map((sim, idx) => (
                          <>
                            <th key={`${sim._id}-rev`} className="px-2 py-2 text-right text-xs font-medium text-gray-400">Revenue</th>
                            <th key={`${sim._id}-cost`} className="px-2 py-2 text-right text-xs font-medium text-gray-400">Cost</th>
                            <th key={`${sim._id}-profit`} className="px-2 py-2 text-right text-xs font-medium text-gray-400">Profit</th>
                          </>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {/* Get all unique months from all simulations */}
                      {(() => {
                        const months = comparisonData[0]?.results?.monthlyProjections || [];
                        return months.map((month, monthIdx) => (
                          <tr key={monthIdx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {month.month}/{month.year}
                            </td>
                            {comparisonData.map((sim) => {
                              const projection = sim.results?.monthlyProjections?.[monthIdx];
                              const revenue = projection?.revenue?.total || 0;
                              const cost = projection?.costs?.totalCost || 0;
                              const profit = projection?.profit?.net || 0;

                              return (
                                <>
                                  <td key={`${sim._id}-${monthIdx}-rev`} className="px-2 py-2 text-right text-sm text-gray-600">
                                    {formatCurrency(revenue)}
                                  </td>
                                  <td key={`${sim._id}-${monthIdx}-cost`} className="px-2 py-2 text-right text-sm text-gray-600">
                                    {formatCurrency(cost)}
                                  </td>
                                  <td key={`${sim._id}-${monthIdx}-profit`} className={`px-2 py-2 text-right text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(profit)}
                                  </td>
                                </>
                              );
                            })}
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Scenario Details */}
            <div className="bg-white rounded-xl shadow-soft p-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">Scenario Parameters</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th>
                      {comparisonData.map((sim, idx) => {
                        const color = getScenarioColor(idx);
                        return (
                          <th key={sim._id} className={`px-4 py-3 text-right text-xs font-medium uppercase ${color.text}`}>
                            {sim.name}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Type</td>
                      {comparisonData.map((sim) => (
                        <td key={sim._id} className="px-4 py-3 text-right text-sm text-gray-600 capitalize">
                          {sim.type}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Period</td>
                      {comparisonData.map((sim) => (
                        <td key={sim._id} className="px-4 py-3 text-right text-sm text-gray-600">
                          {new Date(sim.parameters?.startDate).toLocaleDateString()} - {new Date(sim.parameters?.endDate).toLocaleDateString()}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">User Growth Rate</td>
                      {comparisonData.map((sim) => (
                        <td key={sim._id} className="px-4 py-3 text-right text-sm text-gray-600">
                          {sim.parameters?.growth?.userGrowthRate || 0}%/mo
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Churn Rate</td>
                      {comparisonData.map((sim) => (
                        <td key={sim._id} className="px-4 py-3 text-right text-sm text-gray-600">
                          {sim.parameters?.growth?.churnRate || 0}%/mo
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Token Growth Rate</td>
                      {comparisonData.map((sim) => (
                        <td key={sim._id} className="px-4 py-3 text-right text-sm text-gray-600">
                          {sim.parameters?.growth?.tokenUsageGrowthRate || 0}%/mo
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Selection Prompt */}
        {selectedIds.length < 2 && (
          <div className="bg-white rounded-xl shadow-soft p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Scenarios to Compare</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Select at least 2 completed simulations above to see a detailed comparison of metrics, projections, and outcomes.
            </p>
            {selectedIds.length === 1 && (
              <p className="text-sm text-blue-600 mt-4">
                {selectedIds.length} scenario selected. Select {2 - selectedIds.length} more to compare.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ScenarioComparisonPage;