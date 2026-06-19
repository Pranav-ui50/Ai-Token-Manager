/**
 * Get organization ID for a user
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/api-token-manager';

const userSchema = new mongoose.Schema({
  email: String,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }
}, { timestamps: true });

const orgSchema = new mongoose.Schema({
  name: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' }
  }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Organization = mongoose.model('Organization', orgSchema);

async function getOrgId() {
  const email = process.argv[2];

  if (!email) {
    console.log('Usage: node src/scripts/getOrgId.js <email>');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);

    const user = await User.findOne({ email: email.toLowerCase() }).populate('organization');

    if (!user) {
      console.log(`User not found: ${email}`);
      process.exit(1);
    }

    console.log(`\nUser: ${user.email}`);
    console.log(`Organization ID: ${user.organization?._id || user.organization}`);
    console.log(`Organization Name: ${user.organization?.name || 'N/A'}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getOrgId();