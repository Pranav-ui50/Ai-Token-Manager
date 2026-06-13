/**
 * Platform Statistics Model
 *
 * Dynamic stats for landing page (Active Teams, Costs Saved, etc.).
 * Managed by Super Admin.
 */

import mongoose from 'mongoose';

// Predefined stat keys
const STAT_KEYS = [
  'active_teams',
  'costs_saved',
  'api_calls_tracked',
  'customer_rating',
  'providers_supported',
  'uptime',
  'monthly_users',
  'countries_served'
];

const platformStatSchema = new mongoose.Schema({
  // Unique stat key
  statKey: {
    type: String,
    required: [true, 'Stat key is required'],
    unique: true,
    enum: STAT_KEYS,
    trim: true
  },

  // Display value (e.g., "500+", "$2M+", "4.9/5")
  statValue: {
    type: String,
    required: [true, 'Stat value is required'],
    trim: true,
    maxlength: [50, 'Stat value cannot exceed 50 characters']
  },

  // Display label (e.g., "Active Teams", "Costs Saved")
  statLabel: {
    type: String,
    required: [true, 'Stat label is required'],
    trim: true,
    maxlength: [100, 'Stat label cannot exceed 100 characters']
  },

  // Optional description/tooltip
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },

  // Optional icon (emoji or icon name)
  icon: {
    type: String,
    trim: true,
    maxlength: [10, 'Icon cannot exceed 10 characters']
  },

  // Display order (lower = first)
  displayOrder: {
    type: Number,
    default: 0
  },

  // Active status
  isActive: {
    type: Boolean,
    default: true
  },

  // Last updated by (admin user)
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-defined default stats
const DEFAULT_STATS = [
  { statKey: 'active_teams', statValue: '500+', statLabel: 'Active Teams', displayOrder: 0, icon: '👥' },
  { statKey: 'costs_saved', statValue: '$2M+', statLabel: 'Costs Saved', displayOrder: 1, icon: '💰' },
  { statKey: 'api_calls_tracked', statValue: '15M+', statLabel: 'API Calls Tracked', displayOrder: 2, icon: '📊' },
  { statKey: 'customer_rating', statValue: '4.9/5', statLabel: 'Customer Rating', displayOrder: 3, icon: '⭐' }
];

// Static method to get active stats
platformStatSchema.statics.getActive = function() {
  return this.find({ isActive: true })
    .sort({ displayOrder: 1 });
};

// Static method to get all stats (admin)
platformStatSchema.statics.getAll = function() {
  return this.find()
    .populate('updatedBy', 'firstName lastName email')
    .sort({ displayOrder: 1 });
};

// Static method to initialize default stats
platformStatSchema.statics.initializeDefaults = async function() {
  const existingCount = await this.countDocuments();
  if (existingCount === 0) {
    await this.insertMany(DEFAULT_STATS);
    console.log('Initialized default platform stats');
  }
};

// Static method to update stat value
platformStatSchema.statics.updateValue = async function(statKey, statValue, userId) {
  return this.findOneAndUpdate(
    { statKey },
    {
      statValue,
      updatedBy: userId
    },
    { new: true }
  );
};

// Index for efficient queries
platformStatSchema.index({ isActive: 1, displayOrder: 1 });
platformStatSchema.index({ statKey: 1 }, { unique: true });

const PlatformStat = mongoose.model('PlatformStat', platformStatSchema);

export default PlatformStat;
export { DEFAULT_STATS };