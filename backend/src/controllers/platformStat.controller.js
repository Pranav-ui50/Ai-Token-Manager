/**
 * Platform Statistics Controller
 *
 * Handles HTTP requests for platform statistics.
 */

import platformStatService from '../services/platformStat.service.js';
import { AppError } from '../middlewares/error.middleware.js';

/**
 * Get all active platform stats (public)
 * GET /api/platform-stats
 */
export const getActiveStats = async (req, res, next) => {
  try {
    const stats = await platformStatService.getActiveStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all platform stats (admin)
 * GET /api/admin/platform-stats
 */
export const getAllStats = async (req, res, next) => {
  try {
    const stats = await platformStatService.getAllStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stat by key
 * GET /api/admin/platform-stats/:key
 */
export const getStatByKey = async (req, res, next) => {
  try {
    const { key } = req.params;
    const stat = await platformStatService.getStatByKey(key);
    res.json({
      success: true,
      data: stat
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update platform stat
 * PUT /api/admin/platform-stats/:id
 */
export const updateStat = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const stat = await platformStatService.updateStatById(id, req.body, userId);
    res.json({
      success: true,
      data: stat,
      message: 'Platform stat updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update stat by key
 * PUT /api/admin/platform-stats/key/:key
 */
export const updateStatByKey = async (req, res, next) => {
  try {
    const { key } = req.params;
    const userId = req.user._id;
    const stat = await platformStatService.updateStat(key, req.body, userId);
    res.json({
      success: true,
      data: stat,
      message: 'Platform stat updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder platform stats
 * PATCH /api/admin/platform-stats/reorder
 */
export const reorderStats = async (req, res, next) => {
  try {
    const { orderIds } = req.body;
    await platformStatService.reorderStats(orderIds);
    res.json({
      success: true,
      message: 'Platform stats reordered successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Initialize default stats
 * POST /api/admin/platform-stats/initialize
 */
export const initializeDefaults = async (req, res, next) => {
  try {
    await platformStatService.initializeDefaults();
    res.json({
      success: true,
      message: 'Default platform stats initialized'
    });
  } catch (error) {
    next(error);
  }
};