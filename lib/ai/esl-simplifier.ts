import { claudeService } from './claude-service';

export interface ESLSimplificationResult {
  simplifiedText: string;
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  vocabularyChanges: Array<{
    original: string;
    simplified: string;
    reason: string;
  }>;
  culturalAnnotations: Array<{
    term: string;
    explanation: string;
  }>;
  grammarSimplifications: string[];
}

export class ESLSimplifier {
  async simplifyText(
    text: string,
    targetLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
    userId: string
  ): Promise<ESLSimplificationResult> {
    const prompt = this.buildSimplificationPrompt(text, targetLevel);
    
    try {
      const response = await claudeService.query(prompt, {
        userId,
        maxTokens: 2000,
        temperature: 0.3,
        responseMode: 'detailed'
      });

      // Parse the structured response
      return this.parseSimplificationResponse(response.content, targetLevel);
    } catch (error) {
      console.error('ESL simplification error:', error);
      // Fallback to original text
      return {
        simplifiedText: text,
        difficulty: targetLevel,
        vocabularyChanges: [],
        culturalAnnotations: [],
        grammarSimplifications: []
      };
    }
  }

  private buildSimplificationPrompt(text: string, targetLevel: string): string {
    const levelGuidelines = {
      A1: 'Use only the 500 most common English words. Maximum 8 words per sentence. Present tense only.',
      A2: 'Use basic vocabulary (1000-2000 common words). Simple past and present tense. Short sentences.',
      B1: 'Intermediate vocabulary. Clear sentence structure. Avoid complex grammar.',
      B2: 'Upper-intermediate level. More complex ideas but clear expression.',
      C1: 'Advanced level but maintain clarity. Complex ideas expressed simply.',
      C2: 'Near-native level. Sophisticated but accessible language.'
    };

    return `Simplify this text for ${targetLevel} level ESL learners.

Guidelines for ${targetLevel}:
${levelGuidelines[targetLevel as keyof typeof levelGuidelines]}

Original text:
"${text}"

Please provide a JSON response with:
{
  "simplifiedText": "the simplified version",
  "vocabularyChanges": [{"original": "word", "simplified": "simpler word", "reason": "explanation"}],
  "culturalAnnotations": [{"term": "cultural term", "explanation": "explanation for ESL learners"}],
  "grammarSimplifications": ["list of grammar changes made"]
}`;
  }

  private parseSimplificationResponse(response: string, targetLevel: string): ESLSimplificationResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          simplifiedText: parsed.simplifiedText || response,
          difficulty: targetLevel as any,
          vocabularyChanges: parsed.vocabularyChanges || [],
          culturalAnnotations: parsed.culturalAnnotations || [],
          grammarSimplifications: parsed.grammarSimplifications || []
        };
      }
    } catch (error) {
      console.warn('Failed to parse JSON response, using text only:', error);
    }

    // Fallback: just return the text
    return {
      simplifiedText: response,
      difficulty: targetLevel as any,
      vocabularyChanges: [],
      culturalAnnotations: [],
      grammarSimplifications: []
    };
  }
}

export const eslSimplifier = new ESLSimplifier();