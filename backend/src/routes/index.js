/**
 * API Routes Index
 *
 * Centralized routing configuration for the application.
 */

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import organizationRoutes from './organization.routes.js';
import roleRoutes from './role.routes.js';
import providerRoutes from './provider.routes.js';
import modelRoutes from './model.routes.js';
import featureRoutes from './feature.routes.js';
import planRoutes from './plan.routes.js';
import projectRoutes from './project.routes.js';
import pricingHistoryRoutes from './pricingHistory.routes.js';
import pricingEngineRoutes from './pricingEngine.routes.js';
import simulationRoutes from './simulation.routes.js';
import analyticsRoutes from './analytics.routes.js';
import integrationRoutes from './integration.routes.js';
import apiKeyRoutes from './apiKey.routes.js';
import webhookRoutes from './webhook.routes.js';

const router = Router();

// ===========================================
// Health Check
// ===========================================

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Token Manager API',
    version: 'v1',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      organizations: '/api/organizations',
      providers: '/api/providers',
      models: '/api/models',
      features: '/api/features',
      plans: '/api/plans',
      projects: '/api/projects',
      pricingHistory: '/api/pricing-history',
      pricingEngine: '/api/pricing-engine',
      simulations: '/api/simulations',
      analytics: '/api/analytics',
      reports: '/api/reports',
      integrations: '/api/integrations',
      notifications: '/api/notifications',
      auditLogs: '/api/audit-logs',
      settings: '/api/settings'
    }
  });
});

// ===========================================
// Authentication Routes
// ===========================================

router.use('/auth', authRoutes);

// ===========================================
// Organization Routes
// ===========================================

router.use('/organizations', organizationRoutes);

// ===========================================
// Role Routes
// ===========================================

router.use('/roles', roleRoutes);

// ===========================================
// Provider Routes
// ===========================================

router.use('/providers', providerRoutes);

// ===========================================
// Model Routes
// ===========================================

router.use('/models', modelRoutes);

// ===========================================
// Feature Routes
// ===========================================

router.use('/features', featureRoutes);

// ===========================================
// Plan Routes
// ===========================================

router.use('/plans', planRoutes);

// ===========================================
// Project Routes
// ===========================================

router.use('/projects', projectRoutes);

// ===========================================
// Pricing History Routes
// ===========================================

router.use('/pricing-history', pricingHistoryRoutes);

// ===========================================
// Pricing Engine Routes
// ===========================================

router.use('/pricing-engine', pricingEngineRoutes);

// ===========================================
// Simulation Routes
// ===========================================

router.use('/simulations', simulationRoutes);

// ===========================================
// Analytics Routes
// ===========================================

router.use('/analytics', analyticsRoutes);

// ===========================================
// Integration Routes
// ===========================================

router.use('/integrations', integrationRoutes);

// ===========================================
// API Key Routes
// ===========================================

router.use('/api-keys', apiKeyRoutes);

// ===========================================
// Webhook Routes
// ===========================================

router.use('/webhooks', webhookRoutes);

// ===========================================
// Report Routes
// ===========================================

import reportRoutes from './report.routes.js';
router.use('/reports', reportRoutes);

// ===========================================
// Notification Routes
// ===========================================

import notificationRoutes from './notification.routes.js';
router.use('/notifications', notificationRoutes);

// ===========================================
// Audit Logs Routes
// ===========================================

import auditRoutes from './audit.routes.js';
router.use('/audit-logs', auditRoutes);

// ===========================================
// Settings Routes
// ===========================================

import settingsRoutes from './settings.routes.js';
router.use('/settings', settingsRoutes);

// ===========================================
// Billing Routes
// ===========================================

import billingRoutes from './billing.routes.js';
router.use('/billing', billingRoutes);

// ===========================================
// Payment Routes
// ===========================================

import paymentRoutes from './payment.routes.js';
router.use('/payments', paymentRoutes);

// ===========================================
// Real-time Routes
// ===========================================

import realtimeRoutes from './realtime.routes.js';
router.use('/realtime', realtimeRoutes);

// ===========================================
// Two-Factor Authentication Routes
// ===========================================

import twoFactorRoutes from './twoFactor.routes.js';
router.use('/2fa', twoFactorRoutes);

// ===========================================
// Activity Routes
// ===========================================

import activityRoutes from './activity.routes.js';
router.use('/activity', activityRoutes);

// ===========================================
// Infrastructure Routes
// ===========================================

import infrastructureRoutes from './infrastructure.routes.js';
router.use('/infrastructure', infrastructureRoutes);

// ===========================================
// Break-Even Analysis Routes
// ===========================================

import breakevenRoutes from './breakeven.routes.js';
router.use('/breakeven', breakevenRoutes);

// ===========================================
// Credit Routes
// ===========================================

import creditRoutes from './credit.routes.js';
router.use('/credits', creditRoutes);

// ===========================================
// Admin Routes
// ===========================================

import adminRoutes from './admin.routes.js';
router.use('/admin', adminRoutes);

export default router;