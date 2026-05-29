import api from './axios.js';

const reportApi = {
  // Get all reports
  getReports: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.status) query.append('status', params.status);
    if (params.isTemplate !== undefined) query.append('isTemplate', params.isTemplate);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.sort) query.append('sort', params.sort);

    const response = await api.get(`/reports?${query.toString()}`);
    return response.data;
  },

  // Get report by ID
  getReport: async (id) => {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },

  // Create report
  createReport: async (data) => {
    const response = await api.post('/reports', data);
    return response.data;
  },

  // Update report
  updateReport: async (id, data) => {
    const response = await api.put(`/reports/${id}`, data);
    return response.data;
  },

  // Delete report
  deleteReport: async (id) => {
    const response = await api.delete(`/reports/${id}`);
    return response.data;
  },

  // Generate report
  generateReport: async (id) => {
    const response = await api.post(`/reports/${id}/generate`);
    return response.data;
  },

  // Export report
  exportReport: async (id, format = 'json') => {
    const response = await api.get(`/reports/${id}/export?format=${format}`, {
      responseType: 'blob'
    });
    return response;
  },

  // Share report
  shareReport: async (id, userIds, permission = 'view') => {
    const response = await api.post(`/reports/${id}/share`, { userIds, permission });
    return response.data;
  },

  // Remove share
  removeShare: async (id, userId) => {
    const response = await api.delete(`/reports/${id}/share/${userId}`);
    return response.data;
  },

  // Duplicate report
  duplicateReport: async (id) => {
    const response = await api.post(`/reports/${id}/duplicate`);
    return response.data;
  },

  // Get templates
  getTemplates: async () => {
    const response = await api.get('/reports/templates');
    return response.data;
  },

  // Create template
  createTemplate: async (data) => {
    const response = await api.post('/reports/templates', data);
    return response.data;
  },

  // Create from template
  createFromTemplate: async (templateId, data = {}) => {
    const response = await api.post(`/reports/from-template/${templateId}`, data);
    return response.data;
  },

  // Get report types
  getReportTypes: async () => {
    const response = await api.get('/reports/types');
    return response.data;
  },

  // Get file formats
  getFileFormats: async () => {
    const response = await api.get('/reports/formats');
    return response.data;
  },

  // Get scheduled reports
  getScheduledReports: async () => {
    const response = await api.get('/reports/scheduled');
    return response.data;
  },

  // Get report stats
  getReportStats: async () => {
    const response = await api.get('/reports/stats');
    return response.data;
  }
};

export default reportApi;