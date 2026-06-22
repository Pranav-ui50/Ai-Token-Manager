/**
 * useProjectCurrency Hook
 *
 * Custom hook to fetch and manage project currency context.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import projectApi from '../services/api/project.api.js';
import { CURRENCY } from '../utils/constants.js';

/**
 * Hook to fetch and manage project currency
 * @param {string} projectId - Optional project ID (uses URL param if not provided)
 * @returns {Object} { currency, currencySymbol, loading, error, setCurrency }
 */
export function useProjectCurrency(projectId = null) {
  const { id } = useParams();
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const actualProjectId = projectId || id;

  useEffect(() => {
    if (!actualProjectId) {
      setLoading(false);
      return;
    }

    const fetchCurrency = async () => {
      try {
        setLoading(true);
        setError(null);
        const project = await projectApi.getById(actualProjectId);
        const projectCurrency = project?.settings?.currency;

        // Validate currency is supported
        if (projectCurrency && CURRENCY.SUPPORTED.includes(projectCurrency.toUpperCase())) {
          setCurrency(projectCurrency.toUpperCase());
        } else {
          setCurrency(CURRENCY.DEFAULT);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch project currency');
        setCurrency(CURRENCY.DEFAULT); // Default fallback
      } finally {
        setLoading(false);
      }
    };

    fetchCurrency();
  }, [actualProjectId]);

  // Get currency symbol
  const currencySymbol = CURRENCY.SYMBOLS[currency] || CURRENCY.SYMBOLS.USD;

  // Allow manual override of currency
  const updateCurrency = useCallback((newCurrency) => {
    if (newCurrency && CURRENCY.SUPPORTED.includes(newCurrency.toUpperCase())) {
      setCurrency(newCurrency.toUpperCase());
    }
  }, []);

  return {
    currency,
    currencySymbol,
    loading,
    error,
    setCurrency: updateCurrency
  };
}

/**
 * Hook to get currency from feature's project reference
 * @param {Object} feature - Feature object with project reference
 * @returns {Object} { currency, currencySymbol, loading, error }
 */
export function useFeatureCurrency(feature) {
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!feature?.project) {
      setCurrency(CURRENCY.DEFAULT);
      return;
    }

    const projectId = typeof feature.project === 'string'
      ? feature.project
      : feature.project._id;

    const fetchCurrency = async () => {
      try {
        setLoading(true);
        setError(null);
        const project = await projectApi.getById(projectId);
        const projectCurrency = project?.settings?.currency;

        if (projectCurrency && CURRENCY.SUPPORTED.includes(projectCurrency.toUpperCase())) {
          setCurrency(projectCurrency.toUpperCase());
        } else {
          setCurrency(CURRENCY.DEFAULT);
        }
      } catch (err) {
        setError(err.message);
        setCurrency(CURRENCY.DEFAULT);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrency();
  }, [feature?.project]);

  const currencySymbol = CURRENCY.SYMBOLS[currency] || CURRENCY.SYMBOLS.USD;

  return {
    currency,
    currencySymbol,
    loading,
    error
  };
}

export default useProjectCurrency;
