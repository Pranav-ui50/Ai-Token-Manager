/**
 * Standalone script to fix user email (add dots back to Gmail addresses)
 *
 * Usage: node src/scripts/fixEmailStandalone.js
 */

import mongoose from 'mongoose';
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
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Simple PasswordReset schema
const passwordResetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  token: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false }
}, { timestamps: true });

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

async function fixUserEmail() {
  const oldEmail = process.argv[2];
  const newEmail = process.argv[3];

  if (!oldEmail || !newEmail) {
    console.log('Usage: node src/scripts/fixEmailStandalone.js <oldEmail> <newEmail>');
    console.log('Example: node src/scripts/fixEmailStandalone.js rakshandasisodeukvalley@gmail.com rakshandasisode.ukvalley@gmail.com');
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

      // Try to find by partial match
      const partialMatch = await User.findOne({
        email: { $regex: oldEmail.replace('@', '.*@'), $options: 'i' }
      });

      if (partialMatch) {
        console.log(`Found similar user: ${partialMatch.email}`);
      }

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

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error fixing user email:', error);
    process.exit(1);
  }
}

fixUserEmail();