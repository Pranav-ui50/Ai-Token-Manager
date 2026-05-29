/**
 * ApiKey Service
 *
 * Handles all API key-related business logic.
 * FR-48: API Credential Management
 */

import ApiKey from '../models/ApiKey.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class ApiKeyService {
  /**
   * Create a new API key
   * @param {Object} data - API key data
   * @param {string} userId - User ID
   * @returns {Object} Created API key with plain text key (only returned once)
   */
  async create(data, userId) {
    const { organizationId, name, description, permissions, scopes, rateLimit, expiresAt, allowedIps, allowedReferrers } = data;

    logger.info(`[ApiKeyService] Creating API key: ${name} for user: ${userId}`);

    // Check for duplicate name within organization
    const existing = await ApiKey.findOne({
      organization: organizationId,
      name: name
    });

    if (existing) {
      throw new AppError('API key with this name already exists', 409, 'DUPLICATE_ERROR');
    }

    // Generate a new API key
    const plainKey = ApiKey.generateKey();
    const keyHash = ApiKey.hashKey(plainKey);
    const keyLast4 = ApiKey.getLast4(plainKey);

    // Create API key
    const apiKey = await ApiKey.create({
      organization: organizationId,
      user: userId,
      name,
      description,
      keyHash,
      keyLast4,
      permissions: permissions || [],
      scopes: scopes || [],
      rateLimit: rateLimit || {},
      expiresAt: expiresAt || null,
      allowedIps: allowedIps || [],
      allowedReferrers: allowedReferrers || [],
      createdBy: userId
    });

    await apiKey.populate('user', 'firstName lastName email');
    await apiKey.populate('organization', 'name');

    logger.info(`[ApiKeyService] API key created: ${apiKey._id}`);

    // Return with plain text key (only time it's shown)
    return {
      ...apiKey.toObject(),
      plainKey // Include plain key only in creation response
    };
  }

  /**
   * Get API key by ID
   * @param {string} keyId - API key ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} API key
   */
  async getById(keyId, organizationId) {
    const apiKey = await ApiKey.findOne({
      _id: keyId,
      organization: organizationId
    }).populate('user', 'firstName lastName email');

    if (!apiKey) {
      throw new AppError('API key not found', 404, 'NOT_FOUND');
    }

    return apiKey;
  }

  /**
   * Get all API keys for organization
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} API keys with pagination
   */
  async getForOrganization(organizationId, filters = {}) {
    const { status, userId, page = 1, limit = 10 } = filters;

    const query = { organization: organizationId };

    if (status) {
      query.status = status;
    }

    if (userId) {
      query.user = userId;
    }

    const skip = (page - 1) * limit;

    const apiKeys = await ApiKey.find(query)
      .populate('user', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ApiKey.countDocuments(query);

    return {
      apiKeys,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get all API keys for a user
   * @param {string} userId - User ID
   * @returns {Array} API keys
   */
  async getForUser(userId) {
    const apiKeys = await ApiKey.find({ user: userId, status: 'active' })
      .populate('organization', 'name')
      .sort({ createdAt: -1 });

    return apiKeys;
  }

  /**
   * Update API key
   * @param {string} keyId - API key ID
   * @param {Object} data - Update data
   * @param {string} organizationId - Organization ID
   * @returns {Object} Updated API key
   */
  async update(keyId, data, organizationId) {
    const apiKey = await ApiKey.findOne({
      _id: keyId,
      organization: organizationId
    });

    if (!apiKey) {
      throw new AppError('API key not found', 404, 'NOT_FOUND');
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'permissions', 'scopes', 'rateLimit', 'allowedIps', 'allowedReferrers'];
    allowedUpdates.forEach(field => {
      if (data[field] !== undefined) {
        apiKey[field] = data[field];
      }
    });

    await apiKey.save();

    await apiKey.populate('user', 'firstName lastName email');
    await apiKey.populate('organization', 'name');

    logger.info(`[ApiKeyService] API key updated: ${keyId}`);

    return apiKey;
  }

  /**
   * Regenerate API key
   * @param {string} keyId - API key ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} New API key with plain text key
   */
  async regenerate(keyId, organizationId) {
    const apiKey = await ApiKey.findOne({
      _id: keyId,
      organization: organizationId
    });

    if (!apiKey) {
      throw new AppError('API key not found', 404, 'NOT_FOUND');
    }

    // Generate new key
    const plainKey = ApiKey.generateKey();
    const keyHash = ApiKey.hashKey(plainKey);
    const keyLast4 = ApiKey.getLast4(plainKey);

    // Update API key
    apiKey.keyHash = keyHash;
    apiKey.keyLast4 = keyLast4;
    apiKey.usageCount = { total: 0, lastDay: 0, lastWeek: 0, lastMonth: 0 };
    apiKey.lastUsedAt = null;
    apiKey.status = 'active';

    await apiKey.save();

    await apiKey.populate('user', 'firstName lastName email');
    await apiKey.populate('organization', 'name');

    logger.info(`[ApiKeyService] API key regenerated: ${keyId}`);

    return {
      ...apiKey.toObject(),
      plainKey // Include plain key only in regeneration response
    };
  }

  /**
   * Revoke API key
   * @param {string} keyId - API key ID
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User performing the action
   * @param {string} reason - Reason for revocation
   * @returns {Object} Revoked API key
   */
  async revoke(keyId, organizationId, userId, reason = null) {
    const apiKey = await ApiKey.findOne({
      _id: keyId,
      organization: organizationId
    });

    if (!apiKey) {
      throw new AppError('API key not found', 404, 'NOT_FOUND');
    }

    if (apiKey.status === 'revoked') {
      throw new AppError('API key is already revoked', 400, 'ALREADY_REVOKED');
    }

    await apiKey.revoke(userId, reason);

    await apiKey.populate('user', 'firstName lastName email');

    logger.info(`[ApiKeyService] API key revoked: ${keyId}`);

    return apiKey;
  }

  /**
   * Delete API key
   * @param {string} keyId - API key ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Success message
   */
  async delete(keyId, organizationId) {
    const apiKey = await ApiKey.findOneAndDelete({
      _id: keyId,
      organization: organizationId
    });

    if (!apiKey) {
      throw new AppError('API key not found', 404, 'NOT_FOUND');
    }

    logger.info(`[ApiKeyService] API key deleted: ${keyId}`);

    return { message: 'API key deleted successfully' };
  }

  /**
   * Validate API key
   * @param {string} key - API key
   * @param {string} ip - Client IP
   * @param {string} userAgent - Client user agent
   * @returns {Object} API key and associated user/org
   */
  async validate(key, ip = null, userAgent = null) {
    if (!ApiKey.isValidFormat(key)) {
      throw new AppError('Invalid API key format', 401, 'INVALID_API_KEY');
    }

    const apiKey = await ApiKey.findAndValidate(key, ip, userAgent);

    if (!apiKey) {
      throw new AppError('Invalid or expired API key', 401, 'INVALID_API_KEY');
    }

    // Check if user and organization are active
    if (!apiKey.user || !apiKey.user.isActive) {
      throw new AppError('User account is inactive', 401, 'USER_INACTIVE');
    }

    if (!apiKey.organization || !apiKey.organization.isActive) {
      throw new AppError('Organization is inactive', 401, 'ORGANIZATION_INACTIVE');
    }

    return {
      apiKey,
      user: apiKey.user,
      organization: apiKey.organization
    };
  }

  /**
   * Check if API key has permission
   * @param {Object} apiKey - API key document
   * @param {string} permission - Permission to check
   * @returns {boolean} Has permission
   */
  hasPermission(apiKey, permission) {
    return apiKey.hasPermission(permission);
  }

  /**
   * Check if API key has scope
   * @param {Object} apiKey - API key document
   * @param {string} resource - Resource to check
   * @param {string} action - Action to check
   * @returns {boolean} Has scope
   */
  hasScope(apiKey, resource, action) {
    return apiKey.hasScope(resource, action);
  }

  /**
   * Get API key usage statistics
   * @param {string} keyId - API key ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Usage statistics
   */
  async getUsageStats(keyId, organizationId) {
    const apiKey = await ApiKey.findOne({
      _id: keyId,
      organization: organizationId
    });

    if (!apiKey) {
      throw new AppError('API key not found', 404, 'NOT_FOUND');
    }

    return {
      total: apiKey.usageCount.total,
      lastDay: apiKey.usageCount.lastDay,
      lastWeek: apiKey.usageCount.lastWeek,
      lastMonth: apiKey.usageCount.lastMonth,
      lastUsedAt: apiKey.lastUsedAt,
      lastUsedIp: apiKey.lastUsedIp
    };
  }

  /**
   * Update usage statistics
   * @param {string} keyId - API key ID
   * @param {string} ip - Client IP
   * @param {string} userAgent - Client user agent
   */
  async updateUsageStats(keyId, ip = null, userAgent = null) {
    await ApiKey.findByIdAndUpdate(keyId, {
      $inc: { 'usageCount.total': 1 },
      lastUsedAt: new Date(),
      lastUsedIp: ip,
      lastUsedUserAgent: userAgent
    });
  }

  /**
   * Clean up expired API keys
   * @returns {number} Number of keys cleaned
   */
  async cleanupExpired() {
    const result = await ApiKey.updateMany(
      { expiresAt: { $lt: new Date() }, status: 'active' },
      { status: 'expired' }
    );

    logger.info(`[ApiKeyService] Cleaned up ${result.modifiedCount} expired API keys`);

    return result.modifiedCount;
  }
}

export default new ApiKeyService();