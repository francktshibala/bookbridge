#!/usr/bin/env npx ts-node

/**
 * Test AI citation accuracy and MLA format compliance
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { CitationAccuracyTester } from '../lib/benchmarking/citation-accuracy-tester';

async function main() {
  const tester = new CitationAccuracyTester();
  
  console.log('📚 Testing AI Citation Accuracy & MLA Format Compliance...');
  
  try {
    const { results, summary } = await tester.runCitationTestSuite();
    
    // Print detailed summary
    console.log(`\n📊 CITATION ACCURACY SUMMARY`);
    console.log('='.repeat(50));
    console.log(`📈 Average Citation Score: ${summary.averageCitationScore}/100 (Target: 95%+)`);
    console.log(`📝 Average Format Score: ${summary.averageFormatScore}/100 (Target: 95%+)`);
    console.log(`📋 Average Completeness Score: ${summary.averageCompletenessScore}/100 (Target: 90%+)`);
    console.log(`🔗 Average Integration Score: ${summary.averageIntegrationScore}/100 (Target: 85%+)`);
    
    console.log(`\n📋 PERFORMANCE BY CATEGORY`);
    console.log('='.repeat(35));
    Object.entries(summary.categoryPerformance).forEach(([category, score]) => {
      const status = score >= 90 ? '✅' : score >= 80 ? '⚠️' : '❌';
      console.log(`${status} ${category.toUpperCase()}: ${score}/100`);
    });
    
    if (summary.topRecommendations.length > 0) {
      console.log(`\n💡 TOP RECOMMENDATIONS`);
      console.log('='.repeat(25));
      summary.topRecommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
    
    console.log('\n✅ Citation accuracy testing complete!');
    
  } catch (error) {
    console.error('❌ Citation testing failed:', error);
    process.exit(1);
  }
}

main();