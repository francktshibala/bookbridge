'use client';

import React, { useEffect, createContext, useContext } from 'react';
import { performanceMonitoringSystem } from '@/lib/performance-monitoring-system';
import { analyticsDashboard } from '@/lib/analytics-dashboard';

interface PerformanceContextType {
  trackUserAction: (action: string, duration?: number) => void;
  trackError: (type: string, message: string, context?: any) => void;
  updateFeatureUsage: (feature: string, count: number) => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export function usePerformanceTracking() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformanceTracking must be used within a PerformanceProvider');
  }
  return context;
}

interface PerformanceProviderProps {
  children: React.ReactNode;
  enableMonitoring?: boolean;
  enableAnalytics?: boolean;
}

export function PerformanceProvider({ 
  children, 
  enableMonitoring = true, 
  enableAnalytics = true 
}: PerformanceProviderProps) {
  
  useEffect(() => {
    if (enableMonitoring) {
      // Start performance monitoring
      performanceMonitoringSystem.startMonitoring();
      
      // Add global error handler
      const handleGlobalError = (event: ErrorEvent) => {
        performanceMonitoringSystem.trackError(
          'javascript_error',
          event.message,
          {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack
          }
        );
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        performanceMonitoringSystem.trackError(
          'unhandled_promise_rejection',
          event.reason?.message || 'Promise rejected',
          {
            reason: event.reason,
            stack: event.reason?.stack
          }
        );
      };

      // Add global performance observers
      window.addEventListener('error', handleGlobalError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      // Track page load performance
      if (document.readyState === 'complete') {
        trackPageLoadPerformance();
      } else {
        window.addEventListener('load', trackPageLoadPerformance);
      }

      // Track user interactions
      setupInteractionTracking();

      return () => {
        performanceMonitoringSystem.stopMonitoring();
        window.removeEventListener('error', handleGlobalError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('load', trackPageLoadPerformance);
      };
    }
  }, [enableMonitoring]);

  useEffect(() => {
    if (enableAnalytics) {
      // Start analytics data collection
      analyticsDashboard.startDataCollection();

      return () => {
        analyticsDashboard.stopDataCollection();
      };
    }
  }, [enableAnalytics]);

  const trackPageLoadPerformance = () => {
    // Track navigation timing
    if ('performance' in window && performance.getEntriesByType) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        performanceMonitoringSystem.updateMetric('responseTime', navigation.responseEnd - navigation.responseStart);
        performanceMonitoringSystem.updateMetric('timeToFirstByte', navigation.responseStart - navigation.requestStart);
        
        // Track page load phases
        performanceMonitoringSystem.trackUserAction('page_load_complete', navigation.loadEventEnd - navigation.fetchStart);
        performanceMonitoringSystem.trackUserAction('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
      }
    }

    // Track resource loading
    if ('performance' in window && performance.getEntriesByType) {
      const resources = performance.getEntriesByType('resource');
      let totalResourceTime = 0;
      let errorCount = 0;

      resources.forEach((resource: any) => {
        totalResourceTime += resource.duration;
        
        // Track failed resources
        if (resource.transferSize === 0 && resource.decodedBodySize === 0) {
          errorCount++;
          performanceMonitoringSystem.trackError(
            'resource_load_failed',
            `Failed to load: ${resource.name}`,
            { resource: resource.name, type: resource.initiatorType }
          );
        }
      });

      performanceMonitoringSystem.updateMetric('throughput', resources.length / (totalResourceTime / 1000));
      if (resources.length > 0) {
        performanceMonitoringSystem.updateMetric('errorRate', errorCount / resources.length);
      }
    }
  };

  const setupInteractionTracking = () => {
    // Track click events
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const actionType = target.tagName.toLowerCase();
      const actionId = target.id || target.className || 'unknown';
      
      performanceMonitoringSystem.trackUserAction(`click_${actionType}`, 0);
      performanceMonitoringSystem.updateFeatureUsage(`ui_interaction_${actionType}`, 1);
    };

    // Track keyboard events
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        performanceMonitoringSystem.trackUserAction('keyboard_activation', 0);
      }
    };

    // Track form submissions
    const handleFormSubmit = (event: SubmitEvent) => {
      performanceMonitoringSystem.trackUserAction('form_submit', 0);
      performanceMonitoringSystem.updateFeatureUsage('form_interactions', 1);
    };

    // Track focus events for accessibility
    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches('input, textarea, select, button, [role="button"], [tabindex]')) {
        performanceMonitoringSystem.updateFeatureUsage('accessibility_navigation', 1);
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('submit', handleFormSubmit);
    document.addEventListener('focus', handleFocus, true);

    // Cleanup
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('submit', handleFormSubmit);
      document.removeEventListener('focus', handleFocus, true);
    };
  };

  const trackUserAction = (action: string, duration?: number) => {
    performanceMonitoringSystem.trackUserAction(action, duration);
  };

  const trackError = (type: string, message: string, context?: any) => {
    performanceMonitoringSystem.trackError(type, message, context);
  };

  const updateFeatureUsage = (feature: string, count: number) => {
    performanceMonitoringSystem.updateFeatureUsage(feature, count);
  };

  const contextValue: PerformanceContextType = {
    trackUserAction,
    trackError,
    updateFeatureUsage
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
}