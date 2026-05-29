/**
 * User Repository
 *
 * Repository for User model operations.
 * Extends BaseRepository with user-specific methods.
 */

import BaseRepository from './base.repository.js';
import User from '../models/User.js';

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} User document
   */
  async findByEmail(email, options = {}) {
    return await this.findOne({ email: email.toLowerCase() }, options);
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} User document
   */
  async findByUsername(username, options = {}) {
    return await this.findOne({ username }, options);
  }

  /**
   * Find active users
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of active users
   */
  async findActive(options = {}) {
    return await this.find({ isActive: true }, options);
  }

  /**
   * Find users by organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of users
   */
  async findByOrganization(organizationId, options = {}) {
    return await this.find({ organization: organizationId }, options);
  }

  /**
   * Find users by role
   * @param {string} roleId - Role ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of users
   */
  async findByRole(roleId, options = {}) {
    return await this.find({ role: roleId }, options);
  }

  /**
   * Update user password
   * @param {string} userId - User ID
   * @param {string} hashedPassword - Hashed password
   * @returns {Promise<Object|null>} Updated user
   */
  async updatePassword(userId, hashedPassword) {
    return await this.findByIdAndUpdate(userId, { password: hashedPassword });
  }

  /**
   * Verify user email
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Updated user
   */
  async verifyEmail(userId) {
    return await this.findByIdAndUpdate(userId, {
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    });
  }

  /**
   * Enable two-factor authentication
   * @param {string} userId - User ID
   * @param {string} secret - Two-factor secret
   * @returns {Promise<Object|null>} Updated user
   */
  async enableTwoFactor(userId, secret) {
    return await this.findByIdAndUpdate(userId, {
      twoFactorEnabled: true,
      twoFactorSecret: secret
    });
  }

  /**
   * Disable two-factor authentication
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Updated user
   */
  async disableTwoFactor(userId) {
    return await this.findByIdAndUpdate(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null
    });
  }

  /**
   * Update last login
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Updated user
   */
  async updateLastLogin(userId) {
    return await this.findByIdAndUpdate(userId, {
      lastLoginAt: new Date()
    });
  }

  /**
   * Search users
   * @param {string} query - Search query
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  async search(query, options = {}) {
    const { page = 1, limit = 10, organization } = options;
    const conditions = {
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    };

    if (organization) {
      conditions.organization = organization;
    }

    return await this.findWithPagination(conditions, {
      ...options,
      page,
      limit,
      select: '-password -twoFactorSecret'
    });
  }
}

export default new UserRepository();