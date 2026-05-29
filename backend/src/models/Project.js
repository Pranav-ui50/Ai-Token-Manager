/**
 * Project Model
 *
 * MongoDB model for projects within organizations.
 */

import mongoose from 'mongoose';
import { slugify } from '../utils/helpers.js';

const projectSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required']
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    },
    settings: {
      currency: {
        type: String,
        default: 'USD'
      },
      timezone: {
        type: String,
        default: 'UTC'
      },
      defaultModel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AIModel'
      },
      infrastructureCostPerMonth: {
        type: Number,
        default: 0
      }
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

// Indexes
projectSchema.index({ organization: 1, slug: 1 }, { unique: true });
projectSchema.index({ organization: 1, name: 1 });
projectSchema.index({ createdBy: 1 });

// Virtual for feature count
projectSchema.virtual('featureCount', {
  ref: 'Feature',
  localField: '_id',
  foreignField: 'project',
  count: true
});

// Virtual for features
projectSchema.virtual('features', {
  ref: 'Feature',
  localField: '_id',
  foreignField: 'project'
});

// Pre-save middleware to generate slug
projectSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('name')) {
    // Generate slug from name
    let slug = slugify(this.name);

    // Check if slug exists within the same organization
    const existingProject = await this.constructor.findOne({
      organization: this.organization,
      slug: slug
    });

    if (existingProject && existingProject._id.toString() !== this._id.toString()) {
      // Append random string if slug exists
      slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
    }

    this.slug = slug;
  }

  next();
});

// Static method to find by organization
projectSchema.statics.findByOrganization = function (organizationId) {
  return this.find({ organization: organizationId, isActive: true });
};

// Static method to find by slug
projectSchema.statics.findBySlug = function (organizationId, slug) {
  return this.findOne({
    organization: organizationId,
    slug: slug.toLowerCase(),
    isActive: true
  });
};

// Method to soft delete
projectSchema.methods.softDelete = function () {
  this.isActive = false;
  return this.save();
};

const Project = mongoose.model('Project', projectSchema);

export default Project;