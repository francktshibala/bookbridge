import OpenAI from 'openai';
import { LRUCache } from 'lru-cache';
import { createClient } from 'redis';
import { prisma } from '@/lib/prisma';

export interface AIResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  cost: number;
}

interface QueryOptions {
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export class AccessibleAIService {
  private openai: OpenAI;
  private cache: LRUCache<string, AIResponse>;
  private redis?: ReturnType<typeof createClient>;
  
  // Cost per 1K tokens (in USD)
  private readonly costs = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.cache = new LRUCache<string, AIResponse>({ 
      max: 10000,
      ttl: 1000 * 60 * 60 * 24 // 24 hours
    });

    // Initialize Redis if available
    if (process.env.REDIS_URL) {
      this.redis = createClient({ url: process.env.REDIS_URL });
    }
  }

  // Smart model selection based on query complexity
  private selectModel(query: string): 'gpt-4o' | 'gpt-3.5-turbo' {
    const complexPatterns = [
      /analyze.*literary.*technique/i,
      /compare.*characters/i,
      /explain.*symbolism/i,
      /what.*theme/i,
      /discuss.*meaning/i,
      /interpret.*passage/i,
      /analyze.*style/i,
      /evaluate.*argument/i
    ];

    const isComplex = complexPatterns.some(pattern => pattern.test(query));
    return isComplex ? 'gpt-4o' : 'gpt-3.5-turbo';
  }

  // Generate cache key for query
  private generateCacheKey(prompt: string, bookId?: string): string {
    const normalized = prompt.toLowerCase().trim();
    const key = bookId ? `${bookId}:${normalized}` : normalized;
    return Buffer.from(key).toString('base64');
  }

  // Calculate cost based on usage
  private calculateCost(model: string, usage: { prompt_tokens: number; completion_tokens: number }): number {
    const modelCosts = this.costs[model as keyof typeof this.costs];
    if (!modelCosts) return 0;

    const inputCost = (usage.prompt_tokens / 1000) * modelCosts.input;
    const outputCost = (usage.completion_tokens / 1000) * modelCosts.output;
    
    return inputCost + outputCost;
  }

  // Optimize prompt for minimal tokens
  private optimizePrompt(prompt: string, bookContext?: string): string {
    // System prompt optimized for educational Q&A
    const systemPrompt = `You are an educational AI assistant helping students understand books. 
Provide clear, concise answers that are accessible to users with disabilities. 
Use simple language and structure your responses with headings when helpful.`;

    // Remove unnecessary words and normalize
    const optimized = prompt
      .replace(/please|could you|would you|can you/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    let fullPrompt = `${systemPrompt}\n\nQuestion: ${optimized}`;
    
    if (bookContext) {
      fullPrompt += `\n\nBook Context: ${bookContext}`;
    }

    return fullPrompt;
  }

  // Check usage limits
  private async checkUsageLimits(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Check user daily limit
    const userUsage = await prisma.usage.findUnique({
      where: { 
        userId_date: { 
          userId, 
          date: new Date(today) 
        } 
      }
    });

    if (userUsage && userUsage.cost.toNumber() > 10) {
      return { allowed: false, reason: 'Daily user limit exceeded ($10)' };
    }

    // Check global daily limit
    const globalUsage = await prisma.systemUsage.findUnique({
      where: { date: new Date(today) }
    });

    if (globalUsage && globalUsage.totalCost.toNumber() > 150) {
      return { allowed: false, reason: 'Daily system limit exceeded ($150)' };
    }

    return { allowed: true };
  }

  // Track usage in database
  private async trackUsage(userId: string, usage: AIResponse['usage'], model: string, cost: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Update user usage
    await prisma.usage.upsert({
      where: { 
        userId_date: { 
          userId, 
          date: new Date(today) 
        } 
      },
      update: {
        queries: { increment: 1 },
        tokens: { increment: usage.total_tokens },
        cost: { increment: cost }
      },
      create: {
        userId,
        date: new Date(today),
        queries: 1,
        tokens: usage.total_tokens,
        cost: cost
      }
    });

    // Update system usage
    await prisma.systemUsage.upsert({
      where: { date: new Date(today) },
      update: {
        totalQueries: { increment: 1 },
        totalTokens: { increment: usage.total_tokens },
        totalCost: { increment: cost }
      },
      create: {
        date: new Date(today),
        totalQueries: 1,
        totalTokens: usage.total_tokens,
        totalCost: cost,
        activeUsers: 1
      }
    });
  }

  // Main query method
  async query(
    prompt: string, 
    options: QueryOptions & { userId: string; bookId?: string; bookContext?: string } = {} as any
  ): Promise<AIResponse> {
    const { userId, bookId, bookContext, maxTokens = 300, temperature = 0.7 } = options;

    // Check usage limits
    const usageCheck = await this.checkUsageLimits(userId);
    if (!usageCheck.allowed) {
      throw new Error(usageCheck.reason);
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(prompt, bookId);
    
    // Try Redis cache first
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error('Redis cache error:', error);
      }
    }

    // Try local cache
    const localCached = this.cache.get(cacheKey);
    if (localCached) {
      return localCached;
    }

    // Select model and optimize prompt
    const model = this.selectModel(prompt);
    const optimizedPrompt = this.optimizePrompt(prompt, bookContext);

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: optimizedPrompt }],
        max_tokens: maxTokens,
        temperature,
        stream: false
      });

      const usage = response.usage!;
      const cost = this.calculateCost(model, usage);
      
      const aiResponse: AIResponse = {
        content: response.choices[0].message.content || '',
        usage,
        model,
        cost
      };

      // Cache the response
      this.cache.set(cacheKey, aiResponse);
      
      // Cache in Redis with 30-day TTL
      if (this.redis) {
        try {
          await this.redis.setex(cacheKey, 30 * 24 * 60 * 60, JSON.stringify(aiResponse));
        } catch (error) {
          console.error('Redis cache set error:', error);
        }
      }

      // Track usage
      await this.trackUsage(userId, usage, model, cost);

      return aiResponse;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('AI service temporarily unavailable');
    }
  }

  // Streaming query method for real-time responses
  async *queryStream(
    prompt: string,
    options: QueryOptions & { userId: string; bookId?: string; bookContext?: string } = {} as any
  ): AsyncGenerator<string, void, unknown> {
    const { userId, bookId, bookContext, maxTokens = 300, temperature = 0.7 } = options;

    // Check usage limits
    const usageCheck = await this.checkUsageLimits(userId);
    if (!usageCheck.allowed) {
      throw new Error(usageCheck.reason);
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(prompt, bookId);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      yield cached.content;
      return;
    }

    const model = this.selectModel(prompt);
    const optimizedPrompt = this.optimizePrompt(prompt, bookContext);

    try {
      const stream = await this.openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: optimizedPrompt }],
        max_tokens: maxTokens,
        temperature,
        stream: true
      });

      let fullContent = '';
      let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          yield content;
        }

        // Get usage from final chunk
        if (chunk.usage) {
          usage = chunk.usage;
        }
      }

      // Cache and track the complete response
      const cost = this.calculateCost(model, usage);
      const aiResponse: AIResponse = {
        content: fullContent,
        usage,
        model,
        cost
      };

      this.cache.set(cacheKey, aiResponse);
      await this.trackUsage(userId, usage, model, cost);

    } catch (error) {
      console.error('OpenAI streaming error:', error);
      throw new Error('AI service temporarily unavailable');
    }
  }

  // Get usage statistics
  async getUsageStats(userId: string): Promise<{
    daily: { queries: number; tokens: number; cost: number };
    monthly: { queries: number; tokens: number; cost: number };
  }> {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    const dailyUsage = await prisma.usage.findUnique({
      where: { 
        userId_date: { 
          userId, 
          date: new Date(today) 
        } 
      }
    });

    const monthlyUsage = await prisma.usage.aggregate({
      where: {
        userId,
        date: {
          gte: new Date(`${thisMonth}-01`),
          lt: new Date(`${thisMonth}-31`)
        }
      },
      _sum: {
        queries: true,
        tokens: true,
        cost: true
      }
    });

    return {
      daily: {
        queries: dailyUsage?.queries || 0,
        tokens: dailyUsage?.tokens || 0,
        cost: dailyUsage?.cost.toNumber() || 0
      },
      monthly: {
        queries: monthlyUsage._sum.queries || 0,
        tokens: monthlyUsage._sum.tokens || 0,
        cost: monthlyUsage._sum.cost?.toNumber() || 0
      }
    };
  }
}

export const aiService = new AccessibleAIService();