/**
 * Settings Page
 *
 * Organization and user settings management.
 * Red & White theme styling.
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import settingsApi from '../../services/api/settings.api.js';
import organizationApi from '../../services/api/organization.api.js';
import Modal from '../../components/common/Modal.jsx';
import { showToast } from '../../utils/toasts.js';

// Get the backend base URL for serving static files
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_URL = API_BASE_URL.replace('/api', '');

const SETTINGS_TABS = [
  { id: 'organization', label: 'Organization', icon: 'building' },
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'danger', label: 'Danger Zone', icon: 'exclamation' }
];

// Character limits for organization form
const ORG_NAME_MAX_LENGTH = 30;
const ORG_DESCRIPTION_MAX_LENGTH = 300;
const ORG_WEBSITE_MAX_LENGTH = 300;

// Character limits for profile form
const FIRST_NAME_MAX_LENGTH = 30;
const LAST_NAME_MAX_LENGTH = 30;
const PHONE_MAX_LENGTH = 15;

// Password validation helper
const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) {
    errors.push('At least 8 characters');
  }
  if (password.length > 50) {
    errors.push('Maximum 50 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('At least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('At least one special character (!@#$%^&*...)');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get password strength
const getPasswordStrength = (password) => {
  if (!password) return { level: 'none', color: 'bg-gray-200' };
  const { errors } = validatePassword(password);
  const score = 6 - errors.length;
  if (score <= 2) return { level: 'Weak', color: 'bg-red-500' };
  if (score <= 4) return { level: 'Medium', color: 'bg-yellow-500' };
  if (score === 5) return { level: 'Strong', color: 'bg-green-500' };
  return { level: 'Very Strong', color: 'bg-green-600' };
};

function SettingsPage() {
  const { user, setUser } = useAuth();
  const { currentOrganization, getOrganization, setCurrentOrganization } = useOrganization();
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

  // Security settings
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Delete organization modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Handle avatar upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showToast.error('Please select a valid image file (JPG, PNG, or GIF)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast.error('Image size must be less than 2MB');
      return;
    }

    setAvatarUploading(true);
    try {
      const result = await settingsApi.uploadAvatar(file);
      // Update user in auth context
      if (result && result.url && setUser) {
        setUser({ ...user, avatar: result.url });
      }
      showToast.success('Avatar updated successfully');
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

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

  const handleOrgSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const organizationId = currentOrganization._id || currentOrganization.id;

      // Track what fields were originally loaded vs what they are now
      // to properly handle clearing vs not modifying
      const originalData = {
        name: currentOrganization.name || '',
        description: currentOrganization.description || '',
        website: currentOrganization.website || '',
        industry: currentOrganization.industry || ''
      };

      // Prepare data - always send name (required), send other fields only if changed
      const dataToSend = {};

      // Name is required - always send it (trimmed)
      const trimmedName = orgForm.name?.trim() || '';
      dataToSend.name = trimmedName;

      // Optional fields - send only if changed (including cleared)
      const trimmedDescription = orgForm.description?.trim() || '';
      const trimmedWebsite = orgForm.website?.trim() || '';
      const trimmedIndustry = orgForm.industry?.trim() || '';

      if (trimmedDescription !== originalData.description) {
        dataToSend.description = trimmedDescription;
      }
      if (trimmedWebsite !== originalData.website) {
        dataToSend.website = trimmedWebsite;
      }
      if (trimmedIndustry !== originalData.industry) {
        dataToSend.industry = trimmedIndustry;
      }

      // Update organization settings via API
      const updatedOrganization = await settingsApi.updateOrganizationSettings(organizationId, dataToSend);

      // Update the context with the updated organization data
      if (updatedOrganization && setCurrentOrganization) {
        setCurrentOrganization(updatedOrganization);
      } else if (getOrganization) {
        // Fallback: fetch fresh organization data
        await getOrganization(organizationId);
      }

      showToast.settingsSaved();
    } catch (err) {
      console.error('Organization settings error:', err);
      const errorData = err?.response?.data;
      let errorMessage = 'Failed to update organization settings';

      // Handle validation errors with specific field messages
      if (errorData?.error?.details && Array.isArray(errorData.error.details)) {
        const fieldErrors = errorData.error.details.map(d => `${d.field}: ${d.message}`).join(', ');
        errorMessage = fieldErrors || errorData.error?.message || errorMessage;
      } else if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }

      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Only send fields that can be updated (exclude email)
      const { firstName, lastName, phone } = profileForm;
      const response = await settingsApi.updateProfile({ firstName, lastName, phone });

      // Update user in auth context
      if (response && setUser) {
        const updatedUser = response.data || response;
        setUser({ ...user, ...updatedUser });
      }
      showToast.profileUpdated();
    } catch (err) {
      // Handle validation errors with detailed messages
      const errorData = err.response?.data;
      let errorMessage = 'Failed to update profile';

      if (errorData?.error?.details && Array.isArray(errorData.error.details)) {
        // Format validation errors
        const details = errorData.error.details.map(d => `${d.field}: ${d.message}`).join(', ');
        errorMessage = details || errorData.error?.message || errorMessage;
      } else if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }

      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast.error('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    // Validate password strength
    const { isValid, errors } = validatePassword(passwordForm.newPassword);
    if (!isValid) {
      showToast.error(`Password requirements: ${errors.join(', ')}`);
      setIsSubmitting(false);
      return;
    }

    // Validate current password is provided
    if (!passwordForm.currentPassword) {
      showToast.error('Current password is required');
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
                  Organization Name<span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value.slice(0, ORG_NAME_MAX_LENGTH) })}
                  maxLength={ORG_NAME_MAX_LENGTH}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  placeholder="Enter organization name"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">Required</span>
                  <span className={`text-xs ${orgForm.name.length > ORG_NAME_MAX_LENGTH * 0.9 ? 'text-orange-500' : 'text-gray-400'}`}>
                    {orgForm.name.length}/{ORG_NAME_MAX_LENGTH}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={orgForm.description}
                  onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value.slice(0, ORG_DESCRIPTION_MAX_LENGTH) })}
                  maxLength={ORG_DESCRIPTION_MAX_LENGTH}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent resize-none"
                  placeholder="Brief description of your organization"
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${orgForm.description.length > ORG_DESCRIPTION_MAX_LENGTH * 0.9 ? 'text-orange-500' : 'text-gray-400'}`}>
                    {orgForm.description.length}/{ORG_DESCRIPTION_MAX_LENGTH}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={orgForm.website}
                    onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value.slice(0, ORG_WEBSITE_MAX_LENGTH) })}
                    maxLength={ORG_WEBSITE_MAX_LENGTH}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="https://example.com"
                  />
                  <div className="flex justify-end mt-1">
                    <span className={`text-xs ${orgForm.website.length > ORG_WEBSITE_MAX_LENGTH * 0.9 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {orgForm.website.length}/{ORG_WEBSITE_MAX_LENGTH}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <select
                    value={orgForm.industry}
                    onChange={(e) => setOrgForm({ ...orgForm, industry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
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
              <div className="w-20 h-20 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar.startsWith('http') ? user.avatar : `${BACKEND_URL}${user.avatar}`}
                    alt={`${user.firstName}'s avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {avatarUploading ? 'Uploading...' : 'Change Avatar'}
                </button>
                <p className="text-xs text-gray-500 mt-1">JPG, GIF or PNG. Max 2MB</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value.slice(0, FIRST_NAME_MAX_LENGTH) })}
                    maxLength={FIRST_NAME_MAX_LENGTH}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="Enter first name"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">Required</span>
                    <span className={`text-xs ${profileForm.firstName.length > FIRST_NAME_MAX_LENGTH * 0.9 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {profileForm.firstName.length}/{FIRST_NAME_MAX_LENGTH}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value.slice(0, LAST_NAME_MAX_LENGTH) })}
                    maxLength={LAST_NAME_MAX_LENGTH}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="Enter last name"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">Required</span>
                    <span className={`text-xs ${profileForm.lastName.length > LAST_NAME_MAX_LENGTH * 0.9 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {profileForm.lastName.length}/{LAST_NAME_MAX_LENGTH}
                    </span>
                  </div>
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
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value.replace(/\D/g, '').slice(0, PHONE_MAX_LENGTH) })}
                    maxLength={PHONE_MAX_LENGTH}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                  <div className="flex justify-end mt-1">
                    <span className={`text-xs ${profileForm.phone.length > PHONE_MAX_LENGTH * 0.9 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {profileForm.phone.length}/{PHONE_MAX_LENGTH}
                    </span>
                  </div>
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
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value.slice(0, 50) })}
                    maxLength={50}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
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
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value.slice(0, 50) })}
                    maxLength={50}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="Enter new password"
                    required
                  />
                  <div className="flex justify-end mt-1">
                    <span className={`text-xs ${passwordForm.newPassword.length > 45 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {passwordForm.newPassword.length}/50
                    </span>
                  </div>
                  {/* Password strength indicator */}
                  {passwordForm.newPassword && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-500">Strength:</span>
                        <span className={`text-xs font-medium ${getPasswordStrength(passwordForm.newPassword).color.replace('bg-', 'text-')}`}>
                          {getPasswordStrength(passwordForm.newPassword).level}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getPasswordStrength(passwordForm.newPassword).color} transition-all duration-300`}
                          style={{ width: `${Math.min(100, (6 - validatePassword(passwordForm.newPassword).errors.length) * 20)}%` }}
                        />
                      </div>
                      {/* Password requirements */}
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-gray-500 mb-1">Password must contain:</p>
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            { test: (p) => p.length >= 8, label: '8+ characters' },
                            { test: (p) => p.length <= 50, label: 'Max 50 chars' },
                            { test: (p) => /[A-Z]/.test(p), label: 'Uppercase letter' },
                            { test: (p) => /[a-z]/.test(p), label: 'Lowercase letter' },
                            { test: (p) => /[0-9]/.test(p), label: 'Number' },
                            { test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p), label: 'Special char' }
                          ].map((req, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <svg
                                className={`w-3 h-3 ${req.test(passwordForm.newPassword) ? 'text-green-500' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className={`text-xs ${req.test(passwordForm.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value.slice(0, 50) })}
                    maxLength={50}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                    placeholder="Confirm new password"
                    required
                  />
                  {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
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
    </div>
  );
}

export default SettingsPage;