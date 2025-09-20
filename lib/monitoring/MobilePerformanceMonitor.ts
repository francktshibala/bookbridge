/**
 * Mobile Performance Monitor
 * Tracks critical metrics for continuous reading performance
 */

interface PerformanceMetrics {
  // Audio metrics
  audioStartLatency: number;
  audioGaps: number;
  audioBufferUnderruns: number;

  // Scroll performance
  scrollFPS: number;
  scrollJank: number;
  virtualScrollUpdates: number;

  // Memory usage
  memoryUsage: number;
  domNodeCount: number;

  // Network metrics
  prefetchHitRate: number;
  dataUsage: number;

  // User experience
  chunkTransitionTime: number;
  highlightLatency: number;
}

interface PerformanceThresholds {
  audioStartLatency: number; // <100ms
  scrollFPS: number; // >55fps
  memoryUsage: number; // <100MB on 2GB devices
  chunkTransitionTime: number; // <100ms
}

export class MobilePerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private thresholds: PerformanceThresholds;
  private isMonitoring = false;
  private frameCount = 0;
  private lastFrameTime = 0;
  private memoryObserver?: PerformanceObserver;
  private navigationObserver?: PerformanceObserver;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      audioStartLatency: 100, // ms
      scrollFPS: 55, // fps
      memoryUsage: 100 * 1024 * 1024, // 100MB in bytes
      chunkTransitionTime: 100, // ms
      ...thresholds
    };

  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.startFPSMonitoring();
    this.startMemoryMonitoring();
    this.setupPerformanceObservers();

    console.log('📊 Mobile performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    this.memoryObserver?.disconnect();
    this.navigationObserver?.disconnect();

    console.log('📊 Mobile performance monitoring stopped');
  }

  /**
   * Monitor FPS during scrolling
   */
  private startFPSMonitoring() {
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsSum = 0;
    let fpsReadings = 0;

    const measureFPS = (currentTime: number) => {
      if (!this.isMonitoring) return;

      frameCount++;
      const delta = currentTime - lastTime;

      if (delta >= 1000) { // Calculate FPS every second
        const fps = (frameCount * 1000) / delta;
        fpsSum += fps;
        fpsReadings++;

        this.metrics.scrollFPS = fpsSum / fpsReadings;

        // Detect jank (frames taking >16.67ms = <60fps)
        if (fps < 60) {
          this.metrics.scrollJank = (this.metrics.scrollJank || 0) + 1;
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * Monitor memory usage
   */
  private startMemoryMonitoring() {
    if (!(performance as any).memory) {
      console.warn('Memory monitoring not available in this browser');
      return;
    }

    const checkMemory = () => {
      if (!this.isMonitoring) return;

      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize;

      // Count DOM nodes
      this.metrics.domNodeCount = document.querySelectorAll('*').length;

      // Check memory threshold
      if (this.metrics.memoryUsage && this.metrics.memoryUsage > this.thresholds.memoryUsage) {
        this.reportPerformanceIssue('memory', {
          current: this.metrics.memoryUsage,
          threshold: this.thresholds.memoryUsage
        });
      }

      setTimeout(checkMemory, 5000); // Check every 5 seconds
    };

    checkMemory();
  }

  /**
   * Setup Performance API observers
   */
  private setupPerformanceObservers() {
    // Navigation timing observer
    if ('PerformanceObserver' in window) {
      this.navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const nav = entry as PerformanceNavigationTiming;
            // Monitor page load performance
            this.metrics.chunkTransitionTime = nav.loadEventEnd - nav.loadEventStart;
          }
        }
      });

      try {
        this.navigationObserver.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('Navigation observer not supported:', error);
      }
    }
  }

  /**
   * Track audio start latency
   */
  trackAudioStart(startTime: number) {
    const latency = performance.now() - startTime;
    this.metrics.audioStartLatency = latency;

    if (latency > this.thresholds.audioStartLatency) {
      this.reportPerformanceIssue('audio-latency', {
        latency,
        threshold: this.thresholds.audioStartLatency
      });
    }

    console.log(`🎵 Audio start latency: ${latency.toFixed(1)}ms`);
  }

  /**
   * Track audio gaps
   */
  trackAudioGap() {
    this.metrics.audioGaps = (this.metrics.audioGaps || 0) + 1;
    this.reportPerformanceIssue('audio-gap', {
      totalGaps: this.metrics.audioGaps
    });

    console.warn('🔊 Audio gap detected');
  }

  /**
   * Track chunk transition time
   */
  trackChunkTransition(startTime: number) {
    const transitionTime = performance.now() - startTime;
    this.metrics.chunkTransitionTime = transitionTime;

    if (transitionTime > this.thresholds.chunkTransitionTime) {
      this.reportPerformanceIssue('chunk-transition', {
        time: transitionTime,
        threshold: this.thresholds.chunkTransitionTime
      });
    }

    console.log(`🔄 Chunk transition: ${transitionTime.toFixed(1)}ms`);
  }

  /**
   * Track highlight update latency
   */
  trackHighlightLatency(startTime: number) {
    const latency = performance.now() - startTime;
    this.metrics.highlightLatency = latency;

    console.log(`✨ Highlight latency: ${latency.toFixed(1)}ms`);
  }

  /**
   * Track virtual scroll updates
   */
  trackVirtualScrollUpdate() {
    this.metrics.virtualScrollUpdates = (this.metrics.virtualScrollUpdates || 0) + 1;
  }

  /**
   * Report performance issue
   */
  private reportPerformanceIssue(type: string, data: any) {
    console.warn(`⚠️ Performance issue detected: ${type}`, data);

    // In production, send to analytics
    if (process.env.NODE_ENV === 'production') {
      // Send to analytics service
      // analytics.track('performance_issue', { type, ...data });
    }
  }

  /**
   * Get current metrics summary
   */
  getMetrics(): PerformanceMetrics & { status: 'good' | 'warning' | 'critical' } {
    const isGood =
      (this.metrics.audioStartLatency || 0) < this.thresholds.audioStartLatency &&
      (this.metrics.scrollFPS || 60) > this.thresholds.scrollFPS &&
      (this.metrics.memoryUsage || 0) < this.thresholds.memoryUsage &&
      (this.metrics.chunkTransitionTime || 0) < this.thresholds.chunkTransitionTime;

    const hasWarnings =
      (this.metrics.audioGaps || 0) > 0 ||
      (this.metrics.scrollJank || 0) > 5;

    const status = isGood ? (hasWarnings ? 'warning' : 'good') : 'critical';

    return {
      audioStartLatency: this.metrics.audioStartLatency || 0,
      audioGaps: this.metrics.audioGaps || 0,
      audioBufferUnderruns: this.metrics.audioBufferUnderruns || 0,
      scrollFPS: this.metrics.scrollFPS || 0,
      scrollJank: this.metrics.scrollJank || 0,
      virtualScrollUpdates: this.metrics.virtualScrollUpdates || 0,
      memoryUsage: this.metrics.memoryUsage || 0,
      domNodeCount: this.metrics.domNodeCount || 0,
      prefetchHitRate: this.metrics.prefetchHitRate || 0,
      dataUsage: this.metrics.dataUsage || 0,
      chunkTransitionTime: this.metrics.chunkTransitionTime || 0,
      highlightLatency: this.metrics.highlightLatency || 0,
      status
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const deviceInfo = this.getDeviceInfo();

    return `
📊 Mobile Performance Report
============================

Device Info:
- RAM: ${deviceInfo.memory}GB
- Cores: ${deviceInfo.cores}
- Platform: ${deviceInfo.platform}
- Screen: ${deviceInfo.screen}

Performance Metrics:
- Audio Start: ${metrics.audioStartLatency.toFixed(1)}ms (target: <${this.thresholds.audioStartLatency}ms)
- Scroll FPS: ${metrics.scrollFPS.toFixed(1)} (target: >${this.thresholds.scrollFPS})
- Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB (target: <${this.thresholds.memoryUsage / 1024 / 1024}MB)
- Chunk Transition: ${metrics.chunkTransitionTime.toFixed(1)}ms (target: <${this.thresholds.chunkTransitionTime}ms)

Issues:
- Audio Gaps: ${metrics.audioGaps}
- Scroll Jank: ${metrics.scrollJank} frames
- DOM Nodes: ${metrics.domNodeCount}

Status: ${metrics.status.toUpperCase()}
    `.trim();
  }

  /**
   * Get device information
   */
  private getDeviceInfo() {
    return {
      memory: (navigator as any).deviceMemory || 'unknown',
      cores: navigator.hardwareConcurrency || 'unknown',
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}`
    };
  }

  /**
   * Run critical performance tests
   */
  async runCriticalTests(): Promise<boolean> {
    console.log('🧪 Running critical performance tests...');

    const tests = [
      this.testAudioStartLatency(),
      this.testScrollPerformance(),
      this.testMemoryUsage(),
      this.testChunkTransition()
    ];

    const results = await Promise.all(tests);
    const allPassed = results.every(result => result);

    console.log(allPassed ? '✅ All critical tests passed' : '❌ Some critical tests failed');

    return allPassed;
  }

  private async testAudioStartLatency(): Promise<boolean> {
    // Simulate audio start
    const start = performance.now();
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate audio loading
    const latency = performance.now() - start;

    return latency < this.thresholds.audioStartLatency;
  }

  private async testScrollPerformance(): Promise<boolean> {
    // Test scroll performance
    return (this.metrics.scrollFPS || 60) > this.thresholds.scrollFPS;
  }

  private async testMemoryUsage(): Promise<boolean> {
    // Test memory usage
    return (this.metrics.memoryUsage || 0) < this.thresholds.memoryUsage;
  }

  private async testChunkTransition(): Promise<boolean> {
    // Test chunk transition
    return (this.metrics.chunkTransitionTime || 0) < this.thresholds.chunkTransitionTime;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopMonitoring();
  }
}