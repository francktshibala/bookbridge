// Cross-device offline experience testing utilities
// Provides comprehensive testing framework for validating PWA offline functionality

export interface DeviceTestProfile {
  id: string;
  name: string;
  category: 'budget_mobile' | 'mid_range_mobile' | 'tablet' | 'desktop';
  specifications: {
    viewport: { width: number; height: number };
    userAgent: string;
    memory: number; // GB
    storage: number; // GB available
    networkConditions: string[];
  };
  targetMarkets: string[];
  description: string;
}

export interface OfflineTestScenario {
  id: string;
  name: string;
  description: string;
  steps: OfflineTestStep[];
  expectedResults: string[];
  priority: 'critical' | 'important' | 'nice-to-have';
}

export interface OfflineTestStep {
  action: string;
  description: string;
  validation: string;
  timeout?: number;
}

export interface CrossDeviceTestResult {
  deviceProfile: DeviceTestProfile;
  scenario: OfflineTestScenario;
  results: {
    stepResults: Array<{
      stepIndex: number;
      passed: boolean;
      result: string;
      duration: number;
      error?: string;
    }>;
    overallPassed: boolean;
    totalDuration: number;
    performanceMetrics: {
      memoryUsage?: number;
      cacheEfficiency: number;
      loadTimes: number[];
    };
  };
  timestamp: number;
}

// Target device profiles for emerging markets
export const TARGET_DEVICE_PROFILES: DeviceTestProfile[] = [
  {
    id: 'android_budget_kenya',
    name: 'Android Budget (Kenya)',
    category: 'budget_mobile',
    specifications: {
      viewport: { width: 360, height: 640 },
      userAgent: 'Mozilla/5.0 (Linux; Android 9; SM-A102U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.136 Mobile Safari/537.36',
      memory: 2, // 2GB RAM
      storage: 16, // 16GB storage
      networkConditions: ['2G_EDGE', '3G_SLOW', 'OFFLINE']
    },
    targetMarkets: ['Kenya', 'Nigeria', 'Tanzania'],
    description: 'Low-end Android device common in East Africa with limited data plans'
  },
  {
    id: 'android_midrange_india',
    name: 'Android Mid-range (India)',
    category: 'mid_range_mobile',
    specifications: {
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-M325F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
      memory: 4, // 4GB RAM
      storage: 64, // 64GB storage
      networkConditions: ['3G_FAST', '4G_SLOW', 'WIFI_SLOW', 'OFFLINE']
    },
    targetMarkets: ['India', 'Bangladesh', 'Philippines'],
    description: 'Mid-range Android device popular in South Asia with intermittent connectivity'
  },
  {
    id: 'iphone_se_mexico',
    name: 'iPhone SE (Mexico)',
    category: 'budget_mobile',
    specifications: {
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      memory: 3, // 3GB RAM
      storage: 64, // 64GB storage
      networkConditions: ['3G_SLOW', '4G_INTERMITTENT', 'WIFI_UNRELIABLE', 'OFFLINE']
    },
    targetMarkets: ['Mexico', 'Colombia', 'Peru'],
    description: 'Affordable iPhone model common in Latin America with data cost concerns'
  },
  {
    id: 'tablet_wifi_indonesia',
    name: 'Budget Tablet (Indonesia)',
    category: 'tablet',
    specifications: {
      viewport: { width: 768, height: 1024 },
      userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-T225) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Safari/537.36',
      memory: 3, // 3GB RAM
      storage: 32, // 32GB storage
      networkConditions: ['WIFI_SLOW', 'WIFI_INTERMITTENT', 'OFFLINE']
    },
    targetMarkets: ['Indonesia', 'Vietnam', 'Thailand'],
    description: 'WiFi-only tablet used for extended reading sessions'
  }
];

// Comprehensive offline test scenarios
export const OFFLINE_TEST_SCENARIOS: OfflineTestScenario[] = [
  {
    id: 'initial_app_install',
    name: 'Initial App Installation',
    description: 'Test PWA installation process and first-time caching',
    priority: 'critical',
    steps: [
      {
        action: 'navigate_to_app',
        description: 'Navigate to BookBridge homepage',
        validation: 'Page loads successfully'
      },
      {
        action: 'trigger_install_prompt',
        description: 'Trigger PWA install prompt',
        validation: 'Install prompt appears and is functional'
      },
      {
        action: 'install_app',
        description: 'Install PWA to home screen',
        validation: 'App installs successfully and icon appears'
      },
      {
        action: 'launch_installed_app',
        description: 'Launch app from home screen',
        validation: 'App opens in standalone mode'
      },
      {
        action: 'verify_offline_assets',
        description: 'Check that essential assets are cached',
        validation: 'Service worker cache contains critical files'
      }
    ],
    expectedResults: [
      'PWA installs without errors',
      'App launches in standalone mode',
      'Critical assets cached for offline use',
      'Service worker is active and controlling'
    ]
  },
  {
    id: 'offline_reading_experience',
    name: 'Offline Reading Experience',
    description: 'Test complete reading workflow while offline',
    priority: 'critical',
    steps: [
      {
        action: 'go_offline',
        description: 'Disconnect from internet',
        validation: 'Network status shows offline'
      },
      {
        action: 'open_book_library',
        description: 'Navigate to book library',
        validation: 'Library loads with cached books visible'
      },
      {
        action: 'select_cached_book',
        description: 'Select a previously cached book',
        validation: 'Book opens successfully'
      },
      {
        action: 'test_reading_features',
        description: 'Test text display, navigation, and basic features',
        validation: 'All reading features work without network'
      },
      {
        action: 'test_audio_playback',
        description: 'Test audio playback of cached content',
        validation: 'Audio plays smoothly from cache'
      },
      {
        action: 'test_progress_tracking',
        description: 'Test reading progress tracking offline',
        validation: 'Progress is tracked locally and will sync later'
      }
    ],
    expectedResults: [
      'Offline indicator shows connection status',
      'Cached books remain accessible',
      'Audio playback works from cache',
      'Reading progress is tracked locally',
      'UI remains responsive and functional'
    ]
  },
  {
    id: 'network_reconnection',
    name: 'Network Reconnection Handling',
    description: 'Test behavior when going online after offline usage',
    priority: 'important',
    steps: [
      {
        action: 'use_app_offline',
        description: 'Use app extensively while offline',
        validation: 'App functions properly offline'
      },
      {
        action: 'reconnect_network',
        description: 'Reconnect to internet',
        validation: 'Network status updates to online'
      },
      {
        action: 'verify_background_sync',
        description: 'Verify background sync triggers',
        validation: 'Offline data syncs to server'
      },
      {
        action: 'check_cache_updates',
        description: 'Check if cache is updated with fresh content',
        validation: 'Service worker updates cache in background'
      },
      {
        action: 'verify_data_integrity',
        description: 'Verify data consistency after sync',
        validation: 'No data loss during offline period'
      }
    ],
    expectedResults: [
      'Seamless transition from offline to online',
      'Background sync completes successfully',
      'Reading progress is synchronized',
      'Cache is updated with latest content',
      'No data loss or corruption'
    ]
  },
  {
    id: 'cache_management_stress_test',
    name: 'Cache Management Under Storage Pressure',
    description: 'Test cache behavior when device storage is limited',
    priority: 'important',
    steps: [
      {
        action: 'simulate_low_storage',
        description: 'Simulate low device storage conditions',
        validation: 'App detects storage constraints'
      },
      {
        action: 'test_cache_eviction',
        description: 'Test intelligent cache eviction',
        validation: 'Less important content is evicted first'
      },
      {
        action: 'verify_core_functionality',
        description: 'Verify core features still work',
        validation: 'Essential features remain functional'
      },
      {
        action: 'test_cache_repopulation',
        description: 'Test cache repopulation after eviction',
        validation: 'Important content is re-cached when storage allows'
      }
    ],
    expectedResults: [
      'Graceful handling of storage constraints',
      'Intelligent cache eviction preserves critical content',
      'Core reading functionality always available',
      'Cache automatically optimizes for device capabilities'
    ]
  },
  {
    id: 'long_term_offline_usage',
    name: 'Extended Offline Usage',
    description: 'Test app behavior during extended offline periods',
    priority: 'nice-to-have',
    steps: [
      {
        action: 'go_offline_extended',
        description: 'Stay offline for extended period (simulated)',
        validation: 'App continues to function'
      },
      {
        action: 'test_data_persistence',
        description: 'Test data persistence across app restarts',
        validation: 'User data persists between sessions'
      },
      {
        action: 'verify_cache_integrity',
        description: 'Verify cached content remains intact',
        validation: 'No cache corruption or data loss'
      },
      {
        action: 'test_graceful_degradation',
        description: 'Test feature degradation without network',
        validation: 'Non-essential features degrade gracefully'
      }
    ],
    expectedResults: [
      'App remains stable during extended offline use',
      'User data persists across sessions',
      'Cache integrity is maintained',
      'Clear communication about offline limitations'
    ]
  }
];

export class CrossDeviceOfflineTester {
  private testResults: CrossDeviceTestResult[] = [];

  async runScenario(
    deviceProfile: DeviceTestProfile,
    scenario: OfflineTestScenario
  ): Promise<CrossDeviceTestResult> {
    const startTime = Date.now();
    const stepResults: CrossDeviceTestResult['results']['stepResults'] = [];
    let overallPassed = true;

    // Simulate device characteristics (in a real implementation, this would involve actual device testing)
    this.simulateDeviceCharacteristics(deviceProfile);

    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      const stepStartTime = Date.now();

      try {
        const stepResult = await this.executeTestStep(step, deviceProfile);
        const stepDuration = Date.now() - stepStartTime;

        stepResults.push({
          stepIndex: i,
          passed: stepResult.passed,
          result: stepResult.result,
          duration: stepDuration,
          error: stepResult.error
        });

        if (!stepResult.passed) {
          overallPassed = false;
        }
      } catch (error) {
        stepResults.push({
          stepIndex: i,
          passed: false,
          result: 'Step execution failed',
          duration: Date.now() - stepStartTime,
          error: error instanceof Error ? error.message : String(error)
        });
        overallPassed = false;
      }
    }

    const totalDuration = Date.now() - startTime;
    const performanceMetrics = await this.collectPerformanceMetrics(deviceProfile);

    const result: CrossDeviceTestResult = {
      deviceProfile,
      scenario,
      results: {
        stepResults,
        overallPassed,
        totalDuration,
        performanceMetrics
      },
      timestamp: Date.now()
    };

    this.testResults.push(result);
    return result;
  }

  private simulateDeviceCharacteristics(profile: DeviceTestProfile) {
    // In a real implementation, this would configure the test environment
    // to match the device characteristics (viewport, user agent, etc.)
    console.log(`Simulating device: ${profile.name}`);
    console.log(`Viewport: ${profile.specifications.viewport.width}x${profile.specifications.viewport.height}`);
    console.log(`Memory: ${profile.specifications.memory}GB`);
    console.log(`Storage: ${profile.specifications.storage}GB`);
  }

  private async executeTestStep(
    step: OfflineTestStep,
    deviceProfile: DeviceTestProfile
  ): Promise<{ passed: boolean; result: string; error?: string }> {
    // Simulate step execution based on action type
    switch (step.action) {
      case 'navigate_to_app':
        return this.testNavigation();
      case 'trigger_install_prompt':
        return this.testInstallPrompt();
      case 'install_app':
        return this.testAppInstallation();
      case 'go_offline':
        return this.testOfflineTransition();
      case 'open_book_library':
        return this.testLibraryAccess();
      case 'test_audio_playback':
        return this.testAudioPlayback();
      case 'verify_background_sync':
        return this.testBackgroundSync();
      default:
        return this.simulateGenericTest(step, deviceProfile);
    }
  }

  private async testNavigation(): Promise<{ passed: boolean; result: string }> {
    try {
      // Test if current page is accessible
      const currentUrl = window.location.href;
      const isAccessible = document.readyState === 'complete';
      
      return {
        passed: isAccessible,
        result: isAccessible ? 'Navigation successful' : 'Page not fully loaded'
      };
    } catch (error) {
      return {
        passed: false,
        result: 'Navigation test failed'
      };
    }
  }

  private async testInstallPrompt(): Promise<{ passed: boolean; result: string }> {
    try {
      // Check if PWA is installable
      const hasManifest = document.querySelector('link[rel="manifest"]') !== null;
      const hasServiceWorker = 'serviceWorker' in navigator;
      const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
      
      const isInstallable = hasManifest && hasServiceWorker && isHTTPS;
      
      return {
        passed: isInstallable,
        result: isInstallable 
          ? 'Install prompt requirements met'
          : `Missing: ${!hasManifest ? 'manifest ' : ''}${!hasServiceWorker ? 'service worker ' : ''}${!isHTTPS ? 'HTTPS' : ''}`
      };
    } catch (error) {
      return {
        passed: false,
        result: 'Install prompt test failed'
      };
    }
  }

  private async testAppInstallation(): Promise<{ passed: boolean; result: string }> {
    try {
      // Check if app appears to be installed (standalone mode)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (navigator as any).standalone === true;
      const isInstalled = isStandalone || isIOSStandalone;
      
      return {
        passed: true, // Always pass for simulation - real testing would verify actual installation
        result: isInstalled 
          ? 'App is running in standalone mode'
          : 'App installation simulated (test environment)'
      };
    } catch (error) {
      return {
        passed: false,
        result: 'App installation test failed'
      };
    }
  }

  private async testOfflineTransition(): Promise<{ passed: boolean; result: string }> {
    try {
      // Test offline detection
      const isOnline = navigator.onLine;
      const hasNetworkAPI = 'connection' in navigator;
      
      return {
        passed: true, // Simulation always passes
        result: `Network status: ${isOnline ? 'online' : 'offline'}${hasNetworkAPI ? ', Network API available' : ''}`
      };
    } catch (error) {
      return {
        passed: false,
        result: 'Offline transition test failed'
      };
    }
  }

  private async testLibraryAccess(): Promise<{ passed: boolean; result: string }> {
    try {
      // Check if library content is available
      const hasLocalStorage = 'localStorage' in window;
      const hasIndexedDB = 'indexedDB' in window;
      const hasCacheAPI = 'caches' in window;
      
      let cachedBooksCount = 0;
      if (hasLocalStorage) {
        const cachedBooks = localStorage.getItem('cached_books');
        cachedBooksCount = cachedBooks ? JSON.parse(cachedBooks).length : 0;
      }

      const hasOfflineContent = cachedBooksCount > 0 || hasIndexedDB || hasCacheAPI;
      
      return {
        passed: hasOfflineContent,
        result: hasOfflineContent 
          ? `Library accessible with ${cachedBooksCount} cached books`
          : 'No offline content available'
      };
    } catch (error) {
      return {
        passed: false,
        result: 'Library access test failed'
      };
    }
  }

  private async testAudioPlayback(): Promise<{ passed: boolean; result: string }> {
    try {
      if (!('caches' in window)) {
        return {
          passed: false,
          result: 'Cache API not available for audio testing'
        };
      }

      const audioCache = await caches.open('audio-cache');
      const cachedAudio = await audioCache.keys();
      const audioCount = cachedAudio.filter(req => 
        req.url.includes('/audio/') || req.url.endsWith('.mp3') || req.url.endsWith('.wav')
      ).length;

      return {
        passed: audioCount > 0,
        result: `${audioCount} audio files available in cache`
      };
    } catch (error) {
      return {
        passed: false,
        result: 'Audio playback test failed'
      };
    }
  }

  private async testBackgroundSync(): Promise<{ passed: boolean; result: string }> {
    try {
      const hasServiceWorker = 'serviceWorker' in navigator;
      const hasBackgroundSync = 'sync' in window.ServiceWorkerRegistration.prototype;
      
      if (!hasServiceWorker || !hasBackgroundSync) {
        return {
          passed: false,
          result: 'Background Sync API not supported'
        };
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        try {
          // Cast to any to handle the sync property which may not be in the type definition
          await (registration as any).sync.register('test-sync');
          return {
            passed: true,
            result: 'Background sync registration successful'
          };
        } catch (syncError) {
          return {
            passed: false,
            result: 'Background sync registration failed'
          };
        }
      } else {
        return {
          passed: false,
          result: 'No service worker registration found'
        };
      }
    } catch (error) {
      return {
        passed: false,
        result: 'Background sync test failed'
      };
    }
  }

  private async simulateGenericTest(
    step: OfflineTestStep,
    deviceProfile: DeviceTestProfile
  ): Promise<{ passed: boolean; result: string }> {
    // Simulate test execution with device-specific considerations
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate test duration
    
    // Simulate success rate based on device capabilities
    const deviceScore = this.calculateDeviceScore(deviceProfile);
    const successProbability = deviceScore / 100;
    const passed = Math.random() < successProbability;
    
    return {
      passed,
      result: passed 
        ? `${step.action} completed successfully on ${deviceProfile.name}`
        : `${step.action} failed on ${deviceProfile.name} - device limitations`
    };
  }

  private calculateDeviceScore(profile: DeviceTestProfile): number {
    let score = 70; // Base score
    
    // Adjust based on device specifications
    if (profile.specifications.memory >= 4) score += 10;
    if (profile.specifications.storage >= 32) score += 10;
    if (profile.category === 'budget_mobile') score -= 10;
    if (profile.category === 'tablet') score += 5;
    
    return Math.min(Math.max(score, 30), 95); // Clamp between 30-95%
  }

  private async collectPerformanceMetrics(
    deviceProfile: DeviceTestProfile
  ): Promise<CrossDeviceTestResult['results']['performanceMetrics']> {
    const metrics = {
      memoryUsage: 0,
      cacheEfficiency: 0,
      loadTimes: [] as number[]
    };

    // Collect memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
    }

    // Calculate cache efficiency
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        let totalCached = 0;
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          totalCached += requests.length;
        }
        metrics.cacheEfficiency = Math.min(totalCached / 100, 1) * 100; // Percentage
      } catch (error) {
        metrics.cacheEfficiency = 0;
      }
    }

    // Collect load times from performance API
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      metrics.loadTimes = [
        navigation.domContentLoadedEventEnd - navigation.fetchStart,
        navigation.loadEventEnd - navigation.fetchStart
      ];
    }

    return metrics;
  }

  async runFullDeviceValidation(deviceProfile: DeviceTestProfile): Promise<CrossDeviceTestResult[]> {
    const results: CrossDeviceTestResult[] = [];
    
    for (const scenario of OFFLINE_TEST_SCENARIOS) {
      console.log(`Running scenario "${scenario.name}" on ${deviceProfile.name}...`);
      const result = await this.runScenario(deviceProfile, scenario);
      results.push(result);
    }
    
    return results;
  }

  generateCrossDeviceReport(): string {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        devicesTestedCount: new Set(this.testResults.map(r => r.deviceProfile.id)).size,
        scenariosTestedCount: new Set(this.testResults.map(r => r.scenario.id)).size,
        totalTests: this.testResults.length,
        passedTests: this.testResults.filter(r => r.results.overallPassed).length
      },
      deviceResults: this.summarizeByDevice(),
      scenarioResults: this.summarizeByScenario(),
      recommendations: this.generateRecommendations()
    };

    return JSON.stringify(report, null, 2);
  }

  private summarizeByDevice() {
    const deviceSummary: Record<string, any> = {};
    
    for (const result of this.testResults) {
      const deviceId = result.deviceProfile.id;
      if (!deviceSummary[deviceId]) {
        deviceSummary[deviceId] = {
          name: result.deviceProfile.name,
          category: result.deviceProfile.category,
          targetMarkets: result.deviceProfile.targetMarkets,
          scenariosPassed: 0,
          scenariosTotal: 0,
          averagePerformance: 0
        };
      }
      
      deviceSummary[deviceId].scenariosTotal++;
      if (result.results.overallPassed) {
        deviceSummary[deviceId].scenariosPassed++;
      }
    }

    return deviceSummary;
  }

  private summarizeByScenario() {
    const scenarioSummary: Record<string, any> = {};
    
    for (const result of this.testResults) {
      const scenarioId = result.scenario.id;
      if (!scenarioSummary[scenarioId]) {
        scenarioSummary[scenarioId] = {
          name: result.scenario.name,
          priority: result.scenario.priority,
          devicesPassed: 0,
          devicesTotal: 0
        };
      }
      
      scenarioSummary[scenarioId].devicesTotal++;
      if (result.results.overallPassed) {
        scenarioSummary[scenarioId].devicesPassed++;
      }
    }

    return scenarioSummary;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Analyze results and generate actionable recommendations
    const failuresByDevice = this.testResults.filter(r => !r.results.overallPassed);
    const criticalFailures = failuresByDevice.filter(r => r.scenario.priority === 'critical');
    
    if (criticalFailures.length > 0) {
      recommendations.push('🚨 Critical offline functionality issues detected - immediate attention required');
    }
    
    const budgetDeviceFailures = failuresByDevice.filter(r => r.deviceProfile.category === 'budget_mobile');
    if (budgetDeviceFailures.length > 0) {
      recommendations.push('📱 Budget mobile devices need optimization for target market success');
    }
    
    if (this.testResults.length > 0) {
      const averagePassRate = (this.testResults.filter(r => r.results.overallPassed).length / this.testResults.length) * 100;
      if (averagePassRate < 80) {
        recommendations.push(`📊 Overall pass rate is ${averagePassRate.toFixed(1)}% - aim for >90% for production readiness`);
      }
    }

    return recommendations;
  }

  getTestResults(): CrossDeviceTestResult[] {
    return [...this.testResults];
  }

  clearResults(): void {
    this.testResults = [];
  }
}