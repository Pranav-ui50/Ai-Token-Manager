/**
 * Currency Utilities
 *
 * Centralized currency formatting and symbol utilities.
 */

import { CURRENCY } from './constants.js';

/**
 * Get currency symbol for a currency code
 * @param {string} currency - Currency code (USD, EUR, GBP, INR, CAD, AUD)
 * @returns {string} Currency symbol
 */
export function getCurrencySymbol(currency = 'USD') {
  if (!currency) return CURRENCY.SYMBOLS.USD;
  return CURRENCY.SYMBOLS[currency.toUpperCase()] || CURRENCY.SYMBOLS.USD;
}

/**
 * Format number using Indian numbering system
 * Indian system: 2,39,678 (lakhs), 1,00,00,000 (crores)
 * @param {number} num - Number to format
 * @returns {string} Formatted number with Indian comma placement
 */
export function formatIndianNumber(num) {
  if (num === null || num === undefined) return '';
  if (num < 0) return '-' + formatIndianNumber(Math.abs(num));

  const numStr = Math.floor(num).toString();

  // For numbers less than 1000, no formatting needed
  if (numStr.length <= 3) {
    return numStr;
  }

  // Get the last 3 digits
  const lastThree = numStr.slice(-3);
  // Get the remaining digits
  const remaining = numStr.slice(0, -3);

  // Format remaining digits with commas every 2 digits (Indian system)
  let formatted = '';
  for (let i = remaining.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 2 === 0) {
      formatted = ',' + formatted;
    }
    formatted = remaining[i] + formatted;
  }

  return formatted + ',' + lastThree;
}

/**
 * Format currency with proper symbol and locale
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted currency string
 */
export function formatCurrencyWithSymbol(amount, currency = 'USD', locale = 'en-US') {
  if (amount === null || amount === undefined) return '';

  // Use Indian numbering system for INR
  if (currency?.toUpperCase() === 'INR') {
    const symbol = getCurrencySymbol('INR');
    const formattedNumber = formatIndianNumber(amount);
    return `${symbol}${formattedNumber}`;
  }

  // Validate currency
  const validCurrency = CURRENCY.SUPPORTED.includes(currency?.toUpperCase())
    ? currency.toUpperCase()
    : 'USD';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: validCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  } catch (error) {
    // Fallback for invalid currency codes
    const symbol = getCurrencySymbol(validCurrency);
    return `${symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Format price per million tokens (for model pricing displays)
 * @param {number} price - Price per million tokens
 * @param {string} currency - Currency code
 * @returns {string} Formatted price string (e.g., "$0.0024/1M")
 */
export function formatPricePerMillion(price, currency = 'USD') {
  if (price === null || price === undefined) return '';
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${price.toFixed(4)}/1M`;
}

/**
 * Get currency label with symbol for form inputs
 * @param {string} baseLabel - Base label text (e.g., "Fixed Cost/Req")
 * @param {string} currency - Currency code
 * @returns {string} Label with currency symbol (e.g., "Fixed Cost/Req ($)")
 */
export function getCurrencyLabel(baseLabel, currency = 'USD') {
  const symbol = getCurrencySymbol(currency);
  return `${baseLabel} (${symbol})`;
}

/**
 * Format a number as a simple currency string (symbol + number)
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Simple formatted string (e.g., "$123.45")
 */
export function formatSimpleCurrency(amount, currency = 'USD', decimals = 2) {
  if (amount === null || amount === undefined) return '';
  const symbol = getCurrencySymbol(currency);

  // Use Indian numbering system for INR
  if (currency?.toUpperCase() === 'INR') {
    const formattedNumber = formatIndianNumber(amount);
    return `${symbol}${formattedNumber}`;
  }

  return `${symbol}${amount.toFixed(decimals)}`;
}

/**
 * Get all supported currencies with their symbols
 * @returns {Array<{code: string, symbol: string, name: string}>}
 */
export function getSupportedCurrencies() {
  return [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }
  ];
}

export default {
  getCurrencySymbol,
  formatIndianNumber,
  formatCurrencyWithSymbol,
  formatPricePerMillion,
  getCurrencyLabel,
  formatSimpleCurrency,
  getSupportedCurrencies
};
