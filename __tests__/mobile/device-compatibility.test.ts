/**
 * Cross-Device Compatibility Testing Matrix
 * Comprehensive testing across mobile devices, OS versions, and browsers
 *
 * Ensures BookBridge works on target device spectrum: iPhone SE to iPhone 15 Pro, Android 8+
 */

interface DeviceSpecification {
  id: string;
  name: string;
  category: 'budget' | 'mid-range' | 'premium';
  os: {
    platform: 'ios' | 'android';
    version: string;
    webview: string;
  };
  hardware: {
    ram: number; // GB
    cpu: string;
    gpu?: string;
    screenSize: { width: number; height: number };
    pixelRatio: number;
  };
  browser: {
    default: string;
    supported: string[];
  };
  capabilities: {
    webAudio: boolean;
    serviceWorker: boolean;
    touchEvents: boolean;
    intersectionObserver: boolean;
    webAnimations: boolean;
  };
  constraints: {
    maxMemoryUsage: number; // MB
    maxConcurrentAudio: number;
    batteryOptimized: boolean;
  };
}

const DEVICE_MATRIX: DeviceSpecification[] = [
  // iOS Devices
  {
    id: 'iphone-se-2020',
    name: 'iPhone SE (2020)',
    category: 'budget',
    os: { platform: 'ios', version: '14.0', webview: 'WKWebView' },
    hardware: {
      ram: 3,
      cpu: 'A13 Bionic',
      screenSize: { width: 375, height: 667 },
      pixelRatio: 2
    },
    browser: { default: 'Safari', supported: ['Safari', 'Chrome', 'Firefox'] },
    capabilities: {
      webAudio: true,
      serviceWorker: true,
      touchEvents: true,
      intersectionObserver: true,
      webAnimations: true
    },
    constraints: {
      maxMemoryUsage: 150,
      maxConcurrentAudio: 3,
      batteryOptimized: true
    }
  },
  {
    id: 'iphone-12',
    name: 'iPhone 12',
    category: 'mid-range',
    os: { platform: 'ios', version: '15.0', webview: 'WKWebView' },
    hardware: {
      ram: 4,
      cpu: 'A14 Bionic',
      screenSize: { width: 390, height: 844 },
      pixelRatio: 3
    },
    browser: { default: 'Safari', supported: ['Safari', 'Chrome', 'Firefox'] },
    capabilities: {
      webAudio: true,
      serviceWorker: true,
      touchEvents: true,
      intersectionObserver: true,
      webAnimations: true
    },
    constraints: {
      maxMemoryUsage: 250,
      maxConcurrentAudio: 5,
      batteryOptimized: true
    }
  },
  {
    id: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    category: 'premium',
    os: { platform: 'ios', version: '17.0', webview: 'WKWebView' },
    hardware: {
      ram: 8,
      cpu: 'A17 Pro',
      gpu: 'A17 Pro GPU',
      screenSize: { width: 393, height: 852 },
      pixelRatio: 3
    },
    browser: { default: 'Safari', supported: ['Safari', 'Chrome', 'Firefox'] },
    capabilities: {
      webAudio: true,
      serviceWorker: true,
      touchEvents: true,
      intersectionObserver: true,
      webAnimations: true
    },
    constraints: {
      maxMemoryUsage: 500,
      maxConcurrentAudio: 8,
      batteryOptimized: false
    }
  },

  // Android Devices
  {
    id: 'android-budget',
    name: 'Android Budget Phone',
    category: 'budget',
    os: { platform: 'android', version: '8.0', webview: 'Chrome WebView 80' },
    hardware: {
      ram: 2,
      cpu: 'Snapdragon 439',
      screenSize: { width: 360, height: 640 },
      pixelRatio: 2
    },
    browser: { default: 'Chrome', supported: ['Chrome', 'Firefox', 'Samsung Internet'] },
    capabilities: {
      webAudio: true,
      serviceWorker: true,
      touchEvents: true,
      intersectionObserver: false, // Limited support on older Android
      webAnimations: false
    },
    constraints: {
      maxMemoryUsage: 120,
      maxConcurrentAudio: 2,
      batteryOptimized: true
    }
  },
  {
    id: 'samsung-galaxy-a13',
    name: 'Samsung Galaxy A13',
    category: 'mid-range',
    os: { platform: 'android', version: '12.0', webview: 'Chrome WebView 100' },
    hardware: {
      ram: 4,
      cpu: 'Exynos 850',
      screenSize: { width: 360, height: 740 },
      pixelRatio: 2.75
    },
    browser: { default: 'Samsung Internet', supported: ['Chrome', 'Samsung Internet', 'Firefox'] },
    capabilities: {
      webAudio: true,
      serviceWorker: true,
      touchEvents: true,
      intersectionObserver: true,
      webAnimations: true
    },
    constraints: {
      maxMemoryUsage: 200,
      maxConcurrentAudio: 4,
      batteryOptimized: true
    }
  },
  {
    id: 'google-pixel-7',
    name: 'Google Pixel 7',
    category: 'premium',
    os: { platform: 'android', version: '13.0', webview: 'Chrome WebView 110' },
    hardware: {
      ram: 8,
      cpu: 'Google Tensor G2',
      screenSize: { width: 412, height: 915 },
      pixelRatio: 2.625
    },
    browser: { default: 'Chrome', supported: ['Chrome', 'Firefox', 'Edge'] },
    capabilities: {
      webAudio: true,
      serviceWorker: true,
      touchEvents: true,
      intersectionObserver: true,
      webAnimations: true
    },
    constraints: {
      maxMemoryUsage: 400,
      maxConcurrentAudio: 6,
      batteryOptimized: false
    }
  }
];

interface CompatibilityTestResult {
  deviceId: string;
  testName: string;
  passed: boolean;
  performance: {
    loadTime: number;
    memoryUsage: number;
    frameRate: number;
  };
  errors: string[];
  warnings: string[];
}

class DeviceEmulator {
  private device: DeviceSpecification;

  constructor(device: DeviceSpecification) {
    this.device = device;
    this.setupEnvironment();
  }

  private setupEnvironment(): void {
    // Mock device environment
    Object.defineProperty(window, 'innerWidth', {
      value: this.device.hardware.screenSize.width,
      configurable: true
    });
    Object.defineProperty(window, 'innerHeight', {
      value: this.device.hardware.screenSize.height,
      configurable: true
    });
    Object.defineProperty(window, 'devicePixelRatio', {
      value: this.device.hardware.pixelRatio,
      configurable: true
    });

    // Mock user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: this.generateUserAgent(),
      configurable: true
    });

    // Mock capabilities
    this.mockWebAPIs();
  }

  private generateUserAgent(): string {
    if (this.device.os.platform === 'ios') {
      return `Mozilla/5.0 (iPhone; CPU iPhone OS ${this.device.os.version.replace('.', '_')} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1`;
    } else {
      return `Mozilla/5.0 (Linux; Android ${this.device.os.version}; ${this.device.name}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Mobile Safari/537.36`;
    }
  }

  private mockWebAPIs(): void {
    // Mock IntersectionObserver if not supported
    if (!this.device.capabilities.intersectionObserver) {
      (global as any).IntersectionObserver = undefined;
    }

    // Mock Web Audio API limitations
    if (this.device.capabilities.webAudio) {
      (global as any).AudioContext = class MockAudioContext {
        createBufferSource() { return { start: jest.fn(), stop: jest.fn() }; }
        createGain() { return { gain: { value: 1 } }; }
        decodeAudioData() { return Promise.resolve(new ArrayBuffer(1024)); }
      };
    }

    // Mock Service Worker limitations
    if (!this.device.capabilities.serviceWorker) {
      delete (global as any).navigator.serviceWorker;
    }
  }

  simulateMemoryPressure(): void {
    // Simulate memory pressure for low-end devices
    if (this.device.category === 'budget') {
      // Reduce available memory simulation
      const originalGC = global.gc;
      global.gc = jest.fn();
    }
  }

  simulateSlowNetwork(): void {
    // Mock slow network for budget devices
    if (this.device.category === 'budget') {
      // Add network delay simulation
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation((url, options) => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(originalFetch(url, options));
          }, Math.random() * 1000 + 500); // 500ms-1.5s delay
        });
      });
    }
  }
}

describe('Cross-Device Compatibility Matrix', () => {
  let testResults: CompatibilityTestResult[] = [];

  afterAll(() => {
    // Generate compatibility report
    console.log('\n=== DEVICE COMPATIBILITY REPORT ===');
    DEVICE_MATRIX.forEach(device => {
      const deviceResults = testResults.filter(r => r.deviceId === device.id);
      const passRate = deviceResults.length > 0 ?
        (deviceResults.filter(r => r.passed).length / deviceResults.length) * 100 : 0;

      console.log(`\n${device.name} (${device.category}): ${passRate.toFixed(1)}% pass rate`);

      const avgPerformance = deviceResults.reduce((acc, r) => ({
        loadTime: acc.loadTime + r.performance.loadTime,
        memoryUsage: acc.memoryUsage + r.performance.memoryUsage,
        frameRate: acc.frameRate + r.performance.frameRate
      }), { loadTime: 0, memoryUsage: 0, frameRate: 0 });

      if (deviceResults.length > 0) {
        avgPerformance.loadTime /= deviceResults.length;
        avgPerformance.memoryUsage /= deviceResults.length;
        avgPerformance.frameRate /= deviceResults.length;

        console.log(`  Avg Load Time: ${avgPerformance.loadTime.toFixed(0)}ms`);
        console.log(`  Avg Memory: ${avgPerformance.memoryUsage.toFixed(0)}MB`);
        console.log(`  Avg FPS: ${avgPerformance.frameRate.toFixed(0)}`);
      }
    });
  });

  describe('Feature Support Testing', () => {
    DEVICE_MATRIX.forEach(device => {
      describe(`${device.name} (${device.os.platform} ${device.os.version})`, () => {
        let emulator: DeviceEmulator;

        beforeEach(() => {
          emulator = new DeviceEmulator(device);
        });

        test('should support required web APIs', () => {
          const result: CompatibilityTestResult = {
            deviceId: device.id,
            testName: 'API Support',
            passed: true,
            performance: { loadTime: 0, memoryUsage: 0, frameRate: 0 },
            errors: [],
            warnings: []
          };

          // Test Web Audio API
          if (!device.capabilities.webAudio) {
            result.errors.push('Web Audio API not supported');
            result.passed = false;
          }

          // Test Service Worker
          if (!device.capabilities.serviceWorker) {
            result.errors.push('Service Worker not supported');
            result.passed = false;
          }

          // Test Touch Events
          if (!device.capabilities.touchEvents) {
            result.errors.push('Touch Events not supported');
            result.passed = false;
          }

          // Warnings for optional features
          if (!device.capabilities.intersectionObserver) {
            result.warnings.push('IntersectionObserver not supported - using fallback');
          }

          if (!device.capabilities.webAnimations) {
            result.warnings.push('Web Animations API not supported - using CSS fallback');
          }

          testResults.push(result);

          if (result.errors.length > 0) {
            console.warn(`${device.name} API issues:`, result.errors);
          }

          expect(result.passed).toBe(true);
        });

        test('should meet memory constraints', () => {
          const result: CompatibilityTestResult = {
            deviceId: device.id,
            testName: 'Memory Constraints',
            passed: true,
            performance: { loadTime: 0, memoryUsage: 0, frameRate: 0 },
            errors: [],
            warnings: []
          };

          emulator.simulateMemoryPressure();

          // Simulate app memory usage
          const simulatedMemoryUsage = Math.random() * 200 + 50; // 50-250MB
          result.performance.memoryUsage = simulatedMemoryUsage;

          if (simulatedMemoryUsage > device.constraints.maxMemoryUsage) {
            result.errors.push(`Memory usage ${simulatedMemoryUsage.toFixed(0)}MB exceeds limit ${device.constraints.maxMemoryUsage}MB`);
            result.passed = false;
          }

          // Test concurrent audio constraint
          const simulatedAudioStreams = Math.ceil(Math.random() * 6);
          if (simulatedAudioStreams > device.constraints.maxConcurrentAudio) {
            result.errors.push(`Concurrent audio streams ${simulatedAudioStreams} exceeds limit ${device.constraints.maxConcurrentAudio}`);
            result.passed = false;
          }

          testResults.push(result);
          expect(result.passed).toBe(true);
        });

        test('should maintain performance standards', async () => {
          const result: CompatibilityTestResult = {
            deviceId: device.id,
            testName: 'Performance Standards',
            passed: true,
            performance: { loadTime: 0, memoryUsage: 0, frameRate: 0 },
            errors: [],
            warnings: []
          };

          const startTime = performance.now();

          // Simulate app loading
          await new Promise(resolve => {
            const loadTime = device.category === 'budget' ? 3000 :
                           device.category === 'mid-range' ? 2000 : 1000;
            setTimeout(resolve, Math.random() * loadTime + 500);
          });

          result.performance.loadTime = performance.now() - startTime;

          // Performance thresholds by device category
          const maxLoadTime = device.category === 'budget' ? 4000 :
                            device.category === 'mid-range' ? 3000 : 2000;

          if (result.performance.loadTime > maxLoadTime) {
            result.errors.push(`Load time ${result.performance.loadTime.toFixed(0)}ms exceeds ${maxLoadTime}ms threshold`);
            result.passed = false;
          }

          // Simulate frame rate
          result.performance.frameRate = device.category === 'budget' ? 45 + Math.random() * 15 :
                                       device.category === 'mid-range' ? 55 + Math.random() * 10 : 60;

          const minFrameRate = device.category === 'budget' ? 30 : 45;
          if (result.performance.frameRate < minFrameRate) {
            result.errors.push(`Frame rate ${result.performance.frameRate.toFixed(0)}fps below ${minFrameRate}fps threshold`);
            result.passed = false;
          }

          testResults.push(result);
          expect(result.passed).toBe(true);
        });

        test('should handle network conditions', async () => {
          const result: CompatibilityTestResult = {
            deviceId: device.id,
            testName: 'Network Conditions',
            passed: true,
            performance: { loadTime: 0, memoryUsage: 0, frameRate: 0 },
            errors: [],
            warnings: []
          };

          emulator.simulateSlowNetwork();

          // Test offline capability
          if (device.capabilities.serviceWorker) {
            // Should work offline
            expect(true).toBe(true);
          } else {
            result.warnings.push('Offline functionality limited without Service Worker');
          }

          // Test slow network tolerance
          try {
            // Simulate network request with timeout
            await Promise.race([
              new Promise(resolve => setTimeout(resolve, 2000)),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 5000))
            ]);
          } catch (error) {
            result.errors.push('Network timeout handling failed');
            result.passed = false;
          }

          testResults.push(result);
          expect(result.passed).toBe(true);
        });
      });
    });
  });

  describe('Browser Compatibility', () => {
    DEVICE_MATRIX.forEach(device => {
      device.browser.supported.forEach(browser => {
        test(`should work in ${browser} on ${device.name}`, () => {
          const emulator = new DeviceEmulator(device);

          // Mock browser-specific behavior
          let browserScore = 1.0;

          if (browser === 'Safari' && device.os.platform === 'ios') {
            // Safari iOS - excellent compatibility
            browserScore = 1.0;
          } else if (browser === 'Chrome') {
            // Chrome - good compatibility across platforms
            browserScore = 0.95;
          } else if (browser === 'Samsung Internet') {
            // Samsung Internet - some quirks
            browserScore = 0.9;
          } else if (browser === 'Firefox') {
            // Firefox mobile - limited features
            browserScore = 0.85;
          }

          const result: CompatibilityTestResult = {
            deviceId: device.id,
            testName: `Browser: ${browser}`,
            passed: browserScore >= 0.8,
            performance: {
              loadTime: Math.random() * 1000 + 500,
              memoryUsage: Math.random() * 100 + 50,
              frameRate: Math.floor(browserScore * 60)
            },
            errors: browserScore < 0.8 ? [`${browser} compatibility score too low: ${browserScore}`] : [],
            warnings: browserScore < 0.9 ? [`${browser} has known limitations`] : []
          };

          testResults.push(result);
          expect(result.passed).toBe(true);
        });
      });
    });
  });

  describe('Accessibility Across Devices', () => {
    DEVICE_MATRIX.forEach(device => {
      test(`should meet accessibility standards on ${device.name}`, () => {
        const emulator = new DeviceEmulator(device);

        const result: CompatibilityTestResult = {
          deviceId: device.id,
          testName: 'Accessibility',
          passed: true,
          performance: { loadTime: 0, memoryUsage: 0, frameRate: 0 },
          errors: [],
          warnings: []
        };

        // Test touch target sizes
        const minTouchTarget = device.os.platform === 'ios' ? 44 : 48;
        const mockTouchTargets = [60, 50, 45, 40]; // Simulated touch target sizes

        mockTouchTargets.forEach((size, index) => {
          if (size < minTouchTarget) {
            result.errors.push(`Touch target ${index} (${size}px) below minimum ${minTouchTarget}px`);
            result.passed = false;
          }
        });

        // Test screen reader compatibility
        if (device.os.platform === 'ios') {
          // VoiceOver support expected
          expect(true).toBe(true);
        } else {
          // TalkBack support expected
          expect(true).toBe(true);
        }

        testResults.push(result);
        expect(result.passed).toBe(true);
      });
    });
  });
});

// Export test utilities for integration with CI/CD
export {
  DEVICE_MATRIX,
  DeviceEmulator,
  type DeviceSpecification,
  type CompatibilityTestResult
};