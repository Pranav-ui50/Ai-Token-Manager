/**
 * Check organization members and plan limits
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/api-token-manager';

const userSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }
}, { timestamps: true });

const orgSchema = new mongoose.Schema({
  name: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    status: { type: String, enum: ['active', 'inactive', 'disabled'], default: 'active' },
    disabledReason: String,
    disabledAt: Date,
    joinedAt: Date
  }],
  subscription: {
    plan: String,
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    status: String,
    currentPeriodEnd: Date
  }
}, { timestamps: true });

const planSchema = new mongoose.Schema({
  name: String,
  tier: String,
  limits: {
    maxUsers: Number,
    maxProjects: Number,
    maxFeatures: Number
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Organization = mongoose.model('Organization', orgSchema);
const Plan = mongoose.model('Plan', planSchema);

async function checkOrgMembers() {
  const orgId = process.argv[2] || '6a2f9483c8cad3553953c062';

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const org = await Organization.findById(orgId)
      .populate('owner', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email');

    if (!org) {
      console.log('Organization not found');
      process.exit(1);
    }

    // Get plan limits
    let plan = null;
    if (org.subscription?.planId) {
      plan = await Plan.findById(org.subscription.planId);
    }

    const maxUsers = plan?.limits?.maxUsers || { free: 1, starter: 2, professional: 6, business: 25 }[org.subscription?.plan || 'free'] || 1;

    console.log('=== Organization ===');
    console.log('Name:', org.name);
    console.log('Owner:', org.owner?.firstName, org.owner?.lastName, `(${org.owner?.email})`);
    console.log('\n=== Subscription ===');
    console.log('Plan:', org.subscription?.plan || 'free');
    console.log('Status:', org.subscription?.status || 'trial');
    console.log('Max Members Allowed:', maxUsers === null ? 'Unlimited' : maxUsers);
    console.log('\n=== Members ===');
    console.log('Total Members:', org.members.length);

    const activeMembers = org.members.filter(m => m.status === 'active' || !m.status);
    const disabledMembers = org.members.filter(m => m.status === 'disabled');
    const inactiveMembers = org.members.filter(m => m.status === 'inactive');

    console.log('Active:', activeMembers.length);
    console.log('Inactive:', inactiveMembers.length);
    console.log('Disabled:', disabledMembers.length);

    console.log('\nMember List:');
    org.members.forEach((m, i) => {
      const user = m.user;
      const status = m.status || 'active';
      const statusIcon = status === 'active' ? '✅' : status === 'disabled' ? '❌' : '⚪';
      console.log(`${i + 1}. ${statusIcon} ${user?.firstName || ''} ${user?.lastName || ''} (${user?.email || 'N/A'})`);
      if (status === 'disabled') {
        console.log(`   Reason: ${m.disabledReason || 'N/A'}`);
        console.log(`   Disabled At: ${m.disabledAt ? new Date(m.disabledAt).toLocaleDateString() : 'N/A'}`);
      }
    });

    console.log('\n=== Limit Check ===');
    const totalMembers = org.members.length;
    const activeCount = activeMembers.length + 1; // +1 for owner

    if (maxUsers !== null) {
      if (totalMembers > maxUsers) {
        console.log(`⚠️  WARNING: Total members (${totalMembers}) exceeds plan limit (${maxUsers})`);
        console.log(`   Need to disable ${totalMembers - maxUsers} member(s) to comply with plan limit.`);
      } else if (activeCount > maxUsers) {
        console.log(`⚠️  WARNING: Active members (${activeCount}) exceeds plan limit (${maxUsers})`);
      } else {
        console.log(`✅ Within plan limit: ${activeCount} active members (limit: ${maxUsers})`);
        console.log(`   ${maxUsers - activeCount} member slot(s) available`);
      }
    } else {
      console.log(`✅ Unlimited members allowed`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkOrgMembers();