/**
 * Application Constants
 *
 * Centralized constants used throughout the frontend application.
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  RETRY_ATTEMPTS: 3
};

// Authentication Keys
export const AUTH_KEYS = {
  TOKEN: import.meta.env.VITE_TOKEN_KEY || 'auth_token',
  REFRESH_TOKEN: import.meta.env.VITE_REFRESH_TOKEN_KEY || 'refresh_token',
  USER: import.meta.env.VITE_USER_KEY || 'user_data'
};

// User Roles
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_OWNER: 'org_owner',
  FINANCE_ADMIN: 'finance_admin',
  PRODUCT_MANAGER: 'product_manager',
  DEVELOPER: 'developer',
  VIEWER: 'viewer'
};

// Role Display Names
export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ORG_OWNER]: 'Organization Owner',
  [ROLES.FINANCE_ADMIN]: 'Finance Admin',
  [ROLES.PRODUCT_MANAGER]: 'Product Manager',
  [ROLES.DEVELOPER]: 'Developer',
  [ROLES.VIEWER]: 'Viewer'
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

// Pricing Units
export const PRICING_UNITS = {
  PER_1K_TOKENS: 'per_1k_tokens',
  PER_1M_TOKENS: 'per_1m_tokens',
  PER_REQUEST: 'per_request',
  PER_IMAGE: 'per_image',
  PER_SECOND: 'per_second'
};

// Pricing Types
export const PRICING_TYPES = {
  FLAT_RATE: 'flat_rate',
  USAGE_BASED: 'usage_based',
  CREDIT_BASED: 'credit_based',
  TIERED: 'tiered',
  HYBRID: 'hybrid'
};

// Model Types
export const MODEL_TYPES = {
  CHAT: 'chat',
  COMPLETION: 'completion',
  EMBEDDING: 'embedding',
  IMAGE: 'image',
  AUDIO: 'audio'
};

// Provider Categories
export const PROVIDER_CATEGORIES = {
  LLM: 'llm',
  IMAGE: 'image',
  AUDIO: 'audio',
  EMBEDDING: 'embedding'
};

// Subscription Status
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  TRIAL: 'trial',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  LIMITS: [10, 20, 50, 100]
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  INPUT: 'YYYY-MM-DD',
  DATETIME: 'MMM DD, YYYY HH:mm',
  TIME: 'HH:mm'
};

// Currency
export const CURRENCY = {
  DEFAULT: import.meta.env.VITE_DEFAULT_CURRENCY || 'USD',
  SUPPORTED: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'],
  SYMBOLS: {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    CAD: 'C$',
    AUD: 'A$'
  }
};

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Feature Flags
export const FEATURES = {
  ENABLE_2FA: import.meta.env.VITE_ENABLE_2FA === 'true',
  ENABLE_DARK_MODE: import.meta.env.VITE_ENABLE_DARK_MODE === 'true',
  ENABLE_NOTIFICATIONS: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true'
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to server. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to access this resource.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Successfully logged in!',
  LOGOUT: 'Successfully logged out!',
  REGISTER: 'Account created successfully!',
  SAVE: 'Changes saved successfully!',
  DELETE: 'Item deleted successfully!',
  UPDATE: 'Item updated successfully!'
};

export default {
  API_CONFIG,
  AUTH_KEYS,
  ROLES,
  ROLE_LABELS,
  HTTP_STATUS,
  PRICING_UNITS,
  PRICING_TYPES,
  MODEL_TYPES,
  PROVIDER_CATEGORIES,
  SUBSCRIPTION_STATUS,
  PAGINATION,
  DATE_FORMATS,
  CURRENCY,
  NOTIFICATION_TYPES,
  FEATURES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};