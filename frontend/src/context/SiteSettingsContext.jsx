/**
 * Site Settings Context
 *
 * Global context for site-wide settings like Site Name and Description.
 * Used to display dynamic branding in sidebar and other components.
 * Uses localStorage for persistence until backend is deployed.
 */

import { createContext, useContext, useState, useEffect } from 'react';

const SiteSettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  siteName: 'API Token Manager',
  siteDescription: 'AI API Token Cost Management Platform'
};

// Local storage key for persistence
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
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    // Settings are already loaded from localStorage in useState initializer
    // No need to fetch from backend since the endpoint may not exist yet
  }, []);

  const updateSettings = async (newSettings) => {
    // Update local state and persist to localStorage
    setSettings(prev => {
      const updated = {
        ...prev,
        ...newSettings
      };
      // Persist to localStorage
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    return true;
  };

  const value = {
    settings,
    isLoading,
    updateSettings,
    refreshSettings: () => {
      // Reload from localStorage
      try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings({
            siteName: parsed.siteName || DEFAULT_SETTINGS.siteName,
            siteDescription: parsed.siteDescription || DEFAULT_SETTINGS.siteDescription
          });
        }
      } catch (e) {
        console.error('Failed to reload settings:', e);
      }
    }
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