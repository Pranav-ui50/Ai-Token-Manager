/**
 * Billing Controller
 *
 * Handles organization billing operations.
 */

import billingService from '../services/billing.service.js';
import { AppError } from '../middlewares/error.middleware.js';

class BillingController {
  /**
   * Get billing information
   * GET /api/organizations/:id/billing
   */
  async getBilling(req, res, next) {
    try {
      const { organizationId } = req.params;
      const billing = await billingService.getBilling(organizationId);

      res.json({
        success: true,
        data: billing
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update subscription plan
   * PUT /api/organizations/:id/billing/subscription
   */
  async updateSubscription(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { plan, billingCycle } = req.body;
      const userId = req.user.id;

      const result = await billingService.updateSubscription(
        organizationId,
        plan,
        billingCycle,
        userId
      );

      res.json({
        success: true,
        data: result,
        message: 'Subscription updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel subscription
   * POST /api/organizations/:id/billing/cancel
   */
  async cancelSubscription(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const result = await billingService.cancelSubscription(organizationId, reason, userId);

      res.json({
        success: true,
        data: result,
        message: 'Subscription cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reactivate subscription
   * POST /api/organizations/:id/billing/reactivate
   */
  async reactivateSubscription(req, res, next) {
    try {
      const { organizationId } = req.params;
      const userId = req.user.id;

      const result = await billingService.reactivateSubscription(organizationId, userId);

      res.json({
        success: true,
        data: result,
        message: 'Subscription reactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get usage summary
   * GET /api/organizations/:id/billing/usage
   */
  async getUsage(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { startDate, endDate } = req.query;

      const usage = await billingService.getUsage(organizationId, startDate, endDate);

      res.json({
        success: true,
        data: usage
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invoices
   * GET /api/organizations/:id/billing/invoices
   */
  async getInvoices(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const result = await billingService.getInvoices(organizationId, page, limit);

      res.json({
        success: true,
        data: result.invoices,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invoice by ID
   * GET /api/organizations/:id/billing/invoices/:invoiceId
   */
  async getInvoiceById(req, res, next) {
    try {
      const { organizationId, invoiceId } = req.params;

      const invoice = await billingService.getInvoiceById(organizationId, invoiceId);

      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download invoice
   * GET /api/organizations/:id/billing/invoices/:invoiceId/download
   */
  async downloadInvoice(req, res, next) {
    try {
      const { organizationId, invoiceId } = req.params;
      const { format = 'pdf' } = req.query;

      const result = await billingService.downloadInvoice(organizationId, invoiceId, format);

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update billing details
   * PUT /api/organizations/:id/billing/details
   */
  async updateBillingDetails(req, res, next) {
    try {
      const { organizationId } = req.params;
      const billingDetails = req.body;
      const userId = req.user.id;

      const result = await billingService.updateBillingDetails(organizationId, billingDetails, userId);

      res.json({
        success: true,
        data: result,
        message: 'Billing details updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add payment method
   * POST /api/organizations/:id/billing/payment-methods
   */
  async addPaymentMethod(req, res, next) {
    try {
      const { organizationId } = req.params;
      const paymentMethod = req.body;
      const userId = req.user.id;

      const result = await billingService.addPaymentMethod(organizationId, paymentMethod, userId);

      res.json({
        success: true,
        data: result,
        message: 'Payment method added successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove payment method
   * DELETE /api/organizations/:id/billing/payment-methods/:methodId
   */
  async removePaymentMethod(req, res, next) {
    try {
      const { organizationId, methodId } = req.params;
      const userId = req.user.id;

      const result = await billingService.removePaymentMethod(organizationId, methodId, userId);

      res.json({
        success: true,
        data: result,
        message: 'Payment method removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set default payment method
   * PUT /api/organizations/:id/billing/payment-methods/:methodId/default
   */
  async setDefaultPaymentMethod(req, res, next) {
    try {
      const { organizationId, methodId } = req.params;
      const userId = req.user.id;

      const result = await billingService.setDefaultPaymentMethod(organizationId, methodId, userId);

      res.json({
        success: true,
        data: result,
        message: 'Default payment method updated'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available plans
   * GET /api/billing/plans
   */
  async getAvailablePlans(req, res, next) {
    try {
      const plans = await billingService.getAvailablePlans();

      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Preview subscription change
   * POST /api/organizations/:id/billing/preview
   */
  async previewSubscriptionChange(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { plan, billingCycle } = req.body;

      const preview = await billingService.previewSubscriptionChange(organizationId, plan, billingCycle);

      res.json({
        success: true,
        data: preview
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new BillingController();