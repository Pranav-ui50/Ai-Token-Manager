/**
 * API Keys Page
 *
 * Manage API keys for programmatic access.
 * FR-48: API Credential Management
 */

import { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import Loader from '../../components/common/Loader.jsx';
import apiKeyApi from '../../services/api/apiKey.api.js';
import usePermissions from '../../hooks/usePermissions.js';
import { showToast } from '../../utils/toasts.js';

const PERMISSION_OPTIONS = [
  { value: 'providers:read', label: 'View Providers' },
  { value: 'providers:write', label: 'Manage Providers' },
  { value: 'models:read', label: 'View Models' },
  { value: 'models:write', label: 'Manage Models' },
  { value: 'features:read', label: 'View Features' },
  { value: 'features:write', label: 'Manage Features' },
  { value: 'plans:read', label: 'View Plans' },
  { value: 'plans:write', label: 'Manage Plans' },
  { value: 'projects:read', label: 'View Projects' },
  { value: 'projects:write', label: 'Manage Projects' },
  { value: 'analytics:read', label: 'View Analytics' },
  { value: 'integrations:read', label: 'View Integrations' },
  { value: 'integrations:write', label: 'Manage Integrations' }
];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  revoked: 'bg-red-100 text-red-700',
  expired: 'bg-yellow-100 text-yellow-700'
};

function ApiKeysPage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { user } = useAuth();
  const { canManageApiKeys, canViewApiKeys } = usePermissions();
  const [apiKeys, setApiKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [newKeyData, setNewKeyData] = useState(null);
  const [keyStats, setKeyStats] = useState(null);
  const [filterScope, setFilterScope] = useState('organization');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [],
    scopes: [],
    expiresInDays: null,
    ipRestrictions: [],
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000
    }
  });

  const [ipInput, setIpInput] = useState('');

  useEffect(() => {
    if (currentOrganization) {
      fetchApiKeys();
    }
  }, [currentOrganization, filterScope]);

  const fetchApiKeys = async () => {
    setIsLoading(true);
    try {
      const response = filterScope === 'organization'
        ? await apiKeyApi.getForOrganization()
        : await apiKeyApi.getMyKeys();
      setApiKeys(response.data || []);
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
      showToast.error(err.response?.data?.error?.message || 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    try {
      const data = {
        organizationId: currentOrganization._id,
        ...formData,
        expiresInDays: formData.expiresInDays || undefined
      };

      const response = await apiKeyApi.create(data);
      setNewKeyData(response.data);
      setShowCreateModal(false);
      resetForm();
      fetchApiKeys();
      showToast.apiKeyCreated();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to create API key');
    }
  };

  const handleRevoke = async (key) => {
    const reason = prompt('Enter revocation reason (optional):');
    if (!confirm(`Are you sure you want to revoke "${key.name}"?`)) return;

    try {
      await apiKeyApi.revoke(key._id, reason || undefined);
      setApiKeys(prev => prev.map(k => k._id === key._id ? { ...k, status: 'revoked' } : k));
      showToast.apiKeyRevoked();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to revoke API key');
    }
  };

  const handleDelete = async (key) => {
    if (!confirm(`Are you sure you want to delete "${key.name}"? This cannot be undone.`)) return;

    try {
      await apiKeyApi.delete(key._id);
      setApiKeys(prev => prev.filter(k => k._id !== key._id));
      showToast.apiKeyDeleted();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to delete API key');
    }
  };

  const handleRegenerate = async (key) => {
    if (!confirm(`Regenerate key "${key.name}"? The old key will stop working immediately.`)) return;

    try {
      const response = await apiKeyApi.regenerate(key._id);
      setNewKeyData(response.data);
      fetchApiKeys();
      showToast.apiKeyRegenerated();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to regenerate API key');
    }
  };

  const handleViewStats = async (key) => {
    setSelectedKey(key);
    setKeyStats(null);
    setShowStatsModal(true);

    try {
      const response = await apiKeyApi.getUsageStats(key._id);
      setKeyStats(response.data);
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || 'Failed to load key statistics');
    }
  };

  const handlePermissionToggle = (permission) => {
    setFormData(prev => {
      const permissions = prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission];
      return { ...prev, permissions };
    });
  };

  const handleAddIpRestriction = () => {
    if (ipInput && !formData.ipRestrictions.includes(ipInput)) {
      setFormData(prev => ({
        ...prev,
        ipRestrictions: [...prev.ipRestrictions, ipInput]
      }));
      setIpInput('');
    }
  };

  const handleRemoveIpRestriction = (ip) => {
    setFormData(prev => ({
      ...prev,
      ipRestrictions: prev.ipRestrictions.filter(i => i !== ip)
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: [],
      scopes: [],
      expiresInDays: null,
      ipRestrictions: [],
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000
      }
    });
    setIpInput('');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast.apiKeyCopied();
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

  if (orgLoading) {
    return (
      <Loader />
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Organization Selected</h2>
          <p className="text-gray-500 mb-4">Please select an organization to manage API keys.</p>
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
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500">Manage API credentials for programmatic access</p>
        </div>
        {canManageApiKeys() && (
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create API Key</span>
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">View:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterScope('organization')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterScope === 'organization'
                  ? 'bg-[#DC2626] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Organization Keys
            </button>
            <button
              onClick={() => setFilterScope('user')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterScope === 'user'
                  ? 'bg-[#DC2626] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              My Keys
            </button>
          </div>
        </div>
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

      {/* New Key Display */}
      {newKeyData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800">Save Your API Key</h3>
              <p className="text-sm text-yellow-700 mb-3">
                This is the only time you'll see this key. Store it securely!
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-yellow-100 px-3 py-2 rounded-lg text-yellow-900 font-mono text-sm break-all">
                  {newKeyData.plainKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newKeyData.plainKey)}
                  className="px-3 py-2 bg-yellow-200 text-yellow-800 rounded-lg hover:bg-yellow-300 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
                <button
                  onClick={() => setNewKeyData(null)}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m2 2v3a2 2 0 01-2 2h-3.28a1 1 0 00-.948.684l-1.499 4.493a1 1 0 01-.948.684H9a2 2 0 01-2-2v-3a2 2 0 00-2-2H4a2 2 0 01-2-2V5a2 2 0 012-2h3.28a1 1 0 00.948-.684l1.499-4.493a1 1 0 01.948-.684H9a2 2 0 012 2v3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No API keys yet</h3>
          <p className="text-gray-500 mb-4">Create an API key to access the API programmatically</p>
          {canManageApiKeys() && (
            <button
              onClick={() => { resetForm(); setShowCreateModal(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create API Key</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Used</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiKeys.map(key => (
                <tr key={key._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{key.name}</div>
                      {key.description && (
                        <div className="text-sm text-gray-500">{key.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                      atm_...{key.last4}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[key.status] || 'bg-gray-100 text-gray-700'}`}>
                      {key.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {key.permissions?.slice(0, 3).map((perm, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                          {perm.split(':')[0]}
                        </span>
                      ))}
                      {key.permissions?.length > 3 && (
                        <span className="text-xs text-gray-500">+{key.permissions.length - 3} more</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(key.lastUsedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {key.expiresAt ? formatDate(key.expiresAt) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewStats(key)}
                        className="text-gray-500 hover:text-[#DC2626] p-1 rounded"
                        title="View Stats"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </button>
                      {key.status !== 'revoked' && (
                        <>
                          <button
                            onClick={() => handleRegenerate(key)}
                            className="text-gray-500 hover:text-blue-600 p-1 rounded"
                            title="Regenerate"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRevoke(key)}
                            className="text-gray-500 hover:text-orange-600 p-1 rounded"
                            title="Revoke"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(key)}
                        className="text-gray-500 hover:text-red-600 p-1 rounded"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create API Key" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name<span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
              placeholder="Production API Key"
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
              placeholder="Key description and usage..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PERMISSION_OPTIONS.map(option => (
                <label key={option.value} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(option.value)}
                    onChange={() => handlePermissionToggle(option.value)}
                    className="rounded border-gray-300 text-[#DC2626] "
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiration (days, optional)</label>
            <input
              type="number"
              value={formData.expiresInDays || ''}
              onChange={(e) => setFormData({ ...formData, expiresInDays: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
              placeholder="Leave empty for no expiration"
              min={1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IP Restrictions (optional)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
                placeholder="192.168.1.1"
              />
              <button
                type="button"
                onClick={handleAddIpRestriction}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Add
              </button>
            </div>
            {formData.ipRestrictions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.ipRestrictions.map((ip, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                    {ip}
                    <button
                      type="button"
                      onClick={() => handleRemoveIpRestriction(ip)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requests/Minute</label>
              <input
                type="number"
                value={formData.rateLimit.requestsPerMinute}
                onChange={(e) => setFormData({
                  ...formData,
                  rateLimit: { ...formData.rateLimit, requestsPerMinute: parseInt(e.target.value) || 60 }
                })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requests/Hour</label>
              <input
                type="number"
                value={formData.rateLimit.requestsPerHour}
                onChange={(e) => setFormData({
                  ...formData,
                  rateLimit: { ...formData.rateLimit, requestsPerHour: parseInt(e.target.value) || 1000 }
                })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none "
                min={1}
              />
            </div>
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
              Create API Key
            </button>
          </div>
        </form>
      </Modal>

      {/* Stats Modal */}
      <Modal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} title="API Key Usage Statistics" size="lg">
        {selectedKey && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-900">{selectedKey.name}</h3>
              <code className="text-sm text-gray-500">atm_...{selectedKey.last4}</code>
            </div>

            {keyStats === null ? (
              <div className="flex items-center justify-center py-8">
                <Loader />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Total Requests</div>
                    <div className="text-2xl font-bold text-gray-900">{keyStats.totalRequests || 0}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Success Rate</div>
                    <div className="text-2xl font-bold text-green-600">
                      {keyStats.successRate ? `${keyStats.successRate.toFixed(1)}%` : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Avg Response Time</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {keyStats.avgResponseTime ? `${keyStats.avgResponseTime}ms` : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Last Used</div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(selectedKey.lastUsedAt)}
                    </div>
                  </div>
                </div>

                {keyStats.endpoints && keyStats.endpoints.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Top Endpoints</h4>
                    <div className="bg-gray-50 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Endpoint</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Requests</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keyStats.endpoints.slice(0, 5).map((ep, i) => (
                            <tr key={i}>
                              <td className="px-4 py-2 text-sm text-gray-700">{ep.path}</td>
                              <td className="px-4 py-2 text-sm text-gray-900 text-right">{ep.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setShowStatsModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
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

export default ApiKeysPage;