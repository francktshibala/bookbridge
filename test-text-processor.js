// Test the TextProcessor independently
const { TextProcessor } = require('./lib/text-processor.ts');

const sampleText = `
Elizabeth Bennet was sitting by herself the next morning, writing to her sister Jane, when she was startled by a ring at the door-bell. She had been expecting no one, and her surprise was great when, to her utter amazement, she saw Mr. Darcy walk into the room. In an hurried manner he immediately began an enquiry after her health, imputing his visit to a wish of hearing that her sister, being by then better. She answered him with cold civility. He sat down for a few moments, and then getting up, walked about the room.
`;

try {
  const result = TextProcessor.splitIntoSentences(sampleText);
  const validation = TextProcessor.validateProcessing(sampleText, result);
  
  console.log('=== TEXT PROCESSOR TEST ===');
  console.log('Original text length:', sampleText.length);
  console.log('Sentences created:', result.length);
  console.log('\nProcessed sentences:');
  result.forEach((sentence, i) => {
    console.log(`${i + 1}: [${sentence.wordCount} words, ${sentence.estimatedDuration}s] ${sentence.text.substring(0, 60)}...`);
  });
  
  console.log('\nValidation:', validation.isValid ? '✅ PASS' : '❌ FAIL');
  console.log('Stats:', validation.stats);
  if (validation.issues.length > 0) {
    console.log('Issues:', validation.issues);
  }
} catch (error) {
  console.error('❌ Test failed:', error.message);
}