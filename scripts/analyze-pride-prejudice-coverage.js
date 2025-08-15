const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzePridePrejudiceCoverage() {
  console.log('=== ANALYZING PRIDE & PREJUDICE SIMPLIFICATION COVERAGE ===');
  
  const bookId = 'gutenberg-1342';
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  
  try {
    // Get book content info
    const bookContent = await prisma.bookContent.findUnique({
      where: { bookId: bookId }
    });

    if (!bookContent) {
      console.log('❌ Pride & Prejudice not found in database');
      return;
    }

    console.log(`📚 Book: ${bookContent.title} by ${bookContent.author}`);
    console.log(`📄 Content: ${bookContent.wordCount} words, ${bookContent.totalChunks} chunks`);
    console.log(`🏛️ Era: ${bookContent.era}`);

    // Calculate expected chunks per level (400 words each)
    const expectedChunks = bookContent.totalChunks;
    console.log(`📊 Expected chunks per CEFR level: ${expectedChunks}`);

    // Check original chunks
    const originalChunks = await prisma.bookChunk.count({
      where: {
        bookId: bookId,
        cefrLevel: 'original'
      }
    });

    console.log(`\n📦 Original chunks stored: ${originalChunks}/${expectedChunks} (${Math.round((originalChunks/expectedChunks)*100)}%)`);

    // Analyze each CEFR level
    console.log('\n📊 CEFR Level Analysis:');
    const coverageReport = {};

    for (const level of levels) {
      // Count simplifications from book_simplifications table
      const simplifications = await prisma.bookSimplification.count({
        where: {
          bookId: bookId,
          targetLevel: level
        }
      });

      // Count chunks from book_chunks table
      const chunks = await prisma.bookChunk.count({
        where: {
          bookId: bookId,
          cefrLevel: level,
          isSimplified: true
        }
      });

      const coverage = Math.round((simplifications / expectedChunks) * 100);
      
      coverageReport[level] = {
        simplifications,
        chunks,
        coverage,
        complete: simplifications >= expectedChunks
      };

      const status = simplifications >= expectedChunks ? '✅' : '❌';
      console.log(`  ${level}: ${status} ${simplifications}/${expectedChunks} (${coverage}%) - ${chunks} chunks stored`);
    }

    // Identify gaps
    console.log('\n🔍 Coverage Gaps:');
    const incompletelevels = levels.filter(level => !coverageReport[level].complete);
    
    if (incompletelevels.length === 0) {
      console.log('  🎉 ALL LEVELS COMPLETE! Perfect coverage across all CEFR levels');
    } else {
      console.log(`  📋 Incomplete levels: ${incompletelevels.join(', ')}`);
      
      for (const level of incompletelevels) {
        const needed = expectedChunks - coverageReport[level].simplifications;
        console.log(`    ${level}: Need ${needed} more simplifications`);
      }
    }

    // Check for any real-time processing indicators
    console.log('\n🔍 Real-time Processing Analysis:');
    
    // Look for chunks with very recent timestamps (indicating real-time generation)
    const recentSimplifications = await prisma.bookSimplification.findMany({
      where: {
        bookId: bookId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        targetLevel: true,
        chunkIndex: true,
        createdAt: true,
        qualityScore: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    if (recentSimplifications.length > 0) {
      console.log(`  ⚡ ${recentSimplifications.length} recent simplifications found (last 24h):`);
      recentSimplifications.forEach(s => {
        const timeAgo = Math.round((Date.now() - new Date(s.createdAt).getTime()) / (1000 * 60));
        console.log(`    ${s.targetLevel} chunk ${s.chunkIndex}: ${timeAgo}min ago (quality: ${s.qualityScore || 'unknown'})`);
      });
    } else {
      console.log('  ✅ No recent real-time generation detected');
    }

    // Summary and recommendations
    console.log('\n📋 RECOMMENDATIONS:');
    
    const totalSimplifications = Object.values(coverageReport).reduce((sum, level) => sum + level.simplifications, 0);
    const totalExpected = expectedChunks * levels.length;
    const overallCoverage = Math.round((totalSimplifications / totalExpected) * 100);
    
    console.log(`📊 Overall coverage: ${totalSimplifications}/${totalExpected} (${overallCoverage}%)`);
    
    if (overallCoverage >= 95) {
      console.log('🎉 EXCELLENT: Nearly complete coverage - ready for instant switching!');
      console.log('💡 Next step: Test all 6 CEFR levels for instant switching');
    } else if (overallCoverage >= 75) {
      console.log('👍 GOOD: Substantial coverage exists');
      console.log('💡 Next step: Fill remaining gaps for complete instant switching');
    } else {
      console.log('⚠️  NEEDS WORK: Significant gaps in precomputed simplifications');
      console.log('💡 Next step: Generate missing simplifications for incomplete levels');
    }

    return coverageReport;

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePridePrejudiceCoverage();