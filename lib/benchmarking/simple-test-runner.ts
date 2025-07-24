import OpenAI from 'openai';

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
    relevance: number;
    accuracy: number;
    completeness: number;
    clarity: number;
  };
}

export class SimpleBenchmarkTestRunner {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Run a single test question
   */
  async runSingleTest(question: TestQuestion): Promise<TestResult> {
    console.log(`Testing question: ${question.question}`);

    // Ask AI the question using OpenAI directly
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an educational AI assistant helping students understand literature. Provide clear, accurate answers about books and literary analysis.'
        },
        {
          role: 'user',
          content: question.question
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    });

    const aiResponse = response.choices[0]?.message?.content || '';

    // Score the response
    const score = this.scoreResponse(question, aiResponse);

    return {
      questionId: question.id,
      question: question.question,
      aiResponse: aiResponse,
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
   * Simple scoring system
   */
  private scoreResponse(question: TestQuestion, aiResponse: string): {
    overall: number;
    relevance: number;
    accuracy: number;
    completeness: number;
    clarity: number;
  } {
    // Simple keyword matching
    const expectedWords = question.expectedAnswer.toLowerCase().split(' ');
    const responseWords = aiResponse.toLowerCase().split(' ');
    
    // Count matching keywords
    const matchingWords = expectedWords.filter(word => 
      word.length > 3 && // Skip short words
      responseWords.some(responseWord => 
        responseWord.includes(word) || word.includes(responseWord)
      )
    );

    // Basic scoring
    const relevance = Math.min(100, (matchingWords.length / expectedWords.filter(w => w.length > 3).length) * 100);
    const accuracy = relevance; // Simple approximation
    const completeness = Math.min(100, Math.max(50, (aiResponse.length / question.expectedAnswer.length) * 80));
    const clarity = aiResponse.length > 50 && aiResponse.length < 600 ? 85 : 70;

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