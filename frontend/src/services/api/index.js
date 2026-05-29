/**
 * API Services Index
 *
 * Export all API service modules.
 */

// Import the axios client
import apiClient from './axios.js';

// Import API services
import authApi from './auth.api.js';
import apiKeyApi from './apiKey.api.js';
import modelApi from './model.api.js';
import organizationApi from './organization.api.js';
import providerApi from './provider.api.js';
import featureApi from './feature.api.js';
import planApi from './plan.api.js';
import pricingHistoryApi from './pricingHistory.api.js';
import projectApi from './project.api.js';
import notificationApi from './notification.api.js';
import analyticsApi from './analytics.api.js';
import auditApi from './audit.api.js';
import billingApi from './billing.api.js';
import integrationApi from './integration.api.js';
import reportApi from './report.api.js';
import roleApi from './role.api.js';
import settingsApi from './settings.api.js';
import simulationApi from './simulation.api.js';
import webhookApi from './webhook.api.js';
import adminApi from './admin.api.js';

// Export the client
export { apiClient };

// Export API services
export {
  authApi,
  apiKeyApi,
  modelApi,
  organizationApi,
  providerApi,
  featureApi,
  planApi,
  pricingHistoryApi,
  projectApi,
  notificationApi,
  analyticsApi,
  auditApi,
  billingApi,
  integrationApi,
  reportApi,
  roleApi,
  settingsApi,
  simulationApi,
  webhookApi,
  adminApi
};

// Default export for convenience
export default {
  apiClient,
  authApi,
  apiKeyApi,
  modelApi,
  organizationApi,
  providerApi,
  featureApi,
  planApi,
  pricingHistoryApi,
  projectApi,
  notificationApi,
  analyticsApi,
  auditApi,
  billingApi,
  integrationApi,
  reportApi,
  roleApi,
  settingsApi,
  simulationApi,
  webhookApi,
  adminApi
};