/**
 * Master Scalable Processing Pipeline
 * Orchestrates complete 20-book simplification system (33,840+ simplifications)
 * 
 * Features:
 * - Unified command interface for all processing operations
 * - Real-time progress monitoring and reporting
 * - Intelligent resume capability
 * - Quality control integration
 * - Comprehensive error handling
 * - Multi-phase execution with checkpoints
 */

const ScalableBookProcessor = require('./scalable-multi-book-processor');
const ComprehensiveProgressMonitor = require('./comprehensive-progress-monitor');
const QualityControlValidator = require('./quality-control-validator');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

class MasterScalablePipeline {
  constructor(options = {}) {
    this.sessionId = `master_pipeline_${Date.now()}`;
    this.startTime = Date.now();
    this.options = {
      dryRun: options.dryRun || false,
      batchSize: options.batchSize || 10,
      qualityCheck: options.qualityCheck !== false, // Default true
      progressInterval: options.progressInterval || 300000, // 5 minutes
      saveStateInterval: options.saveStateInterval || 600000, // 10 minutes
      ...options
    };
    
    this.processor = new ScalableBookProcessor();
    this.monitor = new ComprehensiveProgressMonitor();
    this.validator = new QualityControlValidator();
    
    this.state = {
      phase: 'initialization',
      currentBook: null,
      completedBooks: 0,
      totalSimplifications: 0,
      errors: [],
      startTime: this.startTime,
      lastCheckpoint: null
    };
  }

  async executeFullPipeline(command = 'all') {
    try {
      console.log('🚀 MASTER SCALABLE PROCESSING PIPELINE');
      console.log('=' .repeat(80));
      console.log(`📋 Session ID: ${this.sessionId}`);
      console.log(`⚙️  Configuration:`);
      console.log(`   • Command: ${command}`);
      console.log(`   • Dry Run: ${this.options.dryRun}`);
      console.log(`   • Batch Size: ${this.options.batchSize}`);
      console.log(`   • Quality Checks: ${this.options.qualityCheck}`);
      console.log('=' .repeat(80));

      // Start progress monitoring
      this.startProgressMonitoring();

      // Execute based on command
      switch (command) {
        case 'all':
          await this.executeAllPhases();
          break;
        case 'books':
          await this.executeBookStorageOnly();
          break;
        case 'simplifications':
          await this.executeSimplificationsOnly();
          break;
        case 'quality':
          await this.executeQualityCheckOnly();
          break;
        case 'monitor':
          await this.executeMonitoringOnly();
          break;
        case 'resume':
          await this.executeResume();
          break;
        default:
          throw new Error(`Unknown command: ${command}`);
      }

      console.log('\n🎉 MASTER PIPELINE EXECUTION COMPLETE!');
      await this.generateFinalReport();

    } catch (error) {
      console.error('❌ Master pipeline failed:', error.message);
      await this.handleCriticalError(error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async executeAllPhases() {
    console.log('\n🎯 EXECUTING ALL PHASES: COMPLETE 20-BOOK PROCESSING');
    
    // Phase 1: Book Storage
    this.state.phase = 'book_storage';
    console.log('\n📚 PHASE 1: BOOK STORAGE');
    console.log('-'.repeat(40));
    
    if (!this.options.dryRun) {
      const storageReport = await this.processor.processBooksInBatches();
      await this.saveCheckpoint('book_storage_complete', storageReport);
      
      if (!storageReport.success && storageReport.failed > 0) {
        console.warn(`⚠️  Some books failed to store (${storageReport.failed}/${storageReport.total})`);
      }
    } else {
      console.log('📋 [DRY RUN] Would execute book storage phase');
    }

    // Phase 2: Initial Progress Assessment
    this.state.phase = 'progress_assessment';
    console.log('\n📊 PHASE 2: PROGRESS ASSESSMENT');
    console.log('-'.repeat(40));
    
    const initialProgress = await this.monitor.generateFullReport();
    await this.saveCheckpoint('progress_assessment_complete', initialProgress);

    // Phase 3: Simplification Generation
    this.state.phase = 'simplification_generation';
    console.log('\n📝 PHASE 3: MASS SIMPLIFICATION GENERATION');
    console.log('-'.repeat(40));
    
    if (!this.options.dryRun) {
      const simplificationReport = await this.processor.generateAllSimplifications();
      await this.saveCheckpoint('simplification_generation_complete', simplificationReport);
    } else {
      console.log('📋 [DRY RUN] Would execute simplification generation phase');
    }

    // Phase 4: Quality Control
    if (this.options.qualityCheck) {
      this.state.phase = 'quality_control';
      console.log('\n✅ PHASE 4: COMPREHENSIVE QUALITY CONTROL');
      console.log('-'.repeat(40));
      
      const qualityReport = await this.validator.runComprehensiveQualityCheck();
      await this.saveCheckpoint('quality_control_complete', qualityReport);
    }

    // Phase 5: Final Assessment
    this.state.phase = 'final_assessment';
    console.log('\n📊 PHASE 5: FINAL ASSESSMENT');
    console.log('-'.repeat(40));
    
    const finalProgress = await this.monitor.generateFullReport();
    await this.saveCheckpoint('final_assessment_complete', finalProgress);
  }

  async executeBookStorageOnly() {
    console.log('\n📚 EXECUTING: BOOK STORAGE ONLY');
    
    this.state.phase = 'book_storage_only';
    
    if (!this.options.dryRun) {
      const report = await this.processor.processBooksInBatches();
      console.log('\n📊 Book Storage Results:');
      console.log(`✅ Successful: ${report.successful}`);
      console.log(`❌ Failed: ${report.failed}`);
      console.log(`📋 Total: ${report.total}`);
      
      return report;
    } else {
      console.log('📋 [DRY RUN] Book storage simulation complete');
      return { success: true, simulation: true };
    }
  }

  async executeSimplificationsOnly() {
    console.log('\n📝 EXECUTING: SIMPLIFICATIONS ONLY');
    
    this.state.phase = 'simplifications_only';
    
    if (!this.options.dryRun) {
      const report = await this.processor.generateAllSimplifications();
      console.log('\n📊 Simplification Results:');
      console.log(`✅ Successful: ${report.totalSuccess}`);
      console.log(`❌ Errors: ${report.totalErrors}`);
      console.log(`📈 Success Rate: ${report.successRate}%`);
      
      return report;
    } else {
      console.log('📋 [DRY RUN] Simplification generation simulation complete');
      return { success: true, simulation: true };
    }
  }

  async executeQualityCheckOnly() {
    console.log('\n✅ EXECUTING: QUALITY CHECK ONLY');
    
    this.state.phase = 'quality_check_only';
    const report = await this.validator.runComprehensiveQualityCheck();
    
    console.log('\n📊 Quality Check Summary:');
    console.log(`📝 Items Analyzed: ${report.overview.totalSimplifications.toLocaleString()}`);
    console.log(`📈 Average Score: ${report.overview.averageScore.toFixed(3)}`);
    console.log(`🚨 Flagged Items: ${report.flaggedItems?.summary?.totalFlagged || 0}`);
    
    return report;
  }

  async executeMonitoringOnly() {
    console.log('\n📊 EXECUTING: MONITORING ONLY');
    
    this.state.phase = 'monitoring_only';
    const report = await this.monitor.generateFullReport();
    
    console.log('\n📋 Monitoring Summary:');
    console.log(`📚 Books Stored: ${report.bookStorage.totalStored}/${report.bookStorage.totalTarget}`);
    console.log(`📝 Simplifications: ${report.simplificationCoverage.totalSimplifications.toLocaleString()}`);
    console.log(`📊 Completion: ${report.simplificationCoverage.completionRate.toFixed(1)}%`);
    
    return report;
  }

  async executeResume() {
    console.log('\n🔄 EXECUTING: RESUME FROM LAST STATE');
    
    const lastState = await this.loadLastState();
    if (!lastState) {
      console.log('❌ No previous state found. Starting fresh execution.');
      return await this.executeAllPhases();
    }

    console.log(`📋 Resuming from: ${lastState.phase}`);
    console.log(`⏰ Last checkpoint: ${new Date(lastState.timestamp).toLocaleString()}`);
    
    this.state = { ...this.state, ...lastState };
    
    // Resume based on last phase
    switch (lastState.phase) {
      case 'book_storage':
      case 'book_storage_complete':
        await this.executeSimplificationsOnly();
        break;
      case 'simplification_generation':
      case 'simplification_generation_complete':
        if (this.options.qualityCheck) {
          await this.executeQualityCheckOnly();
        }
        break;
      default:
        console.log('🔄 Resuming with full pipeline from current state');
        await this.executeAllPhases();
    }
  }

  async startProgressMonitoring() {
    if (this.options.dryRun) return;
    
    console.log(`📊 Starting progress monitoring (interval: ${this.options.progressInterval / 1000}s)`);
    
    this.progressInterval = setInterval(async () => {
      try {
        console.log('\n📊 PROGRESS UPDATE:');
        await this.monitor.generateFullReport();
        await this.saveCurrentState();
      } catch (error) {
        console.error('⚠️  Progress monitoring error:', error.message);
      }
    }, this.options.progressInterval);
  }

  async saveCheckpoint(phase, data) {
    const checkpoint = {
      sessionId: this.sessionId,
      phase: phase,
      timestamp: new Date().toISOString(),
      data: data,
      state: this.state
    };

    const checkpointFile = path.join(__dirname, `checkpoint_${this.sessionId}_${phase}.json`);
    await fs.writeFile(checkpointFile, JSON.stringify(checkpoint, null, 2));
    
    this.state.lastCheckpoint = checkpoint;
    console.log(`📋 Checkpoint saved: ${phase}`);
  }

  async saveCurrentState() {
    const stateFile = path.join(__dirname, `state_${this.sessionId}.json`);
    const currentState = {
      ...this.state,
      timestamp: new Date().toISOString(),
      runtime: Date.now() - this.startTime
    };
    
    await fs.writeFile(stateFile, JSON.stringify(currentState, null, 2));
  }

  async loadLastState() {
    try {
      const stateFiles = await fs.readdir(__dirname);
      const relevantFiles = stateFiles
        .filter(file => file.startsWith('state_') && file.endsWith('.json'))
        .sort()
        .reverse(); // Most recent first

      if (relevantFiles.length === 0) return null;

      const latestStateFile = path.join(__dirname, relevantFiles[0]);
      const stateContent = await fs.readFile(latestStateFile, 'utf8');
      return JSON.parse(stateContent);

    } catch (error) {
      console.warn('⚠️  Could not load previous state:', error.message);
      return null;
    }
  }

  async generateFinalReport() {
    console.log('\n📋 GENERATING FINAL COMPREHENSIVE REPORT');
    console.log('=' .repeat(60));

    const report = {
      sessionId: this.sessionId,
      executionTime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
      configuration: this.options,
      finalState: this.state
    };

    // Get latest data from all systems
    try {
      report.progressData = await this.monitor.generateFullReport();
      
      if (this.options.qualityCheck) {
        report.qualityData = await this.validator.runComprehensiveQualityCheck();
      }
    } catch (error) {
      console.warn('⚠️  Some final report data unavailable:', error.message);
    }

    // Calculate key metrics
    const metrics = this.calculateFinalMetrics(report);
    
    // Print summary
    console.log('\n🎉 FINAL EXECUTION SUMMARY:');
    console.log(`⏱️  Total Runtime: ${this.formatDuration(report.executionTime)}`);
    console.log(`📚 Books Processed: ${metrics.booksProcessed}`);
    console.log(`📝 Simplifications Generated: ${metrics.simplificationsGenerated.toLocaleString()}`);
    console.log(`📊 Overall Completion: ${metrics.overallCompletion.toFixed(1)}%`);
    console.log(`✅ Success Rate: ${metrics.successRate.toFixed(1)}%`);
    console.log(`⚡ Processing Speed: ${metrics.averageSpeed.toFixed(1)} simpl/hour`);

    if (report.qualityData) {
      console.log(`🎯 Average Quality: ${report.qualityData.overview.averageScore.toFixed(3)}`);
      console.log(`🚨 Quality Issues: ${report.qualityData.flaggedItems?.summary?.totalFlagged || 0}`);
    }

    // Save final report
    const reportFile = path.join(__dirname, `final_report_${this.sessionId}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Final report saved: ${reportFile}`);

    return report;
  }

  calculateFinalMetrics(report) {
    const progressData = report.progressData || {};
    const qualityData = report.qualityData || {};

    return {
      booksProcessed: progressData.bookStorage?.totalStored || 0,
      simplificationsGenerated: progressData.simplificationCoverage?.totalSimplifications || 0,
      overallCompletion: progressData.simplificationCoverage?.completionRate || 0,
      successRate: qualityData.overview?.averageScore ? 
        (qualityData.overview.averageScore * 100) : 0,
      averageSpeed: this.calculateProcessingSpeed(report.executionTime, 
        progressData.simplificationCoverage?.totalSimplifications || 0)
    };
  }

  calculateProcessingSpeed(executionTime, totalSimplifications) {
    const hours = executionTime / (1000 * 60 * 60);
    return hours > 0 ? totalSimplifications / hours : 0;
  }

  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  async handleCriticalError(error) {
    console.error('\n🚨 CRITICAL ERROR IN MASTER PIPELINE');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    // Save error state
    this.state.criticalError = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    await this.saveCurrentState();
    
    // Try to save a recovery checkpoint
    try {
      await this.saveCheckpoint('critical_error', {
        error: error.message,
        state: this.state,
        recoverySuggestions: [
          'Check database connectivity',
          'Verify API rate limits',
          'Review error logs',
          'Consider resuming with: node master-scalable-pipeline.js resume'
        ]
      });
    } catch (saveError) {
      console.error('❌ Failed to save error checkpoint:', saveError.message);
    }
  }

  async cleanup() {
    console.log('\n🧹 CLEANUP: Closing connections and resources');
    
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    try {
      await this.monitor.close();
      await this.validator.close();
      await prisma.$disconnect();
      console.log('✅ Cleanup completed successfully');
    } catch (error) {
      console.warn('⚠️  Some cleanup operations failed:', error.message);
    }
  }

  // Static method for command-line usage
  static async run(command = 'all', options = {}) {
    const pipeline = new MasterScalablePipeline(options);
    return await pipeline.executeFullPipeline(command);
  }
}

// Command-line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  // Parse command-line options
  const options = {
    dryRun: args.includes('--dry-run'),
    qualityCheck: !args.includes('--no-quality'),
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch='))?.split('=')[1]) || 10,
    progressInterval: parseInt(args.find(arg => arg.startsWith('--progress='))?.split('=')[1]) * 1000 || 300000
  };

  console.log('🚀 Starting Master Scalable Pipeline from command line');
  console.log(`📋 Command: ${command}`);
  console.log(`⚙️  Options:`, options);

  MasterScalablePipeline.run(command, options)
    .then(result => {
      console.log('\n✅ Pipeline execution completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Pipeline execution failed:', error.message);
      process.exit(1);
    });
}

module.exports = MasterScalablePipeline;

/**
 * USAGE EXAMPLES:
 * 
 * Execute all phases:
 * node master-scalable-pipeline.js all
 * 
 * Store books only:
 * node master-scalable-pipeline.js books
 * 
 * Generate simplifications only:
 * node master-scalable-pipeline.js simplifications
 * 
 * Quality check only:
 * node master-scalable-pipeline.js quality
 * 
 * Monitor progress only:
 * node master-scalable-pipeline.js monitor
 * 
 * Resume from last checkpoint:
 * node master-scalable-pipeline.js resume
 * 
 * Options:
 * --dry-run          : Simulate execution without making changes
 * --no-quality       : Skip quality control phase
 * --batch=N          : Set batch size (default: 10)
 * --progress=N       : Progress update interval in seconds (default: 300)
 * 
 * Example with options:
 * node master-scalable-pipeline.js all --batch=15 --progress=180
 */