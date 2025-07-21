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

export interface MultiAgentResponse {
  content: string;
  research: AgentResponse;
  analysis: AgentResponse;
  citations: AgentResponse;
  synthesis: AgentResponse;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  cost: number;
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
    }
  ): Promise<MultiAgentResponse> {
    const { userId, bookId, bookContext, maxTokens = 500, temperature = 0.7 } = options;

    // Step 1: Research Agent - Find relevant content
    const researchAgent = new ResearchAgent(this.anthropic);
    const research = await researchAgent.findRelevantContent(query, bookContext);

    // Step 2: Analysis Agent - Provide deep insights
    const analysisAgent = new AnalysisAgent(this.anthropic);
    const analysis = await analysisAgent.analyzeContent(query, research.content, bookContext);

    // Step 3: Citation Agent - Create proper references
    const citationAgent = new CitationAgent(this.anthropic);
    const citations = await citationAgent.generateCitations(query, research.content, bookContext);

    // Step 4: Synthesis Agent - Combine all outputs
    const synthesisAgent = new SynthesisAgent(this.anthropic);
    const synthesis = await synthesisAgent.synthesizeResponse(
      query,
      research,
      analysis,
      citations,
      bookContext
    );

    // Calculate total usage and cost
    const totalUsage = {
      prompt_tokens: research.usage?.prompt_tokens || 0 + analysis.usage?.prompt_tokens || 0 + 
                    citations.usage?.prompt_tokens || 0 + synthesis.usage?.prompt_tokens || 0,
      completion_tokens: research.usage?.completion_tokens || 0 + analysis.usage?.completion_tokens || 0 + 
                        citations.usage?.completion_tokens || 0 + synthesis.usage?.completion_tokens || 0,
      total_tokens: 0
    };
    totalUsage.total_tokens = totalUsage.prompt_tokens + totalUsage.completion_tokens;

    const totalCost = this.calculateTotalCost(totalUsage);

    return {
      content: synthesis.content,
      research,
      analysis,
      citations,
      synthesis,
      usage: totalUsage,
      model: 'multi-agent-claude-3-5-sonnet',
      cost: totalCost
    };
  }

  private calculateTotalCost(usage: { prompt_tokens: number; completion_tokens: number }): number {
    const modelCosts = { input: 0.003, output: 0.015 }; // Claude 3.5 Sonnet pricing
    const inputCost = (usage.prompt_tokens / 1000) * modelCosts.input;
    const outputCost = (usage.completion_tokens / 1000) * modelCosts.output;
    return inputCost + outputCost;
  }
}

class ResearchAgent {
  constructor(private anthropic: Anthropic) {}

  async findRelevantContent(query: string, bookContext?: string): Promise<AgentResponse & { usage?: any }> {
    const prompt = `You are a Research Agent specialized in finding relevant content from books.

Your task: Extract the most relevant passages and information from the provided book content that directly relates to the user's query.

Query: "${query}"

Book Content:
${bookContext || 'No book content provided'}

Instructions:
1. Identify 3-5 most relevant passages that directly address the query
2. Extract direct quotes with their context
3. Rate relevance of each passage (0.0-1.0)
4. Focus on factual content retrieval, not interpretation

Respond in this format:
**RELEVANT PASSAGES:**

**Passage 1 (Relevance: X.X):**
"[Direct quote]"
Location: [Chapter/section if available]
Context: [Brief context explanation]

**Passage 2 (Relevance: X.X):**
[Continue pattern...]

**RESEARCH SUMMARY:**
[Brief summary of what was found relevant to the query]`;

    let response;
    try {
      response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.3
      });
    } catch (error: any) {
      // Fallback to OpenAI if Claude is overloaded
      if (error.status === 529) {
        console.log('Claude overloaded, falling back to OpenAI for research agent');
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const openaiResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 400,
          temperature: 0.3
        });
        
        response = {
          content: [{ type: 'text', text: openaiResponse.choices[0].message.content || '' }],
          usage: {
            input_tokens: 0, // OpenAI doesn't provide this directly
            output_tokens: openaiResponse.usage?.completion_tokens || 0
          }
        };
      } else {
        throw error;
      }
    }

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Parse sources from the response
    const sources = this.extractSources(content);

    return {
      content,
      confidence: 0.85,
      sources,
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens
      }
    };
  }

  private extractSources(content: string): Array<{ text: string; location: string; relevance: number }> {
    const sources: Array<{ text: string; location: string; relevance: number }> = [];
    const passageRegex = /\*\*Passage \d+ \(Relevance: ([\d.]+)\):\*\*\s*"([^"]+)"\s*Location: ([^\n]+)/g;
    
    let match;
    while ((match = passageRegex.exec(content)) !== null) {
      sources.push({
        text: match[2],
        location: match[3],
        relevance: parseFloat(match[1])
      });
    }
    
    return sources;
  }
}

class AnalysisAgent {
  constructor(private anthropic: Anthropic) {}

  async analyzeContent(query: string, researchContent: string, bookContext?: string): Promise<AgentResponse & { usage?: any }> {
    const prompt = `You are an Analysis Agent specialized in providing deep literary and thematic insights.

Your task: Analyze the research findings and provide comprehensive insights, connections, and interpretations.

Original Query: "${query}"

Research Findings:
${researchContent}

Book Context:
${bookContext || 'Limited context available'}

Instructions:
1. Provide deep analytical insights about the content
2. Make connections between themes, characters, and concepts
3. Offer multiple interpretative perspectives
4. Connect to broader literary and cultural contexts
5. Explain significance and implications

Focus on:
- Thematic analysis
- Character development insights  
- Literary techniques and their effects
- Historical/cultural context
- Symbolic meanings
- Connections to other works or ideas

Provide nuanced, academic-level analysis while remaining accessible.`;

    let response;
    try {
      response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.7
      });
    } catch (error: any) {
      if (error.status === 529) {
        console.log('Claude overloaded, falling back to OpenAI for analysis agent');
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const openaiResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 400,
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
      confidence: 0.90,
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens
      }
    };
  }
}

class CitationAgent {
  constructor(private anthropic: Anthropic) {}

  async generateCitations(query: string, researchContent: string, bookContext?: string): Promise<AgentResponse & { usage?: any }> {
    const prompt = `You are a Citation Agent specialized in creating proper academic references and highlighting direct quotes.

Your task: Create properly formatted citations and identify the most important quotes to highlight.

Query: "${query}"

Research Content:
${researchContent}

Book Context:
${bookContext || 'Limited context available'}

Instructions:
1. Identify the 3-5 most important quotes that directly support the analysis
2. Create proper citations in format: (Author, Chapter/Page) or (Title, Section)
3. Ensure all quotes are accurately attributed
4. Highlight passages that should be emphasized in the final response
5. Note any context needed to understand the quotes

Output format:
**KEY CITATIONS:**

**Quote 1:**
"[Exact quote]"
Citation: (Source, Location)
Context: [Why this quote is significant]

**Quote 2:**
[Continue pattern...]

**CITATION NOTES:**
[Any important notes about sources, context, or attribution]`;

    let response;
    try {
      response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3
      });
    } catch (error: any) {
      if (error.status === 529) {
        console.log('Claude overloaded, falling back to OpenAI for citation agent');
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const openaiResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.3
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
    
    // Parse citations from the response
    const citations = this.extractCitations(content);

    return {
      content,
      confidence: 0.95,
      citations,
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens
      }
    };
  }

  private extractCitations(content: string): Array<{ text: string; source: string; page?: string; context: string }> {
    const citations: Array<{ text: string; source: string; page?: string; context: string }> = [];
    const citationRegex = /\*\*Quote \d+:\*\*\s*"([^"]+)"\s*Citation: \(([^)]+)\)\s*Context: ([^\n]+)/g;
    
    let match;
    while ((match = citationRegex.exec(content)) !== null) {
      citations.push({
        text: match[1],
        source: match[2],
        context: match[3]
      });
    }
    
    return citations;
  }
}

class SynthesisAgent {
  constructor(private anthropic: Anthropic) {}

  async synthesizeResponse(
    query: string,
    research: AgentResponse,
    analysis: AgentResponse,
    citations: AgentResponse,
    bookContext?: string
  ): Promise<AgentResponse & { usage?: any }> {
    const prompt = `You are a Synthesis Agent responsible for creating the final, comprehensive response.

Your task: Combine insights from the research, analysis, and citation agents into a cohesive, well-structured response.

Original Query: "${query}"

Research Agent Findings:
${research.content}

Analysis Agent Insights:
${analysis.content}

Citation Agent References:
${citations.content}

Instructions:
1. Create a comprehensive response that answers the user's query
2. Integrate research findings, analytical insights, and proper citations seamlessly
3. Structure the response clearly with sections/headings if appropriate
4. Highlight important quotes using **bold** formatting
5. Include proper citations in parentheses
6. Maintain an educational, engaging tone
7. Ensure accuracy and avoid speculation beyond what's supported by the content

Format the response to be:
- Well-structured and easy to read
- Educational and insightful
- Properly cited with evidence
- Comprehensive but concise
- Engaging and accessible

Begin your response directly addressing the user's question.`;

    let response;
    try {
      response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.6
      });
    } catch (error: any) {
      if (error.status === 529) {
        console.log('Claude overloaded, falling back to OpenAI for synthesis agent');
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const openaiResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
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

export const multiAgentService = new MultiAgentService();