/**
 * Webhooks Page
 *
 * Manage webhook configurations for event notifications.
 * FR-46 & FR-47: Webhook Configuration & Event Triggers
 */

import { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import Loader from '../../components/common/Loader.jsx';
import webhookApi from '../../services/api/webhook.api.js';
import usePermissions from '../../hooks/usePermissions.js';

const WEBHOOK_EVENTS = [
  { value: 'provider.created', label: 'Provider Created', category: 'Providers' },
  { value: 'provider.updated', label: 'Provider Updated', category: 'Providers' },
  { value: 'provider.deleted', label: 'Provider Deleted', category: 'Providers' },
  { value: 'model.created', label: 'Model Created', category: 'Models' },
  { value: 'model.updated', label: 'Model Updated', category: 'Models' },
  { value: 'model.deleted', label: 'Model Deleted', category: 'Models' },
  { value: 'feature.created', label: 'Feature Created', category: 'Features' },
  { value: 'feature.updated', label: 'Feature Updated', category: 'Features' },
  { value: 'feature.deleted', label: 'Feature Deleted', category: 'Features' },
  { value: 'plan.created', label: 'Plan Created', category: 'Plans' },
  { value: 'plan.updated', label: 'Plan Updated', category: 'Plans' },
  { value: 'plan.deleted', label: 'Plan Deleted', category: 'Plans' },
  { value: 'project.created', label: 'Project Created', category: 'Projects' },
  { value: 'project.updated', label: 'Project Updated', category: 'Projects' },
  { value: 'project.deleted', label: 'Project Deleted', category: 'Projects' },
  { value: 'integration.connected', label: 'Integration Connected', category: 'Integrations' },
  { value: 'integration.disconnected', label: 'Integration Disconnected', category: 'Integrations' }
];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  failing: 'bg-red-100 text-red-700'
};

function WebhooksPage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { canManageWebhooks } = usePermissions();
  const [webhooks, setWebhooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [newSecret, setNewSecret] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    events: [],
    secret: '',
    active: true,
    headers: {},
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2
    },
    timeout: 30000
  });

  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');

  useEffect(() => {
    if (currentOrganization) {
      fetchWebhooks();
    }
  }, [currentOrganization]);

  const fetchWebhooks = async () => {
    setIsLoading(true);
    try {
      const response = await webhookApi.getForOrganization();
      setWebhooks(response.data || []);
    } catch (err) {
      console.error('Failed to fetch webhooks:', err);
      setError(err.response?.data?.error?.message || 'Failed to load webhooks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await webhookApi.create({
        organizationId: currentOrganization._id,
        ...formData
      });
      setWebhooks(prev => [response.data.webhook, ...prev]);
      setNewSecret(response.data.secret);
      setShowCreateModal(false);
      resetForm();
      setSuccess('Webhook created successfully. Save the secret now - it won\'t be shown again!');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create webhook');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await webhookApi.update(selectedWebhook._id, formData);
      setWebhooks(prev => prev.map(w => w._id === selectedWebhook._id ? response.data : w));
      setShowEditModal(false);
      setSelectedWebhook(null);
      resetForm();
      setSuccess('Webhook updated successfully');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update webhook');
    }
  };

  const handleDelete = async (webhook) => {
    if (!confirm(`Are you sure you want to delete "${webhook.name}"?`)) return;

    try {
      await webhookApi.delete(webhook._id);
      setWebhooks(prev => prev.filter(w => w._id !== webhook._id));
      setSuccess('Webhook deleted successfully');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete webhook');
    }
  };

  const handleTest = async (webhook) => {
    setSelectedWebhook(webhook);
    setTestResult(null);
    setShowTestModal(true);

    try {
      const response = await webhookApi.test(webhook._id);
      setTestResult(response.data);
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.error?.message || 'Test failed'
      });
    }
  };

  const handleToggleStatus = async (webhook) => {
    const newStatus = webhook.status === 'active' ? 'inactive' : 'active';

    try {
      const response = await webhookApi.toggleStatus(webhook._id, newStatus);
      setWebhooks(prev => prev.map(w => w._id === webhook._id ? response.data : w));
      setSuccess(`Webhook ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to toggle status');
    }
  };

  const handleRegenerateSecret = async (webhook) => {
    if (!confirm('Regenerate secret? All current deliveries will fail until the new secret is configured.')) return;

    try {
      const response = await webhookApi.regenerateSecret(webhook._id);
      setNewSecret(response.data.secret);
      setSuccess('Secret regenerated successfully. Save it now - it won\'t be shown again!');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to regenerate secret');
    }
  };

  const handleViewHistory = async (webhook) => {
    setSelectedWebhook(webhook);
    setDeliveryHistory([]);
    setShowHistoryModal(true);

    try {
      const response = await webhookApi.getDeliveryHistory(webhook._id);
      setDeliveryHistory(response.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load delivery history');
    }
  };

  const handleEventToggle = (event) => {
    setFormData(prev => {
      const events = prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event];
      return { ...prev, events };
    });
  };

  const handleAddHeader = () => {
    if (headerKey && headerValue) {
      setFormData(prev => ({
        ...prev,
        headers: { ...prev.headers, [headerKey]: headerValue }
      }));
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const handleRemoveHeader = (key) => {
    setFormData(prev => {
      const headers = { ...prev.headers };
      delete headers[key];
      return { ...prev, headers };
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      description: '',
      events: [],
      secret: '',
      active: true,
      headers: {},
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2
      },
      timeout: 30000
    });
    setHeaderKey('');
    setHeaderValue('');
  };

  const openEditModal = (webhook) => {
    setSelectedWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      description: webhook.description || '',
      events: webhook.events || [],
      secret: '',
      active: webhook.active,
      headers: webhook.headers || {},
      retryConfig: {
        maxRetries: webhook.retryConfig?.maxRetries || 3,
        retryDelay: webhook.retryConfig?.retryDelay || 1000,
        backoffMultiplier: webhook.retryConfig?.backoffMultiplier || 2
      },
      timeout: webhook.timeout || 30000
    });
    setShowEditModal(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventsByCategory = () => {
    const grouped = {};
    WEBHOOK_EVENTS.forEach(event => {
      if (!grouped[event.category]) {
        grouped[event.category] = [];
      }
      grouped[event.category].push(event);
    });
    return grouped;
  };

  if (orgLoading) {
    return <Loader />;
  }

  if (!currentOrganization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Organization Selected</h2>
          <p className="text-gray-500 mb-4">Please select an organization to manage webhooks.</p>
          <a href="/organizations" className="px-4 py-2 bg-[#DC2626] text-white rounded-lg">
            Go to Organizations
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-500">Configure webhook endpoints for event notifications</p>
        </div>
        {canManageWebhooks() && (
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Webhook</span>
          </button>
        )}
      </div>

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

      {/* New Secret Display */}
      {newSecret && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800">Save Your Webhook Secret</h3>
              <p className="text-sm text-yellow-700 mb-3">
                This secret is used to verify webhook signatures. Store it securely!
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-yellow-100 px-3 py-2 rounded-lg text-yellow-900 font-mono text-sm break-all">
                  {newSecret}
                </code>
                <button
                  onClick={() => copyToClipboard(newSecret)}
                  className="px-3 py-2 bg-yellow-200 text-yellow-800 rounded-lg hover:bg-yellow-300 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
                <button
                  onClick={() => setNewSecret(null)}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size="sm" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No webhooks configured</h3>
          <p className="text-gray-500 mb-4">Create a webhook to receive event notifications</p>
          {canManageWebhooks() && (
            <button
              onClick={() => { resetForm(); setShowCreateModal(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Webhook</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map(webhook => (
            <div key={webhook._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{webhook.name}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[webhook.status]}`}>
                        {webhook.status}
                      </span>
                      {!webhook.active && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{webhook.url}</p>
                    {webhook.description && (
                      <p className="text-sm text-gray-500 mb-3">{webhook.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {webhook.events?.slice(0, 5).map((event, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                          {event}
                        </span>
                      ))}
                      {webhook.events?.length > 5 && (
                        <span className="text-xs text-gray-500">+{webhook.events.length - 5} more</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Deliveries: {webhook.stats?.totalDeliveries || 0}</span>
                      <span>Success: {webhook.stats?.successfulDeliveries || 0}</span>
                      <span>Failed: {webhook.stats?.failedDeliveries || 0}</span>
                      <span>Last: {formatDate(webhook.stats?.lastDeliveryAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {canManageWebhooks() && (
                      <>
                        <button
                          onClick={() => handleTest(webhook)}
                          className="text-gray-500 hover:text-[#DC2626] p-2 rounded-lg hover:bg-red-50"
                          title="Test webhook"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(webhook)}
                          className={`p-2 rounded-lg ${
                            webhook.active
                              ? 'text-green-500 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                          title={webhook.active ? 'Deactivate' : 'Activate'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEditModal(webhook)}
                          className="text-gray-500 hover:text-[#DC2626] p-2 rounded-lg hover:bg-red-50"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRegenerateSecret(webhook)}
                          className="text-gray-500 hover:text-orange-600 p-2 rounded-lg hover:bg-orange-50"
                          title="Regenerate secret"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(webhook)}
                          className="text-gray-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleViewHistory(webhook)}
                      className="text-gray-500 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50"
                      title="View history"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Webhook" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name<span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
              placeholder="Production Webhook"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL<span className="text-red-500">*</span></label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
              placeholder="https://your-server.com/webhook"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
              rows={2}
              placeholder="Webhook description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Events<span className="text-red-500">*</span></label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-3">
              {Object.entries(getEventsByCategory()).map(([category, events]) => (
                <div key={category}>
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">{category}</div>
                  <div className="space-y-1">
                    {events.map(event => (
                      <label key={event.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.events.includes(event.value)}
                          onChange={() => handleEventToggle(event.value)}
                          className="rounded border-gray-300 text-[#DC2626] "
                        />
                        <span className="text-sm text-gray-700">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Headers</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={headerKey}
                onChange={(e) => setHeaderKey(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
                placeholder="Header name"
              />
              <input
                type="text"
                value={headerValue}
                onChange={(e) => setHeaderValue(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
                placeholder="Header value"
              />
              <button
                type="button"
                onClick={handleAddHeader}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Add
              </button>
            </div>
            {Object.keys(formData.headers).length > 0 && (
              <div className="space-y-1">
                {Object.entries(formData.headers).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded">
                    <span className="text-sm font-medium text-gray-700">{key}:</span>
                    <span className="text-sm text-gray-500">{value}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveHeader(key)}
                      className="ml-auto text-gray-400 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Retries</label>
              <input
                type="number"
                value={formData.retryConfig.maxRetries}
                onChange={(e) => setFormData({
                  ...formData,
                  retryConfig: { ...formData.retryConfig, maxRetries: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
                min={0}
                max={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Retry Delay (ms)</label>
              <input
                type="number"
                value={formData.retryConfig.retryDelay}
                onChange={(e) => setFormData({
                  ...formData,
                  retryConfig: { ...formData.retryConfig, retryDelay: parseInt(e.target.value) || 1000 }
                })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
                min={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (ms)</label>
              <input
                type="number"
                value={formData.timeout}
                onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) || 30000 })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
                min={1000}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="rounded border-gray-300 text-[#DC2626] "
            />
            <label htmlFor="active" className="text-sm text-gray-700">Active</label>
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
              Create Webhook
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Webhook" size="lg">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">URL<span className="text-red-500">*</span></label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
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
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Events<span className="text-red-500">*</span></label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-3">
              {Object.entries(getEventsByCategory()).map(([category, events]) => (
                <div key={category}>
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">{category}</div>
                  <div className="space-y-1">
                    {events.map(event => (
                      <label key={event.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.events.includes(event.value)}
                          onChange={() => handleEventToggle(event.value)}
                          className="rounded border-gray-300 text-[#DC2626] "
                        />
                        <span className="text-sm text-gray-700">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editActive"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="rounded border-gray-300 text-[#DC2626] "
            />
            <label htmlFor="editActive" className="text-sm text-gray-700">Active</label>
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
      <Modal isOpen={showTestModal} onClose={() => setShowTestModal(false)} title="Test Webhook" size="md">
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
                    {testResult.success ? 'Test Successful' : 'Test Failed'}
                  </p>
                  <p className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {testResult.message}
                  </p>
                  {testResult.statusCode && (
                    <p className="text-sm text-gray-500 mt-1">Status Code: {testResult.statusCode}</p>
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

      {/* History Modal */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Delivery History" size="xl">
        <div className="space-y-4">
          {deliveryHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No delivery history available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {deliveryHistory.map((delivery, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(delivery.timestamp)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{delivery.event}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          delivery.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {delivery.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{delivery.responseTime || 'N/A'}ms</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{delivery.attempts || 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            onClick={() => setShowHistoryModal(false)}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default WebhooksPage;