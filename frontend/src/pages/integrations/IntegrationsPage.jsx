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

// Character limits for form fields
const NAME_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 300;
const API_KEY_MAX_LENGTH = 300;
const WEBHOOK_URL_MAX_LENGTH = 500;
const MAX_RETRIES_MAX = 12;
const RETRY_DELAY_MAX = 999999999999;
const TIMEOUT_MAX = 999999999999;

// Form validation errors
const useFormErrors = () => {
  const [errors, setErrors] = useState({});

  const validateField = (field, value) => {
    const newErrors = { ...errors };

    if (field === 'name') {
      if (!value || value.trim() === '') {
        newErrors.name = 'Name is required';
      } else if (!/^[a-zA-Z\s]*$/.test(value)) {
        newErrors.name = 'Name can only contain letters and spaces';
      } else if (value.length > NAME_MAX_LENGTH) {
        newErrors.name = `Name must be less than ${NAME_MAX_LENGTH} characters`;
      } else {
        delete newErrors.name;
      }
    }

    if (field === 'type') {
      if (!value || value.trim() === '') {
        newErrors.type = 'Type is required';
      } else {
        delete newErrors.type;
      }
    }

    if (field === 'apiKey') {
      if (!value || value.trim() === '') {
        newErrors.apiKey = 'API Key is required';
      } else if (value.length > API_KEY_MAX_LENGTH) {
        newErrors.apiKey = `API Key must be less than ${API_KEY_MAX_LENGTH} characters`;
      } else {
        delete newErrors.apiKey;
      }
    }

    if (field === 'webhookUrl') {
      if (!value || value.trim() === '') {
        newErrors.webhookUrl = 'Webhook URL is required';
      } else if (value.length > WEBHOOK_URL_MAX_LENGTH) {
        newErrors.webhookUrl = `Webhook URL must be less than ${WEBHOOK_URL_MAX_LENGTH} characters`;
      } else {
        delete newErrors.webhookUrl;
      }
    }

    if (field === 'maxRetries') {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < 0) {
        newErrors.maxRetries = 'Max Retries must be 0 or greater';
      } else if (numValue > MAX_RETRIES_MAX) {
        newErrors.maxRetries = `Max Retries must be ${MAX_RETRIES_MAX} or less`;
      } else {
        delete newErrors.maxRetries;
      }
    }

    if (field === 'retryDelay') {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < 0) {
        newErrors.retryDelay = 'Retry Delay must be 0 or greater';
      } else if (numValue > RETRY_DELAY_MAX) {
        newErrors.retryDelay = 'Retry Delay is too large';
      } else {
        delete newErrors.retryDelay;
      }
    }

    if (field === 'timeout') {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < 0) {
        newErrors.timeout = 'Timeout must be 0 or greater';
      } else if (numValue > TIMEOUT_MAX) {
        newErrors.timeout = 'Timeout is too large';
      } else {
        delete newErrors.timeout;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (formData, isEdit = false) => {
    const newErrors = {};

    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Name is required';
    } else if (!/^[a-zA-Z\s]*$/.test(formData.name)) {
      newErrors.name = 'Name can only contain letters and spaces';
    } else if (formData.name.length > NAME_MAX_LENGTH) {
      newErrors.name = `Name must be less than ${NAME_MAX_LENGTH} characters`;
    }

    if (!formData.type || formData.type.trim() === '') {
      newErrors.type = 'Type is required';
    }

    // API Key validation for non-webhook types
    if (!isEdit && formData.type !== 'webhook' && formData.type !== 'custom') {
      if (!formData.credentials?.apiKey || formData.credentials.apiKey.trim() === '') {
        newErrors.apiKey = 'API Key is required';
      }
    }

    if (formData.credentials?.apiKey && formData.credentials.apiKey.length > API_KEY_MAX_LENGTH) {
      newErrors.apiKey = `API Key must be less than ${API_KEY_MAX_LENGTH} characters`;
    }

    // Webhook URL validation for webhook type
    if (formData.type === 'webhook' || formData.type === 'custom') {
      if (!formData.config?.endpoint || formData.config.endpoint.trim() === '') {
        newErrors.webhookUrl = 'Webhook URL is required';
      } else if (formData.config.endpoint.length > WEBHOOK_URL_MAX_LENGTH) {
        newErrors.webhookUrl = `Webhook URL must be less than ${WEBHOOK_URL_MAX_LENGTH} characters`;
      }
    }

    // Max Retries validation
    const maxRetries = parseInt(formData.config?.timeout || 30000, 10);
    if (formData.config?.maxRetries !== undefined) {
      const retries = parseInt(formData.config.maxRetries, 10);
      if (isNaN(retries) || retries < 0) {
        newErrors.maxRetries = 'Max Retries must be 0 or greater';
      } else if (retries > MAX_RETRIES_MAX) {
        newErrors.maxRetries = `Max Retries must be ${MAX_RETRIES_MAX} or less`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearErrors = () => setErrors({});
  const clearFieldError = (field) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  return { errors, validateField, validateForm, clearErrors, clearFieldError };
};

function IntegrationsPage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { canManageIntegrations, canViewIntegrations } = usePermissions();
  const [integrations, setIntegrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [filters, setFilters] = useState({ status: '', type: '' });
  const [showApiKey, setShowApiKey] = useState(false);
  const [showEditApiKey, setShowEditApiKey] = useState(false);
  const { errors, validateField, validateForm, clearErrors, clearFieldError } = useFormErrors();

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    config: {
      endpoint: '',
      authType: 'api_key',
      timeout: 30000,
      maxRetries: 0,
      retryDelay: 200
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

    // JS validation instead of HTML5 required
    if (!validateForm(formData)) {
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
      clearErrors();
      showToast.integrationCreated();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to create integration');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    // JS validation - for edit, API key is optional
    if (!validateForm(formData, true)) {
      return;
    }

    try {
      const response = await integrationApi.update(selectedIntegration._id, formData);
      setIntegrations(prev => prev.map(i => i._id === selectedIntegration._id ? response.data : i));
      setShowEditModal(false);
      setSelectedIntegration(null);
      resetForm();
      clearErrors();
      showToast.integrationUpdated();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to update integration');
    }
  };

  const handleDelete = async (integration) => {
    setSelectedIntegration(integration);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedIntegration) return;

    try {
      await integrationApi.delete(selectedIntegration._id);
      setIntegrations(prev => prev.filter(i => i._id !== selectedIntegration._id));
      setShowDeleteModal(false);
      setSelectedIntegration(null);
      showToast.integrationDeleted();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to delete integration');
    }
  };

  const handleTest = async (integration) => {
    // Validate API key for non-webhook integrations
    if (integration.type !== 'webhook' && integration.type !== 'custom') {
      if (!integration.credentials || !integration.credentials.apiKey) {
        showToast.error('API Key is required. Please edit the integration to add an API key.');
        return;
      }
    }

    // Validate webhook URL for webhook/custom integrations
    if (integration.type === 'webhook' || integration.type === 'custom') {
      if (!integration.config || !integration.config.endpoint) {
        showToast.error('Webhook URL is required. Please edit the integration to add a webhook URL.');
        return;
      }
    }

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
      type: '',
      description: '',
      config: {
        endpoint: '',
        authType: 'api_key',
        timeout: 30000,
        maxRetries: 0,
        retryDelay: 200
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
    setShowApiKey(false);
    setShowEditApiKey(false);
    clearErrors();
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
        timeout: integration.config?.timeout || 30000,
        maxRetries: integration.config?.maxRetries ?? 0,
        retryDelay: integration.config?.retryDelay ?? 200
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
    clearErrors();
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
            onClick={() => { resetForm(); clearErrors(); setShowCreateModal(true); }}
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
              onClick={() => { resetForm(); clearErrors(); setShowCreateModal(true); }}
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
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); clearErrors(); }} title="Add Integration" size="lg">
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Name<span className="text-red-500">*</span></label>
              <span className="text-xs text-gray-400">{formData.name.length}/{NAME_MAX_LENGTH}</span>
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                // Only allow letters and spaces
                const filteredValue = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                if (filteredValue.length <= NAME_MAX_LENGTH) {
                  setFormData({ ...formData, name: filteredValue });
                  clearFieldError('name');
                }
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] ${
                errors.name ? 'border-red-500' : formData.name.length === NAME_MAX_LENGTH ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="My Integration"
              maxLength={NAME_MAX_LENGTH}
              autoComplete="name"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
            {!errors.name && formData.name.length === NAME_MAX_LENGTH && (
              <p className="text-xs text-red-500 mt-1">Maximum character limit reached</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type<span className="text-red-500">*</span></label>
            <select
              value={formData.type}
              onChange={(e) => {
                setFormData({ ...formData, type: e.target.value });
                clearFieldError('type');
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] ${
                errors.type ? 'border-red-500' : 'border-gray-200'
              }`}
            >
              <option value="" disabled>Select integration type...</option>
              {INTEGRATION_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
              ))}
            </select>
            {errors.type && (
              <p className="text-xs text-red-500 mt-1">{errors.type}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <span className="text-xs text-gray-400">{formData.description.length}/{DESCRIPTION_MAX_LENGTH}</span>
            </div>
            <textarea
              value={formData.description}
              onChange={(e) => {
                if (e.target.value.length <= DESCRIPTION_MAX_LENGTH) {
                  setFormData({ ...formData, description: e.target.value });
                }
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] resize-none ${
                formData.description.length === DESCRIPTION_MAX_LENGTH ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="Integration description..."
              maxLength={DESCRIPTION_MAX_LENGTH}
              rows={3}
            />
            {formData.description.length === DESCRIPTION_MAX_LENGTH && (
              <p className="text-xs text-red-500 mt-1">Maximum character limit reached</p>
            )}
          </div>

          {/* Webhook Configuration - Show for webhook and custom types */}
          {(formData.type === 'webhook' || formData.type === 'custom') && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700">Webhook Configuration</h4>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Webhook URL<span className="text-red-500">*</span></label>
                  <span className="text-xs text-gray-400">{formData.config.endpoint.length}/{WEBHOOK_URL_MAX_LENGTH}</span>
                </div>
                <input
                  type="url"
                  value={formData.config.endpoint}
                  onChange={(e) => {
                    if (e.target.value.length <= WEBHOOK_URL_MAX_LENGTH) {
                      setFormData({ ...formData, config: { ...formData.config, endpoint: e.target.value } });
                      clearFieldError('webhookUrl');
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] ${
                    errors.webhookUrl ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="https://example.com/webhook"
                  maxLength={WEBHOOK_URL_MAX_LENGTH}
                />
                {errors.webhookUrl && (
                  <p className="text-xs text-red-500 mt-1">{errors.webhookUrl}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Retries</label>
                  <input
                    type="number"
                    min="0"
                    max={MAX_RETRIES_MAX}
                    value={formData.config.maxRetries}
                    onChange={(e) => {
                      const value = Math.min(Math.max(0, parseInt(e.target.value) || 0), MAX_RETRIES_MAX);
                      setFormData({ ...formData, config: { ...formData.config, maxRetries: value } });
                      clearFieldError('maxRetries');
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] ${
                      errors.maxRetries ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of retry attempts</p>
                  {errors.maxRetries && (
                    <p className="text-xs text-red-500 mt-1">{errors.maxRetries}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retry Delay (ms)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.config.retryDelay}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setFormData({ ...formData, config: { ...formData.config, retryDelay: value } });
                      clearFieldError('retryDelay');
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] ${
                      errors.retryDelay ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="200"
                  />
                  <p className="text-xs text-gray-500 mt-1">Initial delay between retries</p>
                  {errors.retryDelay && (
                    <p className="text-xs text-red-500 mt-1">{errors.retryDelay}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (ms)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.config.timeout}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setFormData({ ...formData, config: { ...formData.config, timeout: value } });
                      clearFieldError('timeout');
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] ${
                      errors.timeout ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Request timeout duration</p>
                  {errors.timeout && (
                    <p className="text-xs text-red-500 mt-1">{errors.timeout}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* API Key - Show for non-webhook types */}
          {formData.type !== 'webhook' && formData.type !== 'custom' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">API Key<span className="text-red-500">*</span></label>
                <span className="text-xs text-gray-400">{formData.credentials.apiKey.length}/{API_KEY_MAX_LENGTH}</span>
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.credentials.apiKey}
                  onChange={(e) => {
                    if (e.target.value.length <= API_KEY_MAX_LENGTH) {
                      setFormData({ ...formData, credentials: { ...formData.credentials, apiKey: e.target.value } });
                      clearFieldError('apiKey');
                    }
                  }}
                  className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] ${
                    errors.apiKey ? 'border-red-500' : formData.credentials.apiKey.length === API_KEY_MAX_LENGTH ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="Enter API key"
                  maxLength={API_KEY_MAX_LENGTH}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.apiKey && (
                <p className="text-xs text-red-500 mt-1">{errors.apiKey}</p>
              )}
              {!errors.apiKey && formData.credentials.apiKey.length === API_KEY_MAX_LENGTH && (
                <p className="text-xs text-red-500 mt-1">Maximum character limit reached</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="syncEnabled"
              checked={formData.sync.enabled}
              onChange={(e) => setFormData({ ...formData, sync: { ...formData.sync, enabled: e.target.checked } })}
              className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
            />
            <label htmlFor="syncEnabled" className="text-sm text-gray-700">Enable automatic sync</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => { setShowCreateModal(false); clearErrors(); }}
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
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); clearErrors(); }} title="Edit Integration" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4" noValidate>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Name<span className="text-red-500">*</span></label>
              <span className="text-xs text-gray-400">{formData.name.length}/{NAME_MAX_LENGTH}</span>
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                // Only allow letters and spaces
                const filteredValue = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                if (filteredValue.length <= NAME_MAX_LENGTH) {
                  setFormData({ ...formData, name: filteredValue });
                  clearFieldError('name');
                }
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] ${
                errors.name ? 'border-red-500' : formData.name.length === NAME_MAX_LENGTH ? 'border-red-300' : 'border-gray-200'
              }`}
              maxLength={NAME_MAX_LENGTH}
              autoComplete="name"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
            {!errors.name && formData.name.length === NAME_MAX_LENGTH && (
              <p className="text-xs text-red-500 mt-1">Maximum character limit reached</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] bg-gray-50 cursor-not-allowed"
            >
              {INTEGRATION_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Integration type cannot be changed after creation</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <span className="text-xs text-gray-400">{formData.description.length}/{DESCRIPTION_MAX_LENGTH}</span>
            </div>
            <textarea
              value={formData.description}
              onChange={(e) => {
                if (e.target.value.length <= DESCRIPTION_MAX_LENGTH) {
                  setFormData({ ...formData, description: e.target.value });
                }
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] resize-none ${
                formData.description.length === DESCRIPTION_MAX_LENGTH ? 'border-red-300' : 'border-gray-200'
              }`}
              maxLength={DESCRIPTION_MAX_LENGTH}
              rows={3}
            />
            {formData.description.length === DESCRIPTION_MAX_LENGTH && (
              <p className="text-xs text-red-500 mt-1">Maximum character limit reached</p>
            )}
          </div>

          {/* Webhook Configuration - Show for webhook and custom types */}
          {(formData.type === 'webhook' || formData.type === 'custom') && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700">Webhook Configuration</h4>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Webhook URL<span className="text-red-500">*</span></label>
                  <span className="text-xs text-gray-400">{formData.config.endpoint.length}/{WEBHOOK_URL_MAX_LENGTH}</span>
                </div>
                <input
                  type="url"
                  value={formData.config.endpoint}
                  onChange={(e) => {
                    if (e.target.value.length <= WEBHOOK_URL_MAX_LENGTH) {
                      setFormData({ ...formData, config: { ...formData.config, endpoint: e.target.value } });
                      clearFieldError('webhookUrl');
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] ${
                    errors.webhookUrl ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="https://example.com/webhook"
                  maxLength={WEBHOOK_URL_MAX_LENGTH}
                />
                {errors.webhookUrl && (
                  <p className="text-xs text-red-500 mt-1">{errors.webhookUrl}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Retries</label>
                  <input
                    type="number"
                    min="0"
                    max={MAX_RETRIES_MAX}
                    value={formData.config.maxRetries}
                    onChange={(e) => {
                      const value = Math.min(Math.max(0, parseInt(e.target.value) || 0), MAX_RETRIES_MAX);
                      setFormData({ ...formData, config: { ...formData.config, maxRetries: value } });
                      clearFieldError('maxRetries');
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] ${
                      errors.maxRetries ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of retry attempts</p>
                  {errors.maxRetries && (
                    <p className="text-xs text-red-500 mt-1">{errors.maxRetries}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retry Delay (ms)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.config.retryDelay}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setFormData({ ...formData, config: { ...formData.config, retryDelay: value } });
                      clearFieldError('retryDelay');
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] ${
                      errors.retryDelay ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="200"
                  />
                  <p className="text-xs text-gray-500 mt-1">Initial delay between retries</p>
                  {errors.retryDelay && (
                    <p className="text-xs text-red-500 mt-1">{errors.retryDelay}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (ms)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.config.timeout}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setFormData({ ...formData, config: { ...formData.config, timeout: value } });
                      clearFieldError('timeout');
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] ${
                      errors.timeout ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Request timeout duration</p>
                  {errors.timeout && (
                    <p className="text-xs text-red-500 mt-1">{errors.timeout}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* API Key - Show for non-webhook types */}
          {formData.type !== 'webhook' && formData.type !== 'custom' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">New API Key <span className="text-xs text-gray-400">(leave empty to keep current)</span></label>
                <span className="text-xs text-gray-400">{formData.credentials.apiKey.length}/{API_KEY_MAX_LENGTH}</span>
              </div>
              <div className="relative">
                <input
                  type={showEditApiKey ? 'text' : 'password'}
                  value={formData.credentials.apiKey}
                  onChange={(e) => {
                    if (e.target.value.length <= API_KEY_MAX_LENGTH) {
                      setFormData({ ...formData, credentials: { ...formData.credentials, apiKey: e.target.value } });
                      clearFieldError('apiKey');
                    }
                  }}
                  className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] ${
                    errors.apiKey ? 'border-red-500' : formData.credentials.apiKey.length === API_KEY_MAX_LENGTH ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="Enter new API key to update"
                  maxLength={API_KEY_MAX_LENGTH}
                />
                <button
                  type="button"
                  onClick={() => setShowEditApiKey(!showEditApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showEditApiKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.apiKey && (
                <p className="text-xs text-red-500 mt-1">{errors.apiKey}</p>
              )}
              {!errors.apiKey && formData.credentials.apiKey.length === API_KEY_MAX_LENGTH && (
                <p className="text-xs text-red-500 mt-1">Maximum character limit reached</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editSyncEnabled"
              checked={formData.sync.enabled}
              onChange={(e) => setFormData({ ...formData, sync: { ...formData.sync, enabled: e.target.checked } })}
              className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
            />
            <label htmlFor="editSyncEnabled" className="text-sm text-gray-700">Enable automatic sync</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => { setShowEditModal(false); clearErrors(); }}
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

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setSelectedIntegration(null); }} title="Delete Integration" size="md">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-medium text-red-800">This action cannot be undone</h4>
                <p className="text-sm text-red-700 mt-1">
                  Are you sure you want to delete <span className="font-semibold">{selectedIntegration?.name}</span>? This will permanently remove the integration and all associated data.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setShowDeleteModal(false); setSelectedIntegration(null); }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Integration
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default IntegrationsPage;