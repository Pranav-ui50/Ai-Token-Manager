/**
 * Test Script: Verify Plan Limits Saving
 *
 * This script tests if maxProjects, maxFeatures, maxSimulations are being saved correctly.
 * Run with: node src/scripts/test-plan-limits.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Define Plan Schema inline to test without cache
const planSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
    maxlength: [100, 'Plan name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  tier: {
    type: String,
    enum: ['free', 'starter', 'professional', 'business', 'enterprise'],
    default: 'starter'
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived', 'deprecated'],
    default: 'draft'
  },
  limits: {
    maxProjects: {
      type: Number,
      default: null
    },
    maxFeatures: {
      type: Number,
      default: null
    },
    maxSimulations: {
      type: Number,
      default: null
    },
    maxUsers: {
      type: Number,
      default: null
    },
    maxApiCalls: {
      type: Number,
      default: null
    },
    maxTokens: {
      type: Number,
      default: null
    },
    maxStorage: {
      type: Number,
      default: null
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  strict: true,
  minimize: false
});

async function test() {
  try {
    console.log('========================================');
    console.log('TEST: Plan Limits Saving');
    console.log('========================================\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Get Organization ID for test
    const Organization = mongoose.model('Organization', new mongoose.Schema({}, { strict: false }));
    const org = await Organization.findOne();
    if (!org) {
      throw new Error('No organization found');
    }
    console.log(`Using organization: ${org._id}\n`);

    // Clean up existing test plan
    const TestPlan = mongoose.models.TestPlan || mongoose.model('TestPlan', planSchema);
    await TestPlan.deleteMany({ name: 'TEST_PLAN_LIMITS' });
    console.log('Cleaned up existing test plans\n');

    // Test 1: Create with Plan.create()
    console.log('TEST 1: Create with Plan.create()');
    console.log('----------------------------------------');

    const createData = {
      organization: org._id,
      name: 'TEST_PLAN_LIMITS',
      slug: 'test-plan-limits',
      tier: 'starter',
      status: 'active',
      limits: {
        maxProjects: 5,
        maxFeatures: 6,
        maxSimulations: 8,
        maxUsers: 10,
        maxApiCalls: 1000,
        maxTokens: 5000,
        maxStorage: 100
      }
    };

    console.log('Input limits:', JSON.stringify(createData.limits, null, 2));

    const createdPlan = await TestPlan.create(createData);
    console.log('Created plan limits:', JSON.stringify(createdPlan.limits, null, 2));
    console.log('maxProjects:', createdPlan.limits?.maxProjects);
    console.log('maxFeatures:', createdPlan.limits?.maxFeatures);
    console.log('maxSimulations:', createdPlan.limits?.maxSimulations);

    // Verify from database
    const fetchedPlan = await TestPlan.findById(createdPlan._id).lean();
    console.log('\nFetched from DB (lean):', JSON.stringify(fetchedPlan.limits, null, 2));

    // Test 2: Update with findByIdAndUpdate
    console.log('\n\nTEST 2: Update with findByIdAndUpdate');
    console.log('----------------------------------------');

    const updateObj = {
      'limits.maxProjects': 15,
      'limits.maxFeatures': 16,
      'limits.maxSimulations': 18,
      'limits.maxUsers': 20,
      'limits.maxApiCalls': 2000,
      'limits.maxTokens': 10000,
      'limits.maxStorage': 200
    };

    console.log('Update object:', JSON.stringify(updateObj, null, 2));

    const updatedPlan = await TestPlan.findByIdAndUpdate(
      createdPlan._id,
      { $set: updateObj },
      { new: true, runValidators: true }
    );

    console.log('Updated plan limits:', JSON.stringify(updatedPlan.limits, null, 2));
    console.log('maxProjects:', updatedPlan.limits?.maxProjects);
    console.log('maxFeatures:', updatedPlan.limits?.maxFeatures);
    console.log('maxSimulations:', updatedPlan.limits?.maxSimulations);

    // Verify from database
    const fetchedUpdated = await TestPlan.findById(createdPlan._id).lean();
    console.log('\nFetched from DB (lean):', JSON.stringify(fetchedUpdated.limits, null, 2));

    // Test 3: Update with nested object
    console.log('\n\nTEST 3: Update with nested object');
    console.log('----------------------------------------');

    const nestedUpdate = {
      'limits.maxProjects': 25,
      'limits.maxFeatures': 26,
      'limits.maxSimulations': 28
    };

    console.log('Update object:', JSON.stringify(nestedUpdate, null, 2));

    const updatedPlan2 = await TestPlan.findByIdAndUpdate(
      createdPlan._id,
      { $set: nestedUpdate },
      { new: true }
    );

    console.log('Updated plan limits:', JSON.stringify(updatedPlan2.limits, null, 2));

    // Verify from database
    const fetchedUpdated2 = await TestPlan.findById(createdPlan._id).lean();
    console.log('Fetched from DB (lean):', JSON.stringify(fetchedUpdated2.limits, null, 2));

    // Summary
    console.log('\n\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log('Test 1 (create): maxProjects =', createdPlan.limits?.maxProjects, '(expected: 5)');
    console.log('Test 2 (update with all fields): maxProjects =', updatedPlan.limits?.maxProjects, '(expected: 15)');
    console.log('Test 3 (update with partial): maxProjects =', updatedPlan2.limits?.maxProjects, '(expected: 25)');
    console.log('');

    // Verify all values
    const pass1 = createdPlan.limits?.maxProjects === 5;
    const pass2 = updatedPlan.limits?.maxProjects === 15;
    const pass3 = updatedPlan2.limits?.maxProjects === 25;

    if (pass1 && pass2 && pass3) {
      console.log('✅ ALL TESTS PASSED');
    } else {
      console.log('❌ TESTS FAILED:');
      if (!pass1) console.log('  - Test 1 failed: maxProjects not saved on create');
      if (!pass2) console.log('  - Test 2 failed: maxProjects not saved on update');
      if (!pass3) console.log('  - Test 3 failed: maxProjects not saved on partial update');
    }

    // Cleanup
    await TestPlan.deleteMany({ name: 'TEST_PLAN_LIMITS' });
    console.log('\nCleaned up test plans');

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