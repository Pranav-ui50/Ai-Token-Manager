/**
 * useSubscriptionGuard Hook
 *
 * Provides subscription limit checking before actions.
 * Use this to guard resource creation actions.
 */

import { useCallback, useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext.jsx';

/**
 * Hook for guarding actions with subscription limit checks
 * @returns {Object} Guard utilities
 */
export function useSubscriptionGuard() {
  const { checkLimit, isActive, isTrial, isGracePeriod } = useSubscription();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState(null);

  /**
   * Check if an action can be performed
   * @param {string} resourceType - Type of resource (features, simulations, projects, teamMembers)
   * @param {number} count - Number of resources to create (default: 1)
   * @returns {Object} { canProceed: boolean, reason: string|null, showUpgrade: boolean }
   */
  const canPerformAction = useCallback((resourceType, count = 1) => {
    // Check if subscription is active
    if (!isActive()) {
      const result = {
        canProceed: false,
        reason: 'subscription_inactive',
        message: 'Your subscription is not active. Please update your subscription to continue.',
        showUpgrade: true,
        showLimitModal: true
      };
      setLimitInfo(result);
      return result;
    }

    // Check grace period
    if (isGracePeriod()) {
      // Allow in grace period but show warning
      return {
        canProceed: true,
        reason: 'grace_period',
        message: 'Your subscription is in grace period. Please update your payment method.',
        showUpgrade: false,
        warning: true
      };
    }

    // Check limit
    const limitCheck = checkLimit(resourceType, count);

    if (!limitCheck.allowed) {
      const result = {
        canProceed: false,
        reason: 'limit_exceeded',
        message: limitCheck.reason,
        showUpgrade: true,
        showLimitModal: true
      };
      setLimitInfo(result);
      return result;
    }

    return {
      canProceed: true,
      reason: null,
      message: null,
      showUpgrade: false
    };
  }, [isActive, isGracePeriod, checkLimit]);

  /**
   * Guard an async action with subscription check
   * @param {string} resourceType - Type of resource
   * @param {Function} action - Async function to execute if allowed
   * @param {Object} options - Options
   * @returns {Function} Guarded action
   */
  const guardAction = useCallback((resourceType, action, options = {}) => {
    return async (...args) => {
      const check = canPerformAction(resourceType, options.count || 1);

      if (!check.canProceed) {
        if (options.onLimitExceeded) {
          options.onLimitExceeded(check);
        }
        throw new Error(check.message || 'Limit exceeded');
      }

      if (check.warning && options.onWarning) {
        options.onWarning(check);
      }

      return action(...args);
    };
  }, [canPerformAction]);

  /**
   * Get limit reached message for a resource type
   * @param {string} resourceType - Type of resource
   * @param {number} current - Current count
   * @param {number} limit - Maximum limit
   * @returns {string} Formatted message
   */
  const getLimitReachedMessage = useCallback((resourceType, current, limit) => {
    const resourceName = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);

    if (current >= limit) {
      return `${resourceName} limit reached. Your current plan allows only ${limit} ${resourceType}. Please upgrade your subscription or remove existing ${resourceType} to continue.`;
    }

    return `${resourceName} limit warning. You have used ${current} of ${limit} ${resourceType} (${Math.round((current / limit) * 100)}%). Consider upgrading for more capacity.`;
  }, []);

  /**
   * Open limit exceeded modal
   */
  const openLimitModal = useCallback((info) => {
    setLimitInfo(info);
    setShowLimitModal(true);
  }, []);

  /**
   * Close limit exceeded modal
   */
  const closeLimitModal = useCallback(() => {
    setShowLimitModal(false);
    setLimitInfo(null);
  }, []);

  return {
    canPerformAction,
    guardAction,
    getLimitReachedMessage,
    showLimitModal,
    limitInfo,
    openLimitModal,
    closeLimitModal,
    isActive,
    isTrial,
    isGracePeriod
  };
}

/**
 * Resource limit constants
 */
export const RESOURCE_LIMITS = {
  FEATURES: 'features',
  SIMULATIONS: 'simulations',
  PROJECTS: 'projects',
  TEAM_MEMBERS: 'teamMembers',
  API_CALLS: 'apiCalls',
  TOKENS: 'tokens',
  STORAGE: 'storage'
};

/**
 * Resource display names
 */
export const RESOURCE_NAMES = {
  features: 'Feature',
  simulations: 'Simulation',
  projects: 'Project',
  teamMembers: 'Team Member',
  apiCalls: 'API Call',
  tokens: 'Token',
  storage: 'Storage'
};

/**
 * Get resource name for display
 */
export const getResourceName = (resourceType) => {
  return RESOURCE_NAMES[resourceType] || resourceType;
};

/**
 * Format limit error message
 */
export const formatLimitError = (error, resourceType) => {
  if (error?.code === 'LIMIT_EXCEEDED' || error?.code === 'FEATURE_LIMIT_EXCEEDED' || error?.code === 'SIMULATION_LIMIT_EXCEEDED') {
    const limit = error?.details?.limit;
    const current = error?.details?.current;
    const resourceName = getResourceName(resourceType);

    return {
      type: 'limit_exceeded',
      title: `${resourceName} Limit Reached`,
      message: `${resourceName} limit reached. Your current plan allows only ${limit} ${resourceType.toLowerCase()}s. You currently have ${current}. Please upgrade your subscription or reduce usage to continue.`,
      current,
      limit,
      showUpgrade: true
    };
  }

  if (error?.code === 'SUBSCRIPTION_REQUIRED') {
    return {
      type: 'subscription_required',
      title: 'Subscription Required',
      message: 'Your subscription is not active. Please update your subscription to continue.',
      showUpgrade: true
    };
  }

  return {
    type: 'error',
    title: 'Error',
    message: error?.message || 'An unexpected error occurred.',
    showUpgrade: false
  };
};

export default useSubscriptionGuard;