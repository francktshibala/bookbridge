// Stub file to fix build errors
export interface AdvancedTestResult {
  testId: string;
  score: number;
  passed: boolean;
  question?: string;
  aiResponse?: string;
  raccca: {
    overall: number;
    relevance: number;
    accuracy: number;
    completeness: number;
    clarity: number;
    coherence: number;
    appropriateness: number;
  };
  details?: any;
}