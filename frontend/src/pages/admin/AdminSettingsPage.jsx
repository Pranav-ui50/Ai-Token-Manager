/**
 * Admin Settings Page
 *
 * Super admin page for system-wide settings and configuration.
 */

import { useState, useEffect } from 'react';
import adminApi from '../../services/api/admin.api.js';

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: 'cog' },
  { id: 'features', label: 'Features', icon: 'sparkles' },
  { id: 'limits', label: 'Limits', icon: 'chart-bar' },
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'security', label: 'Security', icon: 'shield' }
];

function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'API Token Manager',
    siteDescription: 'AI API Token Cost Management Platform',
    defaultCurrency: 'USD',
    defaultTimezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    maintenanceMode: false
  });

  // Feature flags
  const [featureSettings, setFeatureSettings] = useState({
    enableRegistration: true,
    enableOrganizations: true,
    enableProjects: true,
    enableFeatures: true,
    enableAnalytics: true,
    enableBilling: true,
    enableApiKeys: true,
    enableWebhooks: true,
    enableIntegrations: true,
    enableReports: true,
    enableSimulations: true,
    enableTwoFactor: true
  });

  // Rate limits
  const [limitSettings, setLimitSettings] = useState({
    maxOrganizations: 10,
    maxProjectsPerOrganization: 50,
    maxFeaturesPerProject: 100,
    maxApiKeysPerOrganization: 20,
    maxWebhooksPerOrganization: 10,
    maxTeamMembersPerOrganization: 50,
    apiRateLimitPerMinute: 60,
    apiRateLimitPerHour: 1000,
    maxRequestsPerMonth: 1000000
  });

  // Email settings
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: 'noreply@example.com',
    fromName: 'API Token Manager',
    enableEmailVerification: true,
    enablePasswordReset: true,
    enableNotifications: true
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    requireEmailVerification: true,
    requireTwoFactor: false,
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    enableAuditLogs: true,
    enableIpWhitelist: false
  });

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        // In a real app, these would come from the backend
        // For now, we'll use default values
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError('Failed to load settings');
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Save settings
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // In a real app, this would save to the backend
      // For now, we'll simulate a save
      await new Promise(resolve => setTimeout(resolve, 500));

      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Clear messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DC2626]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-sm text-gray-500">Configure system-wide settings and preferences</p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#DC2626] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {tab.icon === 'cog' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  )}
                  {tab.icon === 'sparkles' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.728 2.728a2 2 0 010 2.828L14 10m-4 4l-2.728-2.728a2 2 0 00-2.828 0L4 14m16-4l-2.728 2.728a2 2 0 010 2.828L20 14" />
                  )}
                  {tab.icon === 'chart-bar' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  )}
                  {tab.icon === 'mail' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  )}
                  {tab.icon === 'shield' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-2.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  )}
                </svg>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
                  <input
                    type="text"
                    value={generalSettings.siteName}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, siteName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                  <select
                    value={generalSettings.defaultCurrency}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, defaultCurrency: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Timezone</label>
                  <select
                    value={generalSettings.defaultTimezone}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, defaultTimezone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                    <option value="Asia/Kolkata">Kolkata</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                  <select
                    value={generalSettings.dateFormat}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site Description</label>
                  <textarea
                    value={generalSettings.siteDescription}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={generalSettings.maintenanceMode}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-700">Enable Maintenance Mode</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500">When enabled, only administrators can access the system.</p>
                </div>
              </div>
            </div>
          )}

          {/* Feature Flags */}
          {activeTab === 'features' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Feature Flags</h2>
              <p className="text-sm text-gray-500">Enable or disable features across all organizations.</p>

              <div className="space-y-4">
                {Object.entries(featureSettings).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <div>
                      <span className="font-medium text-gray-900">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {key === 'enableRegistration' && 'Allow new user registration'}
                        {key === 'enableOrganizations' && 'Allow organization creation'}
                        {key === 'enableProjects' && 'Enable project management'}
                        {key === 'enableFeatures' && 'Enable feature configuration'}
                        {key === 'enableAnalytics' && 'Enable analytics dashboard'}
                        {key === 'enableBilling' && 'Enable billing and payments'}
                        {key === 'enableApiKeys' && 'Enable API key management'}
                        {key === 'enableWebhooks' && 'Enable webhook configuration'}
                        {key === 'enableIntegrations' && 'Enable third-party integrations'}
                        {key === 'enableReports' && 'Enable report generation'}
                        {key === 'enableSimulations' && 'Enable cost simulations'}
                        {key === 'enableTwoFactor' && 'Enable two-factor authentication'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setFeatureSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] w-5 h-5"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Rate Limits */}
          {activeTab === 'limits' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Rate Limits & Quotas</h2>
              <p className="text-sm text-gray-500">Configure default limits for organizations.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Organizations per User</label>
                  <input
                    type="number"
                    value={limitSettings.maxOrganizations}
                    onChange={(e) => setLimitSettings(prev => ({ ...prev, maxOrganizations: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Projects per Organization</label>
                  <input
                    type="number"
                    value={limitSettings.maxProjectsPerOrganization}
                    onChange={(e) => setLimitSettings(prev => ({ ...prev, maxProjectsPerOrganization: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Features per Project</label>
                  <input
                    type="number"
                    value={limitSettings.maxFeaturesPerProject}
                    onChange={(e) => setLimitSettings(prev => ({ ...prev, maxFeaturesPerProject: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max API Keys per Organization</label>
                  <input
                    type="number"
                    value={limitSettings.maxApiKeysPerOrganization}
                    onChange={(e) => setLimitSettings(prev => ({ ...prev, maxApiKeysPerOrganization: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Webhooks per Organization</label>
                  <input
                    type="number"
                    value={limitSettings.maxWebhooksPerOrganization}
                    onChange={(e) => setLimitSettings(prev => ({ ...prev, maxWebhooksPerOrganization: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Team Members per Organization</label>
                  <input
                    type="number"
                    value={limitSettings.maxTeamMembersPerOrganization}
                    onChange={(e) => setLimitSettings(prev => ({ ...prev, maxTeamMembersPerOrganization: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Rate Limit (per minute)</label>
                  <input
                    type="number"
                    value={limitSettings.apiRateLimitPerMinute}
                    onChange={(e) => setLimitSettings(prev => ({ ...prev, apiRateLimitPerMinute: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Rate Limit (per hour)</label>
                  <input
                    type="number"
                    value={limitSettings.apiRateLimitPerHour}
                    onChange={(e) => setLimitSettings(prev => ({ ...prev, apiRateLimitPerHour: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Requests per Month</label>
                  <input
                    type="number"
                    value={limitSettings.maxRequestsPerMonth}
                    onChange={(e) => setLimitSettings(prev => ({ ...prev, maxRequestsPerMonth: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeTab === 'email' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Email Settings</h2>
              <p className="text-sm text-gray-500">Configure SMTP settings for outgoing emails.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={emailSettings.smtpHost}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="smtp.example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                  <input
                    type="number"
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username</label>
                  <input
                    type="text"
                    value={emailSettings.smtpUser}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpUser: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
                  <input
                    type="password"
                    value={emailSettings.smtpPassword}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPassword: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                  <input
                    type="email"
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="noreply@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                  <input
                    type="text"
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, fromName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={emailSettings.enableEmailVerification}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, enableEmailVerification: e.target.checked }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-700">Enable Email Verification</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={emailSettings.enablePasswordReset}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, enablePasswordReset: e.target.checked }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-700">Enable Password Reset Emails</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={emailSettings.enableNotifications}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, enableNotifications: e.target.checked }))}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    <span className="text-sm text-gray-700">Enable Notification Emails</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
              <p className="text-sm text-gray-500">Configure security and authentication settings.</p>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">Require Email Verification</span>
                    <p className="text-xs text-gray-500 mt-1">Users must verify email before accessing the system</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={securitySettings.requireEmailVerification}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, requireEmailVerification: e.target.checked }))}
                    className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] w-5 h-5"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">Require Two-Factor Authentication</span>
                    <p className="text-xs text-gray-500 mt-1">Users must enable 2FA for their accounts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={securitySettings.requireTwoFactor}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, requireTwoFactor: e.target.checked }))}
                    className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] w-5 h-5"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">Enable Audit Logs</span>
                    <p className="text-xs text-gray-500 mt-1">Track all system activities for security auditing</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={securitySettings.enableAuditLogs}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, enableAuditLogs: e.target.checked }))}
                    className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] w-5 h-5"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">Enable IP Whitelist</span>
                    <p className="text-xs text-gray-500 mt-1">Restrict admin access to specific IP addresses</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={securitySettings.enableIpWhitelist}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, enableIpWhitelist: e.target.checked }))}
                    className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626] w-5 h-5"
                  />
                </label>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Password Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Password Length</label>
                    <input
                      type="number"
                      value={securitySettings.passwordMinLength}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordMinLength: parseInt(e.target.value) || 8 }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                      min="6"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 60 }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Login Attempts</label>
                    <input
                      type="number"
                      value={securitySettings.maxLoginAttempts}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) || 5 }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={securitySettings.passwordRequireUppercase}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordRequireUppercase: e.target.checked }))}
                        className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                      />
                      <span className="text-sm text-gray-700">Require Uppercase</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={securitySettings.passwordRequireLowercase}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordRequireLowercase: e.target.checked }))}
                        className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                      />
                      <span className="text-sm text-gray-700">Require Lowercase</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={securitySettings.passwordRequireNumbers}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordRequireNumbers: e.target.checked }))}
                        className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                      />
                      <span className="text-sm text-gray-700">Require Numbers</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={securitySettings.passwordRequireSpecialChars}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordRequireSpecialChars: e.target.checked }))}
                        className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                      />
                      <span className="text-sm text-gray-700">Require Special Characters</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminSettingsPage;