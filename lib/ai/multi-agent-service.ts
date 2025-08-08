import Anthropic from '@anthropic-ai/sdk';
import { claudeService } from '@/lib/ai/claude-service';

export interface AgentResponse {
  content: string;
  confidence: number;
  sources?: Array<{
    text: string;
    location: string;
    relevance: number;
  }>;
  citations?: Array<{
    text: string;
    source: string;
    page?: string;
    context: string;
  }>;
}

export interface TutoringResponse {
  content: string;
  context: AgentResponse;
  insights: AgentResponse;
  questions: AgentResponse;
  adaptation: AgentResponse;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  cost: number;
  teachingMoments?: string[];
  followUpQuestions?: string[];
}

export class MultiAgentService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
    });
  }

  async processQuery(
    query: string,
    options: {
      userId: string;
      bookId?: string;
      bookContext?: string;
      maxTokens?: number;
      temperature?: number;
      responseMode?: 'brief' | 'detailed';
      conversationHistory?: any;
    }
  ): Promise<TutoringResponse> {
    const { userId, bookId, bookContext, maxTokens = 1500, temperature = 0.7, responseMode = 'detailed', conversationHistory } = options;

    // Step 1: ContextAgent - Professional conversation retrieval and background research
    const contextAgent = new ContextAgent(this.anthropic);
    const context = await contextAgent.gatherLearningContext(query, bookContext, conversationHistory);

    // Step 2: InsightAgent - Educational insight identification and thematic analysis
    const insightAgent = new InsightAgent(this.anthropic);
    const insights = await insightAgent.identifyEducationalInsights(query, context.content, bookContext);

    // Step 3: SocraticAgent - Thought-provoking questions to guide discovery
    const socraticAgent = new SocraticAgent(this.anthropic);
    const questions = await socraticAgent.generateGuidingQuestions(query, insights.content, bookContext);

    // Step 4: AdaptiveAgent - Professional learning level adjustment and synthesis
    const adaptiveAgent = new AdaptiveAgent(this.anthropic);
    const adaptation = await adaptiveAgent.createTutoringResponse(
      query,
      context,
      insights,
      questions,
      bookContext,
      responseMode
    );

    // Calculate total usage and cost
    const totalUsage = {
      prompt_tokens: (context.usage?.prompt_tokens || 0) + (insights.usage?.prompt_tokens || 0) + 
                    (questions.usage?.prompt_tokens || 0) + (adaptation.usage?.prompt_tokens || 0),
      completion_tokens: (context.usage?.completion_tokens || 0) + (insights.usage?.completion_tokens || 0) + 
                        (questions.usage?.completion_tokens || 0) + (adaptation.usage?.completion_tokens || 0),
      total_tokens: 0
    };
    totalUsage.total_tokens = totalUsage.prompt_tokens + totalUsage.completion_tokens;

    const totalCost = this.calculateTotalCost(totalUsage);

    // Extract teaching moments and follow-up questions
    const teachingMoments = this.extractTeachingMoments(adaptation.content);
    const followUpQuestions = this.extractFollowUpQuestions(questions.content);

    return {
      content: adaptation.content,
      context,
      insights,
      questions,
      adaptation,
      usage: totalUsage,
      model: 'enhanced-tutoring-claude-3-5-sonnet',
      cost: totalCost,
      teachingMoments,
      followUpQuestions
    };
  }

  private calculateTotalCost(usage: { prompt_tokens: number; completion_tokens: number }): number {
    const modelCosts = { input: 0.003, output: 0.015 }; // Claude 3.5 Sonnet pricing
    const inputCost = (usage.prompt_tokens / 1000) * modelCosts.input;
    const outputCost = (usage.completion_tokens / 1000) * modelCosts.output;
    return inputCost + outputCost;
  }

  private extractTeachingMoments(content: string): string[] {
    const moments: string[] = [];
    const teachingPattern = /\*\*Teaching Moment:\*\*\s*([^\n]+)/g;
    let match;
    while ((match = teachingPattern.exec(content)) !== null) {
      moments.push(match[1]);
    }
    return moments;
  }

  private extractFollowUpQuestions(content: string): string[] {
    const questions: string[] = [];
    const questionPattern = /\*\*Question:\*\*\s*([^\n]+)/g;
    let match;
    while ((match = questionPattern.exec(content)) !== null) {
      questions.push(match[1]);
    }
    return questions;
  }
}

class ContextAgent {
  constructor(private anthropic: Anthropic) {}

  async gatherLearningContext(query: string, bookContext?: string, conversationHistory?: any): Promise<AgentResponse & { usage?: any }> {
    const prompt = `You are a ContextAgent specialized in gathering educational context for effective tutoring.

Your task: Prepare the learning foundation by gathering relevant book passages, conversation history, and background information needed for effective teaching.

Student Query: "${query}"

Book Content:
${bookContext || 'No book content provided'}

Conversation History:
${conversationHistory ? JSON.stringify(conversationHistory) : 'No previous conversation'}

Instructions:
1. Identify 3-5 most educationally relevant passages that help answer the query
2. Extract key quotes that will support learning objectives
3. Consider what background knowledge the student needs
4. Note any concepts that need foundation-building
5. Prepare context for progressive understanding
6. Use professional academic language without theatrical elements, stage directions, or roleplay

Respond in this format:
**LEARNING CONTEXT:**

**Key Passage 1:**
"[Direct quote]"
Educational Value: [Why this helps student understanding]
Concepts Involved: [Key concepts to teach]

**Key Passage 2:**
[Continue pattern...]

**BACKGROUND NEEDED:**
[Essential background knowledge for understanding]

**LEARNING FOUNDATION:**
[Context summary focused on building student understanding]`;

    let response;
    try {
      response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.4
      });
    } catch (error: any) {
      if (error.status === 529) {
        console.log('Claude overloaded, falling back to OpenAI for context agent');
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const openaiResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 600,
          temperature: 0.4
        });
        
        response = {
          content: [{ type: 'text', text: openaiResponse.choices[0].message.content || '' }],
          usage: {
            input_tokens: 0,
            output_tokens: openaiResponse.usage?.completion_tokens || 0
          }
        };
      } else {
        throw error;
      }
    }

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Parse learning context from the response
    const sources = this.extractLearningContext(content);

    return {
      content,
      confidence: 0.90,
      sources,
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens
      }
    };
  }

  private extractLearningContext(content: string): Array<{ text: string; location: string; relevance: number }> {
    const contexts: Array<{ text: string; location: string; relevance: number }> = [];
    const passageRegex = /\*\*Key Passage \d+:\*\*\s*"([^"]+)"\s*Educational Value: ([^\n]+)/g;
    
    let match;
    while ((match = passageRegex.exec(content)) !== null) {
      contexts.push({
        text: match[1],
        location: 'Educational Context',
        relevance: 0.9 // High relevance for educational content
      });
    }
    
    return contexts;
  }
}

class InsightAgent {
  constructor(private anthropic: Anthropic) {}

  async identifyEducationalInsights(query: string, contextContent: string, bookContext?: string): Promise<AgentResponse & { usage?: any }> {
    const prompt = `You are an InsightAgent specialized in identifying educational insights and thematic understanding.

Your task: Identify the key insights, themes, and educational opportunities that will help the student develop deeper understanding.

Student Query: "${query}"

Learning Context:
${contextContent}

Book Context:
${bookContext || 'Limited context available'}

Instructions:
1. Identify the core educational insights that address the student's question
2. Recognize themes and literary devices that support learning
3. Find connections between concepts that build understanding
4. Identify teaching opportunities within the content
5. Focus on insights that guide student discovery rather than providing all answers

Respond as a professional tutor identifying key learning moments. Use clear academic language without theatrical elements, stage directions, or roleplay actions:

**CORE INSIGHTS:**

**Primary Educational Insight:**
[Main concept the student needs to understand]

**Supporting Themes:**
[2-3 related themes that reinforce the main concept]

**Literary Connections:**
[How this connects to broader literary understanding]

**Teaching Opportunities:**
[Specific moments where student can discover meaning]

**EDUCATIONAL SUMMARY:**
[Professional summary of insights that will guide the tutoring response]`;

    let response;
    try {
      response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 700,
        temperature: 0.6
      });
    } catch (error: any) {
      if (error.status === 529) {
        console.log('Claude overloaded, falling back to OpenAI for insight agent');
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const openaiResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 700,
          temperature: 0.6
        });
        
        response = {
          content: [{ type: 'text', text: openaiResponse.choices[0].message.content || '' }],
          usage: {
            input_tokens: 0,
            output_tokens: openaiResponse.usage?.completion_tokens || 0
          }
        };
      } else {
        throw error;
      }
    }

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content,
      confidence: 0.92,
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens
      }
    };
  }
}

class SocraticAgent {
  constructor(private anthropic: Anthropic) {}

  async generateGuidingQuestions(query: string, insightsContent: string, bookContext?: string): Promise<AgentResponse & { usage?: any }> {
    const prompt = `You are a SocraticAgent specialized in generating thought-provoking questions that guide student discovery.

Your task: Create questions that help the student discover insights rather than just providing answers.

Student Query: "${query}"

Educational Insights:
${insightsContent}

Book Context:
${bookContext || 'Limited context available'}

Instructions:
1. Generate 3-5 progressive questions that build understanding step-by-step
2. Start with foundational questions and move to deeper analysis
3. Use questions that help students make their own connections
4. Focus on "Why" and "How" rather than just "What"
5. Create questions that encourage critical thinking and discovery
6. Use professional academic language without theatrical elements, stage directions, or roleplay

Respond as a professional tutor crafting guiding questions. Do not use theatrical elements like stage directions in asterisks:

**GUIDING QUESTIONS:**

**Foundation Question:**
**Question:** [Basic understanding question]
**Purpose:** [Why this question helps learning]

**Development Question:**
**Question:** [Question that builds on foundation]
**Purpose:** [How this deepens understanding]

**Analysis Question:**
**Question:** [Critical thinking question]
**Purpose:** [What insight this reveals]

**Connection Question:**
**Question:** [Question linking to broader understanding]
**Purpose:** [How this connects to larger themes]

**QUESTIONING STRATEGY:**
[Professional summary of how these questions guide discovery]`;

    let response;
    try {
      response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.5
      });
    } catch (error: any) {
      if (error.status === 529) {
        console.log('Claude overloaded, falling back to OpenAI for socratic agent');
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const openaiResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 800,
          temperature: 0.5
        });
        
        response = {
          content: [{ type: 'text', text: openaiResponse.choices[0].message.content || '' }],
          usage: {
            input_tokens: 0,
            output_tokens: openaiResponse.usage?.completion_tokens || 0
          }
        };
      } else {
        throw error;
      }
    }

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Parse questions from the response
    const questions = this.extractQuestions(content);

    return {
      content,
      confidence: 0.93,
      citations: questions, // Reusing citations field for questions
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens
      }
    };
  }

  private extractQuestions(content: string): Array<{ text: string; source: string; context: string }> {
    const questions: Array<{ text: string; source: string; context: string }> = [];
    const questionRegex = /\*\*Question:\*\*\s*([^\n]+)\s*\*\*Purpose:\*\*\s*([^\n]+)/g;
    
    let match;
    while ((match = questionRegex.exec(content)) !== null) {
      questions.push({
        text: match[1],
        source: 'Socratic Question',
        context: match[2]
      });
    }
    
    return questions;
  }
}

class AdaptiveAgent {
  constructor(private anthropic: Anthropic) {}

  async createTutoringResponse(
    query: string,
    context: AgentResponse,
    insights: AgentResponse,
    questions: AgentResponse,
    bookContext?: string,
    responseMode: 'brief' | 'detailed' = 'detailed'
  ): Promise<AgentResponse & { usage?: any }> {
    const modeInstructions = responseMode === 'brief' 
      ? `Instructions for creating a concise, professional tutoring response:

Create a response that demonstrates professional tutoring expertise:

1. Begin with encouragement that acknowledges the student's curiosity
2. Provide a clear, direct answer that builds understanding step-by-step
3. Use one key example or quote that illuminates the concept
4. End with a thought-provoking question that encourages further exploration

PROFESSIONAL TUTORING REQUIREMENTS:
- Maximum 2-3 paragraphs
- High school vocabulary with precise literary terms explained
- Professional encouragement ("Your question touches on an important aspect...")
- Focus on guiding discovery rather than just providing information
- Include one follow-up question to continue learning

Maintain academic sophistication while being accessible and encouraging.`
      : `Instructions for creating comprehensive professional tutoring dialogue:

Create a response that embodies excellent tutoring methodology:

PROFESSIONAL TUTORING STRUCTURE:
1. Open with professional encouragement that validates the student's inquiry
2. Build understanding progressively through 3-4 well-connected paragraphs
3. Use the Socratic method: guide discovery rather than simply explain
4. Include specific textual examples that illuminate key concepts
5. Connect current learning to broader literary understanding
6. Conclude with questions that encourage deeper exploration

TUTORING EXCELLENCE STANDARDS:
- Demonstrate sophisticated literary knowledge while maintaining accessibility
- Use professional encouragement ("Your analysis demonstrates strong thinking...")
- Guide student discovery: "Consider how this connects to..." rather than "This means..."
- Include cultural and historical context that enriches understanding
- Suggest next steps for learning and exploration
- Maintain academic rigor without overwhelming complexity

AVOID:
- Lecturing or one-way information delivery
- Overly dramatic enthusiasm or casual language
- Providing all answers without encouraging student thinking
- Academic jargon without clear explanation
- Theatrical elements, stage directions, or roleplay actions in asterisks
- Any form of dramatic narration or character acting

CREATE INSTEAD:
- Professional dialogue that feels like working with an expert tutor
- Responses that build confidence while challenging thinking
- Natural integration of quotes and examples within teaching flow
- Professional recognition of student progress and insights

Begin with professional acknowledgment of the student's question and build understanding systematically.

CRITICAL: Do not use any theatrical elements, stage directions in asterisks (like *adjusting glasses*), or dramatic roleplay. Respond as a professional academic tutor using clear, direct language.`;

    const prompt = `You are an AdaptiveAgent responsible for creating the final tutoring response.

Your task: Synthesize all agent insights into a professional tutoring dialogue that guides student learning.

Student Query: "${query}"

Learning Context:
${context.content}

Educational Insights:
${insights.content}

Guiding Questions:
${questions.content}

${modeInstructions}`;

    const maxTokens = responseMode === 'brief' ? 400 : 1200;
    
    let response;
    try {
      response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
      });
    } catch (error: any) {
      if (error.status === 529) {
        console.log('Claude overloaded, falling back to OpenAI for adaptive agent');
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const openaiResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.7
        });
        
        response = {
          content: [{ type: 'text', text: openaiResponse.choices[0].message.content || '' }],
          usage: {
            input_tokens: 0,
            output_tokens: openaiResponse.usage?.completion_tokens || 0
          }
        };
      } else {
        throw error;
      }
    }

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content,
      confidence: 0.95,
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens
      }
    };
  }
}

export const multiAgentService = new MultiAgentService();
export const enhancedTutoringService = new MultiAgentService(); // Alias for clarity