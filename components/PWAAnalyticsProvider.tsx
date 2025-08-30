/**
 * PWA Analytics Provider
 * Initializes and manages PWA analytics tracking throughout the application
 */

'use client';

import { useEffect, createContext, useContext, ReactNode } from 'react';
import { pwaAnalytics } from '@/lib/pwa-analytics';
import { getProductionFeatureFlags } from '@/lib/deployment-utils';

interface PWAAnalyticsContextType {
  trackEvent: (event: string, data?: any, userId?: string) => void;
  trackInstallPrompt: (action: 'shown' | 'accepted' | 'dismissed', variant?: string) => void;
  trackOfflineUsage: (action: 'activated' | 'deactivated', duration?: number) => void;
  trackPerformanceMetric: (metric: string, value: number, context?: any) => void;
}

const PWAAnalyticsContext = createContext<PWAAnalyticsContextType | undefined>(undefined);

export function usePWAAnalytics() {
  const context = useContext(PWAAnalyticsContext);
  if (!context) {
    throw new Error('usePWAAnalytics must be used within a PWAAnalyticsProvider');
  }
  return context;
}

interface PWAAnalyticsProviderProps {
  children: ReactNode;
  userId?: string;
  enableTracking?: boolean;
}

export function PWAAnalyticsProvider({ 
  children, 
  userId, 
  enableTracking = true 
}: PWAAnalyticsProviderProps) {
  
  useEffect(() => {
    if (!enableTracking) return;
    
    const initializeAnalytics = async () => {
      try {
        const featureFlags = getProductionFeatureFlags(userId);
        
        if (!featureFlags.analyticsTracking) {
          console.log('📊 PWA Analytics disabled by feature flag');
          return;
        }
        
        console.log('📊 Initializing PWA Analytics...');
        
        // Track app initialization
        pwaAnalytics.trackEvent('app_initialized', {
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          featureFlags,
        }, userId);
        
        // Track device type
        const deviceType = getDeviceType();
        pwaAnalytics.trackEvent('device_type_detected', {
          deviceType,
          screenSize: `${window.screen.width}x${window.screen.height}`,
          devicePixelRatio: window.devicePixelRatio,
        }, userId);
        
        // Track network type if available
        if ('connection' in navigator) {
          const connection = (navigator as any).connection;
          pwaAnalytics.trackEvent('network_type_detected', {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
          }, userId);
        }
        
        // Track PWA capabilities
        const pwaCapabilities = await checkPWACapabilities();
        pwaAnalytics.trackEvent('pwa_capabilities_checked', pwaCapabilities, userId);
        
        // Set up continuous tracking
        setupContinuousTracking();
        
        console.log('✅ PWA Analytics initialized successfully');
        
      } catch (error) {
        console.error('❌ Failed to initialize PWA Analytics:', error);
      }
    };
    
    initializeAnalytics();
    
  }, [enableTracking, userId]);

  const getDeviceType = (): string => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('mobile') || userAgent.includes('android')) return 'mobile';
    if (userAgent.includes('tablet') || userAgent.includes('ipad')) return 'tablet';
    return 'desktop';
  };

  const checkPWACapabilities = async (): Promise<any> => {
    const capabilities = {
      serviceWorker: 'serviceWorker' in navigator,
      pushNotifications: 'PushManager' in window,
      notifications: 'Notification' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      indexedDB: 'indexedDB' in window,
      webShare: 'share' in navigator,
      installPrompt: false,
      networkInformation: 'connection' in navigator,
      deviceMemory: 'deviceMemory' in navigator,
      storage: 'storage' in navigator,
    };
    
    // Check for install prompt capability
    try {
      window.addEventListener('beforeinstallprompt', () => {
        capabilities.installPrompt = true;
      });
    } catch (error) {
      // Install prompt not available
    }
    
    return capabilities;
  };

  const setupContinuousTracking = (): void => {
    // Track page visibility changes for engagement
    let visibilityStartTime = Date.now();
    let isVisible = !document.hidden;
    
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.hidden && isVisible) {
        // Page became hidden
        const visibleDuration = now - visibilityStartTime;
        pwaAnalytics.trackEvent('page_visibility_lost', {
          duration: visibleDuration,
          timestamp: now,
        }, userId);
        isVisible = false;
      } else if (!document.hidden && !isVisible) {
        // Page became visible
        pwaAnalytics.trackEvent('page_visibility_gained', {
          timestamp: now,
        }, userId);
        visibilityStartTime = now;
        isVisible = true;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Track PWA-specific events
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type) {
          pwaAnalytics.trackEvent('service_worker_message', {
            type: event.data.type,
            data: event.data,
            timestamp: Date.now(),
          }, userId);
        }
      });
    }
    
    // Track install prompt events
    window.addEventListener('beforeinstallprompt', (e) => {
      pwaAnalytics.trackEvent('pwa_install_prompt_shown', {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      }, userId);
    });
    
    window.addEventListener('appinstalled', (e) => {
      pwaAnalytics.trackEvent('pwa_installed', {
        timestamp: Date.now(),
        source: 'install_prompt',
      }, userId);
    });
    
    // Track performance metrics periodically
    setInterval(() => {
      if (!document.hidden && enableTracking) {
        trackPerformanceSnapshot();
      }
    }, 60000); // Every minute when page is visible
  };

  const trackPerformanceSnapshot = (): void => {
    // Collect current performance metrics
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        pwaAnalytics.trackEvent('performance_snapshot', {
          loadEventEnd: navigation.loadEventEnd,
          domContentLoadedEventEnd: navigation.domContentLoadedEventEnd,
          responseEnd: navigation.responseEnd,
          requestStart: navigation.requestStart,
          timestamp: Date.now(),
        }, userId);
      }
      
      // Track memory usage if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        pwaAnalytics.trackEvent('memory_usage_snapshot', {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          timestamp: Date.now(),
        }, userId);
      }
    }
  };

  // Context methods
  const trackEvent = (event: string, data?: any, eventUserId?: string) => {
    if (!enableTracking) return;
    pwaAnalytics.trackEvent(event, data, eventUserId || userId);
  };

  const trackInstallPrompt = (action: 'shown' | 'accepted' | 'dismissed', variant?: string) => {
    trackEvent(`pwa_install_prompt_${action}`, {
      variant,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    });
  };

  const trackOfflineUsage = (action: 'activated' | 'deactivated', duration?: number) => {
    trackEvent(`offline_mode_${action}`, {
      duration,
      timestamp: Date.now(),
      online: navigator.onLine,
    });
  };

  const trackPerformanceMetric = (metric: string, value: number, context?: any) => {
    trackEvent('performance_metric', {
      metric,
      value,
      context,
      timestamp: Date.now(),
    });
  };

  const contextValue: PWAAnalyticsContextType = {
    trackEvent,
    trackInstallPrompt,
    trackOfflineUsage,
    trackPerformanceMetric,
  };

  return (
    <PWAAnalyticsContext.Provider value={contextValue}>
      {children}
    </PWAAnalyticsContext.Provider>
  );
}