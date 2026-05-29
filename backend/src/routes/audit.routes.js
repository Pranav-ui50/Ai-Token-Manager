import express from 'express';
import auditController from '../controllers/audit.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validation.middleware.js';
import auditValidator from '../validators/audit.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Type endpoints (no validation needed)
router.get('/types/actions', auditController.getActionTypes);
router.get('/types/resources', auditController.getResourceTypes);
router.get('/types/severity', auditController.getSeverityLevels);

// Summary endpoints
router.get('/summary/actions', auditController.getActionSummary);
router.get('/summary/resources', auditController.getResourceSummary);
router.get('/summary/users', auditController.getUserActivitySummary);

// Recent activity
router.get('/recent', auditController.getRecentActivity);

// Export logs
router.get('/export', auditController.exportLogs);

// User logs
router.get('/user/:userId', auditController.getUserLogs);

// Resource logs
router.get('/resource/:type/:id', auditController.getResourceLogs);

// Statistics
router.get('/statistics', auditController.getStatistics);

// Main CRUD endpoints
router.route('/')
  .get(validate(auditValidator.getLogs), auditController.getLogs)
  .post(validate(auditValidator.createLog), auditController.createLog);

// Single log by ID
router.get('/:id', auditController.getLogById);

// Cleanup (admin only)
router.delete('/cleanup', auditController.cleanupLogs);

export default router;