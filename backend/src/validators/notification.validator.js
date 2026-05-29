/**
 * Notification Validators
 *
 * Validation schemas for notification endpoints.
 */

import { body, param, query } from 'express-validator';

export const notificationValidators = {
  /**
   * Get notifications validation
   */
  getNotifications: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),

    query('status')
      .optional()
      .isIn(['unread', 'read', 'resolved', 'dismissed'])
      .withMessage('Invalid status'),

    query('type')
      .optional()
      .isIn(['pricing_change', 'low_margin', 'usage_spike', 'system', 'feature', 'plan', 'integration', 'security'])
      .withMessage('Invalid notification type'),

    query('severity')
      .optional()
      .isIn(['info', 'warning', 'critical', 'urgent'])
      .withMessage('Invalid severity')
  ],

  /**
   * Get notification by ID validation
   */
  getNotification: [
    param('id')
      .isMongoId()
      .withMessage('Invalid notification ID')
  ],

  /**
   * Mark as read validation
   */
  markAsRead: [
    param('id')
      .isMongoId()
      .withMessage('Invalid notification ID')
  ],

  /**
   * Dismiss validation
   */
  dismiss: [
    param('id')
      .isMongoId()
      .withMessage('Invalid notification ID')
  ],

  /**
   * Resolve validation
   */
  resolve: [
    param('id')
      .isMongoId()
      .withMessage('Invalid notification ID')
  ],

  /**
   * Delete validation
   */
  deleteNotification: [
    param('id')
      .isMongoId()
      .withMessage('Invalid notification ID')
  ],

  /**
   * Mark all as read validation
   */
  markAllAsRead: [
    query('type')
      .optional()
      .isIn(['pricing_change', 'low_margin', 'usage_spike', 'system', 'feature', 'plan', 'integration', 'security'])
      .withMessage('Invalid notification type'),

    query('severity')
      .optional()
      .isIn(['info', 'warning', 'critical', 'urgent'])
      .withMessage('Invalid severity')
  ],

  /**
   * Bulk mark as read validation
   */
  bulkMarkAsRead: [
    body('notificationIds')
      .isArray({ min: 1 })
      .withMessage('Notification IDs must be a non-empty array'),

    body('notificationIds.*')
      .isMongoId()
      .withMessage('Invalid notification ID')
  ],

  /**
   * Bulk delete validation
   */
  bulkDelete: [
    body('notificationIds')
      .isArray({ min: 1 })
      .withMessage('Notification IDs must be a non-empty array'),

    body('notificationIds.*')
      .isMongoId()
      .withMessage('Invalid notification ID')
  ],

  /**
   * Trigger pricing change notification validation
   */
  triggerPricingChange: [
    body('providerName')
      .notEmpty()
      .withMessage('Provider name is required')
      .isLength({ max: 100 })
      .withMessage('Provider name cannot exceed 100 characters'),

    body('modelName')
      .notEmpty()
      .withMessage('Model name is required')
      .isLength({ max: 100 })
      .withMessage('Model name cannot exceed 100 characters'),

    body('oldPrice')
      .notEmpty()
      .withMessage('Old price is required')
      .isFloat({ min: 0 })
      .withMessage('Old price must be a non-negative number'),

    body('newPrice')
      .notEmpty()
      .withMessage('New price is required')
      .isFloat({ min: 0 })
      .withMessage('New price must be a non-negative number'),

    body('modelId')
      .optional()
      .isMongoId()
      .withMessage('Invalid model ID'),

    body('effectiveDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid effective date')
  ],

  /**
   * Trigger low margin notification validation
   */
  triggerLowMargin: [
    body('currentMargin')
      .notEmpty()
      .withMessage('Current margin is required')
      .isFloat()
      .withMessage('Current margin must be a number'),

    body('thresholdMargin')
      .notEmpty()
      .withMessage('Threshold margin is required')
      .isFloat({ min: 0, max: 100 })
      .withMessage('Threshold margin must be between 0 and 100'),

    body('planName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Plan name cannot exceed 100 characters'),

    body('featureName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Feature name cannot exceed 100 characters'),

    body('planId')
      .optional()
      .isMongoId()
      .withMessage('Invalid plan ID'),

    body('featureId')
      .optional()
      .isMongoId()
      .withMessage('Invalid feature ID'),

    // Custom validation - at least one identifier must be provided
    body().custom((value) => {
      if (!value.planName && !value.featureName) {
        throw new Error('Either planName or featureName must be provided');
      }
      return true;
    })
  ],

  /**
   * Trigger usage spike notification validation
   */
  triggerUsageSpike: [
    body('featureName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Feature name cannot exceed 100 characters'),

    body('normalUsage')
      .notEmpty()
      .withMessage('Normal usage is required')
      .isInt({ min: 0 })
      .withMessage('Normal usage must be a non-negative integer'),

    body('currentUsage')
      .notEmpty()
      .withMessage('Current usage is required')
      .isInt({ min: 0 })
      .withMessage('Current usage must be a non-negative integer'),

    body('spikePercent')
      .notEmpty()
      .withMessage('Spike percentage is required')
      .isFloat({ min: 0 })
      .withMessage('Spike percentage must be a non-negative number'),

    body('featureId')
      .optional()
      .isMongoId()
      .withMessage('Invalid feature ID')
  ],

  /**
   * Create custom notification validation
   */
  createCustom: [
    body('userIds')
      .optional()
      .isArray()
      .withMessage('User IDs must be an array'),

    body('userIds.*')
      .optional()
      .isMongoId()
      .withMessage('Invalid user ID'),

    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 200 })
      .withMessage('Title cannot exceed 200 characters'),

    body('message')
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 1000 })
      .withMessage('Message cannot exceed 1000 characters'),

    body('severity')
      .optional()
      .isIn(['info', 'warning', 'critical', 'urgent'])
      .withMessage('Invalid severity'),

    body('type')
      .optional()
      .isIn(['pricing_change', 'low_margin', 'usage_spike', 'system', 'feature', 'plan', 'integration', 'security'])
      .withMessage('Invalid notification type'),

    body('priority')
      .optional()
      .isInt({ min: 0, max: 10 })
      .withMessage('Priority must be between 0 and 10'),

    body('resource.type')
      .optional()
      .isIn(['provider', 'model', 'feature', 'plan', 'simulation', 'integration', 'project'])
      .withMessage('Invalid resource type'),

    body('resource.id')
      .optional()
      .isMongoId()
      .withMessage('Invalid resource ID'),

    body('actions')
      .optional()
      .isArray({ max: 5 })
      .withMessage('Actions cannot exceed 5 items'),

    body('actions.*.label')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Action label cannot exceed 50 characters'),

    body('actions.*.url')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Action URL cannot exceed 500 characters'),

    body('actions.*.type')
      .optional()
      .isIn(['primary', 'secondary', 'danger'])
      .withMessage('Invalid action type')
  ]
};

export default notificationValidators;