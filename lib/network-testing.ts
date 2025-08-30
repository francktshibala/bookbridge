// Network Testing Utilities for PWA Performance
// Simulates 2G/3G network conditions and measures performance

export interface NetworkCondition {
  name: string;
  downloadSpeed: number; // in Mbps
  uploadSpeed: number; // in Mbps
  latency: number; // in ms
  packetLoss?: number; // percentage
}

export const NETWORK_CONDITIONS: Record<string, NetworkCondition> = {
  // Target market network conditions based on real-world data
  '2G_EDGE': {
    name: '2G EDGE (Kenya/Nigeria rural)',
    downloadSpeed: 0.15, // 150 kbps
    uploadSpeed: 0.05,
    latency: 300,
    packetLoss: 2
  },
  '2G_GPRS': {
    name: '2G GPRS (Bangladesh/Philippines)',
    downloadSpeed: 0.05, // 50 kbps
    uploadSpeed: 0.02,
    latency: 500,
    packetLoss: 5
  },
  '3G_SLOW': {
    name: '3G Slow (India/Indonesia urban)',
    downloadSpeed: 0.4, // 400 kbps
    uploadSpeed: 0.1,
    latency: 200,
    packetLoss: 1
  },
  '3G_GOOD': {
    name: '3G Good (Mexico/Colombia)',
    downloadSpeed: 1.5, // 1.5 Mbps
    uploadSpeed: 0.5,
    latency: 100,
    packetLoss: 0.5
  },
  '4G_SLOW': {
    name: '4G Slow (Egypt/Vietnam)',
    downloadSpeed: 3, // 3 Mbps
    uploadSpeed: 1,
    latency: 50,
    packetLoss: 0.1
  },
  'WIFI': {
    name: 'WiFi (Reference)',
    downloadSpeed: 50,
    uploadSpeed: 10,
    latency: 20,
    packetLoss: 0
  }
};

export interface PerformanceMetrics {
  networkCondition: string;
  timestamp: number;
  metrics: {
    // Core Web Vitals
    fcp?: number; // First Contentful Paint
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
    ttfb?: number; // Time to First Byte
    
    // PWA-specific metrics
    swRegistration?: number; // Service Worker registration time
    cacheHitRate?: number; // Percentage of resources from cache
    offlineCapability?: boolean; // Can function offline
    installPromptShown?: number; // Time until install prompt eligible
    
    // Audio-specific metrics
    audioLoadTime?: number; // Time to load audio
    audioBufferTime?: number; // Time to buffer enough for playback
    audioQuality?: string; // Selected quality based on network
    
    // Resource metrics
    totalTransferred?: number; // Total bytes transferred
    cachedResources?: number; // Number of cached resources
    failedRequests?: number; // Number of failed requests
  };
  errors?: string[];
}

export class NetworkTester {
  private performanceObserver?: PerformanceObserver;
  private metrics: PerformanceMetrics;
  
  constructor(networkCondition: string) {
    this.metrics = {
      networkCondition,
      timestamp: Date.now(),
      metrics: {},
      errors: []
    };
  }
  
  // Start monitoring performance
  startMonitoring() {
    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.metrics.fcp = entry.startTime;
            }
          } else if (entry.entryType === 'largest-contentful-paint') {
            this.metrics.metrics.lcp = entry.startTime;
          } else if (entry.entryType === 'first-input') {
            this.metrics.metrics.fid = (entry as any).processingStart - entry.startTime;
          } else if (entry.entryType === 'layout-shift') {
            this.metrics.metrics.cls = (this.metrics.metrics.cls || 0) + (entry as any).value;
          }
        }
      });
      
      this.performanceObserver.observe({
        entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift']
      });
    }
    
    // Monitor Service Worker
    if ('serviceWorker' in navigator) {
      const swStart = performance.now();
      navigator.serviceWorker.ready.then(() => {
        this.metrics.metrics.swRegistration = performance.now() - swStart;
      });
    }
    
    // Monitor resource loading
    this.monitorResourceLoading();
  }
  
  // Monitor resource loading and cache usage
  private monitorResourceLoading() {
    let totalTransferred = 0;
    let cachedCount = 0;
    let failedCount = 0;
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Check if from cache (transferSize === 0)
          if (resourceEntry.transferSize === 0 && resourceEntry.decodedBodySize > 0) {
            cachedCount++;
          } else {
            totalTransferred += resourceEntry.transferSize || 0;
          }
          
          // Check for failed requests
          if (resourceEntry.responseStatus >= 400) {
            failedCount++;
          }
        }
      }
      
      this.metrics.metrics.totalTransferred = totalTransferred;
      this.metrics.metrics.cachedResources = cachedCount;
      this.metrics.metrics.failedRequests = failedCount;
    });
    
    observer.observe({ entryTypes: ['resource'] });
  }
  
  // Test audio loading performance
  async testAudioLoading(audioUrl: string): Promise<void> {
    const startTime = performance.now();
    
    try {
      const audio = new Audio();
      
      // Monitor buffering
      let bufferStart: number | null = null;
      audio.addEventListener('loadstart', () => {
        bufferStart = performance.now();
      });
      
      audio.addEventListener('canplay', () => {
        if (bufferStart) {
          this.metrics.metrics.audioBufferTime = performance.now() - bufferStart;
        }
      });
      
      audio.addEventListener('loadeddata', () => {
        this.metrics.metrics.audioLoadTime = performance.now() - startTime;
      });
      
      audio.src = audioUrl;
      audio.load();
      
      // Determine audio quality based on network
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        this.metrics.metrics.audioQuality = this.getAudioQualityForNetwork(effectiveType);
      }
      
    } catch (error) {
      this.metrics.errors?.push(`Audio loading failed: ${error}`);
    }
  }
  
  // Get recommended audio quality for network type
  private getAudioQualityForNetwork(effectiveType: string): string {
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return '24kbps-opus';
      case '3g':
        return '48kbps-opus';
      case '4g':
        return '96kbps-aac';
      default:
        return '128kbps-aac';
    }
  }
  
  // Test offline capability
  async testOfflineCapability(): Promise<void> {
    try {
      // Go offline
      if ('onLine' in navigator) {
        // Simulate offline by checking cache availability
        const cache = await caches.open('bookbridge-v1');
        const cachedRequests = await cache.keys();
        
        this.metrics.metrics.offlineCapability = cachedRequests.length > 0;
        
        // Calculate cache hit rate
        const totalResources = performance.getEntriesByType('resource').length;
        const cacheHitRate = (this.metrics.metrics.cachedResources || 0) / totalResources;
        this.metrics.metrics.cacheHitRate = Math.round(cacheHitRate * 100);
      }
    } catch (error) {
      this.metrics.errors?.push(`Offline test failed: ${error}`);
    }
  }
  
  // Get final metrics
  getMetrics(): PerformanceMetrics {
    // Add TTFB
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navEntry) {
      this.metrics.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
    }
    
    return this.metrics;
  }
  
  // Stop monitoring
  stopMonitoring() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Network throttling simulator (for development)
export class NetworkThrottler {
  private originalFetch: typeof fetch;
  private condition: NetworkCondition;
  
  constructor(condition: NetworkCondition) {
    this.originalFetch = window.fetch;
    this.condition = condition;
  }
  
  // Enable throttling
  enable() {
    const condition = this.condition;
    const originalFetch = this.originalFetch;
    
    // Override fetch to simulate network conditions
    (window as any).fetch = async function(...args: Parameters<typeof fetch>) {
      const startTime = Date.now();
      
      // Simulate latency
      await new Promise(resolve => setTimeout(resolve, condition.latency));
      
      // Simulate packet loss
      if (condition.packetLoss && Math.random() * 100 < condition.packetLoss) {
        throw new Error('Network packet loss simulation');
      }
      
      // Make actual request
      const response = await originalFetch(...args);
      
      // Simulate download speed throttling
      if (response.body) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        
        // Read at throttled speed
        const bytesPerMs = (condition.downloadSpeed * 1024 * 1024) / (8 * 1000);
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          
          // Simulate download delay based on chunk size
          const downloadTime = value.length / bytesPerMs;
          await new Promise(resolve => setTimeout(resolve, downloadTime));
        }
        
        // Reconstruct response
        const fullData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          fullData.set(chunk, offset);
          offset += chunk.length;
        }
        
        return new Response(fullData, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }
      
      return response;
    };
  }
  
  // Disable throttling
  disable() {
    window.fetch = this.originalFetch;
  }
}

// Performance report generator
export function generatePerformanceReport(metrics: PerformanceMetrics[]): string {
  let report = '# PWA Network Performance Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  for (const metric of metrics) {
    report += `## ${NETWORK_CONDITIONS[metric.networkCondition]?.name || metric.networkCondition}\n\n`;
    
    // Core Web Vitals
    report += '### Core Web Vitals\n';
    report += `- FCP: ${metric.metrics.fcp?.toFixed(0)}ms\n`;
    report += `- LCP: ${metric.metrics.lcp?.toFixed(0)}ms\n`;
    report += `- FID: ${metric.metrics.fid?.toFixed(0)}ms\n`;
    report += `- CLS: ${metric.metrics.cls?.toFixed(3)}\n`;
    report += `- TTFB: ${metric.metrics.ttfb?.toFixed(0)}ms\n\n`;
    
    // PWA Metrics
    report += '### PWA Performance\n';
    report += `- Service Worker Registration: ${metric.metrics.swRegistration?.toFixed(0)}ms\n`;
    report += `- Cache Hit Rate: ${metric.metrics.cacheHitRate}%\n`;
    report += `- Offline Capable: ${metric.metrics.offlineCapability ? 'Yes' : 'No'}\n\n`;
    
    // Audio Performance
    report += '### Audio Performance\n';
    report += `- Load Time: ${metric.metrics.audioLoadTime?.toFixed(0)}ms\n`;
    report += `- Buffer Time: ${metric.metrics.audioBufferTime?.toFixed(0)}ms\n`;
    report += `- Quality Selected: ${metric.metrics.audioQuality}\n\n`;
    
    // Resource Usage
    report += '### Resource Usage\n';
    report += `- Total Transferred: ${(metric.metrics.totalTransferred || 0) / 1024}KB\n`;
    report += `- Cached Resources: ${metric.metrics.cachedResources}\n`;
    report += `- Failed Requests: ${metric.metrics.failedRequests}\n\n`;
    
    if (metric.errors?.length) {
      report += '### Errors\n';
      metric.errors.forEach(error => report += `- ${error}\n`);
      report += '\n';
    }
  }
  
  return report;
}