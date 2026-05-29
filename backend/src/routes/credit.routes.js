/**
 * Credit Routes
 *
 * Routes for credit-based system management.
 */

import { Router } from 'express';
import creditController from '../controllers/credit.controller.js';
import { protect, requirePermissions } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(protect);

// ===========================================
// User Credit Routes
// ===========================================

/**
 * @route   GET /api/credits/balance
 * @desc    Get current credit balance
 * @access  Private
 */
router.get('/balance', creditController.getBalance);

/**
 * @route   POST /api/credits/purchase
 * @desc    Purchase credits
 * @access  Private
 */
router.post('/purchase', creditController.purchaseCredits);

/**
 * @route   POST /api/credits/use
 * @desc    Use credits
 * @access  Private
 */
router.post('/use', creditController.useCredits);

/**
 * @route   GET /api/credits/packs
 * @desc    Get available credit packs
 * @access  Private
 */
router.get('/packs', creditController.getCreditPacks);

/**
 * @route   PUT /api/credits/auto-recharge
 * @desc    Configure auto-recharge settings
 * @access  Private
 */
router.put('/auto-recharge', creditController.configureAutoRecharge);

/**
 * @route   POST /api/credits/auto-recharge/process
 * @desc    Process auto-recharge for current user
 * @access  Private
 */
router.post('/auto-recharge/process', creditController.processAutoRecharge);

/**
 * @route   GET /api/credits/history
 * @desc    Get credit history
 * @access  Private
 */
router.get('/history', creditController.getHistory);

/**
 * @route   GET /api/credits/stats
 * @desc    Get credit usage statistics
 * @access  Private
 */
router.get('/stats', creditController.getStats);

// ===========================================
// Admin Credit Routes
// ===========================================

/**
 * @route   POST /api/credits/admin/adjust
 * @desc    Admin: Adjust credit balance
 * @access  Private (requires manage_users permission)
 */
router.post('/admin/adjust',
  requirePermissions('manage_users'),
  creditController.adjustCredits
);

/**
 * @route   POST /api/credits/admin/refund
 * @desc    Admin: Refund credits
 * @access  Private (requires manage_users permission)
 */
router.post('/admin/refund',
  requirePermissions('manage_users'),
  creditController.refundCredits
);

/**
 * @route   POST /api/credits/admin/allocate
 * @desc    Admin: Allocate monthly credits
 * @access  Private (requires manage_users permission)
 */
router.post('/admin/allocate',
  requirePermissions('manage_users'),
  creditController.allocateCredits
);

/**
 * @route   POST /api/credits/admin/expire
 * @desc    Admin: Expire old credits
 * @access  Private (requires manage_users permission)
 */
router.post('/admin/expire',
  requirePermissions('manage_users'),
  creditController.expireCredits
);

export default router;