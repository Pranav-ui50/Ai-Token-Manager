/**
 * Credit Service
 *
 * Handles credit-based system operations including credit management,
 * purchases, usage tracking, and auto-recharge.
 * FR-32: Credit-Based System
 */

import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import Feature from '../models/Feature.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class CreditService {
  /**
   * Get credit balance for a user
   * @param {string} userId - User ID
   * @returns {Object} Credit balance information
   */
  async getCreditBalance(userId) {
    const subscription = await Subscription.findOne({ user: userId })
      .populate('plan', 'name credits billing');

    if (!subscription) {
      return {
        balance: 0,
        includedCredits: 0,
        purchasedCredits: 0,
        rolloverCredits: 0,
        usedThisPeriod: 0,
        remainingCredits: 0,
        history: []
      };
    }

    return {
      subscriptionId: subscription._id,
      planId: subscription.plan._id,
      planName: subscription.plan.name,
      balance: subscription.credits.balance,
      includedCredits: subscription.credits.includedCredits,
      purchasedCredits: subscription.credits.purchasedCredits,
      rolloverCredits: subscription.credits.rolloverCredits,
      usedThisPeriod: subscription.credits.usedThisPeriod,
      remainingCredits: subscription.credits.balance - subscription.credits.usedThisPeriod,
      usagePercent: subscription.creditUsagePercent,
      daysRemaining: subscription.daysRemaining,
      autoRecharge: subscription.credits.autoRecharge,
      history: subscription.credits.history.slice(-50) // Last 50 transactions
    };
  }

  /**
   * Add credits to a subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {number} amount - Credit amount to add
   * @param {string} type - Credit type (purchase, allocation, adjustment)
   * @param {string} description - Description
   * @param {string} reference - Reference ID
   * @returns {Object} Updated subscription
   */
  async addCredits(subscriptionId, amount, type = 'purchase', description = '', reference = '') {
    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
      throw new AppError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    if (amount <= 0) {
      throw new AppError('Credit amount must be positive', 400, 'INVALID_AMOUNT');
    }

    await subscription.addCredits(amount, type, description, reference);

    logger.info(`Added ${amount} credits to subscription ${subscriptionId}: ${type} - ${description}`);

    return {
      subscriptionId: subscription._id,
      newBalance: subscription.credits.balance,
      amount,
      type
    };
  }

  /**
   * Use credits from a subscription
   * @param {string} userId - User ID
   * @param {number} amount - Credit amount to use
   * @param {string} description - Description
   * @param {string} reference - Reference ID
   * @returns {Object} Usage result
   */
  async useCredits(userId, amount, description = '', reference = '') {
    const subscription = await Subscription.findActiveForUser(userId);

    if (!subscription) {
      throw new AppError('No active subscription found', 404, 'NO_SUBSCRIPTION');
    }

    if (subscription.credits.balance < amount) {
      // Check if auto-recharge should be triggered
      const rechargeCheck = subscription.checkAutoRecharge();

      throw new AppError(
        `Insufficient credits. Current balance: ${subscription.credits.balance}, Required: ${amount}`,
        400,
        'INSUFFICIENT_CREDITS',
        {
          currentBalance: subscription.credits.balance,
          required: amount,
          shortfall: amount - subscription.credits.balance,
          autoRecharge: rechargeCheck
        }
      );
    }

    const result = await subscription.useCredits(amount, description, reference);

    if (!result.success) {
      throw new AppError(result.error, 400, 'CREDIT_USE_FAILED');
    }

    // Record usage
    await subscription.recordUsage(0, 0); // Tokens/requests can be tracked separately

    logger.info(`Used ${amount} credits from subscription ${subscription._id}: ${description}`);

    return {
      subscriptionId: subscription._id,
      usedAmount: amount,
      newBalance: result.newBalance,
      description
    };
  }

  /**
   * Purchase credit pack
   * @param {string} userId - User ID
   * @param {string} packName - Credit pack name
   * @param {string} planId - Plan ID
   * @returns {Object} Purchase details
   */
  async purchaseCreditPack(userId, packName, planId) {
    const plan = await Plan.findById(planId);

    if (!plan) {
      throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    const creditPack = plan.getCreditPack(packName);

    if (!creditPack) {
      throw new AppError('Credit pack not found', 404, 'PACK_NOT_FOUND');
    }

    const subscription = await Subscription.findActiveForUser(userId);

    if (!subscription) {
      throw new AppError('No active subscription found', 404, 'NO_SUBSCRIPTION');
    }

    // Add credits
    await this.addCredits(
      subscription._id,
      creditPack.credits,
      'purchase',
      `Purchased ${packName} credit pack`,
      `pack:${packName}`
    );

    return {
      packName,
      credits: creditPack.credits,
      price: creditPack.price,
      currency: plan.billing.currency || 'USD',
      newBalance: subscription.credits.balance + creditPack.credits
    };
  }

  /**
   * Purchase custom credit amount
   * @param {string} userId - User ID
   * @param {number} credits - Number of credits to purchase
   * @returns {Object} Purchase details
   */
  async purchaseCredits(userId, credits) {
    if (credits <= 0) {
      throw new AppError('Credit amount must be positive', 400, 'INVALID_AMOUNT');
    }

    const subscription = await Subscription.findActiveForUser(userId)
      .populate('plan');

    if (!subscription) {
      throw new AppError('No active subscription found', 404, 'NO_SUBSCRIPTION');
    }

    const plan = subscription.plan;
    const pricePerCredit = plan.credits?.creditPricing?.pricePerCredit || 0.01; // Default 1 cent per credit

    // Calculate cost with bulk discounts
    const cost = plan.calculateCreditPurchaseCost(credits);

    // Add credits
    await this.addCredits(
      subscription._id,
      credits,
      'purchase',
      `Purchased ${credits} credits`,
      `purchase:${Date.now()}`
    );

    return {
      credits,
      pricePerCredit,
      totalCost: cost,
      currency: plan.billing?.currency || 'USD',
      newBalance: subscription.credits.balance + credits
    };
  }

  /**
   * Get credit packs available for purchase
   * @param {string} planId - Plan ID
   * @returns {Object} Available credit packs
   */
  async getCreditPacks(planId) {
    const plan = await Plan.findById(planId);

    if (!plan) {
      throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    const packs = plan.credits?.creditPricing?.creditPacks || [];
    const pricePerCredit = plan.credits?.creditPricing?.pricePerCredit || 0.01;
    const bulkDiscounts = plan.credits?.creditPricing?.bulkDiscounts || [];

    return {
      planId,
      planName: plan.name,
      currency: plan.billing?.currency || 'USD',
      pricePerCredit,
      bulkDiscounts,
      creditPacks: packs
    };
  }

  /**
   * Configure auto-recharge settings
   * @param {string} userId - User ID
   * @param {Object} settings - Auto-recharge settings
   * @returns {Object} Updated settings
   */
  async configureAutoRecharge(userId, settings) {
    const subscription = await Subscription.findActiveForUser(userId);

    if (!subscription) {
      throw new AppError('No active subscription found', 404, 'NO_SUBSCRIPTION');
    }

    // Update auto-recharge settings
    if (settings.enabled !== undefined) {
      subscription.credits.autoRecharge.enabled = settings.enabled;
    }
    if (settings.threshold !== undefined) {
      subscription.credits.autoRecharge.threshold = Math.max(0, settings.threshold);
    }
    if (settings.rechargeAmount !== undefined) {
      subscription.credits.autoRecharge.rechargeAmount = Math.max(1, settings.rechargeAmount);
    }

    await subscription.save();

    logger.info(`Auto-recharge configured for user ${userId}: ${JSON.stringify(settings)}`);

    return {
      autoRecharge: subscription.credits.autoRecharge
    };
  }

  /**
   * Process auto-recharge for low balance
   * @param {string} userId - User ID
   * @returns {Object} Recharge result
   */
  async processAutoRecharge(userId) {
    const subscription = await Subscription.findActiveForUser(userId)
      .populate('plan');

    if (!subscription) {
      throw new AppError('No active subscription found', 404, 'NO_SUBSCRIPTION');
    }

    const rechargeCheck = subscription.checkAutoRecharge();

    if (!rechargeCheck.needsRecharge) {
      return {
        triggered: false,
        message: 'Auto-recharge not needed',
        currentBalance: subscription.credits.balance
      };
    }

    // Process recharge
    const rechargeAmount = subscription.credits.autoRecharge.rechargeAmount;
    const plan = subscription.plan;
    const cost = plan.calculateCreditPurchaseCost(rechargeAmount);

    // Add credits (payment processing would happen here)
    await this.addCredits(
      subscription._id,
      rechargeAmount,
      'purchase',
      'Auto-recharge triggered',
      `auto-recharge:${Date.now()}`
    );

    subscription.credits.autoRecharge.lastRecharge = new Date();
    await subscription.save();

    logger.info(`Auto-recharge processed for user ${userId}: ${rechargeAmount} credits`);

    return {
      triggered: true,
      creditsAdded: rechargeAmount,
      cost,
      newBalance: subscription.credits.balance,
      currency: plan.billing?.currency || 'USD'
    };
  }

  /**
   * Get credit usage history
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Usage history
   */
  async getCreditHistory(userId, options = {}) {
    const subscription = await Subscription.findOne({ user: userId });

    if (!subscription) {
      throw new AppError('No subscription found', 404, 'NO_SUBSCRIPTION');
    }

    const { page = 1, limit = 50, type } = options;
    let history = subscription.credits.history || [];

    // Filter by type if specified
    if (type) {
      history = history.filter(h => h.type === type);
    }

    // Sort by date (newest first)
    history.sort((a, b) => b.date - a.date);

    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedHistory = history.slice(startIndex, startIndex + limit);

    return {
      subscriptionId: subscription._id,
      total: history.length,
      page,
      limit,
      history: paginatedHistory
    };
  }

  /**
   * Get credit usage statistics
   * @param {string} userId - User ID
   * @returns {Object} Usage statistics
   */
  async getCreditUsageStats(userId) {
    const subscription = await Subscription.findOne({ user: userId })
      .populate('plan');

    if (!subscription) {
      throw new AppError('No subscription found', 404, 'NO_SUBSCRIPTION');
    }

    const history = subscription.credits.history || [];

    // Calculate statistics
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const last30Days = history.filter(h => h.date >= thirtyDaysAgo);
    const totalAdded = last30Days
      .filter(h => ['allocation', 'purchase', 'refund', 'rollover'].includes(h.type))
      .reduce((sum, h) => sum + h.amount, 0);
    const totalUsed = last30Days
      .filter(h => h.type === 'usage')
      .reduce((sum, h) => sum + Math.abs(h.amount), 0);

    // Usage by type
    const usageByType = {};
    history.forEach(h => {
      if (!usageByType[h.type]) {
        usageByType[h.type] = { count: 0, total: 0 };
      }
      usageByType[h.type].count++;
      usageByType[h.type].total += h.amount;
    });

    // Daily usage trend (last 30 days)
    const dailyUsage = subscription.usage?.dailyUsage || [];
    const usageTrend = dailyUsage
      .filter(u => u.date >= thirtyDaysAgo)
      .map(u => ({
        date: u.date,
        tokens: u.tokens,
        requests: u.requests,
        credits: u.credits
      }));

    // Feature usage breakdown
    const featureUsage = subscription.usage?.featuresUsed || [];

    return {
      subscription: {
        id: subscription._id,
        status: subscription.status,
        plan: subscription.plan?.name,
        currentPeriod: {
          start: subscription.billing.currentPeriodStart,
          end: subscription.billing.currentPeriodEnd
        }
      },
      balance: {
        current: subscription.credits.balance,
        used: subscription.credits.usedThisPeriod,
        remaining: subscription.credits.balance - subscription.credits.usedThisPeriod
      },
      statistics: {
        last30Days: {
          creditsAdded: totalAdded,
          creditsUsed: totalUsed,
          netChange: totalAdded - totalUsed
        },
        usageByType,
        averageDailyUsage: dailyUsage.length > 0
          ? totalUsed / Math.min(30, dailyUsage.length)
          : 0
      },
      trends: {
        dailyUsage: usageTrend
      },
      featureUsage: featureUsage.map(f => ({
        feature: f.feature,
        requests: f.requests,
        tokens: f.tokens,
        lastUsed: f.lastUsed
      }))
    };
  }

  /**
   * Refund credits
   * @param {string} subscriptionId - Subscription ID
   * @param {number} amount - Amount to refund
   * @param {string} reason - Refund reason
   * @param {string} reference - Reference ID
   * @returns {Object} Refund result
   */
  async refundCredits(subscriptionId, amount, reason = '', reference = '') {
    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
      throw new AppError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    await subscription.addCredits(amount, 'refund', reason || 'Credit refund', reference);

    logger.info(`Refunded ${amount} credits to subscription ${subscriptionId}: ${reason}`);

    return {
      subscriptionId: subscription._id,
      refundedAmount: amount,
      newBalance: subscription.credits.balance,
      reason
    };
  }

  /**
   * Adjust credit balance (admin operation)
   * @param {string} subscriptionId - Subscription ID
   * @param {number} amount - Amount to adjust (can be negative)
   * @param {string} reason - Adjustment reason
   * @param {string} adminId - Admin user ID
   * @returns {Object} Adjustment result
   */
  async adjustCredits(subscriptionId, amount, reason, adminId) {
    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
      throw new AppError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    const newBalance = subscription.credits.balance + amount;

    if (newBalance < 0) {
      throw new AppError('Adjustment would result in negative balance', 400, 'INVALID_ADJUSTMENT');
    }

    subscription.credits.balance = newBalance;

    subscription.credits.history.push({
      date: new Date(),
      type: 'adjustment',
      amount,
      balance: newBalance,
      description: reason || `Admin adjustment by ${adminId}`
    });

    await subscription.save();

    logger.info(`Admin ${adminId} adjusted credits for subscription ${subscriptionId}: ${amount}`);

    return {
      subscriptionId: subscription._id,
      adjustedAmount: amount,
      newBalance,
      reason
    };
  }

  /**
   * Expire old credits
   * @param {number} monthsOld - Months threshold for expiration
   * @returns {Object} Expiration result
   */
  async expireOldCredits(monthsOld = 12) {
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() - monthsOld);

    const subscriptions = await Subscription.find({
      'credits.creditExpiration.enabled': true,
      'credits.balance': { $gt: 0 }
    });

    let expiredCount = 0;
    let expiredCredits = 0;

    for (const subscription of subscriptions) {
      const oldCredits = subscription.credits.history.filter(h =>
        h.type === 'purchase' &&
        h.date < expirationDate
      );

      const totalOld = oldCredits.reduce((sum, h) => sum + h.amount, 0);

      if (totalOld > 0 && subscription.credits.balance >= totalOld) {
        subscription.credits.balance -= totalOld;

        subscription.credits.history.push({
          date: new Date(),
          type: 'expiration',
          amount: -totalOld,
          balance: subscription.credits.balance,
          description: `Expired credits older than ${monthsOld} months`
        });

        await subscription.save();
        expiredCount++;
        expiredCredits += totalOld;
      }
    }

    logger.info(`Expired ${expiredCredits} credits from ${expiredCount} subscriptions`);

    return {
      subscriptionsAffected: expiredCount,
      totalCreditsExpired: expiredCredits
    };
  }

  /**
   * Allocate monthly credits to subscription
   * @param {string} subscriptionId - Subscription ID
   * @returns {Object} Allocation result
   */
  async allocateMonthlyCredits(subscriptionId) {
    const subscription = await Subscription.findById(subscriptionId)
      .populate('plan');

    if (!subscription) {
      throw new AppError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    const planCredits = subscription.plan?.credits?.includedCredits || 0;

    // Process rollover before allocation
    const maxRollover = subscription.plan?.credits?.rollover?.maxRolloverPercent || 0;
    await subscription.processRollover(maxRollover);

    // Allocate new credits
    await subscription.allocatePlanCredits(planCredits);

    logger.info(`Allocated ${planCredits} monthly credits to subscription ${subscriptionId}`);

    return {
      subscriptionId: subscription._id,
      allocatedCredits: planCredits,
      rolloverCredits: subscription.credits.rolloverCredits,
      newBalance: subscription.credits.balance
    };
  }
}

export default new CreditService();