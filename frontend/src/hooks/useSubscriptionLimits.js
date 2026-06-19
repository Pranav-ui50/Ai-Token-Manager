/**
 * useSubscriptionLimits Hook
 *
 * Custom hook for checking subscription limits and restrictions.
 * Provides utility functions for limit validation and messaging.
 */

import { useCallback, useMemo } from 'react';
import { useSubscription } from '../context/SubscriptionContext.jsx';

/**
 * Hook for subscription limit checking and messaging
 * @returns {Object} Limit checking utilities
 */
export function useSubscriptionLimits() {
  const {
    limitsStatus,
    usage,
    plan,
    subscription,
    isActive,
    isTrial,
    isGracePeriod,
    checkLimit,
    getUsagePercentage,
    isNearLimit,
    isLimitExceeded
  } = useSubscription();

  // Get limit message for a resource type
  const getLimitMessage = useCallback((resourceType, action = 'create') => {
    if (!limitsStatus || !limitsStatus[resourceType]) {
      return null;
    }

    const limit = limitsStatus[resourceType];

    if (limit.isUnlimited) {
      return null;
    }

    if (limit.isExceeded) {
      return {
        type: 'error',
        title: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Limit Exceeded`,
        message: `You have reached your ${resourceType} limit of ${limit.limit}. Upgrade your plan to ${action} more.`,
        current: limit.current,
        limit: limit.limit,
        percentage: limit.percentage
      };
    }

    if (limit.isNearLimit) {
      return {
        type: 'warning',
        title: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Limit Warning`,
        message: `You have used ${limit.percentage}% of your ${resourceType} limit (${limit.current}/${limit.limit}). Consider upgrading for more.`,
        current: limit.current,
        limit: limit.limit,
        percentage: limit.percentage
      };
    }

    return null;
  }, [limitsStatus]);

  // Get upgrade suggestion based on current limits
  const getUpgradeSuggestion = useCallback(() => {
    if (!plan || !limitsStatus) {
      return null;
    }

    const currentTier = plan.tier?.toLowerCase() || 'starter';
    const tierHierarchy = { starter: 1, professional: 2, business: 3 };

    // Find resources near or at limit
    const resourcesAtLimit = [];
    const resourcesNearLimit = [];

    Object.entries(limitsStatus).forEach(([type, status]) => {
      if (!status.isUnlimited) {
        if (status.isExceeded) {
          resourcesAtLimit.push(type);
        } else if (status.isNearLimit) {
          resourcesNearLimit.push(type);
        }
      }
    });

    if (resourcesAtLimit.length === 0 && resourcesNearLimit.length === 0) {
      return null;
    }

    // Suggest next tier
    const currentLevel = tierHierarchy[currentTier] || 1;
    const nextTier = currentLevel < 3
      ? Object.keys(tierHierarchy).find(t => tierHierarchy[t] === currentLevel + 1)
      : null;

    return {
      currentTier,
      nextTier,
      resourcesAtLimit,
      resourcesNearLimit,
      message: nextTier
        ? `Upgrade to ${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)} plan for higher limits.`
        : 'You are on the highest plan. Contact support for custom limits.'
    };
  }, [plan, limitsStatus]);

  // Check if resource creation is allowed
  const canCreateResource = useCallback((resourceType, count = 1) => {
    // Check if subscription is active
    if (!isActive()) {
      return {
        allowed: false,
        reason: 'subscription_inactive',
        message: 'Your subscription is not active. Please update your subscription to continue.'
      };
    }

    // Check grace period
    if (isGracePeriod()) {
      return {
        allowed: true,
        reason: 'grace_period',
        message: 'Your subscription is in grace period. Please update your payment method.',
        warning: true
      };
    }

    // Check limit
    const limitCheck = checkLimit(resourceType, count);

    if (!limitCheck.allowed) {
      const limit = limitsStatus?.[resourceType];
      return {
        allowed: false,
        reason: 'limit_exceeded',
        message: limitCheck.reason,
        current: limit?.current,
        limit: limit?.limit
      };
    }

    return {
      allowed: true,
      reason: null,
      message: null
    };
  }, [isActive, isGracePeriod, checkLimit, limitsStatus]);

  // Get remaining capacity for a resource
  const getRemainingCapacity = useCallback((resourceType) => {
    if (!limitsStatus || !limitsStatus[resourceType]) {
      return { remaining: null, unlimited: true };
    }

    const limit = limitsStatus[resourceType];

    if (limit.isUnlimited) {
      return { remaining: null, unlimited: true };
    }

    return {
      remaining: Math.max(0, limit.limit - limit.current),
      unlimited: false
    };
  }, [limitsStatus]);

  // Check if any limit is at warning threshold
  const hasLimitWarnings = useMemo(() => {
    if (!limitsStatus) return false;

    return Object.values(limitsStatus).some(
      status => !status.isUnlimited && (status.isNearLimit || status.isExceeded)
    );
  }, [limitsStatus]);

  // Get all limit warnings
  const getAllLimitWarnings = useCallback(() => {
    if (!limitsStatus) return [];

    const warnings = [];

    Object.entries(limitsStatus).forEach(([type, status]) => {
      if (!status.isUnlimited && (status.isNearLimit || status.isExceeded)) {
        const message = getLimitMessage(type);
        if (message) {
          warnings.push({
            resourceType: type,
            ...message
          });
        }
      }
    });

    return warnings;
  }, [limitsStatus, getLimitMessage]);

  // Get trial days remaining
  const getTrialDaysRemaining = useCallback(() => {
    if (!isTrial() || !subscription?.trialEndsAt) {
      return null;
    }

    const trialEnd = new Date(subscription.trialEndsAt);
    const now = new Date();
    const diff = trialEnd - now;
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }, [isTrial, subscription?.trialEndsAt]);

  // Get formatted usage string
  const getFormattedUsage = useCallback((resourceType) => {
    if (!limitsStatus || !limitsStatus[resourceType]) {
      return 'Unlimited';
    }

    const limit = limitsStatus[resourceType];

    if (limit.isUnlimited) {
      return 'Unlimited';
    }

    return `${limit.current} / ${limit.limit}`;
  }, [limitsStatus]);

  // Get progress bar color based on usage percentage
  const getProgressColor = useCallback((resourceType) => {
    const percentage = getUsagePercentage(resourceType);

    if (percentage >= 100) return 'red';
    if (percentage >= 80) return 'orange';
    if (percentage >= 60) return 'yellow';
    return 'green';
  }, [getUsagePercentage]);

  return {
    // Status checks
    isActive,
    isTrial,
    isGracePeriod,
    hasLimitWarnings,

    // Limit checks
    canCreateResource,
    checkLimit,
    isNearLimit,
    isLimitExceeded,

    // Messages
    getLimitMessage,
    getUpgradeSuggestion,
    getAllLimitWarnings,

    // Capacity
    getRemainingCapacity,
    getUsagePercentage,
    getFormattedUsage,
    getProgressColor,

    // Trial
    getTrialDaysRemaining,

    // Utility
    getDaysRemaining: () => {
      if (!subscription?.currentPeriodEnd) return null;
      const end = new Date(subscription.currentPeriodEnd);
      const now = new Date();
      return Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
    }
  };
}

export default useSubscriptionLimits;