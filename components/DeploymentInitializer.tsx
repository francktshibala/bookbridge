/**
 * Deployment Initializer Component
 * Handles PWA initialization and deployment setup on app startup
 */

'use client';

import { useEffect, useState } from 'react';
import { initializePWAForProduction, validateDeploymentHealth, trackDeploymentMetric } from '@/lib/deployment-utils';
import { getProductionConfig, logDeploymentConfig } from '@/lib/production-config';
import { getProductionFeatureFlags } from '@/lib/deployment-utils';
import { realTimeMonitoring } from '@/lib/real-time-monitoring';

export default function DeploymentInitializer() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');

  useEffect(() => {
    initializeDeployment();
  }, []);

  async function initializeDeployment() {
    try {
      console.log('🚀 Initializing BookBridge PWA deployment...');
      
      // Log deployment configuration for debugging
      logDeploymentConfig();
      
      // Get production configuration
      const config = getProductionConfig();
      const featureFlags = getProductionFeatureFlags();
      
      console.log('📋 Feature flags loaded:', featureFlags);
      
      // Initialize PWA
      const pwaInitialized = await initializePWAForProduction();
      console.log('📱 PWA initialization:', pwaInitialized ? 'Success' : 'Failed');
      
      // Start real-time monitoring if enabled
      if (featureFlags.performanceMonitoring) {
        try {
          await realTimeMonitoring.startRealTimeMonitoring();
          console.log('📊 Real-time monitoring started');
        } catch (error) {
          console.warn('📊 Real-time monitoring failed to start:', error);
        }
      }
      
      // Validate deployment health
      const health = await validateDeploymentHealth();
      setHealthStatus(health.healthy ? 'healthy' : 'unhealthy');
      
      if (!health.healthy) {
        console.warn('⚠️ Deployment health issues:', health.errors);
      } else {
        console.log('✅ Deployment health check passed');
      }
      
      // Track initialization metrics
      trackDeploymentMetric('deployment_initialized', {
        pwaInitialized,
        healthStatus: health.healthy ? 'healthy' : 'unhealthy',
        featureFlags,
        checks: health.checks,
        environment: config.deployment.environment,
      });
      
      // Mark as initialized
      setIsInitialized(true);
      
      // Log successful initialization
      console.log('✅ BookBridge PWA deployment initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize deployment:', error);
      
      // Track initialization failure
      trackDeploymentMetric('deployment_initialization_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      setHealthStatus('unhealthy');
      setIsInitialized(true); // Still mark as initialized to avoid blocking the app
    }
  }

  // Don't render anything in production - this is just for initialization
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Don't show anything in development either for clean interface
  return null;
}