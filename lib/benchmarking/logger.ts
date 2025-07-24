import { TestResult } from './test-runner';
import fs from 'fs/promises';
import path from 'path';

export class BenchmarkLogger {
  private logDir: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'lib', 'benchmarking', 'data', 'logs');
  }

  /**
   * Save test results to a JSON file
   */
  async saveResults(results: TestResult[], testName?: string): Promise<string> {
    // Ensure log directory exists
    await this.ensureLogDirExists();

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${testName || 'benchmark'}_${timestamp}.json`;
    const filepath = path.join(this.logDir, filename);

    // Calculate summary stats
    const summary = this.calculateSummary(results);

    // Create log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      testName: testName || 'General Benchmark',
      summary,
      results
    };

    // Save to file
    await fs.writeFile(filepath, JSON.stringify(logEntry, null, 2));
    
    console.log(`📝 Results saved to: ${filepath}`);
    console.log(`📊 Summary: ${summary.averageScore}/100 (${summary.passedCount}/${summary.totalTests} passed)`);

    return filepath;
  }

  /**
   * Load previous test results
   */
  async loadResults(filename: string): Promise<any> {
    const filepath = path.join(this.logDir, filename);
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Get list of all saved test files
   */
  async getTestFiles(): Promise<string[]> {
    try {
      await this.ensureLogDirExists();
      const files = await fs.readdir(this.logDir);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      return [];
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(results: TestResult[]) {
    const totalTests = results.length;
    const averageScore = totalTests > 0 ? 
      Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalTests) : 0;
    const passedCount = results.filter(r => r.score >= 85).length;
    const failedCount = totalTests - passedCount;

    // Category breakdown
    const scoresByCategory = results.reduce((acc, result) => {
      const category = 'general'; // We'll add categories later
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(result.score);
      return acc;
    }, {} as Record<string, number[]>);

    // Detailed scores
    const averageDetails = {
      relevance: Math.round(results.reduce((sum, r) => sum + r.details.relevance, 0) / totalTests),
      accuracy: Math.round(results.reduce((sum, r) => sum + r.details.accuracy, 0) / totalTests),
      completeness: Math.round(results.reduce((sum, r) => sum + r.details.completeness, 0) / totalTests),
      clarity: Math.round(results.reduce((sum, r) => sum + r.details.clarity, 0) / totalTests)
    };

    return {
      totalTests,
      averageScore,
      passedCount,
      failedCount,
      passRate: Math.round((passedCount / totalTests) * 100),
      averageDetails,
      scoresByCategory
    };
  }

  /**
   * Ensure the log directory exists
   */
  private async ensureLogDirExists(): Promise<void> {
    try {
      await fs.access(this.logDir);
    } catch {
      await fs.mkdir(this.logDir, { recursive: true });
    }
  }

  /**
   * Generate a simple text report
   */
  generateTextReport(results: TestResult[]): string {
    const summary = this.calculateSummary(results);
    
    let report = `
# Benchmark Test Report
Generated: ${new Date().toLocaleString()}
Total Tests: ${summary.totalTests}
Average Score: ${summary.averageScore}/100
Pass Rate: ${summary.passRate}% (${summary.passedCount}/${summary.totalTests})

## Score Breakdown
- Relevance: ${summary.averageDetails.relevance}/100
- Accuracy: ${summary.averageDetails.accuracy}/100  
- Completeness: ${summary.averageDetails.completeness}/100
- Clarity: ${summary.averageDetails.clarity}/100

## Individual Results
`;

    results.forEach((result, index) => {
      const status = result.score >= 85 ? '✅ PASS' : '❌ FAIL';
      report += `\n${index + 1}. ${status} (${result.score}/100)
   Q: ${result.question}
   A: ${result.aiResponse.substring(0, 100)}...
`;
    });

    return report;
  }
}