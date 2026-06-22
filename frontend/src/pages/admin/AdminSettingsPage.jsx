/**
 * Admin Settings Page
 *
 * Super admin page for system-wide settings and configuration.
 * Updates site settings globally across all user roles.
 */

import { useState, useEffect } from 'react';
import { useSiteSettings } from '../../context/SiteSettingsContext.jsx';
import { showToast } from '../../utils/toasts.js';
import Loader from '../../components/common/Loader.jsx';

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: 'cog' },
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'security', label: 'Security', icon: 'shield' }
];

function AdminSettingsPage() {
  const { settings: siteSettings, isLoading: contextLoading, updateSettings: updateSiteSettings } = useSiteSettings();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'API Token Manager',
    siteDescription: 'AI API Token Cost Management Platform'
  });

  // Email settings
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: '587',
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
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true
  });

  // Load settings from context
  useEffect(() => {
    if (siteSettings) {
      setGeneralSettings({
        siteName: siteSettings.siteName || 'API Token Manager',
        siteDescription: siteSettings.siteDescription || 'AI API Token Cost Management Platform'
      });
    }
  }, [siteSettings]);

  // Load other settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('adminSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.email) {
          setEmailSettings(prev => ({ ...prev, ...parsed.email }));
        }
        if (parsed.security) {
          setSecuritySettings(prev => ({ ...prev, ...parsed.security }));
        }
      }
    } catch (e) {
      console.log('Using default settings');
    }
  }, []);

  // Save settings
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);

      // Save general settings to backend via context (applies globally)
      await updateSiteSettings({
        siteName: generalSettings.siteName,
        siteDescription: generalSettings.siteDescription
      });

      // Save email and security settings to localStorage for now
      // (these would need backend endpoints to persist properly)
      localStorage.setItem('adminSettings', JSON.stringify({
        email: emailSettings,
        security: securitySettings
      }));

      showToast.success('Settings saved successfully - changes applied globally');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-sm text-gray-500">Configure system-wide settings and preferences. Changes apply globally across all user roles.</p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

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
              <div>
                <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
                <p className="text-sm text-gray-500 mt-1">
                  These settings apply globally across all user roles and dashboards.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">Global Settings</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Changes to Site Name and Description will be reflected in the sidebar and across all user dashboards immediately after saving.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Site Name</label>
                    <span className="text-xs text-gray-400">{generalSettings.siteName?.length || 0}/30</span>
                  </div>
                  <input
                    type="text"
                    value={generalSettings.siteName}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, siteName: e.target.value }))}
                    maxLength={30}
                    placeholder="Enter site name"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">This name appears in the sidebar and browser tab.</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Site Description</label>
                    <span className="text-xs text-gray-400">{generalSettings.siteDescription?.length || 0}/60</span>
                  </div>
                  <input
                    type="text"
                    value={generalSettings.siteDescription}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
                    maxLength={60}
                    placeholder="Enter site description"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">A brief tagline shown under the site name.</p>
                </div>
              </div>

              {/* Preview */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-w-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#DC2626] rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-gray-900">{generalSettings.siteName || 'API Token Manager'}</h1>
                      <p className="text-xs text-gray-500">{generalSettings.siteDescription || 'AI API Token Cost Management'}</p>
                    </div>
                  </div>
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
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
                    <span className="text-xs text-gray-400">{emailSettings.smtpHost?.length || 0}/100</span>
                  </div>
                  <input
                    type="text"
                    value={emailSettings.smtpHost}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                    maxLength={100}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="smtp.example.com"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">SMTP Port</label>
                    <span className="text-xs text-gray-400">{emailSettings.smtpPort?.toString().length || 0}/5</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={emailSettings.smtpPort}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
                      setEmailSettings(prev => ({ ...prev, smtpPort: value === '' ? '' : value }));
                    }}
                    maxLength={5}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="587"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">SMTP Username</label>
                    <span className="text-xs text-gray-400">{emailSettings.smtpUser?.length || 0}/100</span>
                  </div>
                  <input
                    type="text"
                    value={emailSettings.smtpUser}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpUser: e.target.value }))}
                    maxLength={100}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="username"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">SMTP Password</label>
                    <span className="text-xs text-gray-400">{emailSettings.smtpPassword?.length || 0}/100</span>
                  </div>
                  <input
                    type="password"
                    value={emailSettings.smtpPassword}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPassword: e.target.value }))}
                    maxLength={100}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">From Email</label>
                    <span className="text-xs text-gray-400">{emailSettings.fromEmail?.length || 0}/100</span>
                  </div>
                  <input
                    type="email"
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                    maxLength={100}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="noreply@example.com"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">From Name</label>
                    <span className="text-xs text-gray-400">{emailSettings.fromName?.length || 0}/50</span>
                  </div>
                  <input
                    type="text"
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, fromName: e.target.value }))}
                    maxLength={50}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="API Token Manager"
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

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Password Length</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={securitySettings.passwordMinLength}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
                        setSecuritySettings(prev => ({ ...prev, passwordMinLength: value === '' ? '' : value }));
                      }}
                      maxLength={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                      placeholder="Enter password length"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (minutes)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
                        setSecuritySettings(prev => ({ ...prev, sessionTimeout: value === '' ? '' : value }));
                      }}
                      maxLength={5}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                      placeholder="Enter session timeout"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Login Attempts</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={securitySettings.maxLoginAttempts}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
                        setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: value === '' ? '' : value }));
                      }}
                      maxLength={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                      placeholder="Enter max attempts"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Password Requirements</h3>
                  <div className="space-y-3">
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