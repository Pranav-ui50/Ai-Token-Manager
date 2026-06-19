/**
 * Generate sample usage data for testing
 *
 * Usage: node src/scripts/generateUsageData.js <organizationId> <days>
 * Example: node src/scripts/generateUsageData.js 6a33878cb4ac2119f363b393 30
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/api-token-manager';

// Simple Feature schema
const featureSchema = new mongoose.Schema({
  name: String,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  status: { type: String, default: 'active' },
  stats: {
    totalRequests: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    lastUsedAt: Date
  },
  usageHistory: [{
    date: Date,
    requests: Number,
    tokens: Number,
    inputTokens: Number,
    outputTokens: Number,
    cost: Number,
    errorCount: { type: Number, default: 0 },
    avgLatency: { type: Number, default: 0 }
  }],
  infrastructureCost: {
    fixedPerRequest: { type: Number, default: 0 },
    overheadPercent: { type: Number, default: 0 },
    monthlyFixed: { type: Number, default: 0 }
  }
}, { timestamps: true });

const Feature = mongoose.model('Feature', featureSchema);

async function generateUsageData() {
  const organizationId = process.argv[2];
  const days = parseInt(process.argv[3]) || 30;

  if (!organizationId) {
    console.log('Usage: node src/scripts/generateUsageData.js <organizationId> [days]');
    console.log('Example: node src/scripts/generateUsageData.js 6a33878cb4ac2119f363b393 30');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find features for this organization
    const features = await Feature.find({ organization: organizationId });

    if (features.length === 0) {
      console.log(`No features found for organization: ${organizationId}`);
      console.log('Please create features first before generating usage data.');
      process.exit(0);
    }

    console.log(`Found ${features.length} features for organization`);
    console.log(`Generating ${days} days of usage data...\n`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalGenerated = 0;

    for (const feature of features) {
      console.log(`Processing feature: ${feature.name}`);

      // Generate random usage for each day
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        // Generate random usage (varying amounts)
        const baseRequests = Math.floor(Math.random() * 100) + 50; // 50-150 requests
        const baseTokens = Math.floor(Math.random() * 50000) + 10000; // 10k-60k tokens
        const baseCost = (Math.random() * 5) + 1; // $1-$6

        // Add some variation - weekends have less traffic
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const multiplier = isWeekend ? 0.6 : 1.0;

        const requests = Math.floor(baseRequests * multiplier);
        const tokens = Math.floor(baseTokens * multiplier);
        const inputTokens = Math.floor(tokens * 0.7); // 70% input tokens
        const outputTokens = tokens - inputTokens; // 30% output tokens
        const cost = parseFloat((baseCost * multiplier).toFixed(4));

        // Add to usage history
        feature.usageHistory.push({
          date,
          requests,
          tokens,
          inputTokens,
          outputTokens,
          cost,
          errorCount: Math.floor(Math.random() * 3), // 0-2 errors
          avgLatency: Math.floor(Math.random() * 500) + 100 // 100-600ms
        });

        // Update stats
        feature.stats.totalRequests += requests;
        feature.stats.totalTokens += tokens;
        feature.stats.totalCost += cost;

        totalGenerated++;
      }

      // Keep only last 90 days
      if (feature.usageHistory.length > 90) {
        feature.usageHistory = feature.usageHistory.slice(-90);
      }

      feature.stats.lastUsedAt = new Date();
      await feature.save();
      console.log(`  ✓ Added usage data for ${days} days`);
    }

    console.log(`\n========================================`);
    console.log(`Generated usage data for ${features.length} features`);
    console.log(`Total records: ${totalGenerated}`);
    console.log(`Date range: ${days} days`);
    console.log(`========================================\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

generateUsageData();