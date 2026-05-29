/**
 * Organization Repository
 *
 * Repository for Organization model operations.
 * Extends BaseRepository with organization-specific methods.
 */

import BaseRepository from './base.repository.js';
import Organization from '../models/Organization.js';

class OrganizationRepository extends BaseRepository {
  constructor() {
    super(Organization);
  }

  /**
   * Find organization by slug
   * @param {string} slug - Organization slug
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Organization document
   */
  async findBySlug(slug, options = {}) {
    return await this.findOne({ slug: slug.toLowerCase(), isActive: true }, options);
  }

  /**
   * Find organizations by owner
   * @param {string} ownerId - Owner user ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of organizations
   */
  async findByOwner(ownerId, options = {}) {
    return await this.find({ owner: ownerId, isActive: true }, options);
  }

  /**
   * Find organizations where user is a member
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of organizations
   */
  async findByMember(userId, options = {}) {
    return await this.find(
      { 'members.user': userId, isActive: true },
      options
    );
  }

  /**
   * Find active organizations
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of organizations
   */
  async findActive(options = {}) {
    return await this.find({ isActive: true }, options);
  }

  /**
   * Add member to organization
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID to add
   * @param {string} roleId - Role ID
   * @param {string} invitedBy - User who invited
   * @returns {Promise<Object|null>} Updated organization
   */
  async addMember(organizationId, userId, roleId, invitedBy = null) {
    return await this.findByIdAndUpdate(organizationId, {
      $push: {
        members: {
          user: userId,
          role: roleId,
          joinedAt: new Date(),
          invitedBy
        }
      }
    });
  }

  /**
   * Remove member from organization
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID to remove
   * @returns {Promise<Object|null>} Updated organization
   */
  async removeMember(organizationId, userId) {
    return await this.findByIdAndUpdate(organizationId, {
      $pull: { members: { user: userId } }
    });
  }

  /**
   * Update member role
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @param {string} roleId - New role ID
   * @returns {Promise<Object|null>} Updated organization
   */
  async updateMemberRole(organizationId, userId, roleId) {
    return await this.findOneAndUpdate(
      { _id: organizationId, 'members.user': userId },
      { $set: { 'members.$.role': roleId } },
      { new: true }
    );
  }

  /**
   * Update subscription
   * @param {string} organizationId - Organization ID
   * @param {Object} subscription - Subscription data
   * @returns {Promise<Object|null>} Updated organization
   */
  async updateSubscription(organizationId, subscription) {
    return await this.findByIdAndUpdate(organizationId, {
      subscription: { ...subscription, updatedAt: new Date() }
    });
  }

  /**
   * Add payment method
   * @param {string} organizationId - Organization ID
   * @param {Object} paymentMethod - Payment method data
   * @returns {Promise<Object|null>} Updated organization
   */
  async addPaymentMethod(organizationId, paymentMethod) {
    // If this is the first payment method, make it default
    const org = await this.findById(organizationId);
    const isDefault = !org.paymentMethods || org.paymentMethods.length === 0;

    return await this.findByIdAndUpdate(organizationId, {
      $push: {
        paymentMethods: {
          ...paymentMethod,
          isDefault,
          addedAt: new Date()
        }
      }
    });
  }

  /**
   * Remove payment method
   * @param {string} organizationId - Organization ID
   * @param {string} methodId - Payment method ID
   * @returns {Promise<Object|null>} Updated organization
   */
  async removePaymentMethod(organizationId, methodId) {
    return await this.findByIdAndUpdate(organizationId, {
      $pull: { paymentMethods: { id: methodId } }
    });
  }

  /**
   * Set default payment method
   * @param {string} organizationId - Organization ID
   * @param {string} methodId - Payment method ID
   * @returns {Promise<Object|null>} Updated organization
   */
  async setDefaultPaymentMethod(organizationId, methodId) {
    const org = await this.findById(organizationId);

    // First, unset all defaults
    const updatedMethods = org.paymentMethods.map(method => ({
      ...method.toObject(),
      isDefault: method.id === methodId
    }));

    return await this.findByIdAndUpdate(organizationId, {
      paymentMethods: updatedMethods
    });
  }

  /**
   * Search organizations
   * @param {string} query - Search query
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  async search(query, options = {}) {
    const { page = 1, limit = 10 } = options;

    return await this.findWithPagination(
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ],
        isActive: true
      },
      { ...options, page, limit }
    );
  }

  /**
   * Get organization statistics
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Organization statistics
   */
  async getStatistics(organizationId) {
    const Project = (await import('../models/Project.js')).default;
    const Feature = (await import('../models/Feature.js')).default;
    const User = (await import('../models/User.js')).default;

    const [projectCount, featureCount, memberCount] = await Promise.all([
      Project.countDocuments({ organization: organizationId, isActive: true }),
      Feature.countDocuments({ organization: organizationId, isActive: true }),
      User.countDocuments({ organization: organizationId, isActive: true })
    ]);

    return {
      projects: projectCount,
      features: featureCount,
      members: memberCount
    };
  }
}

export default new OrganizationRepository();