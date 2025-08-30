/**
 * Dynamic Storage Quota Management for BookBridge PWA
 * Implements intelligent storage allocation with device capability detection
 * Research findings: Network-adaptive quotas (50MB-1GB) with user behavior adjustments
 */

import { audioCacheDB, NetworkType, CachePriority } from './audio-cache-db';
import { priorityCacheEviction } from './priority-cache-eviction';

interface DeviceCapabilities {
  totalRAM: number; // MB
  availableStorage: number; // MB  
  isLowEndDevice: boolean;
  supportsPersistentStorage: boolean;
  estimatedStorageQuota: number; // MB
  browserStorageQuota: number; // MB from Storage API
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
}

interface StorageQuota {
  total: number; // Total allocated quota in bytes
  reserved: number; // Reserved space for urgent operations
  audioCache: number; // Main audio cache allocation
  metadata: number; // Metadata and indexes
  temporary: number; // Temporary/working space
  userContent: number; // User-generated content (bookmarks, notes)
}

interface QuotaAdjustment {
  reason: string;
  previousQuota: number;
  newQuota: number;
  timestamp: number;
  triggerMetric: string;
  confidence: number; // 0-1, how confident we are in this adjustment
}

interface StorageUsageAnalysis {
  utilizationRatio: number; // 0-1
  growthRate: number; // MB per day
  accessPatterns: {
    activeBooks: number;
    averageSessionDuration: number; // minutes
    dailyUsage: number; // hours
  };
  recommendations: {
    suggestedQuota: number;
    reasoning: string[];
    urgency: 'low' | 'medium' | 'high';
  };
}

export class DynamicStorageQuotaService {
  private static instance: DynamicStorageQuotaService;
  private deviceCapabilities: DeviceCapabilities | null = null;
  private currentQuota: StorageQuota | null = null;
  private quotaHistory: QuotaAdjustment[] = [];
  private lastAnalysis: StorageUsageAnalysis | null = null;
  private isInitialized = false;

  static getInstance(): DynamicStorageQuotaService {
    if (!DynamicStorageQuotaService.instance) {
      DynamicStorageQuotaService.instance = new DynamicStorageQuotaService();
    }
    return DynamicStorageQuotaService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('DynamicStorageQuota: Initializing storage quota management');

    try {
      // Detect device capabilities
      this.deviceCapabilities = await this.detectDeviceCapabilities();
      
      // Load previous quota settings
      await this.loadQuotaHistory();
      
      // Calculate initial quota
      this.currentQuota = await this.calculateOptimalQuota();
      
      // Start monitoring
      this.startQuotaMonitoring();
      
      this.isInitialized = true;
      
      console.log(`DynamicStorageQuota: Initialized with ${(this.currentQuota.total / 1024 / 1024).toFixed(1)}MB total quota`);
      
    } catch (error) {
      console.error('DynamicStorageQuota: Initialization failed:', error);
      // Fall back to conservative defaults
      this.currentQuota = this.getDefaultQuota();
      this.isInitialized = true;
    }
  }

  private async detectDeviceCapabilities(): Promise<DeviceCapabilities> {
    const capabilities: Partial<DeviceCapabilities> = {};

    // Estimate RAM from various browser APIs
    capabilities.totalRAM = await this.estimateDeviceRAM();
    
    // Check available storage using Storage API
    capabilities.availableStorage = await this.getAvailableStorage();
    capabilities.browserStorageQuota = await this.getBrowserStorageQuota();
    
    // Detect if this is a low-end device
    capabilities.isLowEndDevice = this.detectLowEndDevice(capabilities.totalRAM);
    
    // Check for persistent storage support
    capabilities.supportsPersistentStorage = await this.checkPersistentStorageSupport();
    
    // Detect device type
    capabilities.deviceType = this.detectDeviceType();
    
    // Calculate estimated quota based on device characteristics
    capabilities.estimatedStorageQuota = this.calculateEstimatedQuota(capabilities as DeviceCapabilities);

    console.log('DynamicStorageQuota: Device capabilities detected:', capabilities);

    return capabilities as DeviceCapabilities;
  }

  private async estimateDeviceRAM(): Promise<number> {
    // Try multiple methods to estimate RAM
    let estimatedRAM = 2048; // Default 2GB

    try {
      // Method 1: Navigator hardware concurrency (rough estimate)
      if ('hardwareConcurrency' in navigator) {
        const cores = navigator.hardwareConcurrency;
        // Rough estimate: mobile = 1-4GB, desktop = 4-16GB+
        if (cores <= 2) estimatedRAM = 2048;
        else if (cores <= 4) estimatedRAM = 4096;
        else if (cores <= 8) estimatedRAM = 8192;
        else estimatedRAM = 16384;
      }

      // Method 2: Device memory API (if available)
      if ('deviceMemory' in navigator) {
        estimatedRAM = (navigator as any).deviceMemory * 1024; // Convert GB to MB
      }

      // Method 3: Performance-based estimation
      const performanceRAM = await this.performanceBasedRAMEstimate();
      if (performanceRAM > 0) {
        // Average the estimates for better accuracy
        estimatedRAM = Math.round((estimatedRAM + performanceRAM) / 2);
      }

    } catch (error) {
      console.warn('DynamicStorageQuota: RAM estimation failed:', error);
    }

    return Math.max(1024, Math.min(32768, estimatedRAM)); // Clamp between 1GB-32GB
  }

  private async performanceBasedRAMEstimate(): Promise<number> {
    // Quick performance test to estimate device capability
    const startTime = performance.now();
    
    // Create and manipulate a large array to stress memory
    try {
      const testArray = new Array(100000);
      for (let i = 0; i < testArray.length; i++) {
        testArray[i] = Math.random();
      }
      
      // Sort the array (CPU + memory intensive)
      testArray.sort();
      
      const duration = performance.now() - startTime;
      
      // Rough mapping: faster devices usually have more RAM
      if (duration < 20) return 8192;   // >8GB
      if (duration < 50) return 4096;   // 4-8GB  
      if (duration < 100) return 2048;  // 2-4GB
      return 1024;                      // <2GB
      
    } catch (error) {
      return 0; // Test failed
    }
  }

  private async getAvailableStorage(): Promise<number> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const available = (estimate.quota || 0) - (estimate.usage || 0);
        return Math.floor(available / (1024 * 1024)); // Convert to MB
      }
    } catch (error) {
      console.warn('DynamicStorageQuota: Storage estimation failed:', error);
    }
    
    return 1024; // Default 1GB
  }

  private async getBrowserStorageQuota(): Promise<number> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return Math.floor((estimate.quota || 0) / (1024 * 1024)); // Convert to MB
      }
    } catch (error) {
      console.warn('DynamicStorageQuota: Quota estimation failed:', error);
    }
    
    return 2048; // Default 2GB
  }

  private detectLowEndDevice(ramMB: number): boolean {
    // Consider devices with <3GB RAM as low-end
    if (ramMB < 3072) return true;
    
    // Additional checks for low-end detection
    const userAgent = navigator.userAgent.toLowerCase();
    const lowEndIndicators = [
      'android 4', 'android 5', 'android 6',  // Older Android
      'chrome/4', 'chrome/5', 'chrome/6',     // Very old Chrome
      'mobile.*safari/53',                    // Old mobile Safari
    ];
    
    return lowEndIndicators.some(indicator => userAgent.includes(indicator));
  }

  private async checkPersistentStorageSupport(): Promise<boolean> {
    try {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        return await navigator.storage.persist();
      }
    } catch (error) {
      console.warn('DynamicStorageQuota: Persistent storage check failed:', error);
    }
    
    return false;
  }

  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/mobile|android.*mobile|iphone|ipod|blackberry|iemobile|opera mini/.test(userAgent)) {
      return 'mobile';
    }
    
    if (/tablet|ipad|android(?!.*mobile)|kindle|silk/.test(userAgent)) {
      return 'tablet';
    }
    
    if (/desktop|windows nt|macintosh|linux/.test(userAgent) || 
        (!(/mobile|tablet/.test(userAgent)) && window.innerWidth > 1024)) {
      return 'desktop';
    }
    
    return 'unknown';
  }

  private calculateEstimatedQuota(capabilities: DeviceCapabilities): number {
    let baseQuota = 0;

    // Base quota by device type and RAM
    switch (capabilities.deviceType) {
      case 'mobile':
        baseQuota = capabilities.totalRAM < 3072 ? 128 : 512; // 128MB-512MB
        break;
      case 'tablet':
        baseQuota = capabilities.totalRAM < 4096 ? 512 : 1024; // 512MB-1GB
        break;
      case 'desktop':
        baseQuota = Math.min(2048, capabilities.totalRAM / 8); // Up to 2GB, 1/8 of RAM
        break;
      default:
        baseQuota = 256; // Conservative default
    }

    // Adjust based on available storage
    const storageRatio = capabilities.availableStorage / capabilities.browserStorageQuota;
    if (storageRatio < 0.1) baseQuota *= 0.5; // Very low storage
    else if (storageRatio > 0.5) baseQuota *= 1.5; // Plenty of storage

    // Low-end device adjustments
    if (capabilities.isLowEndDevice) {
      baseQuota = Math.min(baseQuota, 256); // Cap at 256MB for low-end
    }

    // Persistent storage bonus
    if (capabilities.supportsPersistentStorage) {
      baseQuota *= 1.2; // 20% bonus for persistent storage
    }

    return Math.floor(baseQuota);
  }

  private async calculateOptimalQuota(): Promise<StorageQuota> {
    if (!this.deviceCapabilities) {
      return this.getDefaultQuota();
    }

    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    let totalQuotaMB = this.deviceCapabilities.estimatedStorageQuota;

    // Network-based adjustments (from PWA research)
    const networkMultipliers = {
      [NetworkType.SLOW_2G]: 0.5,  // 50MB base
      [NetworkType.TWOG]: 0.5,     // 50MB base  
      [NetworkType.THREEG]: 1.0,   // 150MB base
      [NetworkType.FOURG]: 2.0,    // 500MB base
      [NetworkType.WIFI]: 4.0,     // 1GB base
      [NetworkType.UNKNOWN]: 1.0
    };

    totalQuotaMB *= networkMultipliers[networkInfo.type];

    // Check previous usage patterns for adjustments
    const usageAnalysis = await this.analyzeStorageUsage();
    if (usageAnalysis) {
      if (usageAnalysis.utilizationRatio > 0.85) {
        totalQuotaMB *= 1.3; // Increase if consistently near limit
      } else if (usageAnalysis.utilizationRatio < 0.3) {
        totalQuotaMB *= 0.8; // Decrease if consistently underutilized
      }
    }

    // Convert to bytes and allocate
    const totalBytes = totalQuotaMB * 1024 * 1024;
    
    return {
      total: totalBytes,
      reserved: totalBytes * 0.1,        // 10% reserved
      audioCache: totalBytes * 0.75,     // 75% for audio
      metadata: totalBytes * 0.1,        // 10% for metadata
      temporary: totalBytes * 0.03,      // 3% for temporary files
      userContent: totalBytes * 0.02     // 2% for user content
    };
  }

  private getDefaultQuota(): StorageQuota {
    const defaultTotal = 100 * 1024 * 1024; // 100MB default
    
    return {
      total: defaultTotal,
      reserved: defaultTotal * 0.1,
      audioCache: defaultTotal * 0.75,
      metadata: defaultTotal * 0.1,
      temporary: defaultTotal * 0.03,
      userContent: defaultTotal * 0.02
    };
  }

  private async loadQuotaHistory(): Promise<void> {
    try {
      const stored = localStorage.getItem('bookbridge_quota_history');
      if (stored) {
        this.quotaHistory = JSON.parse(stored);
        console.log(`DynamicStorageQuota: Loaded ${this.quotaHistory.length} quota adjustments from history`);
      }
    } catch (error) {
      console.warn('DynamicStorageQuota: Failed to load quota history:', error);
      this.quotaHistory = [];
    }
  }

  private async saveQuotaHistory(): Promise<void> {
    try {
      // Keep only last 50 adjustments
      const historyToSave = this.quotaHistory.slice(-50);
      localStorage.setItem('bookbridge_quota_history', JSON.stringify(historyToSave));
    } catch (error) {
      console.warn('DynamicStorageQuota: Failed to save quota history:', error);
    }
  }

  private startQuotaMonitoring(): void {
    // Monitor storage usage every 10 minutes
    setInterval(async () => {
      await this.monitorAndAdjustQuota();
    }, 10 * 60 * 1000);

    // Deep analysis every hour
    setInterval(async () => {
      this.lastAnalysis = await this.analyzeStorageUsage();
      await this.considerQuotaAdjustment();
    }, 60 * 60 * 1000);
  }

  private async monitorAndAdjustQuota(): Promise<void> {
    if (!this.currentQuota) return;

    try {
      const cacheStats = await audioCacheDB.getCacheStats();
      const utilizationRatio = cacheStats.totalSize / this.currentQuota.audioCache;

      // Emergency adjustment if very close to limit
      if (utilizationRatio > 0.95) {
        await this.handleQuotaEmergency();
      }
      
      // Proactive adjustment if consistently high usage
      else if (utilizationRatio > 0.85) {
        await this.considerQuotaIncrease('high-utilization');
      }
      
      // Consider decrease if consistently low usage
      else if (utilizationRatio < 0.2) {
        await this.considerQuotaDecrease('low-utilization');
      }

    } catch (error) {
      console.error('DynamicStorageQuota: Monitoring failed:', error);
    }
  }

  private async handleQuotaEmergency(): Promise<void> {
    console.warn('DynamicStorageQuota: Emergency quota situation - near storage limit');

    // First, try aggressive cache eviction
    await priorityCacheEviction.enforceStorageLimit(this.currentQuota!.reserved);

    // If still critical, try to increase quota slightly
    const emergencyIncrease = this.currentQuota!.total * 0.1; // 10% increase
    
    if (await this.canIncreaseQuota(emergencyIncrease)) {
      await this.adjustQuota(emergencyIncrease, 'emergency-expansion', 0.9);
    } else {
      // Can't increase - need to be more aggressive with eviction
      console.warn('DynamicStorageQuota: Cannot expand quota - enforcing strict limits');
      await priorityCacheEviction.enforceStorageLimit(0); // No reserved space
    }
  }

  private async considerQuotaIncrease(reason: string): Promise<void> {
    if (!this.canReasonablyIncrease()) return;

    const proposedIncrease = this.calculateQuotaIncrease(reason);
    
    if (await this.canIncreaseQuota(proposedIncrease)) {
      await this.adjustQuota(proposedIncrease, reason, 0.7);
    }
  }

  private async considerQuotaDecrease(reason: string): Promise<void> {
    const proposedDecrease = this.calculateQuotaDecrease(reason);
    
    if (proposedDecrease > 0) {
      await this.adjustQuota(-proposedDecrease, reason, 0.6);
    }
  }

  private canReasonablyIncrease(): boolean {
    // Don't increase if we've increased recently
    const recentIncreases = this.quotaHistory.filter(adj => 
      adj.timestamp > Date.now() - (24 * 60 * 60 * 1000) && // Last 24 hours
      adj.newQuota > adj.previousQuota
    );

    return recentIncreases.length < 2; // Max 2 increases per day
  }

  private calculateQuotaIncrease(reason: string): number {
    if (!this.currentQuota) return 0;

    switch (reason) {
      case 'high-utilization':
        return this.currentQuota.total * 0.25; // 25% increase
      case 'growth-trend':
        return this.currentQuota.total * 0.15; // 15% increase
      default:
        return this.currentQuota.total * 0.1; // 10% default
    }
  }

  private calculateQuotaDecrease(reason: string): number {
    if (!this.currentQuota) return 0;

    switch (reason) {
      case 'low-utilization':
        return this.currentQuota.total * 0.2; // 20% decrease
      case 'storage-pressure':
        return this.currentQuota.total * 0.15; // 15% decrease
      default:
        return this.currentQuota.total * 0.1; // 10% default
    }
  }

  private async canIncreaseQuota(increaseBytes: number): Promise<boolean> {
    if (!this.deviceCapabilities) return false;

    const newTotalMB = (this.currentQuota!.total + increaseBytes) / (1024 * 1024);
    
    // Check against device capabilities
    if (newTotalMB > this.deviceCapabilities.estimatedStorageQuota * 1.5) {
      return false; // Don't exceed 150% of estimated capacity
    }

    // Check available storage
    const availableStorage = await this.getAvailableStorage();
    if (newTotalMB > availableStorage * 0.8) {
      return false; // Don't use more than 80% of available storage
    }

    return true;
  }

  private async adjustQuota(
    adjustmentBytes: number, 
    reason: string, 
    confidence: number
  ): Promise<void> {
    if (!this.currentQuota) return;

    const previousQuota = this.currentQuota.total;
    const newTotal = Math.max(
      this.getDefaultQuota().total, // Minimum quota
      this.currentQuota.total + adjustmentBytes
    );

    // Update quota allocation
    const ratio = newTotal / this.currentQuota.total;
    this.currentQuota = {
      total: newTotal,
      reserved: this.currentQuota.reserved * ratio,
      audioCache: this.currentQuota.audioCache * ratio,
      metadata: this.currentQuota.metadata * ratio,
      temporary: this.currentQuota.temporary * ratio,
      userContent: this.currentQuota.userContent * ratio
    };

    // Record the adjustment
    const adjustment: QuotaAdjustment = {
      reason,
      previousQuota,
      newQuota: newTotal,
      timestamp: Date.now(),
      triggerMetric: await this.getCurrentUtilizationMetric(),
      confidence
    };

    this.quotaHistory.push(adjustment);
    await this.saveQuotaHistory();

    console.log(`DynamicStorageQuota: Adjusted quota ${adjustmentBytes > 0 ? '+' : ''}${(adjustmentBytes / 1024 / 1024).toFixed(1)}MB (${reason}) - New total: ${(newTotal / 1024 / 1024).toFixed(1)}MB`);
  }

  private async getCurrentUtilizationMetric(): Promise<string> {
    const cacheStats = await audioCacheDB.getCacheStats();
    const utilizationRatio = this.currentQuota 
      ? cacheStats.totalSize / this.currentQuota.audioCache 
      : 0;
    
    return `${(utilizationRatio * 100).toFixed(1)}%`;
  }

  private async analyzeStorageUsage(): Promise<StorageUsageAnalysis> {
    const cacheStats = await audioCacheDB.getCacheStats();
    const utilizationRatio = this.currentQuota 
      ? cacheStats.totalSize / this.currentQuota.audioCache 
      : 0;

    // Calculate growth rate from quota history
    const growthRate = this.calculateGrowthRate();
    
    // Analyze access patterns (simplified)
    const accessPatterns = {
      activeBooks: Math.max(1, Math.floor(cacheStats.itemCount / 100)), // Estimate
      averageSessionDuration: 45, // Placeholder
      dailyUsage: 2 // Placeholder
    };

    // Generate recommendations
    const recommendations = this.generateQuotaRecommendations(
      utilizationRatio,
      growthRate,
      accessPatterns
    );

    return {
      utilizationRatio,
      growthRate,
      accessPatterns,
      recommendations
    };
  }

  private calculateGrowthRate(): number {
    if (this.quotaHistory.length < 2) return 0;

    // Look at quota changes over the last 7 days
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentAdjustments = this.quotaHistory.filter(adj => adj.timestamp > weekAgo);

    if (recentAdjustments.length === 0) return 0;

    const totalGrowth = recentAdjustments.reduce((sum, adj) => 
      sum + (adj.newQuota - adj.previousQuota), 0
    );

    return totalGrowth / (7 * 1024 * 1024); // MB per day
  }

  private generateQuotaRecommendations(
    utilization: number,
    growthRate: number,
    accessPatterns: any
  ): { suggestedQuota: number; reasoning: string[]; urgency: 'low' | 'medium' | 'high' } {
    const reasoning: string[] = [];
    let urgency: 'low' | 'medium' | 'high' = 'low';
    let suggestedQuota = this.currentQuota!.total;

    if (utilization > 0.8) {
      reasoning.push('High utilization detected - consider increasing quota');
      suggestedQuota *= 1.3;
      urgency = 'high';
    }

    if (growthRate > 10) { // >10MB/day growth
      reasoning.push('Rapid growth detected - proactive quota increase recommended');
      suggestedQuota *= 1.2;
      urgency = urgency === 'low' ? 'medium' : urgency;
    }

    if (utilization < 0.3 && growthRate < 1) {
      reasoning.push('Low utilization - quota could be reduced');
      suggestedQuota *= 0.8;
    }

    return {
      suggestedQuota: Math.floor(suggestedQuota),
      reasoning,
      urgency
    };
  }

  private async considerQuotaAdjustment(): Promise<void> {
    if (!this.lastAnalysis) return;

    const { recommendations } = this.lastAnalysis;
    
    if (recommendations.urgency === 'high') {
      const adjustment = recommendations.suggestedQuota - this.currentQuota!.total;
      
      if (Math.abs(adjustment) > this.currentQuota!.total * 0.1) { // >10% change
        const reason = adjustment > 0 ? 'analysis-increase' : 'analysis-decrease';
        await this.adjustQuota(adjustment, reason, 0.8);
      }
    }
  }

  // Public methods for integration

  async getCurrentQuota(): Promise<StorageQuota> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return this.currentQuota || this.getDefaultQuota();
  }

  async getDeviceCapabilities(): Promise<DeviceCapabilities | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return this.deviceCapabilities;
  }

  async getQuotaHistory(): Promise<QuotaAdjustment[]> {
    return [...this.quotaHistory];
  }

  async getStorageAnalysis(): Promise<StorageUsageAnalysis | null> {
    return this.lastAnalysis;
  }

  async forceQuotaRecalculation(): Promise<void> {
    console.log('DynamicStorageQuota: Force recalculating optimal quota');
    
    this.currentQuota = await this.calculateOptimalQuota();
    
    await this.adjustQuota(
      0, // No change, just recalculation
      'manual-recalculation',
      1.0
    );
  }

  async requestQuotaIncrease(requestedBytes: number, reason: string): Promise<boolean> {
    const canIncrease = await this.canIncreaseQuota(requestedBytes);
    
    if (canIncrease) {
      await this.adjustQuota(requestedBytes, `user-request-${reason}`, 0.9);
      return true;
    }
    
    return false;
  }

  getQuotaSummary(): {
    total: string;
    used: string;
    available: string;
    deviceType: string;
    lastAdjustment?: QuotaAdjustment;
  } {
    const quota = this.currentQuota || this.getDefaultQuota();
    const deviceType = this.deviceCapabilities?.deviceType || 'unknown';
    const lastAdjustment = this.quotaHistory[this.quotaHistory.length - 1];

    return {
      total: `${(quota.total / 1024 / 1024).toFixed(1)}MB`,
      used: 'calculating...', // Would need current usage
      available: `${(quota.audioCache / 1024 / 1024).toFixed(1)}MB`,
      deviceType,
      lastAdjustment
    };
  }
}

// Export singleton instance
export const dynamicStorageQuota = DynamicStorageQuotaService.getInstance();