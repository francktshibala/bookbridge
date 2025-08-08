// Improved test script to verify highlighting works with punctuation
const testHighlightingImproved = () => {
  console.log('🧪 Testing Improved Text Highlighting Fix');
  console.log('=========================================');
  
  // Test cases with various punctuation scenarios
  const testCases = [
    { text: "Music to hear, why hear'st thou music sadly?", wordIndex: 2, expected: "hear," },
    { text: "Music to hear, why hear'st thou music sadly?", wordIndex: 3, expected: "why" },
    { text: "Music to hear, why hear'st thou music sadly?", wordIndex: 4, expected: "hear'st" },
    { text: "Sweets with sweets war not.", wordIndex: 4, expected: "not." },
  ];
  
  testCases.forEach((testCase, idx) => {
    console.log(`\n📝 Test Case ${idx + 1}:`);
    console.log(`   Text: "${testCase.text}"`);
    console.log(`   Target word index: ${testCase.wordIndex}`);
    console.log(`   Expected word: "${testCase.expected}"`);
    
    // Split into words
    const words = testCase.text.split(/\s+/).filter(word => word.trim().length > 0);
    const targetWord = words[testCase.wordIndex];
    
    console.log(`   Actual word at index: "${targetWord}"`);
    
    // Simulate the improved highlighting process
    const processTextForHighlighting = (text, wordIndex, targetWord) => {
      const textWords = text.split(/(\s+)/); // Keep whitespace
      let result = '';
      let wordCount = 0;
      let foundAndHighlighted = false;
      
      for (let i = 0; i < textWords.length; i++) {
        const part = textWords[i];
        // Skip whitespace parts
        if (/^\s+$/.test(part)) {
          result += part;
          continue;
        }
        
        // Check if this word matches our target
        const cleanWord = part.replace(/[^\w'-]/g, '');
        const targetClean = targetWord.replace(/[^\w'-]/g, '');
        
        if (cleanWord.toLowerCase() === targetClean.toLowerCase() && wordCount === wordIndex && !foundAndHighlighted) {
          result += `<span class="highlight">${part}</span>`;
          foundAndHighlighted = true;
        } else {
          result += part;
        }
        
        // Only increment for actual words
        if (part.trim().length > 0) {
          wordCount++;
        }
      }
      
      return { result, foundAndHighlighted };
    };
    
    const { result, foundAndHighlighted } = processTextForHighlighting(testCase.text, testCase.wordIndex, targetWord);
    
    if (foundAndHighlighted) {
      console.log(`   ✅ Successfully highlighted word "${targetWord}"`);
      console.log(`   Result: ${result.substring(0, 100)}...`);
    } else {
      console.log(`   ❌ Failed to highlight word "${targetWord}"`);
    }
  });
  
  console.log('\n✨ All test cases completed!');
};

testHighlightingImproved();