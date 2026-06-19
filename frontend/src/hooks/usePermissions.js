/**
 * Permissions Hook
 *
 * Provides permission checking utilities based on user role.
 * Based on SRS document - SaaS Pricing Calculator for AI API Token Cost Management
 */

import { useAuth } from './useAuth.js';
import { useOrganization } from '../context/OrganizationContext.jsx';

// Role hierarchy - higher number = more permissions
const ROLE_HIERARCHY = {
  super_admin: 100,
  org_owner: 90,
  finance_admin: 70,
  product_manager: 60,
  developer: 50,
  viewer: 10
};

// Permission definitions
const PERMISSIONS = {
  // Platform Management
  MANAGE_PLATFORM: 'manage_platform',
  MANAGE_ALL_ORGANIZATIONS: 'manage_all_organizations',

  // Organization Management
  MANAGE_ORGANIZATION: 'manage_organization',
  MANAGE_TEAM: 'manage_team',
  MANAGE_BILLING: 'manage_billing',
  MANAGE_SUBSCRIPTIONS: 'manage_subscriptions',

  // Provider Management
  MANAGE_PROVIDERS: 'manage_providers',
  VIEW_PROVIDERS: 'view_providers',

  // Model Management
  MANAGE_MODELS: 'manage_models',
  VIEW_MODELS: 'view_models',
  MANAGE_PRICING: 'manage_pricing',

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

// Role permissions mapping (as per SRS requirements)
const ROLE_PERMISSIONS = {
  // Super Admin - Manages entire platform
  super_admin: Object.values(PERMISSIONS),

  // Organization Owner - Controls organization workspace
  org_owner: [
    PERMISSIONS.MANAGE_ORGANIZATION,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.MANAGE_BILLING,
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
  finance_admin: [
    PERMISSIONS.VIEW_PROVIDERS,
    PERMISSIONS.VIEW_MODELS,
    PERMISSIONS.MANAGE_PRICING,
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

  // Product Manager - Manages features, token estimates, and model mapping
  // Note: Cannot create/edit/delete AI models - that's admin only
  // Note: Cannot run simulations - that's finance/admin role
  product_manager: [
    PERMISSIONS.VIEW_PROVIDERS,
    PERMISSIONS.VIEW_MODELS,  // Can only view models for mapping to features
    PERMISSIONS.MANAGE_FEATURES,  // Create, edit, delete features
    PERMISSIONS.VIEW_FEATURES,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.VIEW_ANALYTICS,  // Product analytics only (feature usage, token consumption)
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS
  ],

  // Developer - Manages integrations and APIs
  developer: [
    PERMISSIONS.VIEW_PROVIDERS,
    PERMISSIONS.VIEW_MODELS,
    PERMISSIONS.VIEW_FEATURES,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.MANAGE_INTEGRATIONS,
    PERMISSIONS.VIEW_INTEGRATIONS,
    PERMISSIONS.MANAGE_API_KEYS,
    PERMISSIONS.VIEW_API_KEYS,
    PERMISSIONS.VIEW_API_USAGE,
    PERMISSIONS.MANAGE_WEBHOOKS,
    PERMISSIONS.VIEW_WEBHOOKS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_DASHBOARD
  ],

  // Viewer - Read-only access across organization
  viewer: [
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

/**
 * Hook to check user permissions
 */
export function usePermissions() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  /**
   * Get the current user's role
   */
  const getUserRole = () => {
    if (!user) return null;

    // Check if user has role object or role name
    const roleName = user.role?.name || user.role || 'viewer';
    return roleName;
  };

  /**
   * Get the role's permission level
   */
  const getRoleLevel = () => {
    const role = getUserRole();
    return ROLE_HIERARCHY[role] || 0;
  };

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission) => {
    const role = getUserRole();
    if (!role) return false;

    // Super admin has all permissions
    if (role === 'super_admin') return true;

    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    return rolePermissions.includes(permission);
  };

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = (permissions) => {
    if (!Array.isArray(permissions)) {
      return hasPermission(permissions);
    }
    return permissions.some(perm => hasPermission(perm));
  };

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = (permissions) => {
    if (!Array.isArray(permissions)) {
      return hasPermission(permissions);
    }
    return permissions.every(perm => hasPermission(perm));
  };

  /**
   * Check if user can create/edit resources (manage)
   */
  const canManage = (resourceType) => {
    const managePerm = `manage_${resourceType}`;
    return hasPermission(managePerm);
  };

  /**
   * Check if user can view resources
   */
  const canView = (resourceType) => {
    const viewPerm = `view_${resourceType}`;
    return hasPermission(viewPerm);
  };

  /**
   * Check if user's role is at least the specified level
   */
  const isAtLeast = (roleName) => {
    const currentLevel = getRoleLevel();
    const requiredLevel = ROLE_HIERARCHY[roleName] || 0;
    return currentLevel >= requiredLevel;
  };

  /**
   * Check if user is owner/admin
   */
  const isOwner = () => {
    const role = getUserRole();
    return role === 'super_admin' || role === 'org_owner';
  };

  /**
   * Check if user is super admin
   */
  const isSuperAdmin = () => {
    return getUserRole() === 'super_admin';
  };

  /**
   * Check if user can manage team members
   */
  const canManageTeam = () => {
    return hasPermission(PERMISSIONS.MANAGE_TEAM);
  };

  /**
   * Check if user can manage billing
   */
  const canManageBilling = () => {
    return hasPermission(PERMISSIONS.MANAGE_BILLING);
  };

  /**
   * Check if user can manage settings
   */
  const canManageSettings = () => {
    return hasPermission(PERMISSIONS.MANAGE_SETTINGS);
  };

  /**
   * Check if user can manage models (only super_admin)
   */
  const canManageModels = () => {
    const role = getUserRole();
    return role === 'super_admin';
  };

  /**
   * Check if user can manage pricing (finance_admin and above)
   */
  const canManagePricing = () => {
    return hasPermission(PERMISSIONS.MANAGE_PRICING);
  };

  /**
   * Check if user can create/edit features
   */
  const canManageFeatures = () => {
    return hasPermission(PERMISSIONS.MANAGE_FEATURES);
  };

  /**
   * Check if user can manage plans
   */
  const canManagePlans = () => {
    return hasPermission(PERMISSIONS.MANAGE_PLANS);
  };

  /**
   * Check if user can manage projects
   */
  const canManageProjects = () => {
    return hasPermission(PERMISSIONS.MANAGE_PROJECTS);
  };

  /**
   * Check if user can run simulations
   */
  const canRunSimulations = () => {
    return hasPermission(PERMISSIONS.RUN_SIMULATIONS);
  };

  /**
   * Check if user can export reports
   */
  const canExportReports = () => {
    return hasPermission(PERMISSIONS.EXPORT_REPORTS);
  };

  /**
   * Check if user can manage integrations
   */
  const canManageIntegrations = () => {
    return hasPermission(PERMISSIONS.MANAGE_INTEGRATIONS);
  };

  /**
   * Check if user can manage API keys
   */
  const canManageApiKeys = () => {
    return hasPermission(PERMISSIONS.MANAGE_API_KEYS);
  };

  /**
   * Check if user can manage webhooks
   */
  const canManageWebhooks = () => {
    return hasPermission(PERMISSIONS.MANAGE_WEBHOOKS);
  };

  /**
   * Check if user can view dashboard
   */
  const canViewDashboard = () => {
    return hasPermission(PERMISSIONS.VIEW_DASHBOARD);
  };

  /**
   * Check if user can view analytics
   */
  const canViewAnalytics = () => {
    return hasPermission(PERMISSIONS.VIEW_ANALYTICS);
  };

  /**
   * Check if user can view reports
   */
  const canViewReports = () => {
    return hasPermission(PERMISSIONS.VIEW_REPORTS);
  };

  /**
   * Check if user can view audit logs
   */
  const canViewAuditLogs = () => {
    return hasPermission(PERMISSIONS.VIEW_AUDIT_LOGS);
  };

  return {
    role: getUserRole(),
    roleLevel: getRoleLevel(),
    permissions: ROLE_PERMISSIONS[getUserRole()] || [],
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canManage,
    canView,
    isAtLeast,
    isOwner,
    isSuperAdmin,
    canManageTeam,
    canManageBilling,
    canManageSettings,
    canManageModels,
    canManagePricing,
    canManageFeatures,
    canManagePlans,
    canManageProjects,
    canRunSimulations,
    canExportReports,
    canManageIntegrations,
    canManageApiKeys,
    canManageWebhooks,
    canViewDashboard,
    canViewAnalytics,
    canViewReports,
    canViewAuditLogs,
    PERMISSIONS
  };
}

export { PERMISSIONS, ROLE_HIERARCHY };
export default usePermissions;