import Anthropic from '@anthropic-ai/sdk';
import { LRUCache } from 'lru-cache';
import { createClient } from 'redis';
import { prisma } from '@/lib/prisma';
import { knowledgeGraphService } from '@/lib/knowledge-graph';
import { crossBookConnectionsService } from '@/lib/cross-book-connections';
import { learningProfileService } from '@/lib/learning-profile';

interface AIResponse {
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
  responseMode?: 'brief' | 'detailed';
}

export class ClaudeAIService {
  private anthropic: Anthropic;
  private cache: LRUCache<string, AIResponse>;
  private redis?: ReturnType<typeof createClient>;
  
  // Cost per 1K tokens (in USD) - Claude pricing
  private readonly costs = {
    'claude-3-5-haiku-20241022': { input: 0.001, output: 0.005 },
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'claude-3-opus-20240229': { input: 0.015, output: 0.075 }
  };

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
    });
    
    this.cache = new LRUCache<string, AIResponse>({ 
      max: 10000,
      ttl: 1000 * 60 * 60 * 24 // 24 hours
    });

    // Initialize Redis if available
    if (process.env.REDIS_URL) {
      console.log('Redis URL found, initializing Redis client');
      this.redis = createClient({ url: process.env.REDIS_URL });
      this.redis.connect().catch(console.error);
    } else {
      console.log('Redis URL not found, skipping Redis initialization');
      this.redis = undefined;
    }
  }

  // Smart model selection based on query complexity and response mode
  private selectModel(query: string, responseMode: 'brief' | 'detailed' = 'detailed'): string {
    const complexPatterns = [
      /analyze.*literary.*technique/i,
      /compare.*characters/i,
      /explain.*symbolism/i,
      /what.*theme/i,
      /discuss.*meaning/i,
      /interpret.*passage/i,
      /analyze.*style/i,
      /evaluate.*argument/i,
      /what.*author.*think/i,
      /author.*perspective/i,
      /deeper.*meaning/i,
      /philosophical/i,
      /significance/i,
      /underlying.*message/i,
      /critical.*analysis/i,
      /historical.*context/i,
      /literary.*criticism/i,
      // Multi-perspective cultural analysis patterns
      /different.*perspective/i,
      /cultural.*viewpoint/i,
      /multiple.*interpretation/i,
      /diverse.*view/i,
      /alternative.*reading/i,
      /marginalized.*voice/i,
      /cultural.*context/i,
      /various.*culture/i,
      /modern.*relevance/i,
      /contemporary.*connection/i,
      /scholarly.*debate/i,
      /different.*audience/i,
      /cross.*cultural/i,
      /global.*perspective/i
    ];

    const isComplex = complexPatterns.some(pattern => pattern.test(query));
    
    // Enhanced model selection logic:
    // - Detailed mode: Always use Sonnet for rich, elaborate responses
    // - Brief mode: Use Haiku for efficiency, Sonnet only for very complex queries
    if (responseMode === 'detailed') {
      return 'claude-3-5-sonnet-20241022'; // Always use best model for detailed analysis
    } else {
      // Brief mode: Haiku for simple, Sonnet for complex
      return isComplex ? 'claude-3-5-sonnet-20241022' : 'claude-3-5-haiku-20241022';
    }
  }

  // Detect if query requires multi-perspective cultural analysis
  private requiresMultiPerspectiveAnalysis(query: string): boolean {
    const multiPerspectivePatterns = [
      /different.*perspective/i,
      /cultural.*viewpoint/i,
      /multiple.*interpretation/i,
      /diverse.*view/i,
      /alternative.*reading/i,
      /marginalized.*voice/i,
      /various.*culture/i,
      /cross.*cultural/i,
      /global.*perspective/i,
      /modern.*relevance/i,
      /contemporary.*connection/i,
      /scholarly.*debate/i,
      /different.*audience/i,
      /how.*might.*different/i,
      /what.*would.*other/i,
      /from.*another.*perspective/i,
      /bias/i,
      /prejudice/i,
      /colonial/i,
      /feminist/i,
      /postcolonial/i,
      /indigenous/i,
      /minority/i,
      /oppressed/i,
      /power.*dynamic/i,
      /social.*justice/i,
      /representation/i
    ];
    
    return multiPerspectivePatterns.some(pattern => pattern.test(query));
  }


  // Intelligent conversation flow detection
  private shouldUseSocraticMode(query: string, bookContext?: string): 'initial' | 'followup' | 'none' {
    // Always avoid Socratic for factual queries
    const avoidPatterns = [
      /when.*written/i,
      /who.*author/i,
      /how.*many.*chapter/i,
      /what.*year/i,
      /where.*published/i,
      /how.*long/i,
      /what.*genre/i,
      /table.*content/i,
      /structure/i,
      /summary/i,
      /plot.*summary/i
    ];
    
    if (avoidPatterns.some(pattern => pattern.test(query))) {
      return 'none';
    }
    
    // Clear initial learning questions
    const initialLearningPatterns = [
      /what.*theme/i,
      /what.*meaning/i,
      /what.*message/i,
      /what.*author.*trying/i,
      /what.*significance/i,
      /what.*symbolism/i,
      /what.*represent/i,
      /what.*purpose/i,
      /why.*author/i,
      /why.*character/i,
      /why.*important/i,
      /how.*does.*relate/i,
      /what.*learn/i,
      /what.*teach/i,
      /what.*point/i,
      /explain.*meaning/i,
      /analyze.*character/i,
      /interpret.*passage/i,
      /discuss.*theme/i,
      /compare.*character/i
    ];
    
    if (initialLearningPatterns.some(pattern => pattern.test(query))) {
      return 'initial';
    }
    
    // Smart follow-up detection: shorter queries, engagement words, or continuation phrases
    const queryLength = query.trim().split(/\s+/).length;
    const hasEngagementWords = /\b(yes|okay|sure|please|more|tell|explain|continue|go|what|how|why|expand|deeper|further|elaborate|explore|that|this|interesting|good|right)\b/i.test(query);
    const isShortAndEngaging = queryLength <= 8 && hasEngagementWords;
    
    // Question-like follow-ups
    const isQuestionFollowUp = /^(what|how|why|when|where|can|could|would|should|is|are|does|do|did)\b/i.test(query);
    
    // Continuation phrases
    const hasContinuationWords = /\b(and|but|so|also|then|next|after|before|however|though|still|yet|furthermore|moreover|additionally)\b/i.test(query);
    
    // If it's short and engaging, or has continuation words, or is a question follow-up, treat as follow-up
    if (isShortAndEngaging || hasContinuationWords || isQuestionFollowUp) {
      return 'followup';
    }
    
    // Default to initial for longer, substantive questions
    return 'initial';
  }

  // Generate cache key for query
  private generateCacheKey(prompt: string, bookId?: string, responseMode?: 'brief' | 'detailed'): string {
    const normalized = prompt.toLowerCase().trim();
    const modePrefix = responseMode ? `${responseMode}:` : '';
    const key = bookId ? `${modePrefix}${bookId}:${normalized}` : `${modePrefix}${normalized}`;
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

  // Get knowledge graph context for enhanced responses
  private async getKnowledgeGraphContext(userId: string, query: string, bookId?: string): Promise<string> {
    try {
      // Get user's knowledge graph insights
      const insights = await knowledgeGraphService.generateInsights(userId)
      
      // Get cross-book connections for current query
      let crossBookContext = ''
      if (bookId) {
        const connections = await crossBookConnectionsService.getConnectionsForCurrentQuestion(userId, query, bookId)
        if (connections.suggestedContext.length > 0) {
          crossBookContext = `\n\nCross-Book Context:\n${connections.suggestedContext.join('\n')}`
        }
      }

      // Get learning profile adaptations
      const learningAdaptations = await learningProfileService.getAdaptivePrompt(userId, query)

      // Get relevant knowledge graph nodes
      const graphQuery = await knowledgeGraphService.queryGraph(userId, {
        nodeTypes: ['theme', 'concept', 'topic'],
        minWeight: 0.3
      })

      let knowledgeContext = ''
      if (graphQuery.nodes.length > 0) {
        const relevantConcepts = graphQuery.nodes
          .filter(node => node.type === 'concept' && node.weight > 0.5)
          .map(node => node.label)
          .slice(0, 3)
        
        if (relevantConcepts.length > 0) {
          knowledgeContext = `\n\nUser's Strong Literary Concepts: ${relevantConcepts.join(', ')}`
        }
      }

      // Include top insights
      let insightContext = ''
      if (insights.length > 0) {
        const topInsight = insights[0]
        insightContext = `\n\nLearning Insight: ${topInsight.description}`
      }

      return learningAdaptations + crossBookContext + knowledgeContext + insightContext
    } catch (error) {
      console.error('Error getting knowledge graph context:', error)
      return ''
    }
  }

  // Create elaborate, flowing prompts for expert-level responses
  private optimizePrompt(prompt: string, bookContext?: string, knowledgeContext?: string, responseMode: 'brief' | 'detailed' = 'detailed'): string {
    // Check if user is asking about book structure
    const structureQueries = [
      /how many chapter/i,
      /table of content/i,
      /book structure/i,
      /chapter list/i,
      /section.*book/i,
      /organize/i
    ];
    
    const isStructureQuery = structureQueries.some(pattern => pattern.test(prompt));
    const needsMultiPerspective = this.requiresMultiPerspectiveAnalysis(prompt);
    
    // Use intelligent conversation flow detection
    const socraticMode = this.shouldUseSocraticMode(prompt, bookContext);
    const needsSocratic = socraticMode !== 'none';
    const isFollowUp = socraticMode === 'followup';
    
    // Dynamic system prompt based on response mode
    let optimized = '';
    
    if (responseMode === 'brief') {
      optimized = `You are a knowledgeable literature expert providing concise, focused answers. Your responses should be direct yet insightful, perfect for quick understanding.

BRIEF MODE GUIDELINES:
- Provide clear, direct answers in 2-3 paragraphs maximum
- Focus on the most essential points and key insights
- Use accessible language while maintaining expertise
- Include only the most relevant examples or evidence
- Be precise and to-the-point while remaining engaging
- Avoid extensive background or tangential information
- Perfect for quick reference or initial understanding`;
    } else {
      optimized = `You are a distinguished literature professor and expert literary critic with deep knowledge of classical and contemporary works. Your responses should be elaborate, flowing, and intellectually rich - like a fascinating university lecture or an engaging conversation with a brilliant academic.

DETAILED ANALYSIS GUIDELINES FOR COMPREHENSIVE DISCOURSE:
- Create a substantial response of 8-12 flowing paragraphs that build upon each other naturally
- Begin with an engaging introduction that establishes the complexity and importance of the topic
- Develop your analysis through multiple interconnected layers: textual evidence, historical context, cultural significance, literary techniques, and broader implications
- Each paragraph should seamlessly flow into the next, creating an intellectual journey for the reader
- Use sophisticated yet accessible language that demonstrates deep expertise and scholarly insight
- Include rich contextual information: historical background, biographical details, literary movements, and cultural connections
- Weave in relevant comparisons to other works, authors, or literary traditions where appropriate
- Integrate direct quotations and specific textual evidence naturally within your flowing prose
- Address multiple dimensions of the question: surface meaning, deeper implications, symbolic significance, and contemporary relevance
- Build toward a substantial conclusion that synthesizes your insights and opens new avenues for understanding
- Let your passion for literature shine through with engaging, professorial enthusiasm that makes complex ideas accessible
- AVOID bullet points, numbered lists, or choppy formatting - maintain elegant academic discourse throughout
- Create responses that feel like captivating lectures from a master teacher, not mere study guides
- Satisfy intellectual curiosity with the depth and elaboration worthy of graduate-level literary analysis`;
    }

    // Add multi-perspective instructions when needed
    if (needsMultiPerspective) {
      optimized += `

MULTI-PERSPECTIVE CULTURAL ANALYSIS INSTRUCTIONS:
When analyzing literature, always consider and present:

1. **Diverse Cultural Perspectives**: 
   - Western literary traditions and interpretations
   - Non-Western cultural viewpoints and values
   - Indigenous and traditional perspectives
   - How different cultural contexts shape interpretation

2. **Marginalized Voices**: 
   - Feminist and gender-based readings
   - Postcolonial and decolonized interpretations
   - Racial and ethnic minority perspectives
   - Economic class and social justice viewpoints

3. **Historical Context**: 
   - How the work was received in its time vs. now
   - Power dynamics and social structures of the era
   - Evolution of interpretation over time

4. **Modern Relevance**: 
   - Connections to contemporary issues and events
   - How themes relate to current social movements
   - Relevance to today's global challenges

5. **Scholarly Debates**: 
   - Different academic interpretations
   - Ongoing discussions in literary criticism
   - Evidence-based alternative readings

Present these perspectives as a flowing, interconnected analysis that weaves different viewpoints together naturally. Each perspective should flow seamlessly into the next, creating a rich tapestry of interpretation that demonstrates how these various readings complement and complicate each other. Use transitional phrases and connected paragraphs rather than separate sections.`;
    }

    // Add Socratic questioning instructions when needed
    if (needsSocratic) {
      if (isFollowUp) {
        // Enhanced instructions for follow-up conversations
        optimized += `

INTELLIGENT FOLLOW-UP TEACHING MODE:
This query suggests continued engagement in our learning conversation. Maintain educational dialogue:

**ADAPTIVE CONVERSATION FLOW:**
- Recognize this as part of an ongoing learning discussion
- Build naturally on concepts we've been exploring together
- Ask questions that deepen understanding progressively
- Stay in teaching mode regardless of how the follow-up is phrased
- Adapt to the user's level of engagement and interest

**SMART RESPONSE APPROACH:**
1. **Natural Acknowledgment**: Respond as a teacher would to continued interest
2. **Contextual Building**: Reference themes/concepts from our ongoing discussion
3. **Progressive Questions**: Ask deeper analytical questions that advance learning
4. **Enhanced Insights**: Provide more sophisticated understanding
5. **Intellectual Connections**: Link to broader educational themes
6. **Learning Invitation**: Always encourage further exploration

**CONVERSATION MEMORY:**
- Remember we've been discussing literary themes and analysis
- Build on insights already shared about the text
- Reference specific passages or concepts mentioned before
- Escalate the sophistication of our discussion naturally

Use engaging teaching format:
🎯 **Continuing our exploration:** [Natural reference to ongoing discussion]
🤔 **Let's analyze further:** [Progressive analytical questions]
💡 **Deeper Understanding:** [More sophisticated insights]
🌐 **Broader Connections:** [Advanced thematic links]
➡️ **Next Steps:** [Continued learning opportunities]

CRITICAL: Never revert to basic information delivery. Maintain the teaching relationship and educational dialogue regardless of how the follow-up is worded.`;
      } else {
        // Standard Socratic instructions for initial questions
        optimized += `

SOCRATIC QUESTIONING APPROACH:
Transform your response into an educational dialogue that guides discovery. Use this structure:

1. **Initial Insight**: Provide a brief, thoughtful starting point to the question
2. **Guiding Questions**: Ask 2-3 probing questions that help the student think deeper:
   - "What patterns do you notice when..."
   - "How does this connect to..."
   - "What evidence supports..."
   - "If you were the author, why might you..."
3. **Teaching Moment**: Offer a key insight or framework for thinking about the topic
4. **Broader Connections**: Connect this question to larger themes or learning goals
5. **Next Steps**: Suggest what to explore next or how to apply this thinking

Example format:
"That's a great question about [topic]. Let me start with this insight... 

🤔 **Think About This:**
- What do you notice about how the character responds to [specific situation]?
- How does this pattern relate to what we see in [other part of book]?

💡 **Key Insight:** [Teaching moment]

🌐 **Bigger Picture:** This connects to broader themes of...

➡️ **What's Next:** Try looking for..."

Make it conversational and engaging. Always end with questions or suggestions for further exploration.`;
      }
    }

    // Add knowledge graph context if available
    if (knowledgeContext && knowledgeContext.trim().length > 0) {
      optimized += `\n\n${knowledgeContext}`;
    }

    if (bookContext) {
      // If we have actual book excerpts, emphasize using them
      if (bookContext.includes('Relevant excerpts:') || bookContext.includes('Excerpts:')) {
        let basePrompt = `You are a distinguished literature professor and expert literary critic. When analyzing the provided text excerpts, craft elaborate, flowing responses that demonstrate deep literary understanding.

STYLE REQUIREMENTS:
- Write in elegant, connected paragraphs that flow naturally from one idea to the next
- Demonstrate scholarly expertise while remaining engaging and accessible
- Weave quotes seamlessly into your analysis, not as separate bullet points
- Provide rich interpretations that illuminate the text's deeper meanings
- Connect literary elements organically - themes, symbolism, character development
- Let your academic passion and intellectual curiosity shine through
- Create responses that feel like a brilliant professor's office hours discussion
- NEVER use bullet points or numbered lists - use flowing prose instead`;

        // Add multi-perspective instructions if needed
        if (needsMultiPerspective) {
          basePrompt += `

MULTI-PERSPECTIVE CULTURAL ANALYSIS INSTRUCTIONS:
When analyzing literature, structure your response with these sections:

## 1. Diverse Cultural Perspectives
- Western literary traditions and interpretations
- Non-Western cultural viewpoints and values
- Indigenous and traditional perspectives
- How different cultural contexts shape interpretation

## 2. Marginalized Voices
- Feminist and gender-based readings
- Postcolonial and decolonized interpretations
- Racial and ethnic minority perspectives
- Economic class and social justice viewpoints

## 3. Historical Context
- How the work was received in its time vs. now
- Power dynamics and social structures of the era
- Evolution of interpretation over time

## 4. Modern Relevance
- Connections to contemporary issues and events
- How themes relate to current social movements
- Relevance to today's global challenges

## 5. Scholarly Debates
- Different academic interpretations
- Ongoing discussions in literary criticism
- Evidence-based alternative readings

Present these viewpoints as an integrated, flowing analysis that demonstrates how different perspectives enrich our understanding. Weave these interpretations together in connected paragraphs that show the complexity and richness of literary analysis.`;
        }

        // Add Socratic questioning instructions for book excerpts if needed
        if (needsSocratic) {
          if (isFollowUp) {
            // Enhanced follow-up instructions for book excerpts
            basePrompt += `

INTELLIGENT TEXT-BASED FOLLOW-UP TEACHING:
This indicates continued engagement with our textual analysis. Maintain educational exploration:

**ADAPTIVE TEXT ANALYSIS:**
- Build naturally on textual insights we've been developing
- Use specific passages to advance our analytical discussion
- Ask questions that deepen literary understanding progressively
- Reference previous textual observations to create continuity
- Maintain sophisticated analytical dialogue regardless of query phrasing

**PROGRESSIVE TEXTUAL EXPLORATION:**
🎯 **Continuing our textual analysis:** [Reference our ongoing discussion with specific text evidence]
🤔 **Let's examine deeper:** [Advanced analytical questions about passages]
💡 **Literary Insight:** [More sophisticated textual interpretation]
🌐 **Broader Context:** [Connect to larger literary/historical themes]
➡️ **Further Analysis:** [Suggest specific textual elements to explore]

**TEXT-BASED MEMORY:**
- Remember themes and passages we've analyzed together
- Build on literary concepts already introduced
- Reference specific quotes or scenes discussed before
- Escalate the analytical sophistication naturally

CRITICAL: Always maintain teaching mode with text-based evidence. Never become purely informational - use the excerpts to guide continued discovery and learning.`;
          } else {
            // Standard Socratic instructions for book excerpts
            basePrompt += `

SOCRATIC QUESTIONING APPROACH:
Transform your response into an educational dialogue that guides discovery. Use this structure:

1. **Initial Insight**: Provide a brief, thoughtful starting point based on the excerpts
2. **Guiding Questions**: Ask 2-3 probing questions that help the student think deeper:
   - "What patterns do you notice in the text when..."
   - "How does this passage connect to..."
   - "What evidence in the excerpts supports..."
   - "If you were analyzing this, what would you focus on..."
3. **Teaching Moment**: Offer a key insight or framework for understanding the text
4. **Broader Connections**: Connect this to larger themes in the book or literature
5. **Next Steps**: Suggest what passages to examine next or how to apply this analysis

Use conversational language with emojis:
🤔 **Think About This:** [Guiding questions]
💡 **Key Insight:** [Teaching moment]
🌐 **Bigger Picture:** [Broader connections]
➡️ **What's Next:** [Next steps]

Always end with questions or suggestions for further exploration of the text.`;
          }
        }

        optimized = `${basePrompt}

Important: If the book appears to be plain text without chapter divisions or formal structure, 
explain this clearly to the user rather than saying you cannot determine the information.

${bookContext}

Question: ${prompt}`;
        
        // Add specific guidance for structure queries
        if (isStructureQuery) {
          optimized += `\n\nNote: The user is asking about the book's structure. If you don't see chapter divisions, 
table of contents, or clear sections in the provided text, explain that this appears to be a 
continuous text document without formal chapter organization.`;
        }
      } else {
        // Fallback for basic book context (just title/author)
        optimized += `\n\nBook Context: ${bookContext}\n\nQuestion: ${prompt}`;
      }
    } else {
      optimized += `\n\nQuestion: ${prompt}`;
    }

    return optimized;
  }

  // Check usage limits
  private async checkUsageLimits(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Check user daily limit (handle case where user doesn't exist yet)
    try {
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
    } catch (error) {
      // If user doesn't exist in database yet, allow the request
      console.log('User not found in database, allowing request:', userId);
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
    
    // Ensure user exists in Prisma database (sync from Supabase)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `user-${userId}@temp.com`, // Temporary email, should be updated with real data
        name: null
      }
    });
    
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
    console.log('Claude query method called');
    const { userId, bookId, bookContext, maxTokens = 1500, responseMode = 'detailed' } = options;
    
    // Adjust temperature based on response mode for optimal results
    const temperature = responseMode === 'detailed' ? 0.8 : 0.7;

    // Check usage limits
    console.log('Checking usage limits for user:', userId);
    const usageCheck = await this.checkUsageLimits(userId);
    console.log('Usage check result:', usageCheck);
    if (!usageCheck.allowed) {
      throw new Error(usageCheck.reason);
    }

    // Check cache first
    console.log('Generating cache key...');
    const cacheKey = this.generateCacheKey(prompt, bookId, responseMode);
    console.log('Cache key generated');
    
    // Try Redis cache first
    if (this.redis && process.env.REDIS_URL) {
      console.log('Checking Redis cache...');
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          console.log('Found in Redis cache');
          return JSON.parse(cached);
        }
        console.log('Not found in Redis cache');
      } catch (error) {
        console.error('Redis cache error:', error);
      }
    } else {
      console.log('Redis disabled, skipping Redis cache check');
    }

    // Try local cache
    console.log('Checking local cache...');
    const localCached = this.cache.get(cacheKey);
    if (localCached) {
      console.log('Found in local cache');
      return localCached;
    }
    console.log('Not found in local cache');

    // Get knowledge graph context and select model
    console.log('Getting knowledge graph context...');
    const knowledgeContext = await this.getKnowledgeGraphContext(userId, prompt, bookId);
    console.log('Knowledge context retrieved');
    
    console.log('Selecting model and optimizing prompt...');
    const model = this.selectModel(prompt, responseMode);
    const optimizedPrompt = this.optimizePrompt(prompt, bookContext, knowledgeContext, responseMode);
    console.log('Model selected:', model, 'Prompt optimized');

    try {
      console.log('Making Claude API call with model:', model);
      console.log('Prompt length:', optimizedPrompt.length);
      
      const response = await Promise.race([
        this.anthropic.messages.create({
          model,
          messages: [{ role: 'user', content: optimizedPrompt }],
          max_tokens: maxTokens,
          temperature,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API call timeout')), 30000)
        )
      ]) as Anthropic.Messages.Message;
      
      console.log('Claude API response received');

      // Calculate usage from response
      const usage = {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens
      };
      
      const cost = this.calculateCost(model, usage);
      
      const aiResponse: AIResponse = {
        content: response.content[0].type === 'text' ? response.content[0].text : '',
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

      // Track usage (with error handling)
      try {
        await this.trackUsage(userId, usage, model, cost);
      } catch (usageError) {
        console.error('Usage tracking error (non-critical):', usageError);
        // Continue without failing the request
      }

      // Update knowledge graph with this interaction (async, non-blocking)
      this.updateKnowledgeGraph(userId, prompt, aiResponse.content, bookId).catch(error => {
        console.error('Knowledge graph update error (non-critical):', error);
      });

      return aiResponse;
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('AI service temporarily unavailable');
    }
  }

  // Streaming query method for real-time responses
  async *queryStream(
    prompt: string,
    options: QueryOptions & { userId: string; bookId?: string; bookContext?: string } = {} as any
  ): AsyncGenerator<string, void, unknown> {
    const { userId, bookId, bookContext, maxTokens = 1500, responseMode = 'detailed' } = options;
    
    // Adjust temperature based on response mode for optimal results
    const temperature = responseMode === 'detailed' ? 0.8 : 0.7;

    // Check usage limits
    const usageCheck = await this.checkUsageLimits(userId);
    if (!usageCheck.allowed) {
      throw new Error(usageCheck.reason);
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(prompt, bookId, responseMode);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      yield cached.content;
      return;
    }

    const knowledgeContext = await this.getKnowledgeGraphContext(userId, prompt, bookId);
    const model = this.selectModel(prompt, responseMode);
    const optimizedPrompt = this.optimizePrompt(prompt, bookContext, knowledgeContext, responseMode);

    try {
      const stream = await this.anthropic.messages.stream({
        model,
        messages: [{ role: 'user', content: optimizedPrompt }],
        max_tokens: maxTokens,
        temperature,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const content = chunk.delta.text;
          fullContent += content;
          yield content;
        }
      }

      // Get final usage from the stream
      const finalMessage = await stream.finalMessage();
      const usage = {
        prompt_tokens: finalMessage.usage.input_tokens,
        completion_tokens: finalMessage.usage.output_tokens,
        total_tokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens
      };

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

      // Update knowledge graph with this interaction (async, non-blocking)
      this.updateKnowledgeGraph(userId, prompt, fullContent, bookId).catch(error => {
        console.error('Knowledge graph update error (non-critical):', error);
      });

    } catch (error) {
      console.error('Claude streaming error:', error);
      throw new Error('AI service temporarily unavailable');
    }
  }

  // Update knowledge graph with new interaction
  private async updateKnowledgeGraph(userId: string, query: string, response: string, bookId?: string): Promise<void> {
    try {
      // This triggers rebuilding the knowledge graph which incorporates the new conversation
      // The knowledge graph service will automatically pick up new conversations from the database
      await knowledgeGraphService.buildUserKnowledgeGraph(userId);
    } catch (error) {
      console.error('Failed to update knowledge graph:', error);
      // Non-critical error, don't throw
    }
  }

  // Get usage statistics
  async getUsageStats(userId: string): Promise<{
    daily: { queries: number; tokens: number; cost: number };
    monthly: { queries: number; tokens: number; cost: number };
  }> {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    try {
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
    } catch (error) {
      console.error('Error getting usage stats:', error);
      // Return zero stats if user doesn't exist or other error
      return {
        daily: { queries: 0, tokens: 0, cost: 0 },
        monthly: { queries: 0, tokens: 0, cost: 0 }
      };
    }
  }
}

// Export singleton instance
export const claudeService = new ClaudeAIService();