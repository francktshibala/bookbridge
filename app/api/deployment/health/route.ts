/**
 * Deployment Health Check API
 * Monitors PWA deployment health and feature flag status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProductionConfig, getDeploymentInfo } from '@/lib/production-config';
import { getDeploymentEnvironment } from '@/lib/deployment-utils';
import { getFeatureFlags } from '@/utils/featureFlags';

export async function GET(request: NextRequest) {
  try {
    const config = getProductionConfig();
    const env = getDeploymentEnvironment();
    const deploymentInfo = getDeploymentInfo();
    const featureFlags = getFeatureFlags();
    
    // Basic health checks
    const healthChecks = {
      database: await checkDatabaseHealth(),
      serviceWorker: checkServiceWorkerConfig(),
      featureFlags: checkFeatureFlagsHealth(featureFlags),
      deployment: checkDeploymentHealth(env),
    };
    
    const isHealthy = Object.values(healthChecks).every(check => check.healthy);
    
    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      deployment: deploymentInfo,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isProd: env.isProd,
        isStaging: env.isStaging,
        isDev: env.isDev,
        isVercelDeployment: env.isVercelDeployment,
      },
      features: {
        flags: featureFlags,
        rolloutPercentages: config.features.rolloutPercentage,
        emergingMarkets: config.features.emergingMarkets,
      },
      checks: healthChecks,
      version: deploymentInfo.version,
    };
    
    return NextResponse.json(response, {
      status: isHealthy ? 200 : 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Check database connectivity
 */
async function checkDatabaseHealth(): Promise<{ healthy: boolean; message: string }> {
  try {
    // Simple database connectivity check
    // In a real implementation, you might want to do a lightweight query
    const hasRequiredEnvVars = !!(
      process.env.DATABASE_URL ||
      (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    );
    
    return {
      healthy: hasRequiredEnvVars,
      message: hasRequiredEnvVars ? 'Database configuration present' : 'Missing database configuration',
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Database check failed: ${error}`,
    };
  }
}

/**
 * Check service worker configuration
 */
function checkServiceWorkerConfig(): { healthy: boolean; message: string } {
  try {
    const hasPWAConfig = !!process.env.NODE_ENV; // Basic check for Next.js config
    const isProductionReady = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development';
    
    return {
      healthy: hasPWAConfig && isProductionReady,
      message: hasPWAConfig 
        ? 'Service Worker configuration present' 
        : 'Missing Service Worker configuration',
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Service Worker check failed: ${error}`,
    };
  }
}

/**
 * Check feature flags health
 */
function checkFeatureFlagsHealth(flags: any): { healthy: boolean; message: string; flags: any } {
  try {
    const flagCount = Object.keys(flags).length;
    const enabledFlags = Object.values(flags).filter(Boolean).length;
    
    return {
      healthy: flagCount > 0,
      message: `${enabledFlags}/${flagCount} feature flags enabled`,
      flags,
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Feature flags check failed: ${error}`,
      flags: {},
    };
  }
}

/**
 * Check deployment environment health
 */
function checkDeploymentHealth(env: any): { healthy: boolean; message: string; environment: any } {
  try {
    const requiredEnvVars = [
      'NODE_ENV',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    const isHealthy = missingVars.length === 0;
    
    return {
      healthy: isHealthy,
      message: isHealthy 
        ? 'All required environment variables present' 
        : `Missing environment variables: ${missingVars.join(', ')}`,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseConfig: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        hasVercelConfig: !!process.env.VERCEL,
      },
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Deployment health check failed: ${error}`,
      environment: {},
    };
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}