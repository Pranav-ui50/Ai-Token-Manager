import { useState, useEffect } from 'react';
import auditApi from '../../services/api/audit.api.js';

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
  login: 'Login',
  logout: 'Logout',
  login_failed: 'Login Failed',
  password_reset: 'Password Reset',
  password_changed: 'Password Changed',
  create: 'Create',
  read: 'Read',
  update: 'Update',
  delete: 'Delete',
  export: 'Export',
  import: 'Import'
};

function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Export state
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [filters, page]);

  const loadOptions = async () => {
    try {
      const [actionsRes, resourcesRes, severitiesRes] = await Promise.all([
        auditApi.getActionTypes().catch(() => null),
        auditApi.getResourceTypes().catch(() => null),
        auditApi.getSeverityLevels().catch(() => null)
      ]);

      setActionTypes(actionsRes?.data || ['login', 'logout', 'create', 'update', 'delete', 'read']);
      setResourceTypes(resourcesRes?.data || ['user', 'organization', 'project', 'feature', 'model', 'provider']);
      setSeverityLevels(severitiesRes?.data || ['info', 'warning', 'error', 'critical']);
    } catch (err) {
      console.error('Failed to load options:', err);
      // Set defaults on error
      setActionTypes(['login', 'logout', 'create', 'update', 'delete', 'read']);
      setResourceTypes(['user', 'organization', 'project', 'feature', 'model', 'provider']);
      setSeverityLevels(['info', 'warning', 'error', 'critical']);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate and format dates
      const params = {
        ...filters,
        page,
        limit
      };

      // Validate startDate format
      if (params.startDate) {
        const startDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!startDateRegex.test(params.startDate)) {
          console.warn('Invalid start date format:', params.startDate);
          delete params.startDate;
        } else {
          // Ensure year is 4 digits and within valid range
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
          // Ensure year is 4 digits and within valid range
          const year = parseInt(params.endDate.split('-')[0]);
          if (year < 2020 || year > new Date().getFullYear()) {
            console.warn('End year out of range:', year);
            delete params.endDate;
          }
        }
      }

      // Remove empty values
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await auditApi.getLogs(params);

      // Handle different response formats
      if (response && response.data) {
        setLogs(Array.isArray(response.data) ? response.data : []);
      } else if (Array.isArray(response)) {
        setLogs(response);
      } else {
        setLogs([]);
      }

      if (response && response.pagination) {
        setTotal(response.pagination.total || 0);
        setTotalPages(response.pagination.pages || 1);
      } else {
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);

      // Check if it's a network error
      if (err.isNetworkError || err.message?.includes('Network')) {
        setError('Unable to connect to the server. Please check if the backend server is running.');
      } else if (err.response?.status === 401) {
        setError('You are not authorized to view audit logs. Please log in again.');
      } else if (err.response?.status === 404) {
        setError('Audit logs endpoint not found. Please check the API configuration.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load audit logs');
      }

      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export logs');
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

  // Handle date change with validation
  const handleDateChange = (field, value) => {
    // Validate date format YYYY-MM-DD
    if (value) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(value)) {
        const year = parseInt(value.split('-')[0]);
        const currentYear = new Date().getFullYear();
        // Only allow years from 2020 to current year
        if (year >= 2020 && year <= currentYear) {
          setFilters({ ...filters, [field]: value });
        }
      }
    } else {
      setFilters({ ...filters, [field]: '' });
    }
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
          <button
            onClick={() => handleExport('json')}
            disabled={exporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting...' : 'Export JSON'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-800 hover:text-red-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

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
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
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
              onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
            >
              <option value="">All Resources</option>
              {resourceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
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
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
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
              onChange={(e) => handleDateChange('startDate', e.target.value)}
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
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              min="2020-01-01"
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#DC2626] focus:border-transparent text-gray-900"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DC2626]"></div>
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
                      <div className="text-sm text-gray-900">{log.resourceType || 'N/A'}</div>
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
                        className="text-[#DC2626] hover:text-[#B91C1C] font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
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
                  <p className="font-medium text-gray-900">{selectedLog.resourceType || 'N/A'}</p>
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