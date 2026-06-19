/**
 * FIX Migration Script: Add missing limit fields to Plans
 *
 * This script properly adds the missing maxProjects, maxFeatures, maxSimulations
 * fields to all existing plans in MongoDB.
 *
 * Run with: node src/scripts/fix-missing-limits.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function fix() {
  try {
    console.log('========================================');
    console.log('FIX: Add missing limit fields to Plans');
    console.log('========================================\n');

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Use native MongoDB collection to bypass Mongoose defaults
    const db = mongoose.connection.db;
    const plansCollection = db.collection('plans');

    // Find all plans
    const plans = await plansCollection.find({}).toArray();
    console.log(`Found ${plans.length} plans\n`);

    let updated = 0;
    let alreadyHas = 0;

    for (const plan of plans) {
      const updates = {};
      let needsUpdate = false;

      // Check if limits object exists
      if (!plan.limits) {
        updates.limits = {
          maxProjects: null,
          maxFeatures: null,
          maxSimulations: null,
          maxUsers: null,
          maxApiCalls: null,
          maxTokens: null,
          maxStorage: null
        };
        needsUpdate = true;
      } else {
        // Check each field individually
        if (!('maxProjects' in plan.limits)) {
          updates['limits.maxProjects'] = null;
          needsUpdate = true;
        }
        if (!('maxFeatures' in plan.limits)) {
          updates['limits.maxFeatures'] = null;
          needsUpdate = true;
        }
        if (!('maxSimulations' in plan.limits)) {
          updates['limits.maxSimulations'] = null;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        console.log(`Updating plan: ${plan.name} (${plan._id})`);
        console.log(`  Current limits:`, JSON.stringify(plan.limits, null, 2));
        console.log(`  Updates to apply:`, JSON.stringify(updates, null, 2));

        const result = await plansCollection.updateOne(
          { _id: plan._id },
          { $set: updates }
        );

        console.log(`  Result: ${result.modifiedCount} document(s) modified\n`);
        updated++;
      } else {
        console.log(`Skipping plan: ${plan.name} (${plan._id}) - already has all fields`);
        alreadyHas++;
      }
    }

    console.log('\n========================================');
    console.log('MIGRATION COMPLETE');
    console.log('========================================');
    console.log(`Total plans: ${plans.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Already correct: ${alreadyHas}`);
    console.log('');

    // Verify all plans have the fields
    console.log('Verifying all plans...');
    const allPlans = await plansCollection.find({}).toArray();
    let allHaveFields = true;

    for (const plan of allPlans) {
      const hasAllFields =
        plan.limits &&
        'maxProjects' in plan.limits &&
        'maxFeatures' in plan.limits &&
        'maxSimulations' in plan.limits;

      if (!hasAllFields) {
        console.log(`ERROR: Plan ${plan.name} (${plan._id}) is still missing fields!`);
        console.log(`  limits:`, JSON.stringify(plan.limits, null, 2));
        allHaveFields = false;
      }
    }

    if (allHaveFields) {
      console.log('SUCCESS: All plans now have the required limit fields');
    } else {
      console.log('ERROR: Some plans are still missing fields');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fix();