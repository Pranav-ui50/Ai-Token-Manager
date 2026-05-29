/**
 * Role Model
 *
 * MongoDB model for user roles and permissions.
 */

import mongoose from 'mongoose';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from '../utils/constants.js';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      enum: Object.values(ROLES),
      lowercase: true
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    permissions: {
      type: [String],
      enum: Object.values(PERMISSIONS),
      default: []
    },
    isSystem: {
      type: Boolean,
      default: false
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

// Note: unique: true in schema already creates the index on 'name'

// Virtual for permission count
roleSchema.virtual('permissionCount').get(function () {
  return this.permissions ? this.permissions.length : 0;
});

// Static method to get role with permissions
roleSchema.statics.getRoleWithPermissions = function (roleName) {
  return this.findOne({ name: roleName, isActive: true });
};

// Static method to seed default roles
roleSchema.statics.seedDefaults = async function () {
  const defaultRoles = [
    {
      name: ROLES.SUPER_ADMIN,
      displayName: 'Super Admin',
      description: 'Full system administrator with all permissions',
      permissions: ROLE_PERMISSIONS[ROLES.SUPER_ADMIN],
      isSystem: true
    },
    {
      name: ROLES.ORG_OWNER,
      displayName: 'Organization Owner',
      description: 'Owner of an organization workspace',
      permissions: ROLE_PERMISSIONS[ROLES.ORG_OWNER],
      isSystem: true
    },
    {
      name: ROLES.FINANCE_ADMIN,
      displayName: 'Finance Admin',
      description: 'Manages pricing and analytics',
      permissions: ROLE_PERMISSIONS[ROLES.FINANCE_ADMIN],
      isSystem: true
    },
    {
      name: ROLES.PRODUCT_MANAGER,
      displayName: 'Product Manager',
      description: 'Manages feature economics and product configuration',
      permissions: ROLE_PERMISSIONS[ROLES.PRODUCT_MANAGER],
      isSystem: true
    },
    {
      name: ROLES.DEVELOPER,
      displayName: 'Developer',
      description: 'Manages technical integrations and API configurations',
      permissions: ROLE_PERMISSIONS[ROLES.DEVELOPER],
      isSystem: true
    },
    {
      name: ROLES.VIEWER,
      displayName: 'Viewer',
      description: 'Read-only access for stakeholders',
      permissions: ROLE_PERMISSIONS[ROLES.VIEWER],
      isSystem: true
    }
  ];

  for (const role of defaultRoles) {
    const existing = await this.findOne({ name: role.name });
    if (!existing) {
      await this.create(role);
    }
  }
};

// Method to check if role has permission
roleSchema.methods.hasPermission = function (permission) {
  return this.permissions.includes(permission);
};

// Method to check if role has any of the permissions
roleSchema.methods.hasAnyPermission = function (permissions) {
  return permissions.some((permission) => this.permissions.includes(permission));
};

// Method to check if role has all permissions
roleSchema.methods.hasAllPermissions = function (permissions) {
  return permissions.every((permission) => this.permissions.includes(permission));
};

const Role = mongoose.model('Role', roleSchema);

export default Role;