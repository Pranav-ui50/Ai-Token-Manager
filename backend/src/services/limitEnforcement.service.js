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
import AuditLog from '../models/AuditLog.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

// Plan tier hierarchy for determining upgrades vs downgrades
const PLAN_HIERARCHY = {
  'free': 0,
  'test': 0,        // Test/free tier (same level as free)
  'demo': 1,        // Demo tier (same level as starter)
  'starter': 1,
  'professional': 2,
  'business': 3,
  'enterprise': 4
};

// Default plan limits (fallback when plan not found)
const DEFAULT_LIMITS = {
  free: {
    maxUsers: 1,
    maxProjects: 1,
    maxFeatures: 3,
    maxSimulations: 5,
    includedAiCredits: 1000,
    maxApiCalls: 100,
    maxTokens: 10000
  },
  test: {
    maxUsers: 1,
    maxProjects: 1,
    maxFeatures: 1,
    maxSimulations: 1,
    includedAiCredits: 100,
    maxApiCalls: 10,
    maxTokens: 1000
  },
  demo: {
    maxUsers: 2,
    maxProjects: 2,
    maxFeatures: 2,
    maxSimulations: 2,
    includedAiCredits: 500,
    maxApiCalls: 100,
    maxTokens: 5000
  },
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
  },
  enterprise: {
    maxUsers: null,  // unlimited
    maxProjects: null,
    maxFeatures: null,
    maxSimulations: null,
    includedAiCredits: null,
    maxApiCalls: null,
    maxTokens: null
  }
};

class LimitEnforcementService {

  /**
   * Sync resources after plan change (upgrade or downgrade)
   * This is the CENTRAL function that should be called after any plan change.
   * It automatically determines if it's an upgrade or downgrade and acts accordingly.
   *
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID performing action (for audit)
   * @param {Object} newPlan - The new plan object with tier and limits
   * @param {string} previousPlanTier - The previous plan tier (optional, will be fetched if not provided)
   * @returns {Object} Sync result with actions taken
   */
  async syncResourcesAfterPlanChange(organizationId, userId, newPlan, previousPlanTier = null) {
    logger.info(`[LimitEnforcement] ====== SYNC RESOURCES AFTER PLAN CHANGE ======`);
    logger.info(`[LimitEnforcement] Organization: ${organizationId}`);
    logger.info(`[LimitEnforcement] New Plan: ${newPlan?.tier || 'unknown'}`);
    logger.info(`[LimitEnforcement] Previous Plan: ${previousPlanTier || 'unknown'}`);

    // Get previous plan tier from organization if not provided
    if (!previousPlanTier) {
      const organization = await Organization.findById(organizationId);
      previousPlanTier = organization?.subscription?.previousPlan || organization?.subscription?.plan || 'starter';
    }

    const newPlanTier = newPlan?.tier || 'starter';
    const previousLevel = PLAN_HIERARCHY[previousPlanTier?.toLowerCase()] || 0;
    const newLevel = PLAN_HIERARCHY[newPlanTier?.toLowerCase()] || 0;

    const isUpgrade = newLevel > previousLevel;
    const isDowngrade = newLevel < previousLevel;

    logger.info(`[LimitEnforcement] Previous level: ${previousLevel}, New level: ${newLevel}`);
    logger.info(`[LimitEnforcement] Is upgrade: ${isUpgrade}, Is downgrade: ${isDowngrade}`);

    const result = {
      previousPlanTier,
      newPlanTier,
      isUpgrade,
      isDowngrade,
      actions: {}
    };

    if (isDowngrade) {
      logger.info(`[LimitEnforcement] Plan DOWNGRADE detected - enforcing limits`);
      result.actions = await this.enforceAllLimits(organizationId, userId, newPlan);
      result.actionType = 'downgrade';
    } else if (isUpgrade) {
      logger.info(`[LimitEnforcement] Plan UPGRADE detected - re-enabling resources`);
      result.actions = await this.reenableAllResources(organizationId, userId, newPlan);
      result.actionType = 'upgrade';
    } else {
      logger.info(`[LimitEnforcement] Same plan level - no action needed`);
      result.actionType = 'same_level';
      result.actions = { message: 'No action required - same plan level' };
    }

    // Log the sync action
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: isUpgrade ? 'plan_upgrade_sync' : isDowngrade ? 'plan_downgrade_sync' : 'plan_change_sync',
      resourceType: 'organization',
      description: `Plan sync completed: ${previousPlanTier} → ${newPlanTier} (${isUpgrade ? 'upgrade' : isDowngrade ? 'downgrade' : 'same level'})`,
      afterState: {
        previousPlanTier,
        newPlanTier,
        actionType: result.actionType,
        actionsTaken: result.actions
      }
    });

    logger.info(`[LimitEnforcement] ====== END SYNC RESOURCES ======`);
    return result;
  }

  /**
   * Get plan tier level for comparison
   * @param {string} tier - Plan tier
   * @returns {number} Tier level
   */
  getPlanLevel(tier) {
    return PLAN_HIERARCHY[tier?.toLowerCase()] || 0;
  }
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
    logger.info(`[LimitEnforcement] ====== START ENFORCE ALL LIMITS ======`);
    logger.info(`[LimitEnforcement] Organization: ${organizationId}`);
    logger.info(`[LimitEnforcement] User: ${userId}`);
    logger.info(`[LimitEnforcement] Target Plan: ${targetPlan ? `${targetPlan.tier} (${targetPlan._id})` : 'null'}`);

    const limits = await this.getPlanLimits(organizationId, targetPlan);

    logger.info(`[LimitEnforcement] Resolved limits:`, JSON.stringify(limits));

    const results = {
      members: await this.enforceMemberLimit(organizationId, limits.maxUsers, userId),
      projects: await this.enforceProjectLimit(organizationId, limits.maxProjects, userId),
      features: await this.enforceFeatureLimit(organizationId, limits.maxFeatures, userId),
      simulations: await this.enforceSimulationLimit(organizationId, limits.maxSimulations, userId)
    };

    logger.info(`[LimitEnforcement] ====== END ENFORCE ALL LIMITS ======`);
    logger.info(`[LimitEnforcement] Results:`, JSON.stringify(results));

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
    logger.info(`[LimitEnforcement] ====== START RE-ENABLE ALL RESOURCES ======`);
    logger.info(`[LimitEnforcement] Organization: ${organizationId}`);
    logger.info(`[LimitEnforcement] User: ${userId}`);
    logger.info(`[LimitEnforcement] Target Plan: ${targetPlan ? `${targetPlan.tier} (${targetPlan._id})` : 'null'}`);

    const limits = await this.getPlanLimits(organizationId, targetPlan);
    logger.info(`[LimitEnforcement] New plan limits:`, JSON.stringify(limits));

    const results = {
      members: await this.reamedMembers(organizationId, limits, userId),
      projects: await this.reamedProjects(organizationId, limits, userId),
      features: await this.reamedFeatures(organizationId, limits, userId),
      simulations: await this.reamedSimulations(organizationId, limits, userId)
    };

    logger.info(`[LimitEnforcement] Re-enable completed for ${organizationId}:`, JSON.stringify(results));
    logger.info(`[LimitEnforcement] ====== END RE-ENABLE ALL RESOURCES ======`);

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
      member.disabledNote = null;
      member.disabledBy = null;
      member.previousStatus = null;
      member.reamedAt = new Date();
      member.reenabledBy = userId;

      reenabledIds.push(member.user.toString());
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
    logger.info(`[LimitEnforcement] Enforcing member limit for org ${organizationId}`);
    logger.info(`[LimitEnforcement] maxMembers: ${maxMembers}`);

    if (maxMembers === null) {
      logger.info(`[LimitEnforcement] Unlimited members allowed, skipping enforcement`);
      return { disabled: 0, message: 'Unlimited members allowed' };
    }

    const organization = await Organization.findById(organizationId);
    const owner = organization.owner.toString();

    // Get all non-owner members with active or inactive status (sorted by join date - oldest first, so newest get disabled first)
    const eligibleMembers = organization.members.filter(
      m => m.user.toString() !== owner && (m.status === 'active' || m.status === 'inactive' || !m.status)
    ).sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));

    const activeMembers = eligibleMembers.filter(m => m.status === 'active' || !m.status);

    logger.info(`[LimitEnforcement] Found ${activeMembers.length} active members (excluding owner), limit is ${maxMembers - 1} (total limit: ${maxMembers})`);

    if (activeMembers.length <= maxMembers - 1) {
      logger.info(`[LimitEnforcement] Within limit (${activeMembers.length}/${maxMembers - 1}), no action needed`);
      return { disabled: 0, message: 'Within limit' };
    }

    const excess = activeMembers.length - (maxMembers - 1);
    logger.info(`[LimitEnforcement] Excess members: ${excess} will be disabled`);

    // Disable the newest members first (last in the sorted list)
    const membersToDisable = activeMembers.slice(-excess);
    const disabledIds = [];

    for (const member of membersToDisable) {
      logger.info(`[LimitEnforcement] Disabling member ${member.user}`);
      // Store previous status before disabling
      member.previousStatus = member.status || 'active';
      member.status = 'disabled';
      member.disabledAt = new Date();
      member.disabledReason = 'plan_limit';
      member.disabledNote = 'Plan limit exceeded - upgrade to re-enable';
      member.disabledBy = userId;

      disabledIds.push(member.user.toString());
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

    logger.info(`[LimitEnforcement] Enforced member limit: ${disabledIds.length} members disabled for org ${organizationId}`);

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
    logger.info(`[LimitEnforcement] Enforcing project limit for org ${organizationId}`);
    logger.info(`[LimitEnforcement] maxProjects: ${maxProjects}`);

    if (maxProjects === null) {
      logger.info(`[LimitEnforcement] Unlimited projects allowed, skipping enforcement`);
      return { disabled: 0, message: 'Unlimited projects allowed' };
    }

    // Get all active projects (sorted by creation date - oldest first)
    const activeProjects = await Project.find({
      organization: organizationId,
      isActive: true,
      status: { $in: ['active', 'inactive'] }
    }).sort({ createdAt: 1 });

    logger.info(`[LimitEnforcement] Found ${activeProjects.length} active projects, limit is ${maxProjects}`);

    if (activeProjects.length <= maxProjects) {
      logger.info(`[LimitEnforcement] Within limit (${activeProjects.length}/${maxProjects}), no action needed`);
      return { disabled: 0, message: 'Within limit' };
    }

    const excess = activeProjects.length - maxProjects;
    logger.info(`[LimitEnforcement] Excess projects: ${excess} will be disabled`);

    // Disable the newest projects first (last in the sorted list)
    const projectsToDisable = activeProjects.slice(-excess);
    const disabledIds = [];
    let totalFeaturesDisabled = 0;

    for (const project of projectsToDisable) {
      logger.info(`[LimitEnforcement] Disabling project ${project._id} (${project.name})`);
      // Store previous status before disabling
      project.previousStatus = project.status || 'active';
      project.status = 'disabled';
      project.disabledAt = new Date();
      project.disabledReason = 'plan_limit';
      project.disabledNote = 'Plan limit exceeded - upgrade to re-enable';

      await project.save();
      disabledIds.push(project._id.toString());

      // Cascade disable all features under this project
      const featuresToDisable = await Feature.find({
        project: project._id,
        status: { $in: ['active', 'inactive', 'maintenance'] }
      });

      for (const feature of featuresToDisable) {
        logger.info(`[LimitEnforcement] Cascading disable to feature ${feature._id} (${feature.name})`);
        feature.previousStatus = feature.status || 'active';
        feature.status = 'disabled';
        feature.disabledAt = new Date();
        feature.disabledReason = 'plan_limit';
        feature.disabledNote = 'Feature disabled because parent project exceeded plan limit';
        await feature.save();
        totalFeaturesDisabled++;
      }
    }

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'projects_disabled_plan_limit',
      resourceType: 'project',
      description: `${disabledIds.length} project(s) disabled due to plan limit`,
      afterState: { disabledProjects: disabledIds, disabledFeatures: totalFeaturesDisabled, maxProjects }
    });

    logger.info(`[LimitEnforcement] Enforced project limit: ${disabledIds.length} projects disabled for org ${organizationId}`);
    logger.info(`[LimitEnforcement] Cascade disabled ${totalFeaturesDisabled} features`);

    return { disabled: disabledIds.length, projects: disabledIds, featuresDisabled: totalFeaturesDisabled };
  }

  /**
   * Enforce feature limit - set excess features to disabled
   * @param {string} organizationId - Organization ID
   * @param {number} maxFeatures - Maximum features allowed (null = unlimited)
   * @param {string} userId - User ID performing action
   * @returns {Object} Result
   */
  async enforceFeatureLimit(organizationId, maxFeatures, userId) {
    logger.info(`[LimitEnforcement] Enforcing feature limit for org ${organizationId}`);
    logger.info(`[LimitEnforcement] maxFeatures: ${maxFeatures}`);

    if (maxFeatures === null) {
      logger.info(`[LimitEnforcement] Unlimited features allowed, skipping enforcement`);
      return { disabled: 0, message: 'Unlimited features allowed' };
    }

    // Get IDs of disabled projects to exclude their features
    const disabledProjectIds = await Project.find({
      organization: organizationId,
      status: 'disabled'
    }).distinct('_id');

    logger.info(`[LimitEnforcement] Found ${disabledProjectIds.length} disabled projects to exclude`);

    // Get all active features (sorted by creation date - oldest first)
    // Exclude features from disabled projects and deprecated features (from deleted projects)
    const activeFeatures = await Feature.find({
      organization: organizationId,
      status: { $in: ['active', 'inactive', 'maintenance'] },
      project: { $nin: disabledProjectIds } // Exclude features from disabled projects
    }).sort({ createdAt: 1 });

    logger.info(`[LimitEnforcement] Found ${activeFeatures.length} active features (excluding disabled projects), limit is ${maxFeatures}`);

    if (activeFeatures.length <= maxFeatures) {
      logger.info(`[LimitEnforcement] Within limit (${activeFeatures.length}/${maxFeatures}), no action needed`);
      return { disabled: 0, message: 'Within limit' };
    }

    const excess = activeFeatures.length - maxFeatures;
    logger.info(`[LimitEnforcement] Excess features: ${excess} will be disabled`);

    // Disable the newest features first (last in the sorted list)
    const featuresToDisable = activeFeatures.slice(-excess);
    const disabledIds = [];

    for (const feature of featuresToDisable) {
      logger.info(`[LimitEnforcement] Disabling feature ${feature._id} (${feature.name})`);
      // Store previous status before disabling
      feature.previousStatus = feature.status || 'active';
      feature.status = 'disabled';
      feature.disabledAt = new Date();
      feature.disabledReason = 'plan_limit';
      feature.disabledNote = 'Plan limit exceeded - upgrade to re-enable';

      await feature.save();
      disabledIds.push(feature._id.toString());
    }

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'features_disabled_plan_limit',
      resourceType: 'feature',
      description: `${disabledIds.length} feature(s) disabled due to plan limit`,
      afterState: { disabledFeatures: disabledIds, maxFeatures }
    });

    logger.info(`[LimitEnforcement] Enforced feature limit: ${disabledIds.length} features disabled for org ${organizationId}`);

    return { disabled: disabledIds.length, features: disabledIds };
  }

  /**
   * Enforce simulation limit - set excess simulations to disabled
   * @param {string} organizationId - Organization ID
   * @param {number} maxSimulations - Maximum simulations allowed (null = unlimited)
   * @param {string} userId - User ID performing action
   * @returns {Object} Result
   */
  async enforceSimulationLimit(organizationId, maxSimulations, userId) {
    logger.info(`[LimitEnforcement] Enforcing simulation limit for org ${organizationId}`);
    logger.info(`[LimitEnforcement] maxSimulations: ${maxSimulations}`);

    if (maxSimulations === null) {
      logger.info(`[LimitEnforcement] Unlimited simulations allowed, skipping enforcement`);
      return { disabled: 0, message: 'Unlimited simulations allowed' };
    }

    // Get all active simulations (sorted by creation date - oldest first)
    // Exclude already disabled simulations
    const activeSimulations = await Simulation.find({
      organization: organizationId,
      status: { $in: ['draft', 'pending', 'running', 'completed', 'failed'] }
    }).sort({ createdAt: 1 });

    logger.info(`[LimitEnforcement] Found ${activeSimulations.length} active simulations, limit is ${maxSimulations}`);

    if (activeSimulations.length <= maxSimulations) {
      logger.info(`[LimitEnforcement] Within limit (${activeSimulations.length}/${maxSimulations}), no action needed`);
      return { disabled: 0, message: 'Within limit' };
    }

    const excess = activeSimulations.length - maxSimulations;
    logger.info(`[LimitEnforcement] Excess simulations: ${excess} will be disabled`);

    // Disable the newest simulations first (last in the sorted list)
    const simulationsToDisable = activeSimulations.slice(-excess);
    const disabledIds = [];

    for (const simulation of simulationsToDisable) {
      logger.info(`[LimitEnforcement] Disabling simulation ${simulation._id} (${simulation.name})`);
      // Store previous status before disabling
      simulation.previousStatus = simulation.status;
      simulation.status = 'disabled';
      simulation.disabledAt = new Date();
      simulation.disabledReason = 'plan_limit';
      simulation.disabledNote = 'Plan limit exceeded - upgrade to re-enable';

      await simulation.save();
      disabledIds.push(simulation._id.toString());
    }

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'simulations_disabled_plan_limit',
      resourceType: 'simulation',
      description: `${disabledIds.length} simulation(s) disabled due to plan limit`,
      afterState: { disabledSimulations: disabledIds, maxSimulations }
    });

    logger.info(`[LimitEnforcement] Enforced simulation limit: ${disabledIds.length} simulations disabled for org ${organizationId}`);

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
    logger.info(`[LimitEnforcement] Checking projects for re-enable in org ${organizationId}`);

    // Find projects disabled due to plan limit (sorted by disabledAt to restore in order)
    const disabledProjects = await Project.find({
      organization: organizationId,
      isActive: true,
      status: 'disabled',
      disabledReason: 'plan_limit'
    }).sort({ disabledAt: 1 });

    logger.info(`[LimitEnforcement] Found ${disabledProjects.length} disabled projects with reason 'plan_limit'`);

    if (disabledProjects.length === 0) {
      return { reenabled: 0 };
    }

    const maxProjects = limits.maxProjects === null ? 999 : limits.maxProjects;
    const activeProjects = await Project.countDocuments({
      organization: organizationId,
      isActive: true,
      status: { $in: ['active', 'inactive'] }
    });

    const availableSlots = maxProjects - activeProjects;

    logger.info(`[LimitEnforcement] maxProjects: ${maxProjects}, activeProjects: ${activeProjects}, availableSlots: ${availableSlots}`);

    if (availableSlots <= 0) {
      logger.info(`[LimitEnforcement] No available slots to re-enable projects`);
      return { reenabled: 0, message: 'No available slots' };
    }

    const projectsToReenable = disabledProjects.slice(0, availableSlots);
    const reenabledIds = [];
    let totalFeaturesReenabled = 0;

    for (const project of projectsToReenable) {
      logger.info(`[LimitEnforcement] Re-enabling project ${project._id} (${project.name}) with previousStatus: ${project.previousStatus || 'active'}`);
      // Restore to previous status (was active or inactive)
      project.status = project.previousStatus || 'active';
      project.disabledAt = null;
      project.disabledReason = null;
      project.previousStatus = null;
      project.disabledNote = null;

      await project.save();
      reenabledIds.push(project._id.toString());

      // Cascade re-enable all features under this project that were disabled due to plan limit
      const featuresToReenable = await Feature.find({
        project: project._id,
        status: 'disabled',
        disabledReason: 'plan_limit'
      });

      for (const feature of featuresToReenable) {
        logger.info(`[LimitEnforcement] Cascading re-enable to feature ${feature._id} (${feature.name})`);
        feature.status = feature.previousStatus || 'active';
        feature.disabledAt = null;
        feature.disabledReason = null;
        feature.previousStatus = null;
        feature.disabledNote = null;
        await feature.save();
        totalFeaturesReenabled++;
      }
    }

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'projects_reenabled_plan_upgrade',
      resourceType: 'project',
      description: `${reenabledIds.length} project(s) re-enabled after plan upgrade`,
      afterState: { reenabledProjects: reenabledIds, reenabledFeatures: totalFeaturesReenabled }
    });

    logger.info(`[LimitEnforcement] Projects re-enabled: ${reenabledIds.length} projects for org ${organizationId}`);
    logger.info(`[LimitEnforcement] Cascade re-enabled ${totalFeaturesReenabled} features`);

    return { reenabled: reenabledIds.length, projects: reenabledIds, featuresReenabled: totalFeaturesReenabled };
  }

  /**
   * Re-enable disabled features
   * @param {string} organizationId - Organization ID
   * @param {Object} limits - Plan limits
   * @param {string} userId - User ID performing action
   * @returns {Object} Result
   */
  async reamedFeatures(organizationId, limits, userId) {
    logger.info(`[LimitEnforcement] Checking features for re-enable in org ${organizationId}`);

    // Get IDs of active projects (only features under active projects can be re-enabled)
    const activeProjectIds = await Project.find({
      organization: organizationId,
      isActive: true,
      status: { $in: ['active', 'inactive'] }
    }).distinct('_id');

    logger.info(`[LimitEnforcement] Found ${activeProjectIds.length} active projects`);

    // Find features disabled due to plan limit (sorted by disabledAt to restore in order)
    // Only features under active projects can be re-enabled
    // Exclude deprecated features (from deleted projects)
    const disabledFeatures = await Feature.find({
      organization: organizationId,
      status: 'disabled',
      disabledReason: 'plan_limit',
      project: { $in: activeProjectIds } // Only features under active projects
    }).sort({ disabledAt: 1 });

    logger.info(`[LimitEnforcement] Found ${disabledFeatures.length} disabled features with reason 'plan_limit' under active projects`);

    if (disabledFeatures.length === 0) {
      return { reenabled: 0 };
    }

    const maxFeatures = limits.maxFeatures === null ? 999 : limits.maxFeatures;

    // Count active features (excluding those from disabled projects)
    const activeFeatures = await Feature.countDocuments({
      organization: organizationId,
      status: { $in: ['active', 'inactive', 'maintenance'] },
      project: { $in: activeProjectIds }
    });

    const availableSlots = maxFeatures - activeFeatures;

    logger.info(`[LimitEnforcement] maxFeatures: ${maxFeatures}, activeFeatures: ${activeFeatures}, availableSlots: ${availableSlots}`);

    if (availableSlots <= 0) {
      logger.info(`[LimitEnforcement] No available slots to re-enable features`);
      return { reenabled: 0, message: 'No available slots' };
    }

    const featuresToReenable = disabledFeatures.slice(0, availableSlots);
    const reenabledIds = [];

    for (const feature of featuresToReenable) {
      logger.info(`[LimitEnforcement] Re-enabling feature ${feature._id} (${feature.name}) with previousStatus: ${feature.previousStatus || 'active'}`);
      // Restore to previous status (was active, inactive, or maintenance)
      feature.status = feature.previousStatus || 'active';
      feature.disabledAt = null;
      feature.disabledReason = null;
      feature.previousStatus = null;
      feature.disabledNote = null;

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

    logger.info(`[LimitEnforcement] Features re-enabled: ${reenabledIds.length} features for org ${organizationId}`);

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
      status: 'disabled',
      disabledReason: 'plan_limit'
    }).sort({ disabledAt: 1 }); // Re-enable in order they were disabled

    if (disabledSimulations.length === 0) {
      return { reenabled: 0 };
    }

    const maxSimulations = limits.maxSimulations === null ? 999 : limits.maxSimulations;
    const activeSimulations = await Simulation.countDocuments({
      organization: organizationId,
      status: { $in: ['draft', 'pending', 'running', 'completed', 'failed'] }
    });

    const availableSlots = maxSimulations - activeSimulations;

    if (availableSlots <= 0) {
      return { reenabled: 0, message: 'No available slots' };
    }

    const simulationsToReenable = disabledSimulations.slice(0, availableSlots);
    const reenabledIds = [];

    for (const simulation of simulationsToReenable) {
      // Restore to previous status (was draft, running, completed, etc.)
      simulation.status = simulation.previousStatus || 'draft';
      simulation.disabledAt = null;
      simulation.disabledReason = null;
      simulation.previousStatus = null;
      simulation.disabledNote = null;

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