/**
 * Check simulations for an organization
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/api-token-manager';

const simulationSchema = new mongoose.Schema({
  name: String,
  type: String,
  status: String,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  results: {
    monthlyProjections: [{
      month: Number,
      year: Number,
      date: Date,
      costs: {
        totalCost: Number
      },
      tokens: {
        total: Number
      }
    }],
    summary: {
      totalProjectedCost: Number,
      totalProjectedRevenue: Number
    }
  },
  createdAt: Date
}, { timestamps: true });

const Simulation = mongoose.model('Simulation', simulationSchema);

async function checkSimulations() {
  const organizationId = process.argv[2];

  if (!organizationId) {
    console.log('Usage: node src/scripts/checkSimulations.js <organizationId>');
    console.log('Example: node src/scripts/checkSimulations.js 6a33878cb4ac2119f363b393');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find all simulations for the organization
    const simulations = await Simulation.find({ organization: organizationId })
      .sort({ createdAt: -1 })
      .lean();

    if (simulations.length === 0) {
      console.log('No simulations found for this organization.\n');
      console.log('To create a simulation:');
      console.log('1. Go to the frontend');
      console.log('2. Navigate to Simulations');
      console.log('3. Create and run a new simulation');
      process.exit(0);
    }

    console.log(`Found ${simulations.length} simulation(s):\n`);

    for (const sim of simulations) {
      console.log(`=== ${sim.name} ===`);
      console.log(`Status: ${sim.status}`);
      console.log(`Type: ${sim.type}`);
      console.log(`Created: ${sim.createdAt}`);

      if (sim.results?.monthlyProjections?.length > 0) {
        console.log(`\nMonthly Projections (${sim.results.monthlyProjections.length} months):`);
        for (const proj of sim.results.monthlyProjections) {
          console.log(`  Month ${proj.month || '?'}: Cost=$${(proj.costs?.totalCost || 0).toFixed(2)}, Tokens=${proj.tokens?.total || 0}`);
        }
        console.log(`\nSummary:`);
        console.log(`  Total Projected Cost: $${(sim.results.summary?.totalProjectedCost || 0).toFixed(2)}`);
        console.log(`  Total Projected Revenue: $${(sim.results.summary?.totalProjectedRevenue || 0).toFixed(2)}`);
      } else {
        console.log('\nNo monthly projections in results.');
        console.log('The simulation may not have been run yet or failed.');
      }
      console.log('\n---\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSimulations();