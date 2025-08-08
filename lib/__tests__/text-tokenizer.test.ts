/**
 * Test file for Text Tokenizer - Step 1.1 Validation
 * Run this to verify tokenization works before proceeding to Step 1.2
 */

import { textTokenizer, WordToken } from '../text-tokenizer';

// Test with realistic AI response content
const sampleAIResponse = `Your question touches on an important aspect of symbolism in The Great Gatsby. The green light represents Gatsby's hope and his unreachable dream of being with Daisy.

Consider how Fitzgerald uses color symbolism throughout the novel. Green traditionally symbolizes hope, money, and nature - all themes central to Gatsby's character and the American Dream.

What's particularly powerful is how the light's meaning changes. When Gatsby finally reunites with Daisy, the light loses its "colossal significance" and becomes just a light again.`;

console.log('🧪 Testing Text Tokenizer (Step 1.1)\n');

// Test 1: Basic tokenization
console.log('Test 1: Basic Tokenization');
console.log('Input text length:', sampleAIResponse.length);

const tokens = textTokenizer.tokenizeText(sampleAIResponse, 30); // 30 second estimated duration
console.log('Generated tokens:', tokens.length);
console.log('First 5 tokens:');
tokens.slice(0, 5).forEach(token => {
  console.log(`  "${token.text}" (${token.startTime.toFixed(2)}s - ${token.endTime.toFixed(2)}s) ${token.isPunctuation ? '[PUNCT]' : '[WORD]'}`);
});

console.log('\n---\n');

// Test 2: Timing distribution
console.log('Test 2: Timing Distribution');
const totalDuration = tokens[tokens.length - 1]?.endTime || 0;
console.log('Total estimated duration:', totalDuration.toFixed(2), 'seconds');
console.log('Target duration: 30 seconds');
console.log('Timing accuracy:', ((30 / totalDuration) * 100).toFixed(1) + '%');

console.log('\n---\n');

// Test 3: Word vs Punctuation ratio
console.log('Test 3: Token Analysis');
const wordTokens = tokens.filter(t => !t.isPunctuation);
const punctuationTokens = tokens.filter(t => t.isPunctuation);
console.log('Word tokens:', wordTokens.length);
console.log('Punctuation tokens:', punctuationTokens.length);
console.log('Words per minute (estimated):', ((wordTokens.length / totalDuration) * 60).toFixed(0));

console.log('\n---\n');

// Test 4: Provider-specific settings
console.log('Test 4: Provider Settings');
const webSpeechSettings = textTokenizer.getProviderOptimizedSettings('web-speech', 1.0);
const openAISettings = textTokenizer.getProviderOptimizedSettings('openai', 1.0);
const elevenLabsSettings = textTokenizer.getProviderOptimizedSettings('elevenlabs', 1.0);

console.log('Web Speech WPM:', webSpeechSettings.baseWordsPerMinute);
console.log('OpenAI WPM:', openAISettings.baseWordsPerMinute);
console.log('ElevenLabs WPM:', elevenLabsSettings.baseWordsPerMinute);

console.log('\n---\n');

// Test 5: Time lookup
console.log('Test 5: Time-based Word Lookup');
const testTimes = [5, 15, 25];
testTimes.forEach(time => {
  const wordAtTime = textTokenizer.findWordAtTime(tokens, time);
  console.log(`At ${time}s: "${wordAtTime?.text || 'No word found'}"`);
});

console.log('\n✅ Text Tokenizer Test Complete!');
console.log('\nNext Step: Implement HighlightableText component (Step 1.2)');