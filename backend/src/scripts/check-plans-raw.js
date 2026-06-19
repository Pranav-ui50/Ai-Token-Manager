/**
 * Debug Script: Check Raw MongoDB Documents
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function check() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Get raw documents using native MongoDB driver
    const db = mongoose.connection.db;
    const plansCollection = db.collection('plans');

    console.log('========================================');
    console.log('RAW MONGODB DOCUMENTS');
    console.log('========================================\n');

    const plans = await plansCollection.find({}).toArray();

    for (const plan of plans) {
      console.log(`Plan: ${plan.name} (${plan._id})`);
      console.log('Raw limits object:', JSON.stringify(plan.limits, null, 2));
      console.log('maxProjects:', plan.limits?.maxProjects, '(type:', typeof plan.limits?.maxProjects, ')');
      console.log('maxFeatures:', plan.limits?.maxFeatures, '(type:', typeof plan.limits?.maxFeatures, ')');
      console.log('maxSimulations:', plan.limits?.maxSimulations, '(type:', typeof plan.limits?.maxSimulations, ')');
      console.log('---');
    }

    // Check if the fields are in the document
    console.log('\n========================================');
    console.log('CHECKING FIELD EXISTENCE');
    console.log('========================================\n');

    for (const plan of plans) {
      const hasLimits = 'limits' in plan;
      const hasMaxProjects = plan.limits && 'maxProjects' in plan.limits;
      const hasMaxFeatures = plan.limits && 'maxFeatures' in plan.limits;
      const hasMaxSimulations = plan.limits && 'maxSimulations' in plan.limits;

      console.log(`Plan ${plan.name}:`);
      console.log(`  - Has limits object: ${hasLimits}`);
      console.log(`  - Has maxProjects field: ${hasMaxProjects}`);
      console.log(`  - Has maxFeatures field: ${hasMaxFeatures}`);
      console.log(`  - Has maxSimulations field: ${hasMaxSimulations}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected');
  }
}

check();