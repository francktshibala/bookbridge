#!/usr/bin/env npx ts-node

/**
 * Advanced benchmark runner script with R.A.C.C.C.A. framework
 * Usage:
 *   npx ts-node scripts/run-advanced-benchmark.ts daily
 *   npx ts-node scripts/run-advanced-benchmark.ts quick  
 *   npx ts-node scripts/run-advanced-benchmark.ts trend
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { runAdvancedBenchmarkCLI } from '../lib/benchmarking/advanced-daily-test';

runAdvancedBenchmarkCLI().catch((error) => {
  console.error('❌ Advanced benchmark failed:', error);
  process.exit(1);
});