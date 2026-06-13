/**
 * Integrations Page
 *
 * Manage third-party integrations.
 * FR-45: API Integrations
 */

import { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import Loader from '../../components/common/Loader.jsx';
import integrationApi from '../../services/api/integration.api.js';
import usePermissions from '../../hooks/usePermissions.js';
import { showToast } from '../../utils/toasts.js';

const INTEGRATION_TYPES = [
  { value: 'openai', label: 'OpenAI', icon: '🤖' },
  { value: 'anthropic', label: 'Anthropic', icon: '🧠' },
  { value: 'stripe', label: 'Stripe', icon: '💳' },
  { value: 'razorpay', label: 'Razorpay', icon: '💰' },
  { value: 'slack', label: 'Slack', icon: '💬' },
  { value: 'discord', label: 'Discord', icon: '🎮' },
  { value: 'webhook', label: 'Custom Webhook', icon: '🔗' },
  { value: 'custom', label: 'Custom Integration', icon: '⚙️' }
];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  error: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700'
};

function IntegrationsPage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { canManageIntegrations, canViewIntegrations } = usePermissions();
  const [integrations, setIntegrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [filters, setFilters] = useState({ status: '', type: '' });

  const [formData, setFormData] = useState({
    name: '',
    type: 'openai',
    description: '',
    config: {
      endpoint: '',
      authType: 'api_key',
      timeout: 30000
    },
    credentials: {
      apiKey: '',
      apiSecret: ''
    },
    sync: {
      enabled: false,
      interval: 3600000
    }
  });

  // Get organization ID for API calls
  const orgId = currentOrganization?._id || currentOrganization || null;
  const showNoOrgState = !orgId;

  useEffect(() => {
    fetchIntegrations();
  }, [orgId, filters]);

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      // If no organization, show empty state
      if (!orgId) {
        setIntegrations([]);
        setIsLoading(false);
        return;
      }

      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;

      const response = await integrationApi.getForOrganization(params);
      setIntegrations(response.data || []);
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
      showToast.error(err.response?.data?.error?.message || 'Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!orgId) {
      showToast.error('Organization required to create integrations');
      return;
    }

    try {
      const response = await integrationApi.create({
        organizationId: orgId,
        ...formData
      });
      setIntegrations(prev => [response.data, ...prev]);
      setShowCreateModal(false);
      resetForm();
      showToast.integrationCreated();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to create integration');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const response = await integrationApi.update(selectedIntegration._id, formData);
      setIntegrations(prev => prev.map(i => i._id === selectedIntegration._id ? response.data : i));
      setShowEditModal(false);
      setSelectedIntegration(null);
      resetForm();
      showToast.integrationUpdated();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to update integration');
    }
  };

  const handleDelete = async (integration) => {
    if (!confirm(`Are you sure you want to delete "${integration.name}"?`)) return;

    try {
      await integrationApi.delete(integration._id);
      setIntegrations(prev => prev.filter(i => i._id !== integration._id));
      showToast.integrationDeleted();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to delete integration');
    }
  };

  const handleTest = async (integration) => {
    setSelectedIntegration(integration);
    setTestResult(null);
    setShowTestModal(true);

    try {
      const response = await integrationApi.testConnection(integration._id);
      setTestResult(response.data);
      showToast.success('Connection test successful');
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.error?.message || 'Connection test failed'
      });
      showToast.error(err.response?.data?.error?.message || 'Connection test failed');
    }
  };

  const handleToggleStatus = async (integration) => {
    const newStatus = integration.status === 'active' ? 'inactive' : 'active';

    try {
      const response = await integrationApi.toggleStatus(integration._id, newStatus);
      setIntegrations(prev => prev.map(i => i._id === integration._id ? response.data : i));
      showToast.integrationToggled(newStatus);
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to toggle status');
    }
  };

  const handleSync = async (integration) => {
    try {
      const response = await integrationApi.sync(integration._id);
      showToast.integrationSynced();
      fetchIntegrations();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to sync integration');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'openai',
      description: '',
      config: {
        endpoint: '',
        authType: 'api_key',
        timeout: 30000
      },
      credentials: {
        apiKey: '',
        apiSecret: ''
      },
      sync: {
        enabled: false,
        interval: 3600000
      }
    });
  };

  const openEditModal = (integration) => {
    setSelectedIntegration(integration);
    setFormData({
      name: integration.name,
      type: integration.type,
      description: integration.description || '',
      config: {
        endpoint: integration.config?.endpoint || '',
        authType: integration.config?.authType || 'api_key',
        timeout: integration.config?.timeout || 30000
      },
      credentials: {
        apiKey: '',
        apiSecret: ''
      },
      sync: {
        enabled: integration.sync?.enabled || false,
        interval: integration.sync?.interval || 3600000
      }
    });
    setShowEditModal(true);
  };

  const getTypeInfo = (type) => {
    return INTEGRATION_TYPES.find(t => t.value === type) || { label: type, icon: '🔗' };
  };

  if (orgLoading) {
    return (
      <Loader />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-sm text-gray-500">Manage third-party integrations and API connections</p>
        </div>
        {canManageIntegrations() && !showNoOrgState && (
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Integration</span>
          </button>
        )}
      </div>

      {/* No Organization State */}
      {showNoOrgState && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium text-blue-900">No Organization</h3>
              <p className="text-sm text-blue-700">
                You need to be part of an organization to manage integrations. Contact your administrator or create an organization to get started.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
            <option value="pending">Pending</option>
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
          >
            <option value="">All Types</option>
            {INTEGRATION_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Integrations List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size="sm" />
        </div>
      ) : integrations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No integrations yet</h3>
          <p className="text-gray-500 mb-4">
            {showNoOrgState
              ? 'Join an organization to start managing integrations'
              : 'Connect third-party services to enhance your workflow'}
          </p>
          {canManageIntegrations() && !showNoOrgState && (
            <button
              onClick={() => { resetForm(); setShowCreateModal(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Integration</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map(integration => {
            const typeInfo = getTypeInfo(integration.type);
            return (
              <div key={integration._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{typeInfo.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                        <p className="text-sm text-gray-500">{typeInfo.label}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[integration.status]}`}>
                      {integration.status}
                    </span>
                  </div>

                  {integration.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{integration.description}</p>
                  )}

                  {integration.sync?.enabled && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Auto-sync enabled</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTest(integration)}
                        className="text-gray-500 hover:text-[#DC2626] p-2 rounded-lg hover:bg-red-50"
                        title="Test connection"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      {integration.sync?.enabled && (
                        <button
                          onClick={() => handleSync(integration)}
                          className="text-gray-500 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50"
                          title="Sync now"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleStatus(integration)}
                        className={`p-2 rounded-lg ${
                          integration.status === 'active'
                            ? 'text-green-500 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                        title={integration.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(integration)}
                        className="text-gray-500 hover:text-[#DC2626] p-2 rounded-lg hover:bg-red-50"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(integration)}
                        className="text-gray-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add Integration" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name<span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
              placeholder="My Integration"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type<span className="text-red-500">*</span></label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
            >
              {INTEGRATION_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
              rows={3}
              placeholder="Integration description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={formData.credentials.apiKey}
              onChange={(e) => setFormData({ ...formData, credentials: { ...formData.credentials, apiKey: e.target.value } })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
              placeholder="Enter API key"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="syncEnabled"
              checked={formData.sync.enabled}
              onChange={(e) => setFormData({ ...formData, sync: { ...formData.sync, enabled: e.target.checked } })}
              className="rounded border-gray-300"
            />
            <label htmlFor="syncEnabled" className="text-sm text-gray-700">Enable automatic sync</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]"
            >
              Create Integration
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Integration" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name<span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New API Key (leave empty to keep current)</label>
            <input
              type="password"
              value={formData.credentials.apiKey}
              onChange={(e) => setFormData({ ...formData, credentials: { ...formData.credentials, apiKey: e.target.value } })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
              placeholder="Enter new API key to update"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editSyncEnabled"
              checked={formData.sync.enabled}
              onChange={(e) => setFormData({ ...formData, sync: { ...formData.sync, enabled: e.target.checked } })}
              className="rounded border-gray-300"
            />
            <label htmlFor="editSyncEnabled" className="text-sm text-gray-700">Enable automatic sync</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Test Modal */}
      <Modal isOpen={showTestModal} onClose={() => setShowTestModal(false)} title="Test Connection" size="md">
        <div className="space-y-4">
          {testResult === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader size="sm" />
            </div>
          ) : (
            <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-3">
                {testResult.success ? (
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <div>
                  <p className={`font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                  </p>
                  <p className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {testResult.message}
                  </p>
                  {testResult.latency && (
                    <p className="text-sm text-gray-500 mt-1">Latency: {testResult.latency}ms</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowTestModal(false)}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default IntegrationsPage;