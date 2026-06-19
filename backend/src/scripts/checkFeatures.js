/**
 * Check features for an organization
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/api-token-manager';

const featureSchema = new mongoose.Schema({
  name: String,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  model: { type: mongoose.Schema.Types.ObjectId, ref: 'AIModel' },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
  status: String,
  stats: {
    totalRequests: Number,
    totalTokens: Number,
    totalCost: Number,
    lastUsedAt: Date
  },
  usageHistory: [{
    date: Date,
    requests: Number,
    tokens: Number,
    cost: Number
  }]
}, { timestamps: true });

const Feature = mongoose.model('Feature', featureSchema);

async function checkFeatures() {
  const organizationId = process.argv[2];

  if (!organizationId) {
    console.log('Usage: node src/scripts/checkFeatures.js <organizationId>');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const features = await Feature.find({ organization: organizationId }).lean();

    if (features.length === 0) {
      console.log('No features found for this organization.\n');
      console.log('To see costs in the Monthly Spend chart:');
      console.log('1. Create features in your projects');
      console.log('2. Either:');
      console.log('   - Generate sample usage data: node src/scripts/generateUsageData.js ' + organizationId);
      console.log('   - Or make actual API calls through your features');
      process.exit(0);
    }

    console.log(`Found ${features.length} feature(s):\n`);

    let totalCost = 0;
    let totalTokens = 0;
    let totalRequests = 0;
    let hasUsageHistory = false;

    for (const feature of features) {
      const cost = feature.stats?.totalCost || 0;
      const tokens = feature.stats?.totalTokens || 0;
      const requests = feature.stats?.totalRequests || 0;
      const historyCount = feature.usageHistory?.length || 0;

      totalCost += cost;
      totalTokens += tokens;
      totalRequests += requests;

      console.log(`Feature: ${feature.name}`);
      console.log(`  Status: ${feature.status}`);
      console.log(`  Total Cost: $${cost.toFixed(4)}`);
      console.log(`  Total Tokens: ${tokens}`);
      console.log(`  Total Requests: ${requests}`);
      console.log(`  Usage History Records: ${historyCount}`);
      if (historyCount > 0) {
        hasUsageHistory = true;
        console.log(`  Last Used: ${feature.stats?.lastUsedAt || 'N/A'}`);
      }
      console.log('');
    }

    console.log('=== SUMMARY ===');
    console.log(`Total Features: ${features.length}`);
    console.log(`Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`Total Tokens: ${totalTokens}`);
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Has Usage History: ${hasUsageHistory ? 'Yes' : 'No'}\n`);

    if (!hasUsageHistory || totalCost === 0) {
      console.log('⚠️  NO REAL USAGE DATA FOUND!\n');
      console.log('The Monthly Spend chart needs usage history to display data.\n');
      console.log('OPTIONS:');
      console.log('');
      console.log('Option 1: Generate sample usage data (for testing)');
      console.log('  Run: node src/scripts/generateUsageData.js ' + organizationId);
      console.log('');
      console.log('Option 2: Make actual API calls through your features');
      console.log('  This will automatically track tokens and costs.');
      console.log('');
      console.log('Option 3: Create a simulation with cost projections');
      console.log('  But your simulations need features with token usage to project costs.');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkFeatures();