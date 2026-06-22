/**
 * Application Constants
 *
 * Centralized constants used throughout the application.
 * Based on SRS document - SaaS Pricing Calculator for AI API Token Cost Management
 */

// User Roles (as per SRS Section 2.3)
export const ROLES = {
  SUPER_ADMIN: 'super_admin',      // Manages entire platform
  ORG_OWNER: 'org_owner',           // Controls organization workspace
  FINANCE_ADMIN: 'finance_admin',    // Handles pricing and analytics
  PRODUCT_MANAGER: 'product_manager', // Manages feature economics
  DEVELOPER: 'developer',             // Manages integrations and APIs
  VIEWER: 'viewer'                    // Read-only analytics access
};

// Role Hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 100,
  [ROLES.ORG_OWNER]: 90,
  [ROLES.FINANCE_ADMIN]: 70,
  [ROLES.PRODUCT_MANAGER]: 60,
  [ROLES.DEVELOPER]: 50,
  [ROLES.VIEWER]: 10
};

// Permission Definitions
export const PERMISSIONS = {
  // Platform Management
  MANAGE_PLATFORM: 'manage_platform',
  MANAGE_ALL_ORGANIZATIONS: 'manage_all_organizations',

  // Organization Management
  MANAGE_ORGANIZATION: 'manage_organization',
  MANAGE_TEAM: 'manage_team',
  MANAGE_BILLING: 'manage_billing',
  VIEW_BILLING: 'view_billing',
  MANAGE_SUBSCRIPTIONS: 'manage_subscriptions',

  // Provider Management
  MANAGE_PROVIDERS: 'manage_providers',
  VIEW_PROVIDERS: 'view_providers',

  // Model Management
  MANAGE_MODELS: 'manage_models',
  VIEW_MODELS: 'view_models',
  MANAGE_PRICING: 'manage_pricing',  // For finance_admin to manage AI model pricing

  // Feature Management
  MANAGE_FEATURES: 'manage_features',
  VIEW_FEATURES: 'view_features',

  // Plan Management
  MANAGE_PLANS: 'manage_plans',
  VIEW_PLANS: 'view_plans',

  // Project Management
  MANAGE_PROJECTS: 'manage_projects',
  VIEW_PROJECTS: 'view_projects',

  // Simulations
  RUN_SIMULATIONS: 'run_simulations',
  VIEW_SIMULATIONS: 'view_simulations',

  // Analytics & Reporting
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_REPORTS: 'view_reports',
  EXPORT_REPORTS: 'export_reports',
  MANAGE_REPORTS: 'manage_reports',

  // Integrations
  MANAGE_INTEGRATIONS: 'manage_integrations',
  VIEW_INTEGRATIONS: 'view_integrations',

  // API Keys
  MANAGE_API_KEYS: 'manage_api_keys',
  VIEW_API_KEYS: 'view_api_keys',
  VIEW_API_USAGE: 'view_api_usage',

  // Webhooks
  MANAGE_WEBHOOKS: 'manage_webhooks',
  VIEW_WEBHOOKS: 'view_webhooks',

  // Settings
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_SETTINGS: 'view_settings',

  // Audit Logs
  VIEW_AUDIT_LOGS: 'view_audit_logs'
};

// Role Permissions Mapping (as per SRS requirements)
export const ROLE_PERMISSIONS = {
  // Super Admin - Manages entire platform
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

  // Organization Owner - Controls organization workspace
  [ROLES.ORG_OWNER]: [
    PERMISSIONS.MANAGE_ORGANIZATION,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.VIEW_BILLING,
    PERMISSIONS.MANAGE_SUBSCRIPTIONS,
    PERMISSIONS.MANAGE_PROVIDERS,
    PERMISSIONS.VIEW_PROVIDERS,
    PERMISSIONS.MANAGE_MODELS,
    PERMISSIONS.VIEW_MODELS,
    PERMISSIONS.MANAGE_PRICING,
    PERMISSIONS.MANAGE_FEATURES,
    PERMISSIONS.VIEW_FEATURES,
    PERMISSIONS.MANAGE_PLANS,
    PERMISSIONS.VIEW_PLANS,
    PERMISSIONS.MANAGE_PROJECTS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.RUN_SIMULATIONS,
    PERMISSIONS.VIEW_SIMULATIONS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.MANAGE_REPORTS,
    PERMISSIONS.MANAGE_INTEGRATIONS,
    PERMISSIONS.VIEW_INTEGRATIONS,
    PERMISSIONS.MANAGE_API_KEYS,
    PERMISSIONS.VIEW_API_KEYS,
    PERMISSIONS.VIEW_API_USAGE,
    PERMISSIONS.MANAGE_WEBHOOKS,
    PERMISSIONS.VIEW_WEBHOOKS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.VIEW_AUDIT_LOGS
  ],

  // Finance Admin - Handles pricing and analytics
  [ROLES.FINANCE_ADMIN]: [
    PERMISSIONS.VIEW_BILLING,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.VIEW_PROVIDERS,
    PERMISSIONS.VIEW_MODELS,
    PERMISSIONS.MANAGE_PRICING,       // Can update model pricing
    PERMISSIONS.MANAGE_PLANS,
    PERMISSIONS.VIEW_PLANS,
    PERMISSIONS.VIEW_FEATURES,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.RUN_SIMULATIONS,
    PERMISSIONS.VIEW_SIMULATIONS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.MANAGE_REPORTS
  ],

  // Product Manager - Manages feature economics
  [ROLES.PRODUCT_MANAGER]: [
    PERMISSIONS.VIEW_PROVIDERS,
    PERMISSIONS.VIEW_MODELS,
    PERMISSIONS.MANAGE_FEATURES,
    PERMISSIONS.VIEW_FEATURES,
    PERMISSIONS.MANAGE_PLANS,
    PERMISSIONS.VIEW_PLANS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.RUN_SIMULATIONS,
    PERMISSIONS.VIEW_SIMULATIONS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_BILLING     // Added for subscription context
  ],

  // Developer - Manages integrations and APIs
  [ROLES.DEVELOPER]: [
    PERMISSIONS.VIEW_PROVIDERS,
    PERMISSIONS.VIEW_MODELS,
    PERMISSIONS.VIEW_FEATURES,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.VIEW_BILLING,
    PERMISSIONS.MANAGE_INTEGRATIONS,
    PERMISSIONS.VIEW_INTEGRATIONS,
    PERMISSIONS.MANAGE_API_KEYS,
    PERMISSIONS.VIEW_API_KEYS,
    PERMISSIONS.VIEW_API_USAGE,
    PERMISSIONS.MANAGE_WEBHOOKS,
    PERMISSIONS.VIEW_WEBHOOKS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_AUDIT_LOGS
  ],

  // Viewer - Read-only analytics access
  [ROLES.VIEWER]: [
    // Dashboard
    PERMISSIONS.VIEW_DASHBOARD,

    // Projects - read only
    PERMISSIONS.VIEW_PROJECTS,

    // Features - read only
    PERMISSIONS.VIEW_FEATURES,

    // Plans - read only
    PERMISSIONS.VIEW_PLANS,

    // Simulations - read only
    PERMISSIONS.VIEW_SIMULATIONS,

    // Analytics - read only
    PERMISSIONS.VIEW_ANALYTICS,

    // Reports - view and export
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS
  ]
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
};

// Pricing Unit Types
export const PRICING_UNITS = {
  PER_1K_TOKENS: 'per_1k_tokens',
  PER_1M_TOKENS: 'per_1m_tokens',
  PER_REQUEST: 'per_request',
  PER_IMAGE: 'per_image',
  PER_SECOND: 'per_second'
};

// Subscription Pricing Types
export const PRICING_TYPES = {
  FLAT_RATE: 'flat_rate',
  USAGE_BASED: 'usage_based',
  CREDIT_BASED: 'credit_based',
  TIERED: 'tiered',
  HYBRID: 'hybrid'
};

// Simulation Types
export const SIMULATION_TYPES = {
  GROWTH: 'growth',
  PRICING_CHANGE: 'pricing_change',
  CUSTOM: 'custom'
};

// Report Types
export const REPORT_TYPES = {
  COST_ANALYSIS: 'cost_analysis',
  MARGIN_ANALYSIS: 'margin_analysis',
  PROFIT_FORECAST: 'profit_forecast',
  FEATURE_USAGE: 'feature_usage'
};

// Notification Types
export const NOTIFICATION_TYPES = {
  PRICING_CHANGE: 'pricing_change',
  LOW_MARGIN: 'low_margin',
  USAGE_SPIKE: 'usage_spike',
  SYSTEM: 'system'
};

// Model Types
export const MODEL_TYPES = {
  CHAT: 'chat',
  COMPLETION: 'completion',
  EMBEDDING: 'embedding',
  IMAGE: 'image',
  AUDIO: 'audio'
};

// Provider Categories
export const PROVIDER_CATEGORIES = {
  LLM: 'llm',
  IMAGE: 'image',
  AUDIO: 'audio',
  EMBEDDING: 'embedding'
};

// Role-based Audit Log Resource Access
// Defines which resource types each role can view in audit logs
export const ROLE_AUDIT_RESOURCES = {
  [ROLES.SUPER_ADMIN]: null, // Can see all resources
  [ROLES.ORG_OWNER]: null,   // Can see all resources
  [ROLES.FINANCE_ADMIN]: ['provider', 'model', 'plan', 'feature', 'pricing_history', 'payment', 'invoice', 'subscription', 'report'],
  [ROLES.PRODUCT_MANAGER]: ['provider', 'model', 'plan', 'feature', 'simulation', 'report', 'project'],
  [ROLES.DEVELOPER]: ['integration', 'webhook', 'api_key', 'auth'],  // Only see their own activities
  [ROLES.VIEWER]: ['report']  // Only view reports
};

// Role-based Audit Log Actions
// Defines which actions each role can see in audit logs (in addition to resources)
export const ROLE_AUDIT_ACTIONS = {
  [ROLES.SUPER_ADMIN]: null, // Can see all actions
  [ROLES.ORG_OWNER]: null,   // Can see all actions
  [ROLES.FINANCE_ADMIN]: null,
  [ROLES.PRODUCT_MANAGER]: null,
  [ROLES.DEVELOPER]: ['login', 'logout', 'login_failed', 'password_reset', 'password_changed', 'email_verified', // Auth actions
                      'create', 'read', 'update', 'delete', // CRUD on their resources
                      'integration_created', 'integration_updated', 'integration_tested',
                      'api_key_created', 'api_key_revoked',
                      'webhook_created', 'webhook_updated', 'webhook_deleted'],
  [ROLES.VIEWER]: ['read', 'export', 'report_generated', 'report_exported']
};

export default {
  ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  HTTP_STATUS,
  PRICING_UNITS,
  PRICING_TYPES,
  SIMULATION_TYPES,
  REPORT_TYPES,
  NOTIFICATION_TYPES,
  MODEL_TYPES,
  PROVIDER_CATEGORIES,
  ROLE_AUDIT_RESOURCES,
  ROLE_AUDIT_ACTIONS
};