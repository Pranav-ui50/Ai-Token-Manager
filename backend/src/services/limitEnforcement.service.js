/**
 * Limit Enforcement Service
 *
 * Handles automatic enabling/disabling of resources based on plan limits.
 * When plan is downgraded: disables excess resources
 * When plan is upgraded: re-enables previously disabled resources
 */

import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import Plan from '../models/Plan.js';
import Project from '../models/Project.js';
import Feature from '../models/Feature.js';
import Simulation from '../models/Simulation.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

// Default plan limits (fallback when plan not found)
const DEFAULT_LIMITS = {
  starter: {
    maxUsers: 2,
    maxProjects: 4,
    maxFeatures: 8,
    maxSimulations: 10,
    includedAiCredits: 5000,        // 5,000 tokens
    maxApiCalls: 1000,              // 1,000 API calls
    maxTokens: 500000                // 500,000 tokens
  },
  professional: {
    maxUsers: 5,
    maxProjects: 6,
    maxFeatures: 12,
    maxSimulations: 20,
    includedAiCredits: 500000,      // 500,000 tokens
    maxApiCalls: 50000,             // 50,000 API calls
    maxTokens: 2000000               // 2,000,000 tokens
  },
  business: {
    maxUsers: 10,
    maxProjects: 10,
    maxFeatures: 20,
    maxSimulations: 30,
    includedAiCredits: 2000000,     // 2,000,000 tokens
    maxApiCalls: 250000,            // 250,000 API calls
    maxTokens: 10000000              // 10,000,000 tokens
  }
};

class LimitEnforcementService {
  /**
   * Get plan limits for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} targetPlan - Optional target plan to use instead of fetching
   * @returns {Object} Plan limits
   */
  async getPlanLimits(organizationId, targetPlan = null) {
    // If target plan is provided, use its limits directly
    if (targetPlan) {
      const planTier = targetPlan.tier || 'starter';
      logger.info(`[LimitEnforcement] Using target plan limits for tier: ${planTier}`);
      return {
        maxUsers: targetPlan.limits?.maxUsers ?? DEFAULT_LIMITS[planTier]?.maxUsers ?? null,
        maxProjects: targetPlan.limits?.maxProjects ?? DEFAULT_LIMITS[planTier]?.maxProjects ?? null,
        maxFeatures: targetPlan.limits?.maxFeatures ?? DEFAULT_LIMITS[planTier]?.maxFeatures ?? null,
        maxSimulations: targetPlan.limits?.maxSimulations ?? DEFAULT_LIMITS[planTier]?.maxSimulations ?? null,
        planTier
      };
    }

    const organization = await Organization.findById(organizationId)
      .populate('subscription.planId');

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const planTier = organization.subscription?.plan || 'starter';
    const plan = organization.subscription?.planId;

    return {
      maxUsers: plan?.limits?.maxUsers ?? DEFAULT_LIMITS[planTier]?.maxUsers ?? null,
      maxProjects: plan?.limits?.maxProjects ?? DEFAULT_LIMITS[planTier]?.maxProjects ?? null,
      maxFeatures: plan?.limits?.maxFeatures ?? DEFAULT_LIMITS[planTier]?.maxFeatures ?? null,
      maxSimulations: plan?.limits?.maxSimulations ?? DEFAULT_LIMITS[planTier]?.maxSimulations ?? null,
      planTier
    };
  }

  /**
   * Enforce all limits for an organization
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID performing action
   * @param {Object} targetPlan - Optional target plan limits
   * @returns {Object} Enforcement results
   */
  async enforceAllLimits(organizationId, userId, targetPlan = null) {
    const limits = await this.getPlanLimits(organizationId, targetPlan);

    const results = {
      members: await this.enforceMemberLimit(organizationId, limits.maxUsers, userId),
      projects: await this.enforceProjectLimit(organizationId, limits.maxProjects, userId),
      features: await this.enforceFeatureLimit(organizationId, limits.maxFeatures, userId),
      simulations: await this.enforceSimulationLimit(organizationId, limits.maxSimulations, userId)
    };

    return results;
  }

  /**
   * Re-enable all resources when plan is upgraded
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID performing action
   * @param {Object} targetPlan - Target plan with limits
   * @returns {Object} Re-enable results
   */
  async reenableAllResources(organizationId, userId, targetPlan = null) {
    logger.info(`[LimitEnforcement] Re-enabling all resources for org ${organizationId}`);

    const limits = await this.getPlanLimits(organizationId, targetPlan);
    logger.info(`[LimitEnforcement] New plan limits for ${organizationId}:`, JSON.stringify(limits));

    const results = {
      members: await this.reamedMembers(organizationId, limits, userId),
      projects: await this.reamedProjects(organizationId, limits, userId),
      features: await this.reamedFeatures(organizationId, limits, userId),
      simulations: await this.reamedSimulations(organizationId, limits, userId)
    };

    logger.info(`[LimitEnforcement] Re-enable completed for ${organizationId}:`, JSON.stringify(results));

    return results;
  }

  /**
   * Re-enable disabled members
   * @param {string} organizationId - Organization ID
   * @param {Object} limits - Plan limits
   * @param {string} userId - User ID performing action
   * @returns {Object} Result
   */
  async reamedMembers(organizationId, limits, userId) {
    logger.info(`[LimitEnforcement] Checking members for re-enable in org ${organizationId}`);

    const organization = await Organization.findById(organizationId);
    const owner = organization.owner.toString();

    logger.info(`[LimitEnforcement] Plan limits - maxUsers: ${limits.maxUsers}, planTier: ${limits.planTier}`);

    // Find members disabled due to plan limit (sorted by disabledAt to restore in order)
    const disabledMembers = organization.members?.filter(
      m => m.status === 'disabled' && m.disabledReason === 'plan_limit'
    ).sort((a, b) => new Date(a.disabledAt) - new Date(b.disabledAt)) || [];

    logger.info(`[LimitEnforcement] Found ${disabledMembers.length} disabled members with reason 'plan_limit'`);

    if (disabledMembers.length === 0) {
      return { reenabled: 0 };
    }

    const maxUsers = limits.maxUsers === null ? 999 : limits.maxUsers;

    // Count current active members (excluding owner)
    const currentActiveMembers = organization.members?.filter(
      m => (m.status === 'active' || m.status === 'inactive') && m.user.toString() !== owner
    ).length || 0;

    const availableSlots = maxUsers - currentActiveMembers - 1; // -1 for owner

    logger.info(`[LimitEnforcement] maxUsers: ${maxUsers}, currentActiveMembers: ${currentActiveMembers}, availableSlots: ${availableSlots}`);

    if (availableSlots <= 0) {
      logger.info(`[LimitEnforcement] No available slots to re-enable members`);
      return { reenabled: 0, message: 'No available slots' };
    }

    const membersToReenable = disabledMembers.slice(0, availableSlots);
    const reenabledIds = [];

    for (const member of membersToReenable) {
      // Restore to previous status (was active or inactive)
      const previousStatus = member.previousStatus || 'active';
      logger.info(`[LimitEnforcement] Re-enabling member ${member.user} with previousStatus: ${previousStatus}`);

      member.status = previousStatus;
      member.disabledAt = null;
      member.disabledReason = null;
      member.disabledBy = null;
      member.previousStatus = null;
      member.reamedAt = new Date();
      member.reenabledBy = userId;

      reenabledIds.push(member.user.toString());

      // Update user status
      await User.findByIdAndUpdate(member.user, {
        'organization.status': 'active',
        $unset: { disabledAt: 1, disabledReason: 1 }
      });
    }

    await organization.save();

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'members_reenabled_plan_upgrade',
      resourceType: 'organization',
      description: `${reenabledIds.length} member(s) re-enabled after plan upgrade`,
      afterState: { reenabledMembers: reenabledIds }
    });

    logger.info(`[LimitEnforcement] Members re-enabled: ${reenabledIds.length} members for org ${organizationId}`);

    return { reenabled: reenabledIds.length, members: reenabledIds };
  }

  /**
   * Enforce member limit - disable excess members
   * @param {string} organizationId - Organization ID
   * @param {number} maxMembers - Maximum members allowed (null = unlimited)
   * @param {string} userId - User ID performing action
   * @returns {Object} Result
   */
  async enforceMemberLimit(organizationId, maxMembers, userId) {
    if (maxMembers === null) {
      return { disabled: 0, message: 'Unlimited members allowed' };
    }

    const organization = await Organization.findById(organizationId);
    const owner = organization.owner.toString();

    // Get all non-owner members with active or inactive status (sorted by join date - oldest first, so newest get disabled first)
    const eligibleMembers = organization.members.filter(
      m => m.user.toString() !== owner && (m.status === 'active' || m.status === 'inactive' || !m.status)
    ).sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));

    const activeMembers = eligibleMembers.filter(m => m.status === 'active' || !m.status);

    if (activeMembers.length <= maxMembers - 1) {
      return { disabled: 0, message: 'Within limit' };
    }

    const excess = activeMembers.length - (maxMembers - 1);
    // Disable the newest members first (last in the sorted list)
    const membersToDisable = activeMembers.slice(-excess);
    const disabledIds = [];

    for (const member of membersToDisable) {
      // Store previous status before disabling
      member.previousStatus = member.status || 'active';
      member.status = 'disabled';
      member.disabledAt = new Date();
      member.disabledReason = 'plan_limit';
      member.disabledBy = userId;

      disabledIds.push(member.user.toString());

      // Update user status
      await User.findByIdAndUpdate(member.user, {
        'organization.status': 'disabled',
        disabledAt: new Date(),
        disabledReason: 'plan_limit'
      });
    }

    await organization.save();

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'members_disabled_plan_limit',
      resourceType: 'organization',
      resourceId: organization._id,
      description: `${disabledIds.length} member(s) disabled due to plan limit`,
      afterState: { disabledMembers: disabledIds, maxMembers }
    });

    logger.info(`Enforced member limit: ${disabledIds.length} members disabled for org ${organizationId}`);

    return { disabled: disabledIds.length, members: disabledIds };
  }

  /**
   * Enforce project limit - disable excess projects
   * @param {string} organizationId - Organization ID
   * @param {number} maxProjects - Maximum projects allowed (null = unlimited)
   * @param {string} userId - User ID performing action
   * @returns {Object} Result
   */
  async enforceProjectLimit(organizationId, maxProjects, userId) {
    if (maxProjects === null) {
      return { disabled: 0, message: 'Unlimited projects allowed' };
    }

    // Get all active projects (sorted by creation date - oldest first)
    const activeProjects = await Project.find({
      organization: organizationId,
      status: { $in: ['active', 'inactive'] }
    }).sort({ createdAt: 1 });

    if (activeProjects.length <= maxProjects) {
      return { disabled: 0, message: 'Within limit' };
    }

    const excess = activeProjects.length - maxProjects;
    // Disable the newest projects first (last in the sorted list)
    const projectsToDisable = activeProjects.slice(-excess);
    const disabledIds = [];

    for (const project of projectsToDisable) {
      // Store previous status before disabling
      project.previousStatus = project.status || 'active';
      project.status = 'disabled';
      project.disabledAt = new Date();
      project.disabledReason = 'plan_limit';

      await project.save();
      disabledIds.push(project._id.toString());
    }

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'projects_disabled_plan_limit',
      resourceType: 'project',
      description: `${disabledIds.length} project(s) disabled due to plan limit`,
      afterState: { disabledProjects: disabledIds, maxProjects }
    });

    logger.info(`Enforced project limit: ${disabledIds.length} projects disabled for org ${organizationId}`);

    return { disabled: disabledIds.length, projects: disabledIds };
  }

  /**
   * Enforce feature limit - set excess features to inactive
   * @param {string} organizationId - Organization ID
   * @param {number} maxFeatures - Maximum features allowed (null = unlimited)
   * @param {string} userId - User ID performing action
   * @returns {Object} Result
   */
  async enforceFeatureLimit(organizationId, maxFeatures, userId) {
    if (maxFeatures === null) {
      return { disabled: 0, message: 'Unlimited features allowed' };
    }

    // Get all active features (sorted by creation date - oldest first)
    const activeFeatures = await Feature.find({
      organization: organizationId,
      status: 'active'
    }).sort({ createdAt: 1 });

    if (activeFeatures.length <= maxFeatures) {
      return { disabled: 0, message: 'Within limit' };
    }

    const excess = activeFeatures.length - maxFeatures;
    // Disable the newest features first (last in the sorted list)
    const featuresToDisable = activeFeatures.slice(-excess);
    const disabledIds = [];

    for (const feature of featuresToDisable) {
      // Store previous status before disabling
      feature.previousStatus = 'active';
      feature.status = 'inactive';
      feature.disabledAt = new Date();
      feature.disabledReason = 'plan_limit';

      await feature.save();
      disabledIds.push(feature._id.toString());
    }

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'features_disabled_plan_limit',
      resourceType: 'feature',
      description: `${disabledIds.length} feature(s) set to inactive due to plan limit`,
      afterState: { disabledFeatures: disabledIds, maxFeatures }
    });

    logger.info(`Enforced feature limit: ${disabledIds.length} features set to inactive for org ${organizationId}`);

    return { disabled: disabledIds.length, features: disabledIds };
  }

  /**
   * Enforce simulation limit - set excess simulations to draft
   * @param {string} organizationId - Organization ID
   * @param {number} maxSimulations - Maximum simulations allowed (null = unlimited)
   * @param {string} userId - User ID performing action
   * @returns {Object} Result
   */
  async enforceSimulationLimit(organizationId, maxSimulations, userId) {
    if (maxSimulations === null) {
      return { disabled: 0, message: 'Unlimited simulations allowed' };
    }

    // Get all non-draft simulations (sorted by creation date - oldest first)
    // Draft simulations don't count against the limit
    const activeSimulations = await Simulation.find({
      organization: organizationId,
      status: { $in: ['pending', 'running', 'completed', 'failed'] }
    }).sort({ createdAt: 1 });

    if (activeSimulations.length <= maxSimulations) {
      return { disabled: 0, message: 'Within limit' };
    }

    const excess = activeSimulations.length - maxSimulations;
    // Disable the newest simulations first (last in the sorted list)
    const simulationsToDisable = activeSimulations.slice(-excess);
    const disabledIds = [];

    for (const simulation of simulationsToDisable) {
      // Store previous status before disabling
      simulation.previousStatus = simulation.status;
      simulation.status = 'draft';
      simulation.disabledAt = new Date();
      simulation.disabledReason = 'plan_limit';

      await simulation.save();
      disabledIds.push(simulation._id.toString());
    }

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'simulations_disabled_plan_limit',
      resourceType: 'simulation',
      description: `${disabledIds.length} simulation(s) set to draft due to plan limit`,
      afterState: { disabledSimulations: disabledIds, maxSimulations }
    });

    logger.info(`Enforced simulation limit: ${disabledIds.length} simulations set to draft for org ${organizationId}`);

    return { disabled: disabledIds.length, simulations: disabledIds };
  }

  /**
   * Re-enable disabled projects
   * @param {string} organizationId - Organization ID
   * @param {Object} limits - Plan limits
   * @param {string} userId - User ID performing action
   * @returns {Object} Result
   */
  async reamedProjects(organizationId, limits, userId) {

    // Find projects disabled due to plan limit (sorted by disabledAt to restore in order)
    const disabledProjects = await Project.find({
      organization: organizationId,
      status: 'disabled',
      disabledReason: 'plan_limit'
    }).sort({ disabledAt: 1 });

    if (disabledProjects.length === 0) {
      return { reenabled: 0 };
    }

    const maxProjects = limits.maxProjects === null ? 999 : limits.maxProjects;
    const activeProjects = await Project.countDocuments({
      organization: organizationId,
      status: { $in: ['active', 'inactive'] }
    });

    const availableSlots = maxProjects - activeProjects;

    if (availableSlots <= 0) {
      return { reenabled: 0, message: 'No available slots' };
    }

    const projectsToReenable = disabledProjects.slice(0, availableSlots);
    const reenabledIds = [];

    for (const project of projectsToReenable) {
      // Restore to previous status (was active or inactive)
      project.status = project.previousStatus || 'active';
      project.disabledAt = null;
      project.disabledReason = null;
      project.previousStatus = null;

      await project.save();
      reenabledIds.push(project._id.toString());
    }

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'projects_reenabled_plan_upgrade',
      resourceType: 'project',
      description: `${reenabledIds.length} project(s) re-enabled after plan upgrade`,
      afterState: { reenabledProjects: reenabledIds }
    });

    logger.info(`Projects re-enabled: ${reenabledIds.length} projects for org ${organizationId}`);

    return { reenabled: reenabledIds.length, projects: reenabledIds };
  }

  /**
   * Re-enable disabled features
   * @param {string} organizationId - Organization ID
   * @param {Object} limits - Plan limits
   * @param {string} userId - User ID performing action
   * @returns {Object} Result
   */
  async reamedFeatures(organizationId, limits, userId) {
    // Find features disabled due to plan limit (sorted by disabledAt to restore in order)
    const disabledFeatures = await Feature.find({
      organization: organizationId,
      status: 'inactive',
      disabledReason: 'plan_limit'
    }).sort({ disabledAt: 1 });

    if (disabledFeatures.length === 0) {
      return { reenabled: 0 };
    }

    const maxFeatures = limits.maxFeatures === null ? 999 : limits.maxFeatures;
    const activeFeatures = await Feature.countDocuments({
      organization: organizationId,
      status: 'active'
    });

    const availableSlots = maxFeatures - activeFeatures;

    if (availableSlots <= 0) {
      return { reenabled: 0, message: 'No available slots' };
    }

    const featuresToReenable = disabledFeatures.slice(0, availableSlots);
    const reenabledIds = [];

    for (const feature of featuresToReenable) {
      // Restore to active status
      feature.status = feature.previousStatus || 'active';
      feature.disabledAt = null;
      feature.disabledReason = null;
      feature.previousStatus = null;

      await feature.save();
      reenabledIds.push(feature._id.toString());
    }

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'features_reenabled_plan_upgrade',
      resourceType: 'feature',
      description: `${reenabledIds.length} feature(s) re-enabled after plan upgrade`,
      afterState: { reenabledFeatures: reenabledIds }
    });

    logger.info(`Features re-enabled: ${reenabledIds.length} features for org ${organizationId}`);

    return { reenabled: reenabledIds.length, features: reenabledIds };
  }

  /**
   * Re-enable disabled simulations
   * @param {string} organizationId - Organization ID
   * @param {Object} limits - Plan limits
   * @param {string} userId - User ID performing action
   * @returns {Object} Result
   */
  async reamedSimulations(organizationId, limits, userId) {
    // Find simulations disabled due to plan limit (have previousStatus set)
    const disabledSimulations = await Simulation.find({
      organization: organizationId,
      disabledReason: 'plan_limit',
      previousStatus: { $ne: null }
    }).sort({ disabledAt: 1 }); // Re-enable in order they were disabled

    if (disabledSimulations.length === 0) {
      return { reenabled: 0 };
    }

    const maxSimulations = limits.maxSimulations === null ? 999 : limits.maxSimulations;
    const activeSimulations = await Simulation.countDocuments({
      organization: organizationId,
      status: { $ne: 'draft' },
      disabledReason: { $ne: 'plan_limit' }
    });

    const availableSlots = maxSimulations - activeSimulations;

    if (availableSlots <= 0) {
      return { reenabled: 0, message: 'No available slots' };
    }

    const simulationsToReenable = disabledSimulations.slice(0, availableSlots);
    const reenabledIds = [];

    for (const simulation of simulationsToReenable) {
      // Restore to previous status (was running, completed, etc.)
      simulation.status = simulation.previousStatus;
      simulation.disabledAt = null;
      simulation.disabledReason = null;
      simulation.previousStatus = null;

      await simulation.save();
      reenabledIds.push(simulation._id.toString());
    }

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'simulations_reenabled_plan_upgrade',
      resourceType: 'simulation',
      description: `${reenabledIds.length} simulation(s) re-enabled after plan upgrade`,
      afterState: { reenabledSimulations: reenabledIds }
    });

    logger.info(`Simulations re-enabled: ${reenabledIds.length} simulations for org ${organizationId}`);

    return { reenabled: reenabledIds.length, simulations: reenabledIds };
  }
}

export default new LimitEnforcementService();