/**
 * List all users to find their emails
 *
 * Usage: node src/scripts/listUsers.js
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

async function listUsers() {
  const searchTerm = process.argv[2]; // Optional search term

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find users
    const query = searchTerm
      ? { email: { $regex: searchTerm, $options: 'i' } }
      : {};

    const users = await User.find(query)
      .select('email firstName lastName isActive createdAt')
      .limit(20)
      .sort({ createdAt: -1 });

    console.log(`\nFound ${users.length} users:\n`);
    console.log('Email'.padEnd(45) + 'Name'.padEnd(25) + 'Active');
    console.log('-'.repeat(80));

    users.forEach(user => {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      console.log(`${user.email.padEnd(45)}${name.padEnd(25)}${user.isActive ? 'Yes' : 'No'}`);
    });

    if (searchTerm) {
      console.log(`\n(Search term: "${searchTerm}")`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }
}

listUsers();