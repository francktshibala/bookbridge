#!/usr/bin/env npx ts-node

/**
 * Test AI complexity adaptation across education levels
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { ComplexityAdaptationTester } from '../lib/benchmarking/complexity-adaptation-tester';

async function main() {
  const tester = new ComplexityAdaptationTester();
  
  console.log('🎯 Testing AI Complexity Adaptation...');
  
  // Test questions that should show clear adaptation
  const testQuestions = [
    "What is the main theme of To Kill a Mockingbird?",
    "Explain the symbolism of the green light in The Great Gatsby?",
    "How does Shakespeare use dramatic irony in Romeo and Juliet?"
  ];
  
  try {
    const { results, summary } = await tester.runAdaptationTestSuite(testQuestions);
    
    // Print detailed summary
    console.log(`\n📊 COMPLEXITY ADAPTATION SUMMARY`);
    console.log('='.repeat(50));
    console.log(`📈 Average Adaptation Score: ${summary.averageAdaptationScore}/100`);
    console.log(`🔄 Average Consistency Score: ${summary.averageConsistencyScore}/100`);
    
    console.log(`\n📋 PERFORMANCE BY EDUCATION LEVEL`);
    console.log('='.repeat(40));
    Object.entries(summary.levelPerformance).forEach(([level, score]) => {
      const status = score >= 80 ? '✅' : score >= 70 ? '⚠️' : '❌';
      console.log(`${status} ${level.replace('_', ' ').toUpperCase()}: ${score}/100`);
    });
    
    if (summary.overallRecommendations.length > 0) {
      console.log(`\n💡 TOP RECOMMENDATIONS`);
      console.log('='.repeat(25));
      summary.overallRecommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
    
    console.log('\n✅ Complexity adaptation testing complete!');
    
  } catch (error) {
    console.error('❌ Adaptation testing failed:', error);
    process.exit(1);
  }
}

main();