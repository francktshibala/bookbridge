// Comprehensive offline experience validation system
// Tests all aspects of PWA offline functionality

export interface OfflineTest {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'caching' | 'ui' | 'sync' | 'performance';
  validate: () => Promise<OfflineTestResult>;
}

export interface OfflineTestResult {
  passed: boolean;
  result: string;
  details?: any;
  error?: string;
  performanceMetrics?: {
    duration: number;
    memoryUsage?: number;
  };
}

export interface DeviceCapabilities {
  hasServiceWorker: boolean;
  hasCacheAPI: boolean;
  hasIndexedDB: boolean;
  hasBackgroundSync: boolean;
  hasNotifications: boolean;
  storageQuota: number;
  memoryInfo?: {
    totalJSHeapSize: number;
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export interface OfflineValidationReport {
  timestamp: number;
  deviceInfo: {
    userAgent: string;
    viewport: { width: number; height: number };
    deviceType: 'mobile' | 'tablet' | 'desktop';
    os: string;
    browser: string;
    capabilities: DeviceCapabilities;
  };
  networkInfo: {
    isOnline: boolean;
    connectionType: string;
    effectiveType: string;
    downlink?: number;
    rtt?: number;
  };
  testResults: Record<string, OfflineTestResult>;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    successRate: number;
    categories: Record<string, { passed: number; total: number }>;
  };
}

export class OfflineExperienceValidator {
  private tests: OfflineTest[] = [
    // Core PWA Infrastructure Tests
    {
      id: 'service-worker-registration',
      name: 'Service Worker Registration',
      description: 'Verify service worker is properly registered and active',
      category: 'core',
      validate: async () => {
        const start = Date.now();
        try {
          if (!('serviceWorker' in navigator)) {
            return {
              passed: false,
              result: 'Service Worker API not supported',
              performanceMetrics: { duration: Date.now() - start }
            };
          }

          const registration = await navigator.serviceWorker.getRegistration();
          if (!registration) {
            return {
              passed: false,
              result: 'No service worker registration found',
              performanceMetrics: { duration: Date.now() - start }
            };
          }

          const isActive = registration.active !== null;
          const isControlling = navigator.serviceWorker.controller !== null;

          return {
            passed: isActive && isControlling,
            result: `Service Worker ${isActive ? 'active' : 'inactive'}, ${isControlling ? 'controlling' : 'not controlling'} page`,
            details: {
              scope: registration.scope,
              state: registration.active?.state,
              scriptURL: registration.active?.scriptURL
            },
            performanceMetrics: { duration: Date.now() - start }
          };
        } catch (error) {
          return {
            passed: false,
            result: 'Service Worker check failed',
            error: error instanceof Error ? error.message : String(error),
            performanceMetrics: { duration: Date.now() - start }
          };
        }
      }
    },

    {
      id: 'manifest-validation',
      name: 'PWA Manifest Validation',
      description: 'Validate PWA manifest configuration',
      category: 'core',
      validate: async () => {
        const start = Date.now();
        try {
          const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
          if (!manifestLink) {
            return {
              passed: false,
              result: 'No manifest link found in HTML',
              performanceMetrics: { duration: Date.now() - start }
            };
          }

          const response = await fetch(manifestLink.href);
          if (!response.ok) {
            return {
              passed: false,
              result: `Manifest fetch failed: ${response.status}`,
              performanceMetrics: { duration: Date.now() - start }
            };
          }

          const manifest = await response.json();
          const requiredFields = ['name', 'start_url', 'display', 'icons'];
          const missingFields = requiredFields.filter(field => !manifest[field]);

          const hasValidIcons = manifest.icons && 
            manifest.icons.some((icon: any) => icon.sizes && icon.src);

          return {
            passed: missingFields.length === 0 && hasValidIcons,
            result: missingFields.length === 0 && hasValidIcons 
              ? 'Manifest is valid and complete'
              : `Manifest issues: ${missingFields.join(', ')}${!hasValidIcons ? ', invalid icons' : ''}`,
            details: manifest,
            performanceMetrics: { duration: Date.now() - start }
          };
        } catch (error) {
          return {
            passed: false,
            result: 'Manifest validation failed',
            error: error instanceof Error ? error.message : String(error),
            performanceMetrics: { duration: Date.now() - start }
          };
        }
      }
    },

    // Caching System Tests
    {
      id: 'cache-api-functionality',
      name: 'Cache API Functionality',
      description: 'Test Cache API availability and basic operations',
      category: 'caching',
      validate: async () => {
        const start = Date.now();
        try {
          if (!('caches' in window)) {
            return {
              passed: false,
              result: 'Cache API not supported',
              performanceMetrics: { duration: Date.now() - start }
            };
          }

          // List all caches
          const cacheNames = await caches.keys();
          
          // Test cache operations with a temporary cache
          const testCacheName = 'validation-test-cache';
          const testCache = await caches.open(testCacheName);
          
          // Test storing and retrieving
          const testRequest = new Request('/test-cache-validation');
          const testResponse = new Response('test data', { status: 200 });
          
          await testCache.put(testRequest, testResponse);
          const retrievedResponse = await testCache.match(testRequest);
          
          // Cleanup
          await caches.delete(testCacheName);
          
          const cacheOperationsWork = !!(retrievedResponse && retrievedResponse.status === 200);

          return {
            passed: cacheOperationsWork,
            result: cacheOperationsWork 
              ? `Cache API working. Found ${cacheNames.length} caches`
              : 'Cache operations failed',
            details: {
              availableCaches: cacheNames,
              cacheCount: cacheNames.length
            },
            performanceMetrics: { duration: Date.now() - start }
          };
        } catch (error) {
          return {
            passed: false,
            result: 'Cache API test failed',
            error: error instanceof Error ? error.message : String(error),
            performanceMetrics: { duration: Date.now() - start }
          };
        }
      }
    },

    {
      id: 'audio-cache-validation',
      name: 'Audio Cache Validation',
      description: 'Verify audio files are cached and accessible offline',
      category: 'caching',
      validate: async () => {
        const start = Date.now();
        try {
          if (!('caches' in window)) {
            return {
              passed: false,
              result: 'Cache API not available',
              performanceMetrics: { duration: Date.now() - start }
            };
          }

          const audioCache = await caches.open('audio-cache');
          const cachedRequests = await audioCache.keys();
          const audioRequests = cachedRequests.filter(req => 
            req.url.includes('/audio/') || req.url.includes('.mp3') || req.url.includes('.wav')
          );

          // Test accessing cached audio
          let accessibleAudio = 0;
          for (const request of audioRequests.slice(0, 5)) { // Test first 5 for performance
            const response = await audioCache.match(request);
            if (response && response.ok) {
              accessibleAudio++;
            }
          }

          const hasAudioCache = audioRequests.length > 0;
          const audioAccessible = accessibleAudio > 0;

          return {
            passed: hasAudioCache && audioAccessible,
            result: hasAudioCache 
              ? `${audioRequests.length} audio files cached, ${accessibleAudio} accessible`
              : 'No audio files found in cache',
            details: {
              totalCachedRequests: cachedRequests.length,
              audioFilesCount: audioRequests.length,
              accessibleCount: accessibleAudio
            },
            performanceMetrics: { duration: Date.now() - start }
          };
        } catch (error) {
          return {
            passed: false,
            result: 'Audio cache validation failed',
            error: error instanceof Error ? error.message : String(error),
            performanceMetrics: { duration: Date.now() - start }
          };
        }
      }
    },

    {
      id: 'book-content-cache',
      name: 'Book Content Cache',
      description: 'Verify book content is stored for offline reading',
      category: 'caching',
      validate: async () => {
        const start = Date.now();
        try {
          // Check localStorage for cached books
          const cachedBooks = localStorage.getItem('cached_books');
          const bookList = cachedBooks ? JSON.parse(cachedBooks) : [];

          // Check IndexedDB if available
          let indexedDBContent = 0;
          if ('indexedDB' in window) {
            try {
              // This is a simplified check - in reality you'd open your specific DB
              const dbOpenRequest = indexedDB.open('bookbridge-db', 1);
              const db = await new Promise<IDBDatabase>((resolve, reject) => {
                dbOpenRequest.onsuccess = () => resolve(dbOpenRequest.result);
                dbOpenRequest.onerror = () => reject(dbOpenRequest.error);
              });
              
              if (db.objectStoreNames.contains('books')) {
                const transaction = db.transaction(['books'], 'readonly');
                const store = transaction.objectStore('books');
                const countRequest = store.count();
                indexedDBContent = await new Promise<number>((resolve, reject) => {
                  countRequest.onsuccess = () => resolve(countRequest.result);
                  countRequest.onerror = () => reject(countRequest.error);
                });
              }
              db.close();
            } catch (dbError) {
              // IndexedDB might not be set up yet, which is okay
            }
          }

          const totalContent = bookList.length + indexedDBContent;
          const hasContent = totalContent > 0;

          return {
            passed: hasContent,
            result: hasContent 
              ? `${totalContent} books cached (${bookList.length} in localStorage, ${indexedDBContent} in IndexedDB)`
              : 'No book content found in cache',
            details: {
              localStorageBooks: bookList.length,
              indexedDBBooks: indexedDBContent,
              totalBooks: totalContent
            },
            performanceMetrics: { duration: Date.now() - start }
          };
        } catch (error) {
          return {
            passed: false,
            result: 'Book content cache validation failed',
            error: error instanceof Error ? error.message : String(error),
            performanceMetrics: { duration: Date.now() - start }
          };
        }
      }
    },

    // UI/UX Tests
    {
      id: 'offline-indicators',
      name: 'Offline UI Indicators',
      description: 'Verify offline status indicators are present and functional',
      category: 'ui',
      validate: async () => {
        const start = Date.now();
        try {
          // Look for offline indicator elements
          const offlineIndicators = [
            document.querySelector('[data-offline-indicator]'),
            document.querySelector('[data-network-status]'),
            document.querySelector('.offline-indicator'),
            document.querySelector('.network-status'),
            document.querySelector('[class*="offline"]'),
            document.querySelector('[class*="network"]')
          ].filter(Boolean);

          // Check if any connection/status related text is visible
          const statusText = document.body.innerText.toLowerCase();
          const hasOfflineText = statusText.includes('offline') || 
                                statusText.includes('connection') ||
                                statusText.includes('network');

          const hasIndicators = offlineIndicators.length > 0;

          return {
            passed: hasIndicators || hasOfflineText,
            result: hasIndicators 
              ? `${offlineIndicators.length} offline indicators found`
              : hasOfflineText 
                ? 'Offline status text found'
                : 'No offline indicators detected',
            details: {
              indicatorCount: offlineIndicators.length,
              hasOfflineText
            },
            performanceMetrics: { duration: Date.now() - start }
          };
        } catch (error) {
          return {
            passed: false,
            result: 'UI indicators validation failed',
            error: error instanceof Error ? error.message : String(error),
            performanceMetrics: { duration: Date.now() - start }
          };
        }
      }
    },

    {
      id: 'offline-page-accessibility',
      name: 'Offline Page Accessibility',
      description: 'Test if offline fallback page is accessible',
      category: 'ui',
      validate: async () => {
        const start = Date.now();
        try {
          // Try to fetch the offline page
          const offlineResponse = await fetch('/offline');
          
          if (offlineResponse.ok) {
            const content = await offlineResponse.text();
            const hasContent = content.length > 100; // Basic content check
            
            return {
              passed: hasContent,
              result: hasContent 
                ? 'Offline page accessible and has content'
                : 'Offline page exists but appears empty',
              details: {
                status: offlineResponse.status,
                contentLength: content.length
              },
              performanceMetrics: { duration: Date.now() - start }
            };
          } else {
            return {
              passed: false,
              result: `Offline page returned status ${offlineResponse.status}`,
              performanceMetrics: { duration: Date.now() - start }
            };
          }
        } catch (error) {
          return {
            passed: false,
            result: 'Cannot access offline page',
            error: error instanceof Error ? error.message : String(error),
            performanceMetrics: { duration: Date.now() - start }
          };
        }
      }
    },

    // Background Sync Tests
    {
      id: 'background-sync-support',
      name: 'Background Sync Support',
      description: 'Verify Background Sync API is available and functional',
      category: 'sync',
      validate: async () => {
        const start = Date.now();
        try {
          const hasServiceWorker = 'serviceWorker' in navigator;
          const hasBackgroundSync = 'sync' in window.ServiceWorkerRegistration.prototype;
          
          if (!hasServiceWorker) {
            return {
              passed: false,
              result: 'Service Worker not supported',
              performanceMetrics: { duration: Date.now() - start }
            };
          }

          if (!hasBackgroundSync) {
            return {
              passed: false,
              result: 'Background Sync API not supported',
              performanceMetrics: { duration: Date.now() - start }
            };
          }

          // Test if we can register a sync
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            try {
              await (registration as any).sync.register('test-sync');
              return {
                passed: true,
                result: 'Background Sync is supported and functional',
                performanceMetrics: { duration: Date.now() - start }
              };
            } catch (syncError) {
              return {
                passed: false,
                result: 'Background Sync registration failed',
                error: syncError instanceof Error ? syncError.message : String(syncError),
                performanceMetrics: { duration: Date.now() - start }
              };
            }
          } else {
            return {
              passed: false,
              result: 'No service worker registration for sync',
              performanceMetrics: { duration: Date.now() - start }
            };
          }
        } catch (error) {
          return {
            passed: false,
            result: 'Background sync validation failed',
            error: error instanceof Error ? error.message : String(error),
            performanceMetrics: { duration: Date.now() - start }
          };
        }
      }
    },

    // Performance Tests
    {
      id: 'storage-quota',
      name: 'Storage Quota Management',
      description: 'Check storage quota and usage for offline content',
      category: 'performance',
      validate: async () => {
        const start = Date.now();
        try {
          if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
            return {
              passed: false,
              result: 'Storage Quota API not supported',
              performanceMetrics: { duration: Date.now() - start }
            };
          }

          const estimate = await navigator.storage.estimate();
          const usedBytes = estimate.usage || 0;
          const quotaBytes = estimate.quota || 0;
          const usedMB = Math.round(usedBytes / (1024 * 1024));
          const quotaMB = Math.round(quotaBytes / (1024 * 1024));
          const usagePercent = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;

          // Consider it passing if we have reasonable quota (>10MB) and not near limit (<90%)
          const hasReasonableQuota = quotaMB > 10;
          const notNearLimit = usagePercent < 90;

          return {
            passed: hasReasonableQuota && notNearLimit,
            result: `Storage: ${usedMB}MB used / ${quotaMB}MB available (${usagePercent.toFixed(1)}% used)`,
            details: {
              usedBytes,
              quotaBytes,
              usedMB,
              quotaMB,
              usagePercent
            },
            performanceMetrics: { duration: Date.now() - start }
          };
        } catch (error) {
          return {
            passed: false,
            result: 'Storage quota check failed',
            error: error instanceof Error ? error.message : String(error),
            performanceMetrics: { duration: Date.now() - start }
          };
        }
      }
    }
  ];

  private async getDeviceCapabilities(): Promise<DeviceCapabilities> {
    const capabilities: DeviceCapabilities = {
      hasServiceWorker: 'serviceWorker' in navigator,
      hasCacheAPI: 'caches' in window,
      hasIndexedDB: 'indexedDB' in window,
      hasBackgroundSync: 'sync' in window.ServiceWorkerRegistration.prototype,
      hasNotifications: 'Notification' in window,
      storageQuota: 0
    };

    // Get storage quota
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        capabilities.storageQuota = Math.round((estimate.quota || 0) / (1024 * 1024)); // MB
      } catch (error) {
        console.warn('Could not estimate storage quota:', error);
      }
    }

    // Get memory info if available (Chrome)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      capabilities.memoryInfo = {
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }

    return capabilities;
  }

  private getDeviceInfo() {
    const userAgent = navigator.userAgent;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (viewport.width <= 768) deviceType = 'mobile';
    else if (viewport.width <= 1024) deviceType = 'tablet';

    const os = /Mac/.test(userAgent) ? 'macOS' : 
               /Windows/.test(userAgent) ? 'Windows' :
               /Android/.test(userAgent) ? 'Android' :
               /iPhone|iPad/.test(userAgent) ? 'iOS' : 'Unknown';

    const browser = /Chrome/.test(userAgent) ? 'Chrome' :
                   /Firefox/.test(userAgent) ? 'Firefox' :
                   /Safari/.test(userAgent) && !/Chrome/.test(userAgent) ? 'Safari' :
                   /Edge/.test(userAgent) ? 'Edge' : 'Unknown';

    return { userAgent, viewport, deviceType, os, browser };
  }

  private getNetworkInfo() {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      isOnline: navigator.onLine,
      connectionType: connection ? connection.type || 'unknown' : 'unknown',
      effectiveType: connection ? connection.effectiveType || 'unknown' : 'unknown',
      downlink: connection ? connection.downlink : undefined,
      rtt: connection ? connection.rtt : undefined
    };
  }

  async runTest(testId: string): Promise<OfflineTestResult> {
    const test = this.tests.find(t => t.id === testId);
    if (!test) {
      return {
        passed: false,
        result: 'Test not found',
        error: `No test with id: ${testId}`
      };
    }

    try {
      return await test.validate();
    } catch (error) {
      return {
        passed: false,
        result: 'Test execution failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async runAllTests(): Promise<OfflineValidationReport> {
    const deviceInfo = {
      ...this.getDeviceInfo(),
      capabilities: await this.getDeviceCapabilities()
    };
    
    const networkInfo = this.getNetworkInfo();
    
    const testResults: Record<string, OfflineTestResult> = {};
    
    // Run all tests
    for (const test of this.tests) {
      testResults[test.id] = await this.runTest(test.id);
    }

    // Calculate summary
    const totalTests = this.tests.length;
    const passed = Object.values(testResults).filter(r => r.passed).length;
    const failed = totalTests - passed;
    const successRate = totalTests > 0 ? (passed / totalTests) * 100 : 0;

    // Calculate category-wise results
    const categories: Record<string, { passed: number; total: number }> = {};
    for (const test of this.tests) {
      if (!categories[test.category]) {
        categories[test.category] = { passed: 0, total: 0 };
      }
      categories[test.category].total++;
      if (testResults[test.id].passed) {
        categories[test.category].passed++;
      }
    }

    return {
      timestamp: Date.now(),
      deviceInfo,
      networkInfo,
      testResults,
      summary: {
        totalTests,
        passed,
        failed,
        successRate,
        categories
      }
    };
  }

  getTests(): OfflineTest[] {
    return [...this.tests];
  }

  getTestsByCategory(category: string): OfflineTest[] {
    return this.tests.filter(test => test.category === category);
  }

}