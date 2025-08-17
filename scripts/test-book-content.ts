#!/usr/bin/env node

// Simple test script to verify book content extraction works
// Run with: npx ts-node scripts/test-book-content.ts

import { contentExtractor } from '../lib/content-extractor';
import { contentChunker } from '../lib/content-chunker';
import fs from 'fs';
import path from 'path';

async function testContentExtraction() {
  console.log('Testing Book Content Extraction System\n');
  
  // Test 1: Text file extraction
  console.log('1. Testing text file extraction...');
  const testText = `Chapter 1: Introduction

This is a test book about technology and society. In this chapter, we will explore the fundamental concepts that shape our understanding of the digital world.

The rapid advancement of technology has transformed nearly every aspect of human life. From communication to commerce, education to entertainment, digital innovation continues to reshape our daily experiences.

Chapter 2: The Digital Revolution

The digital revolution began in the mid-20th century with the invention of the transistor. This breakthrough led to the development of computers, which have become increasingly powerful and ubiquitous.

Today, we carry more computing power in our smartphones than was available to NASA during the Apollo missions. This exponential growth in processing capability has enabled innovations that were once the stuff of science fiction.`;

  const textBuffer = Buffer.from(testText, 'utf-8');
  
  try {
    const extracted = await contentExtractor.extract(textBuffer, 'txt');
    console.log('✓ Text extraction successful');
    console.log(`  - Word count: ${extracted.metadata?.wordCount}`);
    console.log(`  - Language: ${extracted.metadata?.language}`);
    console.log(`  - Content length: ${extracted.text.length} characters\n`);
  } catch (error) {
    console.error('✗ Text extraction failed:', error);
  }
  
  // Test 2: Content chunking
  console.log('2. Testing content chunking...');
  const bookId = 'test-book-123';
  
  try {
    const chunks = contentChunker.chunk(bookId, testText, undefined, {
      maxChunkSize: 50,
      overlapSize: 10,
      preserveSentences: true
    });
    
    console.log('✓ Content chunking successful');
    console.log(`  - Total chunks created: ${chunks.length}`);
    console.log(`  - First chunk word count: ${chunks[0]?.wordCount}`);
    console.log(`  - Last chunk word count: ${chunks[chunks.length - 1]?.wordCount}\n`);
  } catch (error) {
    console.error('✗ Content chunking failed:', error);
  }
  
  // Test 3: Relevant chunk finding
  console.log('3. Testing relevant chunk finding...');
  const query = 'digital revolution transistor';
  
  try {
    const chunks = contentChunker.chunk(bookId, testText, undefined, {
      maxChunkSize: 100,
      overlapSize: 20
    });
    
    const relevantChunks = contentChunker.findRelevantChunks(chunks, query, 3);
    
    console.log('✓ Relevant chunk finding successful');
    console.log(`  - Query: "${query}"`);
    console.log(`  - Found ${relevantChunks.length} relevant chunks`);
    if (relevantChunks.length > 0) {
      console.log(`  - Most relevant chunk: "${relevantChunks[0].content.substring(0, 100)}..."`);
    }
    
    // Create context for AI
    const context = contentChunker.createContextFromChunks(relevantChunks, 500);
    console.log(`  - AI context created: ${context.length} characters\n`);
  } catch (error) {
    console.error('✗ Relevant chunk finding failed:', error);
  }
  
  console.log('Test completed!');
}

// Run the test
testContentExtraction().catch(console.error);