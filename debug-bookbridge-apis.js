#!/usr/bin/env node

/**
 * Debug script to test the BookBridge API chain for gutenberg-2701
 * This will test each step of the API chain to find where content gets truncated.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testBookBridgeAPIs() {
  console.log('🔍 Testing BookBridge API chain for gutenberg-2701...\n');
  console.log(`Using base URL: ${BASE_URL}\n`);

  try {
    // Step 1: Test the external book API
    console.log('📥 Step 1: Testing /api/books/external/gutenberg-2701...');
    
    try {
      const externalResponse = await fetch(`${BASE_URL}/api/books/external/gutenberg-2701`);
      
      if (!externalResponse.ok) {
        console.log(`❌ External API failed with status: ${externalResponse.status}`);
        const errorText = await externalResponse.text();
        console.log(`   Error: ${errorText.substring(0, 500)}...`);
      } else {
        const externalData = await externalResponse.json();
        console.log('✅ External API response:');
        console.log(`   Book title: ${externalData.book?.title || 'N/A'}`);
        console.log(`   Content length: ${externalData.content?.length.toLocaleString() || 'N/A'}`);
        console.log(`   Word count: ${externalData.wordCount?.toLocaleString() || 'N/A'}`);
        console.log(`   Character count: ${externalData.characterCount?.toLocaleString() || 'N/A'}`);
        
        if (externalData.content) {
          console.log(`   First 150 chars: "${externalData.content.substring(0, 150)}..."`);
          
          // Check if content is truncated
          if (externalData.content.length < 500000) {
            console.log('⚠️  Content appears to be truncated! Expected >500k chars.');
          }
        }
      }
    } catch (error) {
      console.log(`❌ External API error: ${error.message}`);
    }
    
    // Step 2: Test the content-fast API
    console.log('\n📥 Step 2: Testing /api/books/gutenberg-2701/content-fast...');
    
    try {
      const contentFastResponse = await fetch(`${BASE_URL}/api/books/gutenberg-2701/content-fast`);
      
      if (!contentFastResponse.ok) {
        console.log(`❌ Content-fast API failed with status: ${contentFastResponse.status}`);
        const errorText = await contentFastResponse.text();
        console.log(`   Error: ${errorText.substring(0, 500)}...`);
      } else {
        const contentFastData = await contentFastResponse.json();
        console.log('✅ Content-fast API response:');
        console.log(`   Book ID: ${contentFastData.id || 'N/A'}`);
        console.log(`   Title: ${contentFastData.title || 'N/A'}`);
        console.log(`   Author: ${contentFastData.author || 'N/A'}`);
        console.log(`   Cached: ${contentFastData.cached || false}`);
        console.log(`   External: ${contentFastData.external || false}`);
        console.log(`   Source: ${contentFastData.source || 'N/A'}`);
        
        // Check context vs content properties
        const contextLength = contentFastData.context?.length || 0;
        const contentLength = contentFastData.content?.length || 0;
        
        console.log(`   Context length: ${contextLength.toLocaleString()}`);
        console.log(`   Content length: ${contentLength.toLocaleString()}`);
        console.log(`   Word count: ${contentFastData.wordCount?.toLocaleString() || 'N/A'}`);
        console.log(`   Character count: ${contentFastData.characterCount?.toLocaleString() || 'N/A'}`);
        
        const actualContent = contentFastData.context || contentFastData.content || '';
        if (actualContent) {
          console.log(`   Actual content length: ${actualContent.length.toLocaleString()}`);
          console.log(`   First 150 chars: "${actualContent.substring(0, 150)}..."`);
          
          // Test chunking simulation
          const chunkSize = 6000; // Browse experience
          const totalChunks = Math.ceil(actualContent.length / chunkSize);
          console.log(`   Expected chunks (6000 chars): ${totalChunks}`);
          
          if (actualContent.length < 500000) {
            console.log('❌ ISSUE FOUND: Content is severely truncated!');
            console.log(`   Expected: >1,000,000 chars, Got: ${actualContent.length.toLocaleString()} chars`);
          } else {
            console.log('✅ Content length looks correct');
          }
        } else {
          console.log('❌ No content or context found in response!');
        }
        
        // Show the full response structure (truncated)
        console.log('\n   Full response structure:');
        const responseKeys = Object.keys(contentFastData);
        responseKeys.forEach(key => {
          const value = contentFastData[key];
          if (typeof value === 'string' && value.length > 100) {
            console.log(`     ${key}: "${value.substring(0, 50)}..." (${value.length} chars)`);
          } else {
            console.log(`     ${key}: ${JSON.stringify(value)}`);
          }
        });
      }
    } catch (error) {
      console.log(`❌ Content-fast API error: ${error.message}`);
    }
    
    // Step 3: Test with query parameter to see if it makes a difference
    console.log('\n📥 Step 3: Testing content-fast with query parameter...');
    
    try {
      const queryResponse = await fetch(`${BASE_URL}/api/books/gutenberg-2701/content-fast?query=whale&maxWords=5000`);
      
      if (queryResponse.ok) {
        const queryData = await queryResponse.json();
        const queryContent = queryData.context || queryData.content || '';
        console.log(`✅ With query - content length: ${queryContent.length.toLocaleString()}`);
        
        if (queryContent.length < 10000) {
          console.log('✅ Query mode correctly limits content (as expected)');
        } else {
          console.log('⚠️  Query mode returned more content than expected');
        }
      } else {
        console.log(`❌ Query test failed with status: ${queryResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Query test error: ${error.message}`);
    }
    
    console.log('\n📊 ANALYSIS:');
    console.log('   If the external API returns full content but content-fast is truncated,');
    console.log('   then the issue is in the content-fast route logic.');
    console.log('   If both APIs return truncated content, the issue is in the external API.');
    console.log('   If both return full content but the frontend shows 4 chunks, the issue is in the frontend.');
    
  } catch (error) {
    console.error('❌ Critical error:', error.message);
  }
}

// Check if we're running a local dev server
console.log('⚠️  Note: This test requires the BookBridge dev server to be running locally.');
console.log('   If you see connection errors, make sure to run: npm run dev');
console.log('   Then run this script again.\n');

// Run the test
testBookBridgeAPIs();