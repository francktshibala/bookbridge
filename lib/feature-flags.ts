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
 * Books with working bundle APIs (auto-detection like Enhanced Books)
 * This replaces the need for environment variables
 */
const BOOKS_WITH_BUNDLE_APIS = new Set([
  // Books with dedicated bundle APIs
  'the-necklace',
  'the-dead',
  'the-metamorphosis',
  'lady-with-dog',
  'gift-of-the-magi',
  'gutenberg-43',        // Jekyll & Hyde
  'the-devoted-friend',
  'gutenberg-1952-A1',   // Yellow Wallpaper
  'sleepy-hollow-enhanced',
  'great-gatsby-a2',

  // Also support the variation IDs
  'gutenberg-1952',      // Yellow Wallpaper alternative ID
  'jekyll-hyde',         // Jekyll & Hyde alternative ID
  'yellow-wallpaper',    // Yellow Wallpaper alternative ID
  'sleepy-hollow',       // Sleepy Hollow alternative ID
]);

/**
 * Check if continuous reading is enabled for a specific book
 * Auto-detects books with working bundle APIs (like Enhanced Books page)
 */
export function isContinuousReadingEnabledForBook(bookId: string, userId?: string): boolean {
  // Auto-detect books with bundle APIs (no environment variables needed)
  if (BOOKS_WITH_BUNDLE_APIS.has(bookId)) {
    return true;
  }

  // Fallback: Still support environment allowlist for manual overrides
  const allowedBooks = process.env.NEXT_PUBLIC_CONTINUOUS_READING_BOOKS?.split(',') || [];
  if (allowedBooks.includes(bookId)) {
    return true;
  }

  return false;
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