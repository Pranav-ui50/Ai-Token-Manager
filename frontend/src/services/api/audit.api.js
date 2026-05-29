import api from './axios.js';

const auditApi = {
  // Get audit logs
  getLogs: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.action) query.append('action', params.action);
    if (params.resourceType) query.append('resourceType', params.resourceType);
    if (params.resourceId) query.append('resourceId', params.resourceId);
    if (params.userId) query.append('userId', params.userId);
    if (params.severity) query.append('severity', params.severity);
    if (params.status) query.append('status', params.status);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.sort) query.append('sort', params.sort);

    const response = await api.get(`/audit-logs?${query.toString()}`);
    return response.data;
  },

  // Get log by ID
  getLogById: async (id) => {
    const response = await api.get(`/audit-logs/${id}`);
    return response.data;
  },

  // Get user logs
  getUserLogs: async (userId, params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.sort) query.append('sort', params.sort);

    const response = await api.get(`/audit-logs/user/${userId}?${query.toString()}`);
    return response.data;
  },

  // Get resource logs
  getResourceLogs: async (type, id, params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.sort) query.append('sort', params.sort);

    const response = await api.get(`/audit-logs/resource/${type}/${id}?${query.toString()}`);
    return response.data;
  },

  // Get recent activity
  getRecentActivity: async (limit = 10) => {
    const response = await api.get(`/audit-logs/recent?limit=${limit}`);
    return response.data;
  },

  // Get statistics
  getStatistics: async (startDate, endDate) => {
    const response = await api.get(`/audit-logs/statistics?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },

  // Get action summary
  getActionSummary: async (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get(`/audit-logs/summary/actions?${params.toString()}`);
    return response.data;
  },

  // Get resource summary
  getResourceSummary: async (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get(`/audit-logs/summary/resources?${params.toString()}`);
    return response.data;
  },

  // Get user activity summary
  getUserActivitySummary: async (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get(`/audit-logs/summary/users?${params.toString()}`);
    return response.data;
  },

  // Export logs
  exportLogs: async (params = {}, format = 'json') => {
    const query = new URLSearchParams();
    query.append('format', format);
    if (params.action) query.append('action', params.action);
    if (params.resourceType) query.append('resourceType', params.resourceType);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const response = await api.get(`/audit-logs/export?${query.toString()}`, {
      responseType: 'blob'
    });
    return response;
  },

  // Get available action types
  getActionTypes: async () => {
    const response = await api.get('/audit-logs/types/actions');
    return response.data;
  },

  // Get available resource types
  getResourceTypes: async () => {
    const response = await api.get('/audit-logs/types/resources');
    return response.data;
  },

  // Get available severity levels
  getSeverityLevels: async () => {
    const response = await api.get('/audit-logs/types/severity');
    return response.data;
  },

  // Create manual log entry
  createLog: async (data) => {
    const response = await api.post('/audit-logs', data);
    return response.data;
  }
};

export default auditApi;