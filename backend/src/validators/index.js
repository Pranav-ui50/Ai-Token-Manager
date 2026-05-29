/**
 * Validators Index
 *
 * Export all validators.
 */

import authValidator from './auth.validator.js';
import { notificationValidators } from './notification.validator.js';
import reportValidator from './report.validator.js';
import auditValidator from './audit.validator.js';
import {
  validateUpdateSubscription,
  validateCancelSubscription,
  validateUpdateBillingDetails,
  validateAddPaymentMethod,
  validatePreviewSubscriptionChange,
  validateOrganizationId,
  validateInvoiceId,
  validatePaymentMethodId
} from './billing.validator.js';

// Export individual validators
export {
  authValidator,
  notificationValidators,
  reportValidator,
  auditValidator,
  validateUpdateSubscription,
  validateCancelSubscription,
  validateUpdateBillingDetails,
  validateAddPaymentMethod,
  validatePreviewSubscriptionChange,
  validateOrganizationId,
  validateInvoiceId,
  validatePaymentMethodId
};

// Export as billingValidators object for convenience
export const billingValidators = {
  validateUpdateSubscription,
  validateCancelSubscription,
  validateUpdateBillingDetails,
  validateAddPaymentMethod,
  validatePreviewSubscriptionChange,
  validateOrganizationId,
  validateInvoiceId,
  validatePaymentMethodId
};

export default {
  authValidator,
  notificationValidators,
  reportValidator,
  auditValidator,
  billingValidators
};