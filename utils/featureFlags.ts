/**
 * Feature Flag System for Controlled Feature Rollout
 * Enables safe, incremental rollout of features
 */

export interface FeatureFlags {
  unifiedBottomControls?: boolean;
  pwaInstallPrompt?: boolean;
  offlineMode?: boolean;
  audioPreloading?: boolean;
  performanceMonitoring?: boolean;
  analyticsTracking?: boolean;
  emergingMarketsOptimizations?: boolean;
}

// Default feature flags - conservative defaults for production rollout
const DEFAULT_FLAGS: FeatureFlags = {
  unifiedBottomControls: false,
  pwaInstallPrompt: true, // Core PWA functionality enabled by default
  offlineMode: true, // Offline functionality ready for production
  audioPreloading: false, // Conservative bandwidth usage initially
  performanceMonitoring: true, // Essential for production monitoring
  analyticsTracking: true, // Analytics enabled for user behavior insights
  emergingMarketsOptimizations: false, // Gradual rollout for target markets
};

/**
 * Get feature flags from environment variables with fallback to defaults
 */
export function getFeatureFlags(): FeatureFlags {
  // Allow complete override for development/staging
  if (process.env.NODE_ENV === 'development') {
    return {
      ...DEFAULT_FLAGS,
      // Enable all features in development for testing
      unifiedBottomControls: true,
      pwaInstallPrompt: true,
      offlineMode: true,
      audioPreloading: true,
      performanceMonitoring: true,
      analyticsTracking: false, // Disable analytics in dev
      emergingMarketsOptimizations: true,
    };
  }

  return {
    unifiedBottomControls: process.env.NEXT_PUBLIC_UNIFIED_BOTTOM_CONTROLS === 'true' || DEFAULT_FLAGS.unifiedBottomControls,
    pwaInstallPrompt: process.env.NEXT_PUBLIC_PWA_INSTALL_PROMPT !== 'false' && (DEFAULT_FLAGS.pwaInstallPrompt ?? true),
    offlineMode: process.env.NEXT_PUBLIC_OFFLINE_MODE !== 'false' && (DEFAULT_FLAGS.offlineMode ?? true),
    audioPreloading: process.env.NEXT_PUBLIC_AUDIO_PRELOADING === 'true' || DEFAULT_FLAGS.audioPreloading,
    performanceMonitoring: process.env.NEXT_PUBLIC_PERFORMANCE_MONITORING !== 'false' && (DEFAULT_FLAGS.performanceMonitoring ?? true),
    analyticsTracking: process.env.NEXT_PUBLIC_ANALYTICS_TRACKING !== 'false' && (DEFAULT_FLAGS.analyticsTracking ?? true),
    emergingMarketsOptimizations: process.env.NEXT_PUBLIC_EMERGING_MARKETS_OPTIMIZATIONS === 'true' || DEFAULT_FLAGS.emergingMarketsOptimizations,
  };
}

/**
 * Get feature flags with user-level overrides (for beta testing)
 */
export function getFeatureFlagsForUser(userId?: string): FeatureFlags {
  const baseFlags = getFeatureFlags();
  
  // Beta user override - enable all flags for development
  if (userId && process.env.NEXT_PUBLIC_BETA_USER_IDS?.split(',').includes(userId)) {
    const allEnabledFlags = { ...baseFlags };
    Object.keys(baseFlags).forEach(key => {
      (allEnabledFlags as any)[key] = true;
    });
    return allEnabledFlags;
  }

  return baseFlags;
}

/**
 * Hook to use feature flags in React components
 */
export function useFeatureFlags(userId?: string): FeatureFlags {
  return getFeatureFlagsForUser(userId);
}

/**
 * Telemetry helper for A/B testing
 */
export function trackFeatureFlagUsage(flag: keyof FeatureFlags, value: boolean, userId?: string) {
  // Track feature flag usage for analytics
  if (typeof window !== 'undefined') {
    (window as any).gtag?.('event', 'feature_flag_used', {
      flag_name: flag,
      flag_value: value,
      user_id: userId,
    });
  }
}