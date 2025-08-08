import { ConversationContext } from '@/lib/services/conversation-service';

export interface QueryIntent {
  type: 'definition' | 'explanation' | 'analysis' | 'comparison' | 'clarification' | 'follow_up' | 'simplification'
  expectedLength: 'brief' | 'moderate' | 'detailed' | 'simplified'
  complexity: 'simple' | 'intermediate' | 'complex'
  confidence: number // 0-1 score
  reasoning: string
  extractedAge?: number // For age-specific requests like "explain like I'm 8"
}

export interface ResponseLengthConfig {
  maxTokens: number
  structure: string
  style: string
}

export const LENGTH_CONFIGS: Record<QueryIntent['expectedLength'], ResponseLengthConfig> = {
  brief: {
    maxTokens: 150,
    structure: "1-2 concise sentences providing direct answer",
    style: "Clear and to-the-point, like a dictionary definition"
  },
  moderate: {
    maxTokens: 400,
    structure: "2-3 paragraph explanation with context",
    style: "Educational with examples, building understanding"
  },
  detailed: {
    maxTokens: 800,
    structure: "Comprehensive 4-5 paragraph analysis",
    style: "In-depth exploration with multiple perspectives and connections"
  },
  simplified: {
    maxTokens: 300,
    structure: "Simple, easy-to-follow explanation with basic examples",
    style: "Elementary language, everyday analogies, short sentences"
  }
}

export class QueryIntentClassifier {
  // Brief response indicators
  private briefPatterns = [
    /^what is\b/i,
    /^define\b/i,
    /^who is\b/i,
    /^when did\b/i,
    /^where is\b/i,
    /\bbriefly\b/i,
    /\bquick\b/i,
    /\bsimple\b/i,
    /\bin short\b/i,
    /\btl;?dr\b/i,
    /\bjust tell me\b/i,
    /\bone sentence\b/i,
    /\byes or no\b/i
  ]

  // Detailed response indicators
  private detailedPatterns = [
    /\banalyze\b/i,
    /\banalysis\b/i,
    /\bcompare\b/i,
    /\bcontrast\b/i,
    /\bdiscuss\b/i,
    /\bexplore\b/i,
    /\bexamine\b/i,
    /\bevaluate\b/i,
    /\bassess\b/i,
    /\bthoroughly\b/i,
    /\bcomprehensive\b/i,
    /\bin detail\b/i,
    /\bdeep dive\b/i,
    /\ball aspects\b/i,
    /\bcomplete understanding\b/i,
    /\bhow does.*relate\b/i,
    /\bwhy is.*important\b/i,
    /\bwhat.*significance\b/i
  ]

  // Clarification indicators
  private clarificationPatterns = [
    /\bi don'?t understand\b/i,
    /\bconfused\b/i,
    /\bunclear\b/i,
    /\bwhat do you mean\b/i,
    /\bcan you clarify\b/i,
    /\bcan you explain\b/i,
    /\bwhat does that mean\b/i,
    /\bhelp me understand\b/i,
    /\bcould you elaborate\b/i
  ]

  // Follow-up indicators
  private followUpPatterns = [
    /\band what about\b/i,
    /\bbut what\b/i,
    /\bhow about\b/i,
    /\bwhat else\b/i,
    /\balso\b/i,
    /\badditionally\b/i,
    /\bfurthermore\b/i,
    /\btell me more\b/i
  ]

  // Simplification request indicators (Claude Code style)
  private simplificationPatterns = [
    /\bELI5\b/i,
    /\bexplain.*like.*i'?m.*(\d+)/i,  // "explain like I'm 5", "explain like I'm 10"
    /\bexplain.*for.*(\d+).*year.*old/i,  // "explain for a 10 year old"
    /\bmake.*it.*simpl(er?|ify)\b/i,  // "make it simpler", "make it simplify"
    /\bsimplify.*this\b/i,
    /\buse.*simpl(er?|e).*words?\b/i,  // "use simpler words", "use simple words"
    /\buse.*easier.*words?\b/i,
    /\bplain.*english\b/i,
    /\bdumb.*it.*down\b/i,
    /\bbreak.*it.*down\b/i,
    /\beasier.*to.*understand\b/i,
    /\btoo.*complicated?\b/i,
    /\btoo.*complex\b/i,
    /\btoo.*hard.*to.*follow\b/i,
    /\bmore.*basic.*explanation\b/i,
    /\bfor.*beginners?\b/i,
    /\bfor.*kids?\b/i,
    /\bfor.*children\b/i
  ]

  async classifyQuery(
    query: string, 
    context?: ConversationContext
  ): Promise<QueryIntent> {
    const queryLower = query.toLowerCase().trim()
    const wordCount = query.split(/\s+/).length
    
    // Check for explicit length requests first
    if (this.matchesPatterns(queryLower, this.briefPatterns)) {
      return {
        type: 'definition',
        expectedLength: 'brief',
        complexity: 'simple',
        confidence: 0.9,
        reasoning: 'Query matches brief response patterns (what is, define, etc.)'
      }
    }

    if (this.matchesPatterns(queryLower, this.detailedPatterns)) {
      return {
        type: 'analysis',
        expectedLength: 'detailed',
        complexity: 'complex',
        confidence: 0.9,
        reasoning: 'Query matches detailed analysis patterns (analyze, compare, etc.)'
      }
    }

    // Check for simplification requests (Claude Code style)
    if (this.matchesPatterns(queryLower, this.simplificationPatterns)) {
      // Extract age if specified (e.g., "explain like I'm 8")
      const ageMatch = query.match(/(?:like.*i'?m|for.*a?)\s*(\d+)/i)
      const extractedAge = ageMatch ? parseInt(ageMatch[1]) : undefined
      
      return {
        type: 'simplification',
        expectedLength: 'simplified',
        complexity: 'simple',
        confidence: 0.95,
        reasoning: 'User explicitly requested simpler explanation (ELI5, make it simpler, etc.)',
        extractedAge
      }
    }

    // Check for clarification requests
    if (this.matchesPatterns(queryLower, this.clarificationPatterns)) {
      return {
        type: 'clarification',
        expectedLength: 'moderate',
        complexity: context?.messages.length ? 'intermediate' : 'simple',
        confidence: 0.85,
        reasoning: 'User is asking for clarification of previous content'
      }
    }

    // Check for follow-up questions
    if (context?.messages.length && context.messages.length > 0) {
      if (this.matchesPatterns(queryLower, this.followUpPatterns)) {
        return {
          type: 'follow_up',
          expectedLength: 'moderate',
          complexity: 'intermediate',
          confidence: 0.8,
          reasoning: 'Follow-up question in ongoing conversation'
        }
      }

      // Short questions in conversation context are usually follow-ups
      if (wordCount <= 6) {
        return {
          type: 'follow_up',
          expectedLength: 'brief',
          complexity: 'simple',
          confidence: 0.7,
          reasoning: 'Short question in conversation context suggests brief follow-up'
        }
      }
    }

    // Structural analysis for default classification
    return this.classifyByStructure(query, wordCount)
  }

  private classifyByStructure(query: string, wordCount: number): QueryIntent {
    // Very short questions (≤ 5 words) usually want brief answers
    if (wordCount <= 5) {
      return {
        type: 'definition',
        expectedLength: 'brief',
        complexity: 'simple',
        confidence: 0.6,
        reasoning: 'Very short question suggests brief answer needed'
      }
    }

    // Questions with "why" or "how" usually want explanations
    if (/\b(why|how)\b/i.test(query)) {
      return {
        type: 'explanation',
        expectedLength: 'moderate',
        complexity: 'intermediate',
        confidence: 0.7,
        reasoning: 'Why/how questions typically need moderate explanations'
      }
    }

    // Long, complex questions (15+ words) usually want detailed responses
    if (wordCount >= 15) {
      return {
        type: 'analysis',
        expectedLength: 'detailed',
        complexity: 'complex',
        confidence: 0.7,
        reasoning: 'Long, complex question suggests detailed analysis needed'
      }
    }

    // Default to moderate for everything else
    return {
      type: 'explanation',
      expectedLength: 'moderate',
      complexity: 'intermediate',
      confidence: 0.5,
      reasoning: 'Default classification for standard questions'
    }
  }

  private matchesPatterns(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text))
  }

  // Generate appropriate prompt based on intent
  generateResponsePrompt(intent: QueryIntent, query: string, bookContext?: string): string {
    const config = LENGTH_CONFIGS[intent.expectedLength]
    
    const basePrompt = `You are an expert literature tutor having a conversation with a student.

Query: ${query}
Response Intent: ${intent.type} (${intent.expectedLength})
Book Context: ${bookContext || 'General literature discussion'}

Response Guidelines:
- Length: ${config.structure}
- Style: ${config.style}
- Max tokens: ${config.maxTokens}
- Focus on educational value and student understanding

`

    // Add specific guidance based on intent type
    switch (intent.type) {
      case 'definition':
        return basePrompt + `Provide a clear, concise definition that directly answers the question. No elaboration needed unless essential for understanding.`
      
      case 'clarification':
        return basePrompt + `The student is confused about something previously discussed. Clarify the concept in a different way, perhaps with a simpler explanation or better example.`
      
      case 'analysis':
        return basePrompt + `Provide a comprehensive analysis that explores multiple aspects, includes examples from the text, and connects to broader themes. This should be a thorough educational response.`
      
      case 'follow_up':
        return basePrompt + `This is a follow-up question in an ongoing conversation. Build on what you've already discussed and provide additional insight without repeating previous information.`
      
      case 'simplification':
        const ageContext = intent.extractedAge ? ` (targeting age ${intent.extractedAge})` : ''
        return basePrompt + `The student has explicitly asked for a simpler explanation${ageContext}. Use very basic vocabulary, short sentences, and everyday examples. Explain complex concepts using familiar analogies like family, school, sports, or animals. Make it easy for anyone to understand.`
      
      default:
        return basePrompt + `Provide a balanced explanation that helps the student understand the concept with appropriate depth and examples.`
    }
  }
}

export const queryIntentClassifier = new QueryIntentClassifier()