import express from 'express';
import reportController from '../controllers/report.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validation.middleware.js';
import reportValidator from '../validators/report.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Report types and formats (public within auth)
router.get('/types', reportController.getReportTypes);
router.get('/formats', reportController.getFileFormats);
router.get('/stats', reportController.getReportStats);

// Template routes
router.get('/templates', reportController.getTemplates);
router.post('/templates', validate(reportValidator.createTemplate), reportController.createTemplate);

// Scheduled reports
router.get('/scheduled', reportController.getScheduledReports);

// Main CRUD routes
router.route('/')
  .get(validate(reportValidator.listReports), reportController.getReports)
  .post(validate(reportValidator.createReport), reportController.createReport);

// Duplicate report
router.post('/:id/duplicate', reportController.duplicateReport);

// Create from template
router.post('/from-template/:templateId', validate(reportValidator.createFromTemplate), reportController.createFromTemplate);

// Generate report
router.post('/:id/generate', reportController.generateReport);

// Export report
router.get('/:id/export', reportController.exportReport);

// Share report
router.post('/:id/share', validate(reportValidator.shareReport), reportController.shareReport);
router.delete('/:id/share/:userId', reportController.removeShare);

// Single report operations
router.route('/:id')
  .get(reportController.getReport)
  .put(validate(reportValidator.updateReport), reportController.updateReport)
  .delete(reportController.deleteReport);

export default router;