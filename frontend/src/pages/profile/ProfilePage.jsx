/**
 * Profile Page
 *
 * User profile management page.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { apiClient } from '../../services/api';
import { Input, Select, Textarea, Form, FormActions, FormError, FormSuccess, Toggle } from '../../components/forms';
import { showToast } from '../../utils/toasts.jsx';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    timezone: 'UTC',
    language: 'en',
    bio: ''
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    weeklyReports: true,
    twoFactorEnabled: false
  });

  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/users/me');
      if (response.data.success) {
        setProfile({
          firstName: response.data.data.firstName || '',
          lastName: response.data.data.lastName || '',
          email: response.data.data.email || '',
          phone: response.data.data.phone || '',
          timezone: response.data.data.timezone || 'UTC',
          language: response.data.data.language || 'en',
          bio: response.data.data.bio || ''
        });
        setPreferences({
          emailNotifications: response.data.data.preferences?.emailNotifications ?? true,
          pushNotifications: response.data.data.preferences?.pushNotifications ?? true,
          marketingEmails: response.data.data.preferences?.marketingEmails ?? false,
          weeklyReports: response.data.data.preferences?.weeklyReports ?? true,
          twoFactorEnabled: response.data.data.twoFactorEnabled ?? false
        });
      }
    } catch (err) {
      showToast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await apiClient.put('/api/users/me', profile);
      if (response.data.success) {
        showToast.profileUpdated();
        updateUser(response.data.data);
      }
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await apiClient.put('/api/users/me/preferences', preferences);
      if (response.data.success) {
        showToast.settingsSaved();
      }
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    navigate('/settings/security');
  };

  const handleEnable2FA = async () => {
    try {
      const response = await apiClient.post('/api/users/me/2fa/enable');
      if (response.data.success) {
        // Show 2FA setup modal with QR code
        setPreferences({ ...preferences, twoFactorEnabled: true });
        showToast.twoFactorEnabled();
      }
    } catch (err) {
      showToast.error('Failed to enable two-factor authentication');
    }
  };

  const handleDisable2FA = async () => {
    try {
      const response = await apiClient.post('/api/users/me/2fa/disable');
      if (response.data.success) {
        setPreferences({ ...preferences, twoFactorEnabled: false });
        showToast.twoFactorDisabled();
      }
    } catch (err) {
      showToast.error('Failed to disable two-factor authentication');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Account Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your profile and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              {['profile', 'preferences', 'security'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <Form onSubmit={handleProfileSubmit}>
              <div className="flex items-center space-x-6 mb-6">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                    {profile.firstName?.[0]}{profile.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Change Avatar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  required
                />
                <Input
                  label="Last Name"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={profile.email}
                  disabled
                  hint="Email cannot be changed"
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
                <Select
                  label="Timezone"
                  options={[
                    { value: 'UTC', label: 'UTC' },
                    { value: 'America/New_York', label: 'Eastern Time (ET)' },
                    { value: 'America/Chicago', label: 'Central Time (CT)' },
                    { value: 'America/Denver', label: 'Mountain Time (MT)' },
                    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                    { value: 'Europe/London', label: 'London' },
                    { value: 'Europe/Paris', label: 'Paris' },
                    { value: 'Asia/Tokyo', label: 'Tokyo' },
                    { value: 'Asia/Shanghai', label: 'Shanghai' }
                  ]}
                  value={profile.timezone}
                  onChange={(v) => setProfile({ ...profile, timezone: v })}
                />
                <Select
                  label="Language"
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Spanish' },
                    { value: 'fr', label: 'French' },
                    { value: 'de', label: 'German' },
                    { value: 'zh', label: 'Chinese' },
                    { value: 'ja', label: 'Japanese' }
                  ]}
                  value={profile.language}
                  onChange={(v) => setProfile({ ...profile, language: v })}
                />
                <Textarea
                  label="Bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us a bit about yourself..."
                  className="md:col-span-2"
                />
              </div>

              <FormActions submitLabel="Save Changes" isSubmitting={saving} className="mt-6" />
            </Form>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <Form onSubmit={handlePreferencesSubmit}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Notification Preferences
              </h3>

              <div className="space-y-4">
                <Toggle
                  label="Email Notifications"
                  hint="Receive notifications via email"
                  checked={preferences.emailNotifications}
                  onChange={(v) => setPreferences({ ...preferences, emailNotifications: v })}
                />
                <Toggle
                  label="Push Notifications"
                  hint="Receive push notifications in browser"
                  checked={preferences.pushNotifications}
                  onChange={(v) => setPreferences({ ...preferences, pushNotifications: v })}
                />
                <Toggle
                  label="Weekly Reports"
                  hint="Receive weekly usage reports"
                  checked={preferences.weeklyReports}
                  onChange={(v) => setPreferences({ ...preferences, weeklyReports: v })}
                />
                <Toggle
                  label="Marketing Emails"
                  hint="Receive product updates and offers"
                  checked={preferences.marketingEmails}
                  onChange={(v) => setPreferences({ ...preferences, marketingEmails: v })}
                />
              </div>

              <FormActions submitLabel="Save Preferences" isSubmitting={saving} className="mt-6" />
            </Form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Change Password */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Password
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Change your password regularly to keep your account secure.
              </p>
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Change Password
              </button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Two-Factor Authentication
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Add an extra layer of security to your account by enabling two-factor authentication.
              </p>
              {preferences.twoFactorEnabled ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Enabled</span>
                  </div>
                  <button
                    onClick={handleDisable2FA}
                    className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    Disable
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEnable2FA}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Enable Two-Factor Authentication
                </button>
              )}
            </div>

            {/* Active Sessions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Active Sessions
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Manage your active sessions across devices.
              </p>
              <button
                onClick={async () => {
                  try {
                    await apiClient.post('/api/users/me/sessions/logout-all');
                    setSuccess('All other sessions have been logged out');
                  } catch (err) {
                    setError('Failed to logout other sessions');
                  }
                }}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                Logout All Other Sessions
              </button>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4">
                Danger Zone
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                    apiClient.delete('/api/users/me')
                      .then(() => {
                        navigate('/login');
                      })
                      .catch(() => {
                        setError('Failed to delete account');
                      });
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
