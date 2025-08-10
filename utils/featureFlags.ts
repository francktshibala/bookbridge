/**
 * Feature Flag System for ESL Redesign
 * Enables safe, incremental rollout of ESL features
 */

export interface FeatureFlags {
  eslRedesign: boolean;
  sentenceSafeChunking: boolean;
  similarityGate: boolean;
  eslControlBar: boolean;
  compareMode: boolean;
  srsIntegration: boolean;
  precomputedSimplifications: boolean;
  nonStopListening: boolean; // Cross-page auto-advance
  easyNavigation: boolean;   // Swipe/keyboard navigation
}

// Default feature flags - all disabled initially for safe rollout
const DEFAULT_FLAGS: FeatureFlags = {
  eslRedesign: false,
  sentenceSafeChunking: false,
  similarityGate: false,
  eslControlBar: false,
  compareMode: false,
  srsIntegration: false,
  precomputedSimplifications: false,
  nonStopListening: false,
  easyNavigation: false,
};

/**
 * Get feature flags from environment variables with fallback to defaults
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    eslRedesign: process.env.NEXT_PUBLIC_ESL_REDESIGN === 'true',
    sentenceSafeChunking: process.env.NEXT_PUBLIC_SENTENCE_SAFE_CHUNKING === 'true',
    similarityGate: process.env.NEXT_PUBLIC_SIMILARITY_GATE === 'true',
    eslControlBar: process.env.NEXT_PUBLIC_ESL_CONTROL_BAR === 'true',
    compareMode: process.env.NEXT_PUBLIC_COMPARE_MODE === 'true',
    srsIntegration: process.env.NEXT_PUBLIC_SRS_INTEGRATION === 'true',
    precomputedSimplifications: process.env.NEXT_PUBLIC_PRECOMPUTED_SIMPLIFICATIONS === 'true',
    nonStopListening: process.env.NEXT_PUBLIC_NON_STOP_LISTENING === 'true',
    easyNavigation: process.env.NEXT_PUBLIC_EASY_NAVIGATION === 'true',
  };
}

/**
 * Get feature flags with user-level overrides (for beta testing)
 */
export function getFeatureFlagsForUser(userId?: string): FeatureFlags {
  const baseFlags = getFeatureFlags();
  
  // Beta user override - enable all flags for development
  if (userId && process.env.NEXT_PUBLIC_BETA_USER_IDS?.split(',').includes(userId)) {
    return Object.keys(baseFlags).reduce((flags, key) => {
      flags[key as keyof FeatureFlags] = true;
      return flags;
    }, {} as FeatureFlags);
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
    window.gtag?.('event', 'feature_flag_used', {
      flag_name: flag,
      flag_value: value,
      user_id: userId,
    });
  }
}