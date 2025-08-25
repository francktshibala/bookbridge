#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { gutenbergAPI } from '../lib/book-sources/gutenberg-api';
import { contentChunker } from '../lib/content-chunker';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function loadGutenberg1952Content() {
  console.log('📚 Loading The Yellow Wallpaper (gutenberg-1952) content...\n');
  
  try {
    // Step 1: Fetch book metadata and content from Project Gutenberg
    console.log('🌐 Fetching book from Project Gutenberg API...');
    const bookInfo = await gutenbergAPI.getBook(1952);
    
    if (!bookInfo) {
      throw new Error('Could not fetch book information from Gutenberg API');
    }
    
    console.log(`📖 Found: "${bookInfo.title}" by ${bookInfo.authors.map(a => a.name).join(', ')}`);
    
    // Step 2: Download the full text
    console.log('📥 Downloading full text...');
    const downloadUrl = 'https://www.gutenberg.org/ebooks/1952.txt.utf-8';
    const fullText = await gutenbergAPI.fetchBookContent(downloadUrl);
    
    console.log(`📄 Downloaded ${fullText.length.toLocaleString()} characters`);
    
    // Step 3: Clean and process the text
    console.log('🧹 Cleaning and processing text...');
    
    // Remove Project Gutenberg header/footer
    let cleanText = fullText;
    
    // Remove header (everything before the actual story starts)
    const startMarkers = [
      'THE YELLOW WALLPAPER',
      'The Yellow Wallpaper',
      'Yellow Wallpaper',
      'It is very seldom that mere ordinary people like John and myself secure ancestral halls'
    ];
    
    let startIndex = -1;
    for (const marker of startMarkers) {
      const index = cleanText.indexOf(marker);
      if (index !== -1) {
        startIndex = index;
        break;
      }
    }
    
    if (startIndex !== -1) {
      cleanText = cleanText.substring(startIndex);
    }
    
    // Remove footer (everything after "*** END OF")
    const endMarker = '*** END OF';
    const endIndex = cleanText.indexOf(endMarker);
    if (endIndex !== -1) {
      cleanText = cleanText.substring(0, endIndex);
    }
    
    // Basic text cleanup
    cleanText = cleanText
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // Calculate word count
    const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;
    console.log(`📊 Processed text: ${wordCount.toLocaleString()} words`);
    
    // Step 4: Create chunks for processing
    console.log('🧩 Creating content chunks...');
    // The Yellow Wallpaper is shorter, so we need smaller chunks to match the 14 existing simplifications
    const targetChunks = 14;
    const chunkSize = Math.ceil(wordCount / targetChunks);
    console.log(`📏 Targeting ${targetChunks} chunks with ~${chunkSize} words each`);
    
    const chunks = contentChunker.chunk('gutenberg-1952', cleanText, undefined, {
      maxChunkSize: 500, // Much smaller chunks to force 14 chunks
      overlapSize: 50, // Smaller overlap for shorter text
      preserveSentences: true
    });
    
    console.log(`📦 Created ${chunks.length} chunks`);
    
    // Step 5: Insert into BookContent table
    console.log('💾 Saving to BookContent table...');
    
    const bookContentData = {
      bookId: 'gutenberg-1952',
      title: bookInfo.title,
      author: bookInfo.authors.map(a => a.name).join(', '),
      fullText: cleanText,
      era: 'gilded_age', // The Yellow Wallpaper was published in 1892
      wordCount: wordCount,
      totalChunks: chunks.length
    };
    
    // Check if already exists
    const existingContent = await prisma.bookContent.findFirst({
      where: { bookId: 'gutenberg-1952' }
    });
    
    let bookContent;
    if (existingContent) {
      console.log('🔄 Updating existing BookContent entry...');
      bookContent = await prisma.bookContent.update({
        where: { bookId: 'gutenberg-1952' },
        data: bookContentData
      });
    } else {
      console.log('➕ Creating new BookContent entry...');
      bookContent = await prisma.bookContent.create({
        data: bookContentData
      });
    }
    
    // Step 6: Create original chunks in BookChunk table
    console.log('📋 Creating original text chunks...');
    
    // First, delete any existing original chunks
    await prisma.bookChunk.deleteMany({
      where: { 
        bookId: 'gutenberg-1952',
        cefrLevel: 'original'
      }
    });
    
    // Insert original chunks
    const originalChunks = chunks.map((chunk, index) => ({
      bookId: 'gutenberg-1952',
      cefrLevel: 'original',
      chunkIndex: index,
      chunkText: chunk.content,
      wordCount: chunk.wordCount,
      isSimplified: false
    }));
    
    await prisma.bookChunk.createMany({
      data: originalChunks
    });
    
    console.log(`✅ Created ${originalChunks.length} original text chunks`);
    
    // Step 7: Copy existing simplifications to BookChunk table
    console.log('📚 Copying existing simplifications to BookChunk table...');
    
    const simplifications = await prisma.bookSimplification.findMany({
      where: { bookId: 'gutenberg-1952' },
      select: {
        targetLevel: true,
        chunkIndex: true,
        simplifiedText: true
      }
    });
    
    console.log(`🔄 Found ${simplifications.length} simplifications to copy`);
    
    // Group by CEFR level and process each level
    const byLevel = simplifications.reduce((acc, item) => {
      if (!acc[item.targetLevel]) acc[item.targetLevel] = [];
      acc[item.targetLevel].push(item);
      return acc;
    }, {} as Record<string, typeof simplifications>);
    
    for (const [level, items] of Object.entries(byLevel)) {
      console.log(`   📝 Processing ${level} level (${items.length} chunks)...`);
      
      // Delete existing chunks for this level
      await prisma.bookChunk.deleteMany({
        where: { 
          bookId: 'gutenberg-1952',
          cefrLevel: level
        }
      });
      
      // Insert simplified chunks
      const simplifiedChunks = items.map(item => ({
        bookId: 'gutenberg-1952',
        cefrLevel: item.targetLevel,
        chunkIndex: item.chunkIndex,
        chunkText: item.simplifiedText,
        wordCount: item.simplifiedText.split(/\s+/).filter(w => w.length > 0).length,
        isSimplified: true
      }));
      
      await prisma.bookChunk.createMany({
        data: simplifiedChunks
      });
      
      console.log(`   ✅ Created ${simplifiedChunks.length} chunks for ${level} level`);
    }
    
    console.log('\n🎉 SUCCESS! The Yellow Wallpaper content loaded successfully');
    console.log('📊 Summary:');
    console.log(`   📖 Title: ${bookContent.title}`);
    console.log(`   ✍️  Author: ${bookContent.author}`);
    console.log(`   📄 Word count: ${bookContent.wordCount.toLocaleString()}`);
    console.log(`   🧩 Total chunks: ${bookContent.totalChunks}`);
    console.log(`   📚 CEFR levels: ${Object.keys(byLevel).sort().join(', ')}, original`);
    console.log('\n✅ The book is now ready for audio generation!');
    
  } catch (error) {
    console.error('❌ Error loading gutenberg-1952 content:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  loadGutenberg1952Content().catch(console.error);
}