/**
 * Project Repository
 *
 * Repository for Project model operations.
 * Extends BaseRepository with project-specific methods.
 */

import BaseRepository from './base.repository.js';
import Project from '../models/Project.js';

class ProjectRepository extends BaseRepository {
  constructor() {
    super(Project);
  }

  /**
   * Find projects by organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of projects
   */
  async findByOrganization(organizationId, options = {}) {
    return await this.find(
      { organization: organizationId, isActive: true },
      { ...options, populate: ['features', 'owner'] }
    );
  }

  /**
   * Find projects by owner
   * @param {string} ownerId - Owner user ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of projects
   */
  async findByOwner(ownerId, options = {}) {
    return await this.find({ owner: ownerId, isActive: true }, options);
  }

  /**
   * Find project by slug within organization
   * @param {string} organizationId - Organization ID
   * @param {string} slug - Project slug
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Project document
   */
  async findBySlug(organizationId, slug, options = {}) {
    return await this.findOne({
      organization: organizationId,
      slug,
      isActive: true
    }, options);
  }

  /**
   * Find projects with features
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Projects with populated features
   */
  async findWithFeatures(organizationId, options = {}) {
    return await this.find(
      { organization: organizationId, isActive: true },
      { ...options, populate: { path: 'features', match: { isActive: true } } }
    );
  }

  /**
   * Add feature to project
   * @param {string} projectId - Project ID
   * @param {string} featureId - Feature ID
   * @returns {Promise<Object|null>} Updated project
   */
  async addFeature(projectId, featureId) {
    return await this.findByIdAndUpdate(projectId, {
      $addToSet: { features: featureId }
    });
  }

  /**
   * Remove feature from project
   * @param {string} projectId - Project ID
   * @param {string} featureId - Feature ID
   * @returns {Promise<Object|null>} Updated project
   */
  async removeFeature(projectId, featureId) {
    return await this.findByIdAndUpdate(projectId, {
      $pull: { features: featureId }
    });
  }

  /**
   * Update project settings
   * @param {string} projectId - Project ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object|null>} Updated project
   */
  async updateSettings(projectId, settings) {
    return await this.findByIdAndUpdate(projectId, {
      $set: { settings }
    });
  }

  /**
   * Search projects
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
   * Get project statistics
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project statistics
   */
  async getStatistics(projectId) {
    const Feature = (await import('../models/Feature.js')).default;

    const featureCount = await Feature.countDocuments({
      project: projectId,
      isActive: true
    });

    const featureStats = await Feature.aggregate([
      {
        $match: {
          project: projectId,
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: '$stats.totalRequests' },
          totalTokens: { $sum: '$stats.totalTokens' },
          totalCost: { $sum: '$stats.totalCost' }
        }
      }
    ]);

    const stats = featureStats[0] || {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0
    };

    return {
      featureCount,
      ...stats
    };
  }

  /**
   * Archive project (soft delete)
   * @param {string} projectId - Project ID
   * @returns {Promise<Object|null>} Updated project
   */
  async archive(projectId) {
    return await this.findByIdAndUpdate(projectId, {
      isActive: false,
      archivedAt: new Date()
    });
  }

  /**
   * Restore archived project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object|null>} Updated project
   */
  async restore(projectId) {
    return await this.findByIdAndUpdate(projectId, {
      isActive: true,
      $unset: { archivedAt: 1 }
    });
  }
}

export default new ProjectRepository();