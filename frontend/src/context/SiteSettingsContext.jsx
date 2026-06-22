/**
 * Site Settings Context
 *
 * Global context for site-wide settings like Site Name and Description.
 * Used to display dynamic branding in sidebar, headers, and other components.
 * Fetches settings from backend API and caches in localStorage for performance.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import publicApi from '../services/api/public.api.js';
import adminApi from '../services/api/admin.api.js';

const SiteSettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  siteName: 'API Token Manager',
  siteDescription: 'AI API Token Cost Management Platform'
};

// Local storage key for persistence/caching
const SETTINGS_STORAGE_KEY = 'siteSettings';

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    // Initialize from localStorage first for immediate display
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          siteName: parsed.siteName || DEFAULT_SETTINGS.siteName,
          siteDescription: parsed.siteDescription || DEFAULT_SETTINGS.siteDescription
        };
      }
    } catch (e) {
      console.error('Failed to parse stored settings:', e);
    }
    return DEFAULT_SETTINGS;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const response = await publicApi.getSiteSettings();
        if (response.success && response.data) {
          const newSettings = {
            siteName: response.data.siteName || DEFAULT_SETTINGS.siteName,
            siteDescription: response.data.siteDescription || DEFAULT_SETTINGS.siteDescription
          };
          setSettings(newSettings);
          // Cache to localStorage
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
        }
      } catch (err) {
        console.error('Failed to load site settings from backend:', err);
        // Keep using localStorage cached values on error
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Update settings (admin only - uses admin API)
  const updateSettings = useCallback(async (newSettings) => {
    try {
      // Update via admin API
      const response = await adminApi.updateSettings({
        siteName: newSettings.siteName,
        siteDescription: newSettings.siteDescription
      });

      if (response.success) {
        const updatedSettings = {
          siteName: response.siteName || newSettings.siteName,
          siteDescription: response.siteDescription || newSettings.siteDescription
        };

        // Update local state
        setSettings(updatedSettings);

        // Update localStorage cache
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));

        return true;
      }

      return false;
    } catch (err) {
      console.error('Failed to update site settings:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Refresh settings from backend
  const refreshSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await publicApi.getSiteSettings();
      if (response.success && response.data) {
        const newSettings = {
          siteName: response.data.siteName || DEFAULT_SETTINGS.siteName,
          siteDescription: response.data.siteDescription || DEFAULT_SETTINGS.siteDescription
        };
        setSettings(newSettings);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      }
    } catch (err) {
      console.error('Failed to refresh site settings:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    settings,
    isLoading,
    error,
    updateSettings,
    refreshSettings
  };

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
}

export default SiteSettingsContext;