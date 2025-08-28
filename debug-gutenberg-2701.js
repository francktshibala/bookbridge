#!/usr/bin/env node

/**
 * Debug script to test the content length issue with gutenberg-2701 (Moby Dick)
 * This will help identify where content is being truncated.
 */

async function testGutenbergBook() {
  console.log('🔍 Testing Gutenberg book 2701 (Moby Dick) content length...\n');

  try {
    // Step 1: Test direct Gutenberg API
    console.log('📥 Step 1: Fetching directly from Project Gutenberg...');
    const directResponse = await fetch('https://www.gutenberg.org/files/2701/2701-0.txt');
    const directContent = await directResponse.text();
    
    console.log('✅ Direct Gutenberg content:');
    console.log(`   Characters: ${directContent.length.toLocaleString()}`);
    console.log(`   Words: ${directContent.split(/\s+/).length.toLocaleString()}`);
    console.log(`   First 200 chars: "${directContent.substring(0, 200)}..."`);
    console.log(`   Last 200 chars: "...${directContent.substring(directContent.length - 200)}"`);
    
    // Step 2: Test story content extraction (simulate the content-fast logic)
    console.log('\n📐 Step 2: Testing story content extraction...');
    
    // Helper function to find the start of the actual story (from content-fast route)
    const findStoryStart = (text) => {
      const patterns = [
        /^Chapter\s+1/im,                    // "Chapter 1" 
        /^Chapter\s+I/im,                    // "Chapter I"
        /^\s*1\s*$/m,                       // Standalone "1" (chapter number)
        /^CHAPTER\s+1/im,                   // "CHAPTER 1"
        /^CHAPTER\s+I/im,                   // "CHAPTER I"
        /\*\*\*\s*START OF THE PROJECT GUTENBERG/im, // End of header marker
        /\*\*\*\s*END OF THE PROJECT GUTENBERG EBOOK/im // Before footer
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match.index !== undefined) {
          console.log(`   📍 Found story start with pattern: ${pattern.toString()}`);
          console.log(`   📍 Match: "${match[0]}" at position ${match.index}`);
          return match.index;
        }
      }
      
      // Fallback: skip first 20% of text (usually contains preface/metadata)
      const fallbackStart = Math.floor(text.length * 0.2);
      console.log(`   📍 Using fallback: skip first 20% (${fallbackStart.toLocaleString()} chars)`);
      return fallbackStart;
    };
    
    // Helper function to find the end of the actual story (from content-fast route)  
    const findStoryEnd = (text) => {
      const endPatterns = [
        /\*\*\*\s*END OF THE PROJECT GUTENBERG/im,
        /^End of Project Gutenberg/im,
        /^APPENDIX/im,
        /^NOTES/im,
        /^BIBLIOGRAPHY/im,
        /^INDEX/im
      ];
      
      for (const pattern of endPatterns) {
        const match = text.match(pattern);
        if (match && match.index !== undefined) {
          console.log(`   📍 Found story end with pattern: ${pattern.toString()}`);
          console.log(`   📍 Match: "${match[0]}" at position ${match.index}`);
          return match.index;
        }
      }
      
      console.log(`   📍 No story end found, using full text length: ${text.length.toLocaleString()}`);
      return text.length;
    };
    
    const storyStart = findStoryStart(directContent);
    const storyEnd = findStoryEnd(directContent);
    const storyContent = directContent.slice(storyStart, storyEnd);
    
    console.log(`   Story start: ${storyStart.toLocaleString()}`);
    console.log(`   Story end: ${storyEnd.toLocaleString()}`);
    console.log(`   Story content length: ${storyContent.length.toLocaleString()}`);
    console.log(`   Story word count: ${storyContent.split(/\s+/).length.toLocaleString()}`);
    
    // Step 3: Test chunking logic (simulate the reading page logic)
    console.log('\n✂️  Step 3: Testing chunking logic...');
    
    const chunkSizeBrowse = 6000; // Browse experience chunk size
    const chunkSizeEnhanced = 1500; // Enhanced experience chunk size
    
    // Test browse chunking
    const browseChunks = [];
    for (let i = 0; i < storyContent.length; i += chunkSizeBrowse) {
      browseChunks.push({
        chunkIndex: browseChunks.length,
        content: storyContent.substring(i, i + chunkSizeBrowse)
      });
    }
    
    // Test enhanced chunking  
    const enhancedChunks = [];
    for (let i = 0; i < storyContent.length; i += chunkSizeEnhanced) {
      enhancedChunks.push({
        chunkIndex: enhancedChunks.length,
        content: storyContent.substring(i, i + chunkSizeEnhanced)
      });
    }
    
    console.log(`   Browse chunks (6000 chars each): ${browseChunks.length}`);
    console.log(`   Enhanced chunks (1500 chars each): ${enhancedChunks.length}`);
    
    // Show first and last chunks for browse experience
    if (browseChunks.length > 0) {
      console.log(`\n   First browse chunk (${browseChunks[0].content.length} chars):`);
      console.log(`   "${browseChunks[0].content.substring(0, 150)}..."`);
      
      if (browseChunks.length > 1) {
        const lastChunk = browseChunks[browseChunks.length - 1];
        console.log(`\n   Last browse chunk (${lastChunk.content.length} chars):`);
        console.log(`   "...${lastChunk.content.substring(Math.max(0, lastChunk.content.length - 150))}"`);
      }
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   • Original Gutenberg text: ${directContent.length.toLocaleString()} characters`);
    console.log(`   • Story content (after extraction): ${storyContent.length.toLocaleString()} characters`);
    console.log(`   • Content reduction: ${((1 - storyContent.length/directContent.length) * 100).toFixed(1)}%`);
    console.log(`   • Expected browse chunks: ${browseChunks.length} (not 4!)`);
    console.log(`   • Expected enhanced chunks: ${enhancedChunks.length}`);
    
    if (browseChunks.length <= 5) {
      console.log('\n❌ ISSUE FOUND: Too few chunks! Expected ~200+ chunks for Moby Dick.');
      console.log('   This suggests the content is being truncated somewhere else.');
    } else {
      console.log('\n✅ CHUNKING LOOKS CORRECT: Story extraction and chunking should produce many chunks.');
      console.log('   The issue is likely in the API response, not the chunking logic.');
    }
    
  } catch (error) {
    console.error('❌ Error testing Gutenberg book:', error.message);
  }
}

// Run the test
testGutenbergBook();