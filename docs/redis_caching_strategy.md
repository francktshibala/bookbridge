# Redis Caching Strategy for BookBridge

## Architecture Overview

### Cache Layers

1. **Question-Answer Cache** (80% hit rate target)
   - Key: `qa:{book_id}:{question_hash}`
   - TTL: 30 days
   - Value: Complete AI response

2. **Book Context Cache** (90% hit rate)
   - Key: `context:{book_id}:{chapter}`
   - TTL: 60 days
   - Value: Processed chapter embeddings

3. **User Session Cache** (100% hit rate)
   - Key: `session:{user_id}:{book_id}`
   - TTL: 24 hours
   - Value: Recent conversation context

## Implementation Code

```typescript
import Redis from 'ioredis';
import crypto from 'crypto';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
});

// Question-Answer Caching
export class AIResponseCache {
  private static readonly CACHE_PREFIX = 'qa:';
  private static readonly TTL = 60 * 60 * 24 * 30; // 30 days

  static generateKey(bookId: string, question: string): string {
    const questionHash = crypto
      .createHash('sha256')
      .update(question.toLowerCase().trim())
      .digest('hex');
    return `${this.CACHE_PREFIX}${bookId}:${questionHash}`;
  }

  static async get(bookId: string, question: string): Promise<string | null> {
    const key = this.generateKey(bookId, question);
    const cached = await redis.get(key);
    
    if (cached) {
      // Update analytics
      await redis.incr('stats:cache_hits');
      return cached;
    }
    
    await redis.incr('stats:cache_misses');
    return null;
  }

  static async set(
    bookId: string, 
    question: string, 
    response: string
  ): Promise<void> {
    const key = this.generateKey(bookId, question);
    await redis.setex(key, this.TTL, response);
  }

  // Similar question matching
  static async findSimilar(
    bookId: string, 
    question: string, 
    threshold: number = 0.8
  ): Promise<string | null> {
    const pattern = `${this.CACHE_PREFIX}${bookId}:*`;
    const keys = await redis.keys(pattern);
    
    // Use vector similarity for better matching
    // This is a simplified version - use embeddings in production
    for (const key of keys) {
      const cached = await redis.get(key);
      if (cached) {
        const similarity = this.calculateSimilarity(question, cached);
        if (similarity > threshold) {
          await redis.incr('stats:similar_cache_hits');
          return cached;
        }
      }
    }
    
    return null;
  }

  private static calculateSimilarity(q1: string, q2: string): number {
    // Implement cosine similarity with embeddings
    // Simplified for example
    return 0.5;
  }
}

// Book Context Caching
export class BookContextCache {
  private static readonly CACHE_PREFIX = 'context:';
  private static readonly TTL = 60 * 60 * 24 * 60; // 60 days

  static async getChapterContext(
    bookId: string, 
    chapter: number
  ): Promise<any | null> {
    const key = `${this.CACHE_PREFIX}${bookId}:${chapter}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  static async setChapterContext(
    bookId: string, 
    chapter: number, 
    context: any
  ): Promise<void> {
    const key = `${this.CACHE_PREFIX}${bookId}:${chapter}`;
    await redis.setex(key, this.TTL, JSON.stringify(context));
  }

  // Pre-warm cache for popular books
  static async prewarmPopularBooks(): Promise<void> {
    const popularBooks = await redis.zrevrange('stats:popular_books', 0, 10);
    
    for (const bookId of popularBooks) {
      // Process and cache book contexts in background
      await this.processBookForCache(bookId);
    }
  }

  private static async processBookForCache(bookId: string): Promise<void> {
    // Implementation for processing book chapters
  }
}

// Session Context Management
export class SessionCache {
  private static readonly CACHE_PREFIX = 'session:';
  private static readonly TTL = 60 * 60 * 24; // 24 hours

  static async getConversation(
    userId: string, 
    bookId: string
  ): Promise<any[]> {
    const key = `${this.CACHE_PREFIX}${userId}:${bookId}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : [];
  }

  static async appendMessage(
    userId: string, 
    bookId: string, 
    message: any
  ): Promise<void> {
    const key = `${this.CACHE_PREFIX}${userId}:${bookId}`;
    const conversation = await this.getConversation(userId, bookId);
    
    // Keep last 10 messages for context
    conversation.push(message);
    if (conversation.length > 10) {
      conversation.shift();
    }
    
    await redis.setex(key, this.TTL, JSON.stringify(conversation));
  }

  // Compress old sessions
  static async compressOldSessions(): Promise<void> {
    const pattern = `${this.CACHE_PREFIX}*`;
    const cursor = '0';
    
    // Use SCAN instead of KEYS for production
    const keys = await redis.scan(
      cursor, 
      'MATCH', 
      pattern, 
      'COUNT', 
      100
    );
    
    for (const key of keys[1]) {
      const ttl = await redis.ttl(key);
      if (ttl < 3600) { // Last hour
        // Compress and move to cold storage
        await this.compressSession(key);
      }
    }
  }

  private static async compressSession(key: string): Promise<void> {
    // Implementation for session compression
  }
}

// Cache Warming Strategies
export class CacheWarmer {
  static async warmFrequentQuestions(): Promise<void> {
    const commonQuestions = [
      "What are the main themes?",
      "Who are the main characters?",
      "What is the plot summary?",
      "What is the setting?",
      "What is the author's purpose?"
    ];

    const popularBooks = await redis.zrevrange('stats:popular_books', 0, 20);
    
    for (const bookId of popularBooks) {
      for (const question of commonQuestions) {
        const cached = await AIResponseCache.get(bookId, question);
        if (!cached) {
          // Generate and cache response
          const response = await generateAIResponse(bookId, question);
          await AIResponseCache.set(bookId, question, response);
        }
      }
    }
  }

  static async analyzeAndOptimize(): Promise<void> {
    const stats = {
      hits: await redis.get('stats:cache_hits') || 0,
      misses: await redis.get('stats:cache_misses') || 0,
      similarHits: await redis.get('stats:similar_cache_hits') || 0
    };

    const hitRate = Number(stats.hits) / 
      (Number(stats.hits) + Number(stats.misses));

    if (hitRate < 0.7) {
      // Increase cache warming
      await this.warmFrequentQuestions();
    }

    // Log metrics for monitoring
    console.log('Cache Performance:', {
      hitRate: `${(hitRate * 100).toFixed(2)}%`,
      totalRequests: Number(stats.hits) + Number(stats.misses),
      similarHits: stats.similarHits
    });
  }
}

// Cost Monitoring Integration
export class CostMonitor {
  static async trackAPICall(
    model: string, 
    tokens: { input: number, output: number },
    cached: boolean
  ): Promise<void> {
    const costs = {
      'gpt-4o': { input: 0.0025, output: 0.01 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
    };

    const cost = (tokens.input * costs[model].input + 
                  tokens.output * costs[model].output) / 1000;

    if (!cached) {
      await redis.incrbyfloat(`costs:${model}:daily`, cost);
      await redis.expire(`costs:${model}:daily`, 86400);
    }

    // Check if approaching limit
    const dailyCost = await redis.get(`costs:${model}:daily`) || 0;
    if (Number(dailyCost) > 100) { // $100 daily limit
      console.error('COST ALERT: Daily limit approaching!');
      // Trigger alerts
    }
  }
}

// Utility function placeholder
async function generateAIResponse(bookId: string, question: string): Promise<string> {
  // Actual OpenAI API call implementation
  return "AI response";
}
```

## Cache Key Patterns

### Hierarchical Structure
```
qa:{book_id}:{question_hash}          # Q&A pairs
context:{book_id}:{chapter}           # Chapter embeddings
session:{user_id}:{book_id}           # User conversations
stats:cache_hits                      # Performance metrics
stats:popular_books                   # Sorted set of popular books
costs:{model}:daily                   # Cost tracking
```

## Performance Optimization

### 1. Pipeline Operations
```typescript
const pipeline = redis.pipeline();
pipeline.get(key1);
pipeline.get(key2);
pipeline.get(key3);
const results = await pipeline.exec();
```

### 2. Connection Pooling
```typescript
const redis = new Redis({
  host: process.env.REDIS_HOST,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
});
```

### 3. Memory Management
- Use Redis memory policies: `maxmemory-policy allkeys-lru`
- Monitor memory usage: `INFO memory`
- Implement key expiration strategies

## Monitoring & Alerts

### Key Metrics
1. Cache hit rate (target: 80%+)
2. Response time (target: <50ms)
3. Memory usage (alert at 80%)
4. Cost savings (track reduced API calls)

### Alert Thresholds
```typescript
const alerts = {
  lowHitRate: 0.7,        // Below 70% hit rate
  highMemory: 0.8,        // 80% memory usage
  slowResponse: 100,      // 100ms response time
  dailyCostLimit: 150     // $150 daily spend
};
```