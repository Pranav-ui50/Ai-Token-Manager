/**
 * Fix Demo Users - Add Missing Organizations
 *
 * This script updates existing demo users to have organizations.
 * Run with: node src/scripts/fixDemoUsers.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import config from '../config/index.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Organization from '../models/Organization.js';

const DEMO_USERS_CONFIG = [
  {
    email: 'orgowner@apitokenmanager.com',
    organizationName: 'Demo Organization'
  },
  {
    email: 'finance@apitokenmanager.com',
    organizationName: 'Demo Organization'
  },
  {
    email: 'product@apitokenmanager.com',
    organizationName: 'Demo Organization'
  },
  {
    email: 'developer@apitokenmanager.com',
    organizationName: 'Demo Organization'
  },
  {
    email: 'viewer@apitokenmanager.com',
    organizationName: 'Demo Organization'
  }
];

async function fixDemoUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB');

    // Find or create the organization
    let organization = await Organization.findOne({ name: 'Demo Organization' });

    if (!organization) {
      // Get org_owner role
      const ownerRole = await Role.findOne({ name: 'org_owner' });

      // Find the org_owner user to be the owner
      const orgOwner = await User.findOne({ email: 'orgowner@apitokenmanager.com' });

      if (!orgOwner) {
        console.log('Org owner user not found. Creating organization with first available user.');
        const firstUser = await User.findOne({ email: DEMO_USERS_CONFIG[1].email });
        if (firstUser) {
          organization = await Organization.create({
            name: 'Demo Organization',
            owner: firstUser._id,
            members: [{
              user: firstUser._id,
              role: firstUser.role,
              joinedAt: new Date()
            }],
            isActive: true
          });
          console.log(`Created organization: ${organization.name}`);
        }
      } else {
        organization = await Organization.create({
          name: 'Demo Organization',
          owner: orgOwner._id,
          members: [{
            user: orgOwner._id,
            role: ownerRole._id,
            joinedAt: new Date()
          }],
          isActive: true
        });
        console.log(`Created organization: ${organization.name}`);
      }
    } else {
      console.log(`Found existing organization: ${organization.name}`);
    }

    // Update all demo users to belong to this organization
    let updatedCount = 0;
    for (const config of DEMO_USERS_CONFIG) {
      const user = await User.findOne({ email: config.email });

      if (user) {
        if (!user.organization) {
          user.organization = organization._id;
          await user.save();
          console.log(`Updated user: ${user.email} -> organization: ${organization.name}`);
          updatedCount++;
        } else {
          console.log(`User ${user.email} already has organization`);
        }
      } else {
        console.log(`User not found: ${config.email}`);
      }
    }

    // Ensure all demo users are in the organization's members array
    const allDemoUsers = await User.find({
      email: { $in: DEMO_USERS_CONFIG.map(u => u.email) }
    });

    const orgOwnerRole = await Role.findOne({ name: 'org_owner' });
    const financeRole = await Role.findOne({ name: 'finance_admin' });
    const productRole = await Role.findOne({ name: 'product_manager' });
    const developerRole = await Role.findOne({ name: 'developer' });
    const viewerRole = await Role.findOne({ name: 'viewer' });

    const roleMap = {
      'orgowner@apitokenmanager.com': orgOwnerRole._id,
      'finance@apitokenmanager.com': financeRole._id,
      'product@apitokenmanager.com': productRole._id,
      'developer@apitokenmanager.com': developerRole._id,
      'viewer@apitokenmanager.com': viewerRole._id
    };

    for (const user of allDemoUsers) {
      const existingMember = organization.members.find(
        m => m.user.toString() === user._id.toString()
      );

      if (!existingMember) {
        organization.members.push({
          user: user._id,
          role: roleMap[user.email] || viewerRole._id,
          joinedAt: new Date()
        });
      }
    }

    await organization.save();
    console.log('Updated organization members');

    console.log(`\nFix completed. Updated ${updatedCount} users.`);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixDemoUsers();