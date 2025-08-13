/**
 * Quality Control and Validation System for Multi-Book Simplifications
 * 
 * Features:
 * - Comprehensive quality assessment across all simplifications
 * - Era-aware quality standards
 * - CEFR level-specific validation
 * - Automated flagging of problematic simplifications
 * - Batch quality improvement recommendations
 * - Performance quality tracking over time
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Era-specific quality thresholds
const ERA_QUALITY_THRESHOLDS = {
  'early-modern': {
    A1: 0.65, A2: 0.70, B1: 0.75, B2: 0.80, C1: 0.82, C2: 0.85
  },
  'victorian': {
    A1: 0.70, A2: 0.75, B1: 0.78, B2: 0.82, C1: 0.84, C2: 0.86
  },
  'american-19c': {
    A1: 0.72, A2: 0.77, B1: 0.80, B2: 0.83, C1: 0.85, C2: 0.87
  },
  'modern': {
    A1: 0.75, A2: 0.80, B1: 0.82, B2: 0.85, C1: 0.87, C2: 0.89
  }
};

// Content preservation patterns
const CRITICAL_PATTERNS = {
  negations: /\b(not|never|no|none|nothing|neither|nor|isn't|aren't|wasn't|weren't|doesn't|don't|didn't|won't|wouldn't|can't|couldn't|shouldn't|mustn't)\b/gi,
  conditionals: /\b(if|unless|except|provided|assuming|given|whether|in case|suppose)\b/gi,
  quantifiers: /\b(all|every|each|some|any|few|many|most|several|both|either)\b/gi,
  temporals: /\b(before|after|during|while|when|whenever|until|since|as soon as|by the time)\b/gi,
  causals: /\b(because|since|as|due to|owing to|thanks to|so|therefore|thus|hence|consequently|as a result)\b/gi
};

class QualityControlValidator {

  async runComprehensiveQualityCheck() {
    console.log('✅ COMPREHENSIVE QUALITY CONTROL ANALYSIS');
    console.log('=' .repeat(60));

    const report = {
      timestamp: new Date().toISOString(),
      overview: await this.getQualityOverview(),
      eraAnalysis: await this.analyzeQualityByEra(),
      levelAnalysis: await this.analyzeQualityByLevel(),
      contentPreservation: await this.analyzeContentPreservation(),
      flaggedItems: await this.identifyProblematicSimplifications(),
      trendAnalysis: await this.analyzeTrends(),
      recommendations: []
    };

    // Print detailed analysis
    this.printOverview(report.overview);
    this.printEraAnalysis(report.eraAnalysis);
    this.printLevelAnalysis(report.levelAnalysis);
    this.printContentPreservationAnalysis(report.contentPreservation);
    this.printFlaggedItems(report.flaggedItems);
    this.printTrendAnalysis(report.trendAnalysis);

    // Generate and print recommendations
    report.recommendations = this.generateQualityRecommendations(report);
    this.printRecommendations(report.recommendations);

    return report;
  }

  async getQualityOverview() {
    const simplifications = await prisma.bookSimplification.findMany({
      select: {
        qualityScore: true,
        bookId: true,
        targetLevel: true,
        createdAt: true
      },
      where: {
        qualityScore: { not: null }
      }
    });

    if (simplifications.length === 0) {
      return {
        totalSimplifications: 0,
        averageScore: 0,
        distribution: { excellent: 0, good: 0, acceptable: 0, poor: 0, failed: 0 }
      };
    }

    const scores = simplifications.map(s => parseFloat(s.qualityScore));
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    const distribution = {
      excellent: scores.filter(s => s >= 0.90).length,  // 90%+
      good: scores.filter(s => s >= 0.80 && s < 0.90).length,  // 80-89%
      acceptable: scores.filter(s => s >= 0.70 && s < 0.80).length,  // 70-79%
      poor: scores.filter(s => s >= 0.60 && s < 0.70).length,  // 60-69%
      failed: scores.filter(s => s < 0.60).length  // <60%
    };

    return {
      totalSimplifications: simplifications.length,
      averageScore: averageScore,
      distribution: distribution,
      scoreRange: {
        minimum: Math.min(...scores),
        maximum: Math.max(...scores),
        median: this.calculateMedian(scores)
      }
    };
  }

  async analyzeQualityByEra() {
    // Get book eras
    const bookContents = await prisma.bookContent.findMany({
      select: { bookId: true, title: true, era: true }
    });

    const bookEraMap = {};
    bookContents.forEach(book => {
      bookEraMap[book.bookId] = { era: book.era, title: book.title };
    });

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

    const eraAnalysis = {};

    for (const era of ['early-modern', 'victorian', 'american-19c', 'modern']) {
      const eraSimplifications = simplifications.filter(s => 
        bookEraMap[s.bookId]?.era === era
      );

      if (eraSimplifications.length === 0) {
        eraAnalysis[era] = {
          count: 0,
          averageScore: 0,
          distribution: { excellent: 0, good: 0, acceptable: 0, poor: 0, failed: 0 },
          levelBreakdown: {}
        };
        continue;
      }

      const scores = eraSimplifications.map(s => parseFloat(s.qualityScore));
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      const distribution = {
        excellent: scores.filter(s => s >= 0.90).length,
        good: scores.filter(s => s >= 0.80 && s < 0.90).length,
        acceptable: scores.filter(s => s >= 0.70 && s < 0.80).length,
        poor: scores.filter(s => s >= 0.60 && s < 0.70).length,
        failed: scores.filter(s => s < 0.60).length
      };

      // Analyze by CEFR level within era
      const levelBreakdown = {};
      for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
        const levelSimplifications = eraSimplifications.filter(s => s.targetLevel === level);
        if (levelSimplifications.length > 0) {
          const levelScores = levelSimplifications.map(s => parseFloat(s.qualityScore));
          const levelAverage = levelScores.reduce((sum, score) => sum + score, 0) / levelScores.length;
          const threshold = ERA_QUALITY_THRESHOLDS[era][level];
          const passingCount = levelScores.filter(s => s >= threshold).length;

          levelBreakdown[level] = {
            count: levelSimplifications.length,
            averageScore: levelAverage,
            threshold: threshold,
            passingCount: passingCount,
            passingRate: (passingCount / levelSimplifications.length) * 100
          };
        }
      }

      eraAnalysis[era] = {
        count: eraSimplifications.length,
        averageScore: averageScore,
        distribution: distribution,
        levelBreakdown: levelBreakdown,
        books: [...new Set(eraSimplifications.map(s => bookEraMap[s.bookId]?.title))].filter(Boolean)
      };
    }

    return eraAnalysis;
  }

  async analyzeQualityByLevel() {
    const simplifications = await prisma.bookSimplification.findMany({
      select: {
        targetLevel: true,
        qualityScore: true,
        bookId: true
      },
      where: {
        qualityScore: { not: null }
      }
    });

    const levelAnalysis = {};

    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
      const levelSimplifications = simplifications.filter(s => s.targetLevel === level);

      if (levelSimplifications.length === 0) {
        levelAnalysis[level] = {
          count: 0,
          averageScore: 0,
          distribution: { excellent: 0, good: 0, acceptable: 0, poor: 0, failed: 0 }
        };
        continue;
      }

      const scores = levelSimplifications.map(s => parseFloat(s.qualityScore));
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      const distribution = {
        excellent: scores.filter(s => s >= 0.90).length,
        good: scores.filter(s => s >= 0.80 && s < 0.90).length,
        acceptable: scores.filter(s => s >= 0.70 && s < 0.80).length,
        poor: scores.filter(s => s >= 0.60 && s < 0.70).length,
        failed: scores.filter(s => s < 0.60).length
      };

      levelAnalysis[level] = {
        count: levelSimplifications.length,
        averageScore: averageScore,
        distribution: distribution,
        scoreRange: {
          minimum: Math.min(...scores),
          maximum: Math.max(...scores),
          median: this.calculateMedian(scores)
        }
      };
    }

    return levelAnalysis;
  }

  async analyzeContentPreservation() {
    const simplifications = await prisma.bookSimplification.findMany({
      select: {
        id: true,
        bookId: true,
        targetLevel: true,
        originalText: true,
        simplifiedText: true,
        qualityScore: true
      },
      where: {
        qualityScore: { not: null }
      }
    });

    const analysis = {
      totalAnalyzed: simplifications.length,
      preservationIssues: {
        negations: [],
        conditionals: [],
        quantifiers: [],
        temporals: [],
        causals: [],
        entityLoss: []
      },
      overallPreservationRate: 0,
      byLevel: {}
    };

    let totalPreservationIssues = 0;

    for (const simplification of simplifications) {
      const issues = this.checkContentPreservation(
        simplification.originalText, 
        simplification.simplifiedText
      );

      // Add to analysis
      for (const [category, hasIssue] of Object.entries(issues)) {
        if (hasIssue) {
          analysis.preservationIssues[category].push({
            id: simplification.id,
            bookId: simplification.bookId,
            level: simplification.targetLevel,
            qualityScore: simplification.qualityScore,
            issue: hasIssue
          });
          totalPreservationIssues++;
        }
      }

      // Per-level analysis
      if (!analysis.byLevel[simplification.targetLevel]) {
        analysis.byLevel[simplification.targetLevel] = {
          total: 0,
          issues: 0,
          preservationRate: 0
        };
      }
      
      analysis.byLevel[simplification.targetLevel].total++;
      const levelIssues = Object.values(issues).filter(Boolean).length;
      if (levelIssues > 0) {
        analysis.byLevel[simplification.targetLevel].issues++;
      }
    }

    // Calculate preservation rates
    for (const level of Object.keys(analysis.byLevel)) {
      const levelData = analysis.byLevel[level];
      levelData.preservationRate = ((levelData.total - levelData.issues) / levelData.total) * 100;
    }

    const totalWithoutIssues = simplifications.length - Object.values(analysis.preservationIssues)
      .reduce((sum, issues) => sum + issues.length, 0);
    analysis.overallPreservationRate = (totalWithoutIssues / simplifications.length) * 100;

    return analysis;
  }

  checkContentPreservation(original, simplified) {
    const issues = {};

    // Check negation preservation
    const originalNegations = (original.match(CRITICAL_PATTERNS.negations) || []).length;
    const simplifiedNegations = (simplified.match(CRITICAL_PATTERNS.negations) || []).length;
    if (originalNegations > simplifiedNegations + 1) {
      issues.negations = `Lost ${originalNegations - simplifiedNegations} negations`;
    }

    // Check conditional preservation
    const originalConditionals = (original.match(CRITICAL_PATTERNS.conditionals) || []).length;
    const simplifiedConditionals = (simplified.match(CRITICAL_PATTERNS.conditionals) || []).length;
    if (originalConditionals > simplifiedConditionals + 1) {
      issues.conditionals = `Lost ${originalConditionals - simplifiedConditionals} conditionals`;
    }

    // Check quantifier preservation
    const originalQuantifiers = (original.match(CRITICAL_PATTERNS.quantifiers) || []).length;
    const simplifiedQuantifiers = (simplified.match(CRITICAL_PATTERNS.quantifiers) || []).length;
    if (originalQuantifiers > simplifiedQuantifiers + 1) {
      issues.quantifiers = `Lost ${originalQuantifiers - simplifiedQuantifiers} quantifiers`;
    }

    // Check temporal marker preservation
    const originalTemporals = (original.match(CRITICAL_PATTERNS.temporals) || []).length;
    const simplifiedTemporals = (simplified.match(CRITICAL_PATTERNS.temporals) || []).length;
    if (originalTemporals > simplifiedTemporals + 1) {
      issues.temporals = `Lost ${originalTemporals - simplifiedTemporals} temporal markers`;
    }

    // Check causal relationship preservation
    const originalCausals = (original.match(CRITICAL_PATTERNS.causals) || []).length;
    const simplifiedCausals = (simplified.match(CRITICAL_PATTERNS.causals) || []).length;
    if (originalCausals > simplifiedCausals + 1) {
      issues.causals = `Lost ${originalCausals - simplifiedCausals} causal markers`;
    }

    // Check for significant entity loss (proper nouns, numbers)
    const originalEntities = (original.match(/\b[A-Z][a-zA-Z]+\b|\b\d+\b/g) || []).length;
    const simplifiedEntities = (simplified.match(/\b[A-Z][a-zA-Z]+\b|\b\d+\b/g) || []).length;
    if (originalEntities > simplifiedEntities + 2) {
      issues.entityLoss = `Lost ${originalEntities - simplifiedEntities} entities/numbers`;
    }

    return issues;
  }

  async identifyProblematicSimplifications() {
    // Get book era information
    const bookContents = await prisma.bookContent.findMany({
      select: { bookId: true, title: true, era: true }
    });
    const bookEraMap = {};
    bookContents.forEach(book => {
      bookEraMap[book.bookId] = { era: book.era, title: book.title };
    });

    const problematicItems = {
      lowQuality: [],
      contentIssues: [],
      thresholdFailures: [],
      summary: {
        totalFlagged: 0,
        byCategory: {},
        byEra: {},
        byLevel: {}
      }
    };

    // Get all simplifications
    const simplifications = await prisma.bookSimplification.findMany({
      select: {
        id: true,
        bookId: true,
        targetLevel: true,
        chunkIndex: true,
        originalText: true,
        simplifiedText: true,
        qualityScore: true
      },
      where: {
        qualityScore: { not: null }
      }
    });

    for (const simplification of simplifications) {
      const bookInfo = bookEraMap[simplification.bookId];
      const era = bookInfo?.era || 'unknown';
      const threshold = ERA_QUALITY_THRESHOLDS[era]?.[simplification.targetLevel] || 0.80;
      const score = parseFloat(simplification.qualityScore);

      const flags = [];

      // Low quality score
      if (score < 0.60) {
        flags.push('critically_low_quality');
      } else if (score < 0.70) {
        flags.push('low_quality');
      }

      // Threshold failure
      if (score < threshold) {
        flags.push('threshold_failure');
      }

      // Content preservation issues
      const preservationIssues = this.checkContentPreservation(
        simplification.originalText,
        simplification.simplifiedText
      );

      const hasContentIssues = Object.values(preservationIssues).some(Boolean);
      if (hasContentIssues) {
        flags.push('content_preservation_issues');
      }

      // Length issues
      const originalLength = simplification.originalText.split(' ').length;
      const simplifiedLength = simplification.simplifiedText.split(' ').length;
      const lengthRatio = simplifiedLength / originalLength;

      if (lengthRatio > 1.5) {
        flags.push('excessive_expansion');
      } else if (lengthRatio < 0.3) {
        flags.push('excessive_reduction');
      }

      // If any flags, add to problematic items
      if (flags.length > 0) {
        const item = {
          id: simplification.id,
          bookId: simplification.bookId,
          bookTitle: bookInfo?.title || 'Unknown',
          era: era,
          level: simplification.targetLevel,
          chunkIndex: simplification.chunkIndex,
          qualityScore: score,
          threshold: threshold,
          flags: flags,
          preservationIssues: preservationIssues,
          lengthRatio: lengthRatio
        };

        // Categorize
        if (flags.includes('critically_low_quality') || flags.includes('low_quality')) {
          problematicItems.lowQuality.push(item);
        }
        if (flags.includes('content_preservation_issues')) {
          problematicItems.contentIssues.push(item);
        }
        if (flags.includes('threshold_failure')) {
          problematicItems.thresholdFailures.push(item);
        }
      }
    }

    // Calculate summary statistics
    const allFlagged = [
      ...problematicItems.lowQuality,
      ...problematicItems.contentIssues,
      ...problematicItems.thresholdFailures
    ];

    // Remove duplicates based on ID
    const uniqueFlagged = allFlagged.filter((item, index, self) => 
      index === self.findIndex(i => i.id === item.id)
    );

    problematicItems.summary.totalFlagged = uniqueFlagged.length;

    // Group by category
    problematicItems.summary.byCategory = {
      lowQuality: problematicItems.lowQuality.length,
      contentIssues: problematicItems.contentIssues.length,
      thresholdFailures: problematicItems.thresholdFailures.length
    };

    // Group by era and level
    for (const item of uniqueFlagged) {
      // By era
      if (!problematicItems.summary.byEra[item.era]) {
        problematicItems.summary.byEra[item.era] = 0;
      }
      problematicItems.summary.byEra[item.era]++;

      // By level
      if (!problematicItems.summary.byLevel[item.level]) {
        problematicItems.summary.byLevel[item.level] = 0;
      }
      problematicItems.summary.byLevel[item.level]++;
    }

    return problematicItems;
  }

  async analyzeTrends() {
    const simplifications = await prisma.bookSimplification.findMany({
      select: {
        qualityScore: true,
        createdAt: true,
        targetLevel: true
      },
      where: {
        qualityScore: { not: null }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (simplifications.length < 10) {
      return {
        insufficient_data: true,
        message: 'Need at least 10 simplifications for trend analysis'
      };
    }

    // Group by time periods
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    
    const periods = [
      { name: 'Last 24 Hours', duration: day },
      { name: 'Last 7 Days', duration: 7 * day },
      { name: 'Last 30 Days', duration: 30 * day }
    ];

    const trends = {
      qualityTrend: 'stable',
      periodAnalysis: {},
      levelTrends: {}
    };

    for (const period of periods) {
      const cutoff = new Date(now - period.duration);
      const periodData = simplifications.filter(s => new Date(s.createdAt) >= cutoff);

      if (periodData.length > 0) {
        const scores = periodData.map(s => parseFloat(s.qualityScore));
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

        trends.periodAnalysis[period.name] = {
          count: periodData.length,
          averageScore: avgScore,
          scoreRange: {
            min: Math.min(...scores),
            max: Math.max(...scores)
          }
        };
      }
    }

    // Analyze trends by CEFR level
    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
      const levelData = simplifications.filter(s => s.targetLevel === level);
      if (levelData.length >= 5) {
        // Split into first and second half to detect trend
        const midpoint = Math.floor(levelData.length / 2);
        const firstHalf = levelData.slice(0, midpoint);
        const secondHalf = levelData.slice(midpoint);

        const firstAvg = firstHalf.reduce((sum, s) => sum + parseFloat(s.qualityScore), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, s) => sum + parseFloat(s.qualityScore), 0) / secondHalf.length;

        const change = secondAvg - firstAvg;
        let trend = 'stable';
        if (change > 0.05) trend = 'improving';
        else if (change < -0.05) trend = 'declining';

        trends.levelTrends[level] = {
          trend: trend,
          change: change,
          firstHalfAverage: firstAvg,
          secondHalfAverage: secondAvg
        };
      }
    }

    return trends;
  }

  // ===== REPORTING METHODS =====

  printOverview(overview) {
    console.log(`📊 QUALITY OVERVIEW`);
    console.log(`Total Analyzed: ${overview.totalSimplifications.toLocaleString()}`);
    console.log(`Average Score: ${overview.averageScore.toFixed(3)}`);
    console.log(`Score Range: ${overview.scoreRange?.minimum?.toFixed(3)} - ${overview.scoreRange?.maximum?.toFixed(3)}`);
    console.log(`Median Score: ${overview.scoreRange?.median?.toFixed(3)}`);

    console.log('\n🎯 Distribution:');
    const total = Object.values(overview.distribution).reduce((sum, count) => sum + count, 0);
    for (const [category, count] of Object.entries(overview.distribution)) {
      const percentage = total > 0 ? (count / total * 100).toFixed(1) : '0.0';
      const icon = this.getQualityIcon(category);
      console.log(`  ${category}: ${icon} ${count.toLocaleString()} (${percentage}%)`);
    }
  }

  printEraAnalysis(eraAnalysis) {
    console.log('\n🏛️ QUALITY BY ERA:');
    for (const [era, data] of Object.entries(eraAnalysis)) {
      if (data.count === 0) continue;
      
      console.log(`\n  ${era.toUpperCase()}:`);
      console.log(`    Simplifications: ${data.count.toLocaleString()}`);
      console.log(`    Average Score: ${data.averageScore.toFixed(3)}`);
      console.log(`    Books: ${data.books?.join(', ')}`);
      
      if (Object.keys(data.levelBreakdown).length > 0) {
        console.log('    CEFR Level Performance:');
        for (const [level, levelData] of Object.entries(data.levelBreakdown)) {
          const status = levelData.passingRate >= 80 ? '✅' : levelData.passingRate >= 60 ? '🟡' : '❌';
          console.log(`      ${level}: ${status} ${levelData.averageScore.toFixed(3)} avg (${levelData.passingRate.toFixed(1)}% pass threshold ${levelData.threshold})`);
        }
      }
    }
  }

  printLevelAnalysis(levelAnalysis) {
    console.log('\n📚 QUALITY BY CEFR LEVEL:');
    for (const [level, data] of Object.entries(levelAnalysis)) {
      if (data.count === 0) continue;
      
      console.log(`\n  ${level}:`);
      console.log(`    Count: ${data.count.toLocaleString()}`);
      console.log(`    Average: ${data.averageScore.toFixed(3)}`);
      console.log(`    Range: ${data.scoreRange?.minimum?.toFixed(3)} - ${data.scoreRange?.maximum?.toFixed(3)}`);
      
      // Quality distribution for this level
      const levelTotal = Object.values(data.distribution).reduce((sum, count) => sum + count, 0);
      if (levelTotal > 0) {
        const excellent = ((data.distribution.excellent / levelTotal) * 100).toFixed(1);
        const good = ((data.distribution.good / levelTotal) * 100).toFixed(1);
        const poor = ((data.distribution.poor / levelTotal) * 100).toFixed(1);
        console.log(`    Quality: ${excellent}% excellent, ${good}% good, ${poor}% poor`);
      }
    }
  }

  printContentPreservationAnalysis(preservation) {
    console.log('\n🔒 CONTENT PRESERVATION ANALYSIS:');
    console.log(`Overall Preservation Rate: ${preservation.overallPreservationRate.toFixed(1)}%`);
    
    console.log('\n📋 Issues by Category:');
    for (const [category, issues] of Object.entries(preservation.preservationIssues)) {
      if (issues.length > 0) {
        console.log(`  ${category}: ${issues.length} items flagged`);
        // Show worst offenders (lowest quality scores with this issue)
        const sortedIssues = issues.sort((a, b) => parseFloat(a.qualityScore) - parseFloat(b.qualityScore));
        const worst = sortedIssues.slice(0, 3);
        worst.forEach(issue => {
          console.log(`    • ${issue.bookId} ${issue.level} (score: ${parseFloat(issue.qualityScore).toFixed(3)}) - ${issue.issue}`);
        });
      }
    }

    console.log('\n📚 Preservation by CEFR Level:');
    for (const [level, data] of Object.entries(preservation.byLevel)) {
      const status = data.preservationRate >= 90 ? '✅' : data.preservationRate >= 70 ? '🟡' : '❌';
      console.log(`  ${level}: ${status} ${data.preservationRate.toFixed(1)}% (${data.issues}/${data.total} with issues)`);
    }
  }

  printFlaggedItems(flaggedItems) {
    console.log('\n🚨 PROBLEMATIC SIMPLIFICATIONS:');
    console.log(`Total Flagged: ${flaggedItems.summary.totalFlagged.toLocaleString()}`);
    
    console.log('\n📊 By Category:');
    for (const [category, count] of Object.entries(flaggedItems.summary.byCategory)) {
      console.log(`  ${category}: ${count.toLocaleString()}`);
    }

    console.log('\n🏛️ By Era:');
    for (const [era, count] of Object.entries(flaggedItems.summary.byEra)) {
      console.log(`  ${era}: ${count.toLocaleString()}`);
    }

    console.log('\n📚 By Level:');
    for (const [level, count] of Object.entries(flaggedItems.summary.byLevel)) {
      console.log(`  ${level}: ${count.toLocaleString()}`);
    }

    // Show worst offenders
    if (flaggedItems.lowQuality.length > 0) {
      console.log('\n❌ Lowest Quality Items (showing worst 5):');
      const worst = flaggedItems.lowQuality
        .sort((a, b) => a.qualityScore - b.qualityScore)
        .slice(0, 5);
      
      worst.forEach(item => {
        console.log(`  • ${item.bookTitle} ${item.level} chunk ${item.chunkIndex}: ${item.qualityScore.toFixed(3)} (flags: ${item.flags.join(', ')})`);
      });
    }
  }

  printTrendAnalysis(trends) {
    if (trends.insufficient_data) {
      console.log('\n📈 TREND ANALYSIS: Insufficient data for trend analysis');
      return;
    }

    console.log('\n📈 TREND ANALYSIS:');
    
    if (Object.keys(trends.periodAnalysis).length > 0) {
      console.log('Recent Performance:');
      for (const [period, data] of Object.entries(trends.periodAnalysis)) {
        console.log(`  ${period}: ${data.count} simplifications, avg ${data.averageScore.toFixed(3)}`);
      }
    }

    if (Object.keys(trends.levelTrends).length > 0) {
      console.log('\nLevel Trends:');
      for (const [level, trend] of Object.entries(trends.levelTrends)) {
        const trendIcon = trend.trend === 'improving' ? '📈' : trend.trend === 'declining' ? '📉' : '➡️';
        const change = trend.change >= 0 ? `+${trend.change.toFixed(3)}` : trend.change.toFixed(3);
        console.log(`  ${level}: ${trendIcon} ${trend.trend} (${change})`);
      }
    }
  }

  generateQualityRecommendations(report) {
    const recommendations = [];

    // Overall quality recommendations
    if (report.overview.averageScore < 0.80) {
      recommendations.push({
        priority: 'high',
        category: 'Overall Quality',
        action: `Improve overall quality - current average ${report.overview.averageScore.toFixed(3)} below target 0.80`,
        impact: 'Better user experience and more effective simplifications'
      });
    }

    // Era-specific recommendations
    for (const [era, data] of Object.entries(report.eraAnalysis)) {
      if (data.count > 0 && data.averageScore < 0.75) {
        recommendations.push({
          priority: 'high',
          category: 'Era Quality',
          action: `Focus on improving ${era} era quality (avg ${data.averageScore.toFixed(3)})`,
          impact: `Improve quality for ${data.count} simplifications across ${data.books?.length || 0} books`
        });
      }
    }

    // Content preservation recommendations
    if (report.contentPreservation.overallPreservationRate < 85) {
      recommendations.push({
        priority: 'high',
        category: 'Content Preservation',
        action: `Address content preservation issues (${report.contentPreservation.overallPreservationRate.toFixed(1)}% preservation rate)`,
        impact: 'Reduce meaning loss and improve simplification accuracy'
      });
    }

    // Flagged items recommendations
    if (report.flaggedItems.summary.totalFlagged > 0) {
      const flaggedPercentage = (report.flaggedItems.summary.totalFlagged / report.overview.totalSimplifications) * 100;
      
      if (flaggedPercentage > 15) {
        recommendations.push({
          priority: 'high',
          category: 'Quality Control',
          action: `Review ${report.flaggedItems.summary.totalFlagged} flagged simplifications (${flaggedPercentage.toFixed(1)}% of total)`,
          impact: 'Remove or regenerate poor quality content'
        });
      }
    }

    // Level-specific recommendations
    for (const [level, data] of Object.entries(report.levelAnalysis)) {
      if (data.count > 0 && data.averageScore < 0.75) {
        recommendations.push({
          priority: 'medium',
          category: 'Level Quality',
          action: `Improve ${level} level quality (avg ${data.averageScore.toFixed(3)})`,
          impact: `Better simplifications for ${data.count} ${level} level items`
        });
      }
    }

    return recommendations;
  }

  printRecommendations(recommendations) {
    if (recommendations.length === 0) {
      console.log('\n✅ RECOMMENDATIONS: Quality standards are being met!');
      return;
    }

    console.log('\n💡 QUALITY IMPROVEMENT RECOMMENDATIONS:');
    console.log('-'.repeat(50));

    const high = recommendations.filter(r => r.priority === 'high');
    const medium = recommendations.filter(r => r.priority === 'medium');

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
  }

  // ===== UTILITY METHODS =====

  calculateMedian(scores) {
    const sorted = scores.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? 
      (sorted[mid - 1] + sorted[mid]) / 2 : 
      sorted[mid];
  }

  getQualityIcon(category) {
    const icons = {
      excellent: '🟢',
      good: '🟡',
      acceptable: '🟠',
      poor: '🔴',
      failed: '⚫'
    };
    return icons[category] || '⚪';
  }

  async close() {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  const validator = new QualityControlValidator();
  
  validator.runComprehensiveQualityCheck()
    .then(report => {
      console.log('\n✅ Quality control analysis completed successfully');
      console.log(`📊 Report generated at: ${report.timestamp}`);
      return validator.close();
    })
    .catch(error => {
      console.error('\n❌ Quality control analysis failed:', error.message);
      validator.close();
      process.exit(1);
    });
}

module.exports = QualityControlValidator;