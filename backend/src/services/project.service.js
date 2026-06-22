/**
 * Project Service
 *
 * Handles all project-related business logic.
 */

import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Organization from '../models/Organization.js';
import Feature from '../models/Feature.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class ProjectService {
  /**
   * Create a new project
   * @param {Object} data - Project data
   * @param {string} userId - Creator user ID
   * @returns {Object} Created project
   */
  async create(data, userId) {
    const { organizationId, name, description, settings } = data;

    logger.info(`[ProjectService] Creating project: ${name} for org: ${organizationId}, user: ${userId}`);

    // Verify organization exists and user is member
    const organization = await Organization.findById(organizationId);

    logger.info(`[ProjectService] Organization found: ${organization ? organization._id : 'null'}`);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    logger.info(`[ProjectService] Checking membership for userId: ${userId}`);
    logger.info(`[ProjectService] Organization members: ${JSON.stringify(organization.members.map(m => ({ user: m.user?._id || m.user })))}`);

    const isMember = organization.isMember(userId);
    logger.info(`[ProjectService] isMember result: ${isMember}`);

    if (!isMember) {
      throw new AppError('Access denied. You are not a member of this organization', 403, 'FORBIDDEN');
    }

    // Check for duplicate project name within organization
    const existingProject = await Project.findOne({
      organization: organizationId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true
    });

    if (existingProject) {
      throw new AppError('A project with this name already exists in your organization', 409, 'DUPLICATE_ERROR');
    }

    // Create project
    const project = await Project.create({
      organization: organizationId,
      name,
      description,
      settings: settings || {},
      createdBy: userId
    });

    await project.populate('organization', 'name slug');

    logger.info(`Project created: ${project.name} in organization ${organizationId}`);

    return project;
  }

  /**
   * Get project by ID
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Object} Project
   */
  async getById(projectId, userId) {
    const project = await Project.findById(projectId)
      .populate('organization', 'name slug')
      .populate('createdBy', 'firstName lastName email')
      .populate('settings.defaultModel', 'name displayName');

    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    // Verify user is member of organization
    const organization = await Organization.findById(project.organization);

    if (!organization || !organization.isMember(userId)) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    return project;
  }

  /**
   * Get projects for organization
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Array} Projects
   */
  async getForOrganization(organizationId, userId, filters = {}) {
    // Verify organization exists and user is member
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    if (!organization.isMember(userId)) {
      throw new AppError('Access denied. You are not a member of this organization', 403, 'FORBIDDEN');
    }

    const query = { organization: organizationId, isActive: true, ...filters };

    const projects = await Project.find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('settings.defaultModel', 'name displayName')
      .populate('featureCount')
      .sort({ createdAt: -1 });

    return projects;
  }

  /**
   * Update project
   * @param {string} projectId - Project ID
   * @param {Object} data - Update data
   * @param {string} userId - User ID
   * @returns {Object} Updated project
   */
  async update(projectId, data, userId) {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    // Verify user is member of organization
    const organization = await Organization.findById(project.organization);

    if (!organization || !organization.isMember(userId)) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name !== project.name) {
      const existingProject = await Project.findOne({
        organization: project.organization,
        name: { $regex: new RegExp(`^${data.name}$`, 'i') },
        isActive: true,
        _id: { $ne: projectId }
      });

      if (existingProject) {
        throw new AppError('A project with this name already exists', 409, 'DUPLICATE_ERROR');
      }
    }

    // Update fields
    const allowedUpdates = ['name', 'description', 'settings', 'metadata'];
    allowedUpdates.forEach(field => {
      if (data[field] !== undefined) {
        project[field] = data[field];
      }
    });

    await project.save();

    await project.populate('organization', 'name slug');
    await project.populate('settings.defaultModel', 'name displayName');

    logger.info(`Project updated: ${project._id}`);

    return project;
  }

  /**
   * Delete project (soft delete)
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Object} Success message
   */
  async delete(projectId, userId) {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    // Verify user is organization owner or project creator
    const organization = await Organization.findById(project.organization);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const isOwner = organization.isOwner(userId);
    const isCreator = project.createdBy.toString() === userId;

    if (!isOwner && !isCreator) {
      throw new AppError('Only the organization owner or project creator can delete this project', 403, 'FORBIDDEN');
    }

    // Soft delete project
    project.isActive = false;
    project.status = 'inactive';
    await project.save();

    // Cascade: deactivate all associated features
    const featuresToUpdate = await Feature.find({ project: projectId, status: { $ne: 'deprecated' } });

    for (const feature of featuresToUpdate) {
      feature.previousStatus = feature.status || 'active';
      feature.status = 'deprecated';
      feature.disabledAt = new Date();
      feature.disabledReason = 'manual';
      feature.disabledNote = 'Feature deprecated because parent project was deleted';
      await feature.save();
    }

    logger.info(`Project deleted: ${project._id}, ${featuresToUpdate.length} features cascade deprecated`);

    return { message: 'Project deleted successfully' };
  }

  /**
   * Get project statistics
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Object} Project statistics
   */
  async getStats(projectId, userId) {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    // Verify user is member of organization
    const organization = await Organization.findById(project.organization);

    if (!organization || !organization.isMember(userId)) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    // Get all features for this project with their usage history and model pricing
    const features = await Feature.find({ project: projectId })
      .populate('model', 'name displayName pricing')
      .lean();

    // Calculate feature stats by status with accurate token and cost calculation
    const statsByStatus = {};

    for (const feature of features) {
      const status = feature.status || 'active';

      if (!statsByStatus[status]) {
        statsByStatus[status] = {
          _id: status,
          count: 0,
          totalTokens: 0,
          totalCost: 0,
          features: []
        };
      }

      // Calculate total tokens from usage history if stats are empty
      let tokensFromHistory = 0;
      let costFromHistory = 0;

      if (feature.usageHistory && feature.usageHistory.length > 0) {
        for (const usage of feature.usageHistory) {
          tokensFromHistory += usage.tokens || 0;
          costFromHistory += usage.cost || 0;
        }
      }

      // Use the higher of stats or history (in case stats weren't properly synced)
      let totalTokens = Math.max(feature.stats?.totalTokens || 0, tokensFromHistory);
      let totalCost = Math.max(feature.stats?.totalCost || 0, costFromHistory);

      // If no actual usage recorded, calculate estimated cost based on token estimates and model pricing
      if (totalTokens === 0 && totalCost === 0) {
        const inputTokens = feature.tokenEstimates?.inputTokensPerRequest || 0;
        const outputTokens = feature.tokenEstimates?.outputTokensPerRequest || 0;
        const totalRequests = feature.stats?.totalRequests || 0;

        // If there are requests recorded but tokens/cost are 0, calculate from estimates
        if (totalRequests > 0 && (inputTokens > 0 || outputTokens > 0)) {
          totalTokens = (inputTokens + outputTokens) * totalRequests;

          // Calculate cost based on model pricing
          const modelPricing = feature.model?.pricing || {};
          const inputPrice = modelPricing.inputPrice || 0;
          const outputPrice = modelPricing.outputPrice || 0;
          const pricePerUnit = modelPricing.pricePerUnit || 1000000; // Default: per million tokens

          // Calculate costs (price is per unit, typically per million tokens)
          const inputCost = (inputTokens * totalRequests * inputPrice) / pricePerUnit;
          const outputCost = (outputTokens * totalRequests * outputPrice) / pricePerUnit;

          // Add infrastructure overhead
          const overheadPercentage = feature.infrastructureCost?.overheadPercentage || 0;
          const fixedCostPerRequest = feature.infrastructureCost?.fixedCostPerRequest || 0;

          const baseCost = inputCost + outputCost;
          const overheadCost = baseCost * (overheadPercentage / 100);
          totalCost = baseCost + overheadCost + (fixedCostPerRequest * totalRequests);
        }
      }

      statsByStatus[status].count += 1;
      statsByStatus[status].totalTokens += totalTokens;
      statsByStatus[status].totalCost += totalCost;
      statsByStatus[status].features.push({
        id: feature._id,
        name: feature.name,
        tokens: totalTokens,
        cost: totalCost
      });
    }

    // Convert to array for response
    const featureStats = Object.values(statsByStatus);

    const totalFeatures = await Feature.countDocuments({ project: projectId });
    const activeFeatures = await Feature.countDocuments({ project: projectId, status: 'active' });

    return {
      totalFeatures,
      activeFeatures,
      featureStats,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  }

  /**
   * Archive/unarchive project
   * @param {string} projectId - Project ID
   * @param {boolean} archive - Archive or unarchive
   * @param {string} userId - User ID
   * @returns {Object} Updated project
   */
  async archive(projectId, archive, userId) {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    // Verify user is organization owner or admin
    // Populate role to check admin permissions
    const organization = await Organization.findById(project.organization)
      .populate('members.role', 'name');

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const isOwner = organization.isOwner(userId);
    const isAdmin = organization.isAdmin(userId);

    if (!isOwner && !isAdmin) {
      throw new AppError('Only the organization owner or admin can archive projects', 403, 'FORBIDDEN');
    }

    project.isActive = !archive;
    await project.save();

    logger.info(`Project ${archive ? 'archived' : 'restored'}: ${project._id}`);

    return project;
  }

  // ==========================================
  // Project Member Management
  // ==========================================

  /**
   * Add member to project
   * @param {string} projectId - Project ID
   * @param {string} memberUserId - User ID to add
   * @param {string} role - Member role
   * @param {string} addedBy - User ID adding the member
   * @returns {Object} Project member
   */
  async addMember(projectId, memberUserId, role = 'viewer', addedBy) {
    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    // Verify user adding is member of organization
    const organization = await Organization.findById(project.organization);
    if (!organization || !organization.isMember(addedBy)) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    // Check if user being added is member of organization
    if (!organization.isMember(memberUserId)) {
      throw new AppError('User is not a member of this organization', 400, 'NOT_MEMBER');
    }

    // Add member
    const member = await ProjectMember.addMember(projectId, memberUserId, role, addedBy);

    await member.populate('user', 'firstName lastName email avatar');

    logger.info(`Member ${memberUserId} added to project ${projectId} as ${role}`);

    return member;
  }

  /**
   * Remove member from project
   * @param {string} projectId - Project ID
   * @param {string} memberUserId - User ID to remove
   * @param {string} removedBy - User ID removing the member
   * @returns {Object} Success message
   */
  async removeMember(projectId, memberUserId, removedBy) {
    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    // Verify user removing is member of organization with permission
    const organization = await Organization.findById(project.organization);
    if (!organization || !organization.isMember(removedBy)) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    // Can't remove project creator
    if (project.createdBy.toString() === memberUserId) {
      throw new AppError('Cannot remove project creator', 400, 'CANNOT_REMOVE_CREATOR');
    }

    // Remove member
    await ProjectMember.removeMember(projectId, memberUserId);

    logger.info(`Member ${memberUserId} removed from project ${projectId}`);

    return { message: 'Member removed successfully' };
  }

  /**
   * Get project members
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID requesting
   * @returns {Array} Project members
   */
  async getMembers(projectId, userId) {
    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    const organization = await Organization.findById(project.organization);
    if (!organization || !organization.isMember(userId)) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const members = await ProjectMember.getProjectMembers(projectId);
    return members;
  }

  /**
   * Update member role
   * @param {string} projectId - Project ID
   * @param {string} memberUserId - User ID to update
   * @param {string} newRole - New role
   * @param {string} updatedBy - User ID updating
   * @returns {Object} Updated member
   */
  async updateMemberRole(projectId, memberUserId, newRole, updatedBy) {
    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    // Verify user updating is organization owner or admin
    const organization = await Organization.findById(project.organization);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const isOwner = organization.isOwner(updatedBy);
    const isAdmin = organization.isAdmin(updatedBy);

    if (!isOwner && !isAdmin) {
      throw new AppError('Only owners or admins can update member roles', 403, 'FORBIDDEN');
    }

    // Can't change role of project creator
    if (project.createdBy.toString() === memberUserId) {
      throw new AppError('Cannot change role of project creator', 400, 'CANNOT_CHANGE_CREATOR_ROLE');
    }

    // Update role
    const member = await ProjectMember.updateRole(projectId, memberUserId, newRole);

    if (!member) {
      throw new AppError('Member not found', 404, 'NOT_FOUND');
    }

    await member.populate('user', 'firstName lastName email avatar');

    logger.info(`Member ${memberUserId} role updated to ${newRole} in project ${projectId}`);

    return member;
  }

  /**
   * Check if user has permission
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @param {string} permission - Permission to check
   * @returns {boolean}
   */
  async hasPermission(projectId, userId, permission) {
    const project = await Project.findById(projectId);
    if (!project) return false;

    // Project creator has all permissions
    if (project.createdBy.toString() === userId) return true;

    // Check project member permissions
    const member = await ProjectMember.findOne({
      project: projectId,
      user: userId,
      isActive: true
    });

    if (!member) return false;

    // Check role-based permissions
    if (member.role === 'owner' || member.role === 'admin') return true;

    // Check specific permission
    return member.permissions[permission] === true;
  }
}

export default new ProjectService();