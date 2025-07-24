import { AccessibleAIService } from '../ai/service';

export interface TestQuestion {
  id: string;
  question: string;
  expectedAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

export interface TestResult {
  questionId: string;
  question: string;
  aiResponse: string;
  score: number;
  timestamp: Date;
  details: {
    relevance: number;    // 0-100
    accuracy: number;     // 0-100
    completeness: number; // 0-100
    clarity: number;      // 0-100
  };
}

export class BenchmarkTestRunner {
  private aiService: AccessibleAIService;

  constructor() {
    this.aiService = new AccessibleAIService();
  }

  /**
   * Run a single test question
   */
  async runSingleTest(question: TestQuestion): Promise<TestResult> {
    console.log(`Testing question: ${question.question}`);

    // Ask AI the question
    const aiResponse = await this.aiService.query(
      question.question,
      { 
        userId: 'benchmark-test',
        bookContext: 'general benchmark testing',
        maxTokens: 500, 
        temperature: 0.1 // Low temperature for consistent results
      }
    );

    // Score the response
    const score = await this.scoreResponse(question, aiResponse.content);

    return {
      questionId: question.id,
      question: question.question,
      aiResponse: aiResponse.content,
      score: score.overall,
      timestamp: new Date(),
      details: {
        relevance: score.relevance,
        accuracy: score.accuracy,
        completeness: score.completeness,
        clarity: score.clarity
      }
    };
  }

  /**
   * Simple scoring system - we'll improve this later
   */
  private async scoreResponse(question: TestQuestion, aiResponse: string): Promise<{
    overall: number;
    relevance: number;
    accuracy: number;
    completeness: number;
    clarity: number;
  }> {
    // Simple keyword matching for now (we'll make this smarter later)
    const expectedWords = question.expectedAnswer.toLowerCase().split(' ');
    const responseWords = aiResponse.toLowerCase().split(' ');
    
    // Count how many expected keywords appear in response
    const matchingWords = expectedWords.filter(word => 
      responseWords.some(responseWord => 
        responseWord.includes(word) || word.includes(responseWord)
      )
    );

    // Basic scoring logic
    const relevance = Math.min(100, (matchingWords.length / expectedWords.length) * 100);
    const accuracy = relevance; // For now, same as relevance
    const completeness = Math.min(100, (aiResponse.length / question.expectedAnswer.length) * 100);
    const clarity = aiResponse.length > 50 && aiResponse.length < 500 ? 85 : 70; // Prefer moderate length

    const overall = Math.round((relevance + accuracy + completeness + clarity) / 4);

    return {
      overall,
      relevance: Math.round(relevance),
      accuracy: Math.round(accuracy),
      completeness: Math.round(completeness),
      clarity
    };
  }

  /**
   * Run multiple tests
   */
  async runTests(questions: TestQuestion[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    console.log(`Running ${questions.length} benchmark tests...`);
    
    for (const question of questions) {
      try {
        const result = await this.runSingleTest(question);
        results.push(result);
        console.log(`✅ Question ${question.id}: Score ${result.score}/100`);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Error testing question ${question.id}:`, error);
      }
    }

    // Calculate overall stats
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    console.log(`\n📊 Overall Score: ${Math.round(avgScore)}/100`);
    console.log(`✅ Passed: ${results.filter(r => r.score >= 85).length}/${results.length}`);

    return results;
  }
}