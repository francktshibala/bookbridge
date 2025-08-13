/**
 * Feature Flag System for Controlled Feature Rollout
 * Enables safe, incremental rollout of features
 */

export interface FeatureFlags {
  // Add future feature flags here
}

// Default feature flags - all disabled initially for safe rollout
const DEFAULT_FLAGS: FeatureFlags = {
  // Add default values for future flags here
};

/**
 * Get feature flags from environment variables with fallback to defaults
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    // Add environment variable mappings for future flags here
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