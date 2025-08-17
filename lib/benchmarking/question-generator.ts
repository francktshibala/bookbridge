import OpenAI from 'openai';
import { TestQuestion } from './raccca-scorer';
import fs from 'fs/promises';
import path from 'path';

/**
 * AI-powered question generator for comprehensive benchmarking
 */
export class QuestionGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate literature questions by category and difficulty
   */
  async generateQuestionBatch(
    category: string,
    difficulty: 'easy' | 'medium' | 'hard',
    count: number = 10,
    userLevel: 'middle_school' | 'high_school' | 'college' | 'graduate' = 'high_school'
  ): Promise<TestQuestion[]> {
    
    console.log(`🎯 Generating ${count} ${difficulty} ${category} questions for ${userLevel} level...`);

    const prompt = this.buildGenerationPrompt(category, difficulty, count, userLevel);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert literature educator creating benchmark questions for AI testing. Generate high-quality, diverse questions with model answers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7 // Higher temperature for variety
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseGeneratedQuestions(content, category, difficulty, userLevel);

    } catch (error) {
      console.error(`Error generating ${category} questions:`, error);
      return [];
    }
  }

  /**
   * Build comprehensive generation prompt
   */
  private buildGenerationPrompt(
    category: string,
    difficulty: 'easy' | 'medium' | 'hard',
    count: number,
    userLevel: string
  ): string {
    const categoryTemplates = {
      themes: {
        easy: 'What is the main theme of [book]?',
        medium: 'How does [author] develop the theme of [theme] in [book]?',
        hard: 'Analyze how [theme1] and [theme2] intersect in [book] and their significance to the overall meaning.'
      },
      characters: {
        easy: 'Who is the protagonist of [book]?',
        medium: 'How does [character] change throughout [book]?',
        hard: 'Analyze the psychological complexity of [character] and how it serves the thematic purposes of [book].'
      },
      symbolism: {
        easy: 'What does [symbol] represent in [book]?',
        medium: 'How does [author] use [symbol] to develop meaning in [book]?',
        hard: 'Examine the multi-layered symbolism of [symbol] and its evolution throughout [book].'
      },
      'plot-structure': {
        easy: 'What is the climax of [book]?',
        medium: 'How does the setting contribute to the plot of [book]?',
        hard: 'Analyze how [author] uses narrative structure to enhance the thematic impact of [book].'
      },
      'literary-techniques': {
        easy: 'What is [literary device]?',
        medium: 'How does [author] use [literary device] in [book]?',
        hard: 'Evaluate the effectiveness of [author]\'s use of [multiple techniques] in achieving the artistic goals of [book].'
      },
      'historical-context': {
        easy: 'When was [book] written?',
        medium: 'How does the historical context influence [book]?',
        hard: 'Analyze how [book] both reflects and challenges the social conventions of its historical period.'
      },
      'comparative-analysis': {
        easy: 'Compare the main characters of [book1] and [book2].',
        medium: 'How do [book1] and [book2] treat the theme of [theme] differently?',
        hard: 'Conduct a comparative analysis of how [author1] and [author2] use similar literary techniques to achieve different artistic effects.'
      }
    };

    const difficultyGuidelines = {
      easy: 'Focus on factual recall, basic comprehension, and simple identification tasks.',
      medium: 'Require analysis, interpretation, and understanding of relationships between elements.',
      hard: 'Demand synthesis, evaluation, comparison, and sophisticated critical thinking.'
    };

    const userLevelGuidelines: Record<string, string> = {
      middle_school: 'Age-appropriate content, simpler vocabulary, relatable examples',
      high_school: 'Standard curriculum books, developing analytical skills',
      college: 'Complex literary works, academic terminology, multiple perspectives',
      graduate: 'Advanced theoretical frameworks, scholarly discourse, original insights'
    };

    return `Generate ${count} high-quality literature questions for benchmarking an AI system.

CATEGORY: ${category}
DIFFICULTY: ${difficulty}
USER LEVEL: ${userLevel}

REQUIREMENTS:
- ${difficultyGuidelines[difficulty]}
- Appropriate for ${userLevelGuidelines[userLevel] || 'high school level'}
- Cover diverse literary works (classics, modern, various cultures)
- Include expected answers that demonstrate proper literary analysis
- Each question should be unique and test different aspects

FAMOUS BOOKS TO DRAW FROM:
- Classics: Shakespeare, Dickens, Austen, Brontë, Hardy, Wilde
- American: Twain, Hemingway, Faulkner, Morrison, Steinbeck, Lee
- World Literature: Kafka, García Márquez, Achebe, Mistry
- Modern: Orwell, Huxley, Salinger, Plath, Atwood

FORMAT YOUR RESPONSE AS JSON:
[
  {
    "question": "What is the significance of the green light in The Great Gatsby?",
    "expectedAnswer": "The green light symbolizes Gatsby's dreams and hopes, particularly his longing for Daisy. It represents the American Dream - something desired but ultimately unattainable. The light is both a physical beacon and a metaphor for the past that Gatsby cannot recreate.",
    "book": "The Great Gatsby",
    "author": "F. Scott Fitzgerald"
  }
]

Generate exactly ${count} questions following this pattern.`;
  }

  /**
   * Parse AI-generated questions into structured format
   */
  private parseGeneratedQuestions(
    content: string,
    category: string,
    difficulty: 'easy' | 'medium' | 'hard',
    userLevel: string
  ): TestQuestion[] {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const parsedQuestions = JSON.parse(jsonMatch[0]);
      
      return parsedQuestions.map((q: any, index: number) => ({
        id: `gen_${category}_${difficulty}_${Date.now()}_${index}`,
        question: q.question,
        expectedAnswer: q.expectedAnswer,
        difficulty,
        category,
        userLevel: userLevel as any,
        book: q.book,
        author: q.author
      }));

    } catch (error) {
      console.error('Error parsing generated questions:', error);
      return [];
    }
  }

  /**
   * Generate comprehensive question database
   */
  async generateComprehensiveDatabase(): Promise<void> {
    console.log('🚀 Generating Comprehensive Question Database (1000+ questions)...');
    console.log('⏱️  This will take several minutes due to AI generation...');

    const categories = [
      'themes', 'characters', 'symbolism', 'plot-structure', 
      'literary-techniques', 'historical-context', 'comparative-analysis'
    ];
    
    const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
    const userLevels: ('middle_school' | 'high_school' | 'college' | 'graduate')[] = 
      ['middle_school', 'high_school', 'college', 'graduate'];

    const allQuestions: TestQuestion[] = [];
    let totalGenerated = 0;

    // Generate questions for each combination
    for (const category of categories) {
      for (const difficulty of difficulties) {
        for (const userLevel of userLevels) {
          console.log(`\n📝 Generating: ${category} - ${difficulty} - ${userLevel}`);
          
          try {
            const questions = await this.generateQuestionBatch(category, difficulty, 12, userLevel);
            allQuestions.push(...questions);
            totalGenerated += questions.length;
            
            console.log(`✅ Generated ${questions.length} questions (Total: ${totalGenerated})`);
            
            // Delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 3000));
            
          } catch (error) {
            console.error(`❌ Failed to generate ${category}/${difficulty}/${userLevel}:`, error);
          }
        }
      }
    }

    // Add citation-focused questions
    console.log(`\n📚 Generating citation-focused questions...`);
    const citationQuestions = await this.generateCitationQuestions();
    allQuestions.push(...citationQuestions);

    // Save to expanded database
    await this.saveExpandedDatabase(allQuestions);
    
    console.log(`\n🎉 DATABASE GENERATION COMPLETE!`);
    console.log(`📊 Total Questions Generated: ${allQuestions.length}`);
    console.log(`📁 Saved to: expanded-question-database.json`);
  }

  /**
   * Generate questions specifically testing citation accuracy
   */
  async generateCitationQuestions(): Promise<TestQuestion[]> {
    const citationPrompt = `Generate 50 literature questions that specifically test citation accuracy and MLA format knowledge.

Include questions that require:
1. Proper in-text citations with page numbers
2. Works Cited entries
3. Quote integration techniques
4. Paraphrasing with attribution
5. Multiple source citations

FORMAT AS JSON ARRAY with expectedAnswer showing proper MLA format.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in MLA citation format and academic writing standards.'
          },
          {
            role: 'user',
            content: citationPrompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseGeneratedQuestions(content, 'citations', 'medium', 'college');

    } catch (error) {
      console.error('Error generating citation questions:', error);
      return [];
    }
  }

  /**
   * Save expanded database to file
   */
  private async saveExpandedDatabase(questions: TestQuestion[]): Promise<void> {
    const filepath = path.join(
      process.cwd(), 
      'lib', 
      'benchmarking', 
      'data', 
      'expanded-question-database.json'
    );

    // Add statistics
    const database = {
      metadata: {
        totalQuestions: questions.length,
        generatedDate: new Date().toISOString(),
        categories: this.getQuestionStats(questions, 'category'),
        difficulties: this.getQuestionStats(questions, 'difficulty'),
        userLevels: this.getQuestionStats(questions, 'userLevel')
      },
      questions
    };

    await fs.writeFile(filepath, JSON.stringify(database, null, 2));
  }

  /**
   * Get statistics breakdown for a field
   */
  private getQuestionStats(questions: TestQuestion[], field: keyof TestQuestion): Record<string, number> {
    const stats: Record<string, number> = {};
    
    questions.forEach(q => {
      const value = q[field] as string;
      stats[value] = (stats[value] || 0) + 1;
    });

    return stats;
  }

  /**
   * Generate questions for specific topics or books
   */
  async generateTargetedQuestions(
    book: string,
    author: string,
    questionCount: number = 20
  ): Promise<TestQuestion[]> {
    console.log(`📖 Generating ${questionCount} targeted questions for "${book}" by ${author}...`);

    const prompt = `Generate ${questionCount} comprehensive literature questions specifically about "${book}" by ${author}.

Include a mix of:
- Easy factual questions (characters, plot, setting)
- Medium analytical questions (themes, symbols, techniques)  
- Hard evaluative questions (significance, complexity, comparisons)

Cover multiple user levels from high school to graduate level.

FORMAT AS JSON ARRAY with proper expectedAnswer for each question.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a literature professor creating comprehensive questions about specific works.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2500,
        temperature: 0.6
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseGeneratedQuestions(content, 'book-specific', 'medium', 'high_school');

    } catch (error) {
      console.error(`Error generating questions for ${book}:`, error);
      return [];
    }
  }
}