/**
 * Setting Model
 *
 * MongoDB model for storing site-wide settings.
 * Uses a singleton pattern - only one document exists.
 */

import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    // Singleton identifier - always 'site'
    _id: {
      type: String,
      default: 'site',
      immutable: true
    },
    // Site branding
    siteName: {
      type: String,
      default: 'API Token Manager',
      maxlength: [30, 'Site name cannot exceed 30 characters']
    },
    siteDescription: {
      type: String,
      default: 'AI API Token Cost Management Platform',
      maxlength: [60, 'Site description cannot exceed 60 characters']
    },
    // Email settings
    email: {
      smtpHost: { type: String, default: '' },
      smtpPort: { type: Number, default: 587 },
      smtpUser: { type: String, default: '' },
      smtpPassword: { type: String, default: '' },
      fromEmail: { type: String, default: 'noreply@example.com' },
      fromName: { type: String, default: 'API Token Manager' },
      enableEmailVerification: { type: Boolean, default: true },
      enablePasswordReset: { type: Boolean, default: true },
      enableNotifications: { type: Boolean, default: true }
    },
    // Security settings
    security: {
      sessionTimeout: { type: Number, default: 60 },
      maxLoginAttempts: { type: Number, default: 5 },
      passwordMinLength: { type: Number, default: 8 },
      passwordRequireUppercase: { type: Boolean, default: true },
      passwordRequireLowercase: { type: Boolean, default: true },
      passwordRequireNumbers: { type: Boolean, default: true },
      passwordRequireSpecialChars: { type: Boolean, default: true }
    },
    // Feature flags
    features: {
      enableRegistration: { type: Boolean, default: true },
      enableOrganizations: { type: Boolean, default: true },
      enableProjects: { type: Boolean, default: true },
      enableFeatures: { type: Boolean, default: true },
      enableAnalytics: { type: Boolean, default: true },
      enableBilling: { type: Boolean, default: true },
      enableApiKeys: { type: Boolean, default: true },
      enableWebhooks: { type: Boolean, default: true },
      enableIntegrations: { type: Boolean, default: true },
      enableReports: { type: Boolean, default: true },
      enableSimulations: { type: Boolean, default: true },
      enableTwoFactor: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Static method to get settings (creates default if not exists)
settingSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ _id: 'site' });
  if (!settings) {
    settings = await this.create({ _id: 'site' });
  }
  return settings;
};

// Static method to update settings
settingSchema.statics.updateSettings = async function(updates) {
  let settings = await this.findOne({ _id: 'site' });
  if (!settings) {
    settings = await this.create({ _id: 'site', ...updates });
  } else {
    // Apply updates
    if (updates.siteName !== undefined) settings.siteName = updates.siteName;
    if (updates.siteDescription !== undefined) settings.siteDescription = updates.siteDescription;
    if (updates.email) {
      settings.email = { ...settings.email.toObject(), ...updates.email };
    }
    if (updates.security) {
      settings.security = { ...settings.security.toObject(), ...updates.security };
    }
    if (updates.features) {
      settings.features = { ...settings.features.toObject(), ...updates.features };
    }
    await settings.save();
  }
  return settings;
};

const Setting = mongoose.model('Setting', settingSchema);

export default Setting;