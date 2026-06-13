/**
 * Settings Page
 *
 * Organization and user settings management.
 * Red & White theme styling.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import settingsApi from '../../services/api/settings.api.js';
import organizationApi from '../../services/api/organization.api.js';
import Modal from '../../components/common/Modal.jsx';
import { showToast } from '../../utils/toasts.js';

const SETTINGS_TABS = [
  { id: 'organization', label: 'Organization', icon: 'building' },
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'danger', label: 'Danger Zone', icon: 'exclamation' }
];

function SettingsPage() {
  const { user } = useAuth();
  const { currentOrganization, updateOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState('organization');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Organization settings form
  const [orgForm, setOrgForm] = useState({
    name: '',
    description: '',
    website: '',
    industry: ''
  });

  // Profile form
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    weeklyReport: true,
    billingAlerts: true,
    memberInvites: true,
    securityAlerts: true
  });

  // Security settings
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorToken, setTwoFactorToken] = useState('');

  // Delete organization modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Load initial data
  useEffect(() => {
    if (currentOrganization) {
      setOrgForm({
        name: currentOrganization.name || '',
        description: currentOrganization.description || '',
        website: currentOrganization.website || '',
        industry: currentOrganization.industry || ''
      });
    }
  }, [currentOrganization]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  // Load notification and 2FA settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [notifSettings, twoFactorStatus] = await Promise.all([
          settingsApi.getNotificationSettings(),
          settingsApi.getTwoFactorStatus()
        ]);
        setNotificationSettings(notifSettings);
        setTwoFactorEnabled(twoFactorStatus.enabled);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadSettings();
  }, []);

  const handleOrgSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await settingsApi.updateOrganizationSettings(currentOrganization._id || currentOrganization.id, orgForm);
      showToast.settingsSaved();
      if (updateOrganization) {
        await updateOrganization();
      }
    } catch (err) {
      console.error('Organization settings error:', err);
      const errorMessage = err?.response?.data?.error?.message
        || err?.response?.data?.message
        || (err?.response?.data?.error?.details?.[0]?.message)
        || 'Failed to update organization settings';
      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await settingsApi.updateProfile(profileForm);
      showToast.profileUpdated();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast.error('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    try {
      await settingsApi.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );
      showToast.passwordChanged();
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (deleteConfirmation !== currentOrganization?.name) {
      showToast.error('Please type the organization name correctly');
      return;
    }

    setIsSubmitting(true);
    try {
      await organizationApi.delete(currentOrganization._id || currentOrganization.id);
      setShowDeleteModal(false);
      showToast.organizationDeleted();
      // Redirect to organizations list
      window.location.href = '/organizations';
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to delete organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTabIcon = (icon) => {
    switch (icon) {
      case 'building':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'user':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'bell':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
      case 'shield':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'exclamation':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'organization':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Organization Profile</h3>
              <p className="text-sm text-gray-500">Manage your organization's basic information</p>
            </div>

            <form onSubmit={handleOrgSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
                  placeholder="Enter organization name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={orgForm.description}
                  onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent resize-none"
                  placeholder="Brief description of your organization"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={orgForm.website}
                    onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <select
                    value={orgForm.industry}
                    onChange={(e) => setOrgForm({ ...orgForm, industry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
                  >
                    <option value="">Select industry</option>
                    <option value="technology">Technology</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="finance">Finance</option>
                    <option value="education">Education</option>
                    <option value="retail">Retail</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Profile Settings</h3>
              <p className="text-sm text-gray-500">Manage your personal information</p>
            </div>

            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">
                  {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <button className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                  Change Avatar
                </button>
                <p className="text-xs text-gray-500 mt-1">JPG, GIF or PNG. Max 2MB</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email ID
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    maxLength={10}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
                    placeholder="Enter 10-digit number"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter 10 digits (numbers only)</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
              <p className="text-sm text-gray-500">Choose how you want to be notified</p>
            </div>

            <div className="space-y-4">
              {[
                { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                { key: 'pushNotifications', label: 'Push Notifications', description: 'Receive push notifications in browser' },
                { key: 'weeklyReport', label: 'Weekly Reports', description: 'Receive weekly activity reports' },
                { key: 'billingAlerts', label: 'Billing Alerts', description: 'Get notified about billing events' },
                { key: 'memberInvites', label: 'Member Invites', description: 'Get notified when new members join' },
                { key: 'securityAlerts', label: 'Security Alerts', description: 'Get notified about security events' }
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{setting.label}</p>
                    <p className="text-sm text-gray-500">{setting.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings[setting.key]}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        [setting.key]: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#DC2626]"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    await settingsApi.updateNotificationSettings(notificationSettings);
                    setSuccess('Notification preferences updated');
                  } catch (err) {
                    setError(err.response?.data?.message || 'Failed to update notification settings');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
              <p className="text-sm text-gray-500">Manage your account security</p>
            </div>

            {/* Change Password */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h4 className="font-medium text-gray-900 mb-4">Change Password</h4>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <button
                  onClick={async () => {
                    if (twoFactorEnabled) {
                      // Disable 2FA
                      const password = prompt('Enter your password to disable 2FA:');
                      if (password) {
                        try {
                          await settingsApi.disableTwoFactor(password);
                          setTwoFactorEnabled(false);
                          setSuccess('Two-factor authentication disabled');
                        } catch (err) {
                          setError(err.response?.data?.message || 'Failed to disable 2FA');
                        }
                      }
                    } else {
                      // Setup 2FA
                      try {
                        const setup = await settingsApi.setupTwoFactor();
                        setTwoFactorSetup(setup);
                        setShowTwoFactorModal(true);
                      } catch (err) {
                        setError(err.response?.data?.message || 'Failed to setup 2FA');
                      }
                    }
                  }}
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    twoFactorEnabled
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                  }`}
                >
                  {twoFactorEnabled ? 'Enabled' : 'Enable 2FA'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'danger':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-red-600">Danger Zone</h3>
              <p className="text-sm text-gray-500">Irreversible and destructive actions</p>
            </div>

            {/* Leave Organization */}
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Leave Organization</h4>
                  <p className="text-sm text-gray-500">Leave this organization. You will lose access to all resources.</p>
                </div>
                <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
                  Leave
                </button>
              </div>
            </div>

            {/* Delete Organization */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-red-700">Delete Organization</h4>
                  <p className="text-sm text-red-600">Permanently delete this organization and all associated data. This action cannot be undone.</p>
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Organization
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your organization and account settings</p>
      </div>

      {/* Settings Layout */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex">
          {/* Sidebar Tabs */}
          <div className="w-64 border-r border-gray-100 bg-gray-50">
            <div className="py-4">
              {SETTINGS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-red-50 text-[#DC2626] border-r-2 border-[#DC2626]'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {renderTabIcon(tab.icon)}
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Delete Organization Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmation('');
        }}
        title="Delete Organization"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-medium text-red-800">This action cannot be undone</h4>
                <p className="text-sm text-red-700 mt-1">
                  This will permanently delete your organization, including all members, API keys, and usage data.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-bold">{currentOrganization?.name || 'organization name'}</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              placeholder="Enter organization name"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmation('');
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteOrganization}
              disabled={isSubmitting || deleteConfirmation !== currentOrganization?.name}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Organization'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 2FA Modal */}
      <Modal
        isOpen={showTwoFactorModal}
        onClose={() => {
          setShowTwoFactorModal(false);
          setTwoFactorSetup(null);
          setTwoFactorToken('');
        }}
        title="Enable Two-Factor Authentication"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Two-factor authentication adds an extra layer of security to your account by requiring a code from your authenticator app when you sign in.
          </p>

          {twoFactorSetup ? (
            <>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-lg mx-auto flex items-center justify-center overflow-hidden">
                  {twoFactorSetup.qrCodeUrl ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(twoFactorSetup.qrCodeUrl)}`}
                      alt="2FA QR Code"
                      className="w-full h-full"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">QR Code</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Scan with your authenticator app</p>
                {twoFactorSetup.manualEntryKey && (
                  <p className="text-xs text-gray-600 mt-2">
                    Manual entry key: <code className="bg-gray-200 px-1 rounded">{twoFactorSetup.manualEntryKey}</code>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter verification code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent text-center text-2xl tracking-widest"
                  placeholder="000000"
                />
              </div>
            </>
          ) : (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC2626]"></div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                setShowTwoFactorModal(false);
                setTwoFactorSetup(null);
                setTwoFactorToken('');
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!twoFactorToken || twoFactorToken.length !== 6) {
                  setError('Please enter a valid 6-digit code');
                  return;
                }
                setIsSubmitting(true);
                try {
                  const result = await settingsApi.verifyTwoFactor(twoFactorToken, twoFactorSetup.secret);
                  setTwoFactorEnabled(true);
                  setShowTwoFactorModal(false);
                  setTwoFactorSetup(null);
                  setTwoFactorToken('');
                  setSuccess('Two-factor authentication enabled successfully');
                  if (result.backupCodes) {
                    alert(`Save these backup codes: ${result.backupCodes.join(', ')}`);
                  }
                } catch (err) {
                  setError(err.response?.data?.message || 'Invalid verification code');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting || !twoFactorSetup || twoFactorToken.length !== 6}
              className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Enable 2FA'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default SettingsPage;