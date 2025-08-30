/**
 * Production Deployment Configuration
 * Centralized configuration for PWA production deployment with feature flags
 */

export interface ProductionConfig {
  deployment: {
    environment: 'development' | 'staging' | 'production';
    version: string;
    deploymentId: string;
    region: string[];
  };
  features: {
    rolloutPercentage: Record<string, number>;
    emergingMarkets: {
      enabled: boolean;
      targetCountries: string[];
      networkOptimizations: boolean;
      localizedContent: boolean;
    };
    pwa: {
      installPromptEnabled: boolean;
      offlineModeEnabled: boolean;
      backgroundSync: boolean;
      pushNotifications: boolean;
    };
    performance: {
      monitoringEnabled: boolean;
      bundleAnalysis: boolean;
      webVitalsTracking: boolean;
      errorReporting: boolean;
    };
  };
  limits: {
    maxCacheSize: number; // in MB
    maxOfflineBooks: number;
    networkTimeoutMs: number;
    retryAttempts: number;
  };
  monitoring: {
    enabled: boolean;
    metricsEndpoint: string;
    errorReportingEndpoint: string;
    performanceTracking: boolean;
  };
}

export const PRODUCTION_CONFIG: ProductionConfig = {
  deployment: {
    environment: (process.env.NODE_ENV as any) || 'development',
    version: process.env.npm_package_version || '1.0.0',
    deploymentId: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    region: ['us-east-1', 'eu-west-1', 'ap-southeast-1'] // Vercel edge regions
  },
  features: {
    rolloutPercentage: {
      pwaInstallPrompt: 100, // Full rollout
      offlineMode: 100, // Full rollout
      audioPreloading: 25, // Conservative rollout
      emergingMarketsOptimizations: process.env.NODE_ENV === 'production' ? 10 : 100, // Gradual rollout
      performanceMonitoring: 100, // Full rollout
      analyticsTracking: 100, // Full rollout
    },
    emergingMarkets: {
      enabled: process.env.NEXT_PUBLIC_EMERGING_MARKETS_OPTIMIZATIONS === 'true',
      targetCountries: ['KE', 'NG', 'IN', 'ID', 'MX', 'CO', 'EG', 'PH', 'BD', 'VN'],
      networkOptimizations: true,
      localizedContent: false, // Phase 2 feature
    },
    pwa: {
      installPromptEnabled: true,
      offlineModeEnabled: true,
      backgroundSync: true,
      pushNotifications: false, // Phase 2 feature
    },
    performance: {
      monitoringEnabled: process.env.NODE_ENV === 'production',
      bundleAnalysis: process.env.ANALYZE === 'true',
      webVitalsTracking: true,
      errorReporting: process.env.NODE_ENV === 'production',
    }
  },
  limits: {
    maxCacheSize: 100, // 100MB cache limit for emerging markets
    maxOfflineBooks: 5, // Conservative limit for storage
    networkTimeoutMs: 5000, // 5 second timeout for slow networks
    retryAttempts: 3, // Network retry attempts
  },
  monitoring: {
    enabled: process.env.NODE_ENV === 'production',
    metricsEndpoint: '/api/metrics',
    errorReportingEndpoint: '/api/errors',
    performanceTracking: true,
  }
};

/**
 * Get production configuration based on environment
 */
export function getProductionConfig(): ProductionConfig {
  return PRODUCTION_CONFIG;
}

/**
 * Check if feature should be enabled for user based on rollout percentage
 */
export function shouldEnableFeatureForUser(feature: string, userId: string): boolean {
  const config = getProductionConfig();
  const rolloutPercentage = config.features.rolloutPercentage[feature] || 0;
  
  if (rolloutPercentage >= 100) return true;
  if (rolloutPercentage <= 0) return false;
  
  // Deterministic rollout based on user ID hash
  const hash = hashString(userId);
  const userPercentile = hash % 100;
  
  return userPercentile < rolloutPercentage;
}

/**
 * Simple string hash function for consistent user assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get deployment info for debugging
 */
export function getDeploymentInfo() {
  const config = getProductionConfig();
  return {
    environment: config.deployment.environment,
    version: config.deployment.version,
    deploymentId: config.deployment.deploymentId.slice(0, 7), // First 7 chars of commit
    timestamp: new Date().toISOString(),
    features: Object.keys(config.features.rolloutPercentage).filter(
      feature => config.features.rolloutPercentage[feature] > 0
    )
  };
}

/**
 * Log deployment configuration for debugging
 */
export function logDeploymentConfig() {
  if (typeof window === 'undefined') return; // Server-side only
  
  const info = getDeploymentInfo();
  console.group('🚀 BookBridge PWA Deployment Info');
  console.log('Environment:', info.environment);
  console.log('Version:', info.version);
  console.log('Deployment ID:', info.deploymentId);
  console.log('Enabled Features:', info.features);
  console.log('Timestamp:', info.timestamp);
  console.groupEnd();
}