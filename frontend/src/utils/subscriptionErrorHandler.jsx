/**
 * Subscription Limit Error Handler
 *
 * Provides utilities for handling subscription limit errors
 * and displaying appropriate user messages.
 */

import toast from 'react-hot-toast';
import { showToast } from './toasts.jsx';

/**
 * Check if an error is a subscription/limit related error
 */
export const isSubscriptionError = (error) => {
  const errorCodes = [
    'LIMIT_EXCEEDED',
    'FEATURE_LIMIT_EXCEEDED',
    'SIMULATION_LIMIT_EXCEEDED',
    'PROJECT_LIMIT_EXCEEDED',
    'MEMBER_LIMIT_EXCEEDED',
    'SUBSCRIPTION_REQUIRED',
    'SUBSCRIPTION_INACTIVE',
    'PLAN_CHANGE_NOT_ALLOWED',
    'DOWNGRADE_NOT_ALLOWED',
    'TRIAL_EXPIRED',
    'GRACE_PERIOD_EXPIRED'
  ];

  const code = error?.response?.data?.error?.code || error?.code || error?.response?.data?.code;
  return errorCodes.includes(code);
};

/**
 * Get a user-friendly message for subscription errors
 */
export const getSubscriptionErrorMessage = (error) => {
  const errorCode = error?.response?.data?.error?.code || error?.code || error?.response?.data?.code;
  const errorDetails = error?.response?.data?.error?.details || error?.details || error?.response?.data?.details;
  const errorMessage = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message;

  const resourceNames = {
    features: 'Feature',
    simulations: 'Simulation',
    projects: 'Project',
    teamMembers: 'Team Member',
    apiCalls: 'API Call',
    tokens: 'Token',
    storage: 'Storage'
  };

  switch (errorCode) {
    case 'FEATURE_LIMIT_EXCEEDED':
    case 'LIMIT_EXCEEDED': {
      const resourceType = errorDetails?.limitType || 'features';
      const resourceName = resourceNames[resourceType] || resourceType;
      const current = errorDetails?.current ?? 0;
      const limit = errorDetails?.limit ?? 0;
      return {
        title: `${resourceName} Limit Reached`,
        message: `${resourceName} limit reached. Your current plan allows only ${limit} ${resourceType.toLowerCase()}s. You currently have ${current}. Please upgrade your subscription or remove existing ${resourceType.toLowerCase()}s to continue.`,
        action: 'upgrade',
        showUpgrade: true,
        details: { current, limit, resourceType }
      };
    }

    case 'SIMULATION_LIMIT_EXCEEDED': {
      const current = errorDetails?.current ?? 0;
      const limit = errorDetails?.limit ?? 0;
      return {
        title: 'Simulation Limit Reached',
        message: `Simulation limit reached. Your current plan allows only ${limit} simulations. You currently have ${current} simulations. Please upgrade your subscription or delete existing simulations to continue.`,
        action: 'upgrade',
        showUpgrade: true,
        details: { current, limit, resourceType: 'simulations' }
      };
    }

    case 'PROJECT_LIMIT_EXCEEDED': {
      const current = errorDetails?.current ?? 0;
      const limit = errorDetails?.limit ?? 0;
      return {
        title: 'Project Limit Reached',
        message: `Project limit reached. Your current plan allows only ${limit} projects. You currently have ${current} projects. Please upgrade your subscription to create more projects.`,
        action: 'upgrade',
        showUpgrade: true,
        details: { current, limit, resourceType: 'projects' }
      };
    }

    case 'MEMBER_LIMIT_EXCEEDED': {
      const current = errorDetails?.current ?? 0;
      const limit = errorDetails?.limit ?? 0;
      return {
        title: 'Team Member Limit Reached',
        message: `Team member limit reached. Your current plan allows only ${limit} members. You currently have ${current} members. Please upgrade your subscription to add more team members.`,
        action: 'upgrade',
        showUpgrade: true,
        details: { current, limit, resourceType: 'teamMembers' }
      };
    }

    case 'SUBSCRIPTION_REQUIRED':
    case 'SUBSCRIPTION_INACTIVE':
      return {
        title: 'Subscription Required',
        message: 'Your subscription is not active. Please update your subscription to continue.',
        action: 'subscribe',
        showUpgrade: true,
        details: {}
      };

    case 'TRIAL_EXPIRED':
      return {
        title: 'Trial Expired',
        message: 'Your trial period has expired. Please subscribe to a plan to continue using all features.',
        action: 'subscribe',
        showUpgrade: true,
        details: {}
      };

    case 'GRACE_PERIOD_EXPIRED':
      return {
        title: 'Grace Period Expired',
        message: 'Your subscription grace period has expired. Please update your payment method to continue.',
        action: 'update_payment',
        showUpgrade: false,
        details: {}
      };

    case 'PLAN_CHANGE_NOT_ALLOWED':
    case 'DOWNGRADE_NOT_ALLOWED':
      return {
        title: 'Plan Change Not Allowed',
        message: errorMessage || 'This plan change is not allowed at this time.',
        action: 'none',
        showUpgrade: false,
        details: errorDetails || {}
      };

    default:
      return {
        title: 'Error',
        message: errorMessage || 'An unexpected error occurred. Please try again.',
        action: 'none',
        showUpgrade: false,
        details: {}
      };
  }
};

/**
 * Handle subscription errors with toast notification
 */
export const handleSubscriptionError = (error, options = {}) => {
  if (!isSubscriptionError(error)) {
    // Not a subscription error, return original error handling
    const message = error?.response?.data?.error?.message ||
                    error?.response?.data?.message ||
                    error?.message ||
                    'An unexpected error occurred';
    showToast.error(message);
    return false;
  }

  const errorInfo = getSubscriptionErrorMessage(error);

  // Show toast with upgrade action button
  if (errorInfo.showUpgrade) {
    // Use custom toast with action button for upgrade prompts
    toast.error(
      <div className="flex flex-col gap-2">
        <span>{errorInfo.message}</span>
        <button
          onClick={() => {
            toast.dismiss();
            window.location.href = '/billing';
          }}
          className="mt-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          Upgrade Plan
        </button>
      </div>,
      {
        duration: 8000,
        style: {
          maxWidth: '500px'
        }
      }
    );
  } else {
    showToast.error(errorInfo.message);
  }

  return true;
};

/**
 * Show limit warning toast
 */
export const showLimitWarning = (resourceType, current, limit) => {
  const resourceName = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
  const percentage = Math.round((current / limit) * 100);

  if (percentage >= 100) {
    // Use custom toast with action button for limit exceeded
    toast.error(
      <div className="flex flex-col gap-2">
        <span>{resourceName} limit reached ({current}/{limit}). Upgrade to continue.</span>
        <button
          onClick={() => {
            toast.dismiss();
            window.location.href = '/billing';
          }}
          className="mt-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          Upgrade Plan
        </button>
      </div>,
      {
        duration: 8000,
        style: {
          maxWidth: '500px'
        }
      }
    );
  } else if (percentage >= 80) {
    showToast.warning(`${resourceName} usage at ${percentage}% (${current}/${limit}). Consider upgrading.`);
  }
};

/**
 * Format resource type for display
 */
export const formatResourceType = (resourceType) => {
  const resourceNames = {
    features: 'Features',
    simulations: 'Simulations',
    projects: 'Projects',
    teamMembers: 'Team Members',
    apiCalls: 'API Calls',
    tokens: 'Tokens',
    storage: 'Storage'
  };
  return resourceNames[resourceType] || resourceType;
};

export default {
  isSubscriptionError,
  getSubscriptionErrorMessage,
  handleSubscriptionError,
  showLimitWarning,
  formatResourceType
};
