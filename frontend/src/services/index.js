/**
 * Services Index
 *
 * Export all services including API clients and utilities.
 */

// API Services
export {
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
  analyticsApi,
  auditApi,
  billingApi,
  integrationApi,
  reportApi,
  roleApi,
  settingsApi,
  simulationApi,
  webhookApi
} from './api/index.js';

// Store
export {
  useAuthStore,
  useOrganizationStore,
  useUsageStore,
  usePricingStore,
  useSettingsStore,
  stores
} from '../store/index.js';

// Default export
export default {
  // API Services
  apiClient: require('./api/index.js').apiClient,
  authApi: require('./api/index.js').authApi,
  apiKeyApi: require('./api/index.js').apiKeyApi,
  modelApi: require('./api/index.js').modelApi,
  organizationApi: require('./api/index.js').organizationApi,
  providerApi: require('./api/index.js').providerApi,
  featureApi: require('./api/index.js').featureApi,
  planApi: require('./api/index.js').planApi,
  pricingHistoryApi: require('./api/index.js').pricingHistoryApi,
  projectApi: require('./api/index.js').projectApi,
  analyticsApi: require('./api/index.js').analyticsApi,
  auditApi: require('./api/index.js').auditApi,
  billingApi: require('./api/index.js').billingApi,
  integrationApi: require('./api/index.js').integrationApi,
  reportApi: require('./api/index.js').reportApi,
  roleApi: require('./api/index.js').roleApi,
  settingsApi: require('./api/index.js').settingsApi,
  simulationApi: require('./api/index.js').simulationApi,
  webhookApi: require('./api/index.js').webhookApi
};