/**
 * Script to fix user email (add dots back to Gmail addresses)
 *
 * Usage: node --experimental-vm-modules server.cjs src/scripts/fixUserEmail.js
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';
import { config } from 'dotenv';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/api-token-manager';

async function fixUserEmail() {
  const oldEmail = process.argv[2];
  const newEmail = process.argv[3];

  if (!oldEmail || !newEmail) {
    console.log('Usage: node src/scripts/fixUserEmail.js <oldEmail> <newEmail>');
    console.log('Example: node src/scripts/fixUserEmail.js rakshandasisodeukvalley@gmail.com rakshandasisode.ukvalley@gmail.com');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find user by old email
    const user = await User.findOne({ email: oldEmail.toLowerCase() });

    if (!user) {
      console.log(`User not found with email: ${oldEmail}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.email}`);
    console.log(`User ID: ${user._id}`);
    console.log(`Updating email to: ${newEmail}`);

    // Update user email
    user.email = newEmail.toLowerCase();
    await user.save();

    console.log('');
    console.log('========================================');
    console.log('Email updated successfully!');
    console.log(`Old email: ${oldEmail}`);
    console.log(`New email: ${newEmail}`);
    console.log('========================================');

    // Also update any password reset tokens
    const updatedTokens = await PasswordReset.updateMany(
      { user: user._id },
      { $set: { email: newEmail.toLowerCase() } }
    );
    console.log(`Updated ${updatedTokens.modifiedCount} password reset tokens`);

    process.exit(0);
  } catch (error) {
    console.error('Error fixing user email:', error);
    process.exit(1);
  }
}

fixUserEmail();