/**
 * Platform Statistics Service
 *
 * Handles all platform statistics business logic.
 */

import PlatformStat from '../models/PlatformStat.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class PlatformStatService {
  /**
   * Get all active platform stats (public)
   * @returns {Array} Active platform stats
   */
  async getActiveStats() {
    const stats = await PlatformStat.getActive();
    return stats;
  }

  /**
   * Get all platform stats (admin)
   * @returns {Array} All platform stats
   */
  async getAllStats() {
    const stats = await PlatformStat.getAll();
    return stats;
  }

  /**
   * Get stat by key
   * @param {string} statKey - Stat key
   * @returns {Object} Platform stat
   */
  async getStatByKey(statKey) {
    const stat = await PlatformStat.findOne({ statKey });

    if (!stat) {
      throw new AppError('Stat not found', 404, 'STAT_NOT_FOUND');
    }

    return stat;
  }

  /**
   * Update platform stat
   * @param {string} statKey - Stat key
   * @param {Object} data - Update data
   * @param {string} userId - Admin user ID
   * @returns {Object} Updated stat
   */
  async updateStat(statKey, data, userId) {
    const { statValue, statLabel, description, icon, isActive } = data;

    const stat = await PlatformStat.findOne({ statKey });

    if (!stat) {
      throw new AppError('Stat not found', 404, 'STAT_NOT_FOUND');
    }

    // Update fields
    if (statValue !== undefined) stat.statValue = statValue;
    if (statLabel !== undefined) stat.statLabel = statLabel;
    if (description !== undefined) stat.description = description;
    if (icon !== undefined) stat.icon = icon;
    if (isActive !== undefined) stat.isActive = isActive;
    stat.updatedBy = userId;

    await stat.save();

    logger.info(`Platform stat updated: ${statKey} by user: ${userId}`);

    return stat;
  }

  /**
   * Update stat by ID
   * @param {string} statId - Stat ID
   * @param {Object} data - Update data
   * @param {string} userId - Admin user ID
   * @returns {Object} Updated stat
   */
  async updateStatById(statId, data, userId) {
    const { statValue, statLabel, description, icon, displayOrder, isActive } = data;

    const stat = await PlatformStat.findById(statId);

    if (!stat) {
      throw new AppError('Stat not found', 404, 'STAT_NOT_FOUND');
    }

    // Update fields
    if (statValue !== undefined) stat.statValue = statValue;
    if (statLabel !== undefined) stat.statLabel = statLabel;
    if (description !== undefined) stat.description = description;
    if (icon !== undefined) stat.icon = icon;
    if (displayOrder !== undefined) stat.displayOrder = displayOrder;
    if (isActive !== undefined) stat.isActive = isActive;
    stat.updatedBy = userId;

    await stat.save();

    logger.info(`Platform stat updated: ${stat.statKey} by user: ${userId}`);

    return stat;
  }

  /**
   * Reorder platform stats
   * @param {Array} orderIds - Array of stat IDs in new order
   * @returns {boolean} Success
   */
  async reorderStats(orderIds) {
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new AppError('Invalid order data', 400, 'INVALID_ORDER_DATA');
    }

    const updates = orderIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { displayOrder: index }
      }
    }));

    await PlatformStat.bulkWrite(updates);

    logger.info(`Platform stats reordered`);

    return true;
  }

  /**
   * Initialize default stats if not exist
   * @returns {boolean} Success
   */
  async initializeDefaults() {
    await PlatformStat.initializeDefaults();
    return true;
  }
}

export default new PlatformStatService();