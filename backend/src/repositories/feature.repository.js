/**
 * Feature Repository
 *
 * Repository for Feature model operations.
 * Extends BaseRepository with feature-specific methods.
 */

import BaseRepository from './base.repository.js';
import Feature from '../models/Feature.js';
import mongoose from 'mongoose';

class FeatureRepository extends BaseRepository {
  constructor() {
    super(Feature);
  }

  /**
   * Find features by organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of features
   */
  async findByOrganization(organizationId, options = {}) {
    return await this.find({ organization: organizationId, isActive: true }, options);
  }

  /**
   * Find features by project
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of features
   */
  async findByProject(projectId, options = {}) {
    return await this.find({ project: projectId, isActive: true }, options);
  }

  /**
   * Find features by provider
   * @param {string} providerId - Provider ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of features
   */
  async findByProvider(providerId, options = {}) {
    return await this.find({ provider: providerId, isActive: true }, options);
  }

  /**
   * Find feature by slug within organization
   * @param {string} organizationId - Organization ID
   * @param {string} slug - Feature slug
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Feature document
   */
  async findBySlug(organizationId, slug, options = {}) {
    return await this.findOne({
      organization: organizationId,
      slug,
      isActive: true
    }, options);
  }

  /**
   * Find features with usage statistics
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Features with stats
   */
  async findWithStats(organizationId, options = {}) {
    return await this.find(
      { organization: organizationId, isActive: true },
      { ...options, populate: ['provider', 'model', 'plan'] }
    );
  }

  /**
   * Get usage statistics for organization
   * @param {string} organizationId - Organization ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats(organizationId, startDate, endDate) {
    const stats = await this.aggregate([
      {
        $match: {
          organization: mongoose.Types.ObjectId.createFromHexString(organizationId),
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: '$stats.totalRequests' },
          totalTokens: { $sum: '$stats.totalTokens' },
          inputTokens: { $sum: '$stats.inputTokens' },
          outputTokens: { $sum: '$stats.outputTokens' },
          totalCost: { $sum: '$stats.totalCost' },
          avgLatency: { $avg: '$stats.avgLatency' },
          errorCount: { $sum: '$stats.errorCount' }
        }
      }
    ]);

    return stats[0] || {
      totalRequests: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
      avgLatency: 0,
      errorCount: 0
    };
  }

  /**
   * Get top features by cost
   * @param {string} organizationId - Organization ID
   * @param {number} limit - Number of features to return
   * @returns {Promise<Array>} Top features
   */
  async getTopFeatures(organizationId, limit = 10) {
    return await this.find(
      { organization: organizationId, isActive: true },
      { sort: { 'stats.totalCost': -1 }, limit }
    );
  }

  /**
   * Update feature statistics
   * @param {string} featureId - Feature ID
   * @param {Object} statsUpdate - Statistics update
   * @returns {Promise<Object|null>} Updated feature
   */
  async updateStats(featureId, statsUpdate) {
    return await this.findByIdAndUpdate(featureId, {
      $inc: {
        'stats.totalRequests': statsUpdate.requests || 0,
        'stats.totalTokens': statsUpdate.tokens || 0,
        'stats.inputTokens': statsUpdate.inputTokens || 0,
        'stats.outputTokens': statsUpdate.outputTokens || 0,
        'stats.totalCost': statsUpdate.cost || 0,
        'stats.errorCount': statsUpdate.errors || 0
      }
    });
  }

  /**
   * Increment request count
   * @param {string} featureId - Feature ID
   * @param {number} tokens - Tokens used
   * @param {number} cost - Cost in dollars
   * @returns {Promise<void>}
   */
  async incrementUsage(featureId, tokens = 0, cost = 0) {
    await this.updateOne(
      { _id: featureId },
      {
        $inc: {
          'stats.totalRequests': 1,
          'stats.totalTokens': tokens,
          'stats.totalCost': cost
        }
      }
    );
  }

  /**
   * Search features
   * @param {string} organizationId - Organization ID
   * @param {string} query - Search query
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  async search(organizationId, query, options = {}) {
    const { page = 1, limit = 10 } = options;

    return await this.findWithPagination(
      {
        organization: organizationId,
        isActive: true,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      },
      { ...options, page, limit }
    );
  }

  /**
   * Get feature count by project
   * @param {string} projectId - Project ID
   * @returns {Promise<number>} Feature count
   */
  async countByProject(projectId) {
    return await this.count({ project: projectId, isActive: true });
  }

  /**
   * Bulk update features
   * @param {Array} updates - Array of updates
   * @returns {Promise<void>}
   */
  async bulkUpdate(updates) {
    const bulkOps = updates.map(({ id, ...update }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: update }
      }
    }));

    await this.model.bulkWrite(bulkOps);
  }
}

export default new FeatureRepository();