/**
 * Script to reset a user's password
 *
 * Usage: node --experimental-vm-modules server.cjs src/scripts/resetUserPassword.js <email> <newPassword>
 *
 * Example: node --experimental-vm-modules server.cjs src/scripts/resetUserPassword.js user@example.com NewPassword123
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import { config } from 'dotenv';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/api-token-manager';

async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.log('Usage: node src/scripts/resetUserPassword.js <email> <newPassword>');
    console.log('Example: node src/scripts/resetUserPassword.js user@example.com NewPassword123');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find user by email
    const user = await User.findByEmail(email);

    if (!user) {
      console.log(`User not found: ${email}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.email}`);
    console.log(`User ID: ${user._id}`);

    // Set new password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.passwordChangedAt = new Date();

    // Clear any login attempts and lock
    user.loginAttempts = 0;
    user.lockUntil = null;

    await user.save();

    console.log('');
    console.log('========================================');
    console.log('Password reset successful!');
    console.log(`Email: ${email}`);
    console.log(`New Password: ${newPassword}`);
    console.log('========================================');
    console.log('');
    console.log('You can now login with the new password.');
    console.log('Note: The password is hashed ONCE by the pre-save hook.');

    process.exit(0);
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  }
}

resetPassword();