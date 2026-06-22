import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import auditApi from '../../services/api/audit.api.js';
import Loader from '../../components/common/Loader.jsx';

const SEVERITY_COLORS = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  critical: 'bg-purple-100 text-purple-800'
};

const STATUS_COLORS = {
  success: 'bg-green-100 text-green-800',
  failure: 'bg-red-100 text-red-800',
  pending: 'bg-gray-100 text-gray-800'
};

const ACTION_LABELS = {
  // Authentication
  login: 'Login',
  logout: 'Logout',
  login_failed: 'Login Failed',
  password_reset: 'Password Reset',
  password_changed: 'Password Changed',
  email_verified: 'Email Verified',
  // CRUD
  create: 'Create',
  read: 'Read',
  update: 'Update',
  delete: 'Delete',
  // Import/Export
  import: 'Import',
  export: 'Export',
  // User actions
  user_invited: 'User Invited',
  user_removed: 'User Removed',
  role_changed: 'Role Changed',
  // Organization
  organization_created: 'Organization Created',
  organization_updated: 'Organization Updated',
  organization_deleted: 'Organization Deleted',
  // Project
  project_created: 'Project Created',
  project_updated: 'Project Updated',
  project_deleted: 'Project Deleted',
  // Provider
  provider_created: 'Provider Created',
  provider_updated: 'Provider Updated',
  provider_activated: 'Provider Activated',
  provider_deactivated: 'Provider Deactivated',
  // Model
  model_created: 'Model Created',
  model_updated: 'Model Updated',
  pricing_updated: 'Pricing Updated',
  // Plan
  plan_created: 'Plan Created',
  plan_updated: 'Plan Updated',
  plan_activated: 'Plan Activated',
  plan_deactivated: 'Plan Deactivated',
  // Integration
  integration_created: 'Integration Created',
  integration_updated: 'Integration Updated',
  integration_tested: 'Integration Tested',
  // API Key
  api_key_created: 'API Key Created',
  api_key_revoked: 'API Key Revoked',
  // Webhook
  webhook_created: 'Webhook Created',
  webhook_updated: 'Webhook Updated',
  webhook_deleted: 'Webhook Deleted',
  // Report
  report_created: 'Report Created',
  report_generated: 'Report Generated',
  report_exported: 'Report Exported',
  report_deleted: 'Report Deleted',
  // Simulation
  simulation_created: 'Simulation Created',
  simulation_run: 'Simulation Run',
  simulation_deleted: 'Simulation Deleted',
  // Settings
  settings_updated: 'Settings Updated',
  // Bulk
  bulk_create: 'Bulk Create',
  bulk_update: 'Bulk Update',
  bulk_delete: 'Bulk Delete',
  // Payment
  payment_created: 'Payment Created',
  payment_verified: 'Payment Verified',
  payment_failed: 'Payment Failed',
  payment_refunded: 'Payment Refunded',
  subscription_created: 'Subscription Created',
  subscription_updated: 'Subscription Updated',
  subscription_cancelled: 'Subscription Cancelled',
  // System
  system_error: 'System Error',
  system_warning: 'System Warning',
  system_info: 'System Info'
};

const RESOURCE_LABELS = {
  user: 'User',
  organization: 'Organization',
  project: 'Project',
  provider: 'Provider',
  model: 'Model',
  feature: 'Feature',
  plan: 'Plan',
  simulation: 'Simulation',
  integration: 'Integration',
  api_key: 'API Key',
  webhook: 'Webhook',
  report: 'Report',
  notification: 'Notification',
  pricing_history: 'Pricing History',
  role: 'Role',
  invitation: 'Invitation',
  settings: 'Settings',
  auth: 'Auth',
  payment: 'Payment',
  invoice: 'Invoice',
  subscription: 'Subscription'
};

function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    severity: '',
    status: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  // Options
  const [actionTypes, setActionTypes] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [severityLevels, setSeverityLevels] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Export state
  const [exporting, setExporting] = useState(false);

  // Track the latest request to avoid race conditions
  const requestIdRef = useRef(0);

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, limit]);

  // Handle filter change - updates filter and resets page to 1
  const handleFilterChange = (key, value) => {
    // Update filter state
    setFilters(prev => ({ ...prev, [key]: value }));
    // Reset page to 1 when filter changes
    setPage(1);
  };

  const loadOptions = async () => {
    try {
      const [actionsRes, resourcesRes, severitiesRes] = await Promise.all([
        auditApi.getActionTypes().catch(() => null),
        auditApi.getResourceTypes().catch(() => null),
        auditApi.getSeverityLevels().catch(() => null)
      ]);

      setActionTypes(actionsRes?.data || ['login', 'logout', 'create', 'update', 'delete']);
      setResourceTypes(resourcesRes?.data || ['user', 'organization', 'project', 'feature', 'model', 'provider']);
      setSeverityLevels(severitiesRes?.data || ['info', 'warning', 'error', 'critical']);
    } catch (err) {
      console.error('Failed to load options:', err);
      // Set defaults on error
      setActionTypes(['login', 'logout', 'create', 'update', 'delete']);
      setResourceTypes(['user', 'organization', 'project', 'feature', 'model', 'provider']);
      setSeverityLevels(['info', 'warning', 'error', 'critical']);
    }
  };

  // Core function to fetch logs with specific filters
  const fetchLogs = async (filterParams, pageNum) => {
    // Generate a unique request ID for this call
    const currentRequestId = ++requestIdRef.current;

    try {
      setLoading(true);

      // Validate and format dates
      const params = {
        ...filterParams,
        page: pageNum,
        limit
      };

      // Validate startDate format
      if (params.startDate) {
        const startDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!startDateRegex.test(params.startDate)) {
          console.warn('Invalid start date format:', params.startDate);
          delete params.startDate;
        } else {
          const year = parseInt(params.startDate.split('-')[0]);
          if (year < 2020 || year > new Date().getFullYear()) {
            console.warn('Start year out of range:', year);
            delete params.startDate;
          }
        }
      }

      // Validate endDate format
      if (params.endDate) {
        const endDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!endDateRegex.test(params.endDate)) {
          console.warn('Invalid end date format:', params.endDate);
          delete params.endDate;
        } else {
          const year = parseInt(params.endDate.split('-')[0]);
          if (year < 2020 || year > new Date().getFullYear()) {
            console.warn('End year out of range:', year);
            delete params.endDate;
          }
        }
      }

      // Remove empty values
      Object.keys(params).forEach(key => {
        if (!params[key] && params[key] !== 0) delete params[key];
      });

      console.log('[Audit Logs] Fetching with params:', params);

      const response = await auditApi.getLogs(params);

      // Check if this is still the latest request (avoid race conditions)
      if (currentRequestId !== requestIdRef.current) {
        console.log('[Audit Logs] Ignoring stale response, request ID:', currentRequestId, 'current:', requestIdRef.current);
        return;
      }

      console.log('[Audit Logs] API response:', response);

      // Handle different response formats
      if (response && response.success && Array.isArray(response.data)) {
        // Standard response: { success: true, data: [...], pagination: {...} }
        setLogs(response.data);
        if (response.pagination) {
          setTotal(response.pagination.total || 0);
          setTotalPages(response.pagination.pages || 1);
        } else {
          setTotal(response.data.length);
          setTotalPages(1);
        }
      } else if (Array.isArray(response)) {
        // Direct array response
        setLogs(response);
        setTotal(response.length);
        setTotalPages(1);
      } else if (response && Array.isArray(response.data)) {
        // Response with data array
        setLogs(response.data);
        if (response.pagination) {
          setTotal(response.pagination.total || 0);
          setTotalPages(response.pagination.pages || 1);
        } else {
          setTotal(response.data.length);
          setTotalPages(1);
        }
      } else {
        console.warn('[Audit Logs] Unexpected response format:', response);
        setLogs([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err) {
      // Check if this is still the latest request
      if (currentRequestId !== requestIdRef.current) {
        console.log('[Audit Logs] Ignoring error from stale request');
        return;
      }

      console.error('Failed to load audit logs:', err);

      // Show toast error
      if (err.isNetworkError || err.message?.includes('Network')) {
        toast.error('Unable to connect to the server. Please check if the backend server is running.');
      } else if (err.response?.status === 401) {
        toast.error('You are not authorized to view audit logs. Please log in again.');
      } else if (err.response?.status === 404) {
        toast.error('Audit logs endpoint not found. Please check the API configuration.');
      } else {
        toast.error(err.response?.data?.message || err.message || 'Failed to load audit logs');
      }

      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Load logs using current state
  const loadLogs = async () => {
    await fetchLogs(filters, page);
  };

  const handleExport = async (format = 'json') => {
    try {
      setExporting(true);
      const params = { ...filters };
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await auditApi.exportLogs(params, format);
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Audit logs exported as ${format.toUpperCase()} successfully.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

  const handleViewDetail = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Format user display
  const formatUser = (log) => {
    // If no user object, check for userId (might be just an ID)
    if (!log.user) {
      // If there's a userId field, show it
      if (log.userId) {
        return { name: `User ID: ${log.userId}`, email: null };
      }
      return { name: 'System', email: null };
    }

    // If user is populated (object with properties)
    if (typeof log.user === 'object' && log.user !== null) {
      const firstName = log.user.firstName || '';
      const lastName = log.user.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();

      // If we have a name, use it
      if (fullName) {
        return { name: fullName, email: log.user.email || null };
      }

      // If we only have email, use email username
      if (log.user.email) {
        return { name: log.user.email.split('@')[0], email: log.user.email };
      }

      // User object exists but no useful info
      if (log.user._id) {
        return { name: `User`, email: null };
      }
    }

    return { name: 'System', email: null };
  };

  const formatAction = (action) => {
    return ACTION_LABELS[action] || action?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || action;
  };

  const formatResource = (resource) => {
    return RESOURCE_LABELS[resource] || resource?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || resource;
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      resourceType: '',
      severity: '',
      status: '',
      startDate: '',
      endDate: '',
      search: ''
    });
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Track all activities and changes in your organization</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total Logs</p>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Current Page</p>
          <p className="text-2xl font-bold text-gray-900">{page} of {totalPages}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Actions</p>
          <p className="text-2xl font-bold text-gray-900">{actionTypes.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Resources</p>
          <p className="text-2xl font-bold text-gray-900">{resourceTypes.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
            >
              <option value="">All Actions</option>
              {actionTypes.map(action => (
                <option key={action} value={action}>{formatAction(action)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
            <select
              value={filters.resourceType}
              onChange={(e) => handleFilterChange('resourceType', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
            >
              <option value="">All Resources</option>
              {resourceTypes.map(type => (
                <option key={type} value={type}>{formatResource(type)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
            >
              <option value="">All Severities</option>
              {severityLevels.map(level => (
                <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              min="2020-01-01"
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#DC2626] focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              min={filters.startDate || '2020-01-01'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#DC2626] focus:border-transparent text-gray-900"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search by description or resource name..."
            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <Loader />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log, index) => (
                  <tr key={log._id || `log-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {((page - 1) * limit) + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">
                          {formatUser(log).name}
                        </span>
                        {formatUser(log).email && (
                          <p className="text-xs text-gray-500">{formatUser(log).email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{formatAction(log.action)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatResource(log.resourceType) || 'N/A'}</div>
                      {log.resourceName && (
                        <p className="text-xs text-gray-500">{log.resourceName}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${SEVERITY_COLORS[log.severity] || 'bg-gray-100 text-gray-800'}`}>
                        {log.severity || 'info'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-800'}`}>
                        {log.status || 'success'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetail(log)}
                        className="p-2 text-[#DC2626] hover:text-[#B91C1C] hover:bg-red-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {total > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4 mt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Records per page selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Rows per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Showing range */}
                <div className="text-sm text-gray-600">
                  Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total} logs
                </div>

                {/* Page navigation */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    title="First page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            page === pageNum
                              ? 'bg-[#DC2626] text-white'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Log Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Timestamp</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">User</p>
                  <p className="font-medium text-gray-900">
                    {formatUser(selectedLog).name}
                  </p>
                  {formatUser(selectedLog).email && (
                    <p className="text-xs text-gray-500">{formatUser(selectedLog).email}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Action</p>
                  <p className="font-medium text-gray-900">{formatAction(selectedLog.action)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Resource Type</p>
                  <p className="font-medium text-gray-900">{formatResource(selectedLog.resourceType) || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Resource Name</p>
                  <p className="font-medium text-gray-900">{selectedLog.resourceName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Resource ID</p>
                  <p className="font-medium text-gray-900 font-mono text-sm">{selectedLog.resourceId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Severity</p>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${SEVERITY_COLORS[selectedLog.severity] || 'bg-gray-100 text-gray-800'}`}>
                    {selectedLog.severity || 'info'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[selectedLog.status] || 'bg-gray-100 text-gray-800'}`}>
                    {selectedLog.status || 'success'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IP Address</p>
                  <p className="font-medium text-gray-900">{selectedLog.context?.ipAddress || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">User Agent</p>
                  <p className="font-medium text-gray-900 text-xs truncate">{selectedLog.context?.userAgent || 'N/A'}</p>
                </div>
              </div>

              {selectedLog.description && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedLog.description}</p>
                </div>
              )}

              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-2">Changes</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedLog.changes.map((change, index) => (
                      <div key={change.field || `change-${index}`} className="mb-2 last:mb-0">
                        <p className="text-sm font-medium text-gray-900">{change.field}</p>
                        <p className="text-xs text-gray-500">
                          <span className="text-red-600">Old: {JSON.stringify(change.oldValue)}</span>
                          {' → '}
                          <span className="text-green-600">New: {JSON.stringify(change.newValue)}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.error && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-1">Error</p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">{selectedLog.error.message || 'Unknown error'}</p>
                    {selectedLog.error.code && (
                      <p className="text-xs text-red-600 mt-1">Code: {selectedLog.error.code}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogsPage;
