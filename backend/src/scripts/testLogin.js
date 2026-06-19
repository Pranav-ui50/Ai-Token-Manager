/**
 * Test login credentials
 *
 * Usage: node src/scripts/testLogin.js <email> <password>
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/api-token-manager';

// Simple User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  password: { type: String, select: false },
  firstName: String,
  lastName: String,
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date
}, { timestamps: true });

// Add method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  console.log('[comparePassword] Starting comparison...');
  console.log('[comparePassword] Candidate password:', candidatePassword);
  console.log('[comparePassword] Stored hash (first 30 chars):', this.password ? this.password.substring(0, 30) + '...' : 'undefined');

  if (!this.password) {
    console.log('[comparePassword] No password stored on user object');
    return false;
  }

  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('[comparePassword] bcrypt.compare result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('[comparePassword] Error:', error);
    return false;
  }
};

const User = mongoose.model('User', userSchema);

async function testLogin() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.log('Usage: node src/scripts/testLogin.js <email> <password>');
    console.log('Example: node src/scripts/testLogin.js user@example.com NewPassword123');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      console.log(`\nUser not found: ${email}`);
      process.exit(1);
    }

    console.log(`\nUser found:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  ID: ${user._id}`);
    console.log(`  Active: ${user.isActive}`);
    console.log(`  Verified: ${user.isVerified}`);
    console.log(`  Login attempts: ${user.loginAttempts}`);
    console.log(`  Locked until: ${user.lockUntil || 'Not locked'}`);
    console.log(`  Password hash (first 30 chars): ${user.password ? user.password.substring(0, 30) + '...' : 'undefined'}`);

    // Test password comparison
    console.log(`\nTesting password: "${password}"`);
    const isMatch = await user.comparePassword(password);

    console.log(`\nPassword match: ${isMatch}`);

    if (isMatch) {
      console.log('\n✅ Login would succeed with these credentials!');
    } else {
      console.log('\n❌ Login would fail - password does not match');
      console.log('\nTo fix, reset the password:');
      console.log(`  node src/scripts/resetUserPassword.js ${email} NewPassword123`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLogin();