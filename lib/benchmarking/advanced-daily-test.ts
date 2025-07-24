import { AdvancedBenchmarkTestRunner, AdvancedTestResult } from './advanced-test-runner';
import { QuestionManager } from './question-manager';
import { BenchmarkLogger } from './logger';
import fs from 'fs/promises';
import path from 'path';

/**
 * Advanced daily benchmark testing with R.A.C.C.C.A. framework
 */
export class AdvancedDailyBenchmarkTest {
  private testRunner: AdvancedBenchmarkTestRunner;
  private questionManager: QuestionManager;
  private logger: BenchmarkLogger;

  constructor() {
    this.testRunner = new AdvancedBenchmarkTestRunner();
    this.questionManager = new QuestionManager();
    this.logger = new BenchmarkLogger();
  }

  /**
   * Run advanced daily test with comprehensive scoring
   */
  async runAdvancedDailyTest(): Promise<void> {
    console.log('🚀 Starting Advanced Daily AI Benchmark Test...');
    console.log('📊 Using R.A.C.C.C.A. Framework for comprehensive evaluation');
    
    const startTime = Date.now();

    try {
      // Get balanced questions for today
      const questions = await this.questionManager.getDailyTestQuestions();
      
      // Run comprehensive benchmark
      const { results, summary } = await this.testRunner.runBenchmarkSuite(questions);

      // Save detailed results
      await this.saveAdvancedResults(results, summary);

      // Print comprehensive summary
      this.printAdvancedSummary(summary, Date.now() - startTime);

      // Generate alerts if performance issues detected
      this.generatePerformanceAlerts(summary);

    } catch (error) {
      console.error('❌ Advanced daily test failed:', error);
      throw error;
    }
  }

  /**
   * Run quick advanced test with 3 questions
   */
  async runQuickAdvancedTest(): Promise<void> {
    console.log('⚡ Running Quick Advanced Benchmark Test...');
    
    try {
      const questions = await this.questionManager.getRandomQuestions(3);
      const { results, summary } = await this.testRunner.runBenchmarkSuite(questions);
      
      console.log(`\n⚡ QUICK TEST RESULTS`);
      console.log(`📊 Overall Score: ${summary.overallScore}/100`);
      console.log(`🎯 Pass Rate: ${summary.passRate}%`);
      
      // Show dimensional breakdown
      console.log(`\n📈 Dimensional Scores:`);
      console.log(`   Relevance: ${summary.dimensionalScores.relevance}/100 (Target: 95+)`);
      console.log(`   Accuracy: ${summary.dimensionalScores.accuracy}/100 (Target: 98+)`);
      console.log(`   Completeness: ${summary.dimensionalScores.completeness}/100 (Target: 90+)`);
      console.log(`   Clarity: ${summary.dimensionalScores.clarity}/100 (Target: 85+)`);
      console.log(`   Coherence: ${summary.dimensionalScores.coherence}/100 (Target: 90+)`);
      console.log(`   Appropriateness: ${summary.dimensionalScores.appropriateness}/100 (Target: 88+)`);

    } catch (error) {
      console.error('❌ Quick advanced test failed:', error);
    }
  }

  /**
   * Save advanced results with detailed analysis
   */
  private async saveAdvancedResults(results: AdvancedTestResult[], summary: any): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `advanced_benchmark_${timestamp}.json`;
    const logDir = path.join(process.cwd(), 'lib', 'benchmarking', 'data', 'logs');
    
    // Ensure directory exists
    await fs.mkdir(logDir, { recursive: true });
    
    const advancedLog = {
      timestamp: new Date().toISOString(),
      testType: 'Advanced R.A.C.C.C.A. Benchmark',
      summary,
      results: results.map(r => ({
        questionId: r.questionId,
        question: r.question,
        aiResponse: r.aiResponse,
        raccca: r.raccca,
        metadata: r.metadata
      })),
      expertReviewExport: this.testRunner.exportForExpertReview(results)
    };

    const filepath = path.join(logDir, filename);
    await fs.writeFile(filepath, JSON.stringify(advancedLog, null, 2));
    
    console.log(`📁 Advanced results saved: ${filepath}`);
  }

  /**
   * Print comprehensive summary with insights
   */
  private printAdvancedSummary(summary: any, duration: number): void {
    console.log(`\n📊 ADVANCED BENCHMARK SUMMARY`);
    console.log('='.repeat(50));
    
    // Overall performance
    console.log(`📈 Overall Score: ${summary.overallScore}/100`);
    console.log(`🎯 Pass Rate: ${summary.passRate}% (${summary.totalTests} tests)`);
    console.log(`⏱️  Duration: ${Math.round(duration / 1000)}s`);
    
    // R.A.C.C.C.A. dimensional analysis
    console.log(`\n📋 R.A.C.C.C.A. DIMENSIONAL ANALYSIS`);
    console.log('='.repeat(40));
    
    const dims = summary.dimensionalScores;
    const targets = { relevance: 95, accuracy: 98, completeness: 90, clarity: 85, coherence: 90, appropriateness: 88 };
    
    Object.entries(dims).forEach(([dim, score]: [string, any]) => {
      const target = targets[dim as keyof typeof targets];
      const status = score >= target ? '✅' : score >= target - 5 ? '⚠️' : '❌';
      const gap = Math.max(0, target - score);
      console.log(`${status} ${dim.toUpperCase()}: ${score}/100 (Target: ${target}+) ${gap > 0 ? `Gap: ${gap}` : ''}`);
    });

    // Performance by difficulty
    if (Object.keys(summary.performanceByDifficulty).length > 0) {
      console.log(`\n📊 PERFORMANCE BY DIFFICULTY`);
      console.log('='.repeat(30));
      Object.entries(summary.performanceByDifficulty).forEach(([difficulty, score]: [string, any]) => {
        const status = score >= 85 ? '✅' : score >= 75 ? '⚠️' : '❌';
        console.log(`${status} ${difficulty.toUpperCase()}: ${score}/100`);
      });
    }

    // Critical failures
    if (summary.criticalFailures.length > 0) {
      console.log(`\n🚨 CRITICAL FAILURES (< 75%)`);
      console.log('='.repeat(25));
      summary.criticalFailures.forEach((failure: string) => {
        console.log(`❌ ${failure}`);
      });
    }

    // Recommendations
    if (summary.recommendations.length > 0) {
      console.log(`\n💡 IMPROVEMENT RECOMMENDATIONS`);
      console.log('='.repeat(30));
      summary.recommendations.forEach((rec: string, i: number) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
  }

  /**
   * Generate performance alerts for immediate attention
   */
  private generatePerformanceAlerts(summary: any): void {
    const alerts: string[] = [];

    // Overall performance alerts
    if (summary.overallScore < 85) {
      alerts.push(`🚨 CRITICAL: Overall score ${summary.overallScore}/100 below target (85%)`);
    }
    
    if (summary.passRate < 80) {
      alerts.push(`⚠️  WARNING: Pass rate ${summary.passRate}% below target (80%)`);
    }

    // Dimensional alerts
    const criticalDimensions = Object.entries(summary.dimensionalScores)
      .filter(([dim, score]: [string, any]) => {
        const targets = { relevance: 95, accuracy: 98, completeness: 90, clarity: 85, coherence: 90, appropriateness: 88 };
        return score < targets[dim as keyof typeof targets] - 10; // 10+ points below target
      });

    if (criticalDimensions.length > 0) {
      alerts.push(`🔍 ATTENTION NEEDED: ${criticalDimensions.map(([dim]) => dim).join(', ')} significantly below target`);
    }

    // Print alerts
    if (alerts.length > 0) {
      console.log(`\n🚨 PERFORMANCE ALERTS`);
      console.log('='.repeat(20));
      alerts.forEach(alert => console.log(alert));
      console.log('\n👉 Immediate review and optimization recommended');
    } else {
      console.log(`\n✅ ALL TARGETS MET - AI performing within acceptable parameters`);
    }
  }

  /**
   * Compare performance trends over time
   */
  async getAdvancedPerformanceTrend(days: number = 7): Promise<void> {
    console.log(`📈 Analyzing Advanced Performance Trend (last ${days} days)...`);

    try {
      const logDir = path.join(process.cwd(), 'lib', 'benchmarking', 'data', 'logs');
      const files = await fs.readdir(logDir);
      
      const recentFiles = files
        .filter(f => f.startsWith('advanced_benchmark_'))
        .sort()
        .slice(-days);

      if (recentFiles.length === 0) {
        console.log('📊 No advanced benchmark history found. Run advanced tests to build trend data.');
        return;
      }

      console.log('\n📊 ADVANCED PERFORMANCE TREND');
      console.log('='.repeat(60));
      console.log('Date'.padEnd(12) + 'Overall'.padEnd(10) + 'R'.padEnd(5) + 'A'.padEnd(5) + 'C'.padEnd(5) + 'C'.padEnd(5) + 'C'.padEnd(5) + 'A'.padEnd(5));
      console.log('-'.repeat(60));

      for (const file of recentFiles) {
        const data = JSON.parse(await fs.readFile(path.join(logDir, file), 'utf-8'));
        const date = new Date(data.timestamp).toLocaleDateString();
        const s = data.summary;
        
        const trend = s.overallScore >= 85 ? '✅' : s.overallScore >= 75 ? '⚠️' : '❌';
        console.log(
          `${trend} ${date.padEnd(10)}` +
          `${s.overallScore.toString().padEnd(8)}` +
          `${s.dimensionalScores.relevance.toString().padEnd(4)}` +
          `${s.dimensionalScores.accuracy.toString().padEnd(4)}` +
          `${s.dimensionalScores.completeness.toString().padEnd(4)}` +
          `${s.dimensionalScores.clarity.toString().padEnd(4)}` +
          `${s.dimensionalScores.coherence.toString().padEnd(4)}` +
          `${s.dimensionalScores.appropriateness.toString().padEnd(4)}`
        );
      }

    } catch (error) {
      console.error('❌ Error analyzing trends:', error);
    }
  }
}

/**
 * CLI interface for advanced benchmarking
 */
export async function runAdvancedBenchmarkCLI() {
  const args = process.argv.slice(2);
  const command = args[0] || 'daily';

  const advancedTest = new AdvancedDailyBenchmarkTest();

  switch (command) {
    case 'daily':
      await advancedTest.runAdvancedDailyTest();
      break;
    
    case 'quick':
      await advancedTest.runQuickAdvancedTest();
      break;
    
    case 'trend':
      const days = parseInt(args[1]) || 7;
      await advancedTest.getAdvancedPerformanceTrend(days);
      break;
    
    default:
      console.log('Advanced Benchmark Usage:');
      console.log('  npm run benchmark:advanced        # Run daily R.A.C.C.C.A. test');
      console.log('  npm run benchmark:advanced quick  # Run 3-question test');
      console.log('  npm run benchmark:advanced trend  # Show performance trend');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  runAdvancedBenchmarkCLI().catch(console.error);
}