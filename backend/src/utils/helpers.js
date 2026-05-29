/**
 * Utility Helpers
 *
 * Common utility functions used throughout the application.
 */

/**
 * Generate a random string
 * @param {number} length - Length of the string
 * @returns {string}
 */
export const generateRandomString = (length = 32) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @param {string} locale - Locale (default: en-US)
 * @returns {string}
 */
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Format number with commas
 * @param {number} number - Number to format
 * @param {string} locale - Locale (default: en-US)
 * @returns {string}
 */
export const formatNumber = (number, locale = 'en-US') => {
  return new Intl.NumberFormat(locale).format(number);
};

/**
 * Format percentage
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string}
 */
export const formatPercentage = (value, decimals = 2) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Calculate pagination metadata
 * @param {number} total - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object}
 */
export const calculatePagination = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    itemsPerPage: limit,
    totalItems: total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

/**
 * Remove undefined and null values from an object
 * @param {Object} obj - Object to clean
 * @returns {Object}
 */
export const removeNullish = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== null && value !== undefined)
  );
};

/**
 * Pick specific keys from an object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to pick
 * @returns {Object}
 */
export const pick = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (obj.hasOwnProperty(key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
};

/**
 * Omit specific keys from an object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to omit
 * @returns {Object}
 */
export const omit = (obj, keys) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key))
  );
};

/**
 * Convert string to slug
 * @param {string} text - Text to convert
 * @returns {string}
 */
export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Check if a value is a valid MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean}
 */
export const isValidObjectId = (id) => {
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(id);
};

/**
 * Delay execution
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise}
 */
export const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object}
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Calculate token cost
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @param {number} inputCostPerK - Cost per 1K input tokens
 * @param {number} outputCostPerK - Cost per 1K output tokens
 * @returns {Object}
 */
export const calculateTokenCost = (
  inputTokens,
  outputTokens,
  inputCostPerK,
  outputCostPerK
) => {
  const inputCost = (inputTokens / 1000) * inputCostPerK;
  const outputCost = (outputTokens / 1000) * outputCostPerK;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost
  };
};

/**
 * Calculate profit margin
 * @param {number} revenue - Revenue amount
 * @param {number} cost - Cost amount
 * @returns {number}
 */
export const calculateProfitMargin = (revenue, cost) => {
  if (revenue === 0) return 0;
  return ((revenue - cost) / revenue) * 100;
};

/**
 * Calculate break-even users
 * @param {number} fixedCosts - Fixed costs
 * @param {number} revenuePerUser - Revenue per user
 * @param {number} variableCostPerUser - Variable cost per user
 * @returns {number}
 */
export const calculateBreakEvenUsers = (
  fixedCosts,
  revenuePerUser,
  variableCostPerUser
) => {
  const margin = revenuePerUser - variableCostPerUser;
  if (margin <= 0) return Infinity;
  return Math.ceil(fixedCosts / margin);
};

export default {
  generateRandomString,
  formatCurrency,
  formatNumber,
  formatPercentage,
  calculatePagination,
  removeNullish,
  pick,
  omit,
  slugify,
  isValidObjectId,
  delay,
  deepClone,
  calculateTokenCost,
  calculateProfitMargin,
  calculateBreakEvenUsers
};