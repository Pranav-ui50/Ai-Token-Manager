/**
 * Utility Helpers
 *
 * Common utility functions used throughout the frontend application.
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes
 * @param  {...any} inputs - Class names
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @param {string} locale - Locale
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Format number with commas
 * @param {number} number - Number to format
 * @param {string} locale - Locale
 * @returns {string}
 */
export function formatNumber(number, locale = 'en-US') {
  return new Intl.NumberFormat(locale).format(number);
}

/**
 * Format percentage
 * @param {number} value - Value to format
 * @param {number} decimals - Decimal places
 * @returns {string}
 */
export function formatPercentage(value, decimals = 2) {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format date
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type
 * @returns {string}
 */
export function formatDate(date, format = 'display') {
  const d = new Date(date);
  const options = {
    display: { year: 'numeric', month: 'short', day: 'numeric' },
    datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    time: { hour: '2-digit', minute: '2-digit' },
    input: { year: 'numeric', month: '2-digit', day: '2-digit' }
  };

  return d.toLocaleDateString('en-US', options[format] || options.display);
}

/**
 * Truncate text
 * @param {string} text - Text to truncate
 * @param {number} length - Max length
 * @returns {string}
 */
export function truncate(text, length = 50) {
  if (!text) return '';
  if (text.length <= length) return text;
  return `${text.substring(0, length)}...`;
}

/**
 * Generate a random ID
 * @param {string} prefix - ID prefix
 * @returns {string}
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function}
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in ms
 * @returns {Function}
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if value is empty
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Get nested object value safely
 * @param {Object} obj - Object to search
 * @param {string} path - Dot notation path
 * @param {*} defaultValue - Default value
 * @returns {*}
 */
export function get(obj, path, defaultValue = undefined) {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined) return defaultValue;
    result = result[key];
  }

  return result === undefined ? defaultValue : result;
}

/**
 * Calculate token cost
 * @param {number} inputTokens - Input tokens
 * @param {number} outputTokens - Output tokens
 * @param {number} inputCostPerK - Input cost per 1K tokens
 * @param {number} outputCostPerK - Output cost per 1K tokens
 * @returns {Object}
 */
export function calculateTokenCost(inputTokens, outputTokens, inputCostPerK, outputCostPerK) {
  const inputCost = (inputTokens / 1000) * inputCostPerK;
  const outputCost = (outputTokens / 1000) * outputCostPerK;
  const totalCost = inputCost + outputCost;

  return { inputCost, outputCost, totalCost };
}

/**
 * Calculate profit margin
 * @param {number} revenue - Revenue
 * @param {number} cost - Cost
 * @returns {number}
 */
export function calculateProfitMargin(revenue, cost) {
  if (revenue === 0) return 0;
  return ((revenue - cost) / revenue) * 100;
}

/**
 * Calculate break-even users
 * @param {number} fixedCosts - Fixed costs
 * @param {number} revenuePerUser - Revenue per user
 * @param {number} variableCostPerUser - Variable cost per user
 * @returns {number}
 */
export function calculateBreakEvenUsers(fixedCosts, revenuePerUser, variableCostPerUser) {
  const margin = revenuePerUser - variableCostPerUser;
  if (margin <= 0) return Infinity;
  return Math.ceil(fixedCosts / margin);
}

/**
 * Download data as file
 * @param {string} data - Data to download
 * @param {string} filename - Filename
 * @param {string} type - MIME type
 */
export function downloadFile(data, filename, type = 'text/csv') {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Local storage helper
 */
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Session storage helper
 */
export const sessionStorage = {
  get: (key, defaultValue = null) => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove: (key) => {
    try {
      window.sessionStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  clear: () => {
    try {
      window.sessionStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
};

export default {
  cn,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
  truncate,
  generateId,
  debounce,
  throttle,
  isEmpty,
  deepClone,
  get,
  calculateTokenCost,
  calculateProfitMargin,
  calculateBreakEvenUsers,
  downloadFile,
  copyToClipboard,
  storage,
  sessionStorage
};
