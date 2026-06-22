/**
 * Toast Notification Utility
 *
 * Centralized toast notification system using react-hot-toast.
 * Provides consistent, user-friendly notifications across the application.
 */

import toast from 'react-hot-toast';

// ==========================================
// Helper function for limit exceeded toasts with action button
// ==========================================

const showLimitExceededToast = (message) => {
  toast.error(
    <div className="flex flex-col gap-2">
      <span>{message}</span>
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
};

// ==========================================
// Success Toasts
// ==========================================

export const showToast = {
  // Authentication
  loginSuccess: () => toast.success('Login successful! Welcome back.'),
  loginError: (message) => toast.error(message || 'Login failed. Please check your credentials.'),
  logoutSuccess: () => toast.success('Logged out successfully.'),
  registerSuccess: () => toast.success('Account created successfully! Please check your email to verify.'),
  registerError: (message) => toast.error(message || 'Registration failed. Please try again.'),
  emailVerified: () => toast.success('Email verified successfully! You can now log in.'),
  passwordResetSent: () => toast.success('Password reset link sent to your email.'),
  passwordResetSuccess: () => toast.success('Password reset successfully! You can now log in.'),
  passwordChanged: () => toast.success('Password changed successfully.'),
  passwordChangeError: (message) => toast.error(message || 'Failed to change password.'),

  // Two-Factor Authentication
  twoFactorEnabled: () => toast.success('Two-factor authentication enabled successfully.'),
  twoFactorDisabled: () => toast.success('Two-factor authentication disabled successfully.'),
  twoFactorError: (message) => toast.error(message || 'Two-factor authentication operation failed.'),
  backupCodesGenerated: () => toast.success('New backup codes generated. Save them securely.'),

  // API Keys
  apiKeyCreated: () => toast.success('API key created successfully. Copy it now - it won\'t be shown again!'),
  apiKeyRevoked: () => toast.success('API key revoked successfully.'),
  apiKeyDeleted: () => toast.success('API key deleted successfully.'),
  apiKeyRegenerated: () => toast.success('API key regenerated. Copy the new key now - it won\'t be shown again!'),
  apiKeyCopied: () => toast.success('API key copied to clipboard!'),
  apiKeyError: (message) => toast.error(message || 'API key operation failed.'),

  // Organizations
  organizationCreated: () => toast.success('Organization created successfully.'),
  organizationUpdated: () => toast.success('Organization updated successfully.'),
  organizationDeleted: () => toast.success('Organization deleted successfully.'),
  organizationError: (message) => toast.error(message || 'Organization operation failed.'),

  // Team Members
  memberInvited: () => toast.success('Invitation sent successfully.'),
  memberAdded: () => toast.success('Team member added successfully.'),
  memberRemoved: () => toast.success('Team member removed successfully.'),
  invitationCancelled: () => toast.success('Invitation cancelled successfully.'),
  invitationAccepted: () => toast.success('Invitation accepted successfully.'),
  ownershipTransferred: () => toast.success('Ownership transferred successfully.'),
  leftOrganization: () => toast.success('You have left the organization.'),
  memberError: (message) => toast.error(message || 'Team member operation failed.'),

  // Projects
  projectCreated: () => toast.success('Project created successfully.'),
  projectUpdated: () => toast.success('Project updated successfully.'),
  projectDeleted: () => toast.success('Project deleted successfully.'),
  projectArchived: () => toast.success('Project archived successfully.'),
  projectRestored: () => toast.success('Project restored successfully.'),
  projectActivated: () => toast.success('Project activated successfully.'),
  projectDeactivated: () => toast.success('Project deactivated successfully.'),
  projectError: (message) => toast.error(message || 'Project operation failed.'),

  // Features
  featureCreated: () => toast.success('Feature created successfully.'),
  featureUpdated: () => toast.success('Feature updated successfully.'),
  featureDeleted: () => toast.success('Feature deleted successfully.'),
  featureError: (message) => toast.error(message || 'Feature operation failed.'),

  // Models
  modelCreated: () => toast.success('AI model created successfully.'),
  modelUpdated: () => toast.success('AI model updated successfully.'),
  modelDeleted: () => toast.success('AI model deleted successfully.'),
  modelStatusChanged: (status) => toast.success(`Model ${status === 'active' ? 'activated' : 'deactivated'} successfully.`),
  modelError: (message) => toast.error(message || 'Model operation failed.'),
  modelsSynced: (count) => toast.success(`${count} models synced from provider API.`),

  // Providers
  providerCreated: () => toast.success('Provider created successfully.'),
  providerUpdated: () => toast.success('Provider updated successfully.'),
  providerDeleted: () => toast.success('Provider deleted successfully.'),
  providerStatusChanged: (status) => toast.success(`Provider ${status === 'active' ? 'activated' : 'deactivated'} successfully.`),
  providerError: (message) => toast.error(message || 'Provider operation failed.'),
  providerTestSuccess: () => toast.success('Provider connection test successful.'),
  providerTestError: (message) => toast.error(message || 'Provider connection test failed.'),

  // Plans
  planCreated: () => toast.success('Plan created successfully.'),
  planUpdated: () => toast.success('Plan updated successfully.'),
  planDeleted: () => toast.success('Plan deleted successfully.'),
  planError: (message) => toast.error(message || 'Plan operation failed.'),

  // Billing & Payments
  paymentSuccess: () => toast.success('Payment successful! Your subscription is now active.'),
  paymentFailed: (message) => toast.error(message || 'Payment failed. Please try again.'),
  subscriptionCreated: () => toast.success('Subscription created successfully.'),
  subscriptionUpdated: () => toast.success('Subscription updated successfully.'),
  subscriptionCancelled: () => toast.success('Subscription cancelled successfully.'),
  subscriptionReactivated: () => toast.success('Subscription reactivated successfully.'),
  planUpgraded: (planName) => toast.success(`Successfully upgraded to ${planName} plan.`),
  planDowngraded: (planName) => toast.success(`Successfully downgraded to ${planName} plan.`),
  billingError: (message) => toast.error(message || 'Billing operation failed.'),
  invoiceDownloaded: () => toast.success('Invoice downloaded successfully.'),
  invoiceGenerated: () => toast.success('Invoice generated successfully.'),

  // Webhooks
  webhookCreated: () => toast.success('Webhook created successfully. Save the secret now - it won\'t be shown again!'),
  webhookUpdated: () => toast.success('Webhook updated successfully.'),
  webhookDeleted: () => toast.success('Webhook deleted successfully.'),
  webhookToggled: (status) => toast.success(`Webhook ${status === 'active' ? 'activated' : 'deactivated'} successfully.`),
  webhookSecretRegenerated: () => toast.success('Secret regenerated. Save it now - it won\'t be shown again!'),
  webhookTested: () => toast.success('Webhook test completed successfully.'),
  webhookError: (message) => toast.error(message || 'Webhook operation failed.'),

  // Integrations
  integrationCreated: () => toast.success('Integration created successfully.'),
  integrationUpdated: () => toast.success('Integration updated successfully.'),
  integrationDeleted: () => toast.success('Integration deleted successfully.'),
  integrationToggled: (status) => toast.success(`Integration ${status === 'active' ? 'activated' : 'deactivated'} successfully.`),
  integrationSynced: () => toast.success('Integration synced successfully.'),
  integrationError: (message) => toast.error(message || 'Integration operation failed.'),

  // Reports
  reportCreated: () => toast.success('Report created successfully.'),
  reportUpdated: () => toast.success('Report updated successfully.'),
  reportDeleted: () => toast.success('Report deleted successfully.'),
  reportGenerated: () => toast.success('Report generation started. You\'ll be notified when it\'s ready.'),
  reportExported: (format) => toast.success(`Report exported as ${format.toUpperCase()} successfully.`),
  reportShared: () => toast.success('Report shared successfully.'),
  reportError: (message) => toast.error(message || 'Report operation failed.'),

  // Analytics
  analyticsExported: () => toast.success('Analytics data exported successfully.'),
  analyticsError: (message) => toast.error(message || 'Failed to load analytics data.'),

  // Settings
  settingsSaved: () => toast.success('Settings saved successfully.'),
  settingsError: (message) => toast.error(message || 'Failed to save settings.'),

  // Profile
  profileUpdated: () => toast.success('Profile updated successfully.'),
  avatarUpdated: () => toast.success('Profile picture updated successfully.'),
  profileError: (message) => toast.error(message || 'Failed to update profile.'),

  // Admin
  adminActionSuccess: (action) => toast.success(`${action} successfully.`),
  adminActionError: (action, message) => toast.error(message || `Failed to ${action.toLowerCase()}.`),
  userBanned: () => toast.success('User banned successfully.'),
  userUnbanned: () => toast.success('User unbanned successfully.'),
  userStatusUpdated: () => toast.success('User status updated successfully.'),

  // General CRUD
  created: (item) => toast.success(`${item} created successfully.`),
  updated: (item) => toast.success(`${item} updated successfully.`),
  deleted: (item) => toast.success(`${item} deleted successfully.`),
  saved: (item) => toast.success(`${item} saved successfully.`),
  copied: (item) => toast.success(`${item} copied to clipboard.`),
  uploaded: (item) => toast.success(`${item} uploaded successfully.`),
  exported: (item) => toast.success(`${item} exported successfully.`),
  imported: (item) => toast.success(`${item} imported successfully.`),

  // General Success/Error
  success: (message) => toast.success(message || 'Operation successful.'),
  error: (message) => toast.error(message || 'An error occurred. Please try again.'),
  networkError: () => toast.error('Network error. Please check your connection and try again.'),
  serverError: () => toast.error('Server error. Please try again later.'),
  unauthorized: () => toast.error('You are not authorized to perform this action.'),
  forbidden: () => toast.error('Access denied. You don\'t have permission for this action.'),
  notFound: () => toast.error('The requested resource was not found.'),
  validationError: (message) => toast.error(message || 'Please check your input and try again.'),
  sessionExpired: () => toast.error('Your session has expired. Please log in again.'),

  // Plan Limits - use custom toast with Upgrade button
  limitExceeded: (message) => showLimitExceededToast(message || 'You have reached your plan limit. Please upgrade your plan to continue.'),
  projectLimitExceeded: (limit) => showLimitExceededToast(`You have reached the maximum number of projects (${limit}) for your plan. Please upgrade to create more projects.`),
  featureLimitExceeded: (limit) => showLimitExceededToast(`You have reached the maximum number of features (${limit}) for your plan. Please upgrade to create more features.`),
  simulationLimitExceeded: (limit) => showLimitExceededToast(`You have reached the maximum number of simulations (${limit}) for your plan. Please upgrade to run more simulations.`),
  teamMemberLimitExceeded: (limit) => showLimitExceededToast(`You have reached the maximum number of team members (${limit}) for your plan. Please upgrade to add more members.`),
  apiCallLimitExceeded: (limit) => showLimitExceededToast(`You have reached your API call limit (${limit}) for this billing period. Please upgrade your plan or wait for the next billing cycle.`),
  tokenLimitExceeded: (limit) => showLimitExceededToast(`You have reached your token limit (${limit.toLocaleString()}) for this billing period. Please upgrade your plan or wait for the next billing cycle.`),

  // Warnings
  warning: (message) => toast(message, { icon: '⚠️', style: { background: '#f59e0b', color: '#fff' } }),
  confirmDelete: (item) => toast(`${item} will be permanently deleted.`, { icon: '⚠️', style: { background: '#f59e0b', color: '#fff' } }),
  unsavedChanges: () => toast('You have unsaved changes. Are you sure you want to leave?', { icon: '⚠️', style: { background: '#f59e0b', color: '#fff' } }),
  rateLimitWarning: () => toast('You\'re making requests too quickly. Please slow down.', { icon: '⚠️', style: { background: '#f59e0b', color: '#fff' } }),

  // Info
  info: (message) => toast(message, { icon: 'ℹ️', style: { background: '#3b82f6', color: '#fff' } }),
  loading: (message) => toast.loading(message || 'Loading...'),
  processing: (message) => toast.loading(message || 'Processing...'),
  syncing: (message) => toast.loading(message || 'Syncing...'),

  // Role/Permission updates - matches red theme
  roleUpdated: (message) => toast(message, {
    icon: '🔐',
    style: {
      background: '#DC2626',
      color: '#fff',
      fontWeight: '500'
    },
    duration: 5000
  }),

  // Promise-based toasts
  promise: (promise, messages) => {
    return toast.promise(promise, {
      loading: messages.loading || 'Processing...',
      success: messages.success || 'Operation completed successfully.',
      error: messages.error || 'Operation failed. Please try again.'
    });
  }
};

// ==========================================
// Convenience exports
// ==========================================

export const success = (message) => toast.success(message);
export const error = (message) => toast.error(message);
export const warning = (message) => toast(message, { icon: '⚠️', style: { background: '#f59e0b', color: '#fff' } });
export const info = (message) => toast(message, { icon: 'ℹ️', style: { background: '#3b82f6', color: '#fff' } });
export const loading = (message) => toast.loading(message);

// Dismiss all toasts
export const dismissAll = () => toast.dismiss();

export default showToast;
