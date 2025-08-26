const { PrismaClient } = require('@prisma/client');
const https = require('https');

const prisma = new PrismaClient();

async function loadGatsbyContent() {
  const bookId = 'gutenberg-64317';
  const gutenbergUrl = 'https://www.gutenberg.org/files/64317/64317-0.txt';
  
  console.log('🚀 Loading content for The Great Gatsby...');
  console.log('📁 Source:', gutenbergUrl);
  
  try {
    // Check if content already exists
    const existingContent = await prisma.bookContent.findFirst({
      where: { bookId }
    });
    
    if (existingContent) {
      console.log('✅ Content already loaded for', bookId);
      return;
    }
    
    // Fetch content from Gutenberg
    console.log('📥 Downloading content from Project Gutenberg...');
    const content = await fetchContent(gutenbergUrl);
    
    if (!content || content.length < 1000) {
      throw new Error('Content too short or empty - possible download failure');
    }
    
    // Clean the content (remove Gutenberg headers/footers)
    const cleanedContent = cleanGutenbergText(content);
    
    // Update book metadata
    await prisma.book.update({
      where: { id: bookId },
      data: {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        publicDomain: true,
        publishYear: 1925,
        genre: 'Fiction',
        language: 'English'
      }
    });
    
    // Store content in database
    const wordCount = cleanedContent.split(/\s+/).length;
    
    await prisma.bookContent.create({
      data: {
        bookId,
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        fullText: cleanedContent,
        wordCount: wordCount,
        totalChunks: 0, // Will be updated when chunks are generated
        era: 'modern' // The Great Gatsby is from the 1920s
      }
    });
    
    console.log('✅ Content loaded successfully!');
    console.log('📊 Content length:', cleanedContent.length, 'characters');
    console.log('🎯 Book ready for audio generation');
    
  } catch (error) {
    console.error('❌ Error loading content:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function fetchContent(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve(data);
      });
      
    }).on('error', (error) => {
      reject(error);
    });
  });
}

function cleanGutenbergText(content) {
  // Remove Project Gutenberg header and footer
  let cleaned = content;
  
  // Find start of actual content (after "*** START OF")
  const startMatch = cleaned.match(/\*\*\*\s*START OF (?:THE |THIS )?PROJECT GUTENBERG.*?\*\*\*/i);
  if (startMatch) {
    cleaned = cleaned.substring(startMatch.index + startMatch[0].length);
  }
  
  // Find end of actual content (before "*** END OF")
  const endMatch = cleaned.match(/\*\*\*\s*END OF (?:THE |THIS )?PROJECT GUTENBERG.*?\*\*\*/i);
  if (endMatch) {
    cleaned = cleaned.substring(0, endMatch.index);
  }
  
  // Clean up extra whitespace and normalize line breaks
  cleaned = cleaned
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return cleaned;
}

// Run the function
if (require.main === module) {
  loadGatsbyContent()
    .then(() => {
      console.log('🎉 Content loading complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Content loading failed:', error);
      process.exit(1);
    });
}

module.exports = { loadGatsbyContent };