#!/usr/bin/env npx ts-node

/**
 * Generate comprehensive question database (1000+ questions)
 * Usage: npx ts-node scripts/generate-questions.ts
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { QuestionGenerator } from '../lib/benchmarking/question-generator';

async function main() {
  const generator = new QuestionGenerator();
  
  console.log('🚀 Starting comprehensive question database generation...');
  console.log('⏱️  This will take 10-15 minutes due to AI generation and rate limits');
  
  try {
    await generator.generateComprehensiveDatabase();
    console.log('✅ Question database generation complete!');
  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

main();