import { ExternalBook } from '@/types/book-sources';

// User interaction types for tracking engagement
export interface UserInteraction {
  userId?: string; // Optional for anonymous users
  sessionId: string; // Track anonymous sessions
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookGenres: string[];
  bookSource: string;
  interactionType: 'view' | 'analyze' | 'read' | 'favorite';
  timestamp: Date;
  timeSpent?: number; // Time spent on book in seconds
  analysisDepth?: number; // Number of AI questions asked
}

// Book similarity score interface
export interface BookSimilarity {
  bookId: string;
  similarityScore: number;
  reasons: string[]; // Why these books are similar
}

// Recommendation result interface
export interface BookRecommendation {
  book: ExternalBook;
  score: number;
  reason: string;
  confidence: number; // 0-1 score of recommendation confidence
}

class RecommendationEngine {
  private interactions: UserInteraction[] = [];
  private readonly STORAGE_KEY = 'bookbridge_interactions';
  
  constructor() {
    this.loadInteractions();
  }

  // Track user interactions with books
  trackInteraction(interaction: Omit<UserInteraction, 'timestamp'>): void {
    const fullInteraction: UserInteraction = {
      ...interaction,
      timestamp: new Date()
    };
    
    this.interactions.push(fullInteraction);
    this.saveInteractions();
    
    console.log('📊 Tracked interaction:', fullInteraction.interactionType, 'with', fullInteraction.bookTitle);
  }

  // Get user's interaction history
  getUserInteractions(sessionId: string, userId?: string): UserInteraction[] {
    return this.interactions.filter(interaction => 
      interaction.sessionId === sessionId || 
      (userId && interaction.userId === userId)
    );
  }

  // Calculate similarity between two books based on metadata
  calculateBookSimilarity(book1: ExternalBook, book2: ExternalBook): number {
    let similarity = 0;
    let factors = 0;

    // Author similarity (high weight)
    if (book1.author.toLowerCase() === book2.author.toLowerCase()) {
      similarity += 0.4;
    } else if (this.sharesSurname(book1.author, book2.author)) {
      similarity += 0.2;
    }
    factors += 0.4;

    // Genre/subject similarity (high weight)
    const genreOverlap = this.calculateGenreOverlap(book1.subjects, book2.subjects);
    similarity += genreOverlap * 0.3;
    factors += 0.3;

    // Publication year proximity (medium weight)
    if (book1.publicationYear && book2.publicationYear) {
      const yearDiff = Math.abs(book1.publicationYear - book2.publicationYear);
      const yearSimilarity = Math.max(0, 1 - yearDiff / 50); // 50-year range
      similarity += yearSimilarity * 0.2;
    }
    factors += 0.2;

    // Language similarity (low weight)
    if (book1.language === book2.language) {
      similarity += 0.1;
    }
    factors += 0.1;

    return similarity / factors;
  }

  // Find books similar to a given book
  findSimilarBooks(targetBook: ExternalBook, candidateBooks: ExternalBook[], limit: number = 8): BookRecommendation[] {
    const similarities = candidateBooks
      .filter(book => book.id !== targetBook.id) // Don't recommend the same book
      .map(book => ({
        book,
        score: this.calculateBookSimilarity(targetBook, book),
        reason: this.generateSimilarityReason(targetBook, book),
        confidence: this.calculateConfidence(targetBook, book)
      }))
      .filter(rec => rec.score > 0.1) // Minimum similarity threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return similarities;
  }

  // Generate collaborative filtering recommendations
  generateCollaborativeRecommendations(sessionId: string, allBooks: ExternalBook[], userId?: string): BookRecommendation[] {
    const userInteractions = this.getUserInteractions(sessionId, userId);
    
    if (userInteractions.length === 0) {
      return [];
    }

    // Find books the user has interacted with
    const userBookIds = new Set(userInteractions.map(i => i.bookId));
    
    // Find other users who liked similar books
    const similarUsers = this.findSimilarUsers(sessionId, userId);
    
    // Get books liked by similar users that current user hasn't seen
    const recommendations: Map<string, { book: ExternalBook; score: number; count: number }> = new Map();
    
    similarUsers.forEach(similarUser => {
      similarUser.interactions
        .filter(interaction => 
          !userBookIds.has(interaction.bookId) && 
          (interaction.interactionType === 'analyze' || interaction.interactionType === 'favorite')
        )
        .forEach(interaction => {
          const existingRec = recommendations.get(interaction.bookId);
          const book = allBooks.find(b => b.id === interaction.bookId);
          
          if (book) {
            if (existingRec) {
              existingRec.score += similarUser.similarity;
              existingRec.count += 1;
            } else {
              recommendations.set(interaction.bookId, {
                book,
                score: similarUser.similarity,
                count: 1
              });
            }
          }
        });
    });

    return Array.from(recommendations.values())
      .map(rec => ({
        book: rec.book,
        score: rec.score / rec.count, // Average similarity score
        reason: `Users with similar taste also enjoyed this book`,
        confidence: Math.min(1, rec.count / 3) // Higher confidence with more recommendations
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }

  // Generate hybrid recommendations combining content-based and collaborative filtering
  generateRecommendations(
    targetBook: ExternalBook, 
    allBooks: ExternalBook[], 
    sessionId: string, 
    userId?: string
  ): BookRecommendation[] {
    // Content-based recommendations (70% weight)
    const contentBasedRecs = this.findSimilarBooks(targetBook, allBooks, 10);
    
    // Collaborative filtering recommendations (30% weight)
    const collaborativeRecs = this.generateCollaborativeRecommendations(sessionId, allBooks, userId);
    
    // Combine and deduplicate
    const combinedRecs = new Map<string, BookRecommendation>();
    
    // Add content-based with higher weight
    contentBasedRecs.forEach(rec => {
      combinedRecs.set(rec.book.id, {
        ...rec,
        score: rec.score * 0.7,
        reason: `Similar to "${targetBook.title}": ${rec.reason}`
      });
    });
    
    // Add collaborative with lower weight
    collaborativeRecs.forEach(rec => {
      const existing = combinedRecs.get(rec.book.id);
      if (existing) {
        // Boost score if both methods recommend it
        existing.score = existing.score + (rec.score * 0.3);
        existing.confidence = Math.max(existing.confidence, rec.confidence);
        existing.reason += ` (Also liked by similar readers)`;
      } else {
        combinedRecs.set(rec.book.id, {
          ...rec,
          score: rec.score * 0.3
        });
      }
    });

    return Array.from(combinedRecs.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }

  // Private helper methods
  private sharesSurname(author1: string, author2: string): boolean {
    const surname1 = author1.split(' ').pop()?.toLowerCase() || '';
    const surname2 = author2.split(' ').pop()?.toLowerCase() || '';
    return surname1 === surname2 && surname1.length > 2;
  }

  private calculateGenreOverlap(genres1: string[], genres2: string[]): number {
    if (genres1.length === 0 || genres2.length === 0) return 0;
    
    const set1 = new Set(genres1.map(g => g.toLowerCase()));
    const set2 = new Set(genres2.map(g => g.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  private generateSimilarityReason(book1: ExternalBook, book2: ExternalBook): string {
    const reasons: string[] = [];
    
    if (book1.author.toLowerCase() === book2.author.toLowerCase()) {
      reasons.push('same author');
    } else if (this.sharesSurname(book1.author, book2.author)) {
      reasons.push('related author');
    }
    
    const sharedGenres = book1.subjects.filter(g1 => 
      book2.subjects.some(g2 => g1.toLowerCase() === g2.toLowerCase())
    );
    
    if (sharedGenres.length > 0) {
      reasons.push(`shared ${sharedGenres[0]} theme`);
    }
    
    if (book1.publicationYear && book2.publicationYear) {
      const yearDiff = Math.abs(book1.publicationYear - book2.publicationYear);
      if (yearDiff <= 10) {
        reasons.push('similar time period');
      }
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'similar themes and style';
  }

  private calculateConfidence(book1: ExternalBook, book2: ExternalBook): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for same author
    if (book1.author.toLowerCase() === book2.author.toLowerCase()) {
      confidence += 0.3;
    }
    
    // Higher confidence for multiple shared genres
    const sharedGenres = book1.subjects.filter(g1 => 
      book2.subjects.some(g2 => g1.toLowerCase() === g2.toLowerCase())
    );
    confidence += Math.min(0.2, sharedGenres.length * 0.05);
    
    return Math.min(1, confidence);
  }

  private findSimilarUsers(sessionId: string, userId?: string): Array<{ similarity: number; interactions: UserInteraction[] }> {
    const currentUserInteractions = this.getUserInteractions(sessionId, userId);
    const currentUserBooks = new Set(currentUserInteractions.map(i => i.bookId));
    
    // Group interactions by user/session
    const userGroups = new Map<string, UserInteraction[]>();
    
    this.interactions.forEach(interaction => {
      const key = interaction.userId || interaction.sessionId;
      if (key !== (userId || sessionId)) { // Don't include current user
        if (!userGroups.has(key)) {
          userGroups.set(key, []);
        }
        userGroups.get(key)!.push(interaction);
      }
    });
    
    // Calculate similarity with other users
    return Array.from(userGroups.entries())
      .map(([userKey, interactions]) => {
        const otherUserBooks = new Set(interactions.map(i => i.bookId));
        const intersection = new Set([...currentUserBooks].filter(x => otherUserBooks.has(x)));
        const union = new Set([...currentUserBooks, ...otherUserBooks]);
        
        const similarity = union.size > 0 ? intersection.size / union.size : 0;
        
        return { similarity, interactions };
      })
      .filter(user => user.similarity > 0.1) // Minimum similarity threshold
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // Top 5 similar users
  }

  private saveInteractions(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      // Keep only last 1000 interactions for performance
      const recentInteractions = this.interactions.slice(-1000);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentInteractions));
      this.interactions = recentInteractions;
    } catch (error) {
      console.warn('Failed to save interactions to localStorage:', error);
    }
  }

  private loadInteractions(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        this.interactions = [];
        return;
      }
      
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.interactions = JSON.parse(stored).map((interaction: any) => ({
          ...interaction,
          timestamp: new Date(interaction.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load interactions from localStorage:', error);
      this.interactions = [];
    }
  }

  // Utility method to generate session ID
  static generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  }

  // Get popular books for cold start problem
  getPopularBooks(allBooks: ExternalBook[]): BookRecommendation[] {
    // Count interactions per book
    const bookCounts = new Map<string, number>();
    
    this.interactions.forEach(interaction => {
      const count = bookCounts.get(interaction.bookId) || 0;
      bookCounts.set(interaction.bookId, count + 1);
    });
    
    return allBooks
      .map(book => ({
        book,
        score: (bookCounts.get(book.id) || 0) + (book.popularity || 0),
        reason: 'Popular among readers',
        confidence: 0.7
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }
}

// Export singleton instance
export const recommendationEngine = new RecommendationEngine();

// Export utility functions
export const trackBookInteraction = (interaction: Omit<UserInteraction, 'timestamp'>) => {
  recommendationEngine.trackInteraction(interaction);
};

export const getRecommendationsForBook = (
  targetBook: ExternalBook, 
  allBooks: ExternalBook[], 
  sessionId: string, 
  userId?: string
): BookRecommendation[] => {
  return recommendationEngine.generateRecommendations(targetBook, allBooks, sessionId, userId);
};

export const getPopularRecommendations = (allBooks: ExternalBook[]): BookRecommendation[] => {
  return recommendationEngine.getPopularBooks(allBooks);
};