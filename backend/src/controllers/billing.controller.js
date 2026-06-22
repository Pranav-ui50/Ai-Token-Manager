/**
 * Billing Controller
 *
 * Handles organization billing operations.
 */

import billingService from '../services/billing.service.js';
import subscriptionService from '../services/subscription.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

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

  // ==========================================
  // Subscription Management Endpoints
  // ==========================================

  /**
   * Get available plans for upgrade/downgrade
   * GET /api/organizations/:id/billing/available-plans
   */
  async getPlansForChange(req, res, next) {
    try {
      const { organizationId } = req.params;

      const result = await subscriptionService.getAvailablePlans(organizationId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate plan change (check if allowed)
   * POST /api/organizations/:id/billing/validate-change
   */
  async validatePlanChange(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { targetPlanId, billingCycle } = req.body;

      const validation = await subscriptionService.validatePlanChange(
        organizationId,
        targetPlanId,
        billingCycle || 'monthly'
      );

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process plan change with member management
   * POST /api/organizations/:id/billing/change-plan
   */
  async changePlan(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { targetPlanId, billingCycle } = req.body;
      const userId = req.user.id;

      const result = await subscriptionService.processPlanChange(
        organizationId,
        targetPlanId,
        billingCycle || 'monthly',
        userId
      );

      res.json({
        success: true,
        data: result,
        message: 'Plan changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check member limit before adding
   * GET /api/organizations/:id/billing/member-limit
   */
  async checkMemberLimit(req, res, next) {
    try {
      const { organizationId } = req.params;

      const result = await subscriptionService.checkMemberLimit(organizationId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedule downgrade for end of billing period
   * POST /api/organizations/:id/billing/schedule-downgrade
   */
  async scheduleDowngrade(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { targetPlanId } = req.body;
      const userId = req.user.id;

      const result = await subscriptionService.scheduleDowngrade(
        organizationId,
        targetPlanId,
        userId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel scheduled downgrade
   * DELETE /api/organizations/:id/billing/schedule-downgrade
   */
  async cancelScheduledDowngrade(req, res, next) {
    try {
      const { organizationId } = req.params;
      const userId = req.user.id;

      const result = await subscriptionService.cancelScheduledDowngrade(organizationId, userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Re-enable disabled members after upgrade
   * POST /api/organizations/:id/billing/reenable-members
   */
  async reenableMembers(req, res, next) {
    try {
      const { organizationId } = req.params;
      const userId = req.user.id;

      const result = await subscriptionService.reamedDisabledMembers(organizationId, userId);

      res.json({
        success: true,
        data: result,
        message: `${result.reamed} member(s) re-enabled successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually process expired subscriptions (admin only)
   * POST /api/admin/billing/process-expired
   */
  async processExpiredSubscriptions(req, res, next) {
    try {
      const result = await subscriptionService.processExpiredSubscriptions();

      res.json({
        success: true,
        data: result,
        message: `Processed ${result.processed} expired subscriptions`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually enforce plan limits (admin only)
   * POST /api/billing/:organizationId/enforce-limits
   */
  async enforceLimits(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { planId } = req.body;
      const userId = req.user.id;

      // Get the organization
      const organization = await (await import('../models/Organization.js')).default.findById(organizationId);
      if (!organization) {
        throw new AppError('Organization not found', 404, 'NOT_FOUND');
      }

      // Get the target plan
      let targetPlan = null;
      if (planId) {
        targetPlan = await (await import('../models/Plan.js')).default.findById(planId);
      } else {
        // Use current plan
        targetPlan = await (await import('../models/Plan.js')).default.findById(organization.subscription?.planId);
      }

      logger.info(`[ManualEnforce] Manually enforcing limits for org ${organizationId}`, {
        currentPlan: organization.subscription?.plan,
        currentPlanId: organization.subscription?.planId,
        targetPlanId: targetPlan?._id,
        targetPlanTier: targetPlan?.tier,
        targetPlanLimits: targetPlan?.limits
      });

      // Import limit enforcement service
      const limitEnforcementService = (await import('../services/limitEnforcement.service.js')).default;

      // Enforce limits
      const results = await limitEnforcementService.enforceAllLimits(organizationId, userId, targetPlan);

      logger.info(`[ManualEnforce] Enforcement results for ${organizationId}:`, JSON.stringify(results));

      res.json({
        success: true,
        data: {
          organizationId,
          plan: targetPlan ? {
            id: targetPlan._id,
            tier: targetPlan.tier,
            limits: targetPlan.limits
          } : null,
          results
        },
        message: 'Limits enforced successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Debug plan limits (admin only)
   * GET /api/billing/:organizationId/debug-limits
   */
  async debugLimits(req, res, next) {
    try {
      const { organizationId } = req.params;

      // Get the organization
      const Organization = (await import('../models/Organization.js')).default;
      const Project = (await import('../models/Project.js')).default;
      const Feature = (await import('../models/Feature.js')).default;
      const Simulation = (await import('../models/Simulation.js')).default;
      const Plan = (await import('../models/Plan.js')).default;

      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new AppError('Organization not found', 404, 'NOT_FOUND');
      }

      // Get current plan
      const plan = await Plan.findById(organization.subscription?.planId);

      // Get current counts
      const [
        projectCount,
        activeProjects,
        disabledProjects,
        featureCount,
        activeFeatures,
        disabledFeatures,
        simulationCount,
        activeSimulations,
        disabledSimulations,
        memberCount,
        activeMembers,
        disabledMembers
      ] = await Promise.all([
        Project.countDocuments({ organization: organizationId }),
        Project.countDocuments({ organization: organizationId, status: { $in: ['active', 'inactive'] } }),
        Project.countDocuments({ organization: organizationId, status: 'disabled' }),
        Feature.countDocuments({ organization: organizationId }),
        Feature.countDocuments({ organization: organizationId, status: { $in: ['active', 'inactive', 'maintenance'] } }),
        Feature.countDocuments({ organization: organizationId, status: 'disabled' }),
        Simulation.countDocuments({ organization: organizationId }),
        Simulation.countDocuments({ organization: organizationId, status: { $in: ['draft', 'pending', 'running', 'completed', 'failed'] } }),
        Simulation.countDocuments({ organization: organizationId, status: 'disabled' }),
        organization.members?.length || 0,
        organization.members?.filter(m => m.status === 'active' || m.status === 'inactive').length || 0,
        organization.members?.filter(m => m.status === 'disabled').length || 0
      ]);

      res.json({
        success: true,
        data: {
          organization: {
            id: organization._id,
            name: organization.name,
            plan: organization.subscription?.plan,
            planId: organization.subscription?.planId
          },
          plan: plan ? {
            id: plan._id,
            tier: plan.tier,
            name: plan.name,
            limits: plan.limits
          } : null,
          counts: {
            projects: {
              total: projectCount,
              active: activeProjects,
              disabled: disabledProjects
            },
            features: {
              total: featureCount,
              active: activeFeatures,
              disabled: disabledFeatures
            },
            simulations: {
              total: simulationCount,
              active: activeSimulations,
              disabled: disabledSimulations
            },
            members: {
              total: memberCount,
              active: activeMembers,
              disabled: disabledMembers
            }
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new BillingController();