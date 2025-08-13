const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Era detection function (same as in simplify API)
const detectEra = (text) => {
  const sample = text.slice(0, 1000).toLowerCase();
  
  // Early Modern English (Shakespeare, 1500-1700)
  if (/\b(thou|thee|thy|thine|hath|doth|art)\b/.test(sample) || 
      /-(est|eth)\b/.test(sample) || 
      /\b(wherefore|whence|whither|prithee)\b/.test(sample)) {
    return 'early-modern';
  }
  
  // Victorian/19th century (1800-1900)
  if (/\b(whilst|shall|entailment|chaperone|governess)\b/.test(sample) || 
      /\b(drawing-room|morning-room|upon|herewith)\b/.test(sample)) {
    return 'victorian';
  }
  
  // American 19th century vernacular
  if (/\b(ain't|reckon|y'all|mighty|heap)\b/.test(sample) || 
      /\b(warn't|hain't|'bout|'nough)\b/.test(sample)) {
    return 'american-19c';
  }
  
  return 'modern';
};

// Chunk text into 400-word chunks
const chunkText = (text) => {
  const words = text.split(' ');
  const chunks = [];
  const wordsPerChunk = 400;
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }
  return chunks;
};

async function storePrideAndPrejudiceWithPrisma() {
  console.log('=== STORING PRIDE & PREJUDICE WITH PRISMA ===');
  
  const bookId = 'gutenberg-1342';
  
  try {
    // Step 1: Fetch full text from Project Gutenberg
    console.log('1. Fetching full text from Project Gutenberg...');
    const gutenbergUrl = 'https://www.gutenberg.org/files/1342/1342-0.txt';
    const response = await fetch(gutenbergUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Gutenberg: ${response.status}`);
    }
    
    let fullText = await response.text();
    
    // Clean up the text (remove Project Gutenberg headers/footers)
    const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
    const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';
    
    const startIndex = fullText.indexOf(startMarker);
    const endIndex = fullText.indexOf(endMarker);
    
    if (startIndex !== -1 && endIndex !== -1) {
      // Find the end of the start marker line
      const contentStart = fullText.indexOf('\n', startIndex) + 1;
      fullText = fullText.substring(contentStart, endIndex).trim();
    }
    
    // Clean up line endings and formatting
    fullText = fullText
      .replace(/\r\n/g, '\n')  // Convert Windows line endings
      .replace(/\r/g, '\n')    // Convert Mac line endings
      .replace(/\n\s*\n\s*\n/g, '\n\n')  // Reduce multiple blank lines
      .replace(/\[Illustration[^\]]*\]/g, '')  // Remove illustration markers
      .trim();
    
    // Find the actual start of Chapter 1 content (after table of contents)
    let chapterStart = fullText.search(/It is a truth universally acknowledged/);
    if (chapterStart === -1) {
      // Fallback to chapter heading
      chapterStart = fullText.search(/Chapter\s+I[^I]/);
    }
    if (chapterStart !== -1) {
      fullText = fullText.substring(chapterStart).trim();
      console.log(`✅ Found novel start, trimmed to actual content`);
    }
    
    console.log(`✅ Fetched text: ${fullText.length} characters`);
    
    // Step 2: Detect era
    const detectedEra = detectEra(fullText);
    console.log(`✅ Detected era: ${detectedEra}`);
    
    // Step 3: Chunk text
    const chunks = chunkText(fullText);
    console.log(`✅ Created ${chunks.length} chunks`);
    
    // Step 4: Store in book_content table using Prisma
    console.log('2. Storing full content with Prisma...');
    
    // Check if book content already exists
    const existingContent = await prisma.bookContent.findUnique({
      where: { bookId: bookId }
    });
    
    let bookContent;
    if (existingContent) {
      // Update existing
      bookContent = await prisma.bookContent.update({
        where: { bookId: bookId },
        data: {
          title: 'Pride and Prejudice',
          author: 'Jane Austen',
          fullText: fullText,
          wordCount: fullText.split(' ').length,
          era: detectedEra,
          totalChunks: chunks.length
        }
      });
      console.log('✅ Updated existing book content');
    } else {
      // Create new
      bookContent = await prisma.bookContent.create({
        data: {
          bookId: bookId,
          title: 'Pride and Prejudice',
          author: 'Jane Austen',
          fullText: fullText,
          wordCount: fullText.split(' ').length,
          era: detectedEra,
          totalChunks: chunks.length
        }
      });
      console.log('✅ Created new book content');
    }
    
    // Step 5: Store chunks
    console.log('3. Storing chunks with Prisma...');
    
    // Delete existing chunks
    await prisma.bookChunk.deleteMany({
      where: { bookId: bookId }
    });
    
    // Insert new chunks in batches
    const batchSize = 100;
    let totalInserted = 0;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const chunkData = batch.map((chunk, index) => ({
        bookId: bookId,
        cefrLevel: 'original', // Store as original text
        chunkIndex: i + index,
        chunkText: chunk,
        wordCount: chunk.split(' ').length,
        isSimplified: false
      }));
      
      await prisma.bookChunk.createMany({
        data: chunkData
      });
      
      totalInserted += chunkData.length;
      console.log(`  Inserted batch ${Math.floor(i/batchSize) + 1}: ${chunkData.length} chunks`);
    }
    
    console.log(`✅ Stored ${totalInserted} chunks total`);
    
    // Step 6: Verify storage
    console.log('4. Verifying storage...');
    const storedContent = await prisma.bookContent.findUnique({
      where: { bookId: bookId },
      include: {
        _count: {
          select: { chunks: true }
        }
      }
    });
    
    console.log('\n🎉 STORAGE COMPLETE - PRIDE & PREJUDICE');
    console.log(`📚 Book: ${storedContent.title} by ${storedContent.author}`);
    console.log(`📄 Content: ${storedContent.fullText.length} characters, ${storedContent.wordCount} words`);
    console.log(`🔢 Chunks: ${storedContent._count.chunks} stored (expected: ${storedContent.totalChunks})`);
    console.log(`🏛️ Era: ${storedContent.era}`);
    console.log(`📋 Book ID: ${storedContent.bookId}`);
    
    return true;
    
  } catch (error) {
    console.error('Error storing Pride & Prejudice:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
storePrideAndPrejudiceWithPrisma();