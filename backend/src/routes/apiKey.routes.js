/**
 * ApiKey Routes
 *
 * Routes for API key management endpoints.
 * FR-48: API Credential Management
 */

import { Router } from 'express';
import apiKeyController from '../controllers/apiKey.controller.js';
import { protect, requirePermissions } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/api-keys
 * @desc    Create a new API key
 * @access  Private (requires manage_api_keys permission)
 */
router.post('/',
  requirePermissions('manage_api_keys'),
  apiKeyController.create
);

/**
 * @route   GET /api/api-keys
 * @desc    Get all API keys for organization
 * @access  Private (requires view_api_keys permission)
 */
router.get('/',
  requirePermissions('view_api_keys'),
  apiKeyController.getForOrganization
);

/**
 * @route   GET /api/api-keys/my-keys
 * @desc    Get API keys for current user
 * @access  Private
 */
router.get('/my-keys',
  apiKeyController.getMyKeys
);

/**
 * @route   GET /api/api-keys/:id
 * @desc    Get API key by ID
 * @access  Private (requires view_api_keys permission)
 */
router.get('/:id',
  requirePermissions('view_api_keys'),
  apiKeyController.getById
);

/**
 * @route   GET /api/api-keys/:id/stats
 * @desc    Get API key usage statistics
 * @access  Private (requires view_api_keys permission)
 */
router.get('/:id/stats',
  requirePermissions('view_api_keys'),
  apiKeyController.getUsageStats
);

/**
 * @route   PUT /api/api-keys/:id
 * @desc    Update API key
 * @access  Private (requires manage_api_keys permission)
 */
router.put('/:id',
  requirePermissions('manage_api_keys'),
  apiKeyController.update
);

/**
 * @route   POST /api/api-keys/:id/regenerate
 * @desc    Regenerate API key
 * @access  Private (requires manage_api_keys permission)
 */
router.post('/:id/regenerate',
  requirePermissions('manage_api_keys'),
  apiKeyController.regenerate
);

/**
 * @route   POST /api/api-keys/:id/revoke
 * @desc    Revoke API key
 * @access  Private (requires manage_api_keys permission)
 */
router.post('/:id/revoke',
  requirePermissions('manage_api_keys'),
  apiKeyController.revoke
);

/**
 * @route   DELETE /api/api-keys/:id
 * @desc    Delete API key
 * @access  Private (requires manage_api_keys permission)
 */
router.delete('/:id',
  requirePermissions('manage_api_keys'),
  apiKeyController.delete
);

/**
 * @route   POST /api/api-keys/validate
 * @desc    Validate API key (public endpoint for API auth)
 * @access  Public (uses API key from body)
 */
router.post('/validate',
  apiKeyController.validate
);

export default router;