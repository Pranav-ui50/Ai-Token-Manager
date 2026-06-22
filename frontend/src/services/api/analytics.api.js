/**
 * Analytics API Service
 *
 * Handles all analytics-related API requests.
 * FR-40: Operational cost dashboards
 * FR-41: Feature profitability analytics
 * FR-42: Exportable reports
 * FR-43: Excel/PDF exports
 * FR-44: Margin analytics
 */

import apiClient from './axios.js';

const analyticsApi = {
  /**
   * Get dashboard summary
   * @returns {Promise<Object>} Dashboard data
   */
  getDashboard: async () => {
    const response = await apiClient.get('/analytics/dashboard');
    return response.data;
  },

  /**
   * Get operational costs
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Cost analytics data
   */
  getOperationalCosts: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.projectId) params.append('projectId', filters.projectId);

    const response = await apiClient.get(`/analytics/costs?${params.toString()}`);
    return response.data;
  },

  /**
   * Get feature profitability
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Profitability data
   */
  getFeatureProfitability: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.projectId) params.append('projectId', filters.projectId);

    const response = await apiClient.get(`/analytics/profitability?${params.toString()}`);
    return response.data;
  },

  /**
   * Get margin analytics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Margin data
   */
  getMargins: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.projectId) params.append('projectId', filters.projectId);

    const response = await apiClient.get(`/analytics/margins?${params.toString()}`);
    return response.data;
  },

  /**
   * Export report
   * @param {string} reportType - Type: costs, profitability, margins, summary
   * @param {string} format - Format: json, excel, pdf
   * @param {Object} filters - Filter options
   * @returns {Promise<Object|Blob>} Report data
   */
  exportReport: async (reportType = 'summary', format = 'json', filters = {}) => {
    const params = new URLSearchParams();
    params.append('reportType', reportType);
    params.append('format', format);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.projectId) params.append('projectId', filters.projectId);

    if (format === 'excel' || format === 'pdf') {
      const response = await apiClient.get(`/analytics/export?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    }

    const response = await apiClient.get(`/analytics/export?${params.toString()}`);
    return response.data;
  },

  /**
   * Generate custom report
   * @param {Object} options - Report options
   * @returns {Promise<Object|Blob>} Report data
   */
  generateCustomReport: async (options = {}) => {
    const { reportTypes = ['summary'], format = 'json', filters = {} } = options;

    if (format === 'excel' || format === 'pdf') {
      const response = await apiClient.post('/analytics/export/custom', {
        reportTypes,
        format,
        filters
      }, {
        responseType: 'blob'
      });
      return response.data;
    }

    const response = await apiClient.post('/analytics/export/custom', {
      reportTypes,
      format,
      filters
    });
    return response.data;
  },

  /**
   * Download report as file
   * @param {string} reportType - Type of report
   * @param {string} format - Format: excel or pdf
   * @param {Object} filters - Filter options
   */
  downloadReport: async (reportType, format, filters = {}) => {
    try {
      const blob = await analyticsApi.exportReport(reportType, format, filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report-${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
      throw error;
    }
  }
};

export default analyticsApi;
