/**
 * Feature Flag System for Continuous Reading
 * Manages gradual rollout and A/B testing
 */

export interface FeatureFlags {
  continuousReading: boolean;
  gaplessAudio: boolean;
  virtualizedScrolling: boolean;
  predictivePrefetch: boolean;
  mobileOptimizations: boolean;
}

export interface FeatureFlagConfig {
  userId?: string;
  bookId?: string;
  deviceType?: 'mobile' | 'desktop';
  experimentGroup?: 'control' | 'treatment';
}

// Default feature flags - conservative start
const DEFAULT_FLAGS: FeatureFlags = {
  continuousReading: false,
  gaplessAudio: false,
  virtualizedScrolling: false,
  predictivePrefetch: false,
  mobileOptimizations: true, // Always enable mobile optimizations
};

// Development overrides (only in dev environment)
const DEV_OVERRIDES: Partial<FeatureFlags> = {
  continuousReading: true,
  gaplessAudio: true,
  virtualizedScrolling: true,
  predictivePrefetch: true,
};

/**
 * Get feature flags for a given configuration
 */
export function getFeatureFlags(config: FeatureFlagConfig = {}): FeatureFlags {
  let flags = { ...DEFAULT_FLAGS };

  // Apply development overrides
  if (process.env.NODE_ENV === 'development') {
    flags = { ...flags, ...DEV_OVERRIDES };
  }

  // Apply experiment groups
  if (config.experimentGroup === 'treatment') {
    flags.continuousReading = true;
    flags.gaplessAudio = true;
  }

  // Mobile-specific flags
  if (config.deviceType === 'mobile') {
    flags.mobileOptimizations = true;
  }

  return flags;
}

/**
 * Hook for using feature flags in components
 */
export function useFeatureFlags(config: FeatureFlagConfig = {}) {
  return getFeatureFlags(config);
}

/**
 * Check if continuous reading is enabled
 */
export function isContinuousReadingEnabled(config: FeatureFlagConfig = {}): boolean {
  return getFeatureFlags(config).continuousReading;
}

/**
 * Environment-based flag checking
 */
export const FEATURE_FLAGS = {
  IS_DEV: process.env.NODE_ENV === 'development',
  IS_MOBILE_PRIORITY: true, // Always prioritize mobile
  ENABLE_AUDIO_EXPERIMENTS: process.env.NODE_ENV === 'development',
  ENABLE_PERFORMANCE_MONITORING: true,
} as const;