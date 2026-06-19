/**
 * Enforce member limits based on plan
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/api-token-manager';

const userSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  status: String,
  disabledAt: Date,
  disabledReason: String
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
    disabledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  subscription: {
    plan: String,
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    status: String
  }
}, { timestamps: true });

const planSchema = new mongoose.Schema({
  name: String,
  tier: String,
  limits: {
    maxUsers: Number
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Organization = mongoose.model('Organization', orgSchema);
const Plan = mongoose.model('Plan', planSchema);

const DEFAULT_LIMITS = {
  starter: 2,
  professional: 5,
  business: 10
};

async function enforceMemberLimits() {
  const orgId = process.argv[2] || '6a2f9483c8cad3553953c062';
  const dryRun = process.argv[3] !== 'execute';

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

    const tier = org.subscription?.plan || 'starter';
    const maxUsers = plan?.limits?.maxUsers || DEFAULT_LIMITS[tier] || 1;

    console.log('=== Organization ===');
    console.log('Name:', org.name);
    console.log('Plan:', tier);
    console.log('Max Members:', maxUsers === null ? 'Unlimited' : maxUsers);
    console.log('Owner:', org.owner?.firstName, org.owner?.lastName);

    console.log('\n=== Current Members ===');
    const activeMembers = org.members.filter(m => m.status === 'active' || !m.status);
    const inactiveMembers = org.members.filter(m => m.status === 'inactive');
    const disabledMembers = org.members.filter(m => m.status === 'disabled');

    console.log(`Active: ${activeMembers.length}`);
    console.log(`Inactive: ${inactiveMembers.length}`);
    console.log(`Disabled: ${disabledMembers.length}`);
    console.log(`Total: ${org.members.length}`);

    // Calculate excess members (owner doesn't count as member)
    const totalAllowed = maxUsers;
    const totalMembers = org.members.length; // excluding owner
    const excess = totalMembers - totalAllowed;

    if (excess <= 0) {
      console.log('\n✅ No action needed. Within plan limits.');
      process.exit(0);
    }

    console.log(`\n⚠️  Need to disable ${excess} member(s) to comply with plan limit.`);

    // Find members to disable (last added members first)
    const membersToDisable = activeMembers.slice(-excess);

    console.log('\nMembers to disable:');
    membersToDisable.forEach((m, i) => {
      console.log(`${i + 1}. ${m.user?.firstName} ${m.user?.lastName} (${m.user?.email})`);
    });

    if (dryRun) {
      console.log('\n[DRY RUN] No changes made. Run with "execute" to apply changes:');
      console.log(`node src/scripts/enforceMemberLimits.js ${orgId} execute`);
      process.exit(0);
    }

    // Apply changes
    console.log('\nDisabling members...');
    const ownerId = org.owner._id.toString();

    for (const member of membersToDisable) {
      const userId = member.user._id || member.user;

      // Skip if it's the owner
      if (userId.toString() === ownerId) {
        console.log(`Skipping owner: ${member.user?.firstName}`);
        continue;
      }

      // Update member status in organization
      member.status = 'disabled';
      member.disabledReason = 'plan_limit';
      member.disabledAt = new Date();

      // Update user status
      await User.findByIdAndUpdate(userId, {
        status: 'disabled',
        disabledAt: new Date(),
        disabledReason: 'plan_limit'
      });

      console.log(`✓ Disabled: ${member.user?.firstName} ${member.user?.lastName}`);
    }

    await org.save();
    console.log('\n✅ Member limits enforced successfully!');

    // Show updated status
    console.log('\n=== Updated Members ===');
    const updatedOrg = await Organization.findById(orgId)
      .populate('members.user', 'firstName lastName email');

    updatedOrg.members.forEach((m, i) => {
      const status = m.status || 'active';
      const statusIcon = status === 'active' ? '✅' : status === 'disabled' ? '❌' : '⚪';
      console.log(`${i + 1}. ${statusIcon} ${m.user?.firstName} ${m.user?.lastName} (${m.user?.email}) - ${status}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

enforceMemberLimits();