#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const https = require('https');

const prisma = new PrismaClient();

async function fetchBookContent(url) {
  return new Promise((resolve, reject) => {
    let data = '';
    https.get(url, (res) => {
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function loadBook844Content() {
  const bookId = 'gutenberg-844';
  
  console.log('📚 Loading content for gutenberg-844...');
  
  try {
    // Check if content already exists
    const existing = await prisma.bookContent.findFirst({
      where: { bookId }
    });
    
    if (existing) {
      console.log('✅ Content already loaded');
      return;
    }
    
    // Fetch from Project Gutenberg
    const url = 'https://www.gutenberg.org/ebooks/844.txt.utf-8';
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
        title: 'The Mysterious Affair at Styles', // Agatha Christie
        author: 'Agatha Christie',
        fullText: cleanedContent,
        wordCount: wordCount,
        totalChunks: 0,
        era: 'modern'
      }
    });
    
    console.log('✅ Content loaded successfully');
    console.log('📊 Word count:', wordCount);
    
  } catch (error) {
    console.error('❌ Error loading content:', error);
  } finally {
    await prisma.$disconnect();
  }
}

loadBook844Content();