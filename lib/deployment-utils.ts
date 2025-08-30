/**
 * Production Deployment Utilities
 * Helper functions for managing PWA deployment and feature rollouts
 */

import { getProductionConfig, shouldEnableFeatureForUser } from './production-config';
import { getFeatureFlags, FeatureFlags } from '../utils/featureFlags';

export interface DeploymentEnvironment {
  isProd: boolean;
  isStaging: boolean;
  isDev: boolean;
  isVercelDeployment: boolean;
  deploymentUrl: string;
}

/**
 * Get current deployment environment details
 */
export function getDeploymentEnvironment(): DeploymentEnvironment {
  const environment = process.env.NODE_ENV;
  const vercelUrl = process.env.VERCEL_URL;
  const isVercelDeployment = !!vercelUrl;
  
  return {
    isProd: environment === 'production',
    isStaging: isVercelDeployment && vercelUrl !== process.env.NEXT_PUBLIC_VERCEL_URL,
    isDev: environment === 'development',
    isVercelDeployment,
    deploymentUrl: isVercelDeployment 
      ? `https://${vercelUrl}` 
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  };
}

/**
 * Get feature flags with production rollout logic
 */
export function getProductionFeatureFlags(userId?: string): FeatureFlags {
  const baseFlags = getFeatureFlags();
  const config = getProductionConfig();
  const env = getDeploymentEnvironment();
  
  // In development, return base flags (all features enabled)
  if (env.isDev) {
    return baseFlags;
  }
  
  // In production, apply rollout percentages
  if (!userId) {
    // No user ID - return conservative flags
    return {
      ...baseFlags,
      audioPreloading: false,
      emergingMarketsOptimizations: false,
    };
  }
  
  // Apply per-user feature rollouts
  const productionFlags: FeatureFlags = {
    ...baseFlags,
    audioPreloading: shouldEnableFeatureForUser('audioPreloading', userId) && baseFlags.audioPreloading,
    emergingMarketsOptimizations: shouldEnableFeatureForUser('emergingMarketsOptimizations', userId) && baseFlags.emergingMarketsOptimizations,
  };
  
  return productionFlags;
}

/**
 * Initialize PWA for production deployment
 */
export async function initializePWAForProduction(): Promise<boolean> {
  try {
    const env = getDeploymentEnvironment();
    const config = getProductionConfig();
    
    // Skip PWA initialization in development
    if (env.isDev) {
      console.log('🔧 PWA initialization skipped in development');
      return true;
    }
    
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker not supported');
      return false;
    }
    
    // Check if PWA features are enabled
    if (!config.features.pwa.installPromptEnabled) {
      console.log('📱 PWA install prompt disabled by configuration');
      return false;
    }
    
    console.log('🚀 Initializing PWA for production deployment');
    
    // Service worker should already be registered by next-pwa
    // This is just for logging and verification
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      console.log('✅ Service Worker registered successfully');
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        console.log('🔄 New service worker version available');
      });
      
      return true;
    } else {
      console.warn('⚠️ Service Worker not found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize PWA:', error);
    return false;
  }
}

/**
 * Check if user is in target emerging market
 */
export function isInTargetMarket(countryCode?: string): boolean {
  const config = getProductionConfig();
  
  if (!countryCode || !config.features.emergingMarkets.enabled) {
    return false;
  }
  
  return config.features.emergingMarkets.targetCountries.includes(countryCode.toUpperCase());
}

/**
 * Get network-optimized configuration for emerging markets
 */
export function getNetworkOptimizedConfig(isEmergingMarket: boolean = false) {
  const config = getProductionConfig();
  
  if (isEmergingMarket && config.features.emergingMarkets.networkOptimizations) {
    return {
      maxCacheSize: Math.min(config.limits.maxCacheSize, 50), // Reduce cache for limited storage
      networkTimeoutMs: config.limits.networkTimeoutMs * 1.5, // Increase timeout for slow networks
      retryAttempts: config.limits.retryAttempts + 1, // More retries for unreliable networks
      audioPreloadingEnabled: false, // Disable preloading to save bandwidth
      imageQuality: 'low', // Use lower quality images
    };
  }
  
  return {
    maxCacheSize: config.limits.maxCacheSize,
    networkTimeoutMs: config.limits.networkTimeoutMs,
    retryAttempts: config.limits.retryAttempts,
    audioPreloadingEnabled: true,
    imageQuality: 'high',
  };
}

/**
 * Track deployment metrics
 */
export function trackDeploymentMetric(event: string, data?: any) {
  const env = getDeploymentEnvironment();
  const config = getProductionConfig();
  
  if (!config.monitoring.enabled || env.isDev) {
    return;
  }
  
  // Send to monitoring endpoint
  const metric = {
    event,
    timestamp: Date.now(),
    environment: env.isProd ? 'production' : 'staging',
    deploymentId: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    data,
  };
  
  // Use navigator.sendBeacon for reliability
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(
      config.monitoring.metricsEndpoint,
      JSON.stringify(metric)
    );
  }
}

/**
 * Handle deployment errors
 */
export function handleDeploymentError(error: Error, context: string) {
  const env = getDeploymentEnvironment();
  const config = getProductionConfig();
  
  console.error(`❌ Deployment Error [${context}]:`, error);
  
  if (!config.features.performance.errorReporting || env.isDev) {
    return;
  }
  
  // Send error to monitoring
  const errorReport = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: Date.now(),
    environment: env.isProd ? 'production' : 'staging',
    deploymentId: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };
  
  // Send error report
  if (typeof fetch !== 'undefined') {
    fetch(config.monitoring.errorReportingEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport),
    }).catch(console.error);
  }
}

/**
 * Validate deployment health
 */
export async function validateDeploymentHealth(): Promise<{
  healthy: boolean;
  checks: Record<string, boolean>;
  errors: string[];
}> {
  const checks: Record<string, boolean> = {};
  const errors: string[] = [];
  
  try {
    // Check service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      checks.serviceWorker = !!registration;
      if (!registration) {
        errors.push('Service Worker not registered');
      }
    } else {
      checks.serviceWorker = false;
      errors.push('Service Worker not supported');
    }
    
    // Check IndexedDB
    checks.indexedDB = 'indexedDB' in window;
    if (!checks.indexedDB) {
      errors.push('IndexedDB not supported');
    }
    
    // Check online status
    checks.online = navigator.onLine;
    if (!checks.online) {
      errors.push('Device is offline');
    }
    
    // Check local storage
    try {
      localStorage.setItem('health-check', 'test');
      localStorage.removeItem('health-check');
      checks.localStorage = true;
    } catch {
      checks.localStorage = false;
      errors.push('Local Storage not available');
    }
    
    const healthy = Object.values(checks).every(check => check);
    
    return { healthy, checks, errors };
    
  } catch (error) {
    errors.push(`Health check failed: ${error}`);
    return {
      healthy: false,
      checks,
      errors
    };
  }
}