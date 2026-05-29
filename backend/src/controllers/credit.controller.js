/**
 * Credit Controller
 *
 * HTTP handlers for credit management endpoints.
 */

import creditService from '../services/credit.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class CreditController {
  /**
   * Get credit balance
   * GET /api/credits/balance
   */
  async getBalance(req, res, next) {
    try {
      const userId = req.user.userId;
      const balance = await creditService.getCreditBalance(userId);

      res.status(200).json({
        success: true,
        data: balance
      });
    } catch (error) {
      logger.error(`[CreditController] getBalance error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Purchase credits
   * POST /api/credits/purchase
   */
  async purchaseCredits(req, res, next) {
    try {
      const userId = req.user.userId;
      const { credits, packName } = req.body;

      let result;

      if (packName) {
        // Purchase credit pack
        const { planId } = req.body;
        if (!planId) {
          throw new AppError('Plan ID is required for credit pack purchase', 400, 'PLAN_ID_REQUIRED');
        }
        result = await creditService.purchaseCreditPack(userId, packName, planId);
      } else {
        // Purchase custom amount
        if (!credits || credits <= 0) {
          throw new AppError('Valid credit amount is required', 400, 'INVALID_CREDITS');
        }
        result = await creditService.purchaseCredits(userId, credits);
      }

      res.status(200).json({
        success: true,
        message: 'Credits purchased successfully',
        data: result
      });
    } catch (error) {
      logger.error(`[CreditController] purchaseCredits error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Use credits
   * POST /api/credits/use
   */
  async useCredits(req, res, next) {
    try {
      const userId = req.user.userId;
      const { amount, description, reference } = req.body;

      if (!amount || amount <= 0) {
        throw new AppError('Valid credit amount is required', 400, 'INVALID_AMOUNT');
      }

      const result = await creditService.useCredits(userId, amount, description, reference);

      res.status(200).json({
        success: true,
        message: 'Credits used successfully',
        data: result
      });
    } catch (error) {
      logger.error(`[CreditController] useCredits error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get credit packs
   * GET /api/credits/packs
   */
  async getCreditPacks(req, res, next) {
    try {
      const { planId } = req.query;

      if (!planId) {
        throw new AppError('Plan ID is required', 400, 'PLAN_ID_REQUIRED');
      }

      const packs = await creditService.getCreditPacks(planId);

      res.status(200).json({
        success: true,
        data: packs
      });
    } catch (error) {
      logger.error(`[CreditController] getCreditPacks error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Configure auto-recharge
   * PUT /api/credits/auto-recharge
   */
  async configureAutoRecharge(req, res, next) {
    try {
      const userId = req.user.userId;
      const { enabled, threshold, rechargeAmount } = req.body;

      const settings = { enabled, threshold, rechargeAmount };
      const result = await creditService.configureAutoRecharge(userId, settings);

      res.status(200).json({
        success: true,
        message: 'Auto-recharge settings updated',
        data: result
      });
    } catch (error) {
      logger.error(`[CreditController] configureAutoRecharge error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Process auto-recharge
   * POST /api/credits/auto-recharge/process
   */
  async processAutoRecharge(req, res, next) {
    try {
      const userId = req.user.userId;
      const result = await creditService.processAutoRecharge(userId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`[CreditController] processAutoRecharge error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get credit history
   * GET /api/credits/history
   */
  async getHistory(req, res, next) {
    try {
      const userId = req.user.userId;
      const { page, limit, type } = req.query;

      const history = await creditService.getCreditHistory(userId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
        type
      });

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error(`[CreditController] getHistory error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get credit usage statistics
   * GET /api/credits/stats
   */
  async getStats(req, res, next) {
    try {
      const userId = req.user.userId;
      const stats = await creditService.getCreditUsageStats(userId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error(`[CreditController] getStats error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Admin: Adjust credits
   * POST /api/credits/admin/adjust
   */
  async adjustCredits(req, res, next) {
    try {
      const { subscriptionId, amount, reason } = req.body;
      const adminId = req.user.userId;

      if (!subscriptionId || amount === undefined || !reason) {
        throw new AppError('Subscription ID, amount, and reason are required', 400, 'MISSING_FIELDS');
      }

      const result = await creditService.adjustCredits(subscriptionId, amount, reason, adminId);

      res.status(200).json({
        success: true,
        message: 'Credits adjusted successfully',
        data: result
      });
    } catch (error) {
      logger.error(`[CreditController] adjustCredits error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Admin: Refund credits
   * POST /api/credits/admin/refund
   */
  async refundCredits(req, res, next) {
    try {
      const { subscriptionId, amount, reason } = req.body;

      if (!subscriptionId || !amount || amount <= 0) {
        throw new AppError('Subscription ID and valid amount are required', 400, 'MISSING_FIELDS');
      }

      const result = await creditService.refundCredits(subscriptionId, amount, reason);

      res.status(200).json({
        success: true,
        message: 'Credits refunded successfully',
        data: result
      });
    } catch (error) {
      logger.error(`[CreditController] refundCredits error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Admin: Allocate monthly credits
   * POST /api/credits/admin/allocate
   */
  async allocateCredits(req, res, next) {
    try {
      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        throw new AppError('Subscription ID is required', 400, 'SUBSCRIPTION_ID_REQUIRED');
      }

      const result = await creditService.allocateMonthlyCredits(subscriptionId);

      res.status(200).json({
        success: true,
        message: 'Credits allocated successfully',
        data: result
      });
    } catch (error) {
      logger.error(`[CreditController] allocateCredits error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Admin: Expire old credits
   * POST /api/credits/admin/expire
   */
  async expireCredits(req, res, next) {
    try {
      const { monthsOld = 12 } = req.body;

      const result = await creditService.expireOldCredits(monthsOld);

      res.status(200).json({
        success: true,
        message: 'Credit expiration processed',
        data: result
      });
    } catch (error) {
      logger.error(`[CreditController] expireCredits error: ${error.message}`);
      next(error);
    }
  }
}

export default new CreditController();