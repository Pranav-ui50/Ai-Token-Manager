/**
 * Restriction Message Component
 *
 * Displays subscription limit warnings, errors, and upgrade prompts.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Restriction message types
 */
const MESSAGE_TYPES = {
  LIMIT_WARNING: 'limit_warning',
  LIMIT_EXCEEDED: 'limit_exceeded',
  SUBSCRIPTION_INACTIVE: 'subscription_inactive',
  TRIAL_EXPIRED: 'trial_expired',
  GRACE_PERIOD: 'grace_period',
  UPGRADE_REQUIRED: 'upgrade_required'
};

/**
 * Get styles for message type
 */
const getMessageStyles = (type, severity) => {
  const baseStyles = {
    container: 'rounded-lg p-4 mb-4',
    icon: 'w-5 h-5 flex-shrink-0',
    title: 'font-semibold',
    message: 'text-sm mt-1',
    action: 'mt-3'
  };

  switch (severity) {
    case 'error':
      return {
        ...baseStyles,
        container: `${baseStyles.container} bg-red-50 border border-red-200`,
        icon: `${baseStyles.icon} text-red-500`,
        title: `${baseStyles.title} text-red-800`,
        message: `${baseStyles.message} text-red-700`
      };
    case 'warning':
      return {
        ...baseStyles,
        container: `${baseStyles.container} bg-orange-50 border border-orange-200`,
        icon: `${baseStyles.icon} text-orange-500`,
        title: `${baseStyles.title} text-orange-800`,
        message: `${baseStyles.message} text-orange-700`
      };
    case 'info':
    default:
      return {
        ...baseStyles,
        container: `${baseStyles.container} bg-blue-50 border border-blue-200`,
        icon: `${baseStyles.icon} text-blue-500`,
        title: `${baseStyles.title} text-blue-800`,
        message: `${baseStyles.message} text-blue-700`
      };
  }
};

/**
 * Get icon for resource type
 */
const getResourceIcon = (resourceType) => {
  const icons = {
    projects: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    features: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    simulations: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    teamMembers: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    apiCalls: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    tokens: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
    storage: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    )
  };

  return icons[resourceType] || icons.projects;
};

/**
 * RestrictionMessage Component
 */
export function RestrictionMessage({
  type = MESSAGE_TYPES.LIMIT_WARNING,
  resourceType = 'projects',
  current = 0,
  limit = 0,
  message,
  title,
  showUpgradeLink = true,
  onDismiss,
  className = ''
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const severity = type === MESSAGE_TYPES.LIMIT_EXCEEDED ? 'error' : 'warning';
  const styles = getMessageStyles(type, severity);

  const defaultTitles = {
    [MESSAGE_TYPES.LIMIT_WARNING]: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Limit Warning`,
    [MESSAGE_TYPES.LIMIT_EXCEEDED]: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Limit Reached`,
    [MESSAGE_TYPES.SUBSCRIPTION_INACTIVE]: 'Subscription Inactive',
    [MESSAGE_TYPES.TRIAL_EXPIRED]: 'Trial Period Expired',
    [MESSAGE_TYPES.GRACE_PERIOD]: 'Payment Required',
    [MESSAGE_TYPES.UPGRADE_REQUIRED]: 'Upgrade Required'
  };

  const defaultMessages = {
    [MESSAGE_TYPES.LIMIT_WARNING]: `You have used ${current} of ${limit} ${resourceType}. Consider upgrading for more capacity.`,
    [MESSAGE_TYPES.LIMIT_EXCEEDED]: `You have reached your ${resourceType} limit of ${limit}. Upgrade your plan to continue.`,
    [MESSAGE_TYPES.SUBSCRIPTION_INACTIVE]: 'Your subscription is not active. Please update your payment details.',
    [MESSAGE_TYPES.TRIAL_EXPIRED]: 'Your trial period has expired. Subscribe to a plan to continue using all features.',
    [MESSAGE_TYPES.GRACE_PERIOD]: 'Your subscription payment failed. Please update your payment method to continue.',
    [MESSAGE_TYPES.UPGRADE_REQUIRED]: 'This feature requires a higher plan. Upgrade to access this functionality.'
  };

  const displayTitle = title || defaultTitles[type];
  const displayMessage = message || defaultMessages[type];

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getResourceIcon(resourceType)}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={styles.title}>{displayTitle}</h3>
          <p className={styles.message}>{displayMessage}</p>

          {/* Progress bar for limits */}
          {(type === MESSAGE_TYPES.LIMIT_WARNING || type === MESSAGE_TYPES.LIMIT_EXCEEDED) && limit > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Usage</span>
                <span className="font-medium">{current} / {limit}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    severity === 'error' ? 'bg-red-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(100, (current / limit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex gap-3">
            {showUpgradeLink && (
              <Link
                to="/subscription"
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View Plans
              </Link>
            )}
            <Link
              to="/billing"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Manage Subscription
            </Link>
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * LimitReachedAlert Component - Shown when a limit is reached
 */
export function LimitReachedAlert({ resourceType, current, limit, onUpgrade }) {
  return (
    <RestrictionMessage
      type={MESSAGE_TYPES.LIMIT_EXCEEDED}
      resourceType={resourceType}
      current={current}
      limit={limit}
      showUpgradeLink={true}
    />
  );
}

/**
 * SubscriptionInactiveAlert Component - Shown when subscription is not active
 */
export function SubscriptionInactiveAlert({ status }) {
  const type = status === 'trial' || status === 'expired'
    ? MESSAGE_TYPES.TRIAL_EXPIRED
    : status === 'grace_period'
      ? MESSAGE_TYPES.GRACE_PERIOD
      : MESSAGE_TYPES.SUBSCRIPTION_INACTIVE;

  return (
    <RestrictionMessage
      type={type}
      showUpgradeLink={true}
    />
  );
}

/**
 * UpgradePrompt Component - Prompt user to upgrade
 */
export function UpgradePrompt({ currentPlan, suggestedPlan, reason }) {
  const tierNames = {
    starter: 'Starter',
    professional: 'Professional',
    business: 'Business'
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Upgrade from {tierNames[currentPlan] || currentPlan} to {tierNames[suggestedPlan] || suggestedPlan}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{reason}</p>
        </div>
        <Link
          to="/subscription"
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Upgrade Now
        </Link>
      </div>
    </div>
  );
}

/**
 * UsageProgressBar Component - Shows usage progress bar
 */
export function UsageProgressBar({ resourceType, current, limit, showLabel = true }) {
  if (!limit) return null;

  const percentage = Math.min(100, (current / limit) * 100);
  const isNearLimit = percentage >= 80;
  const isExceeded = percentage >= 100;

  const getBarColor = () => {
    if (isExceeded) return 'bg-red-500';
    if (isNearLimit) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-gray-600 capitalize">{resourceType.replace(/([A-Z])/g, ' $1')}</span>
          <span className={`font-medium ${isExceeded ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-gray-900'}`}>
            {current} / {limit}
          </span>
        </div>
      )}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isExceeded && (
        <p className="text-xs text-red-600">Limit exceeded</p>
      )}
      {isNearLimit && !isExceeded && (
        <p className="text-xs text-orange-600">Approaching limit</p>
      )}
    </div>
  );
}

/**
 * ResourceLimitBadge Component - Shows limit badge
 */
export function ResourceLimitBadge({ resourceType, current, limit, compact = false }) {
  if (!limit) return null;

  const percentage = (current / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isExceeded = percentage >= 100;

  const getBadgeStyles = () => {
    if (isExceeded) return 'bg-red-100 text-red-700 border-red-200';
    if (isNearLimit) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getBadgeStyles()}`}>
      {compact ? (
        <span>{current}/{limit}</span>
      ) : (
        <>
          <span className="capitalize">{resourceType.replace(/([A-Z])/g, ' $1')}</span>
          <span className="opacity-60">•</span>
          <span>{current}/{limit}</span>
        </>
      )}
    </span>
  );
}

// Export types for external use
export { MESSAGE_TYPES };

export default RestrictionMessage;