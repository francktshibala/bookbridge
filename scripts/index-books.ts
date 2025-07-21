#!/usr/bin/env node

// Script to index existing books into the vector database
// Run with: npx ts-node scripts/index-books.ts

import { prisma } from '../lib/prisma';
import { contentExtractor } from '../lib/content-extractor';
import { enhancedContentChunker } from '../lib/content-chunker-enhanced';
import { vectorService } from '../lib/vector/vector-service';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function indexBooks() {
  console.log('Starting book indexing process...');
  
  // Check if required environment variables are set
  if (!process.env.OPENAI_API_KEY) {
    console.warn('Warning: OPENAI_API_KEY not set. Vector search will not be available.');
    console.log('To enable vector search, set OPENAI_API_KEY in your .env.local file');
  }
  
  if (!process.env.PINECONE_API_KEY) {
    console.warn('Warning: PINECONE_API_KEY not set. Vector search will not be available.');
    console.log('To enable vector search:');
    console.log('1. Sign up for free at https://www.pinecone.io/');
    console.log('2. Create an API key');
    console.log('3. Add PINECONE_API_KEY to your .env.local file');
  }
  
  if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
    console.log('\nVector search disabled. The app will use keyword search as fallback.');
    return;
  }
  
  try {
    // Get all books
    const books = await prisma.book.findMany({
      select: {
        id: true,
        title: true,
        author: true,
        filename: true,
      },
    });
    
    console.log(`Found ${books.length} books to index`);
    
    // Create Supabase client for storage access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    for (const book of books) {
      console.log(`\nProcessing: ${book.title} by ${book.author}`);
      
      try {
        // Check if already indexed
        const isIndexed = await vectorService.isBookIndexed(book.id);
        if (isIndexed) {
          console.log('Already indexed, skipping...');
          continue;
        }
        
        if (!book.filename) {
          console.log('No file associated, skipping...');
          continue;
        }
        
        // Download file
        console.log('Downloading file...');
        const { data: fileData, error } = await supabase.storage
          .from('book-files')
          .download(book.filename);
          
        if (error || !fileData) {
          console.error('Error downloading file:', error);
          continue;
        }
        
        // Extract content
        console.log('Extracting content...');
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileType = book.filename.split('.').pop()?.toLowerCase() || 'txt';
        const extractedContent = await contentExtractor.extract(buffer, fileType);
        
        // Chunk and index
        console.log('Creating chunks and indexing...');
        await enhancedContentChunker.chunkAndIndex(
          book.id,
          extractedContent.text,
          extractedContent.chapters
        );
        
        console.log('Successfully indexed!');
      } catch (error) {
        console.error(`Error processing book ${book.id}:`, error);
      }
    }
    
    console.log('\nIndexing complete!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the indexing
indexBooks().catch(console.error);