/**
 * Subscription Expiry Job
 *
 * Cron job to process:
 * - Expired subscriptions
 * - Scheduled downgrades
 * - Member limit enforcement
 */

import cron from 'node-cron';
import SubscriptionService from '../services/subscription.service.js';
import Organization from '../models/Organization.js';
import logger from '../config/logger.js';

class SubscriptionJob {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the subscription cron jobs
   */
  start() {
    // Run every hour to check for expired subscriptions
    cron.schedule('0 * * * *', async () => {
      await this.runExpiredSubscriptionCheck();
    });

    // Run every 6 hours to process scheduled downgrades
    cron.schedule('0 */6 * * *', async () => {
      await this.runScheduledDowngrades();
    });

    // Run daily at midnight to clean up expired grace periods
    cron.schedule('0 0 * * *', async () => {
      await this.runGracePeriodCleanup();
    });

    logger.info('[SubscriptionJob] Cron jobs started');
  }

  /**
   * Run expired subscription check
   */
  async runExpiredSubscriptionCheck() {
    if (this.isRunning) {
      logger.info('[SubscriptionJob] Already running, skipping');
      return;
    }

    this.isRunning = true;

    try {
      logger.info('[SubscriptionJob] Running expired subscription check...');

      const result = await SubscriptionService.processExpiredSubscriptions();

      logger.info(`[SubscriptionJob] Processed ${result.processed} subscriptions:`);
      logger.info(`[SubscriptionJob] - ${result.expired} expired`);
      logger.info(`[SubscriptionJob] - ${result.gracePeriod} in grace period`);

      if (result.errors.length > 0) {
        logger.error(`[SubscriptionJob] ${result.errors.length} errors:`, result.errors);
      }

      return result;
    } catch (error) {
      logger.error('[SubscriptionJob] Error running expired subscription check:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run scheduled downgrades processing
   */
  async runScheduledDowngrades() {
    if (this.isRunning) {
      logger.info('[SubscriptionJob] Already running, skipping');
      return;
    }

    this.isRunning = true;

    try {
      logger.info('[SubscriptionJob] Running scheduled downgrades check...');

      const result = await SubscriptionService.processScheduledDowngrades();

      logger.info(`[SubscriptionJob] Processed ${result.processed} scheduled downgrades:`);
      logger.info(`[SubscriptionJob] - ${result.succeeded} succeeded`);
      logger.info(`[SubscriptionJob] - ${result.failed} failed`);

      if (result.errors.length > 0) {
        logger.error(`[SubscriptionJob] ${result.errors.length} errors:`, result.errors);
      }

      return result;
    } catch (error) {
      logger.error('[SubscriptionJob] Error running scheduled downgrades:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run grace period cleanup
   */
  async runGracePeriodCleanup() {
    if (this.isRunning) {
      logger.info('[SubscriptionJob] Already running, skipping');
      return;
    }

    this.isRunning = true;

    try {
      logger.info('[SubscriptionJob] Running grace period cleanup...');

      const now = new Date();

      // Find organizations in grace period that have expired
      const expiredGracePeriod = await Organization.find({
        'subscription.status': 'grace_period',
        'subscription.currentPeriodEnd': { $lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
      });

      logger.info(`[SubscriptionJob] Found ${expiredGracePeriod.length} organizations with expired grace period`);

      for (const org of expiredGracePeriod) {
        try {
          // Downgrade to free
          org.subscription.status = 'expired';
          org.subscription.plan = 'free';
          org.subscription.planId = null;
          org.subscription.expiredAt = now;

          await org.save();

          // Disable excess members
          await SubscriptionService.disableExcessMembers(org._id, 1, null);

          logger.info(`[SubscriptionJob] Organization ${org._id} grace period expired, downgraded to free`);
        } catch (error) {
          logger.error(`[SubscriptionJob] Error processing ${org._id}:`, error);
        }
      }

      return { processed: expiredGracePeriod.length };
    } catch (error) {
      logger.error('[SubscriptionJob] Error running grace period cleanup:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run manually (for testing)
   */
  async runAll() {
    logger.info('[SubscriptionJob] Running all jobs manually...');

    const results = {
      expiredSubscriptions: await this.runExpiredSubscriptionCheck(),
      scheduledDowngrades: await this.runScheduledDowngrades(),
      gracePeriodCleanup: await this.runGracePeriodCleanup()
    };

    logger.info('[SubscriptionJob] Manual run completed:', results);

    return results;
  }
}

export default new SubscriptionJob();