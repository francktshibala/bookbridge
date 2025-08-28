#!/usr/bin/env node

/**
 * Quick test to verify the content truncation fix
 * This simulates the exact logic that was fixed in the content-fast API
 */

async function testFix() {
  console.log('🧪 Testing the content truncation fix...\n');
  
  try {
    // Simulate fetching Moby Dick content
    console.log('📥 Fetching Moby Dick from Gutenberg...');
    const response = await fetch('https://www.gutenberg.org/files/2701/2701-0.txt');
    const originalContent = await response.text();
    
    console.log(`✅ Original content: ${originalContent.length.toLocaleString()} characters`);
    
    // Simulate the story extraction logic (FIXED VERSION)
    const findStoryStart = (text) => {
      const patterns = [
        /^Chapter\s+1/im,
        /^Chapter\s+I/im,
        /^\s*1\s*$/m,
        /^CHAPTER\s+1/im,
        /^CHAPTER\s+I/im,
        /\*\*\*\s*START OF THE PROJECT GUTENBERG/im,
        /\*\*\*\s*END OF THE PROJECT GUTENBERG EBOOK/im
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match.index !== undefined) {
          console.log(`📍 Found story start: "${match[0]}" at position ${match.index}`);
          return match.index;
        }
      }
      
      const fallback = Math.floor(text.length * 0.2);
      console.log(`📍 Using fallback start: ${fallback} (20% of text)`);
      return fallback;
    };
    
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
          console.log(`📍 Found story end: "${match[0]}" at position ${match.index}`);
          return match.index;
        }
      }
      
      console.log(`📍 No end pattern found, using full length: ${text.length}`);
      return text.length;
    };
    
    // Extract story content
    const storyStart = findStoryStart(originalContent);
    const storyEnd = findStoryEnd(originalContent);
    const storyContent = originalContent.slice(storyStart, storyEnd);
    
    console.log(`\n📐 Story extraction results:`);
    console.log(`   Start: ${storyStart.toLocaleString()}`);
    console.log(`   End: ${storyEnd.toLocaleString()}`);
    console.log(`   Story length: ${storyContent.length.toLocaleString()} characters`);
    console.log(`   Word count: ${storyContent.split(/\s+/).length.toLocaleString()}`);
    
    // Test the FIXED logic for reading mode (no query)
    const query = null; // Simulate reading page call (no query parameter)
    let context;
    
    if (!query) {
      // READING MODE: Return the FULL story content without truncation
      console.log(`\n📖 READING MODE: No query parameter detected`);
      context = storyContent;
      console.log(`   Returning full story content: ${context.length.toLocaleString()} characters`);
    }
    
    // Test chunking with the fixed content
    const chunkSize = 6000; // Browse experience
    const expectedChunks = Math.ceil(context.length / chunkSize);
    
    console.log(`\n✂️  Chunking simulation:`);
    console.log(`   Chunk size: ${chunkSize.toLocaleString()} characters`);
    console.log(`   Expected chunks: ${expectedChunks}`);
    
    // Create actual chunks to verify
    const chunks = [];
    for (let i = 0; i < context.length; i += chunkSize) {
      chunks.push({
        chunkIndex: chunks.length,
        content: context.substring(i, i + chunkSize)
      });
    }
    
    console.log(`   Actual chunks created: ${chunks.length}`);
    console.log(`   First chunk length: ${chunks[0]?.content.length || 0}`);
    console.log(`   Last chunk length: ${chunks[chunks.length - 1]?.content.length || 0}`);
    
    // Verification
    console.log(`\n🎯 VERIFICATION:`);
    if (chunks.length >= 200) {
      console.log(`✅ SUCCESS: Created ${chunks.length} chunks (expected ~200+ for Moby Dick)`);
      console.log(`✅ The fix should resolve the "4 pages only" issue!`);
    } else if (chunks.length >= 50) {
      console.log(`⚠️  PARTIAL: Created ${chunks.length} chunks (better, but still might be truncated)`);
    } else {
      console.log(`❌ FAILED: Only ${chunks.length} chunks created (issue persists)`);
    }
    
    // Show content sample
    if (chunks.length > 0) {
      console.log(`\n📄 First chunk preview:`);
      console.log(`"${chunks[0].content.substring(0, 200)}..."`);
      
      if (chunks.length > 1) {
        console.log(`\n📄 Last chunk preview:`);
        const lastChunk = chunks[chunks.length - 1];
        const preview = lastChunk.content.substring(Math.max(0, lastChunk.content.length - 200));
        console.log(`"...${preview}"`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFix();