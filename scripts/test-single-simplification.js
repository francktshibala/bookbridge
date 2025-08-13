const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSingleSimplification() {
  console.log('=== TESTING SINGLE SIMPLIFICATION API CALL ===');
  
  try {
    const bookId = 'gutenberg-1342';
    const level = 'A1';
    const chunkIndex = 0;
    
    console.log(`Testing: ${bookId}, level: ${level}, chunk: ${chunkIndex}`);
    
    const apiUrl = `http://localhost:3003/api/books/${bookId}/simplify?level=${level}&chunk=${chunkIndex}&ai=true`;
    console.log(`API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Error response body: ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log('\n📊 API Response:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Source: ${result.source}`);
    console.log(`  Level: ${result.level}`);
    console.log(`  Chunk Index: ${result.chunkIndex}`);
    
    if (result.aiMetadata) {
      console.log(`  AI Quality: ${result.aiMetadata.quality}`);
      console.log(`  AI Similarity: ${result.aiMetadata.similarity}`);
      console.log(`  AI Era: ${result.aiMetadata.detectedEra}`);
    }
    
    if (result.content) {
      console.log(`  Content length: ${result.content.length} characters`);
      console.log(`  Content preview: ${result.content.substring(0, 100)}...`);
    }

    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }

    if (result.microHint) {
      console.log(`  Micro hint: ${result.microHint}`);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSingleSimplification();