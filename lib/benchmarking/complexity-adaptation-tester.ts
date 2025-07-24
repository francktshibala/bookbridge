import OpenAI from 'openai';
import { TestQuestion } from './raccca-scorer';

export interface ComplexityTestQuestion extends TestQuestion {
  targetUserLevel: 'middle_school' | 'high_school' | 'college' | 'graduate';
  baseQuestion: string; // Same question adapted for different levels
}

export interface ComplexityAdaptationResult {
  questionId: string;
  baseQuestion: string;
  responses: {
    middle_school: { response: string; score: number; appropriatenessScore: number };
    high_school: { response: string; score: number; appropriatenessScore: number };
    college: { response: string; score: number; appropriatenessScore: number };
    graduate: { response: string; score: number; appropriatenessScore: number };
  };
  adaptationScore: number; // How well AI adapts across levels
  consistencyScore: number; // How consistent the core content is
  recommendations: string[];
}

/**
 * Tests AI's ability to adapt response complexity to different user education levels
 */
export class ComplexityAdaptationTester {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Test AI adaptation across all education levels for a single question
   */
  async testComplexityAdaptation(baseQuestion: string): Promise<ComplexityAdaptationResult> {
    console.log(`🎯 Testing complexity adaptation for: "${baseQuestion}"`);

    const userLevels: ('middle_school' | 'high_school' | 'college' | 'graduate')[] = 
      ['middle_school', 'high_school', 'college', 'graduate'];

    const responses: any = {};

    // Get AI responses for each education level
    for (const level of userLevels) {
      console.log(`  📝 Testing ${level} level...`);
      
      const response = await this.generateAdaptedResponse(baseQuestion, level);
      const score = await this.scoreResponse(response, level);
      const appropriatenessScore = await this.scoreAppropriateness(response, level, baseQuestion);
      
      responses[level] = {
        response,
        score,
        appropriatenessScore
      };

      // Delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Calculate adaptation metrics
    const adaptationScore = this.calculateAdaptationScore(responses);
    const consistencyScore = this.calculateConsistencyScore(responses);
    const recommendations = this.generateAdaptationRecommendations(responses, adaptationScore);

    return {
      questionId: `adapt_${Date.now()}`,
      baseQuestion,
      responses,
      adaptationScore,
      consistencyScore,
      recommendations
    };
  }

  /**
   * Generate AI response adapted to specific education level
   */
  private async generateAdaptedResponse(
    question: string, 
    userLevel: 'middle_school' | 'high_school' | 'college' | 'graduate'
  ): Promise<string> {
    
    const systemPrompts = {
      middle_school: `You are a friendly literature teacher for middle school students (ages 11-14). 
Use simple language, relatable examples, and encourage curiosity. Avoid complex terminology. 
Keep explanations clear, engaging, and age-appropriate.`,
      
      high_school: `You are an experienced high school English teacher. 
Provide thoughtful analysis appropriate for teenagers (ages 14-18). Use examples they can understand 
while introducing proper literary terminology. Balance accessibility with academic rigor.`,
      
      college: `You are a college literature professor. 
Provide sophisticated analysis with academic rigor, proper terminology, and multiple interpretative perspectives. 
Assume familiarity with literary concepts and critical thinking skills.`,
      
      graduate: `You are a graduate-level literature scholar. 
Offer nuanced analysis with advanced theoretical frameworks, scholarly debate context, 
and original critical insights. Use complex terminology and assume deep literary knowledge.`
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
          content: question
        }
      ],
      max_tokens: 400,
      temperature: 0.2
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Score response quality for the education level
   */
  private async scoreResponse(response: string, userLevel: string): Promise<number> {
    // Simple metrics for now - can be enhanced with R.A.C.C.C.A. framework
    const words = response.split(' ');
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const complexWords = words.filter(word => word.length > 8).length;
    const complexityRatio = complexWords / words.length;

    // Score based on appropriate complexity for level
    const targetComplexity = {
      middle_school: { avgWordLength: 4.5, complexityRatio: 0.05 },
      high_school: { avgWordLength: 5.0, complexityRatio: 0.10 },
      college: { avgWordLength: 5.5, complexityRatio: 0.15 },
      graduate: { avgWordLength: 6.0, complexityRatio: 0.20 }
    };

    const target = targetComplexity[userLevel as keyof typeof targetComplexity];
    const lengthScore = 100 - Math.abs(avgWordLength - target.avgWordLength) * 10;
    const complexityScore = 100 - Math.abs(complexityRatio - target.complexityRatio) * 200;

    return Math.round(Math.max(0, Math.min(100, (lengthScore + complexityScore) / 2)));
  }

  /**
   * Score how appropriate the response is for the target education level
   */
  private async scoreAppropriateness(
    response: string, 
    userLevel: string, 
    question: string
  ): Promise<number> {
    
    const evaluationPrompt = `Rate how appropriate this literature response is for a ${userLevel.replace('_', ' ')} student (0-100):

QUESTION: "${question}"
RESPONSE: "${response}"

Consider:
- Language complexity and vocabulary
- Concept difficulty and depth
- Examples and analogies used
- Overall accessibility for the education level

Respond with just a number (0-100):`;

    try {
      const evaluation = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an education specialist evaluating content appropriateness for different grade levels.'
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      });

      const scoreText = evaluation.choices[0]?.message?.content || '70';
      const score = parseInt(scoreText.match(/\d+/)?.[0] || '70');
      return Math.max(0, Math.min(100, score));

    } catch (error) {
      console.error('Error scoring appropriateness:', error);
      return 70; // Default score
    }
  }

  /**
   * Calculate how well AI adapts across different education levels
   */
  private calculateAdaptationScore(responses: any): number {
    const levels = Object.keys(responses);
    const appropriatenessScores = levels.map(level => responses[level].appropriatenessScore);
    
    // Good adaptation means high appropriateness scores across all levels
    const avgAppropriateness = appropriatenessScores.reduce((sum, score) => sum + score, 0) / levels.length;
    
    // Bonus for having different complexity levels (responses should be different)
    const responseLengths = levels.map(level => responses[level].response.length);
    const lengthVariation = Math.max(...responseLengths) - Math.min(...responseLengths);
    const variationBonus = Math.min(10, lengthVariation / 20); // Up to 10 bonus points
    
    return Math.round(Math.min(100, avgAppropriateness + variationBonus));
  }

  /**
   * Calculate consistency of core content across levels
   */
  private calculateConsistencyScore(responses: any): number {
    // All responses should cover the same core concepts, just at different complexity levels
    const responseTexts = Object.values(responses).map((r: any) => r.response.toLowerCase());
    
    // Extract key terms from all responses
    const allWords = responseTexts.join(' ').split(/\W+/);
    const keyTerms = [...new Set(allWords.filter(word => word.length > 4))];
    
    // Count how many responses contain each key term
    const termConsistency = keyTerms.map(term => {
      const appearances = responseTexts.filter(text => text.includes(term)).length;
      return appearances / responseTexts.length;
    });
    
    // High consistency means important terms appear across most responses
    const avgConsistency = termConsistency.reduce((sum, score) => sum + score, 0) / termConsistency.length;
    return Math.round(avgConsistency * 100);
  }

  /**
   * Generate recommendations for improving complexity adaptation
   */
  private generateAdaptationRecommendations(responses: any, adaptationScore: number): string[] {
    const recommendations: string[] = [];
    
    if (adaptationScore < 80) {
      recommendations.push('Improve vocabulary adaptation across education levels');
    }
    
    // Check if middle school response is too complex
    if (responses.middle_school.appropriatenessScore < 75) {
      recommendations.push('Simplify language and concepts for middle school students');
    }
    
    // Check if graduate response lacks sophistication
    if (responses.graduate.appropriatenessScore < 75) {
      recommendations.push('Increase analytical depth and theoretical framework for graduate level');
    }
    
    // Check for insufficient variation
    const lengths = Object.values(responses).map((r: any) => r.response.length);
    const variation = Math.max(...lengths) - Math.min(...lengths);
    if (variation < 100) {
      recommendations.push('Increase variation in response complexity across education levels');
    }
    
    return recommendations;
  }

  /**
   * Run comprehensive complexity adaptation test suite
   */
  async runAdaptationTestSuite(questions: string[]): Promise<{
    results: ComplexityAdaptationResult[];
    summary: {
      averageAdaptationScore: number;
      averageConsistencyScore: number;
      levelPerformance: Record<string, number>;
      overallRecommendations: string[];
    };
  }> {
    console.log(`\n🎯 Starting Complexity Adaptation Test Suite`);
    console.log(`📝 Testing ${questions.length} questions across 4 education levels`);
    
    const results: ComplexityAdaptationResult[] = [];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`\n[${i + 1}/${questions.length}] Testing: "${question.substring(0, 50)}..."`);
      
      try {
        const result = await this.testComplexityAdaptation(question);
        results.push(result);
        
        console.log(`  ✅ Adaptation Score: ${result.adaptationScore}/100`);
        console.log(`  📊 Consistency Score: ${result.consistencyScore}/100`);
        
      } catch (error) {
        console.error(`  ❌ Error testing question ${i + 1}:`, error);
      }
    }
    
    // Generate summary
    const summary = this.generateAdaptationSummary(results);
    
    console.log(`\n📊 ADAPTATION TEST SUITE COMPLETE`);
    console.log(`📈 Average Adaptation Score: ${summary.averageAdaptationScore}/100`);
    console.log(`🔄 Average Consistency Score: ${summary.averageConsistencyScore}/100`);
    
    return { results, summary };
  }

  /**
   * Generate comprehensive summary of adaptation testing
   */
  private generateAdaptationSummary(results: ComplexityAdaptationResult[]) {
    const averageAdaptationScore = Math.round(
      results.reduce((sum, r) => sum + r.adaptationScore, 0) / results.length
    );
    
    const averageConsistencyScore = Math.round(
      results.reduce((sum, r) => sum + r.consistencyScore, 0) / results.length
    );
    
    // Calculate performance by education level
    const levels = ['middle_school', 'high_school', 'college', 'graduate'];
    const levelPerformance: Record<string, number> = {};
    
    levels.forEach(level => {
      const avgScore = Math.round(
        results.reduce((sum, r) => sum + r.responses[level as keyof typeof r.responses].appropriatenessScore, 0) / results.length
      );
      levelPerformance[level] = avgScore;
    });
    
    // Aggregate recommendations
    const allRecommendations = results.flatMap(r => r.recommendations);
    const recommendationCounts = allRecommendations.reduce((acc, rec) => {
      acc[rec] = (acc[rec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const overallRecommendations = Object.entries(recommendationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([rec, count]) => `${rec} (${count} instances)`);
    
    return {
      averageAdaptationScore,
      averageConsistencyScore,
      levelPerformance,
      overallRecommendations
    };
  }
}