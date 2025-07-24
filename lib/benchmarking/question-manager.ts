import { TestQuestion } from './test-runner';
import fs from 'fs/promises';
import path from 'path';

export class QuestionManager {
  private questionsPath: string;

  constructor() {
    this.questionsPath = path.join(process.cwd(), 'lib', 'benchmarking', 'data', 'test-questions.json');
  }

  /**
   * Load all test questions from file
   */
  async loadQuestions(): Promise<TestQuestion[]> {
    try {
      const content = await fs.readFile(this.questionsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error loading questions:', error);
      return [];
    }
  }

  /**
   * Get questions by difficulty level
   */
  async getQuestionsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Promise<TestQuestion[]> {
    const questions = await this.loadQuestions();
    return questions.filter(q => q.difficulty === difficulty);
  }

  /**
   * Get questions by category
   */
  async getQuestionsByCategory(category: string): Promise<TestQuestion[]> {
    const questions = await this.loadQuestions();
    return questions.filter(q => q.category === category);
  }

  /**
   * Get random selection of questions
   */
  async getRandomQuestions(count: number): Promise<TestQuestion[]> {
    const questions = await this.loadQuestions();
    const shuffled = questions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get a balanced mix of questions (different difficulties)
   */
  async getBalancedQuestions(totalCount: number): Promise<TestQuestion[]> {
    const easyCount = Math.ceil(totalCount * 0.4);    // 40% easy
    const mediumCount = Math.ceil(totalCount * 0.4);  // 40% medium  
    const hardCount = totalCount - easyCount - mediumCount; // 20% hard

    const easy = await this.getQuestionsByDifficulty('easy');
    const medium = await this.getQuestionsByDifficulty('medium');
    const hard = await this.getQuestionsByDifficulty('hard');

    const selectedEasy = easy.sort(() => 0.5 - Math.random()).slice(0, easyCount);
    const selectedMedium = medium.sort(() => 0.5 - Math.random()).slice(0, mediumCount);
    const selectedHard = hard.sort(() => 0.5 - Math.random()).slice(0, hardCount);

    return [...selectedEasy, ...selectedMedium, ...selectedHard];
  }

  /**
   * Get questions for daily testing (10 balanced questions)
   */
  async getDailyTestQuestions(): Promise<TestQuestion[]> {
    return this.getBalancedQuestions(10);
  }

  /**
   * Add a new test question
   */
  async addQuestion(question: TestQuestion): Promise<void> {
    const questions = await this.loadQuestions();
    questions.push(question);
    await fs.writeFile(this.questionsPath, JSON.stringify(questions, null, 2));
  }

  /**
   * Get statistics about the question database
   */
  async getQuestionStats(): Promise<{
    total: number;
    byDifficulty: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    const questions = await this.loadQuestions();
    
    const byDifficulty = questions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = questions.reduce((acc, q) => {
      acc[q.category] = (acc[q.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: questions.length,
      byDifficulty,
      byCategory
    };
  }
}