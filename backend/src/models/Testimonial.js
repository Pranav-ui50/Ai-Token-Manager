/**
 * Testimonial Model
 *
 * Customer testimonials for landing page.
 * Managed by Super Admin.
 */

import mongoose from 'mongoose';

// Preset avatar colors for random assignment
const AVATAR_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
  'bg-rose-500'
];

// Generate initials from name
const generateInitials = (name) => {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

// Generate random avatar color
const generateAvatarColor = () => {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
};

const testimonialSchema = new mongoose.Schema({
  // Testimonial author name
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },

  // Job role/title
  role: {
    type: String,
    required: [true, 'Role is required'],
    trim: true,
    maxlength: [100, 'Role cannot exceed 100 characters']
  },

  // Company name
  company: {
    type: String,
    required: [true, 'Company is required'],
    trim: true,
    maxlength: [100, 'Company cannot exceed 100 characters']
  },

  // Testimonial content
  content: {
    type: String,
    required: [true, 'Testimonial content is required'],
    trim: true,
    maxlength: [500, 'Testimonial cannot exceed 500 characters']
  },

  // Star rating (1.0 to 5.0)
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1.0, 'Rating must be at least 1.0'],
    max: [5.0, 'Rating cannot exceed 5.0'],
    set: v => Math.round(v * 10) / 10 // Round to 1 decimal place
  },

  // Avatar initials (auto-generated from name)
  avatarInitials: {
    type: String,
    maxlength: [3, 'Initials cannot exceed 3 characters']
  },

  // Avatar background color (Tailwind class)
  avatarColor: {
    type: String,
    maxlength: [20, 'Avatar color cannot exceed 20 characters']
  },

  // Active status
  isActive: {
    type: Boolean,
    default: true
  },

  // Display order (lower = first)
  displayOrder: {
    type: Number,
    default: 0
  },

  // Verification status
  isVerified: {
    type: Boolean,
    default: false
  },

  // Source/attributation
  source: {
    type: String,
    enum: ['organic', 'requested', 'imported'],
    default: 'organic'
  },

  // Created by (admin user)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Updated by (admin user)
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save hook to generate avatar initials and color
testimonialSchema.pre('save', function(next) {
  // Generate initials if not set
  if (!this.avatarInitials && this.name) {
    this.avatarInitials = generateInitials(this.name);
  }

  // Generate random color if not set
  if (!this.avatarColor) {
    this.avatarColor = generateAvatarColor();
  }

  // Limit initials to 2 characters for display
  if (this.avatarInitials && this.avatarInitials.length > 2) {
    this.avatarInitials = this.avatarInitials.substring(0, 2);
  }

  next();
});

// Static method to get active testimonials
testimonialSchema.statics.getActive = function() {
  return this.find({ isActive: true })
    .sort({ displayOrder: 1, createdAt: -1 });
};

// Static method to get all testimonials (admin)
testimonialSchema.statics.getAll = function() {
  return this.find()
    .populate('createdBy', 'firstName lastName email')
    .populate('updatedBy', 'firstName lastName email')
    .sort({ displayOrder: 1, createdAt: -1 });
};

// Static method to reorder testimonials
testimonialSchema.statics.reorder = async function(orderIds) {
  const updates = orderIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id },
      update: { displayOrder: index }
    }
  }));

  return this.bulkWrite(updates);
};

// Index for efficient queries
testimonialSchema.index({ isActive: 1, displayOrder: 1 });
testimonialSchema.index({ createdAt: -1 });

const Testimonial = mongoose.model('Testimonial', testimonialSchema);

export default Testimonial;