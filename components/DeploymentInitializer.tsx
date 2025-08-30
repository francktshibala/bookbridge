/**
 * Deployment Initializer Component
 * Handles PWA initialization and deployment setup on app startup
 */

'use client';

import { useEffect, useState } from 'react';
import { initializePWAForProduction, validateDeploymentHealth, trackDeploymentMetric } from '@/lib/deployment-utils';
import { getProductionConfig, logDeploymentConfig } from '@/lib/production-config';
import { getProductionFeatureFlags } from '@/lib/deployment-utils';

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

  // In development, show status indicator
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          healthStatus === 'checking' ? 'bg-yellow-400' :
          healthStatus === 'healthy' ? 'bg-green-400' : 'bg-red-400'
        }`} />
        <span className="font-medium">
          {healthStatus === 'checking' ? 'Initializing...' :
           healthStatus === 'healthy' ? 'PWA Ready' : 'Issues Detected'}
        </span>
      </div>
      {healthStatus === 'unhealthy' && (
        <div className="text-xs text-red-600 mt-1">
          Check console for details
        </div>
      )}
    </div>
  );
}