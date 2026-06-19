/**
 * Plans Context
 *
 * Centralized state management for pricing plans.
 * Ensures all pages show the same data from the database.
 * Changes made by Super Admin are reflected after refresh.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import publicApi from '../services/api/public.api.js';

const PlansContext = createContext(null);

export const PLANS_REFRESH_EVENT = 'plans-refresh';

export function PlansProvider({ children }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await publicApi.getPlans();

      if (response.success && response.data && response.data.length > 0) {
        setPlans(response.data);
        setError(null);
      } else {
        // No plans found in database
        setPlans([]);
        setError('No plans available. Please contact administrator.');
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setPlans([]);
      setError(err.response?.data?.error?.message || 'Failed to load plans. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Listen for refresh events (e.g., after admin updates plans)
  useEffect(() => {
    const handleRefresh = () => {
      fetchPlans();
    };

    window.addEventListener(PLANS_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(PLANS_REFRESH_EVENT, handleRefresh);
  }, [fetchPlans]);

  // Get plan by ID or slug
  const getPlan = useCallback((idOrSlug) => {
    return plans.find(
      p => p.id === idOrSlug || p._id === idOrSlug || p.slug === idOrSlug || p.tier === idOrSlug
    );
  }, [plans]);

  // Get plans by tier
  const getPlansByTier = useCallback((tier) => {
    return plans.filter(p => p.tier === tier);
  }, [plans]);

  // Get public plans (excluding enterprise)
  const getPublicPlans = useCallback(() => {
    return plans.filter(p => p.tier !== 'enterprise' && p.tier !== 'free');
  }, [plans]);

  // Refresh plans manually
  const refreshPlans = useCallback(() => {
    return fetchPlans();
  }, [fetchPlans]);

  const value = {
    plans,
    loading,
    error,
    getPlan,
    getPlansByTier,
    getPublicPlans,
    refreshPlans
  };

  return (
    <PlansContext.Provider value={value}>
      {children}
    </PlansContext.Provider>
  );
}

/**
 * Custom hook to use plans context
 * @returns {Object} Plans context value
 */
export function usePlans() {
  const context = useContext(PlansContext);
  if (!context) {
    throw new Error('usePlans must be used within a PlansProvider');
  }
  return context;
}

/**
 * Hook to dispatch a plans refresh event
 * Call this after admin updates plans to refresh all pages
 */
export function useRefreshPlans() {
  return useCallback(() => {
    window.dispatchEvent(new CustomEvent(PLANS_REFRESH_EVENT));
  }, []);
}

export default PlansContext;