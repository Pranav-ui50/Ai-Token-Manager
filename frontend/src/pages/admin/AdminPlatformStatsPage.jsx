/**
 * Admin Platform Statistics Management Page
 *
 * Allows Super Admin to manage landing page platform statistics.
 */

import { useState, useEffect } from 'react';
import Loader from '../../components/common/Loader.jsx';
import platformStatApi from '../../services/api/platformStat.api.js';
import { showToast } from '../../utils/toasts.jsx';

// Default stats that can be initialized
const DEFAULT_STATS_CONFIG = [
  { statKey: 'ai_models', statValue: '50+', statLabel: 'AI Models', description: 'Supported AI models', icon: '🤖' },
  { statKey: 'api_requests', statValue: '10M+', statLabel: 'API Requests', description: 'Requests processed', icon: '📊' },
  { statKey: 'users', statValue: '5000+', statLabel: 'Active Users', description: 'Platform users', icon: '👥' },
  { statKey: 'uptime', statValue: '99.9%', statLabel: 'Uptime', description: 'Service uptime', icon: '⚡' }
];

function AdminPlatformStatsPage() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    statValue: '',
    statLabel: '',
    description: '',
    icon: '',
    isActive: true
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await platformStatApi.getAll();
      setStats(response.data || []);
    } catch (err) {
      console.error('Failed to fetch platform stats:', err);
      showToast.error('Failed to load platform statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (stat) => {
    setEditingId(stat._id);
    setFormData({
      statValue: stat.statValue || '',
      statLabel: stat.statLabel || '',
      description: stat.description || '',
      icon: stat.icon || '',
      isActive: stat.isActive ?? true
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      statValue: '',
      statLabel: '',
      description: '',
      icon: '',
      isActive: true
    });
  };

  const handleSave = async (id) => {
    if (!formData.statValue || !formData.statLabel) {
      showToast.error('Stat value and label are required');
      return;
    }

    try {
      setSaving(id);
      await platformStatApi.update(id, formData);
      showToast.success('Platform stat updated successfully');
      setEditingId(null);
      fetchStats();
    } catch (err) {
      console.error('Failed to save platform stat:', err);
      showToast.error(err.response?.data?.message || 'Failed to save platform stat');
    } finally {
      setSaving(null);
    }
  };

  const handleToggle = async (id) => {
    try {
      const stat = stats.find(s => s._id === id);
      if (!stat) return;

      await platformStatApi.update(id, { isActive: !stat.isActive });
      showToast.success(`Stat ${stat.isActive ? 'deactivated' : 'activated'}`);
      fetchStats();
    } catch (err) {
      console.error('Failed to toggle stat:', err);
      showToast.error('Failed to update status');
    }
  };

  const handleReorder = async (dragIndex, hoverIndex) => {
    const newOrder = [...stats];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, removed);

    setStats(newOrder);

    try {
      await platformStatApi.reorder(newOrder.map(s => s._id));
      showToast.success('Order updated');
    } catch (err) {
      console.error('Failed to reorder:', err);
      showToast.error('Failed to save order');
      fetchStats();
    }
  };

  const moveUp = async (index) => {
    if (index === 0) return;
    const newOrder = [...stats];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setStats(newOrder);
    try {
      await platformStatApi.reorder(newOrder.map(s => s._id));
      showToast.success('Order updated');
    } catch (err) {
      showToast.error('Failed to update order');
      fetchStats();
    }
  };

  const moveDown = async (index) => {
    if (index === stats.length - 1) return;
    const newOrder = [...stats];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setStats(newOrder);
    try {
      await platformStatApi.reorder(newOrder.map(s => s._id));
      showToast.success('Order updated');
    } catch (err) {
      showToast.error('Failed to update order');
      fetchStats();
    }
  };

  const handleInitializeDefaults = async () => {
    if (!window.confirm('This will initialize default platform statistics. Continue?')) {
      return;
    }

    try {
      await platformStatApi.initializeDefaults();
      showToast.success('Default stats initialized');
      fetchStats();
    } catch (err) {
      console.error('Failed to initialize defaults:', err);
      showToast.error('Failed to initialize defaults');
    }
  };

  // Common emoji icons for quick selection
  const commonIcons = ['🤖', '📊', '👥', '⚡', '🚀', '💡', '🎯', '📈', '💰', '🌍', '🏆', '✨'];

  if (loading) {
    return <Loader fullPage text="Loading platform statistics..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Statistics</h1>
          <p className="text-sm text-gray-500">Manage landing page statistics</p>
        </div>
        {stats.length === 0 && (
          <button
            onClick={handleInitializeDefaults}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Initialize Defaults
          </button>
        )}
      </div>

      {/* Stats Grid */}
      {stats.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No platform statistics configured</h3>
          <p className="text-gray-500 mb-4">
            Initialize default statistics or add custom ones through the database.
          </p>
          <button
            onClick={handleInitializeDefaults}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Initialize Defaults
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {stats.map((stat, index) => (
            <div
              key={stat._id}
              className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all ${
                !stat.isActive ? 'opacity-60' : ''
              }`}
            >
              {editingId === stat._id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stat Value <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.statValue}
                        onChange={(e) => setFormData({ ...formData, statValue: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#DC2626]"
                        placeholder="e.g., 50+"
                        maxLength={50}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Label <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.statLabel}
                        onChange={(e) => setFormData({ ...formData, statLabel: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#DC2626]"
                        placeholder="e.g., AI Models"
                        maxLength={100}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#DC2626]"
                      placeholder="e.g., Supported AI models"
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {commonIcons.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon })}
                          className={`p-2 text-xl rounded-lg border transition-colors ${
                            formData.icon === icon
                              ? 'border-[#DC2626] bg-red-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#DC2626]"
                      placeholder="Or enter custom emoji..."
                      maxLength={10}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`active-${stat._id}`}
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-200 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <label htmlFor={`active-${stat._id}`} className="text-sm text-gray-700">
                      Active (visible on landing page)
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(stat._id)}
                      disabled={saving}
                      className="px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                    {stat.icon || '📊'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{stat.statLabel}</h3>
                        <p className="text-2xl font-bold text-[#DC2626]">{stat.statValue}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          stat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {stat.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-gray-400">Order: {stat.displayOrder}</span>
                      </div>
                    </div>
                    {stat.description && (
                      <p className="text-sm text-gray-500 mt-1">{stat.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Key: {stat.statKey}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move Up"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={index === stats.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move Down"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(stat)}
                        className="p-1 text-gray-400 hover:text-[#DC2626]"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggle(stat._id)}
                        className={`p-1 ${stat.isActive ? 'text-gray-400 hover:text-yellow-600' : 'text-gray-400 hover:text-green-600'}`}
                        title={stat.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {stat.isActive ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-3v.01M19 12a7 7 0 11-14 0 7 7 0 0114 0z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a7 7 0 11-14 0 7 7 0 0114 0z" />
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview Card */}
      {stats.filter(s => s.isActive).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Preview (Landing Page)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.filter(s => s.isActive).map((stat) => (
              <div key={stat._id} className="text-center">
                <div className="text-3xl mb-2">{stat.icon || '📊'}</div>
                <div className="text-2xl font-bold text-[#DC2626]">{stat.statValue}</div>
                <div className="text-sm text-gray-600">{stat.statLabel}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPlatformStatsPage;
