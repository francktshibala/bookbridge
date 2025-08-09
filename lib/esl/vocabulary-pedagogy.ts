/**
 * CEFR-Aligned Vocabulary Pedagogy System
 * Implements evidence-based vocabulary acquisition and spaced repetition
 */

export interface CEFRVocabularyRule {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  maxVocabularySize: number;
  acquisitionRate: number; // new words per week
  retentionThreshold: number; // minimum mastery for advancement
  reviewCycle: number; // days between reviews
  contextComplexity: 'simple' | 'moderate' | 'complex';
  examples: {
    minCount: number;
    maxComplexity: string;
    includeVisuals: boolean;
  };
}

export const CEFR_VOCABULARY_RULES: Record<string, CEFRVocabularyRule> = {
  'A1': {
    level: 'A1',
    maxVocabularySize: 500,
    acquisitionRate: 8, // 8 new words per week
    retentionThreshold: 0.85, // 85% accuracy for advancement
    reviewCycle: 1, // review daily initially
    contextComplexity: 'simple',
    examples: {
      minCount: 3,
      maxComplexity: 'one simple sentence',
      includeVisuals: true
    }
  },
  'A2': {
    level: 'A2',
    maxVocabularySize: 1000,
    acquisitionRate: 12,
    retentionThreshold: 0.80,
    reviewCycle: 2,
    contextComplexity: 'simple',
    examples: {
      minCount: 2,
      maxComplexity: 'simple compound sentences',
      includeVisuals: true
    }
  },
  'B1': {
    level: 'B1',
    maxVocabularySize: 1500,
    acquisitionRate: 15,
    retentionThreshold: 0.75,
    reviewCycle: 3,
    contextComplexity: 'moderate',
    examples: {
      minCount: 2,
      maxComplexity: 'complex sentences with conjunctions',
      includeVisuals: false
    }
  },
  'B2': {
    level: 'B2',
    maxVocabularySize: 2500,
    acquisitionRate: 18,
    retentionThreshold: 0.75,
    reviewCycle: 4,
    contextComplexity: 'moderate',
    examples: {
      minCount: 2,
      maxComplexity: 'abstract concepts and metaphors',
      includeVisuals: false
    }
  },
  'C1': {
    level: 'C1',
    maxVocabularySize: 4000,
    acquisitionRate: 20,
    retentionThreshold: 0.70,
    reviewCycle: 7,
    contextComplexity: 'complex',
    examples: {
      minCount: 1,
      maxComplexity: 'nuanced usage and register variation',
      includeVisuals: false
    }
  },
  'C2': {
    level: 'C2',
    maxVocabularySize: 6000,
    acquisitionRate: 25,
    retentionThreshold: 0.70,
    reviewCycle: 14,
    contextComplexity: 'complex',
    examples: {
      minCount: 1,
      maxComplexity: 'idiomatic and stylistic variation',
      includeVisuals: false
    }
  }
};

/**
 * Enhanced SM-2+ Algorithm for ESL Vocabulary
 * Based on SuperMemo SM-2 with ESL-specific modifications
 */
export interface SRSCard {
  word: string;
  userId: string;
  easeFactor: number; // 1.3 - 2.5
  interval: number; // days until next review
  repetitions: number; // successful reviews
  nextReview: Date;
  lastReview: Date;
  quality: number; // 0-5 (last response quality)
  masteryLevel: number; // 0-5 overall mastery
  difficulty: number; // 0-1 word difficulty
  encounters: number; // total encounters
  cefrLevel: string;
}

export class ESLVocabularySRS {
  private static readonly MIN_EASE_FACTOR = 1.3;
  private static readonly MAX_EASE_FACTOR = 2.5;
  private static readonly INITIAL_EASE_FACTOR = 2.5;
  private static readonly EASE_FACTOR_ADJUSTMENT = 0.1;

  /**
   * Calculate next review using enhanced SM-2+ algorithm
   */
  static calculateNextReview(card: SRSCard, responseQuality: number): SRSCard {
    const updatedCard = { ...card };
    updatedCard.quality = responseQuality;
    updatedCard.lastReview = new Date();
    
    // ESL-specific quality thresholds (more lenient than standard SM-2)
    if (responseQuality >= 3) {
      // Correct response
      updatedCard.repetitions += 1;
      
      if (updatedCard.repetitions === 1) {
        updatedCard.interval = 1;
      } else if (updatedCard.repetitions === 2) {
        updatedCard.interval = 6; // First successful review = 6 days
      } else {
        // Standard SM-2 interval calculation
        updatedCard.interval = Math.round(updatedCard.interval * updatedCard.easeFactor);
      }
      
      // Update mastery level gradually
      updatedCard.masteryLevel = Math.min(5, updatedCard.masteryLevel + 0.2);
      
    } else {
      // Incorrect response - reset repetitions but don't fully reset progress
      updatedCard.repetitions = 0;
      updatedCard.interval = 1;
      updatedCard.masteryLevel = Math.max(0, updatedCard.masteryLevel - 0.3);
    }
    
    // Adjust ease factor based on response quality
    const qualityFactor = (0.1 - (5 - responseQuality) * (0.08 + (5 - responseQuality) * 0.02));
    updatedCard.easeFactor = Math.max(
      this.MIN_EASE_FACTOR,
      Math.min(this.MAX_EASE_FACTOR, updatedCard.easeFactor + qualityFactor)
    );
    
    // Apply ESL-specific adjustments
    updatedCard.interval = this.adjustIntervalForESL(updatedCard);
    
    // Set next review date
    updatedCard.nextReview = new Date(Date.now() + updatedCard.interval * 24 * 60 * 60 * 1000);
    
    return updatedCard;
  }
  
  /**
   * ESL-specific interval adjustments based on word difficulty and user level
   */
  private static adjustIntervalForESL(card: SRSCard): number {
    let adjustedInterval = card.interval;
    
    // Difficulty adjustment (harder words need more frequent review)
    const difficultyMultiplier = 1 - (card.difficulty * 0.3);
    adjustedInterval *= difficultyMultiplier;
    
    // CEFR level adjustment (lower levels need more frequent review)
    const levelMultipliers = {
      'A1': 0.8,
      'A2': 0.9,
      'B1': 1.0,
      'B2': 1.1,
      'C1': 1.2,
      'C2': 1.3
    };
    adjustedInterval *= levelMultipliers[card.cefrLevel as keyof typeof levelMultipliers] || 1.0;
    
    // Cap intervals for ESL learners (max 60 days vs SM-2's unlimited)
    adjustedInterval = Math.min(60, adjustedInterval);
    
    // Minimum interval of 1 day
    return Math.max(1, Math.round(adjustedInterval));
  }
  
  /**
   * Initialize a new vocabulary card for SRS
   */
  static initializeCard(
    word: string,
    userId: string,
    cefrLevel: string,
    difficulty: number = 0.5
  ): SRSCard {
    return {
      word,
      userId,
      easeFactor: this.INITIAL_EASE_FACTOR,
      interval: 1,
      repetitions: 0,
      nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      lastReview: new Date(),
      quality: 0,
      masteryLevel: 0,
      difficulty,
      encounters: 1,
      cefrLevel
    };
  }
  
  /**
   * Get words due for review
   */
  static getWordsForReview(cards: SRSCard[], maxWords: number = 20): SRSCard[] {
    const now = new Date();
    const dueCards = cards.filter(card => card.nextReview <= now);
    
    // Prioritize by: overdue time, then mastery level (lowest first), then difficulty (highest first)
    return dueCards
      .sort((a, b) => {
        const overdueA = now.getTime() - a.nextReview.getTime();
        const overdueB = now.getTime() - b.nextReview.getTime();
        
        if (Math.abs(overdueA - overdueB) < 24 * 60 * 60 * 1000) {
          // If both due within 24h, prioritize by mastery (weakest first)
          const masteryDiff = a.masteryLevel - b.masteryLevel;
          if (Math.abs(masteryDiff) < 0.5) {
            // If mastery similar, prioritize by difficulty (harder first)
            return b.difficulty - a.difficulty;
          }
          return masteryDiff;
        }
        
        return overdueB - overdueA; // Most overdue first
      })
      .slice(0, maxWords);
  }
}

/**
 * Vocabulary Surfacing Rules - when and how to show vocabulary tooltips
 */
export interface VocabularySurfacingRule {
  triggerCondition: 'unknown' | 'review' | 'context' | 'frequency';
  displayMode: 'tooltip' | 'highlight' | 'sidebar' | 'modal';
  timing: 'immediate' | 'delayed' | 'on-demand';
  persistence: 'session' | 'permanent' | 'smart';
}

export const VOCABULARY_SURFACING_STRATEGY = {
  // New unknown words (not in user's vocabulary)
  unknown: {
    triggerCondition: 'unknown' as const,
    displayMode: 'tooltip' as const,
    timing: 'on-demand' as const, // Only show when clicked/tapped
    persistence: 'smart' as const // Hide after user demonstrates understanding
  },
  
  // Words due for SRS review
  review: {
    triggerCondition: 'review' as const,
    displayMode: 'highlight' as const,
    timing: 'immediate' as const, // Subtle highlight to encourage review
    persistence: 'session' as const // Show throughout reading session
  },
  
  // Contextually important words
  context: {
    triggerCondition: 'context' as const,
    displayMode: 'highlight' as const,
    timing: 'delayed' as const, // Show after 2-3 seconds of reading
    persistence: 'smart' as const
  },
  
  // High-frequency academic/literary words
  frequency: {
    triggerCondition: 'frequency' as const,
    displayMode: 'sidebar' as const,
    timing: 'immediate' as const,
    persistence: 'permanent' as const
  }
};

/**
 * Progress Analytics for Vocabulary Learning
 */
export interface VocabularyProgress {
  userId: string;
  cefrLevel: string;
  totalVocabulary: number;
  activeVocabulary: number; // mastery >= 3
  passiveVocabulary: number; // mastery 1-2
  weeklyAcquisition: number;
  retentionRate: number;
  averageReviewAccuracy: number;
  strugglingWords: string[]; // words with mastery < 2 after 5+ encounters
  masteredWords: string[]; // words with mastery = 5
  nextReviewCount: number;
  readingSpeedImpact: number; // WPM change due to vocabulary
}

export class VocabularyAnalytics {
  /**
   * Calculate comprehensive vocabulary progress metrics
   */
  static calculateProgress(
    vocabularyCards: SRSCard[],
    recentSessions: any[]
  ): VocabularyProgress {
    const totalVocabulary = vocabularyCards.length;
    const activeVocabulary = vocabularyCards.filter(card => card.masteryLevel >= 3).length;
    const passiveVocabulary = vocabularyCards.filter(
      card => card.masteryLevel >= 1 && card.masteryLevel < 3
    ).length;
    
    // Weekly acquisition (words added in last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyAcquisition = vocabularyCards.filter(
      card => new Date(card.lastReview) > weekAgo
    ).length;
    
    // Retention rate (successful reviews / total reviews)
    const totalReviews = vocabularyCards.reduce((sum, card) => sum + card.repetitions, 0);
    const successfulReviews = vocabularyCards.filter(card => card.quality >= 3).length;
    const retentionRate = totalReviews > 0 ? successfulReviews / totalReviews : 0;
    
    // Average review accuracy
    const averageReviewAccuracy = vocabularyCards.length > 0 
      ? vocabularyCards.reduce((sum, card) => sum + card.quality, 0) / (vocabularyCards.length * 5)
      : 0;
    
    // Struggling and mastered words
    const strugglingWords = vocabularyCards
      .filter(card => card.masteryLevel < 2 && card.encounters >= 5)
      .map(card => card.word);
      
    const masteredWords = vocabularyCards
      .filter(card => card.masteryLevel === 5)
      .map(card => card.word);
    
    // Next review count
    const nextReviewCount = vocabularyCards.filter(
      card => card.nextReview <= new Date(Date.now() + 24 * 60 * 60 * 1000)
    ).length;
    
    // Reading speed impact (estimated)
    const readingSpeedImpact = this.estimateReadingSpeedImpact(vocabularyCards, recentSessions);
    
    return {
      userId: vocabularyCards[0]?.userId || '',
      cefrLevel: vocabularyCards[0]?.cefrLevel || 'B1',
      totalVocabulary,
      activeVocabulary,
      passiveVocabulary,
      weeklyAcquisition,
      retentionRate,
      averageReviewAccuracy,
      strugglingWords,
      masteredWords,
      nextReviewCount,
      readingSpeedImpact
    };
  }
  
  /**
   * Estimate reading speed improvement from vocabulary mastery
   */
  private static estimateReadingSpeedImpact(
    vocabularyCards: SRSCard[],
    recentSessions: any[]
  ): number {
    if (recentSessions.length < 2) return 0;
    
    // Simple correlation between vocabulary size and reading speed
    const avgMastery = vocabularyCards.length > 0 
      ? vocabularyCards.reduce((sum, card) => sum + card.masteryLevel, 0) / vocabularyCards.length
      : 0;
    
    // Rough estimate: each point of vocabulary mastery = ~2 WPM improvement
    return Math.round(avgMastery * vocabularyCards.length * 0.02);
  }
  
  /**
   * Generate personalized learning recommendations
   */
  static generateRecommendations(progress: VocabularyProgress): string[] {
    const recommendations: string[] = [];
    
    if (progress.retentionRate < 0.7) {
      recommendations.push('Focus on reviewing existing vocabulary before learning new words');
    }
    
    if (progress.strugglingWords.length > 10) {
      recommendations.push('Practice struggling words with additional context and examples');
    }
    
    if (progress.weeklyAcquisition < CEFR_VOCABULARY_RULES[progress.cefrLevel]?.acquisitionRate / 2) {
      recommendations.push('Increase reading time to encounter more vocabulary naturally');
    }
    
    if (progress.nextReviewCount > 50) {
      recommendations.push('Complete vocabulary reviews to maintain learning momentum');
    }
    
    if (progress.passiveVocabulary > progress.activeVocabulary * 2) {
      recommendations.push('Practice using vocabulary in writing and speaking to activate passive knowledge');
    }
    
    return recommendations;
  }
}