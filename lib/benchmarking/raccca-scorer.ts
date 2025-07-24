import OpenAI from 'openai';

/**
 * R.A.C.C.C.A. Framework Scorer
 * - Relevance: Directly addresses the prompt (Target: 95%+)
 * - Accuracy: Factually correct information (Target: 98%+)  
 * - Completeness: All requested elements included (Target: 90%+)
 * - Clarity: Appropriate complexity for user level (Target: 85%+)
 * - Coherence: Logical flow from start to finish (Target: 90%+)
 * - Appropriateness: Suitable for audience and context (Target: 88%+)
 */

export interface RACCCAScore {
  relevance: number;      // 0-100
  accuracy: number;       // 0-100  
  completeness: number;   // 0-100
  clarity: number;        // 0-100
  coherence: number;      // 0-100
  appropriateness: number; // 0-100
  overall: number;        // Weighted average
  breakdown: {
    relevance: string;
    accuracy: string;
    completeness: string;
    clarity: string;
    coherence: string;
    appropriateness: string;
  };
}

export interface TestQuestion {
  id: string;
  question: string;
  expectedAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  userLevel?: 'middle_school' | 'high_school' | 'college' | 'graduate';
  expectedCitations?: string[];
}

export class RACCCAScorer {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Score response using R.A.C.C.C.A. framework with AI evaluation
   */
  async scoreResponse(question: TestQuestion, response: string): Promise<RACCCAScore> {
    console.log(`🔍 Scoring response with R.A.C.C.C.A. framework...`);

    // Use AI to evaluate each dimension
    const evaluationPrompt = `
You are an expert educational evaluator. Score this AI response using the R.A.C.C.C.A. framework on a scale of 0-100.

QUESTION: "${question.question}"
EXPECTED ANSWER: "${question.expectedAnswer}"
DIFFICULTY: ${question.difficulty}
USER LEVEL: ${question.userLevel || 'high_school'}

AI RESPONSE TO EVALUATE:
"${response}"

Score each dimension (0-100) and provide brief reasoning:

1. RELEVANCE (Target: 95%+): Does the response directly address the question?
2. ACCURACY (Target: 98%+): Is the information factually correct?
3. COMPLETENESS (Target: 90%+): Are all key points covered?
4. CLARITY (Target: 85%+): Is it clear and understandable for the user level?
5. COHERENCE (Target: 90%+): Does it flow logically?
6. APPROPRIATENESS (Target: 88%+): Is it suitable for the audience and context?

Respond in this JSON format:
{
  "relevance": {"score": 85, "reason": "Directly answers the question but could be more focused"},
  "accuracy": {"score": 92, "reason": "Information is factually correct"},
  "completeness": {"score": 88, "reason": "Covers main points but missing some details"},
  "clarity": {"score": 90, "reason": "Clear and appropriate for user level"},
  "coherence": {"score": 85, "reason": "Generally logical but some transitions unclear"},
  "appropriateness": {"score": 88, "reason": "Suitable for high school level"}
}`;

    try {
      const evaluation = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational evaluator. Provide objective, detailed scoring for educational AI responses.'
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        max_tokens: 800,
        temperature: 0.1
      });

      const evaluationText = evaluation.choices[0]?.message?.content || '';
      
      // Parse JSON response
      const jsonMatch = evaluationText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse evaluation JSON');
      }

      const scores = JSON.parse(jsonMatch[0]);

      // Calculate weighted overall score (accuracy and relevance are most important)
      const weights = {
        relevance: 0.25,
        accuracy: 0.30,
        completeness: 0.15,
        clarity: 0.15,
        coherence: 0.10,
        appropriateness: 0.05
      };

      const overall = Math.round(
        scores.relevance.score * weights.relevance +
        scores.accuracy.score * weights.accuracy +
        scores.completeness.score * weights.completeness +
        scores.clarity.score * weights.clarity +
        scores.coherence.score * weights.coherence +
        scores.appropriateness.score * weights.appropriateness
      );

      return {
        relevance: scores.relevance.score,
        accuracy: scores.accuracy.score,
        completeness: scores.completeness.score,
        clarity: scores.clarity.score,
        coherence: scores.coherence.score,
        appropriateness: scores.appropriateness.score,
        overall,
        breakdown: {
          relevance: scores.relevance.reason,
          accuracy: scores.accuracy.reason,
          completeness: scores.completeness.reason,
          clarity: scores.clarity.reason,
          coherence: scores.coherence.reason,
          appropriateness: scores.appropriateness.reason
        }
      };

    } catch (error) {
      console.error('Error in R.A.C.C.C.A. scoring:', error);
      
      // Fallback to simple scoring if AI evaluation fails
      return this.fallbackScoring(question, response);
    }
  }

  /**
   * Fallback scoring method using rule-based analysis
   */
  private fallbackScoring(question: TestQuestion, response: string): RACCCAScore {
    const expectedWords = question.expectedAnswer.toLowerCase().split(' ').filter(w => w.length > 3);
    const responseWords = response.toLowerCase().split(' ').filter(w => w.length > 3);
    
    // Basic keyword matching for relevance and accuracy
    const matchingWords = expectedWords.filter(word => 
      responseWords.some(rWord => rWord.includes(word) || word.includes(rWord))
    );
    
    const relevance = Math.min(95, Math.max(60, (matchingWords.length / expectedWords.length) * 100));
    const accuracy = Math.min(95, relevance * 0.95); // Slightly lower than relevance
    
    // Length-based completeness
    const lengthRatio = response.length / question.expectedAnswer.length;
    const completeness = lengthRatio >= 0.7 && lengthRatio <= 1.5 ? 85 : 75;
    
    // Readability-based clarity
    const avgSentenceLength = response.length / (response.split(/[.!?]+/).length || 1);
    const clarity = avgSentenceLength > 50 && avgSentenceLength < 200 ? 80 : 70;
    
    // Structure-based coherence
    const hasTransitions = /\b(however|therefore|furthermore|moreover|additionally|consequently)\b/i.test(response);
    const coherence = hasTransitions ? 80 : 75;
    
    // User level appropriateness
    const complexity = response.split(' ').filter(w => w.length > 8).length / response.split(' ').length;
    const appropriateness = complexity < 0.2 ? 85 : 75; // Lower complexity is better for most users
    
    const overall = Math.round(
      relevance * 0.25 + accuracy * 0.30 + completeness * 0.15 + 
      clarity * 0.15 + coherence * 0.10 + appropriateness * 0.05
    );

    return {
      relevance: Math.round(relevance),
      accuracy: Math.round(accuracy),
      completeness: Math.round(completeness),
      clarity: Math.round(clarity),
      coherence: Math.round(coherence),
      appropriateness: Math.round(appropriateness),
      overall,
      breakdown: {
        relevance: 'Keyword matching analysis',
        accuracy: 'Content similarity assessment',
        completeness: 'Length-based evaluation',
        clarity: 'Readability assessment',
        coherence: 'Structure analysis',
        appropriateness: 'Complexity evaluation'
      }
    };
  }

  /**
   * Batch score multiple responses
   */
  async scoreMultipleResponses(
    questions: TestQuestion[], 
    responses: string[]
  ): Promise<RACCCAScore[]> {
    const scores: RACCCAScore[] = [];
    
    for (let i = 0; i < questions.length; i++) {
      console.log(`\n📊 Scoring ${i + 1}/${questions.length}: ${questions[i].id}`);
      const score = await this.scoreResponse(questions[i], responses[i]);
      scores.push(score);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return scores;
  }

  /**
   * Generate detailed scoring report
   */
  generateReport(scores: RACCCAScore[]): string {
    const avgScores = {
      relevance: Math.round(scores.reduce((sum, s) => sum + s.relevance, 0) / scores.length),
      accuracy: Math.round(scores.reduce((sum, s) => sum + s.accuracy, 0) / scores.length),
      completeness: Math.round(scores.reduce((sum, s) => sum + s.completeness, 0) / scores.length),
      clarity: Math.round(scores.reduce((sum, s) => sum + s.clarity, 0) / scores.length),
      coherence: Math.round(scores.reduce((sum, s) => sum + s.coherence, 0) / scores.length),
      appropriateness: Math.round(scores.reduce((sum, s) => sum + s.appropriateness, 0) / scores.length),
      overall: Math.round(scores.reduce((sum, s) => sum + s.overall, 0) / scores.length)
    };

    const targets = {
      relevance: 95,
      accuracy: 98,
      completeness: 90,
      clarity: 85,
      coherence: 90,
      appropriateness: 88
    };

    let report = `
# R.A.C.C.C.A. Framework Evaluation Report
Generated: ${new Date().toLocaleString()}
Total Responses Evaluated: ${scores.length}

## Overall Performance
Average Score: ${avgScores.overall}/100

## Dimensional Analysis
`;

    Object.entries(avgScores).forEach(([dimension, score]) => {
      if (dimension === 'overall') return;
      
      const target = targets[dimension as keyof typeof targets];
      const status = score >= target ? '✅ MEETS TARGET' : '⚠️  BELOW TARGET';
      const gap = target - score;
      
      report += `
### ${dimension.toUpperCase()}
- Score: ${score}/100 (Target: ${target}+)
- Status: ${status}
- Gap: ${gap > 0 ? `${gap} points below target` : 'Target exceeded'}
`;
    });

    return report;
  }
}