/**
 * Billing Routes
 *
 * Routes for organization billing operations.
 * Mounted at /api/billing
 */

import { Router } from 'express';
import billingController from '../controllers/billing.controller.js';
import { protect, requirePermissions, checkOrganization } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validation.middleware.js';
import {
  validateUpdateSubscription,
  validateCancelSubscription,
  validateUpdateBillingDetails,
  validateAddPaymentMethod,
  validatePreviewSubscriptionChange,
  validateOrganizationId,
  validateInvoiceId,
  validatePaymentMethodId
} from '../validators/billing.validator.js';

const router = Router();

// All billing routes require authentication
router.use(protect);

// ==========================================
// Organization Billing Routes
// These routes require organization context
// ==========================================

/**
 * @route   GET /api/billing/:organizationId
 * @desc    Get billing information for organization
 * @access  Private (requires view_billing permission)
 */
router.get('/:organizationId',
  requirePermissions('view_billing'),
  billingController.getBilling
);

/**
 * @route   PUT /api/billing/:organizationId/subscription
 * @desc    Update subscription plan
 * @access  Private (requires manage_billing permission)
 */
router.put('/:organizationId/subscription',
  requirePermissions('manage_billing'),
  validateUpdateSubscription,
  billingController.updateSubscription
);

/**
 * @route   POST /api/billing/:organizationId/cancel
 * @desc    Cancel subscription
 * @access  Private (requires manage_billing permission)
 */
router.post('/:organizationId/cancel',
  requirePermissions('manage_billing'),
  validateCancelSubscription,
  billingController.cancelSubscription
);

/**
 * @route   POST /api/billing/:organizationId/reactivate
 * @desc    Reactivate subscription
 * @access  Private (requires manage_billing permission)
 */
router.post('/:organizationId/reactivate',
  requirePermissions('manage_billing'),
  validateOrganizationId,
  billingController.reactivateSubscription
);

/**
 * @route   GET /api/billing/:organizationId/usage
 * @desc    Get usage summary
 * @access  Private (requires view_billing permission)
 */
router.get('/:organizationId/usage',
  requirePermissions('view_billing'),
  validateOrganizationId,
  billingController.getUsage
);

/**
 * @route   GET /api/billing/:organizationId/invoices
 * @desc    Get invoices
 * @access  Private (requires view_billing permission)
 */
router.get('/:organizationId/invoices',
  requirePermissions('view_billing'),
  validateOrganizationId,
  billingController.getInvoices
);

/**
 * @route   GET /api/billing/:organizationId/invoices/:invoiceId
 * @desc    Get invoice by ID
 * @access  Private (requires view_billing permission)
 */
router.get('/:organizationId/invoices/:invoiceId',
  requirePermissions('view_billing'),
  validateInvoiceId,
  billingController.getInvoiceById
);

/**
 * @route   GET /api/billing/:organizationId/invoices/:invoiceId/download
 * @desc    Download invoice (PDF, Excel, JSON)
 * @access  Private (requires view_billing permission)
 */
router.get('/:organizationId/invoices/:invoiceId/download',
  requirePermissions('view_billing'),
  validateInvoiceId,
  billingController.downloadInvoice
);

/**
 * @route   PUT /api/billing/:organizationId/details
 * @desc    Update billing details
 * @access  Private (requires manage_billing permission)
 */
router.put('/:organizationId/details',
  requirePermissions('manage_billing'),
  validateUpdateBillingDetails,
  billingController.updateBillingDetails
);

/**
 * @route   POST /api/billing/:organizationId/payment-methods
 * @desc    Add payment method
 * @access  Private (requires manage_billing permission)
 */
router.post('/:organizationId/payment-methods',
  requirePermissions('manage_billing'),
  validateAddPaymentMethod,
  billingController.addPaymentMethod
);

/**
 * @route   DELETE /api/billing/:organizationId/payment-methods/:methodId
 * @desc    Remove payment method
 * @access  Private (requires manage_billing permission)
 */
router.delete('/:organizationId/payment-methods/:methodId',
  requirePermissions('manage_billing'),
  validatePaymentMethodId,
  billingController.removePaymentMethod
);

/**
 * @route   PUT /api/billing/:organizationId/payment-methods/:methodId/default
 * @desc    Set default payment method
 * @access  Private (requires manage_billing permission)
 */
router.put('/:organizationId/payment-methods/:methodId/default',
  requirePermissions('manage_billing'),
  validatePaymentMethodId,
  billingController.setDefaultPaymentMethod
);

/**
 * @route   POST /api/billing/:organizationId/preview
 * @desc    Preview subscription change
 * @access  Private (requires view_billing permission)
 */
router.post('/:organizationId/preview',
  requirePermissions('view_billing'),
  validatePreviewSubscriptionChange,
  billingController.previewSubscriptionChange
);

// ==========================================
// Public Routes (No Organization Context Required)
// ==========================================

/**
 * @route   GET /api/billing/plans
 * @desc    Get available subscription plans
 * @access  Public
 */
router.get('/plans/public',
  billingController.getAvailablePlans
);

export default router;