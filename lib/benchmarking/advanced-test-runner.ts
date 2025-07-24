import { RACCCAScorer, RACCCAScore, TestQuestion } from './raccca-scorer';
import OpenAI from 'openai';

export interface AdvancedTestResult {
  questionId: string;
  question: string;
  aiResponse: string;
  raccca: RACCCAScore;
  timestamp: Date;
  metadata: {
    difficulty: string;
    category: string;
    userLevel: string;
    responseTime: number;
    tokenCount: number;
  };
}

export interface BenchmarkSummary {
  totalTests: number;
  overallScore: number;
  passRate: number;
  dimensionalScores: {
    relevance: number;
    accuracy: number;
    completeness: number;
    clarity: number;
    coherence: number;
    appropriateness: number;
  };
  performanceByDifficulty: Record<string, number>;
  performanceByCategory: Record<string, number>;
  criticalFailures: string[];
  recommendations: string[];
}

export class AdvancedBenchmarkTestRunner {
  private openai: OpenAI;
  private scorer: RACCCAScorer;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.scorer = new RACCCAScorer();
  }

  /**
   * Run comprehensive test with advanced scoring
   */
  async runAdvancedTest(question: TestQuestion): Promise<AdvancedTestResult> {
    console.log(`🚀 Running advanced test: ${question.id}`);
    const startTime = Date.now();

    // Generate AI response with educational context
    const aiResponse = await this.generateEducationalResponse(question);
    const responseTime = Date.now() - startTime;

    // Advanced R.A.C.C.C.A. scoring
    const raccca = await this.scorer.scoreResponse(question, aiResponse);

    // Token counting for cost analysis
    const tokenCount = this.estimateTokenCount(question.question + aiResponse);

    return {
      questionId: question.id,
      question: question.question,
      aiResponse,
      raccca,
      timestamp: new Date(),
      metadata: {
        difficulty: question.difficulty,
        category: question.category,
        userLevel: question.userLevel || 'high_school',
        responseTime,
        tokenCount
      }
    };
  }

  /**
   * Generate educational AI response optimized for teaching
   */
  private async generateEducationalResponse(question: TestQuestion): Promise<string> {
    const userLevel = question.userLevel || 'high_school';
    
    // Adaptive system prompt based on user level
    const systemPrompts = {
      middle_school: `You are a friendly literature teacher for middle school students (ages 11-14). 
Use simple language, relatable examples, and encourage curiosity. Keep explanations clear and engaging.`,
      
      high_school: `You are an experienced high school English teacher. 
Provide thoughtful analysis appropriate for teenagers, using examples they can understand while introducing literary concepts.`,
      
      college: `You are a college literature professor. 
Provide sophisticated analysis with academic rigor, proper terminology, and multiple interpretative perspectives.`,
      
      graduate: `You are a graduate-level literature scholar. 
Offer nuanced analysis with theoretical frameworks, scholarly debate context, and advanced critical thinking.`
    };

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompts[userLevel]
        },
        {
          role: 'user',
          content: question.question
        }
      ],
      max_tokens: 600,
      temperature: 0.2 // Low temperature for consistency
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Run comprehensive benchmark suite
   */
  async runBenchmarkSuite(questions: TestQuestion[]): Promise<{
    results: AdvancedTestResult[];
    summary: BenchmarkSummary;
  }> {
    console.log(`\n🎯 Starting Comprehensive Benchmark Suite`);
    console.log(`📝 Testing ${questions.length} questions with R.A.C.C.C.A. framework`);
    
    const results: AdvancedTestResult[] = [];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`\n[${i + 1}/${questions.length}] Testing: ${question.id}`);
      
      try {
        const result = await this.runAdvancedTest(question);
        results.push(result);
        
        // Progress indicator
        const score = result.raccca.overall;
        const status = score >= 85 ? '✅' : score >= 75 ? '⚠️' : '❌';
        console.log(`${status} Score: ${score}/100 (R:${result.raccca.relevance} A:${result.raccca.accuracy} C:${result.raccca.completeness})`);
        
        // Delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`❌ Error testing ${question.id}:`, error);
      }
    }

    // Generate comprehensive summary
    const summary = this.generateBenchmarkSummary(results);
    
    console.log(`\n📊 BENCHMARK SUITE COMPLETE`);
    console.log(`📈 Overall Score: ${summary.overallScore}/100`);
    console.log(`🎯 Pass Rate: ${summary.passRate}%`);
    
    return { results, summary };
  }

  /**
   * Generate comprehensive benchmark summary with insights
   */
  private generateBenchmarkSummary(results: AdvancedTestResult[]): BenchmarkSummary {
    const totalTests = results.length;
    
    // Calculate dimensional averages
    const dimensionalScores = {
      relevance: Math.round(results.reduce((sum, r) => sum + r.raccca.relevance, 0) / totalTests),
      accuracy: Math.round(results.reduce((sum, r) => sum + r.raccca.accuracy, 0) / totalTests),
      completeness: Math.round(results.reduce((sum, r) => sum + r.raccca.completeness, 0) / totalTests),
      clarity: Math.round(results.reduce((sum, r) => sum + r.raccca.clarity, 0) / totalTests),
      coherence: Math.round(results.reduce((sum, r) => sum + r.raccca.coherence, 0) / totalTests),
      appropriateness: Math.round(results.reduce((sum, r) => sum + r.raccca.appropriateness, 0) / totalTests)
    };

    const overallScore = Math.round(results.reduce((sum, r) => sum + r.raccca.overall, 0) / totalTests);
    const passedTests = results.filter(r => r.raccca.overall >= 85).length;
    const passRate = Math.round((passedTests / totalTests) * 100);

    // Performance by difficulty
    const performanceByDifficulty = this.groupPerformanceBy(results, 'difficulty');
    const performanceByCategory = this.groupPerformanceBy(results, 'category');

    // Identify critical failures (< 75% score)
    const criticalFailures = results
      .filter(r => r.raccca.overall < 75)
      .map(r => `${r.questionId}: ${r.raccca.overall}/100 (${r.metadata.difficulty})`);

    // Generate AI recommendations
    const recommendations = this.generateRecommendations(dimensionalScores, performanceByDifficulty);

    return {
      totalTests,
      overallScore,
      passRate,
      dimensionalScores,
      performanceByDifficulty,
      performanceByCategory,
      criticalFailures,
      recommendations
    };
  }

  /**
   * Group performance by metadata field
   */
  private groupPerformanceBy(results: AdvancedTestResult[], field: keyof AdvancedTestResult['metadata']): Record<string, number> {
    const groups: Record<string, number[]> = {};
    
    results.forEach(result => {
      const key = result.metadata[field] as string;
      if (!groups[key]) groups[key] = [];
      groups[key].push(result.raccca.overall);
    });

    const averages: Record<string, number> = {};
    Object.entries(groups).forEach(([key, scores]) => {
      averages[key] = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    });

    return averages;
  }

  /**
   * Generate AI-powered recommendations for improvement
   */
  private generateRecommendations(
    dimensionalScores: Record<string, number>,
    performanceByDifficulty: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];
    const targets = { relevance: 95, accuracy: 98, completeness: 90, clarity: 85, coherence: 90, appropriateness: 88 };

    // Dimensional recommendations
    Object.entries(dimensionalScores).forEach(([dimension, score]) => {
      const target = targets[dimension as keyof typeof targets];
      if (score < target) {
        const gap = target - score;
        switch (dimension) {
          case 'relevance':
            recommendations.push(`Improve relevance (+${gap}pts): Focus responses more directly on question intent`);
            break;
          case 'accuracy':
            recommendations.push(`Improve accuracy (+${gap}pts): Verify factual claims and literary interpretations`);
            break;
          case 'completeness':
            recommendations.push(`Improve completeness (+${gap}pts): Ensure all aspects of question are addressed`);
            break;
          case 'clarity':
            recommendations.push(`Improve clarity (+${gap}pts): Simplify language and improve structure`);
            break;
          case 'coherence':
            recommendations.push(`Improve coherence (+${gap}pts): Add better transitions and logical flow`);
            break;
          case 'appropriateness':
            recommendations.push(`Improve appropriateness (+${gap}pts): Better adapt to user education level`);
            break;
        }
      }
    });

    // Difficulty-based recommendations
    const difficultyConcerns = Object.entries(performanceByDifficulty)
      .filter(([_, score]) => score < 80)
      .map(([difficulty, score]) => `${difficulty} questions (${score}/100)`);
    
    if (difficultyConcerns.length > 0) {
      recommendations.push(`Address weak performance in: ${difficultyConcerns.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Estimate token count for cost analysis
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Export results for expert validation
   */
  exportForExpertReview(results: AdvancedTestResult[]): string {
    const exportData = results.map(result => ({
      questionId: result.questionId,
      question: result.question,
      aiResponse: result.aiResponse,
      difficulty: result.metadata.difficulty,
      category: result.metadata.category,
      userLevel: result.metadata.userLevel,
      overallScore: result.raccca.overall,
      dimensionalScores: {
        relevance: result.raccca.relevance,
        accuracy: result.raccca.accuracy,
        completeness: result.raccca.completeness,
        clarity: result.raccca.clarity,
        coherence: result.raccca.coherence,
        appropriateness: result.raccca.appropriateness
      }
    }));

    return JSON.stringify(exportData, null, 2);
  }
}