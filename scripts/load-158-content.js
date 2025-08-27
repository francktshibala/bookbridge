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

async function loadEmmaContent() {
  const bookId = 'gutenberg-158';
  
  console.log('📚 Loading Emma by Jane Austen (gutenberg-158)...');
  
  try {
    // Check if content already exists
    const existing = await prisma.bookContent.findFirst({
      where: { bookId }
    });
    
    if (existing) {
      console.log('✅ Content already loaded');
      console.log('   Title:', existing.title);
      console.log('   Word count:', existing.wordCount);
      await prisma.$disconnect();
      return;
    }
    
    // Fetch from Project Gutenberg (use cache URL for reliability)
    const url = 'https://www.gutenberg.org/cache/epub/158/pg158.txt';
    console.log('📥 Fetching from:', url);
    
    const rawContent = await fetchBookContent(url);
    
    // Clean the content (remove Gutenberg header/footer)
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
    
    // Store in database
    await prisma.bookContent.create({
      data: {
        bookId,
        title: 'Emma',
        author: 'Jane Austen',
        fullText: cleanedContent,
        wordCount: wordCount,
        totalChunks: Math.ceil(wordCount / 400), // Estimate based on 400 words per chunk
        era: 'regency'
      }
    });
    
    console.log('✅ Emma content loaded successfully!');
    console.log('📊 Word count:', wordCount);
    console.log('📝 Preview:', cleanedContent.substring(0, 150) + '...');
    
  } catch (error) {
    console.error('❌ Error loading content:', error);
  } finally {
    await prisma.$disconnect();
  }
}

loadEmmaContent();