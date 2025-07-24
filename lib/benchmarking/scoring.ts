export interface ScoreBreakdown {
  overall: number;
  relevance: number;
  accuracy: number;
  completeness: number;
  clarity: number;
  coherence: number;
  appropriateness: number;
}

/**
 * Simple scoring functions - we'll improve these over time
 */
export class ResponseScorer {
  
  /**
   * Score how relevant the response is to the question
   */
  static scoreRelevance(question: string, response: string, expectedAnswer: string): number {
    const questionWords = this.extractKeywords(question);
    const responseWords = this.extractKeywords(response);
    const expectedWords = this.extractKeywords(expectedAnswer);
    
    // Check if response addresses the question topics
    const relevantWords = questionWords.filter(word => 
      responseWords.includes(word)
    );
    
    return Math.min(100, (relevantWords.length / questionWords.length) * 100);
  }

  /**
   * Score factual accuracy by comparing key concepts
   */
  static scoreAccuracy(response: string, expectedAnswer: string): number {
    const expectedConcepts = this.extractKeywords(expectedAnswer);
    const responseConcepts = this.extractKeywords(response);
    
    const matchingConcepts = expectedConcepts.filter(concept =>
      responseConcepts.some(respConcept => 
        respConcept.includes(concept) || concept.includes(respConcept)
      )
    );
    
    return Math.min(100, (matchingConcepts.length / expectedConcepts.length) * 100);
  }

  /**
   * Score completeness - did we cover all main points?
   */
  static scoreCompleteness(response: string, expectedAnswer: string): number {
    const expectedLength = expectedAnswer.length;
    const responseLength = response.length;
    
    // Ideal length is 80-120% of expected answer
    const lengthRatio = responseLength / expectedLength;
    
    if (lengthRatio >= 0.8 && lengthRatio <= 1.2) {
      return 100;
    } else if (lengthRatio >= 0.5 && lengthRatio <= 2.0) {
      return 80;
    } else {
      return 60;
    }
  }

  /**
   * Score clarity - is it easy to understand?
   */
  static scoreClarity(response: string): number {
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = response.length / sentences.length;
    
    // Prefer moderate sentence length (15-25 words)
    if (avgSentenceLength >= 75 && avgSentenceLength <= 150) {
      return 90;
    } else if (avgSentenceLength >= 50 && avgSentenceLength <= 200) {
      return 80;
    } else {
      return 70;
    }
  }

  /**
   * Extract important keywords from text
   */
  private static extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful terms
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'];
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.includes(word))
      .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
  }

  /**
   * Calculate overall score from individual components
   */
  static calculateOverallScore(scores: {
    relevance: number;
    accuracy: number;
    completeness: number;
    clarity: number;
  }): number {
    // Weighted average - accuracy and relevance are most important
    const weights = {
      relevance: 0.3,
      accuracy: 0.35,
      completeness: 0.2,
      clarity: 0.15
    };

    return Math.round(
      scores.relevance * weights.relevance +
      scores.accuracy * weights.accuracy +
      scores.completeness * weights.completeness +
      scores.clarity * weights.clarity
    );
  }
}