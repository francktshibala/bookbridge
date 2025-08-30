/**
 * Error Reporting API for Production Deployment
 * Collects and logs deployment and runtime errors
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProductionConfig } from '@/lib/production-config';
import { getDeploymentEnvironment } from '@/lib/deployment-utils';

interface ErrorReport {
  message: string;
  stack?: string;
  context: string;
  timestamp: number;
  environment: string;
  deploymentId: string;
  userAgent: string;
  url?: string;
  userId?: string;
  sessionId?: string;
  featureFlags?: Record<string, boolean>;
  additionalData?: any;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'pwa' | 'audio' | 'offline' | 'performance' | 'ui' | 'api' | 'deployment';
}

export async function POST(request: NextRequest) {
  try {
    const config = getProductionConfig();
    const env = getDeploymentEnvironment();
    
    // Check if error reporting is enabled
    if (!config.features.performance.errorReporting && env.isProd) {
      return NextResponse.json(
        { message: 'Error reporting disabled' },
        { status: 200 }
      );
    }
    
    const body = await request.json();
    const errorReport: ErrorReport = {
      ...body,
      timestamp: body.timestamp || Date.now(),
      environment: env.isProd ? 'production' : env.isStaging ? 'staging' : 'development',
      deploymentId: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      userAgent: request.headers.get('user-agent') || 'unknown',
      url: body.url || request.headers.get('referer'),
    };
    
    // Validate required fields
    if (!errorReport.message || !errorReport.context) {
      return NextResponse.json(
        { error: 'Message and context are required' },
        { status: 400 }
      );
    }
    
    // Process the error report
    await processErrorReport(errorReport);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error reporting failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to report error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Process error reports based on category and severity
 */
async function processErrorReport(report: ErrorReport) {
  const severity = determineSeverity(report);
  const category = determineCategory(report);
  
  const processedReport = {
    ...report,
    severity: severity || 'low',
    category: category || 'ui',
    id: generateErrorId(report),
  };
  
  // Log the error with appropriate level
  logError(processedReport);
  
  // Handle critical errors immediately
  if (severity === 'critical') {
    await handleCriticalError(processedReport);
  }
  
  // Category-specific processing
  switch (category) {
    case 'pwa':
      await processPWAError(processedReport);
      break;
      
    case 'offline':
      await processOfflineError(processedReport);
      break;
      
    case 'performance':
      await processPerformanceError(processedReport);
      break;
      
    case 'deployment':
      await processDeploymentError(processedReport);
      break;
      
    default:
      await processGenericError(processedReport);
  }
}

/**
 * Determine error severity based on context and message
 */
function determineSeverity(report: ErrorReport): ErrorReport['severity'] {
  if (report.severity) return report.severity;
  
  const message = report.message.toLowerCase();
  const context = report.context.toLowerCase();
  
  // Critical errors
  if (
    message.includes('failed to load') ||
    message.includes('network error') ||
    message.includes('service worker') ||
    context.includes('deployment') ||
    context.includes('startup')
  ) {
    return 'critical';
  }
  
  // High severity errors
  if (
    message.includes('uncaught') ||
    message.includes('unhandled') ||
    context.includes('audio') ||
    context.includes('offline')
  ) {
    return 'high';
  }
  
  // Medium severity errors
  if (
    message.includes('warning') ||
    context.includes('ui') ||
    context.includes('performance')
  ) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Determine error category based on context
 */
function determineCategory(report: ErrorReport): ErrorReport['category'] {
  if (report.category) return report.category;
  
  const context = report.context.toLowerCase();
  const message = report.message.toLowerCase();
  
  if (context.includes('pwa') || context.includes('install') || message.includes('service worker')) {
    return 'pwa';
  }
  
  if (context.includes('audio') || message.includes('audio')) {
    return 'audio';
  }
  
  if (context.includes('offline') || message.includes('offline')) {
    return 'offline';
  }
  
  if (context.includes('performance') || message.includes('performance')) {
    return 'performance';
  }
  
  if (context.includes('deployment') || message.includes('deployment')) {
    return 'deployment';
  }
  
  if (context.includes('api') || message.includes('fetch')) {
    return 'api';
  }
  
  return 'ui';
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId(report: ErrorReport): string {
  const hash = simpleHash(report.message + report.context + report.stack);
  const timestamp = Date.now().toString(36);
  return `err_${timestamp}_${hash}`;
}

/**
 * Simple hash function for error deduplication
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 6);
}

/**
 * Log error with appropriate level
 */
function logError(report: ErrorReport & { id: string; severity: string; category: string }) {
  const logEntry = {
    id: report.id,
    severity: report.severity,
    category: report.category,
    message: report.message,
    context: report.context,
    environment: report.environment,
    deploymentId: report.deploymentId,
    timestamp: new Date(report.timestamp).toISOString(),
    userId: report.userId,
  };
  
  switch (report.severity) {
    case 'critical':
      console.error('🚨 CRITICAL ERROR:', logEntry);
      break;
    case 'high':
      console.error('❌ HIGH SEVERITY ERROR:', logEntry);
      break;
    case 'medium':
      console.warn('⚠️ MEDIUM SEVERITY ERROR:', logEntry);
      break;
    default:
      console.log('ℹ️ LOW SEVERITY ERROR:', logEntry);
  }
}

/**
 * Handle critical errors that need immediate attention
 */
async function handleCriticalError(report: ErrorReport & { id: string }) {
  console.error('🚨 CRITICAL ERROR DETECTED - IMMEDIATE ACTION REQUIRED');
  console.error('Error ID:', report.id);
  console.error('Context:', report.context);
  console.error('Message:', report.message);
  console.error('Environment:', report.environment);
  console.error('Deployment:', report.deploymentId);
  
  // In production, you might want to:
  // 1. Send alerts to monitoring service (e.g., Sentry, DataDog)
  // 2. Notify development team via Slack/email
  // 3. Create incident ticket
  // 4. Trigger rollback if necessary
}

/**
 * Process PWA-specific errors
 */
async function processPWAError(report: ErrorReport & { id: string }) {
  console.log('📱 PWA Error:', {
    id: report.id,
    message: report.message,
    context: report.context,
    featureFlags: report.featureFlags,
  });
  
  // Track PWA installation issues
  if (report.context.includes('install')) {
    console.warn('PWA Installation Error - may affect conversion rates');
  }
}

/**
 * Process offline-related errors
 */
async function processOfflineError(report: ErrorReport & { id: string }) {
  console.log('📴 Offline Error:', {
    id: report.id,
    message: report.message,
    context: report.context,
  });
  
  // Track offline functionality issues
}

/**
 * Process performance-related errors
 */
async function processPerformanceError(report: ErrorReport & { id: string }) {
  console.log('⚡ Performance Error:', {
    id: report.id,
    message: report.message,
    context: report.context,
    additionalData: report.additionalData,
  });
}

/**
 * Process deployment-related errors
 */
async function processDeploymentError(report: ErrorReport & { id: string }) {
  console.log('🚀 Deployment Error:', {
    id: report.id,
    message: report.message,
    context: report.context,
    environment: report.environment,
    deploymentId: report.deploymentId,
  });
}

/**
 * Process generic errors
 */
async function processGenericError(report: ErrorReport & { id: string }) {
  console.log('🐛 Generic Error:', {
    id: report.id,
    message: report.message,
    context: report.context,
  });
}

/**
 * GET endpoint for error summary (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const config = getProductionConfig();
    const env = getDeploymentEnvironment();
    
    const summary = {
      enabled: config.features.performance.errorReporting,
      environment: env.isProd ? 'production' : env.isStaging ? 'staging' : 'development',
      deploymentId: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      categories: ['pwa', 'audio', 'offline', 'performance', 'ui', 'api', 'deployment'],
      severityLevels: ['low', 'medium', 'high', 'critical'],
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(summary);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get error summary' },
      { status: 500 }
    );
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}