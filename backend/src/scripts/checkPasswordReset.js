/**
 * Check password reset tokens for a user
 *
 * Usage: node src/scripts/checkPasswordReset.js <email>
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import crypto from 'crypto';

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

// PasswordReset schema
const passwordResetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  token: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  usedAt: Date,
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

async function checkPasswordReset() {
  const email = process.argv[2];

  if (!email) {
    console.log('Usage: node src/scripts/checkPasswordReset.js <email>');
    console.log('Example: node src/scripts/checkPasswordReset.js user@example.com');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`User not found: ${email}`);
      process.exit(1);
    }

    console.log(`\nUser found:`);
    console.log(`  ID: ${user._id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Active: ${user.isActive}`);

    // Find all reset tokens for this user
    const tokens = await PasswordReset.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`\nFound ${tokens.length} reset token(s):\n`);

    tokens.forEach((token, index) => {
      const isExpired = new Date() > token.expiresAt;
      const status = token.used ? 'USED' : (isExpired ? 'EXPIRED' : 'VALID');

      console.log(`Token ${index + 1}:`);
      console.log(`  Email: ${token.email}`);
      console.log(`  Status: ${status}`);
      console.log(`  Used: ${token.used}`);
      console.log(`  Expires: ${token.expiresAt}`);
      console.log(`  Created: ${token.createdAt}`);
      console.log(`  Token (hashed): ${token.token.substring(0, 20)}...`);
      console.log('');
    });

    // Ask if user wants to create a new token
    console.log('To reset this user\'s password, run:');
    console.log(`  node src/scripts/resetUserPassword.js ${email} NewPassword123`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPasswordReset();