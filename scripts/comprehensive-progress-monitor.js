/**
 * Comprehensive Progress Monitor for 33,840+ Simplification Processing
 * 
 * Features:
 * - Real-time progress tracking across all 20 books
 * - Gap detection and coverage analysis
 * - Processing speed monitoring
 * - Quality distribution analysis
 * - Era-based performance metrics
 * - Resume capability assessment
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Complete book collection (same as processor)
const COMPLETE_BOOK_COLLECTION = [
  { id: 'gutenberg-1342', title: 'Pride and Prejudice', author: 'Jane Austen', era: 'victorian' },
  { id: 'gutenberg-11', title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll', era: 'victorian' },
  { id: 'gutenberg-84', title: 'Frankenstein', author: 'Mary Shelley', era: 'victorian' },
  { id: 'gutenberg-514', title: 'Little Women', author: 'Louisa May Alcott', era: 'american-19c' },
  { id: 'gutenberg-1513', title: 'Romeo and Juliet', author: 'William Shakespeare', era: 'early-modern' },
  { id: 'gutenberg-74', title: 'The Adventures of Tom Sawyer', author: 'Mark Twain', era: 'american-19c' },
  { id: 'gutenberg-76', title: 'The Adventures of Huckleberry Finn', author: 'Mark Twain', era: 'american-19c' },
  { id: 'gutenberg-2701', title: 'Moby Dick', author: 'Herman Melville', era: 'american-19c' },
  { id: 'gutenberg-1661', title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', era: 'victorian' },
  { id: 'gutenberg-43', title: 'Dr. Jekyll and Mr. Hyde', author: 'Robert Louis Stevenson', era: 'victorian' },
  { id: 'gutenberg-174', title: 'The Picture of Dorian Gray', author: 'Oscar Wilde', era: 'victorian' },
  { id: 'gutenberg-55', title: 'The Wonderful Wizard of Oz', author: 'L. Frank Baum', era: 'modern' },
  { id: 'gutenberg-35', title: 'The Time Machine', author: 'H. G. Wells', era: 'modern' },
  { id: 'gutenberg-36', title: 'The War of the Worlds', author: 'H. G. Wells', era: 'modern' },
  { id: 'gutenberg-145', title: 'Middlemarch', author: 'George Eliot', era: 'victorian' },
  { id: 'gutenberg-2641', title: 'A Room with a View', author: 'E. M. Forster', era: 'modern' },
  { id: 'gutenberg-394', title: 'Cranford', author: 'Elizabeth Gaskell', era: 'victorian' },
  { id: 'gutenberg-205', title: 'Walden', author: 'Henry David Thoreau', era: 'american-19c' },
  { id: 'gutenberg-16389', title: 'The Enchanted April', author: 'Elizabeth von Arnim', era: 'modern' },
  { id: 'gutenberg-100', title: 'The Complete Works of Shakespeare', author: 'William Shakespeare', era: 'early-modern' }
];

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

class ComprehensiveProgressMonitor {
  
  async generateFullReport() {
    console.log('📊 COMPREHENSIVE PROGRESS REPORT - 20-BOOK SIMPLIFICATION PROJECT');
    console.log('=' .repeat(80));
    
    const report = {
      timestamp: new Date().toISOString(),
      bookStorage: await this.analyzeBookStorage(),
      simplificationCoverage: await this.analyzeSimplificationCoverage(),
      qualityMetrics: await this.analyzeQualityMetrics(),
      eraPerformance: await this.analyzeEraPerformance(),
      processingSpeed: await this.analyzeProcessingSpeed(),
      gaps: await this.detectAllGaps(),
      recommendations: []
    };

    // Print detailed report
    this.printBookStorageReport(report.bookStorage);
    this.printCoverageReport(report.simplificationCoverage);
    this.printQualityReport(report.qualityMetrics);
    this.printEraReport(report.eraPerformance);
    this.printSpeedReport(report.processingSpeed);
    this.printGapReport(report.gaps);
    
    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);
    this.printRecommendations(report.recommendations);

    return report;
  }

  async analyzeBookStorage() {
    console.log('\n📚 BOOK STORAGE ANALYSIS');
    console.log('-'.repeat(40));

    const storedBooks = await prisma.bookContent.findMany({
      select: {
        bookId: true,
        title: true,
        author: true,
        era: true,
        wordCount: true,
        totalChunks: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const storageByEra = this.groupBy(storedBooks, 'era');
    const collectionByEra = this.groupBy(COMPLETE_BOOK_COLLECTION, 'era');

    const analysis = {
      totalStored: storedBooks.length,
      totalTarget: COMPLETE_BOOK_COLLECTION.length,
      completionRate: (storedBooks.length / COMPLETE_BOOK_COLLECTION.length) * 100,
      byEra: {},
      recentActivity: storedBooks.slice(0, 5),
      totalChunks: storedBooks.reduce((sum, book) => sum + book.totalChunks, 0),
      totalWords: storedBooks.reduce((sum, book) => sum + book.wordCount, 0)
    };

    // Analyze by era
    for (const era of ['early-modern', 'victorian', 'american-19c', 'modern']) {
      const stored = storageByEra[era] || [];
      const target = collectionByEra[era] || [];
      
      analysis.byEra[era] = {
        stored: stored.length,
        target: target.length,
        completionRate: target.length > 0 ? (stored.length / target.length) * 100 : 0,
        books: stored.map(b => ({ title: b.title, chunks: b.totalChunks }))
      };
    }

    return analysis;
  }

  async analyzeSimplificationCoverage() {
    console.log('\n📝 SIMPLIFICATION COVERAGE ANALYSIS');
    console.log('-'.repeat(40));

    // Get all simplifications with book info
    const simplifications = await prisma.bookSimplification.findMany({
      select: {
        bookId: true,
        targetLevel: true,
        qualityScore: true,
        createdAt: true
      }
    });

    // Get book content info
    const bookContents = await prisma.bookContent.findMany({
      select: {
        bookId: true,
        title: true,
        era: true,
        totalChunks: true
      }
    });

    const analysis = {
      totalSimplifications: simplifications.length,
      targetSimplifications: 0,
      completionRate: 0,
      byLevel: {},
      byEra: {},
      byBook: {},
      recentActivity: {
        last24h: 0,
        last7days: 0,
        last30days: 0
      }
    };

    // Calculate target simplifications
    analysis.targetSimplifications = bookContents.reduce((sum, book) => sum + (book.totalChunks * 6), 0);
    analysis.completionRate = analysis.targetSimplifications > 0 ? 
      (analysis.totalSimplifications / analysis.targetSimplifications) * 100 : 0;

    // Analyze by CEFR level
    for (const level of CEFR_LEVELS) {
      const levelSimplifications = simplifications.filter(s => s.targetLevel === level);
      const levelTarget = bookContents.reduce((sum, book) => sum + book.totalChunks, 0);
      
      analysis.byLevel[level] = {
        count: levelSimplifications.length,
        target: levelTarget,
        completionRate: levelTarget > 0 ? (levelSimplifications.length / levelTarget) * 100 : 0
      };
    }

    // Analyze by era
    for (const book of bookContents) {
      const bookSimplifications = simplifications.filter(s => s.bookId === book.bookId);
      const expectedPerBook = book.totalChunks * 6;
      
      if (!analysis.byEra[book.era]) {
        analysis.byEra[book.era] = { count: 0, target: 0, books: [] };
      }
      
      analysis.byEra[book.era].count += bookSimplifications.length;
      analysis.byEra[book.era].target += expectedPerBook;
      analysis.byEra[book.era].books.push({
        title: book.title,
        simplifications: bookSimplifications.length,
        target: expectedPerBook,
        completionRate: expectedPerBook > 0 ? (bookSimplifications.length / expectedPerBook) * 100 : 0
      });

      // Per-book analysis
      analysis.byBook[book.bookId] = {
        title: book.title,
        era: book.era,
        simplifications: bookSimplifications.length,
        target: expectedPerBook,
        completionRate: expectedPerBook > 0 ? (bookSimplifications.length / expectedPerBook) * 100 : 0,
        byLevel: {}
      };

      // Per-book per-level analysis
      for (const level of CEFR_LEVELS) {
        const levelCount = bookSimplifications.filter(s => s.targetLevel === level).length;
        analysis.byBook[book.bookId].byLevel[level] = {
          count: levelCount,
          target: book.totalChunks,
          completionRate: book.totalChunks > 0 ? (levelCount / book.totalChunks) * 100 : 0
        };
      }
    }

    // Calculate completion rates for eras
    for (const era of Object.keys(analysis.byEra)) {
      const eraData = analysis.byEra[era];
      eraData.completionRate = eraData.target > 0 ? (eraData.count / eraData.target) * 100 : 0;
    }

    // Recent activity analysis
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    
    analysis.recentActivity.last24h = simplifications.filter(s => 
      (now - new Date(s.createdAt)) < day
    ).length;
    
    analysis.recentActivity.last7days = simplifications.filter(s => 
      (now - new Date(s.createdAt)) < (7 * day)
    ).length;
    
    analysis.recentActivity.last30days = simplifications.filter(s => 
      (now - new Date(s.createdAt)) < (30 * day)
    ).length;

    return analysis;
  }

  async analyzeQualityMetrics() {
    console.log('\n✅ QUALITY METRICS ANALYSIS');
    console.log('-'.repeat(40));

    const simplifications = await prisma.bookSimplification.findMany({
      select: {
        bookId: true,
        targetLevel: true,
        qualityScore: true
      },
      where: {
        qualityScore: { not: null }
      }
    });

    const analysis = {
      totalWithScores: simplifications.length,
      averageScore: 0,
      scoreDistribution: {
        excellent: 0,  // >= 0.9
        good: 0,       // 0.8-0.89
        acceptable: 0, // 0.7-0.79
        poor: 0,       // < 0.7
      },
      byLevel: {},
      byScoreRange: {}
    };

    if (simplifications.length > 0) {
      // Calculate average
      const totalScore = simplifications.reduce((sum, s) => sum + (parseFloat(s.qualityScore) || 0), 0);
      analysis.averageScore = totalScore / simplifications.length;

      // Score distribution
      simplifications.forEach(s => {
        const score = parseFloat(s.qualityScore) || 0;
        if (score >= 0.9) analysis.scoreDistribution.excellent++;
        else if (score >= 0.8) analysis.scoreDistribution.good++;
        else if (score >= 0.7) analysis.scoreDistribution.acceptable++;
        else analysis.scoreDistribution.poor++;
      });

      // By level analysis
      for (const level of CEFR_LEVELS) {
        const levelSimplifications = simplifications.filter(s => s.targetLevel === level);
        if (levelSimplifications.length > 0) {
          const levelTotal = levelSimplifications.reduce((sum, s) => sum + (parseFloat(s.qualityScore) || 0), 0);
          analysis.byLevel[level] = {
            count: levelSimplifications.length,
            averageScore: levelTotal / levelSimplifications.length,
            distribution: {
              excellent: levelSimplifications.filter(s => parseFloat(s.qualityScore) >= 0.9).length,
              good: levelSimplifications.filter(s => parseFloat(s.qualityScore) >= 0.8 && parseFloat(s.qualityScore) < 0.9).length,
              acceptable: levelSimplifications.filter(s => parseFloat(s.qualityScore) >= 0.7 && parseFloat(s.qualityScore) < 0.8).length,
              poor: levelSimplifications.filter(s => parseFloat(s.qualityScore) < 0.7).length
            }
          };
        }
      }
    }

    return analysis;
  }

  async analyzeEraPerformance() {
    console.log('\n🏛️ ERA PERFORMANCE ANALYSIS');
    console.log('-'.repeat(40));

    const bookContents = await prisma.bookContent.findMany({
      select: { bookId: true, title: true, era: true, totalChunks: true }
    });

    const simplifications = await prisma.bookSimplification.findMany({
      select: { 
        bookId: true, 
        targetLevel: true, 
        qualityScore: true,
        createdAt: true
      }
    });

    const analysis = {};

    for (const era of ['early-modern', 'victorian', 'american-19c', 'modern']) {
      const eraBooks = bookContents.filter(b => b.era === era);
      const eraBookIds = eraBooks.map(b => b.bookId);
      const eraSimplifications = simplifications.filter(s => eraBookIds.includes(s.bookId));

      const expectedSimplifications = eraBooks.reduce((sum, book) => sum + (book.totalChunks * 6), 0);
      
      analysis[era] = {
        bookCount: eraBooks.length,
        totalChunks: eraBooks.reduce((sum, book) => sum + book.totalChunks, 0),
        simplifications: eraSimplifications.length,
        expectedSimplifications,
        completionRate: expectedSimplifications > 0 ? (eraSimplifications.length / expectedSimplifications) * 100 : 0,
        averageQuality: 0,
        books: eraBooks.map(book => ({
          title: book.title,
          chunks: book.totalChunks,
          simplifications: simplifications.filter(s => s.bookId === book.bookId).length,
          expectedSimplifications: book.totalChunks * 6
        }))
      };

      // Calculate average quality for era
      const qualityScores = eraSimplifications
        .filter(s => s.qualityScore !== null)
        .map(s => parseFloat(s.qualityScore));
      
      if (qualityScores.length > 0) {
        analysis[era].averageQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
      }
    }

    return analysis;
  }

  async analyzeProcessingSpeed() {
    console.log('\n⚡ PROCESSING SPEED ANALYSIS');
    console.log('-'.repeat(40));

    // Get simplifications from different time periods
    const now = new Date();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;

    const timeframes = [
      { name: 'Last Hour', duration: hour },
      { name: 'Last 6 Hours', duration: 6 * hour },
      { name: 'Last 24 Hours', duration: day },
      { name: 'Last 7 Days', duration: 7 * day }
    ];

    const analysis = {
      timeframes: {},
      allTime: {
        total: 0,
        firstProcessed: null,
        lastProcessed: null,
        totalDuration: 0,
        averagePerDay: 0
      }
    };

    for (const timeframe of timeframes) {
      const since = new Date(now - timeframe.duration);
      const count = await prisma.bookSimplification.count({
        where: {
          createdAt: { gte: since }
        }
      });

      analysis.timeframes[timeframe.name] = {
        count,
        durationHours: timeframe.duration / hour,
        rate: count / (timeframe.duration / hour) // per hour
      };
    }

    // All-time analysis
    const allSimplifications = await prisma.bookSimplification.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    if (allSimplifications.length > 0) {
      analysis.allTime.total = allSimplifications.length;
      analysis.allTime.firstProcessed = allSimplifications[0].createdAt;
      analysis.allTime.lastProcessed = allSimplifications[allSimplifications.length - 1].createdAt;
      
      const totalDuration = new Date(analysis.allTime.lastProcessed) - new Date(analysis.allTime.firstProcessed);
      analysis.allTime.totalDuration = totalDuration;
      analysis.allTime.averagePerDay = totalDuration > 0 ? 
        (analysis.allTime.total / (totalDuration / day)) : 0;
    }

    return analysis;
  }

  async detectAllGaps() {
    console.log('\n🔍 GAP DETECTION ANALYSIS');
    console.log('-'.repeat(40));

    const gaps = {
      missingBooks: [],
      incompleteBooks: [],
      missingLevels: [],
      summary: {
        totalGaps: 0,
        missingSimplifications: 0,
        priorityGaps: []
      }
    };

    // Check for missing books
    for (const book of COMPLETE_BOOK_COLLECTION) {
      const stored = await prisma.bookContent.findUnique({
        where: { bookId: book.id }
      });

      if (!stored) {
        gaps.missingBooks.push({
          bookId: book.id,
          title: book.title,
          author: book.author,
          era: book.era
        });
      }
    }

    // Check for incomplete simplification coverage
    const storedBooks = await prisma.bookContent.findMany({
      select: { bookId: true, title: true, era: true, totalChunks: true }
    });

    for (const book of storedBooks) {
      const bookGaps = [];
      
      for (const level of CEFR_LEVELS) {
        const existing = await prisma.bookSimplification.count({
          where: { bookId: book.bookId, targetLevel: level }
        });

        if (existing < book.totalChunks) {
          const gap = {
            level,
            existing,
            needed: book.totalChunks - existing,
            completionRate: (existing / book.totalChunks) * 100
          };
          bookGaps.push(gap);
          gaps.missingLevels.push({
            bookId: book.bookId,
            title: book.title,
            era: book.era,
            ...gap
          });
        }
      }

      if (bookGaps.length > 0) {
        gaps.incompleteBooks.push({
          bookId: book.bookId,
          title: book.title,
          era: book.era,
          totalChunks: book.totalChunks,
          gaps: bookGaps,
          overallCompletion: (
            (book.totalChunks * 6 - bookGaps.reduce((sum, g) => sum + g.needed, 0)) / 
            (book.totalChunks * 6)
          ) * 100
        });
      }
    }

    // Calculate summary
    gaps.summary.totalGaps = gaps.missingBooks.length + gaps.incompleteBooks.length;
    gaps.summary.missingSimplifications = gaps.missingLevels.reduce((sum, gap) => sum + gap.needed, 0);
    
    // Identify priority gaps (books with <50% completion)
    gaps.summary.priorityGaps = gaps.incompleteBooks
      .filter(book => book.overallCompletion < 50)
      .map(book => ({
        title: book.title,
        era: book.era,
        completion: book.overallCompletion.toFixed(1) + '%',
        missingSimplifications: book.gaps.reduce((sum, g) => sum + g.needed, 0)
      }));

    return gaps;
  }

  // ===== REPORTING METHODS =====

  printBookStorageReport(storage) {
    console.log(`📚 Books Stored: ${storage.totalStored}/${storage.totalTarget} (${storage.completionRate.toFixed(1)}%)`);
    console.log(`📄 Total Chunks: ${storage.totalChunks.toLocaleString()}`);
    console.log(`🔤 Total Words: ${storage.totalWords.toLocaleString()}`);
    
    console.log('\n📊 By Era:');
    for (const [era, data] of Object.entries(storage.byEra)) {
      console.log(`  ${era}: ${data.stored}/${data.target} (${data.completionRate.toFixed(1)}%)`);
      if (data.books.length > 0) {
        data.books.forEach(book => {
          console.log(`    • ${book.title} (${book.chunks} chunks)`);
        });
      }
    }

    if (storage.recentActivity.length > 0) {
      console.log('\n📅 Recently Stored:');
      storage.recentActivity.forEach(book => {
        console.log(`  • ${book.title} (${new Date(book.createdAt).toLocaleDateString()})`);
      });
    }
  }

  printCoverageReport(coverage) {
    console.log(`📝 Simplifications: ${coverage.totalSimplifications.toLocaleString()}/${coverage.targetSimplifications.toLocaleString()} (${coverage.completionRate.toFixed(1)}%)`);
    
    console.log('\n🎯 By CEFR Level:');
    for (const [level, data] of Object.entries(coverage.byLevel)) {
      const status = data.completionRate >= 90 ? '✅' : data.completionRate >= 50 ? '🟡' : '❌';
      console.log(`  ${level}: ${status} ${data.count.toLocaleString()}/${data.target.toLocaleString()} (${data.completionRate.toFixed(1)}%)`);
    }

    console.log('\n🏛️ By Era:');
    for (const [era, data] of Object.entries(coverage.byEra)) {
      const status = data.completionRate >= 90 ? '✅' : data.completionRate >= 50 ? '🟡' : '❌';
      console.log(`  ${era}: ${status} ${data.count.toLocaleString()}/${data.target.toLocaleString()} (${data.completionRate.toFixed(1)}%)`);
    }

    console.log('\n📈 Recent Activity:');
    console.log(`  Last 24h: ${coverage.recentActivity.last24h} simplifications`);
    console.log(`  Last 7 days: ${coverage.recentActivity.last7days} simplifications`);
    console.log(`  Last 30 days: ${coverage.recentActivity.last30days} simplifications`);
  }

  printQualityReport(quality) {
    if (quality.totalWithScores === 0) {
      console.log('📊 No quality scores available yet');
      return;
    }

    console.log(`📊 Quality Analysis (${quality.totalWithScores.toLocaleString()} scored items)`);
    console.log(`📈 Average Score: ${quality.averageScore.toFixed(3)}`);
    
    console.log('\n🎯 Score Distribution:');
    const total = Object.values(quality.scoreDistribution).reduce((sum, count) => sum + count, 0);
    for (const [category, count] of Object.entries(quality.scoreDistribution)) {
      const percentage = total > 0 ? (count / total * 100).toFixed(1) : '0.0';
      const icon = category === 'excellent' ? '🟢' : category === 'good' ? '🟡' : category === 'acceptable' ? '🟠' : '🔴';
      console.log(`  ${category}: ${icon} ${count.toLocaleString()} (${percentage}%)`);
    }

    if (Object.keys(quality.byLevel).length > 0) {
      console.log('\n📚 By CEFR Level:');
      for (const [level, data] of Object.entries(quality.byLevel)) {
        console.log(`  ${level}: Avg ${data.averageScore.toFixed(3)} (${data.count.toLocaleString()} items)`);
      }
    }
  }

  printEraReport(eras) {
    console.log('🏛️ Era Performance:');
    for (const [era, data] of Object.entries(eras)) {
      const status = data.completionRate >= 90 ? '✅' : data.completionRate >= 50 ? '🟡' : '❌';
      console.log(`\n  ${era.toUpperCase()}: ${status} ${data.completionRate.toFixed(1)}% complete`);
      console.log(`    Books: ${data.bookCount}, Chunks: ${data.totalChunks.toLocaleString()}`);
      console.log(`    Simplifications: ${data.simplifications.toLocaleString()}/${data.expectedSimplifications.toLocaleString()}`);
      if (data.averageQuality > 0) {
        console.log(`    Avg Quality: ${data.averageQuality.toFixed(3)}`);
      }
    }
  }

  printSpeedReport(speed) {
    console.log('⚡ Processing Speed:');
    for (const [timeframe, data] of Object.entries(speed.timeframes)) {
      const rate = data.rate.toFixed(1);
      console.log(`  ${timeframe}: ${data.count} simplifications (${rate}/hour)`);
    }

    if (speed.allTime.total > 0) {
      console.log(`\n📊 All-Time: ${speed.allTime.total.toLocaleString()} simplifications`);
      console.log(`  Period: ${new Date(speed.allTime.firstProcessed).toLocaleDateString()} - ${new Date(speed.allTime.lastProcessed).toLocaleDateString()}`);
      console.log(`  Average: ${speed.allTime.averagePerDay.toFixed(1)} per day`);
    }
  }

  printGapReport(gaps) {
    console.log(`🔍 Gap Analysis: ${gaps.summary.totalGaps} books with gaps`);
    console.log(`📝 Missing Simplifications: ${gaps.summary.missingSimplifications.toLocaleString()}`);

    if (gaps.missingBooks.length > 0) {
      console.log(`\n❌ Missing Books (${gaps.missingBooks.length}):`);
      gaps.missingBooks.forEach(book => {
        console.log(`  • ${book.title} by ${book.author} (${book.era})`);
      });
    }

    if (gaps.summary.priorityGaps.length > 0) {
      console.log(`\n🚨 Priority Gaps (${gaps.summary.priorityGaps.length} books <50% complete):`);
      gaps.summary.priorityGaps.forEach(gap => {
        console.log(`  • ${gap.title}: ${gap.completion} (${gap.missingSimplifications} needed)`);
      });
    }
  }

  generateRecommendations(report) {
    const recommendations = [];

    // Book storage recommendations
    if (report.bookStorage.completionRate < 100) {
      const missingCount = report.bookStorage.totalTarget - report.bookStorage.totalStored;
      recommendations.push({
        priority: 'high',
        category: 'Book Storage',
        action: `Store remaining ${missingCount} books to complete collection`,
        impact: `Enable simplification generation for ${missingCount * 6} more CEFR level variations`
      });
    }

    // Coverage recommendations
    if (report.simplificationCoverage.completionRate < 50) {
      recommendations.push({
        priority: 'high',
        category: 'Simplification Coverage',
        action: 'Prioritize batch generation of missing simplifications',
        impact: `Complete ${report.gaps.summary.missingSimplifications.toLocaleString()} simplifications to reach full coverage`
      });
    }

    // Quality recommendations
    if (report.qualityMetrics.totalWithScores > 0) {
      const poorQuality = report.qualityMetrics.scoreDistribution.poor;
      const total = Object.values(report.qualityMetrics.scoreDistribution).reduce((sum, count) => sum + count, 0);
      const poorPercentage = (poorQuality / total) * 100;

      if (poorPercentage > 10) {
        recommendations.push({
          priority: 'medium',
          category: 'Quality Control',
          action: `Review and regenerate ${poorQuality} poor quality simplifications (${poorPercentage.toFixed(1)}%)`,
          impact: 'Improve overall simplification quality and user experience'
        });
      }
    }

    // Speed recommendations
    const recentSpeed = report.processingSpeed.timeframes['Last 24 Hours']?.rate || 0;
    if (recentSpeed < 5) {
      recommendations.push({
        priority: 'medium',
        category: 'Performance',
        action: 'Optimize processing speed - currently below 5 simplifications/hour',
        impact: 'Reduce time to complete remaining simplifications'
      });
    }

    // Era-specific recommendations
    for (const [era, data] of Object.entries(report.eraPerformance)) {
      if (data.completionRate < 30) {
        recommendations.push({
          priority: 'high',
          category: 'Era Coverage',
          action: `Focus on ${era} era books (${data.completionRate.toFixed(1)}% complete)`,
          impact: `Complete ${data.bookCount} books from ${era} era for balanced collection`
        });
      }
    }

    return recommendations;
  }

  printRecommendations(recommendations) {
    if (recommendations.length === 0) {
      console.log('\n🎉 No major recommendations - system is performing well!');
      return;
    }

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('-'.repeat(40));

    const high = recommendations.filter(r => r.priority === 'high');
    const medium = recommendations.filter(r => r.priority === 'medium');
    const low = recommendations.filter(r => r.priority === 'low');

    if (high.length > 0) {
      console.log('\n🚨 HIGH PRIORITY:');
      high.forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.category}] ${rec.action}`);
        console.log(`     Impact: ${rec.impact}`);
      });
    }

    if (medium.length > 0) {
      console.log('\n🟡 MEDIUM PRIORITY:');
      medium.forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.category}] ${rec.action}`);
        console.log(`     Impact: ${rec.impact}`);
      });
    }

    if (low.length > 0) {
      console.log('\n🟢 LOW PRIORITY:');
      low.forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.category}] ${rec.action}`);
        console.log(`     Impact: ${rec.impact}`);
      });
    }
  }

  // ===== UTILITY METHODS =====

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  async close() {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  const monitor = new ComprehensiveProgressMonitor();
  
  monitor.generateFullReport()
    .then(report => {
      console.log('\n✅ Progress report completed successfully');
      console.log(`📊 Report generated at: ${report.timestamp}`);
      return monitor.close();
    })
    .catch(error => {
      console.error('\n❌ Progress report failed:', error.message);
      monitor.close();
      process.exit(1);
    });
}

module.exports = ComprehensiveProgressMonitor;