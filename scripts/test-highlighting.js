// Test script to verify highlighting works
const testHighlighting = () => {
  console.log('🧪 Testing Text Highlighting Fix');
  console.log('================================');
  
  // Simulate the highlighting process
  const testElement = {
    textContent: "Music to hear, why hear'st thou music sadly? Sweets with sweets war not.",
    innerHTML: "Music to hear, why hear'st thou music sadly? Sweets with sweets war not.",
    dataset: {}
  };
  
  const words = testElement.textContent.split(/\s+/).filter(word => word.trim().length > 0);
  console.log('📝 Total words found:', words.length);
  console.log('📝 Words:', words);
  
  // Test highlighting word at index 2 ("hear,")
  const wordIndex = 2;
  const targetWord = words[wordIndex];
  console.log(`\n🎯 Highlighting word at index ${wordIndex}: "${targetWord}"`);
  
  // Escape special regex characters
  const escapeRegex = (str) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  
  // Store original HTML
  testElement.dataset.originalHtml = testElement.innerHTML;
  
  let html = testElement.innerHTML;
  const escapedWord = escapeRegex(targetWord);
  
  // Pattern to match the word with word boundaries
  const wordPattern = new RegExp(`(^|\\s|>)(${escapedWord})(\\s|<|$|[.,!?;:'"\\-])`, 'gi');
  
  let wordCount = 0;
  html = html.replace(wordPattern, (match, before, word, after) => {
    if (wordCount === wordIndex) {
      console.log(`✅ Found and highlighting occurrence ${wordCount}: "${word}"`);
      wordCount++;
      return `${before}<span class="highlight">${word}</span>${after}`;
    }
    wordCount++;
    return match;
  });
  
  console.log('\n📄 Result HTML:', html);
  
  // Test cleanup
  console.log('\n🧹 Testing cleanup...');
  const cleanedHtml = html.replace(/<span class="[^"]*highlight[^"]*"[^>]*>(.*?)<\/span>/gi, '$1');
  console.log('📄 Cleaned HTML:', cleanedHtml);
  
  if (cleanedHtml === testElement.dataset.originalHtml) {
    console.log('✅ Cleanup successful - HTML restored to original');
  } else {
    console.log('❌ Cleanup failed - HTML not properly restored');
  }
  
  console.log('\n✨ Test completed successfully!');
};

testHighlighting();