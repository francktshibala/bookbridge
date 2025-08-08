import { prisma } from '@/lib/prisma';

interface UserPreferences {
  preferredComplexity: 'simple' | 'moderate' | 'advanced';
  preferredLength: 'brief' | 'moderate' | 'detailed';
  preferredStyle: 'examples' | 'analogies' | 'direct' | 'step-by-step';
  engagementLevel: number; // 0-1 scale
  confusionRate: number; // 0-1 scale
}

interface AdaptationSignals {
  userId: string;
  conversationId: string;
  query: string;
  response: string;
  userReaction?: 'confused' | 'understood' | 'engaged';
  responseTime?: number; // Time user spent reading
  followUpQuery?: boolean; // Did user ask clarification?
}

export class DynamicResponseAdaptationService {
  private static instance: DynamicResponseAdaptationService;

  private constructor() {}

  static getInstance(): DynamicResponseAdaptationService {
    if (!this.instance) {
      this.instance = new DynamicResponseAdaptationService();
    }
    return this.instance;
  }

  /**
   * Learn from user interaction and update preferences
   */
  async recordInteraction(signals: AdaptationSignals): Promise<void> {
    try {
      // Record in episodic memory
      await prisma.episodicMemory.create({
        data: {
          conversationId: signals.conversationId,
          query: signals.query,
          response: signals.response,
          userReaction: signals.userReaction,
          concepts: this.extractConcepts(signals.query, signals.response),
        },
      });

      // Update user preferences based on signals
      await this.updateUserPreferences(signals);
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  }

  /**
   * Get adapted response parameters based on user history
   */
  async getAdaptedParameters(userId: string): Promise<{
    complexity: 'simple' | 'moderate' | 'advanced';
    length: 'brief' | 'moderate' | 'detailed';
    style: 'examples' | 'analogies' | 'direct' | 'step-by-step';
    temperature: number;
  }> {
    const preferences = await this.calculateUserPreferences(userId);

    return {
      complexity: preferences.preferredComplexity,
      length: preferences.preferredLength,
      style: preferences.preferredStyle,
      temperature: this.calculateTemperature(preferences),
    };
  }

  /**
   * Calculate user preferences from historical interactions
   */
  private async calculateUserPreferences(userId: string): Promise<UserPreferences> {
    // Get user's recent interactions
    const recentInteractions = await prisma.episodicMemory.findMany({
      where: {
        conversationId: {
          in: await this.getUserConversationIds(userId),
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 20, // Last 20 interactions
    });

    // Calculate confusion rate
    const confusedCount = recentInteractions.filter(i => i.userReaction === 'confused').length;
    const confusionRate = confusedCount / recentInteractions.length;

    // Calculate engagement level
    const engagedCount = recentInteractions.filter(i => i.userReaction === 'engaged').length;
    const engagementLevel = engagedCount / recentInteractions.length;

    // Determine preferences based on patterns
    const preferredComplexity = this.determineComplexity(confusionRate, engagementLevel);
    const preferredLength = this.determineLength(recentInteractions);
    const preferredStyle = this.determineStyle(recentInteractions);

    return {
      preferredComplexity,
      preferredLength,
      preferredStyle,
      engagementLevel,
      confusionRate,
    };
  }

  /**
   * Determine complexity preference based on confusion/engagement
   */
  private determineComplexity(
    confusionRate: number,
    engagementLevel: number
  ): 'simple' | 'moderate' | 'advanced' {
    if (confusionRate > 0.4) {
      return 'simple'; // High confusion -> simplify
    } else if (engagementLevel > 0.6 && confusionRate < 0.2) {
      return 'advanced'; // High engagement, low confusion -> challenge more
    }
    return 'moderate';
  }

  /**
   * Determine preferred response length from patterns
   */
  private determineLength(interactions: any[]): 'brief' | 'moderate' | 'detailed' {
    // Check if user asks follow-up questions frequently
    const queryLengths = interactions.map(i => i.query.length);
    const avgQueryLength = queryLengths.reduce((a, b) => a + b, 0) / queryLengths.length;

    if (avgQueryLength < 50) {
      return 'brief'; // Short questions -> brief answers
    } else if (avgQueryLength > 150) {
      return 'detailed'; // Long questions -> detailed answers
    }
    return 'moderate';
  }

  /**
   * Determine preferred explanation style
   */
  private determineStyle(interactions: any[]): 'examples' | 'analogies' | 'direct' | 'step-by-step' {
    // Analyze which style led to "understood" reactions
    const understoodInteractions = interactions.filter(i => i.userReaction === 'understood');
    
    // This would be enhanced with actual style detection from responses
    // For now, use a simple heuristic
    if (interactions.some(i => i.query.toLowerCase().includes('example'))) {
      return 'examples';
    } else if (interactions.some(i => i.query.toLowerCase().includes('how') || i.query.toLowerCase().includes('steps'))) {
      return 'step-by-step';
    } else if (interactions.some(i => i.query.toLowerCase().includes('like') || i.query.toLowerCase().includes('similar'))) {
      return 'analogies';
    }
    
    return 'direct';
  }

  /**
   * Calculate AI temperature based on user preferences
   */
  private calculateTemperature(preferences: UserPreferences): number {
    // Higher confusion -> lower temperature (more consistent)
    // Higher engagement -> higher temperature (more creative)
    const baseTemp = 0.7;
    const confusionAdjustment = -0.2 * preferences.confusionRate;
    const engagementAdjustment = 0.1 * preferences.engagementLevel;

    return Math.max(0.3, Math.min(0.9, baseTemp + confusionAdjustment + engagementAdjustment));
  }

  /**
   * Update user preferences based on new interaction
   */
  private async updateUserPreferences(signals: AdaptationSignals): Promise<void> {
    // This method would update a user preferences table
    // For now, we're using episodic memory to derive preferences dynamically
    
    // Future enhancement: Create UserPreferences model in Prisma
    // and update it here based on interaction patterns
  }

  /**
   * Get user's conversation IDs
   */
  private async getUserConversationIds(userId: string): Promise<string[]> {
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      select: { id: true },
    });
    return conversations.map(c => c.id);
  }

  /**
   * Extract concepts from query and response
   */
  private extractConcepts(query: string, response: string): any {
    // Simple concept extraction - would be enhanced with NLP
    const concepts = [];
    
    // Extract literary terms
    const literaryTerms = ['theme', 'character', 'plot', 'setting', 'symbolism', 'metaphor'];
    literaryTerms.forEach(term => {
      if (query.toLowerCase().includes(term) || response.toLowerCase().includes(term)) {
        concepts.push(term);
      }
    });

    return concepts;
  }

  /**
   * Detect user reaction from interaction patterns
   */
  async detectUserReaction(
    query: string,
    previousQuery?: string,
    responseTime?: number
  ): Promise<'confused' | 'understood' | 'engaged' | undefined> {
    // Confusion indicators
    const confusionPhrases = [
      "i don't understand",
      "what do you mean",
      "can you explain",
      "i'm confused",
      "that's not clear",
      "can you simplify",
      "what?",
      "huh?",
    ];

    // Engagement indicators
    const engagementPhrases = [
      "tell me more",
      "that's interesting",
      "what about",
      "how does",
      "why does",
      "fascinating",
      "i see",
    ];

    const lowerQuery = query.toLowerCase();

    // Check for confusion
    if (confusionPhrases.some(phrase => lowerQuery.includes(phrase))) {
      return 'confused';
    }

    // Check for engagement
    if (engagementPhrases.some(phrase => lowerQuery.includes(phrase))) {
      return 'engaged';
    }

    // Quick follow-up might indicate confusion
    if (previousQuery && responseTime && responseTime < 5000) { // Less than 5 seconds
      return 'confused';
    }

    // Longer reading time with follow-up might indicate understanding
    if (responseTime && responseTime > 20000) { // More than 20 seconds
      return 'understood';
    }

    return undefined;
  }
}

export const dynamicResponseAdaptation = DynamicResponseAdaptationService.getInstance();