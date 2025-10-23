// Test function for AI definition simplification
// This allows us to test the AI simplification without needing to trigger it through complex definitions

import { simplifyDefinitionWithAI } from './AIDefinitionSimplifier';

export async function testSimplification(word: string, definition: string): Promise<any> {
  console.log('🧪 Testing AI simplification for:', word);
  console.log('🧪 Original definition:', definition);

  try {
    const result = await simplifyDefinitionWithAI({
      word: word,
      originalDefinition: definition,
      partOfSpeech: 'unknown',
      cefrLevel: 'C1'
    });

    console.log('🧪 Simplified definition:', result.definition);
    console.log('🧪 Generated example:', result.example);
    console.log('🧪 Confidence:', result.confidence);
    console.log('🧪 Was simplified:', result.simplified);

    return {
      success: true,
      original: definition,
      simplified: result.definition,
      example: result.example,
      confidence: result.confidence
    };

  } catch (error) {
    console.error('🧪 Test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Test with a known complex definition
export async function runComplexDefinitionTest(): Promise<void> {
  const testCases = [
    {
      word: 'magnificent',
      definition: 'Characterized by grandeur, splendor, and impressive beauty that evokes awe and admiration through its exceptional and extraordinary qualities.'
    },
    {
      word: 'perplexing',
      definition: 'Causing confusion, bewilderment, or uncertainty due to complexity, ambiguity, or contradiction that defies easy comprehension.'
    },
    {
      word: 'serendipitous',
      definition: 'Occurring or discovered by chance in a happy or beneficial way, often referring to pleasant surprises or fortunate accidents.'
    }
  ];

  console.log('🧪 Running AI simplification tests...');

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.word}`);
    await testSimplification(testCase.word, testCase.definition);

    // Add a small delay between tests to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🧪 All tests completed!');
}