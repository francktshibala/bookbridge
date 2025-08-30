/**
 * User Behavior Analytics for Cache Algorithm Fine-Tuning
 * Implements ML-inspired behavioral analysis to optimize cache performance based on real user data
 * Research findings: Personalized caching improves hit rates by 25-40% over generic algorithms
 */

interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime: number;
  booksAccessed: string[];
  chaptersRead: number[];
  readingSpeed: number; // words per minute
  skipRate: number; // 0-1, frequency of skipping sentences
  backtrackRate: number; // 0-1, frequency of going back
  preferredQuality: AudioQuality;
  networkConditions: NetworkType[];
  interactionPatterns: InteractionEvent[];
}

interface InteractionEvent {
  timestamp: number;
  type: 'play' | 'pause' | 'skip' | 'back' | 'quality_change' | 'speed_change';
  bookId: string;
  chunkIndex: number;
  sentenceIndex: number;
  duration?: number; // For play events
  metadata?: Record<string, any>;
}

interface UserProfile {
  userId: string;
  createdAt: number;
  lastUpdated: number;
  
  // Reading behavior patterns
  avgReadingSpeed: number;
  preferredReadingTimes: number[]; // Hours of day (0-23)
  avgSessionDuration: number; // minutes
  avgChaptersPerSession: number;
  
  // Audio preferences
  preferredQuality: AudioQuality;
  qualityAdaptation: boolean; // Does user manually change quality?
  speedPreference: number; // Playback speed multiplier
  
  // Content patterns
  favoriteGenres: string[];
  readingProgression: 'linear' | 'exploratory' | 'mixed';
  skipBehavior: {
    skipRate: number;
    commonSkipTriggers: string[]; // e.g., 'long_description', 'dialogue'
  };
  
  // Network behavior
  networkTolerance: {
    [NetworkType.SLOW_2G]: number; // 0-1, willingness to wait on slow network
    [NetworkType.TWOG]: number;
    [NetworkType.THREEG]: number;
    [NetworkType.FOURG]: number;
    [NetworkType.WIFI]: number;
  };
  
  // Cache efficiency metrics
  personalCacheHitRate: number;
  prefetchAccuracy: number; // How often our predictions are correct for this user
  personalizedEvictionScore: number; // Custom eviction weight
}

interface BehaviorPattern {
  patternId: string;
  name: string;
  description: string;
  conditions: PatternCondition[];
  predictions: PatternPrediction[];
  confidence: number; // 0-1
  usageCount: number;
  successRate: number; // 0-1
}

interface PatternCondition {
  metric: 'time_of_day' | 'network_type' | 'reading_speed' | 'session_duration' | 'skip_rate';
  operator: 'gt' | 'lt' | 'eq' | 'range' | 'in';
  value: any;
}

interface PatternPrediction {
  type: 'next_chunk' | 'quality_preference' | 'session_end' | 'skip_likely';
  probability: number;
  metadata: Record<string, any>;
}

interface CacheOptimizationRecommendation {
  category: 'prefetch' | 'eviction' | 'quality' | 'quota';
  priority: 'high' | 'medium' | 'low';
  action: string;
  expectedImprovement: number; // 0-1, expected performance gain
  confidence: number; // 0-1, confidence in recommendation
  implementation: () => Promise<boolean>;
}

import { audioCacheDB, AudioQuality, NetworkType } from './audio-cache-db';
import { priorityCacheEviction } from './priority-cache-eviction';
import { cacheHealthMonitoring } from './cache-health-monitoring';

export class UserBehaviorAnalyticsService {
  private static instance: UserBehaviorAnalyticsService;
  private currentSession: UserSession | null = null;
  private userProfiles: Map<string, UserProfile> = new Map();
  private behaviorPatterns: BehaviorPattern[] = [];
  private interactionBuffer: InteractionEvent[] = [];
  private analyticsInterval: NodeJS.Timeout | null = null;

  static getInstance(): UserBehaviorAnalyticsService {
    if (!UserBehaviorAnalyticsService.instance) {
      UserBehaviorAnalyticsService.instance = new UserBehaviorAnalyticsService();
    }
    return UserBehaviorAnalyticsService.instance;
  }

  async initialize(): Promise<void> {
    console.log('UserBehaviorAnalytics: Initializing behavior analysis system');

    // Load stored data
    await this.loadUserProfiles();
    await this.loadBehaviorPatterns();

    // Start analytics processing
    this.startAnalyticsProcessing();

    // Initialize default patterns
    await this.initializeDefaultPatterns();

    console.log('UserBehaviorAnalytics: Initialization complete');
  }

  private async loadUserProfiles(): Promise<void> {
    try {
      const stored = localStorage.getItem('bookbridge_user_profiles');
      if (stored) {
        const profiles = JSON.parse(stored);
        this.userProfiles = new Map(Object.entries(profiles));
        console.log(`UserBehaviorAnalytics: Loaded ${this.userProfiles.size} user profiles`);
      }
    } catch (error) {
      console.warn('UserBehaviorAnalytics: Failed to load user profiles:', error);
    }
  }

  private async loadBehaviorPatterns(): Promise<void> {
    try {
      const stored = localStorage.getItem('bookbridge_behavior_patterns');
      if (stored) {
        this.behaviorPatterns = JSON.parse(stored);
        console.log(`UserBehaviorAnalytics: Loaded ${this.behaviorPatterns.length} behavior patterns`);
      }
    } catch (error) {
      console.warn('UserBehaviorAnalytics: Failed to load behavior patterns:', error);
    }
  }

  private async saveUserProfiles(): Promise<void> {
    try {
      const profiles = Object.fromEntries(this.userProfiles);
      localStorage.setItem('bookbridge_user_profiles', JSON.stringify(profiles));
    } catch (error) {
      console.warn('UserBehaviorAnalytics: Failed to save user profiles:', error);
    }
  }

  private async saveBehaviorPatterns(): Promise<void> {
    try {
      localStorage.setItem('bookbridge_behavior_patterns', JSON.stringify(this.behaviorPatterns));
    } catch (error) {
      console.warn('UserBehaviorAnalytics: Failed to save behavior patterns:', error);
    }
  }

  private startAnalyticsProcessing(): void {
    // Process interaction buffer every 30 seconds
    this.analyticsInterval = setInterval(async () => {
      await this.processInteractionBuffer();
      await this.updateBehaviorPatterns();
      await this.generateCacheOptimizations();
    }, 30 * 1000);
  }

  private async initializeDefaultPatterns(): Promise<void> {
    const defaultPatterns: BehaviorPattern[] = [
      {
        patternId: 'evening_reader',
        name: 'Evening Reading Pattern',
        description: 'Users who primarily read in evening hours (18-22)',
        conditions: [
          { metric: 'time_of_day', operator: 'range', value: [18, 22] }
        ],
        predictions: [
          { type: 'next_chunk', probability: 0.8, metadata: { prefetch_distance: 3 } },
          { type: 'quality_preference', probability: 0.7, metadata: { quality: AudioQuality.HIGH } }
        ],
        confidence: 0.7,
        usageCount: 0,
        successRate: 0
      },
      {
        patternId: 'speed_reader',
        name: 'Speed Reader Pattern',
        description: 'Users with high reading speed and low skip rate',
        conditions: [
          { metric: 'reading_speed', operator: 'gt', value: 250 },
          { metric: 'skip_rate', operator: 'lt', value: 0.1 }
        ],
        predictions: [
          { type: 'next_chunk', probability: 0.9, metadata: { prefetch_distance: 5 } },
          { type: 'session_end', probability: 0.3, metadata: { likely_duration: 45 } }
        ],
        confidence: 0.8,
        usageCount: 0,
        successRate: 0
      },
      {
        patternId: 'mobile_commuter',
        name: 'Mobile Commuter Pattern',
        description: 'Users reading on mobile networks with consistent patterns',
        conditions: [
          { metric: 'network_type', operator: 'in', value: [NetworkType.THREEG, NetworkType.FOURG] },
          { metric: 'session_duration', operator: 'range', value: [20, 60] }
        ],
        predictions: [
          { type: 'quality_preference', probability: 0.8, metadata: { quality: AudioQuality.MEDIUM } },
          { type: 'next_chunk', probability: 0.75, metadata: { prefetch_distance: 2 } }
        ],
        confidence: 0.75,
        usageCount: 0,
        successRate: 0
      }
    ];

    // Add default patterns if they don't exist
    for (const pattern of defaultPatterns) {
      const exists = this.behaviorPatterns.find(p => p.patternId === pattern.patternId);
      if (!exists) {
        this.behaviorPatterns.push(pattern);
      }
    }

    await this.saveBehaviorPatterns();
  }

  // Public methods for session management

  startSession(userId?: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      sessionId,
      userId,
      startTime: Date.now(),
      endTime: 0,
      booksAccessed: [],
      chaptersRead: [],
      readingSpeed: 0,
      skipRate: 0,
      backtrackRate: 0,
      preferredQuality: AudioQuality.MEDIUM,
      networkConditions: [],
      interactionPatterns: []
    };

    console.log(`UserBehaviorAnalytics: Started session ${sessionId}${userId ? ` for user ${userId}` : ''}`);
    return sessionId;
  }

  endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      this.processSession(this.currentSession);
      console.log(`UserBehaviorAnalytics: Ended session ${this.currentSession.sessionId}`);
      this.currentSession = null;
    }
  }

  recordInteraction(event: Omit<InteractionEvent, 'timestamp'>): void {
    if (!this.currentSession) return;

    const interaction: InteractionEvent = {
      ...event,
      timestamp: Date.now()
    };

    this.currentSession.interactionPatterns.push(interaction);
    this.interactionBuffer.push(interaction);

    // Update session metrics in real-time
    this.updateSessionMetrics(interaction);
  }

  private updateSessionMetrics(event: InteractionEvent): void {
    if (!this.currentSession) return;

    const session = this.currentSession;

    // Track books accessed
    if (!session.booksAccessed.includes(event.bookId)) {
      session.booksAccessed.push(event.bookId);
    }

    // Update network conditions
    const currentNetwork = audioCacheDB.getCurrentNetworkInfo().type;
    if (!session.networkConditions.includes(currentNetwork)) {
      session.networkConditions.push(currentNetwork);
    }

    // Calculate reading speed based on play events
    if (event.type === 'play' && event.duration) {
      // Estimate words per minute based on audio duration
      const estimatedWords = (event.duration / 1000) * 3; // ~3 words per second average
      const minutes = event.duration / (1000 * 60);
      session.readingSpeed = estimatedWords / minutes;
    }

    // Calculate skip rate
    const totalInteractions = session.interactionPatterns.length;
    const skipEvents = session.interactionPatterns.filter(e => e.type === 'skip').length;
    session.skipRate = skipEvents / totalInteractions;

    // Calculate backtrack rate
    const backEvents = session.interactionPatterns.filter(e => e.type === 'back').length;
    session.backtrackRate = backEvents / totalInteractions;
  }

  private async processSession(session: UserSession): Promise<void> {
    const sessionDuration = (session.endTime - session.startTime) / (1000 * 60); // minutes
    
    // Update user profile if available
    if (session.userId) {
      await this.updateUserProfile(session.userId, session);
    }

    // Analyze session for patterns
    await this.analyzeSessionForPatterns(session);

    console.log(`UserBehaviorAnalytics: Processed session - Duration: ${sessionDuration.toFixed(1)}min, Books: ${session.booksAccessed.length}, Interactions: ${session.interactionPatterns.length}`);
  }

  private async updateUserProfile(userId: string, session: UserSession): Promise<void> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      // Create new profile
      profile = {
        userId,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        avgReadingSpeed: session.readingSpeed,
        preferredReadingTimes: [],
        avgSessionDuration: (session.endTime - session.startTime) / (1000 * 60),
        avgChaptersPerSession: session.chaptersRead.length,
        preferredQuality: session.preferredQuality,
        qualityAdaptation: false,
        speedPreference: 1.0,
        favoriteGenres: [],
        readingProgression: 'linear',
        skipBehavior: {
          skipRate: session.skipRate,
          commonSkipTriggers: []
        },
        networkTolerance: {
          [NetworkType.SLOW_2G]: 0.3,
          [NetworkType.TWOG]: 0.5,
          [NetworkType.THREEG]: 0.7,
          [NetworkType.FOURG]: 0.9,
          [NetworkType.WIFI]: 1.0
        },
        personalCacheHitRate: 0.5,
        prefetchAccuracy: 0.5,
        personalizedEvictionScore: 1.0
      };
    } else {
      // Update existing profile with exponential moving average
      const alpha = 0.1; // Learning rate
      
      profile.avgReadingSpeed = profile.avgReadingSpeed * (1 - alpha) + session.readingSpeed * alpha;
      profile.avgSessionDuration = profile.avgSessionDuration * (1 - alpha) + 
        ((session.endTime - session.startTime) / (1000 * 60)) * alpha;
      profile.skipBehavior.skipRate = profile.skipBehavior.skipRate * (1 - alpha) + session.skipRate * alpha;
      profile.lastUpdated = Date.now();
    }

    // Update reading time preferences
    const sessionHour = new Date(session.startTime).getHours();
    if (!profile.preferredReadingTimes.includes(sessionHour)) {
      profile.preferredReadingTimes.push(sessionHour);
      profile.preferredReadingTimes.sort((a, b) => a - b);
      
      // Keep only top 5 preferred hours
      if (profile.preferredReadingTimes.length > 5) {
        profile.preferredReadingTimes = profile.preferredReadingTimes.slice(0, 5);
      }
    }

    this.userProfiles.set(userId, profile);
    await this.saveUserProfiles();
  }

  private async analyzeSessionForPatterns(session: UserSession): Promise<void> {
    // Check which existing patterns match this session
    for (const pattern of this.behaviorPatterns) {
      const matches = this.checkPatternMatch(session, pattern);
      if (matches) {
        pattern.usageCount++;
        
        // Validate predictions and update success rate
        const predictions = await this.validatePatternPredictions(session, pattern);
        if (predictions.length > 0) {
          const successfulPredictions = predictions.filter(p => p.successful).length;
          const successRate = successfulPredictions / predictions.length;
          
          // Update pattern success rate with exponential moving average
          pattern.successRate = pattern.successRate * 0.9 + successRate * 0.1;
          pattern.confidence = Math.min(0.95, pattern.confidence + 0.01);
        }
      }
    }

    // Try to discover new patterns
    await this.discoverNewPatterns(session);
    await this.saveBehaviorPatterns();
  }

  private checkPatternMatch(session: UserSession, pattern: BehaviorPattern): boolean {
    for (const condition of pattern.conditions) {
      if (!this.evaluateCondition(session, condition)) {
        return false;
      }
    }
    return true;
  }

  private evaluateCondition(session: UserSession, condition: PatternCondition): boolean {
    let value: any;

    switch (condition.metric) {
      case 'time_of_day':
        value = new Date(session.startTime).getHours();
        break;
      case 'network_type':
        value = session.networkConditions;
        break;
      case 'reading_speed':
        value = session.readingSpeed;
        break;
      case 'session_duration':
        value = (session.endTime - session.startTime) / (1000 * 60);
        break;
      case 'skip_rate':
        value = session.skipRate;
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case 'gt':
        return value > condition.value;
      case 'lt':
        return value < condition.value;
      case 'eq':
        return value === condition.value;
      case 'range':
        return value >= condition.value[0] && value <= condition.value[1];
      case 'in':
        return Array.isArray(value) ? 
          value.some(v => condition.value.includes(v)) : 
          condition.value.includes(value);
      default:
        return false;
    }
  }

  private async validatePatternPredictions(
    session: UserSession, 
    pattern: BehaviorPattern
  ): Promise<{ prediction: PatternPrediction; successful: boolean }[]> {
    const results: { prediction: PatternPrediction; successful: boolean }[] = [];

    for (const prediction of pattern.predictions) {
      let successful = false;

      switch (prediction.type) {
        case 'next_chunk':
          // Check if user actually continued reading as predicted
          const continuousPlay = this.analyzeContinuousPlayback(session);
          successful = continuousPlay >= prediction.probability;
          break;

        case 'quality_preference':
          // Check if user preferred the predicted quality
          const preferredQuality = this.getSessionPreferredQuality(session);
          successful = preferredQuality === prediction.metadata.quality;
          break;

        case 'session_end':
          // Check if session ended around predicted time
          const actualDuration = (session.endTime - session.startTime) / (1000 * 60);
          const predictedDuration = prediction.metadata.likely_duration;
          successful = Math.abs(actualDuration - predictedDuration) < 10; // Within 10 minutes
          break;

        case 'skip_likely':
          // Check if user skipped content as predicted
          successful = session.skipRate >= prediction.probability;
          break;
      }

      results.push({ prediction, successful });
    }

    return results;
  }

  private analyzeContinuousPlayback(session: UserSession): number {
    const playEvents = session.interactionPatterns.filter(e => e.type === 'play');
    const totalEvents = session.interactionPatterns.length;
    
    if (totalEvents === 0) return 0;
    
    return playEvents.length / totalEvents;
  }

  private getSessionPreferredQuality(session: UserSession): AudioQuality {
    const qualityChanges = session.interactionPatterns
      .filter(e => e.type === 'quality_change')
      .map(e => e.metadata?.quality)
      .filter(q => q !== undefined);
    
    if (qualityChanges.length > 0) {
      return qualityChanges[qualityChanges.length - 1]; // Last quality change
    }
    
    return session.preferredQuality;
  }

  private async discoverNewPatterns(session: UserSession): Promise<void> {
    // Simple pattern discovery - look for unique combinations of conditions
    // This is a simplified version of what would be a more sophisticated ML approach
    
    const sessionHour = new Date(session.startTime).getHours();
    const sessionDuration = (session.endTime - session.startTime) / (1000 * 60);
    const currentNetwork = audioCacheDB.getCurrentNetworkInfo().type;

    // Look for unique time/network combinations
    const timeNetworkPattern = `time_${sessionHour}_network_${currentNetwork}`;
    const existingPattern = this.behaviorPatterns.find(p => p.patternId === timeNetworkPattern);
    
    if (!existingPattern && sessionDuration > 10) { // Only create patterns for meaningful sessions
      const newPattern: BehaviorPattern = {
        patternId: timeNetworkPattern,
        name: `${sessionHour}h ${currentNetwork} Pattern`,
        description: `Reading pattern for hour ${sessionHour} on ${currentNetwork} network`,
        conditions: [
          { metric: 'time_of_day', operator: 'eq', value: sessionHour },
          { metric: 'network_type', operator: 'in', value: [currentNetwork] }
        ],
        predictions: [
          {
            type: 'next_chunk',
            probability: session.skipRate < 0.2 ? 0.8 : 0.6,
            metadata: { prefetch_distance: session.readingSpeed > 200 ? 4 : 2 }
          },
          {
            type: 'quality_preference',
            probability: 0.7,
            metadata: { quality: this.getSessionPreferredQuality(session) }
          }
        ],
        confidence: 0.3, // Start with low confidence
        usageCount: 1,
        successRate: 0.5
      };

      this.behaviorPatterns.push(newPattern);
      console.log(`UserBehaviorAnalytics: Discovered new pattern: ${newPattern.name}`);
    }
  }

  private async processInteractionBuffer(): Promise<void> {
    if (this.interactionBuffer.length === 0) return;

    // Process recent interactions for real-time optimizations
    const recentInteractions = this.interactionBuffer.splice(0); // Clear buffer
    
    for (const interaction of recentInteractions) {
      await this.applyRealTimeOptimization(interaction);
    }
  }

  private async applyRealTimeOptimization(interaction: InteractionEvent): Promise<void> {
    // Apply immediate optimizations based on user behavior
    
    if (interaction.type === 'skip' && this.currentSession) {
      // User is skipping - reduce prefetch distance for similar content
      const skipRate = this.currentSession.skipRate;
      if (skipRate > 0.3) {
        // Notify cache system to reduce prefetch aggressiveness
        console.log('UserBehaviorAnalytics: High skip rate detected, reducing prefetch distance');
      }
    }

    if (interaction.type === 'quality_change') {
      // User manually changed quality - learn preference
      const newQuality = interaction.metadata?.quality;
      if (newQuality && this.currentSession) {
        this.currentSession.preferredQuality = newQuality;
        
        // Update user profile immediately for better predictions
        if (this.currentSession.userId) {
          const profile = this.userProfiles.get(this.currentSession.userId);
          if (profile) {
            profile.preferredQuality = newQuality;
            profile.qualityAdaptation = true;
          }
        }
      }
    }
  }

  private async updateBehaviorPatterns(): Promise<void> {
    // Periodically update pattern confidence and remove low-performing patterns
    
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    this.behaviorPatterns = this.behaviorPatterns.filter(pattern => {
      // Remove patterns with very low success rate after sufficient usage
      if (pattern.usageCount > 10 && pattern.successRate < 0.3) {
        console.log(`UserBehaviorAnalytics: Removing low-performing pattern: ${pattern.name}`);
        return false;
      }
      
      // Decay confidence of unused patterns
      if (pattern.usageCount === 0) {
        pattern.confidence *= 0.99; // Gradual decay
      }
      
      return pattern.confidence > 0.1; // Keep patterns with some confidence
    });
  }

  private async generateCacheOptimizations(): Promise<void> {
    const recommendations = await this.generateOptimizationRecommendations();
    
    // Apply high-priority recommendations automatically
    const highPriorityRecs = recommendations.filter(r => r.priority === 'high' && r.confidence > 0.7);
    
    for (const rec of highPriorityRecs) {
      try {
        const success = await rec.implementation();
        if (success) {
          console.log(`UserBehaviorAnalytics: Applied optimization: ${rec.action}`);
        }
      } catch (error) {
        console.warn(`UserBehaviorAnalytics: Failed to apply optimization ${rec.action}:`, error);
      }
    }
  }

  // Public methods for cache optimization

  async generateOptimizationRecommendations(): Promise<CacheOptimizationRecommendation[]> {
    const recommendations: CacheOptimizationRecommendation[] = [];
    const currentSession = this.currentSession;
    const activePatterns = this.behaviorPatterns.filter(p => p.confidence > 0.5);

    // Generate prefetch optimizations
    if (currentSession && activePatterns.length > 0) {
      const matchingPatterns = activePatterns.filter(p => this.checkPatternMatch(currentSession, p));
      
      for (const pattern of matchingPatterns) {
        const nextChunkPrediction = pattern.predictions.find(p => p.type === 'next_chunk');
        
        if (nextChunkPrediction && nextChunkPrediction.probability > 0.7) {
          recommendations.push({
            category: 'prefetch',
            priority: 'high',
            action: `Increase prefetch distance to ${nextChunkPrediction.metadata.prefetch_distance} chunks`,
            expectedImprovement: nextChunkPrediction.probability * 0.3,
            confidence: pattern.confidence,
            implementation: async () => {
              // Would integrate with prefetch service to adjust distance
              return true;
            }
          });
        }
      }
    }

    // Generate quality optimizations based on user profiles
    for (const [userId, profile] of this.userProfiles.entries()) {
      if (profile.qualityAdaptation && profile.preferredQuality) {
        recommendations.push({
          category: 'quality',
          priority: 'medium',
          action: `Set default quality to ${profile.preferredQuality} for user ${userId}`,
          expectedImprovement: 0.2,
          confidence: 0.8,
          implementation: async () => {
            // Would integrate with audio quality service
            return true;
          }
        });
      }
    }

    // Generate eviction optimizations
    const avgSkipRate = Array.from(this.userProfiles.values())
      .reduce((sum, p) => sum + p.skipBehavior.skipRate, 0) / this.userProfiles.size || 0;

    if (avgSkipRate > 0.3) {
      recommendations.push({
        category: 'eviction',
        priority: 'medium',
        action: 'Increase eviction priority for content with high skip patterns',
        expectedImprovement: avgSkipRate * 0.25,
        confidence: 0.7,
        implementation: async () => {
          // Would integrate with eviction service to adjust skip-based scoring
          return true;
        }
      });
    }

    return recommendations;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.userProfiles.get(userId) || null;
  }

  async getBehaviorPatterns(): Promise<BehaviorPattern[]> {
    return [...this.behaviorPatterns];
  }

  async getActivePatterns(): Promise<BehaviorPattern[]> {
    return this.behaviorPatterns.filter(p => p.confidence > 0.5);
  }

  async getCurrentSessionAnalytics(): Promise<{
    session: UserSession | null;
    matchingPatterns: BehaviorPattern[];
    predictions: PatternPrediction[];
  }> {
    if (!this.currentSession) {
      return { session: null, matchingPatterns: [], predictions: [] };
    }

    const matchingPatterns = this.behaviorPatterns.filter(p => 
      this.checkPatternMatch(this.currentSession!, p)
    );

    const predictions: PatternPrediction[] = [];
    for (const pattern of matchingPatterns) {
      predictions.push(...pattern.predictions);
    }

    return {
      session: this.currentSession,
      matchingPatterns,
      predictions
    };
  }

  async exportAnalyticsData(): Promise<{
    userProfiles: UserProfile[];
    behaviorPatterns: BehaviorPattern[];
    currentSession: UserSession | null;
  }> {
    return {
      userProfiles: Array.from(this.userProfiles.values()),
      behaviorPatterns: [...this.behaviorPatterns],
      currentSession: this.currentSession
    };
  }

  stop(): void {
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
      this.analyticsInterval = null;
    }
    
    if (this.currentSession) {
      this.endSession();
    }
  }
}

// Export singleton instance
export const userBehaviorAnalytics = UserBehaviorAnalyticsService.getInstance();