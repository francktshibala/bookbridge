// Stub file to fix build errors
export interface TestResult {
  testId: string;
  score: number;
  passed: boolean;
  question?: string;
  aiResponse?: string;
  details?: any;
}

export interface TestQuestion {
  id: string;
  question: string;
  category?: string;
  difficulty?: string;
  userLevel?: string;
  details?: any;
}