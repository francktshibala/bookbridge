import { SimpleBenchmarkTestRunner } from './simple-test-runner';
import { QuestionManager } from './question-manager';
import { BenchmarkLogger } from './logger';

/**
 * Daily benchmark testing script
 * Runs 10 balanced questions and logs results
 */
export class DailyBenchmarkTest {
  private testRunner: SimpleBenchmarkTestRunner;
  private questionManager: QuestionManager;
  private logger: BenchmarkLogger;

  constructor() {
    this.testRunner = new SimpleBenchmarkTestRunner();
    this.questionManager = new QuestionManager();
    this.logger = new BenchmarkLogger();
  }

  /**
   * Run daily benchmark test
   */
  async runDailyTest(): Promise<void> {
    console.log('🚀 Starting daily AI benchmark test...');
    const startTime = Date.now();

    try {
      // Get 10 balanced questions for today
      const questions = await this.questionManager.getDailyTestQuestions();
      console.log(`📝 Testing ${questions.length} questions...`);

      // Run the tests
      const results = await this.testRunner.runTests(questions);

      // Calculate summary
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      const passCount = results.filter(r => r.score >= 85).length;
      const failCount = results.length - passCount;

      // Log results
      const filename = await this.logger.saveResults(results, 'daily_test');

      // Print summary
      console.log('\n📊 DAILY TEST SUMMARY');
      console.log('='.repeat(40));
      console.log(`📈 Average Score: ${Math.round(avgScore)}/100`);
      console.log(`✅ Passed: ${passCount}/${results.length} (${Math.round((passCount/results.length)*100)}%)`);
      console.log(`❌ Failed: ${failCount}/${results.length}`);
      console.log(`⏱️  Duration: ${Math.round((Date.now() - startTime) / 1000)}s`);
      console.log(`📁 Results saved: ${filename}`);

      // Alert if performance is concerning
      if (avgScore < 85) {
        console.log('\n⚠️  WARNING: Average score below target (85%)');
        console.log('   Consider reviewing AI responses and prompts');
      }

      if (passCount < 8) {
        console.log('\n🚨 ALERT: Less than 80% of tests passed');
        console.log('   Immediate attention required');
      }

    } catch (error) {
      console.error('❌ Daily test failed:', error);
      throw error;
    }
  }

  /**
   * Run a quick 3-question test (for development)
   */
  async runQuickTest(): Promise<void> {
    console.log('⚡ Running quick benchmark test (3 questions)...');

    try {
      const questions = await this.questionManager.getRandomQuestions(3);
      const results = await this.testRunner.runTests(questions);
      
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      console.log(`\n⚡ Quick Test Result: ${Math.round(avgScore)}/100`);

    } catch (error) {
      console.error('❌ Quick test failed:', error);
    }
  }

  /**
   * Compare performance over time
   */
  async getPerformanceTrend(days: number = 7): Promise<void> {
    console.log(`📈 Analyzing performance trend (last ${days} days)...`);

    try {
      const files = await this.logger.getTestFiles();
      const recentFiles = files
        .filter(f => f.startsWith('daily_test_'))
        .sort()
        .slice(-days);

      if (recentFiles.length === 0) {
        console.log('📊 No historical data found. Run daily tests to build trend data.');
        return;
      }

      console.log('\n📊 PERFORMANCE TREND');
      console.log('='.repeat(50));

      for (const file of recentFiles) {
        const data = await this.logger.loadResults(file);
        const date = new Date(data.timestamp).toLocaleDateString();
        const score = data.summary.averageScore;
        const passRate = data.summary.passRate;
        
        const trend = score >= 85 ? '✅' : score >= 75 ? '⚠️' : '❌';
        console.log(`${trend} ${date}: ${score}/100 (${passRate}% pass rate)`);
      }

    } catch (error) {
      console.error('❌ Error analyzing trends:', error);
    }
  }
}

/**
 * CLI interface for running tests
 */
export async function runBenchmarkCLI() {
  const args = process.argv.slice(2);
  const command = args[0] || 'daily';

  const dailyTest = new DailyBenchmarkTest();

  switch (command) {
    case 'daily':
      await dailyTest.runDailyTest();
      break;
    
    case 'quick':
      await dailyTest.runQuickTest();
      break;
    
    case 'trend':
      const days = parseInt(args[1]) || 7;
      await dailyTest.getPerformanceTrend(days);
      break;
    
    default:
      console.log('Usage:');
      console.log('  npm run benchmark        # Run daily test');
      console.log('  npm run benchmark quick  # Run 3-question test');
      console.log('  npm run benchmark trend  # Show performance trend');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  runBenchmarkCLI().catch(console.error);
}