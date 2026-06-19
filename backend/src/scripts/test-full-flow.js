/**
 * Complete End-to-End Test: Plan Limits
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
    console.log('COMPLETE END-TO-END TEST');
    console.log('========================================\n');

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Get Organization ID
    const Organization = mongoose.model('Organization', new mongoose.Schema({}, { strict: false }));
    const org = await Organization.findOne();
    if (!org) throw new Error('No organization found');

    // Step 1: Create a plan with limits
    console.log('STEP 1: Create plan with limits');
    console.log('----------------------------------------');
    const createData = {
      organization: org._id,
      name: 'TEST_LIMITS_FLOW',
      slug: 'test-limits-flow',
      tier: 'starter',
      status: 'active',
      billing: { price: 0, currency: 'USD', interval: 'month', trialDays: 0 },
      limits: {
        maxProjects: 5,
        maxFeatures: 10,
        maxSimulations: 20,
        maxUsers: 3
      }
    };

    console.log('Creating plan with:');
    console.log('  maxProjects: 5');
    console.log('  maxFeatures: 10');
    console.log('  maxSimulations: 20');

    const created = await Plan.create(createData);
    console.log('Created plan ID:', created._id);
    console.log('Created limits:', JSON.stringify(created.limits, null, 2));

    if (created.limits.maxProjects !== 5) {
      console.log('❌ FAIL: maxProjects should be 5, got:', created.limits.maxProjects);
    } else {
      console.log('✅ PASS: maxProjects = 5');
    }

    // Step 2: Fetch from DB and verify
    console.log('\nSTEP 2: Fetch from DB');
    console.log('----------------------------------------');
    const fetched = await Plan.findById(created._id).lean();
    console.log('Fetched limits:', JSON.stringify(fetched.limits, null, 2));

    if (fetched.limits.maxProjects !== 5) {
      console.log('❌ FAIL: Fetched maxProjects should be 5, got:', fetched.limits.maxProjects);
    } else {
      console.log('✅ PASS: Fetched maxProjects = 5');
    }

    // Step 3: Update using findByIdAndUpdate (like admin controller)
    console.log('\nSTEP 3: Update using findByIdAndUpdate');
    console.log('----------------------------------------');
    console.log('Updating to:');
    console.log('  maxProjects: 15');
    console.log('  maxFeatures: 25');
    console.log('  maxSimulations: 35');

    const updateObj = {
      'limits.maxProjects': 15,
      'limits.maxFeatures': 25,
      'limits.maxSimulations': 35
    };

    const updated = await Plan.findByIdAndUpdate(
      created._id,
      { $set: updateObj },
      { new: true, runValidators: true }
    );

    console.log('Updated limits:', JSON.stringify(updated.limits, null, 2));

    if (updated.limits.maxProjects !== 15) {
      console.log('❌ FAIL: Updated maxProjects should be 15, got:', updated.limits.maxProjects);
    } else {
      console.log('✅ PASS: Updated maxProjects = 15');
    }

    if (updated.limits.maxFeatures !== 25) {
      console.log('❌ FAIL: Updated maxFeatures should be 25, got:', updated.limits.maxFeatures);
    } else {
      console.log('✅ PASS: Updated maxFeatures = 25');
    }

    if (updated.limits.maxSimulations !== 35) {
      console.log('❌ FAIL: Updated maxSimulations should be 35, got:', updated.limits.maxSimulations);
    } else {
      console.log('✅ PASS: Updated maxSimulations = 35');
    }

    // Step 4: Verify from DB
    console.log('\nSTEP 4: Verify from DB');
    console.log('----------------------------------------');
    const verified = await Plan.findById(created._id).lean();
    console.log('Verified limits:', JSON.stringify(verified.limits, null, 2));

    const allPassed =
      verified.limits.maxProjects === 15 &&
      verified.limits.maxFeatures === 25 &&
      verified.limits.maxSimulations === 35;

    if (allPassed) {
      console.log('\n✅ ALL TESTS PASSED - Plan limits working correctly!');
    } else {
      console.log('\n❌ SOME TESTS FAILED');
      console.log('  maxProjects:', verified.limits.maxProjects, '(expected: 15)');
      console.log('  maxFeatures:', verified.limits.maxFeatures, '(expected: 25)');
      console.log('  maxSimulations:', verified.limits.maxSimulations, '(expected: 35)');
    }

    // Cleanup
    await Plan.deleteMany({ name: 'TEST_LIMITS_FLOW' });
    console.log('\nCleaned up test plan');

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