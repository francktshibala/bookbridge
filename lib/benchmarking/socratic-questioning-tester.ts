import OpenAI from 'openai';

export interface SocraticTestQuestion {
  id: string;
  topic: string;
  studentQuestion: string;
  expectedSocraticApproach: string;
  learningObjectives: string[];
  targetThinkingSkills: ('analysis' | 'synthesis' | 'evaluation' | 'application' | 'comprehension')[];
}

export interface SocraticQuestioningResult {
  questionId: string;
  topic: string;
  studentQuestion: string;
  aiResponse: string;
  socraticScore: number;           // How well it uses Socratic method (0-100)
  guidanceScore: number;           // Guides discovery vs. gives answers (0-100)
  engagementScore: number;         // Encourages continued thinking (0-100)
  criticalThinkingScore: number;   // Promotes critical thinking (0-100)
  detectedQuestions: string[];     // Questions AI asked back to student
  detectedGuidance: string[];      // Guidance techniques used
  recommendations: string[];
}

/**
 * Tests AI's ability to use Socratic questioning method for educational dialogue
 */
export class SocraticQuestioningTester {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Test Socratic questioning approach for a student question
   */
  async testSocraticQuestioning(testQuestion: SocraticTestQuestion): Promise<SocraticQuestioningResult> {
    console.log(`🤔 Testing Socratic questioning for: ${testQuestion.id}`);

    // Generate AI response using Socratic method
    const aiResponse = await this.generateSocraticResponse(testQuestion);

    // Analyze the response for Socratic elements
    const detectedQuestions = this.extractQuestions(aiResponse);
    const detectedGuidance = this.extractGuidanceTechniques(aiResponse);

    // Score different aspects
    const socraticScore = await this.scoreSocraticMethod(testQuestion, aiResponse, detectedQuestions);
    const guidanceScore = await this.scoreGuidanceApproach(aiResponse, detectedQuestions);
    const engagementScore = await this.scoreEngagement(aiResponse, detectedQuestions);
    const criticalThinkingScore = await this.scoreCriticalThinkingPromotion(testQuestion, aiResponse);

    // Generate recommendations
    const recommendations = this.generateSocraticRecommendations(
      testQuestion, aiResponse, socraticScore, guidanceScore, engagementScore, criticalThinkingScore
    );

    return {
      questionId: testQuestion.id,
      topic: testQuestion.topic,
      studentQuestion: testQuestion.studentQuestion,
      aiResponse,
      socraticScore,
      guidanceScore,
      engagementScore,
      criticalThinkingScore,
      detectedQuestions,
      detectedGuidance,
      recommendations
    };
  }

  /**
   * Generate AI response using Socratic method
   */
  private async generateSocraticResponse(testQuestion: SocraticTestQuestion): Promise<string> {
    const socraticPrompt = `You are a Socratic teacher. A student has asked: "${testQuestion.studentQuestion}" about ${testQuestion.topic}.

Instead of giving direct answers, use the Socratic method:
- Ask thought-provoking questions that guide discovery
- Help the student think through the problem themselves
- Build on their existing knowledge
- Encourage deeper analysis and critical thinking
- Guide them toward insights about: ${testQuestion.learningObjectives.join(', ')}

Target thinking skills: ${testQuestion.targetThinkingSkills.join(', ')}

Respond as a wise teacher who guides rather than tells:`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a master of the Socratic method. You never give direct answers but instead ask questions that lead students to discover answers themselves. You are patient, encouraging, and skilled at guiding thinking.`
        },
        {
          role: 'user',
          content: socraticPrompt
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Extract questions the AI asked back to the student
   */
  private extractQuestions(response: string): string[] {
    // Find sentences ending with question marks
    const questionPattern = /[^.!?]*\?/g;
    const questions = response.match(questionPattern) || [];
    
    return questions
      .map(q => q.trim())
      .filter(q => q.length > 10) // Filter out very short questions
      .slice(0, 10); // Limit to 10 questions max
  }

  /**
   * Extract guidance techniques used
   */
  private extractGuidanceTechniques(response: string): string[] {
    const techniques: string[] = [];

    // Check for common Socratic techniques
    if (/what do you think|what's your opinion|how do you feel/i.test(response)) {
      techniques.push('Asks for student opinion');
    }
    if (/consider|think about|reflect on/i.test(response)) {
      techniques.push('Encourages reflection');
    }
    if (/can you explain|how would you describe|what do you mean/i.test(response)) {
      techniques.push('Seeks clarification');
    }
    if (/what if|suppose|imagine/i.test(response)) {
      techniques.push('Uses hypothetical scenarios');
    }
    if (/why do you think|what makes you say|what evidence/i.test(response)) {
      techniques.push('Asks for reasoning');
    }
    if (/connect|relate|similar|different/i.test(response)) {
      techniques.push('Encourages connections');
    }

    return techniques;
  }

  /**
   * Score how well the response follows Socratic method
   */
  private async scoreSocraticMethod(
    testQuestion: SocraticTestQuestion,
    response: string,
    detectedQuestions: string[]
  ): Promise<number> {
    
    const evaluationPrompt = `Rate how well this response follows the Socratic method (0-100):

STUDENT QUESTION: "${testQuestion.studentQuestion}"
TOPIC: ${testQuestion.topic}

AI RESPONSE: "${response}"

QUESTIONS DETECTED: ${detectedQuestions.length}

Rate based on:
- Asks questions instead of giving direct answers
- Questions guide toward discovery
- Builds on student's existing knowledge
- Encourages deeper thinking
- Avoids lecturing or information dumping

Respond with just a number (0-100):`;

    try {
      const evaluation = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in Socratic teaching methods and educational dialogue assessment.'
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
      console.error('Error scoring Socratic method:', error);
      return 70;
    }
  }

  /**
   * Score how well the response guides rather than tells
   */
  private async scoreGuidanceApproach(response: string, detectedQuestions: string[]): Promise<number> {
    let guidanceScore = 0;

    // Questions indicate guidance approach
    guidanceScore += Math.min(40, detectedQuestions.length * 8);

    // Check for guidance phrases vs. direct statements
    const guidancePhrases = [
      'what do you think', 'consider', 'reflect', 'explore', 'examine',
      'how might', 'what if', 'can you think of', 'does this remind you'
    ];

    guidancePhrases.forEach(phrase => {
      if (response.toLowerCase().includes(phrase)) {
        guidanceScore += 5;
      }
    });

    // Deduct for direct answer-giving
    const directAnswerPhrases = [
      'the answer is', 'it means', 'this represents', 'the theme is',
      'the author intended', 'symbolizes', 'the significance is'
    ];

    directAnswerPhrases.forEach(phrase => {
      if (response.toLowerCase().includes(phrase)) {
        guidanceScore -= 10;
      }
    });

    return Math.max(0, Math.min(100, guidanceScore));
  }

  /**
   * Score how engaging and encouraging the response is
   */
  private async scoreEngagement(response: string, detectedQuestions: string[]): Promise<number> {
    let engagementScore = 70; // Base score

    // Encouraging language
    const encouragingPhrases = [
      'great question', 'interesting point', 'good thinking', 'you\'re on the right track',
      'that\'s a thoughtful', 'keep exploring', 'dig deeper', 'wonderful observation'
    ];

    encouragingPhrases.forEach(phrase => {
      if (response.toLowerCase().includes(phrase)) {
        engagementScore += 5;
      }
    });

    // Multiple questions show engagement
    if (detectedQuestions.length >= 3) {
      engagementScore += 10;
    }

    // Personal connection attempts
    if (/you|your/i.test(response)) {
      engagementScore += 5;
    }

    return Math.max(0, Math.min(100, engagementScore));
  }

  /**
   * Score how well the response promotes critical thinking
   */
  private async scoreCriticalThinkingPromotion(
    testQuestion: SocraticTestQuestion,
    response: string
  ): Promise<number> {
    
    const evaluationPrompt = `Rate how well this response promotes critical thinking skills (0-100):

TARGET SKILLS: ${testQuestion.targetThinkingSkills.join(', ')}
LEARNING OBJECTIVES: ${testQuestion.learningObjectives.join(', ')}

RESPONSE: "${response}"

Rate based on:
- Encourages analysis and evaluation
- Promotes synthesis of ideas
- Asks for evidence and reasoning
- Challenges assumptions
- Connects to broader concepts

Respond with just a number (0-100):`;

    try {
      const evaluation = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in critical thinking pedagogy and cognitive skill development.'
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      });

      const scoreText = evaluation.choices[0]?.message?.content || '75';
      const score = parseInt(scoreText.match(/\d+/)?.[0] || '75');
      return Math.max(0, Math.min(100, score));

    } catch (error) {
      console.error('Error scoring critical thinking promotion:', error);
      return 75;
    }
  }

  /**
   * Generate recommendations for improving Socratic questioning
   */
  private generateSocraticRecommendations(
    testQuestion: SocraticTestQuestion,
    response: string,
    socraticScore: number,
    guidanceScore: number,
    engagementScore: number,
    criticalThinkingScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (socraticScore < 80) {
      recommendations.push('Improve Socratic method - ask more guiding questions instead of giving direct answers');
    }

    if (guidanceScore < 75) {
      recommendations.push('Focus more on guidance rather than information delivery - use "What do you think?" more often');
    }

    if (engagementScore < 80) {
      recommendations.push('Increase engagement with encouraging language and personal connections');
    }

    if (criticalThinkingScore < 75) {
      recommendations.push('Better promote critical thinking by asking for evidence, reasoning, and connections');
    }

    // Check for specific issues
    if (response.toLowerCase().includes('the answer is')) {
      recommendations.push('Avoid giving direct answers - guide students to discover answers themselves');
    }

    if (!response.includes('?')) {
      recommendations.push('Include more questions in responses to promote student thinking');
    }

    if (response.length > 400) {
      recommendations.push('Keep responses shorter to encourage student participation and avoid lecturing');
    }

    return recommendations;
  }

  /**
   * Create test questions for Socratic questioning assessment
   */
  createSocraticTestQuestions(): SocraticTestQuestion[] {
    return [
      {
        id: 'socratic_001',
        topic: 'Character development in To Kill a Mockingbird',
        studentQuestion: 'Why does Scout change so much in the story?',
        expectedSocraticApproach: 'Ask about specific examples of change, what caused them, and how they connect to themes',
        learningObjectives: ['Character analysis', 'Theme identification', 'Cause and effect relationships'],
        targetThinkingSkills: ['analysis', 'evaluation', 'synthesis']
      },
      {
        id: 'socratic_002',
        topic: 'Symbolism in The Great Gatsby',
        studentQuestion: 'What does the green light mean?',
        expectedSocraticApproach: 'Guide student to analyze context, Gatsby\'s behavior, and broader themes of the American Dream',
        learningObjectives: ['Symbol interpretation', 'Thematic analysis', 'Contextual understanding'],
        targetThinkingSkills: ['analysis', 'synthesis', 'evaluation']
      },
      {
        id: 'socratic_003',
        topic: 'Moral themes in literature',
        studentQuestion: 'Is Macbeth evil or just ambitious?',
        expectedSocraticApproach: 'Explore evidence for both views, examine moral complexity, connect to universal themes',
        learningObjectives: ['Moral reasoning', 'Character complexity', 'Evidence evaluation'],
        targetThinkingSkills: ['evaluation', 'analysis', 'synthesis']
      },
      {
        id: 'socratic_004',
        topic: 'Literary techniques',
        studentQuestion: 'Why do authors use irony?',
        expectedSocraticApproach: 'Ask for examples, explore effects on readers, connect to author\'s purposes',
        learningObjectives: ['Literary device analysis', 'Author\'s craft', 'Reader response'],
        targetThinkingSkills: ['analysis', 'application', 'evaluation']
      },
      {
        id: 'socratic_005',
        topic: 'Historical context in literature',
        studentQuestion: 'How does the time period affect the story?',
        expectedSocraticApproach: 'Guide exploration of specific historical elements and their impact on plot, characters, themes',
        learningObjectives: ['Historical analysis', 'Context evaluation', 'Cause and effect'],
        targetThinkingSkills: ['analysis', 'synthesis', 'evaluation']
      }
    ];
  }

  /**
   * Run comprehensive Socratic questioning test suite
   */
  async runSocraticTestSuite(): Promise<{
    results: SocraticQuestioningResult[];
    summary: {
      averageSocraticScore: number;
      averageGuidanceScore: number;
      averageEngagementScore: number;
      averageCriticalThinkingScore: number;
      totalQuestionsAsked: number;
      averageQuestionsPerResponse: number;
      topGuidanceTechniques: string[];
      overallRecommendations: string[];
    };
  }> {
    console.log(`\n🤔 Starting Socratic Questioning Test Suite`);
    
    const testQuestions = this.createSocraticTestQuestions();
    const results: SocraticQuestioningResult[] = [];
    
    for (let i = 0; i < testQuestions.length; i++) {
      const question = testQuestions[i];
      console.log(`\n[${i + 1}/${testQuestions.length}] Testing: ${question.id}`);
      console.log(`  Topic: ${question.topic}`);
      console.log(`  Student asks: "${question.studentQuestion}"`);
      
      try {
        const result = await this.testSocraticQuestioning(question);
        results.push(result);
        
        console.log(`  ✅ Socratic Method: ${result.socraticScore}/100`);
        console.log(`  🎯 Guidance Approach: ${result.guidanceScore}/100`);
        console.log(`  💡 Engagement: ${result.engagementScore}/100`);
        console.log(`  🧠 Critical Thinking: ${result.criticalThinkingScore}/100`);
        console.log(`  ❓ Questions Asked: ${result.detectedQuestions.length}`);
        
        // Delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`  ❌ Error testing ${question.id}:`, error);
      }
    }
    
    // Generate summary
    const summary = this.generateSocraticSummary(results);
    
    console.log(`\n📊 SOCRATIC QUESTIONING SUITE COMPLETE`);
    console.log(`🤔 Average Socratic Score: ${summary.averageSocraticScore}/100`);
    console.log(`🎯 Average Guidance Score: ${summary.averageGuidanceScore}/100`);
    
    return { results, summary };
  }

  /**
   * Generate comprehensive Socratic questioning summary
   */
  private generateSocraticSummary(results: SocraticQuestioningResult[]) {
    const averageSocraticScore = Math.round(
      results.reduce((sum, r) => sum + r.socraticScore, 0) / results.length
    );
    
    const averageGuidanceScore = Math.round(
      results.reduce((sum, r) => sum + r.guidanceScore, 0) / results.length
    );
    
    const averageEngagementScore = Math.round(
      results.reduce((sum, r) => sum + r.engagementScore, 0) / results.length
    );
    
    const averageCriticalThinkingScore = Math.round(
      results.reduce((sum, r) => sum + r.criticalThinkingScore, 0) / results.length
    );
    
    const totalQuestionsAsked = results.reduce((sum, r) => sum + r.detectedQuestions.length, 0);
    const averageQuestionsPerResponse = Math.round(totalQuestionsAsked / results.length * 10) / 10;
    
    // Top guidance techniques
    const allTechniques = results.flatMap(r => r.detectedGuidance);
    const techniquesCounts = allTechniques.reduce((acc, tech) => {
      acc[tech] = (acc[tech] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topGuidanceTechniques = Object.entries(techniquesCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tech, count]) => `${tech} (${count}x)`);
    
    // Overall recommendations
    const allRecommendations = results.flatMap(r => r.recommendations);
    const recommendationCounts = allRecommendations.reduce((acc, rec) => {
      acc[rec] = (acc[rec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const overallRecommendations = Object.entries(recommendationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([rec]) => rec);
    
    return {
      averageSocraticScore,
      averageGuidanceScore,
      averageEngagementScore,
      averageCriticalThinkingScore,
      totalQuestionsAsked,
      averageQuestionsPerResponse,
      topGuidanceTechniques,
      overallRecommendations
    };
  }
}