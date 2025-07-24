import OpenAI from 'openai';

export interface CitationTestQuestion {
  id: string;
  question: string;
  expectedAnswer: string;
  requiredCitations: {
    inTextCitations: string[]; // Expected in-text citations
    worksCited: string[];      // Expected Works Cited entries
    pageNumbers: boolean;      // Should include page numbers
    multipleSources: boolean;  // Requires multiple sources
  };
  category: 'in_text' | 'works_cited' | 'integration' | 'paraphrasing' | 'multiple_sources';
}

export interface CitationAccuracyResult {
  questionId: string;
  question: string;
  aiResponse: string;
  citationScore: number;        // Overall citation accuracy (0-100)
  formatScore: number;          // MLA format compliance (0-100)
  completenessScore: number;    // All required citations included (0-100)
  integrationScore: number;     // How well citations are integrated (0-100)
  detectedCitations: {
    inText: string[];
    worksCited: string[];
    errors: string[];
  };
  recommendations: string[];
}

/**
 * Tests AI's ability to generate accurate MLA citations and integrate them properly
 */
export class CitationAccuracyTester {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Test citation accuracy for a single question
   */
  async testCitationAccuracy(question: CitationTestQuestion): Promise<CitationAccuracyResult> {
    console.log(`📚 Testing citation accuracy for: ${question.id}`);

    // Generate AI response with citation requirements
    const aiResponse = await this.generateResponseWithCitations(question);

    // Analyze citations in the response
    const detectedCitations = this.extractCitations(aiResponse);
    
    // Score different aspects of citation accuracy
    const citationScore = await this.scoreCitationAccuracy(question, detectedCitations);
    const formatScore = await this.scoreMLAFormat(detectedCitations);
    const completenessScore = this.scoreCompleteness(question, detectedCitations);
    const integrationScore = await this.scoreIntegration(aiResponse, detectedCitations);

    // Generate recommendations
    const recommendations = this.generateCitationRecommendations(
      question, detectedCitations, citationScore, formatScore, completenessScore, integrationScore
    );

    return {
      questionId: question.id,
      question: question.question,
      aiResponse,
      citationScore,
      formatScore,
      completenessScore,
      integrationScore,
      detectedCitations,
      recommendations
    };
  }

  /**
   * Generate AI response with specific citation instructions
   */
  private async generateResponseWithCitations(question: CitationTestQuestion): Promise<string> {
    const citationInstructions = `
Please provide a complete response that includes:
${question.requiredCitations.inTextCitations.length > 0 ? '- Proper MLA in-text citations with author and page numbers' : ''}
${question.requiredCitations.worksCited.length > 0 ? '- Complete Works Cited entries in MLA format' : ''}
${question.requiredCitations.pageNumbers ? '- Include specific page numbers for all quotations' : ''}
${question.requiredCitations.multipleSources ? '- Use multiple sources with proper attribution' : ''}

Format all citations according to MLA 9th edition standards.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert academic writer who always follows MLA citation format perfectly. 
You must include proper citations for all claims and quotations using MLA 9th edition standards.`
        },
        {
          role: 'user',
          content: `${question.question}\n\n${citationInstructions}`
        }
      ],
      max_tokens: 800,
      temperature: 0.1 // Low temperature for consistency in citations
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Extract and categorize citations from AI response
   */
  private extractCitations(response: string): {
    inText: string[];
    worksCited: string[];
    errors: string[];
  } {
    const citations = {
      inText: [] as string[],
      worksCited: [] as string[],
      errors: [] as string[]
    };

    // Extract in-text citations: (Author Page) or (Author, Page)
    const inTextPattern = /\([^)]*\)/g;
    const inTextMatches = response.match(inTextPattern) || [];
    citations.inText = inTextMatches.filter(match => {
      // Filter out parentheses that aren't citations
      return match.length > 3 && (
        /\([A-Za-z]+\s+\d+\)/.test(match) ||     // (Smith 123)
        /\([A-Za-z]+,\s+\d+\)/.test(match) ||   // (Smith, 123)
        /\([A-Za-z]+\)/.test(match)             // (Smith)
      );
    });

    // Extract Works Cited entries (lines starting with author names)
    const worksCitedPattern = /^[A-Z][a-zA-Z]+,\s+[A-Z][a-zA-Z]+.*$/gm;
    citations.worksCited = response.match(worksCitedPattern) || [];

    // Detect common citation errors
    if (response.includes('(no author)')) {
      citations.errors.push('Uses "no author" instead of proper anonymous citation format');
    }
    if (response.includes('(n.d.)') && !response.includes('Web.')) {
      citations.errors.push('Incorrect use of "n.d." for print sources');
    }
    if (/\(\d+\)/.test(response)) {
      citations.errors.push('Page-only citations without author');
    }

    return citations;
  }

  /**
   * Score overall citation accuracy
   */
  private async scoreCitationAccuracy(
    question: CitationTestQuestion,
    detectedCitations: { inText: string[]; worksCited: string[]; errors: string[] }
  ): Promise<number> {
    
    // Use AI to evaluate citation accuracy
    const evaluationPrompt = `Rate the citation accuracy (0-100) of these detected citations:

QUESTION TYPE: ${question.category}
REQUIRED IN-TEXT: ${question.requiredCitations.inTextCitations.length}
REQUIRED WORKS CITED: ${question.requiredCitations.worksCited.length}

DETECTED IN-TEXT CITATIONS:
${detectedCitations.inText.join('\n')}

DETECTED WORKS CITED:
${detectedCitations.worksCited.join('\n')}

ERRORS FOUND:
${detectedCitations.errors.join('\n')}

Rate accuracy considering:
- Presence of required citations
- Correct MLA format
- Appropriate use of in-text vs. Works Cited
- Overall scholarly standards

Respond with just a number (0-100):`;

    try {
      const evaluation = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in MLA citation standards and academic writing assessment.'
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      });

      const scoreText = evaluation.choices[0]?.message?.content || '70';
      const score = parseInt(scoreText.match(/\d+/)?.[0] || '70');
      return Math.max(0, Math.min(100, score));

    } catch (error) {
      console.error('Error scoring citation accuracy:', error);
      return 70; // Default score
    }
  }

  /**
   * Score MLA format compliance
   */
  private async scoreMLAFormat(detectedCitations: { inText: string[]; worksCited: string[]; errors: string[] }): Promise<number> {
    let formatScore = 100;

    // Check in-text citation format
    detectedCitations.inText.forEach(citation => {
      // Should be (Author Page) format
      if (!/\([A-Za-z]+\s+\d+\)/.test(citation) && !/\([A-Za-z]+,\s+\d+\)/.test(citation)) {
        formatScore -= 10;
      }
    });

    // Check Works Cited format
    detectedCitations.worksCited.forEach(entry => {
      // Should start with "LastName, FirstName."
      if (!/^[A-Z][a-zA-Z]+,\s+[A-Z][a-zA-Z]+\./.test(entry)) {
        formatScore -= 15;
      }
    });

    // Deduct points for errors
    formatScore -= detectedCitations.errors.length * 5;

    return Math.max(0, formatScore);
  }

  /**
   * Score completeness (all required citations included)
   */
  private scoreCompleteness(
    question: CitationTestQuestion,
    detectedCitations: { inText: string[]; worksCited: string[]; errors: string[] }
  ): number {
    let completenessScore = 100;

    // Check if required in-text citations are present
    const requiredInText = question.requiredCitations.inTextCitations.length;
    const foundInText = detectedCitations.inText.length;
    if (foundInText < requiredInText) {
      completenessScore -= (requiredInText - foundInText) * 20;
    }

    // Check if required Works Cited entries are present
    const requiredWorksCited = question.requiredCitations.worksCited.length;
    const foundWorksCited = detectedCitations.worksCited.length;
    if (foundWorksCited < requiredWorksCited) {
      completenessScore -= (requiredWorksCited - foundWorksCited) * 25;
    }

    return Math.max(0, completenessScore);
  }

  /**
   * Score how well citations are integrated into the text
   */
  private async scoreIntegration(response: string, detectedCitations: { inText: string[]; worksCited: string[]; errors: string[] }): Promise<number> {
    const integrationPrompt = `Rate how well citations are integrated into this academic text (0-100):

TEXT:
${response}

CITATIONS FOUND:
${detectedCitations.inText.join(', ')}

Consider:
- Natural flow and readability
- Proper quote integration
- Signal phrases and transitions
- Balance between quotes and analysis

Respond with just a number (0-100):`;

    try {
      const evaluation = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert writing instructor evaluating citation integration quality.'
          },
          {
            role: 'user',
            content: integrationPrompt
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      });

      const scoreText = evaluation.choices[0]?.message?.content || '75';
      const score = parseInt(scoreText.match(/\d+/)?.[0] || '75');
      return Math.max(0, Math.min(100, score));

    } catch (error) {
      console.error('Error scoring integration:', error);
      return 75; // Default score
    }
  }

  /**
   * Generate specific recommendations for citation improvement
   */
  private generateCitationRecommendations(
    question: CitationTestQuestion,
    detectedCitations: { inText: string[]; worksCited: string[]; errors: string[] },
    citationScore: number,
    formatScore: number,
    completenessScore: number,
    integrationScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (citationScore < 80) {
      recommendations.push('Improve overall citation accuracy and MLA compliance');
    }

    if (formatScore < 85) {
      recommendations.push('Fix MLA format errors - ensure proper (Author Page) format for in-text citations');
    }

    if (completenessScore < 90) {
      recommendations.push('Include all required citations - missing in-text citations or Works Cited entries');
    }

    if (integrationScore < 80) {
      recommendations.push('Improve citation integration with better signal phrases and smoother transitions');
    }

    if (detectedCitations.errors.length > 0) {
      recommendations.push(`Fix specific citation errors: ${detectedCitations.errors.join(', ')}`);
    }

    if (detectedCitations.inText.length === 0 && question.requiredCitations.inTextCitations.length > 0) {
      recommendations.push('Add required in-text citations for all claims and quotations');
    }

    if (detectedCitations.worksCited.length === 0 && question.requiredCitations.worksCited.length > 0) {
      recommendations.push('Include complete Works Cited entries in MLA format');
    }

    return recommendations;
  }

  /**
   * Create test questions for citation accuracy testing
   */
  createCitationTestQuestions(): CitationTestQuestion[] {
    return [
      {
        id: 'cite_001',
        question: 'Write a paragraph analyzing the theme of isolation in "The Catcher in the Rye" using direct quotations with proper MLA citations.',
        expectedAnswer: 'Analysis with in-text citations like (Salinger 123) and proper quote integration.',
        requiredCitations: {
          inTextCitations: ['(Salinger 123)'],
          worksCited: ['Salinger, J.D. The Catcher in the Rye...'],
          pageNumbers: true,
          multipleSources: false
        },
        category: 'in_text'
      },
      {
        id: 'cite_002',
        question: 'Create a Works Cited entry for Shakespeare\'s "Hamlet" published by Norton in 2019, edited by Robert Miola.',
        expectedAnswer: 'Shakespeare, William. Hamlet. Edited by Robert Miola, Norton, 2019.',
        requiredCitations: {
          inTextCitations: [],
          worksCited: ['Shakespeare, William. Hamlet. Edited by Robert Miola, Norton, 2019.'],
          pageNumbers: false,
          multipleSources: false
        },
        category: 'works_cited'
      },
      {
        id: 'cite_003',
        question: 'Compare themes in "To Kill a Mockingbird" and "Of Mice and Men" using quotations from both works with proper MLA citations.',
        expectedAnswer: 'Comparative analysis with multiple in-text citations and Works Cited entries for both books.',
        requiredCitations: {
          inTextCitations: ['(Lee 45)', '(Steinbeck 67)'],
          worksCited: ['Lee, Harper. To Kill a Mockingbird...', 'Steinbeck, John. Of Mice and Men...'],
          pageNumbers: true,
          multipleSources: true
        },
        category: 'multiple_sources'
      },
      {
        id: 'cite_004',
        question: 'Paraphrase the main argument from a scholarly article about symbolism in "The Great Gatsby" with proper attribution.',
        expectedAnswer: 'Paraphrased content with in-text citation and signal phrase.',
        requiredCitations: {
          inTextCitations: ['(Johnson 234)'],
          worksCited: [],
          pageNumbers: true,
          multipleSources: false
        },
        category: 'paraphrasing'
      },
      {
        id: 'cite_005',
        question: 'Integrate a quotation from "Pride and Prejudice" into your own sentence about Elizabeth Bennet\'s character development.',
        expectedAnswer: 'Smooth integration of quotation with proper signal phrase and citation.',
        requiredCitations: {
          inTextCitations: ['(Austen 89)'],
          worksCited: [],
          pageNumbers: true,
          multipleSources: false
        },
        category: 'integration'
      }
    ];
  }

  /**
   * Run comprehensive citation accuracy test suite
   */
  async runCitationTestSuite(): Promise<{
    results: CitationAccuracyResult[];
    summary: {
      averageCitationScore: number;
      averageFormatScore: number;
      averageCompletenessScore: number;
      averageIntegrationScore: number;
      categoryPerformance: Record<string, number>;
      topRecommendations: string[];
    };
  }> {
    console.log(`\n📚 Starting Citation Accuracy Test Suite`);
    
    const testQuestions = this.createCitationTestQuestions();
    const results: CitationAccuracyResult[] = [];
    
    for (let i = 0; i < testQuestions.length; i++) {
      const question = testQuestions[i];
      console.log(`\n[${i + 1}/${testQuestions.length}] Testing: ${question.id} (${question.category})`);
      
      try {
        const result = await this.testCitationAccuracy(question);
        results.push(result);
        
        console.log(`  ✅ Citation Score: ${result.citationScore}/100`);
        console.log(`  📝 Format Score: ${result.formatScore}/100`);
        console.log(`  📋 Completeness: ${result.completenessScore}/100`);
        console.log(`  🔗 Integration: ${result.integrationScore}/100`);
        
        // Delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`  ❌ Error testing ${question.id}:`, error);
      }
    }
    
    // Generate summary
    const summary = this.generateCitationSummary(results);
    
    console.log(`\n📊 CITATION ACCURACY SUITE COMPLETE`);
    console.log(`📈 Average Citation Score: ${summary.averageCitationScore}/100`);
    console.log(`📝 Average Format Score: ${summary.averageFormatScore}/100`);
    
    return { results, summary };
  }

  /**
   * Generate comprehensive citation testing summary
   */
  private generateCitationSummary(results: CitationAccuracyResult[]) {
    const averageCitationScore = Math.round(
      results.reduce((sum, r) => sum + r.citationScore, 0) / results.length
    );
    
    const averageFormatScore = Math.round(
      results.reduce((sum, r) => sum + r.formatScore, 0) / results.length
    );
    
    const averageCompletenessScore = Math.round(
      results.reduce((sum, r) => sum + r.completenessScore, 0) / results.length
    );
    
    const averageIntegrationScore = Math.round(
      results.reduce((sum, r) => sum + r.integrationScore, 0) / results.length
    );
    
    // Performance by category
    const categoryPerformance: Record<string, number> = {};
    const categories = [...new Set(results.map(r => r.questionId.split('_')[1]))];
    
    categories.forEach(category => {
      const categoryResults = results.filter(r => r.questionId.includes(category));
      const avgScore = Math.round(
        categoryResults.reduce((sum, r) => sum + r.citationScore, 0) / categoryResults.length
      );
      categoryPerformance[category] = avgScore;
    });
    
    // Top recommendations
    const allRecommendations = results.flatMap(r => r.recommendations);
    const recommendationCounts = allRecommendations.reduce((acc, rec) => {
      acc[rec] = (acc[rec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topRecommendations = Object.entries(recommendationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([rec]) => rec);
    
    return {
      averageCitationScore,
      averageFormatScore,
      averageCompletenessScore,
      averageIntegrationScore,
      categoryPerformance,
      topRecommendations
    };
  }
}