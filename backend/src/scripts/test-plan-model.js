/**
 * Test Script: Verify Actual Plan Model (Fixed)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Plan from '../models/Plan.js';

async function test() {
  try {
    console.log('========================================');
    console.log('TEST: Actual Plan Model (After Fix)');
    console.log('========================================\n');

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Check schema paths
    console.log('Schema paths for limits:');
    const schemaPaths = Plan.schema.paths;
    console.log('  limits.maxProjects:', schemaPaths['limits.maxProjects'] ? 'DEFINED' : 'NOT DEFINED');
    console.log('  limits.maxFeatures:', schemaPaths['limits.maxFeatures'] ? 'DEFINED' : 'NOT DEFINED');
    console.log('  limits.maxSimulations:', schemaPaths['limits.maxSimulations'] ? 'DEFINED' : 'NOT DEFINED');
    console.log('');

    // Find an existing plan
    const existingPlan = await Plan.findOne().lean();
    if (existingPlan) {
      console.log('Existing plan limits:');
      console.log(JSON.stringify(existingPlan.limits, null, 2));
      console.log('maxProjects:', existingPlan.limits?.maxProjects);
      console.log('maxFeatures:', existingPlan.limits?.maxFeatures);
      console.log('maxSimulations:', existingPlan.limits?.maxSimulations);
    }

    // Get Organization ID
    const Organization = mongoose.model('Organization', new mongoose.Schema({}, { strict: false }));
    const org = await Organization.findOne();
    if (!org) {
      throw new Error('No organization found');
    }

    // Create a test plan
    console.log('\n\nCreating test plan...');
    const testPlan = await Plan.create({
      organization: org._id,
      name: 'TEST_MODEL_FIX',
      slug: 'test-model-fix',
      tier: 'starter',
      status: 'active',
      billing: { price: 0, currency: 'USD', interval: 'month', trialDays: 0 },
      limits: {
        maxProjects: 99,
        maxFeatures: 88,
        maxSimulations: 77,
        maxUsers: 66
      }
    });

    console.log('Created plan limits:');
    console.log(JSON.stringify(testPlan.limits, null, 2));
    console.log('maxProjects:', testPlan.limits?.maxProjects, '(expected: 99)');
    console.log('maxFeatures:', testPlan.limits?.maxFeatures, '(expected: 88)');
    console.log('maxSimulations:', testPlan.limits?.maxSimulations, '(expected: 77)');

    // Update test
    console.log('\n\nUpdating test plan...');
    const updatedPlan = await Plan.findByIdAndUpdate(
      testPlan._id,
      { $set: { 'limits.maxProjects': 111, 'limits.maxFeatures': 222, 'limits.maxSimulations': 333 } },
      { new: true, runValidators: true }
    );

    console.log('Updated plan limits:');
    console.log(JSON.stringify(updatedPlan.limits, null, 2));
    console.log('maxProjects:', updatedPlan.limits?.maxProjects, '(expected: 111)');
    console.log('maxFeatures:', updatedPlan.limits?.maxFeatures, '(expected: 222)');
    console.log('maxSimulations:', updatedPlan.limits?.maxSimulations, '(expected: 333)');

    // Verify from DB
    const verifyPlan = await Plan.findById(testPlan._id).lean();
    console.log('\nVerified from DB:');
    console.log(JSON.stringify(verifyPlan.limits, null, 2));

    // Cleanup
    await Plan.deleteMany({ name: 'TEST_MODEL_FIX' });
    console.log('\nCleaned up test plans');

    // Summary
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    console.log('Create test:', testPlan.limits?.maxProjects === 99 ? '✅ PASS' : '❌ FAIL');
    console.log('Update test:', updatedPlan.limits?.maxProjects === 111 ? '✅ PASS' : '❌ FAIL');
    console.log('DB verify:', verifyPlan.limits?.maxProjects === 111 ? '✅ PASS' : '❌ FAIL');

    if (testPlan.limits?.maxProjects === 99 && updatedPlan.limits?.maxProjects === 111) {
      console.log('\n✅ ALL TESTS PASSED');
    } else {
      console.log('\n❌ SOME TESTS FAILED');
    }

  } catch (error) {
    console.error('Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

test();