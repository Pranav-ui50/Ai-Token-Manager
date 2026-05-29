/**
 * Project Member Model
 *
 * MongoDB model for project member associations.
 */

import mongoose from 'mongoose';

const projectMemberSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'developer', 'viewer'],
      default: 'viewer'
    },
    permissions: {
      canManageFeatures: {
        type: Boolean,
        default: false
      },
      canManageApiKeys: {
        type: Boolean,
        default: false
      },
      canViewReports: {
        type: Boolean,
        default: true
      },
      canEditSettings: {
        type: Boolean,
        default: false
      },
      canInviteMembers: {
        type: Boolean,
        default: false
      }
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
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
    }
  }
);

// Compound index for unique project-user pair
projectMemberSchema.index({ project: 1, user: 1 }, { unique: true });

// Static method to add member
projectMemberSchema.statics.addMember = async function (projectId, userId, role = 'viewer', addedBy = null) {
  // Check if member exists
  const existing = await this.findOne({ project: projectId, user: userId });

  if (existing) {
    // Update existing member
    existing.role = role;
    existing.isActive = true;
    return existing.save();
  }

  // Create new member
  return this.create({
    project: projectId,
    user: userId,
    role,
    addedBy,
    permissions: {
      canManageFeatures: role === 'owner' || role === 'admin',
      canManageApiKeys: role === 'owner' || role === 'admin',
      canViewReports: true,
      canEditSettings: role === 'owner' || role === 'admin',
      canInviteMembers: role === 'owner' || role === 'admin'
    }
  });
};

// Static method to remove member
projectMemberSchema.statics.removeMember = async function (projectId, userId) {
  return this.findOneAndUpdate(
    { project: projectId, user: userId },
    { isActive: false },
    { new: true }
  );
};

// Static method to get project members
projectMemberSchema.statics.getProjectMembers = async function (projectId) {
  return this.find({ project: projectId, isActive: true })
    .populate('user', 'firstName lastName email avatar')
    .populate('addedBy', 'firstName lastName email')
    .sort({ role: 1, joinedAt: -1 });
};

// Static method to get user's projects
projectMemberSchema.statics.getUserProjects = async function (userId) {
  return this.find({ user: userId, isActive: true })
    .populate('project')
    .sort({ createdAt: -1 });
};

// Static method to check if user is member
projectMemberSchema.statics.isMember = async function (projectId, userId) {
  const member = await this.findOne({ project: projectId, user: userId, isActive: true });
  return !!member;
};

// Static method to get member role
projectMemberSchema.statics.getMemberRole = async function (projectId, userId) {
  const member = await this.findOne({ project: projectId, user: userId, isActive: true });
  return member?.role || null;
};

// Static method to update member role
projectMemberSchema.statics.updateRole = async function (projectId, userId, newRole) {
  const permissions = {
    canManageFeatures: newRole === 'owner' || newRole === 'admin',
    canManageApiKeys: newRole === 'owner' || newRole === 'admin',
    canViewReports: true,
    canEditSettings: newRole === 'owner' || newRole === 'admin',
    canInviteMembers: newRole === 'owner' || newRole === 'admin'
  };

  return this.findOneAndUpdate(
    { project: projectId, user: userId, isActive: true },
    { role: newRole, permissions },
    { new: true }
  );
};

const ProjectMember = mongoose.model('ProjectMember', projectMemberSchema);

export default ProjectMember;