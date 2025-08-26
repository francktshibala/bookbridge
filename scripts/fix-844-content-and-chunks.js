#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const https = require('https');

const prisma = new PrismaClient();

async function fetchBookContent(url) {
  return new Promise((resolve, reject) => {
    let data = '';
    https.get(url, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, (res2) => {
          res2.on('data', chunk => data += chunk);
          res2.on('end', () => resolve(data));
        }).on('error', reject);
      } else {
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }
    }).on('error', reject);
  });
}

async function fixBook844() {
  console.log('🔧 FIXING GUTENBERG-844 ISSUES...\n');
  
  try {
    // Step 1: Delete bad content
    console.log('1️⃣ Deleting bad content...');
    await prisma.bookContent.deleteMany({
      where: { bookId: 'gutenberg-844' }
    });
    
    // Step 2: Fetch correct content (use direct cache URL)
    console.log('2️⃣ Fetching correct content from Gutenberg...');
    const url = 'https://www.gutenberg.org/cache/epub/844/pg844.txt';
    const rawContent = await fetchBookContent(url);
    
    // Clean the content
    const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
    const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';
    
    const startIndex = rawContent.indexOf(startMarker);
    const endIndex = rawContent.indexOf(endMarker);
    
    let cleanedContent = rawContent;
    if (startIndex !== -1 && endIndex !== -1) {
      cleanedContent = rawContent.substring(
        rawContent.indexOf('\n', startIndex) + 1,
        endIndex
      ).trim();
    }
    
    const wordCount = cleanedContent.split(/\s+/).length;
    console.log('   ✅ Got full text:', wordCount, 'words');
    console.log('   Preview:', cleanedContent.substring(0, 100) + '...');
    
    // Step 3: Store correct content
    await prisma.bookContent.create({
      data: {
        bookId: 'gutenberg-844',
        title: 'The Importance of Being Earnest',
        author: 'Oscar Wilde',
        fullText: cleanedContent,
        wordCount: wordCount,
        totalChunks: 45, // Based on your data
        era: 'victorian'
      }
    });
    console.log('   ✅ Content saved to database');
    
    // Step 4: Fix chunk indexes (reindex to start from 0)
    console.log('\n3️⃣ Fixing chunk indexes to start from 0...');
    
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    
    for (const level of levels) {
      const chunks = await prisma.bookChunk.findMany({
        where: { bookId: 'gutenberg-844', cefrLevel: level },
        orderBy: { chunkIndex: 'asc' }
      });
      
      console.log(`   Fixing ${level}: ${chunks.length} chunks`);
      
      // Update each chunk with new sequential index starting from 0
      for (let i = 0; i < chunks.length; i++) {
        await prisma.bookChunk.update({
          where: { id: chunks[i].id },
          data: { chunkIndex: i }
        });
      }
    }
    
    console.log('\n✅ ALL FIXES COMPLETE!');
    console.log('   - Content: Full text loaded (' + wordCount + ' words)');
    console.log('   - Chunks: Reindexed to start from 0');
    console.log('\n🎯 Now ready to generate audio!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBook844();