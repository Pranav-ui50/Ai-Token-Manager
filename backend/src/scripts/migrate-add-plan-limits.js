/**
 * Migration Script: Add maxProjects, maxFeatures, maxSimulations to Plans
 *
 * This script adds the missing limit fields to all existing plans in the database.
 * It checks the raw MongoDB document (not Mongoose model) to correctly detect
 * missing fields.
 *
 * Run with: node src/scripts/migrate-add-plan-limits.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function migrate() {
  try {
    console.log('========================================');
    console.log('MIGRATION: Add limit fields to Plans');
    console.log('========================================');
    console.log('');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    console.log('');

    // Use native MongoDB collection to bypass Mongoose defaults
    const db = mongoose.connection.db;
    const plansCollection = db.collection('plans');

    // Get all plans using native driver
    const plans = await plansCollection.find({}).toArray();
    console.log(`Found ${plans.length} plans to migrate`);
    console.log('');

    let updated = 0;
    let skipped = 0;

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
        // Check each field individually using 'in' operator on raw document
        // This correctly detects if the field exists in MongoDB (not applied by Mongoose defaults)
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
        console.log(`  - Current limits:`, JSON.stringify(plan.limits, null, 2));
        console.log(`  - Updates to apply:`, JSON.stringify(updates, null, 2));

        // Use $set to add the missing fields
        const result = await plansCollection.updateOne(
          { _id: plan._id },
          { $set: updates }
        );

        console.log(`  - Result: ${result.modifiedCount} document(s) modified`);
        console.log('');

        updated++;
      } else {
        console.log(`Skipping plan: ${plan.name} (${plan._id}) - already has all fields`);
        skipped++;
      }
    }

    console.log('');
    console.log('========================================');
    console.log('MIGRATION COMPLETE');
    console.log('========================================');
    console.log(`Total plans: ${plans.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log('');

    // Verify all plans have the fields using native driver
    console.log('Verifying all plans...');
    const allPlans = await plansCollection.find({}).toArray();
    let allHaveFields = true;

    for (const plan of allPlans) {
      const hasLimits = plan.limits !== null && plan.limits !== undefined;
      const hasAllFields =
        hasLimits &&
        'maxProjects' in plan.limits &&
        'maxFeatures' in plan.limits &&
        'maxSimulations' in plan.limits;

      if (!hasAllFields) {
        console.log(`ERROR: Plan ${plan.name} (${plan._id}) is missing fields!`);
        console.log(`  limits:`, JSON.stringify(plan.limits, null, 2));
        allHaveFields = false;
      }
    }

    if (allHaveFields) {
      console.log('SUCCESS: All plans have the required limit fields');
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

migrate();