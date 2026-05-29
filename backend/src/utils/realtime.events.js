/**
 * Real-time Events Constants
 *
 * Defines all real-time event types for Socket.IO communication.
 */

// Connection Events
export const CONNECTION_EVENTS = {
  CONNECTED: 'connection:established',
  DISCONNECTED: 'disconnect',
  ERROR: 'connection:error',
  PONG: 'pong'
};

// Subscription Events
export const SUBSCRIPTION_EVENTS = {
  SUBSCRIBE_TOKEN_USAGE: 'subscribe:token-usage',
  UNSUBSCRIBE_TOKEN_USAGE: 'unsubscribe:token-usage',
  SUBSCRIBE_FEATURE: 'subscribe:feature',
  UNSUBSCRIBE_FEATURE: 'unsubscribe:feature',
  SUBSCRIBE_PROJECT: 'subscribe:project',
  UNSUBSCRIBE_PROJECT: 'unsubscribe:project',
  SUBSCRIBE_ANALYTICS: 'subscribe:analytics',
  UNSUBSCRIBE_ANALYTICS: 'unsubscribe:analytics',
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed'
};

// Token Usage Events
export const TOKEN_EVENTS = {
  UPDATE: 'token-usage:update',
  FEATURE: 'token-usage:feature',
  PROJECT: 'token-usage:project',
  CONSUMPTION: 'token-usage:consumption',
  ALERT: 'token-usage:alert'
};

// Feature Events
export const FEATURE_EVENTS = {
  UPDATE: 'feature:update',
  DETAIL: 'feature:detail',
  CREATED: 'feature:created',
  UPDATED: 'feature:updated',
  DELETED: 'feature:deleted'
};

// Project Events
export const PROJECT_EVENTS = {
  UPDATE: 'project:update',
  DETAIL: 'project:detail',
  CREATED: 'project:created',
  UPDATED: 'project:updated',
  DELETED: 'project:deleted'
};

// Analytics Events
export const ANALYTICS_EVENTS = {
  UPDATE: 'analytics:update',
  DASHBOARD: 'dashboard:metrics',
  REPORT: 'analytics:report'
};

// Notification Events
export const NOTIFICATION_EVENTS = {
  USER: 'notification:new',
  ORGANIZATION: 'notification:org',
  SYSTEM: 'notification:system'
};

// Alert Events
export const ALERT_EVENTS = {
  USAGE: 'alert:usage',
  PRICING: 'alert:pricing',
  MARGIN: 'alert:margin',
  SPIKE: 'alert:spike',
  SYSTEM: 'alert:system'
};

// Integration Events
export const INTEGRATION_EVENTS = {
  STATUS: 'integration:status',
  SYNC_START: 'integration:sync-start',
  SYNC_PROGRESS: 'integration:sync-progress',
  SYNC_COMPLETE: 'integration:sync-complete',
  SYNC_ERROR: 'integration:sync-error'
};

// Sync Events
export const SYNC_EVENTS = {
  STATUS: 'sync:status',
  STARTED: 'sync:started',
  PROGRESS: 'sync:progress',
  COMPLETED: 'sync:completed',
  FAILED: 'sync:failed'
};

// Webhook Events
export const WEBHOOK_EVENTS = {
  RECEIVED: 'webhook:received',
  PROCESSED: 'webhook:processed',
  FAILED: 'webhook:failed'
};

// Billing Events
export const BILLING_EVENTS = {
  SUBSCRIPTION_UPDATED: 'billing:subscription-updated',
  SUBSCRIPTION_CANCELLED: 'billing:subscription-cancelled',
  PAYMENT_RECEIVED: 'billing:payment-received',
  PAYMENT_FAILED: 'billing:payment-failed',
  INVOICE_CREATED: 'billing:invoice-created',
  INVOICE_PAID: 'billing:invoice-paid'
};

export default {
  CONNECTION_EVENTS,
  SUBSCRIPTION_EVENTS,
  TOKEN_EVENTS,
  FEATURE_EVENTS,
  PROJECT_EVENTS,
  ANALYTICS_EVENTS,
  NOTIFICATION_EVENTS,
  ALERT_EVENTS,
  INTEGRATION_EVENTS,
  SYNC_EVENTS,
  WEBHOOK_EVENTS,
  BILLING_EVENTS
};