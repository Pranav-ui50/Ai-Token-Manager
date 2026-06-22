/**
 * Subscription Context
 *
 * Manages subscription state using React Context + useReducer.
 * Provides subscription details, limits, and usage tracking.
 */

import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { useOrganization } from './OrganizationContext.jsx';
import billingApi from '../services/api/billing.api.js';

// Initial state
const initialState = {
  subscription: null,
  plan: null,
  limits: null,
  usage: null,
  limitsStatus: null,
  loading: false,
  error: null,
  alerts: []
};

// Action types
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_SUBSCRIPTION: 'SET_SUBSCRIPTION',
  SET_PLAN: 'SET_PLAN',
  SET_LIMITS: 'SET_LIMITS',
  SET_USAGE: 'SET_USAGE',
  SET_LIMITS_STATUS: 'SET_LIMITS_STATUS',
  SET_ALERTS: 'SET_ALERTS',
  CLEAR_ERROR: 'CLEAR_ERROR',
  CLEAR_ALERTS: 'CLEAR_ALERTS',
  RESET: 'RESET'
};

// Reducer
function subscriptionReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    case ACTIONS.SET_SUBSCRIPTION:
      return { ...state, subscription: action.payload, loading: false };
    case ACTIONS.SET_PLAN:
      return { ...state, plan: action.payload, loading: false };
    case ACTIONS.SET_LIMITS:
      return { ...state, limits: action.payload, loading: false };
    case ACTIONS.SET_USAGE:
      return { ...state, usage: action.payload, loading: false };
    case ACTIONS.SET_LIMITS_STATUS:
      return { ...state, limitsStatus: action.payload, loading: false };
    case ACTIONS.SET_ALERTS:
      return { ...state, alerts: action.payload };
    case ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    case ACTIONS.CLEAR_ALERTS:
      return { ...state, alerts: [] };
    case ACTIONS.RESET:
      return { ...initialState };
    default:
      return state;
  }
}

// Create context
const SubscriptionContext = createContext(null);

// Provider component
export function SubscriptionProvider({ children }) {
  const [state, dispatch] = useReducer(subscriptionReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const { currentOrganization } = useOrganization();

  // Auto-fetch subscription data when organization changes
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (!isAuthenticated || !currentOrganization?._id) {
        return;
      }

      // Skip billing API calls for superadmins - they don't have billing access
      if (user?.role === 'super_admin') {
        console.log('[SubscriptionContext] Skipping billing data fetch for superadmin');
        return;
      }

      try {
        dispatch({ type: ACTIONS.SET_LOADING, payload: true });

        // Fetch subscription and usage data
        // Note: 403 Forbidden errors are handled by axios interceptor (returns null)
        const [billingResponse, usageResponse] = await Promise.all([
          billingApi.getBilling(currentOrganization._id),
          billingApi.getUsage(currentOrganization._id)
        ]);

        if (billingResponse && billingResponse.data) {
          dispatch({ type: ACTIONS.SET_SUBSCRIPTION, payload: billingResponse.data.subscription });
          dispatch({ type: ACTIONS.SET_PLAN, payload: billingResponse.data.plan });
        }

        if (usageResponse && usageResponse.data) {
          dispatch({ type: ACTIONS.SET_USAGE, payload: usageResponse.data });
        }

        // Check for alerts
        if (usageResponse?.data?.limitsStatus) {
          const alerts = [];
          Object.entries(usageResponse.data.limitsStatus).forEach(([type, status]) => {
            if (status.isNearLimit || status.isExceeded) {
              alerts.push({
                type,
                message: status.isExceeded
                  ? `${type} limit exceeded`
                  : `${type} usage at ${status.percentage}% of limit`,
                severity: status.isExceeded ? 'error' : 'warning',
                percentage: status.percentage
              });
            }
          });
          dispatch({ type: ACTIONS.SET_ALERTS, payload: alerts });
        }

      } catch (error) {
        console.error('[SubscriptionContext] Failed to fetch subscription data:', error);
        dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      }
    };

    fetchSubscriptionData();
  }, [isAuthenticated, currentOrganization?._id, user?.role]);

  // Fetch billing details
  const fetchBilling = useCallback(async (organizationId) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const data = await billingApi.getBilling(organizationId || currentOrganization?._id);
      dispatch({ type: ACTIONS.SET_SUBSCRIPTION, payload: data.subscription });
      dispatch({ type: ACTIONS.SET_PLAN, payload: data.plan });
      return data;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [currentOrganization?._id]);

  // Fetch usage summary
  const fetchUsage = useCallback(async (organizationId) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const data = await billingApi.getUsage(organizationId || currentOrganization?._id);
      dispatch({ type: ACTIONS.SET_USAGE, payload: data });
      return data;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [currentOrganization?._id]);

  // Get available plans
  const getAvailablePlans = useCallback(async (organizationId) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const data = await billingApi.getPlansForChange(organizationId || currentOrganization?._id);
      return data;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [currentOrganization?._id]);

  // Validate plan change
  const validatePlanChange = useCallback(async (organizationId, targetPlanId) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const data = await billingApi.validatePlanChange(organizationId || currentOrganization?._id, targetPlanId);
      return data;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [currentOrganization?._id]);

  // Change plan
  const changePlan = useCallback(async (organizationId, planId, billingCycle) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const data = await billingApi.changePlan(organizationId || currentOrganization?._id, {
        planId,
        billingCycle
      });

      // Refresh subscription data
      await fetchBilling(organizationId || currentOrganization?._id);

      return data;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [currentOrganization?._id, fetchBilling]);

  // Schedule downgrade
  const scheduleDowngrade = useCallback(async (organizationId, targetPlanId) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const data = await billingApi.scheduleDowngrade(organizationId || currentOrganization?._id, targetPlanId);
      await fetchBilling(organizationId || currentOrganization?._id);
      return data;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [currentOrganization?._id, fetchBilling]);

  // Cancel scheduled downgrade
  const cancelScheduledDowngrade = useCallback(async (organizationId) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const data = await billingApi.cancelScheduledDowngrade(organizationId || currentOrganization?._id);
      await fetchBilling(organizationId || currentOrganization?._id);
      return data;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [currentOrganization?._id, fetchBilling]);

  // Check member limit
  const checkMemberLimit = useCallback(async (organizationId) => {
    try {
      const data = await billingApi.checkMemberLimit(organizationId || currentOrganization?._id);
      return data;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [currentOrganization?._id]);

  // Re-enable members
  const reenableMembers = useCallback(async (organizationId) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const data = await billingApi.reenableMembers(organizationId || currentOrganization?._id);
      await fetchBilling(organizationId || currentOrganization?._id);
      return data;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [currentOrganization?._id, fetchBilling]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, []);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ALERTS });
  }, []);

  // Check if action is allowed based on limits
  const checkLimit = useCallback((resourceType, additionalCount = 1) => {
    if (!state.limitsStatus) {
      return { allowed: true, reason: null };
    }

    const limit = state.limitsStatus[resourceType];
    if (!limit) {
      return { allowed: true, reason: null };
    }

    if (limit.isUnlimited) {
      return { allowed: true, reason: null };
    }

    const wouldExceed = limit.current + additionalCount > limit.limit;
    if (wouldExceed) {
      return {
        allowed: false,
        reason: `${resourceType} limit reached. Current: ${limit.current}/${limit.limit}. Upgrade your plan to continue.`
      };
    }

    return { allowed: true, reason: null };
  }, [state.limitsStatus]);

  // Check if subscription is active
  const isActive = useCallback(() => {
    const status = state.subscription?.status;
    return ['active', 'trial', 'grace_period'].includes(status);
  }, [state.subscription?.status]);

  // Check if in trial
  const isTrial = useCallback(() => {
    return state.subscription?.status === 'trial';
  }, [state.subscription?.status]);

  // Check if in grace period
  const isGracePeriod = useCallback(() => {
    return state.subscription?.status === 'grace_period';
  }, [state.subscription?.status]);

  // Get days remaining in period
  const getDaysRemaining = useCallback(() => {
    if (!state.subscription?.currentPeriodEnd) {
      return null;
    }

    const end = new Date(state.subscription.currentPeriodEnd);
    const now = new Date();
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }, [state.subscription?.currentPeriodEnd]);

  // Get usage percentage for a resource
  const getUsagePercentage = useCallback((resourceType) => {
    if (!state.limitsStatus || !state.limitsStatus[resourceType]) {
      return 0;
    }

    return state.limitsStatus[resourceType].percentage || 0;
  }, [state.limitsStatus]);

  // Check if near limit (>= 80%)
  const isNearLimit = useCallback((resourceType) => {
    if (!state.limitsStatus || !state.limitsStatus[resourceType]) {
      return false;
    }

    return state.limitsStatus[resourceType].isNearLimit || false;
  }, [state.limitsStatus]);

  // Check if limit exceeded
  const isLimitExceeded = useCallback((resourceType) => {
    if (!state.limitsStatus || !state.limitsStatus[resourceType]) {
      return false;
    }

    return state.limitsStatus[resourceType].isExceeded || false;
  }, [state.limitsStatus]);

  const value = {
    ...state,
    fetchBilling,
    fetchUsage,
    getAvailablePlans,
    validatePlanChange,
    changePlan,
    scheduleDowngrade,
    cancelScheduledDowngrade,
    checkMemberLimit,
    reenableMembers,
    clearError,
    clearAlerts,
    checkLimit,
    isActive,
    isTrial,
    isGracePeriod,
    getDaysRemaining,
    getUsagePercentage,
    isNearLimit,
    isLimitExceeded
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// Custom hook to use subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

export default SubscriptionContext;
