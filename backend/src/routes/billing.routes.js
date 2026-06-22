/**
 * Billing Routes
 *
 * Routes for organization billing operations.
 * Mounted at /api/billing
 */

import { Router } from 'express';
import billingController from '../controllers/billing.controller.js';
import { protect, requirePermissions, checkOrganization } from '../middlewares/auth.middleware.js';
import { validateSubscription, validateDowngrade, attachSubscriptionContext } from '../middlewares/subscription.middleware.js';
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

// Attach subscription context to all billing routes
router.use(attachSubscriptionContext);

// ==========================================
// User's Organization Billing Routes
// These routes use the authenticated user's organization
// ==========================================

/**
 * @route   GET /api/billing
 * @desc    Get billing information for authenticated user's organization
 * @access  Private (requires view_billing permission)
 */
router.get('/',
  requirePermissions('view_billing'),
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.getBilling
);

/**
 * @route   GET /api/billing/usage
 * @desc    Get usage summary for authenticated user's organization
 * @access  Private (requires view_billing permission)
 */
router.get('/usage',
  requirePermissions('view_billing'),
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.getUsage
);

/**
 * @route   GET /api/billing/invoices
 * @desc    Get invoices for authenticated user's organization
 * @access  Private (requires view_billing permission)
 */
router.get('/invoices',
  requirePermissions('view_billing'),
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.getInvoices
);

/**
 * @route   PUT /api/billing/subscription
 * @desc    Update subscription plan for authenticated user's organization
 * @access  Private (requires manage_billing permission)
 */
router.put('/subscription',
  requirePermissions('manage_billing'),
  validateUpdateSubscription,
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.updateSubscription
);

/**
 * @route   POST /api/billing/cancel
 * @desc    Cancel subscription for authenticated user's organization
 * @access  Private (requires manage_billing permission)
 */
router.post('/cancel',
  requirePermissions('manage_billing'),
  validateCancelSubscription,
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.cancelSubscription
);

/**
 * @route   POST /api/billing/reactivate
 * @desc    Reactivate subscription for authenticated user's organization
 * @access  Private (requires manage_billing permission)
 */
router.post('/reactivate',
  requirePermissions('manage_billing'),
  validateOrganizationId,
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.reactivateSubscription
);

/**
 * @route   POST /api/billing/preview
 * @desc    Preview subscription change for authenticated user's organization
 * @access  Private (requires view_billing permission)
 */
router.post('/preview',
  requirePermissions('view_billing'),
  validatePreviewSubscriptionChange,
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.previewSubscriptionChange
);

/**
 * @route   PUT /api/billing/details
 * @desc    Update billing details for authenticated user's organization
 * @access  Private (requires manage_billing permission)
 */
router.put('/details',
  requirePermissions('manage_billing'),
  validateUpdateBillingDetails,
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.updateBillingDetails
);

/**
 * @route   POST /api/billing/payment-methods
 * @desc    Add payment method for authenticated user's organization
 * @access  Private (requires manage_billing permission)
 */
router.post('/payment-methods',
  requirePermissions('manage_billing'),
  validateAddPaymentMethod,
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.addPaymentMethod
);

/**
 * @route   DELETE /api/billing/payment-methods/:methodId
 * @desc    Remove payment method for authenticated user's organization
 * @access  Private (requires manage_billing permission)
 */
router.delete('/payment-methods/:methodId',
  requirePermissions('manage_billing'),
  validatePaymentMethodId,
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.removePaymentMethod
);

/**
 * @route   PUT /api/billing/payment-methods/:methodId/default
 * @desc    Set default payment method for authenticated user's organization
 * @access  Private (requires manage_billing permission)
 */
router.put('/payment-methods/:methodId/default',
  requirePermissions('manage_billing'),
  validatePaymentMethodId,
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.setDefaultPaymentMethod
);

/**
 * @route   GET /api/billing/available-plans
 * @desc    Get available plans for upgrade/downgrade with restrictions
 * @access  Private (requires view_billing permission)
 */
router.get('/available-plans',
  requirePermissions('view_billing'),
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.getPlansForChange
);

/**
 * @route   POST /api/billing/validate-change
 * @desc    Validate if plan change is allowed
 * @access  Private (requires view_billing permission)
 */
router.post('/validate-change',
  requirePermissions('view_billing'),
  validateDowngrade,
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.validatePlanChange
);

/**
 * @route   POST /api/billing/change-plan
 * @desc    Change plan with member management
 * @access  Private (requires manage_billing permission)
 */
router.post('/change-plan',
  requirePermissions('manage_billing'),
  validateDowngrade,
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.changePlan
);

/**
 * @route   GET /api/billing/member-limit
 * @desc    Check member limit for organization
 * @access  Private (requires view_billing permission)
 */
router.get('/member-limit',
  requirePermissions('view_billing'),
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.checkMemberLimit
);

/**
 * @route   POST /api/billing/schedule-downgrade
 * @desc    Schedule downgrade for end of billing period
 * @access  Private (requires manage_billing permission)
 */
router.post('/schedule-downgrade',
  requirePermissions('manage_billing'),
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.scheduleDowngrade
);

/**
 * @route   DELETE /api/billing/schedule-downgrade
 * @desc    Cancel scheduled downgrade
 * @access  Private (requires manage_billing permission)
 */
router.delete('/schedule-downgrade',
  requirePermissions('manage_billing'),
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.cancelScheduledDowngrade
);

/**
 * @route   POST /api/billing/reenable-members
 * @desc    Re-enable disabled members after upgrade
 * @access  Private (requires manage_billing permission)
 */
router.post('/reenable-members',
  requirePermissions('manage_billing'),
  async (req, res, next) => {
    req.params.organizationId = req.user.organization;
    next();
  },
  billingController.reenableMembers
);

// ==========================================
// Organization Billing Routes (by ID)
// These routes require organization ID in URL
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
 * @route   GET /api/billing/:organizationId/available-plans
 * @desc    Get available plans for upgrade/downgrade with restrictions
 * @access  Private (requires view_billing permission)
 */
router.get('/:organizationId/available-plans',
  requirePermissions('view_billing'),
  billingController.getPlansForChange
);

/**
 * @route   POST /api/billing/:organizationId/validate-change
 * @desc    Validate if plan change is allowed
 * @access  Private (requires view_billing permission)
 */
router.post('/:organizationId/validate-change',
  requirePermissions('view_billing'),
  validateDowngrade,
  billingController.validatePlanChange
);

/**
 * @route   POST /api/billing/:organizationId/change-plan
 * @desc    Change plan with member management
 * @access  Private (requires manage_billing permission)
 */
router.post('/:organizationId/change-plan',
  requirePermissions('manage_billing'),
  validateDowngrade,
  billingController.changePlan
);

/**
 * @route   GET /api/billing/:organizationId/member-limit
 * @desc    Check member limit for organization
 * @access  Private (requires view_billing permission)
 */
router.get('/:organizationId/member-limit',
  requirePermissions('view_billing'),
  billingController.checkMemberLimit
);

/**
 * @route   POST /api/billing/:organizationId/schedule-downgrade
 * @desc    Schedule downgrade for end of billing period
 * @access  Private (requires manage_billing permission)
 */
router.post('/:organizationId/schedule-downgrade',
  requirePermissions('manage_billing'),
  billingController.scheduleDowngrade
);

/**
 * @route   DELETE /api/billing/:organizationId/schedule-downgrade
 * @desc    Cancel scheduled downgrade
 * @access  Private (requires manage_billing permission)
 */
router.delete('/:organizationId/schedule-downgrade',
  requirePermissions('manage_billing'),
  billingController.cancelScheduledDowngrade
);

/**
 * @route   POST /api/billing/:organizationId/reenable-members
 * @desc    Re-enable disabled members after upgrade
 * @access  Private (requires manage_billing permission)
 */
router.post('/:organizationId/reenable-members',
  requirePermissions('manage_billing'),
  billingController.reenableMembers
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
 * @route   POST /api/billing/:organizationId/enforce-limits
 * @desc    Manually enforce plan limits (admin only)
 * @access  Private (requires manage_billing permission)
 */
router.post('/:organizationId/enforce-limits',
  requirePermissions('manage_billing'),
  validateOrganizationId,
  billingController.enforceLimits
);

/**
 * @route   GET /api/billing/:organizationId/debug-limits
 * @desc    Debug plan limits and current usage (admin only)
 * @access  Private (requires manage_billing permission)
 */
router.get('/:organizationId/debug-limits',
  requirePermissions('manage_billing'),
  validateOrganizationId,
  billingController.debugLimits
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
 * @route   GET /api/billing/plans/public
 * @desc    Get available subscription plans
 * @access  Public
 */
router.get('/plans/public',
  billingController.getAvailablePlans
);

export default router;