/**
 * Audit Middleware
 *
 * Automatically logs actions for audit trail.
 */

import auditService from '../services/audit.service.js';

/**
 * Extract request context for audit logging
 */
const extractContext = (req) => ({
  ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
  userAgent: req.headers['user-agent'],
  requestMethod: req.method,
  requestPath: req.path,
  requestId: req.id
});

/**
 * Map HTTP method to action type
 */
const mapMethodToAction = (method) => {
  const actionMap = {
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
    GET: 'read'
  };
  return actionMap[method] || 'read';
};

/**
 * Map resource type from path
 */
const mapPathToResourceType = (path) => {
  const pathParts = path.split('/').filter(Boolean);
  // Path format: /api/resource-type/...
  const resourceMap = {
    'auth': 'auth',
    'organizations': 'organization',
    'providers': 'provider',
    'models': 'model',
    'features': 'feature',
    'plans': 'plan',
    'projects': 'project',
    'users': 'user',
    'roles': 'role',
    'api-keys': 'api_key',
    'webhooks': 'webhook',
    'integrations': 'integration',
    'reports': 'report',
    'simulations': 'simulation',
    'settings': 'settings'
  };
  return resourceMap[pathParts[1]] || pathParts[1] || 'unknown';
};

/**
 * Audit middleware factory
 * Creates middleware that logs actions after they complete
 *
 * @param {Object} options - Configuration options
 * @param {string} options.action - Override action type
 * @param {string} options.resourceType - Override resource type
 * @param {Function} options.getResourceId - Function to extract resource ID from request
 * @param {Function} options.getResourceName - Function to extract resource name from request
 * @param {Function} options.getMetadata - Function to extract metadata from request/response
 */
export const auditLog = (options = {}) => {
  return async (req, res, next) => {
    // Skip if user is not authenticated
    if (!req.user) {
      return next();
    }

    const startTime = Date.now();

    // Store original end function
    const originalEnd = res.end;
    const originalJson = res.json;

    // Wrap res.json to capture response
    res.json = function (data) {
      // Log after response is sent
      setImmediate(() => {
        logAction(req, res, data, startTime, options);
      });
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Log the action
 */
const logAction = async (req, res, responseData, startTime, options) => {
  try {
    const { user } = req;
    const organization = user.organization?._id || user.organization;

    if (!organization) return;

    const duration = Date.now() - startTime;
    const action = options.action || mapMethodToAction(req.method);
    const resourceType = options.resourceType || mapPathToResourceType(req.path);

    // Get resource ID from params or response
    const resourceId = options.getResourceId
      ? options.getResourceId(req, responseData)
      : (req.params.id || responseData?.data?._id);

    // Get resource name from response
    const resourceName = options.getResourceName
      ? options.getResourceName(req, responseData)
      : (responseData?.data?.name || responseData?.data?.displayName || req.body?.name);

    // Determine status based on response
    const status = res.statusCode < 400 ? 'success' : 'failure';

    // Determine severity
    let severity = 'info';
    if (status === 'failure') severity = 'error';
    if (options.severity) severity = options.severity;

    // Build metadata
    const metadata = options.getMetadata
      ? options.getMetadata(req, responseData)
      : { method: req.method, path: req.path };

    // Create audit log
    await auditService.log({
      organization,
      user: user._id,
      action,
      resourceType,
      resourceId,
      resourceName,
      description: options.description || `${action} ${resourceType}`,
      context: extractContext(req),
      metadata,
      severity,
      status,
      duration,
      ...(status === 'failure' && responseData?.error && {
        error: {
          message: responseData.error.message || responseData.error,
          code: responseData.error.code
        }
      })
    });
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw - audit logging should not break the app
  }
};

/**
 * Manual audit logging helper
 * Use this in controllers for custom audit logging
 */
export const createAuditLog = async ({
  req,
  action,
  resourceType,
  resourceId,
  resourceName,
  description,
  beforeState,
  afterState,
  metadata,
  severity = 'info',
  status = 'success'
}) => {
  try {
    const { user } = req;
    const organization = user.organization?._id || user.organization;

    if (!organization) return null;

    return auditService.logWithDiff({
      organization,
      user: user._id,
      action,
      resourceType,
      resourceId,
      resourceName,
      description,
      beforeState,
      afterState,
      context: extractContext(req),
      metadata,
      severity,
      status
    });
  } catch (error) {
    console.error('Manual audit logging error:', error);
    return null;
  }
};

/**
 * Pre-defined audit loggers for common actions
 */
export const auditLoggers = {
  // Authentication
  login: (options = {}) => auditLog({
    action: 'login',
    resourceType: 'auth',
    description: 'User logged in',
    ...options
  }),

  logout: (options = {}) => auditLog({
    action: 'logout',
    resourceType: 'auth',
    description: 'User logged out',
    ...options
  }),

  loginFailed: (options = {}) => auditLog({
    action: 'login_failed',
    resourceType: 'auth',
    description: 'Failed login attempt',
    severity: 'warning',
    ...options
  }),

  // CRUD Operations
  create: (resourceType, options = {}) => auditLog({
    action: 'create',
    resourceType,
    getResourceId: (req, res) => res?.data?._id,
    getResourceName: (req, res) => res?.data?.name || res?.data?.displayName,
    description: `Created ${resourceType}`,
    ...options
  }),

  update: (resourceType, options = {}) => auditLog({
    action: 'update',
    resourceType,
    getResourceId: (req) => req.params.id,
    description: `Updated ${resourceType}`,
    ...options
  }),

  delete: (resourceType, options = {}) => auditLog({
    action: 'delete',
    resourceType,
    getResourceId: (req) => req.params.id,
    description: `Deleted ${resourceType}`,
    ...options
  }),

  // Organization
  organizationCreated: auditLog({
    action: 'organization_created',
    resourceType: 'organization',
    getResourceId: (req, res) => res?.data?._id,
    description: 'Organization created'
  }),

  organizationUpdated: auditLog({
    action: 'organization_updated',
    resourceType: 'organization',
    getResourceId: (req) => req.params.id,
    description: 'Organization updated'
  }),

  // Project
  projectCreated: auditLog({
    action: 'project_created',
    resourceType: 'project',
    getResourceId: (req, res) => res?.data?._id,
    description: 'Project created'
  }),

  projectUpdated: auditLog({
    action: 'project_updated',
    resourceType: 'project',
    getResourceId: (req) => req.params.id,
    description: 'Project updated'
  }),

  // Provider
  providerCreated: auditLog({
    action: 'provider_created',
    resourceType: 'provider',
    getResourceId: (req, res) => res?.data?._id,
    description: 'Provider created'
  }),

  providerUpdated: auditLog({
    action: 'provider_updated',
    resourceType: 'provider',
    getResourceId: (req) => req.params.id,
    description: 'Provider updated'
  }),

  // Model
  modelCreated: auditLog({
    action: 'model_created',
    resourceType: 'model',
    getResourceId: (req, res) => res?.data?._id,
    description: 'AI model created'
  }),

  modelUpdated: auditLog({
    action: 'model_updated',
    resourceType: 'model',
    getResourceId: (req) => req.params.id,
    description: 'AI model updated'
  }),

  pricingUpdated: auditLog({
    action: 'pricing_updated',
    resourceType: 'model',
    getResourceId: (req) => req.params.id,
    description: 'Model pricing updated'
  }),

  // Feature
  featureCreated: auditLog({
    action: 'create',
    resourceType: 'feature',
    getResourceId: (req, res) => res?.data?._id,
    description: 'Feature created'
  }),

  featureUpdated: auditLog({
    action: 'update',
    resourceType: 'feature',
    getResourceId: (req) => req.params.id,
    description: 'Feature updated'
  }),

  // Plan
  planCreated: auditLog({
    action: 'plan_created',
    resourceType: 'plan',
    getResourceId: (req, res) => res?.data?._id,
    description: 'Plan created'
  }),

  planUpdated: auditLog({
    action: 'plan_updated',
    resourceType: 'plan',
    getResourceId: (req) => req.params.id,
    description: 'Plan updated'
  }),

  // User
  userInvited: auditLog({
    action: 'user_invited',
    resourceType: 'user',
    description: 'User invited to organization'
  }),

  userRemoved: auditLog({
    action: 'user_removed',
    resourceType: 'user',
    getResourceId: (req) => req.params.id,
    description: 'User removed from organization'
  }),

  roleChanged: auditLog({
    action: 'role_changed',
    resourceType: 'user',
    getResourceId: (req) => req.params.id,
    description: 'User role changed'
  }),

  // API Key
  apiKeyCreated: auditLog({
    action: 'api_key_created',
    resourceType: 'api_key',
    getResourceId: (req, res) => res?.data?._id,
    description: 'API key created'
  }),

  apiKeyRevoked: auditLog({
    action: 'api_key_revoked',
    resourceType: 'api_key',
    getResourceId: (req) => req.params.id,
    description: 'API key revoked'
  }),

  // Webhook
  webhookCreated: auditLog({
    action: 'webhook_created',
    resourceType: 'webhook',
    getResourceId: (req, res) => res?.data?._id,
    description: 'Webhook created'
  }),

  webhookDeleted: auditLog({
    action: 'webhook_deleted',
    resourceType: 'webhook',
    getResourceId: (req) => req.params.id,
    description: 'Webhook deleted'
  }),

  // Integration
  integrationCreated: auditLog({
    action: 'integration_created',
    resourceType: 'integration',
    getResourceId: (req, res) => res?.data?._id,
    description: 'Integration created'
  }),

  // Settings
  settingsUpdated: auditLog({
    action: 'settings_updated',
    resourceType: 'settings',
    description: 'Settings updated'
  })
};

export default {
  auditLog,
  createAuditLog,
  auditLoggers
};