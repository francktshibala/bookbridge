#!/usr/bin/env npx ts-node

/**
 * Benchmark runner script
 * Usage:
 *   npx ts-node scripts/run-benchmark.ts daily
 *   npx ts-node scripts/run-benchmark.ts quick  
 *   npx ts-node scripts/run-benchmark.ts trend
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { runBenchmarkCLI } from '../lib/benchmarking/daily-test';

runBenchmarkCLI().catch((error) => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});