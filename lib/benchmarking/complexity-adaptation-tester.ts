// Stub file to fix build errors
export interface ComplexityAdaptationResult {
  testId: string;
  score: number;
  passed: boolean;
  adaptationScore: number;
  baseQuestion?: string;
  responses?: {
    middle_school?: {
      response?: string;
    };
    graduate?: {
      response?: string;
    };
  };
  details?: any;
}