#!/usr/bin/env node

/**
 * Debug script to test the Gutenberg API metadata for book 2701
 * This will help identify if there's an issue with the book metadata or URL.
 */

async function testGutenbergAPI() {
  console.log('🔍 Testing Gutenberg API for book 2701...\n');

  try {
    // Step 1: Test Gutendex metadata API
    console.log('📥 Step 1: Fetching metadata from Gutendex API...');
    const metadataResponse = await fetch('https://gutendex.com/books/2701');
    
    if (!metadataResponse.ok) {
      throw new Error(`Gutendex API error: ${metadataResponse.statusText}`);
    }
    
    const bookData = await metadataResponse.json();
    console.log('✅ Book metadata:');
    console.log(`   Title: ${bookData.title}`);
    console.log(`   Authors: ${bookData.authors.map(a => a.name).join(', ')}`);
    console.log(`   Download count: ${bookData.download_count.toLocaleString()}`);
    console.log('   Available formats:');
    
    // List all available formats
    Object.entries(bookData.formats).forEach(([format, url]) => {
      console.log(`     ${format}: ${url}`);
    });
    
    // Step 2: Test what our transformToExternalBook would select
    console.log('\n📐 Step 2: Testing text format selection...');
    
    // This is the same logic from gutenberg-api.ts lines 255-259
    const textUrl = bookData.formats['text/plain; charset=utf-8'] || 
                   bookData.formats['text/plain; charset=us-ascii'] ||
                   bookData.formats['text/plain'] ||
                   bookData.formats['text/plain; charset=iso-8859-1'];
    
    if (!textUrl) {
      console.log('❌ No text format found!');
      return;
    }
    
    console.log(`✅ Selected text URL: ${textUrl}`);
    
    // Step 3: Test fetching content from the selected URL
    console.log('\n📥 Step 3: Testing content fetch from selected URL...');
    
    const contentResponse = await fetch(textUrl);
    if (!contentResponse.ok) {
      throw new Error(`Content fetch error: ${contentResponse.statusText}`);
    }
    
    const content = await contentResponse.text();
    
    // Basic cleaning - same as gutenberg-api.ts lines 299-303
    const cleanedContent = content
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    console.log('✅ Content fetched successfully:');
    console.log(`   Original length: ${content.length.toLocaleString()}`);
    console.log(`   Cleaned length: ${cleanedContent.length.toLocaleString()}`);
    console.log(`   Word count: ${cleanedContent.split(/\s+/).length.toLocaleString()}`);
    console.log(`   First 200 chars: "${cleanedContent.substring(0, 200)}..."`);
    
    // Step 4: Compare with direct fetch
    console.log('\n🔄 Step 4: Comparing with direct Gutenberg fetch...');
    
    const directResponse = await fetch('https://www.gutenberg.org/files/2701/2701-0.txt');
    const directContent = await directResponse.text();
    
    console.log(`   Direct fetch length: ${directContent.length.toLocaleString()}`);
    console.log(`   API fetch length: ${cleanedContent.length.toLocaleString()}`);
    console.log(`   Length difference: ${Math.abs(directContent.length - cleanedContent.length).toLocaleString()}`);
    
    if (Math.abs(directContent.length - cleanedContent.length) > 1000) {
      console.log('⚠️  Significant length difference detected!');
      console.log('   This could indicate the API is returning different content than expected.');
    } else {
      console.log('✅ Content lengths match (within tolerance)');
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   • Book title: ${bookData.title}`);
    console.log(`   • Text URL: ${textUrl}`);
    console.log(`   • Content length: ${cleanedContent.length.toLocaleString()} characters`);
    console.log(`   • Text format available: ${textUrl ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Error testing Gutenberg API:', error.message);
  }
}

// Run the test
testGutenbergAPI();