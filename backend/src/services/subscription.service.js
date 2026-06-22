/**
 * Subscription Service
 *
 * Handles subscription plan management including:
 * - Plan upgrade/downgrade restrictions
 * - Subscription expiry handling
 * - Member limit management
 * - Downgrade queue processing
 */

import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';
import limitEnforcementService from './limitEnforcement.service.js';

// Plan tier hierarchy for upgrade/downgrade logic
const PLAN_HIERARCHY = {
  'starter': 1,
  'professional': 2,
  'business': 3
};

// Default plan limits (fallback when plan not found)
// These should match the seeded plans in seeder.js
const DEFAULT_LIMITS = {
  starter: {
    maxUsers: 3,
    maxProjects: 3,
    maxFeatures: 10,
    maxSimulations: 100,
    includedAiCredits: 500000,      // 500,000 tokens
    maxApiCalls: 10000,             // 10,000 API calls
    maxTokens: 500000                // 500,000 tokens
  },
  professional: {
    maxUsers: 10,
    maxProjects: 10,
    maxFeatures: 50,
    maxSimulations: 500,
    includedAiCredits: 2000000,      // 2,000,000 tokens
    maxApiCalls: 50000,             // 50,000 API calls
    maxTokens: 2000000               // 2,000,000 tokens
  },
  business: {
    maxUsers: 50,
    maxProjects: 50,
    maxFeatures: 200,
    maxSimulations: 2000,
    includedAiCredits: 10000000,    // 10,000,000 tokens
    maxApiCalls: 200000,            // 200,000 API calls
    maxTokens: 10000000              // 10,000,000 tokens
  }
};

class SubscriptionService {
  /**
   * Check if downgrade is allowed
   * @param {string} organizationId - Organization ID
   * @param {string} targetPlanTier - Target plan tier
   * @returns {Object} Downgrade check result
   */
  async canDowngrade(organizationId, targetPlanTier) {
    const organization = await Organization.findById(organizationId)
      .populate('subscription.planId');

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const currentPlanTier = organization.subscription?.plan || 'starter';
    const currentPlanLevel = PLAN_HIERARCHY[currentPlanTier] || 0;
    const targetPlanLevel = PLAN_HIERARCHY[targetPlanTier] || 0;

    // Check if it's actually a downgrade
    if (targetPlanLevel >= currentPlanLevel) {
      return { allowed: true, isDowngrade: false };
    }

    // Check if current subscription period has ended
    const now = new Date();
    const periodEnd = organization.subscription?.currentPeriodEnd;

    if (periodEnd && now < periodEnd) {
      // Subscription is still active - cannot downgrade
      const daysRemaining = Math.ceil((periodEnd - now) / (24 * 60 * 60 * 1000));

      return {
        allowed: false,
        isDowngrade: true,
        reason: 'SUBSCRIPTION_ACTIVE',
        message: `Cannot downgrade while subscription is active. ${daysRemaining} days remaining in current billing cycle.`,
        daysRemaining,
        currentPeriodEnd: periodEnd,
        canDowngradeOn: periodEnd
      };
    }

    // Check member limits for downgrade
    const targetPlan = await this.getPlanByTier(targetPlanTier);
    const currentMemberCount = organization.members?.length || 0;
    const targetMaxUsers = targetPlan?.limits?.maxUsers || DEFAULT_LIMITS[targetPlanTier]?.maxUsers;

    if (targetMaxUsers && currentMemberCount > targetMaxUsers) {
      return {
        allowed: true,
        isDowngrade: true,
        requiresMemberAction: true,
        currentMembers: currentMemberCount,
        maxAllowed: targetMaxUsers,
        membersToDisable: currentMemberCount - targetMaxUsers,
        message: `Downgrade requires disabling ${currentMemberCount - targetMaxUsers} member(s). Current: ${currentMemberCount}, Max allowed: ${targetMaxUsers}`
      };
    }

    return { allowed: true, isDowngrade: true };
  }

  /**
   * Get plan by tier
   * @param {string} tier - Plan tier
   * @returns {Object} Plan document
   */
  async getPlanByTier(tier) {
    const plan = await Plan.findOne({ tier: tier.toLowerCase(), status: 'active' })
      .populate('features.feature', 'name slug category');
    return plan;
  }

  /**
   * Validate plan change
   * @param {string} organizationId - Organization ID
   * @param {string} targetPlanId - Target plan ID or tier
   * @param {string} billingCycle - Billing cycle (monthly/yearly)
   * @returns {Object} Validation result
   */
  async validatePlanChange(organizationId, targetPlanId, billingCycle = 'monthly') {
    const organization = await Organization.findById(organizationId)
      .populate('subscription.planId');

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Get target plan
    let targetPlan;
    if (targetPlanId.match(/^[0-9a-fA-F]{24}$/)) {
      targetPlan = await Plan.findById(targetPlanId);
    } else {
      targetPlan = await this.getPlanByTier(targetPlanId);
    }

    if (!targetPlan) {
      throw new AppError('Target plan not found', 404, 'PLAN_NOT_FOUND');
    }

    const currentPlanTier = organization.subscription?.plan || 'starter';
    const currentPlanLevel = PLAN_HIERARCHY[currentPlanTier] || 0;
    const targetPlanLevel = PLAN_HIERARCHY[targetPlan.tier] || 0;

    const isUpgrade = targetPlanLevel > currentPlanLevel;
    const isDowngrade = targetPlanLevel < currentPlanLevel;

    // Check downgrade restrictions
    if (isDowngrade) {
      const downgradeCheck = await this.canDowngrade(organizationId, targetPlan.tier);
      if (!downgradeCheck.allowed) {
        return {
          valid: false,
          reason: downgradeCheck.reason,
          message: downgradeCheck.message,
          downgradeCheck
        };
      }

      // Check if members need to be disabled
      if (downgradeCheck.requiresMemberAction) {
        return {
          valid: true,
          requiresMemberAction: true,
          isDowngrade: true,
          targetPlan: {
            id: targetPlan._id,
            tier: targetPlan.tier,
            name: targetPlan.name,
            maxUsers: targetPlan.limits?.maxUsers
          },
          memberAction: {
            currentMembers: downgradeCheck.currentMembers,
            maxAllowed: downgradeCheck.maxAllowed,
            membersToDisable: downgradeCheck.membersToDisable
          },
          message: downgradeCheck.message
        };
      }
    }

    // Upgrade is always allowed
    return {
      valid: true,
      isUpgrade,
      isDowngrade,
      currentPlan: {
        tier: currentPlanTier,
        level: currentPlanLevel
      },
      targetPlan: {
        id: targetPlan._id,
        tier: targetPlan.tier,
        name: targetPlan.name,
        level: targetPlanLevel,
        maxUsers: targetPlan.limits?.maxUsers,
        price: targetPlan.billing?.price
      }
    };
  }

  /**
   * Process plan change
   * @param {string} organizationId - Organization ID
   * @param {string} targetPlanId - Target plan ID
   * @param {string} billingCycle - Billing cycle
   * @param {string} userId - User ID making the change
   * @returns {Object} Result
   */
  async processPlanChange(organizationId, targetPlanId, billingCycle, userId) {
    // Validate the change
    const validation = await this.validatePlanChange(organizationId, targetPlanId, billingCycle);

    if (!validation.valid) {
      throw new AppError(validation.message, 400, 'PLAN_CHANGE_NOT_ALLOWED');
    }

    const organization = await Organization.findById(organizationId);
    const targetPlan = await Plan.findById(targetPlanId);

    if (!targetPlan) {
      throw new AppError('Target plan not found', 404, 'PLAN_NOT_FOUND');
    }

    const currentPlanTier = organization.subscription?.plan || 'starter';
    const isDowngrade = validation.isDowngrade;
    const isUpgrade = validation.isUpgrade;

    logger.info(`Plan change: ${organizationId} from ${currentPlanTier} to ${targetPlan.tier}. isDowngrade: ${isDowngrade}, isUpgrade: ${isUpgrade}`);

    // Calculate billing period
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Update subscription FIRST (before enforcing limits)
    // This ensures getPlanLimits() returns the NEW plan limits
    organization.subscription = {
      ...organization.subscription?.toObject(),
      plan: targetPlan.tier,
      planId: targetPlan._id,
      planName: targetPlan.name,
      status: 'active',
      billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      previousPlan: currentPlanTier,
      updatedAt: now
    };

    await organization.save();
    logger.info(`[Subscription] Subscription updated: ${organizationId} now on ${targetPlan.tier}`);

    // Now enforce limits based on the NEW plan
    // If downgrade, enforce all limits (disable excess resources)
    if (isDowngrade) {
      logger.info(`[Subscription] Downgrading: enforcing limits for ${organizationId}`);
      // Pass target plan with limits for downgrade
      await limitEnforcementService.enforceAllLimits(organizationId, userId, targetPlan);
    }

    // If upgrade, re-enable all disabled resources
    let reEnableResults = null;
    if (isUpgrade) {
      logger.info(`[Subscription] Upgrading: re-enabling resources for ${organizationId}`);
      // Pass target plan with limits for upgrade
      reEnableResults = await limitEnforcementService.reenableAllResources(organizationId, userId, targetPlan);
      logger.info(`[Subscription] Re-enable results for ${organizationId}:`, JSON.stringify(reEnableResults));
    }

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'subscription_plan_changed',
      resourceType: 'organization',
      resourceId: organization._id,
      resourceName: organization.name,
      description: `Plan changed from ${currentPlanTier} to ${targetPlan.tier}`,
      beforeState: { plan: currentPlanTier },
      afterState: { plan: targetPlan.tier, billingCycle }
    });

    logger.info(`Plan changed: ${organizationId} from ${currentPlanTier} to ${targetPlan.tier} by ${userId}`);

    // Fetch updated organization with refreshed members
    const updatedOrganization = await Organization.findById(organizationId)
      .populate('members.user', 'firstName lastName email avatar');

    return {
      success: true,
      subscription: organization.subscription,
      plan: {
        id: targetPlan._id,
        tier: targetPlan.tier,
        name: targetPlan.name,
        limits: targetPlan.limits
      },
      members: updatedOrganization.members,
      reEnabled: reEnableResults,
      message: isUpgrade
        ? `Plan upgraded successfully. ${reEnableResults?.members?.reenabled || 0} member(s) re-enabled.`
        : 'Plan changed successfully'
    };
  }

  /**
   * Disable excess members when downgrading
   * @param {string} organizationId - Organization ID
   * @param {number} maxMembers - Maximum members allowed
   * @param {string} userId - User ID performing action
   */
  async disableExcessMembers(organizationId, maxMembers, userId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const currentMembers = organization.members || [];
    const owner = organization.owner.toString();

    // Filter out owner from members list for counting
    const nonOwnerMembers = currentMembers.filter(
      m => m.user.toString() !== owner && m.status === 'active'
    );

    if (nonOwnerMembers.length <= maxMembers - 1) {
      // No members to disable (subtract 1 for owner)
      return { disabled: 0 };
    }

    const membersToDisable = nonOwnerMembers.length - (maxMembers - 1);
    const membersDisabled = [];

    // Disable members from the end of the list (newest members first)
    const membersToDisableList = nonOwnerMembers.slice(-membersToDisable);

    for (const member of membersToDisableList) {
      // Update member status
      member.status = 'disabled';
      member.disabledAt = new Date();
      member.disabledReason = 'plan_limit';
      member.disabledBy = userId;

      membersDisabled.push(member.user.toString());

      // Update user's organization status
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
      resourceName: organization.name,
      description: `${membersDisabled.length} member(s) disabled due to plan downgrade`,
      afterState: {
        disabledMembers: membersDisabled,
        maxMembersAllowed: maxMembers
      }
    });

    logger.info(`Members disabled: ${membersDisabled.length} members disabled for organization ${organizationId} due to plan limit`);

    return { disabled: membersDisabled.length, members: membersDisabled };
  }

  /**
   * Check member limit before adding new member
   * @param {string} organizationId - Organization ID
   * @returns {Object} Limit check result
   */
  async checkMemberLimit(organizationId) {
    const organization = await Organization.findById(organizationId)
      .populate('subscription.planId');

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const planTier = organization.subscription?.plan || 'starter';
    const plan = await this.getPlanByTier(planTier);

    const maxUsers = plan?.limits?.maxUsers || DEFAULT_LIMITS[planTier]?.maxUsers || 999;
    const currentMemberCount = organization.members?.length || 0;
    const activeMemberCount = organization.members?.filter(m => m.status === 'active').length || 0;

    // Include owner in count
    const totalMembers = activeMemberCount + 1; // +1 for owner

    const canAdd = maxUsers === null || totalMembers < maxUsers;
    const remaining = maxUsers === null ? 'unlimited' : Math.max(0, maxUsers - totalMembers);

    return {
      canAdd,
      currentMembers: totalMembers,
      maxMembers: maxUsers === null ? 'unlimited' : maxUsers,
      remaining,
      plan: {
        tier: planTier,
        name: plan?.name || 'Free'
      },
      message: canAdd
        ? `${remaining === 'unlimited' ? 'Unlimited' : remaining} member slot(s) available`
        : `Member limit reached. Upgrade plan to add more members. Current: ${totalMembers}/${maxUsers}`
    };
  }

  /**
   * Validate member addition
   * @param {string} organizationId - Organization ID
   * @returns {Object} Validation result
   */
  async validateMemberAddition(organizationId) {
    const limitCheck = await this.checkMemberLimit(organizationId);

    if (!limitCheck.canAdd) {
      throw new AppError(
        `Cannot add member. ${limitCheck.message}`,
        400,
        'MEMBER_LIMIT_EXCEEDED'
      );
    }

    return limitCheck;
  }

  /**
   * Re-enable members when upgrading plan
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID performing action
   */
  async reenableDisabledMembers(organizationId, userId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Find members disabled due to plan limit
    const disabledMembers = organization.members?.filter(
      m => m.status === 'disabled' && m.disabledReason === 'plan_limit'
    ) || [];

    if (disabledMembers.length === 0) {
      return { reenabled: 0 };
    }

    const planTier = organization.subscription?.plan || 'starter';
    const plan = await this.getPlanByTier(planTier);
    const maxUsers = plan?.limits?.maxUsers || DEFAULT_LIMITS[planTier]?.maxUsers || 999;

    const currentActiveMembers = organization.members?.filter(
      m => m.status === 'active'
    ).length || 0;

    // Include owner in count
    const totalActive = currentActiveMembers + 1;
    const availableSlots = maxUsers === null ? 999 : maxUsers - totalActive;

    if (availableSlots <= 0) {
      return { reenabled: 0, message: 'No available slots to re-enable members' };
    }

    // Re-enable members up to available slots
    const membersToReenable = disabledMembers.slice(0, availableSlots);
    const reenabledIds = [];

    for (const member of membersToReenable) {
      member.status = 'active';
      member.disabledAt = null;
      member.disabledReason = null;
      member.disabledBy = null;
      member.reamedAt = new Date();
      member.reamedBy = userId;

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
      resourceId: organization._id,
      resourceName: organization.name,
      description: `${reamedIds.length} member(s) re-enabled after plan upgrade`,
      afterState: {
        reenabledMembers: reenabledIds
      }
    });

    logger.info(`Members re-enabled: ${reamedIds.length} members re-enabled for organization ${organizationId} after plan upgrade`);

    return { reenabled: reenabledIds.length, members: reenabledIds };
  }

  /**
   * Check and handle expired subscriptions
   * @returns {Object} Processing result
   */
  async processExpiredSubscriptions() {
    const now = new Date();

    // Find organizations with expired subscriptions
    const expiredOrgs = await Organization.find({
      'subscription.status': { $in: ['active', 'trial'] },
      'subscription.currentPeriodEnd': { $lt: now }
    });

    logger.info(`Processing ${expiredOrgs.length} expired subscriptions`);

    const results = {
      processed: 0,
      expired: 0,
      gracePeriod: 0,
      errors: []
    };

    for (const org of expiredOrgs) {
      try {
        // Check if in grace period (7 days after expiry)
        const gracePeriodEnd = new Date(org.subscription.currentPeriodEnd);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

        if (now < gracePeriodEnd) {
          // Still in grace period
          org.subscription.status = 'grace_period';
          await org.save();
          results.gracePeriod++;
          logger.info(`Organization ${org._id} entered grace period`);
        } else {
          // Subscription expired - downgrade to starter
          org.subscription.status = 'expired';
          org.subscription.plan = 'starter';
          org.subscription.planId = null;
          org.subscription.expiredAt = now;

          await org.save();

          // Disable all non-owner members
          await this.disableExcessMembers(org._id, DEFAULT_LIMITS.starter.maxUsers, null);

          results.expired++;
          logger.info(`Organization ${org._id} subscription expired, downgraded to starter`);
        }

        results.processed++;
      } catch (error) {
        logger.error(`Error processing expired subscription for ${org._id}:`, error);
        results.errors.push({
          organizationId: org._id,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get available plans for upgrade/downgrade
   * @param {string} organizationId - Organization ID
   * @returns {Object} Available plans with restrictions
   */
  async getAvailablePlans(organizationId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const currentPlanTier = organization.subscription?.plan || 'starter';
    const currentPlanLevel = PLAN_HIERARCHY[currentPlanTier] || 0;
    const currentPeriodEnd = organization.subscription?.currentPeriodEnd;
    const now = new Date();

    // Get all active public plans
    const plans = await Plan.find({
      status: 'active',
      'settings.isPublic': true
    }).sort({ displayOrder: 1, tier: 1 });

    const availablePlans = plans.map(plan => {
      const planLevel = PLAN_HIERARCHY[plan.tier] || 0;
      const isCurrentPlan = plan.tier === currentPlanTier;
      const isUpgrade = planLevel > currentPlanLevel;
      const isDowngrade = planLevel < currentPlanLevel;

      // Check if downgrade is allowed
      let canDowngrade = !isDowngrade;
      let downgradeMessage = null;

      if (isDowngrade) {
        // Downgrade restriction check
        if (currentPeriodEnd && now < currentPeriodEnd) {
          const daysRemaining = Math.ceil((currentPeriodEnd - now) / (24 * 60 * 60 * 1000));
          canDowngrade = false;
          downgradeMessage = `Available after current billing period ends (${daysRemaining} days remaining)`;
        }

        // Member limit check
        const maxUsers = plan.limits?.maxUsers || DEFAULT_LIMITS[plan.tier]?.maxUsers;
        const currentMembers = organization.members?.length || 0;

        if (maxUsers && currentMembers > maxUsers) {
          canDowngrade = false;
          downgradeMessage = `Requires reducing members from ${currentMembers} to ${maxUsers}`;
        }
      }

      return {
        id: plan._id,
        tier: plan.tier,
        name: plan.name,
        description: plan.description,
        price: plan.billing?.price || 0,
        currency: plan.billing?.currency || 'USD',
        billingInterval: plan.billing?.interval || 'month',
        limits: {
          maxUsers: plan.limits?.maxUsers || DEFAULT_LIMITS[plan.tier]?.maxUsers,
          maxProjects: plan.limits?.maxProjects || DEFAULT_LIMITS[plan.tier]?.maxProjects,
          maxFeatures: plan.limits?.maxFeatures || DEFAULT_LIMITS[plan.tier]?.maxFeatures,
          maxSimulations: plan.limits?.maxSimulations || DEFAULT_LIMITS[plan.tier]?.maxSimulations
        },
        features: plan.features,
        isCurrentPlan,
        isUpgrade,
        isDowngrade,
        canChange: isCurrentPlan ? false : (isUpgrade || canDowngrade),
        downgradeMessage,
        isPopular: plan.isPopular
      };
    });

    return {
      currentPlan: {
        tier: currentPlanTier,
        name: plans.find(p => p.tier === currentPlanTier)?.name || 'Free',
        currentPeriodEnd: organization.subscription?.currentPeriodEnd
      },
      plans: availablePlans
    };
  }

  /**
   * Schedule downgrade for end of billing period
   * @param {string} organizationId - Organization ID
   * @param {string} targetPlanId - Target plan ID
   * @param {string} userId - User ID
   * @returns {Object} Scheduled downgrade info
   */
  async scheduleDowngrade(organizationId, targetPlanId, userId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const validation = await this.validatePlanChange(organizationId, targetPlanId, 'monthly');

    if (!validation.valid && validation.reason !== 'SUBSCRIPTION_ACTIVE') {
      throw new AppError(validation.message, 400, 'DOWNGRADE_NOT_ALLOWED');
    }

    const targetPlan = await Plan.findById(targetPlanId);
    if (!targetPlan) {
      throw new AppError('Target plan not found', 404, 'PLAN_NOT_FOUND');
    }

    // Schedule the downgrade
    organization.scheduledDowngrade = {
      planId: targetPlan._id,
      planTier: targetPlan.tier,
      scheduledAt: new Date(),
      effectiveAt: organization.subscription.currentPeriodEnd,
      scheduledBy: userId
    };

    await organization.save();

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'downgrade_scheduled',
      resourceType: 'organization',
      resourceId: organization._id,
      resourceName: organization.name,
      description: `Downgrade scheduled from ${organization.subscription.plan} to ${targetPlan.tier}`,
      afterState: {
        targetPlan: targetPlan.tier,
        effectiveAt: organization.subscription.currentPeriodEnd
      }
    });

    return {
      scheduled: true,
      currentPlan: organization.subscription.plan,
      targetPlan: targetPlan.tier,
      effectiveAt: organization.subscription.currentPeriodEnd,
      message: `Downgrade to ${targetPlan.name} scheduled for ${organization.subscription.currentPeriodEnd.toLocaleDateString()}`
    };
  }

  /**
   * Cancel scheduled downgrade
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @returns {Object} Cancellation result
   */
  async cancelScheduledDowngrade(organizationId, userId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    if (!organization.scheduledDowngrade?.planId) {
      throw new AppError('No scheduled downgrade found', 400, 'NO_SCHEDULED_DOWNGRADE');
    }

    const scheduledPlan = organization.scheduledDowngrade.planTier;

    organization.scheduledDowngrade = undefined;
    await organization.save();

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'downgrade_cancelled',
      resourceType: 'organization',
      resourceId: organization._id,
      resourceName: organization.name,
      description: `Scheduled downgrade to ${scheduledPlan} cancelled`
    });

    return {
      cancelled: true,
      message: 'Scheduled downgrade cancelled successfully'
    };
  }

  /**
   * Process scheduled downgrades (called by cron job)
   * @returns {Object} Processing result
   */
  async processScheduledDowngrades() {
    const now = new Date();

    // Find organizations with scheduled downgrades that are due
    const organizations = await Organization.find({
      'scheduledDowngrade.effectiveAt': { $lte: now }
    }).populate('scheduledDowngrade.planId');

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: []
    };

    for (const org of organizations) {
      try {
        const targetPlan = org.scheduledDowngrade.planTier;
        const userId = org.scheduledDowngrade.scheduledBy;

        // Process the downgrade
        await this.processPlanChange(org._id, org.scheduledDowngrade.planId, 'monthly', userId);

        // Clear scheduled downgrade
        org.scheduledDowngrade = undefined;
        await org.save();

        results.succeeded++;
        results.processed++;

        logger.info(`Scheduled downgrade processed for ${org._id} to ${targetPlan}`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          organizationId: org._id,
          error: error.message
        });
        logger.error(`Error processing scheduled downgrade for ${org._id}:`, error);
      }
    }

    return results;
  }
}

export default new SubscriptionService();