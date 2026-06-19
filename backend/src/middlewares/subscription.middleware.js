/**
 * Subscription Middleware
 *
 * Validates subscription status before allowing resource operations.
 * Enforces plan limits and restrictions for:
 * - Active subscription status
 * - Trial period validity
 * - Grace period handling
 * - Resource creation limits
 */

import Organization from '../models/Organization.js';
import Plan from '../models/Plan.js';
import { AppError } from './error.middleware.js';
import limitService from '../services/limit.service.js';
import logger from '../config/logger.js';

// Valid subscription statuses for resource operations
const ACTIVE_STATUSES = ['active', 'trial', 'grace_period'];

// Default plan limits (fallback)
const DEFAULT_LIMITS = {
  starter: {
    maxUsers: 2,
    maxProjects: 4,
    maxFeatures: 8,
    maxSimulations: 10,
    maxApiCalls: 1000,
    maxTokens: 500000
  },
  professional: {
    maxUsers: 5,
    maxProjects: 6,
    maxFeatures: 12,
    maxSimulations: 20,
    maxApiCalls: 50000,
    maxTokens: 2000000
  },
  business: {
    maxUsers: 10,
    maxProjects: 10,
    maxFeatures: 20,
    maxSimulations: 30,
    maxApiCalls: 250000,
    maxTokens: 10000000
  }
};

/**
 * Get default limits for a plan tier
 * @param {string} tier - Plan tier
 * @returns {Object} Default limits
 */
const getDefaultLimits = (tier) => {
  return DEFAULT_LIMITS[tier?.toLowerCase()] || DEFAULT_LIMITS.starter;
};

/**
 * Check if subscription is active
 * @param {Object} subscription - Subscription object
 * @returns {Object} { isActive: boolean, status: string, message: string }
 */
const checkSubscriptionStatus = (subscription) => {
  if (!subscription) {
    return {
      isActive: false,
      status: 'no_subscription',
      message: 'No active subscription. Please subscribe to a plan.'
    };
  }

  const { status, trialEndsAt, currentPeriodEnd } = subscription;

  // Active subscription
  if (status === 'active') {
    return { isActive: true, status: 'active', message: 'Subscription is active' };
  }

  // Trial subscription
  if (status === 'trial') {
    const now = new Date();
    const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;

    if (!trialEnd || now > trialEnd) {
      return {
        isActive: false,
        status: 'trial_expired',
        message: 'Trial period has expired. Please subscribe to a plan.'
      };
    }

    return { isActive: true, status: 'trial', message: 'Trial subscription is active' };
  }

  // Grace period
  if (status === 'grace_period') {
    return {
      isActive: true,
      status: 'grace_period',
      message: 'Subscription is in grace period. Please update payment method.'
    };
  }

  // Expired, cancelled, past_due, pending_payment
  return {
    isActive: false,
    status: status || 'inactive',
    message: `Subscription status: ${status}. Please update your subscription.`
  };
};

/**
 * Validate subscription status middleware
 * Checks if the organization has an active subscription
 */
export const validateSubscription = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization || req.params.organizationId || req.body.organization;

    if (!organizationId) {
      // No organization context - allow request (for super admin, etc.)
      return next();
    }

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const subscriptionCheck = checkSubscriptionStatus(organization.subscription);

    if (!subscriptionCheck.isActive) {
      throw new AppError(
        subscriptionCheck.message,
        402, // Payment Required
        'SUBSCRIPTION_REQUIRED',
        {
          subscriptionStatus: subscriptionCheck.status,
          message: subscriptionCheck.message
        }
      );
    }

    // Add subscription info to request for downstream use
    req.subscription = {
      status: subscriptionCheck.status,
      plan: organization.subscription?.plan || 'starter',
      planId: organization.subscription?.planId,
      organization: organizationId
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check resource limit middleware factory
 * @param {string} resourceType - Type of resource (projects, features, simulations, teamMembers, apiCalls, tokens)
 * @param {number} count - Number to add (default: 1)
 * @returns {Function} Express middleware
 */
export const checkResourceLimit = (resourceType, count = 1) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organization || req.params.organizationId || req.body.organization;

      if (!organizationId) {
        return next();
      }

      // First validate subscription is active
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new AppError('Organization not found', 404, 'NOT_FOUND');
      }

      const subscriptionCheck = checkSubscriptionStatus(organization.subscription);

      if (!subscriptionCheck.isActive) {
        throw new AppError(
          subscriptionCheck.message,
          402,
          'SUBSCRIPTION_REQUIRED',
          {
            subscriptionStatus: subscriptionCheck.status,
            resourceType
          }
        );
      }

      // Check the limit
      const limitResult = await limitService.checkLimit(organizationId, resourceType, count);

      if (!limitResult.allowed) {
        const plan = organization.subscription?.plan || 'starter';
        throw new AppError(
          `${resourceType} limit reached. Current: ${limitResult.current}/${limitResult.limit}. Upgrade your ${plan} plan to continue.`,
          403,
          'LIMIT_EXCEEDED',
          {
            resourceType,
            current: limitResult.current,
            limit: limitResult.limit,
            plan,
            remaining: limitResult.remaining
          }
        );
      }

      // Add limit info to request
      req.resourceLimit = {
        type: resourceType,
        current: limitResult.current,
        limit: limitResult.limit,
        remaining: limitResult.remaining
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate plan feature access
 * @param {string} featureKey - Feature key to check
 * @returns {Function} Express middleware
 */
export const requirePlanFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organization || req.params.organizationId || req.body.organization;

      if (!organizationId) {
        return next();
      }

      const organization = await Organization.findById(organizationId)
        .populate('subscription.planId');

      if (!organization) {
        throw new AppError('Organization not found', 404, 'NOT_FOUND');
      }

      const subscriptionCheck = checkSubscriptionStatus(organization.subscription);

      if (!subscriptionCheck.isActive) {
        throw new AppError(
          subscriptionCheck.message,
          402,
          'SUBSCRIPTION_REQUIRED'
        );
      }

      const plan = organization.subscription?.planId;
      const tier = organization.subscription?.plan || 'starter';

      // Check if plan has the feature enabled
      // For now, we check against plan tier capabilities
      const featureAccess = {
        advanced_analytics: ['professional', 'business'],
        custom_reports: ['professional', 'business'],
        api_access: ['starter', 'professional', 'business'],
        webhooks: ['professional', 'business'],
        priority_support: ['business'],
        custom_integrations: ['business'],
        team_collaboration: ['starter', 'professional', 'business'],
        sso: ['business'],
        audit_logs: ['professional', 'business'],
        data_export: ['starter', 'professional', 'business'],
        bulk_operations: ['professional', 'business']
      };

      const allowedTiers = featureAccess[featureKey];

      if (!allowedTiers) {
        // Unknown feature - allow access
        return next();
      }

      if (!allowedTiers.includes(tier.toLowerCase())) {
        throw new AppError(
          `Your current plan (${tier}) does not include ${featureKey}. Upgrade to access this feature.`,
          403,
          'FEATURE_NOT_AVAILABLE',
          {
            feature: featureKey,
            currentPlan: tier,
            requiredPlans: allowedTiers
          }
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate plan tier minimum
 * @param {string} minimumTier - Minimum required tier
 * @returns {Function} Express middleware
 */
export const requireMinimumPlanTier = (minimumTier) => {
  const tierHierarchy = { starter: 1, professional: 2, business: 3 };

  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organization || req.params.organizationId || req.body.organization;

      if (!organizationId) {
        return next();
      }

      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new AppError('Organization not found', 404, 'NOT_FOUND');
      }

      const currentTier = organization.subscription?.plan?.toLowerCase() || 'starter';
      const currentLevel = tierHierarchy[currentTier] || 0;
      const requiredLevel = tierHierarchy[minimumTier.toLowerCase()] || 0;

      if (currentLevel < requiredLevel) {
        throw new AppError(
          `This feature requires ${minimumTier} plan or higher. Your current plan: ${currentTier}`,
          403,
          'PLAN_UPGRADE_REQUIRED',
          {
            currentPlan: currentTier,
            requiredPlan: minimumTier
          }
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user can perform downgrade
 * Validates that downgrade won't cause data loss
 */
export const validateDowngrade = async (req, res, next) => {
  try {
    const { targetPlanId } = req.body;
    const organizationId = req.user?.organization || req.params.organizationId;

    if (!organizationId || !targetPlanId) {
      throw new AppError('Organization and target plan are required', 400, 'MISSING_PARAMS');
    }

    const organization = await Organization.findById(organizationId)
      .populate('subscription.planId');

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Get target plan
    const targetPlan = await Plan.findById(targetPlanId);

    if (!targetPlan) {
      throw new AppError('Target plan not found', 404, 'PLAN_NOT_FOUND');
    }

    const currentTier = organization.subscription?.plan || 'starter';
    const targetTier = targetPlan.tier;

    // Get tier hierarchy
    const tierHierarchy = { starter: 1, professional: 2, business: 3 };
    const currentLevel = tierHierarchy[currentTier] || 0;
    const targetLevel = tierHierarchy[targetTier] || 0;

    // Check if it's actually a downgrade
    if (targetLevel >= currentLevel) {
      return next(); // Not a downgrade, allow
    }

    // Check if current billing period has ended
    const now = new Date();
    const periodEnd = organization.subscription?.currentPeriodEnd;

    if (periodEnd && now < periodEnd) {
      const daysRemaining = Math.ceil((periodEnd - now) / (24 * 60 * 60 * 1000));

      throw new AppError(
        `Cannot downgrade while subscription is active. ${daysRemaining} days remaining in current billing cycle.`,
        400,
        'DOWNGRADE_NOT_ALLOWED',
        {
          reason: 'SUBSCRIPTION_ACTIVE',
          daysRemaining,
          currentPeriodEnd: periodEnd,
          canDowngradeOn: periodEnd
        }
      );
    }

    // Get current usage
    const usage = await limitService.getCurrentUsage(organizationId);

    // Get target limits
    const targetLimits = {
      maxUsers: targetPlan.limits?.maxUsers ?? getDefaultLimits(targetTier).maxUsers,
      maxProjects: targetPlan.limits?.maxProjects ?? getDefaultLimits(targetTier).maxProjects,
      maxFeatures: targetPlan.limits?.maxFeatures ?? getDefaultLimits(targetTier).maxFeatures,
      maxSimulations: targetPlan.limits?.maxSimulations ?? getDefaultLimits(targetTier).maxSimulations
    };

    // Check if downgrade would cause resource disabling
    const downgradeImpact = {
      membersToDisable: 0,
      projectsToDisable: 0,
      featuresToDisable: 0,
      simulationsToDisable: 0,
      warnings: []
    };

    if (targetLimits.maxUsers !== null && (usage.teamMembers + 1) > targetLimits.maxUsers) {
      downgradeImpact.membersToDisable = (usage.teamMembers + 1) - targetLimits.maxUsers;
      downgradeImpact.warnings.push(`${downgradeImpact.membersToDisable} member(s) will be disabled`);
    }

    if (targetLimits.maxProjects !== null && usage.projects > targetLimits.maxProjects) {
      downgradeImpact.projectsToDisable = usage.projects - targetLimits.maxProjects;
      downgradeImpact.warnings.push(`${downgradeImpact.projectsToDisable} project(s) will be disabled`);
    }

    if (targetLimits.maxFeatures !== null && usage.features > targetLimits.maxFeatures) {
      downgradeImpact.featuresToDisable = usage.features - targetLimits.maxFeatures;
      downgradeImpact.warnings.push(`${downgradeImpact.featuresToDisable} feature(s) will be set to inactive`);
    }

    if (targetLimits.maxSimulations !== null && usage.simulations > targetLimits.maxSimulations) {
      downgradeImpact.simulationsToDisable = usage.simulations - targetLimits.maxSimulations;
      downgradeImpact.warnings.push(`${downgradeImpact.simulationsToDisable} simulation(s) will be set to draft`);
    }

    // Add downgrade impact to request
    req.downgradeImpact = downgradeImpact;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Grace period enforcement
 * Allows limited operations during grace period
 */
export const enforceGracePeriodLimits = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization || req.params.organizationId || req.body.organization;

    if (!organizationId) {
      return next();
    }

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const status = organization.subscription?.status;

    // If in grace period, restrict certain operations
    if (status === 'grace_period') {
      const gracePeriodStart = organization.subscription?.currentPeriodEnd;
      const now = new Date();
      const gracePeriodDays = 7;
      const gracePeriodEnd = gracePeriodStart ? new Date(gracePeriodStart.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000) : null;

      if (gracePeriodEnd && now > gracePeriodEnd) {
        // Grace period expired
        throw new AppError(
          'Grace period has expired. Please update your payment method.',
          402,
          'GRACE_PERIOD_EXPIRED'
        );
      }

      // In grace period - allow read operations but restrict writes
      // For now, we'll allow all operations during grace period with a warning
      req.isGracePeriod = true;

      // Add warning header
      res.setHeader('X-Grace-Period', 'true');
      res.setHeader('X-Grace-Period-End', gracePeriodEnd?.toISOString() || '');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Get subscription info for request context
 */
export const attachSubscriptionContext = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization;

    if (!organizationId) {
      return next();
    }

    const organization = await Organization.findById(organizationId)
      .populate('subscription.planId');

    if (!organization) {
      return next();
    }

    const subscription = organization.subscription;
    const plan = subscription?.planId || subscription;

    req.subscriptionContext = {
      status: subscription?.status || 'trial',
      plan: {
        id: plan?._id || plan?.id,
        name: plan?.name || subscription?.planName || 'Free',
        tier: subscription?.plan || 'starter',
        limits: plan?.limits || getDefaultLimits(subscription?.plan || 'starter')
      },
      billing: {
        cycle: subscription?.billingCycle || 'monthly',
        currentPeriodStart: subscription?.currentPeriodStart,
        currentPeriodEnd: subscription?.currentPeriodEnd
      },
      trial: {
        endsAt: subscription?.trialEndsAt,
        isActive: subscription?.status === 'trial'
      },
      scheduledDowngrade: organization.scheduledDowngrade || null
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Trial period enforcement
 * Enforces trial-specific limits
 */
export const enforceTrialLimits = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization || req.params.organizationId || req.body.organization;

    if (!organizationId) {
      return next();
    }

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const subscription = organization.subscription;

    // Only enforce for trial subscriptions
    if (subscription?.status !== 'trial') {
      return next();
    }

    const trialEndsAt = subscription?.trialEndsAt;
    const now = new Date();

    // Check if trial has expired
    if (trialEndsAt && now > new Date(trialEndsAt)) {
      throw new AppError(
        'Trial period has expired. Please subscribe to a plan to continue.',
        402,
        'TRIAL_EXPIRED',
        {
          trialEndsAt
        }
      );
    }

    // Apply stricter limits for trial (use starter limits)
    // The limitService will already apply the correct limits based on plan

    next();
  } catch (error) {
    next(error);
  }
};

export default {
  validateSubscription,
  checkResourceLimit,
  requirePlanFeature,
  requireMinimumPlanTier,
  validateDowngrade,
  enforceGracePeriodLimits,
  attachSubscriptionContext,
  enforceTrialLimits
};