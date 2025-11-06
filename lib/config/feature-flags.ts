/**
 * Feature Flags Configuration
 * Phase 7: Migration strategy for book catalog transformation
 * References: BOOK_ORGANIZATION_SCHEMES.md Phase 7
 */

export interface FeatureFlags {
  // Book Catalog System
  enableCatalogSystem: boolean;
  enableCollectionBrowsing: boolean;
  enableAdvancedFilters: boolean;
  enableSearchSuggestions: boolean;
  enableCatalogTelemetry: boolean;

  // Migration Settings
  catalogMigrationPhase: 'none' | 'beta' | 'gradual' | 'complete';
  catalogBetaUsers: string[]; // User IDs for beta testing
}

/**
 * Default feature flags
 * Can be overridden by environment variables or database settings
 */
const defaultFlags: FeatureFlags = {
  // Book Catalog System - Default OFF for gradual rollout
  enableCatalogSystem: process.env.NEXT_PUBLIC_ENABLE_CATALOG === 'true' || false,
  enableCollectionBrowsing: process.env.NEXT_PUBLIC_ENABLE_COLLECTIONS === 'true' || false,
  enableAdvancedFilters: process.env.NEXT_PUBLIC_ENABLE_FILTERS === 'true' || false,
  enableSearchSuggestions: process.env.NEXT_PUBLIC_ENABLE_SEARCH === 'true' || false,
  enableCatalogTelemetry: process.env.NEXT_PUBLIC_ENABLE_CATALOG_TELEMETRY === 'true' || false,

  // Migration Phase - Controlled rollout
  catalogMigrationPhase: (process.env.NEXT_PUBLIC_CATALOG_PHASE as any) || 'none',
  catalogBetaUsers: process.env.NEXT_PUBLIC_CATALOG_BETA_USERS?.split(',') || [],
};

/**
 * Get feature flags (can be extended to fetch from database)
 */
export function getFeatureFlags(userId?: string): FeatureFlags {
  const flags = { ...defaultFlags };

  // Beta testing: Override for specific users
  if (userId && flags.catalogBetaUsers.includes(userId)) {
    return {
      ...flags,
      enableCatalogSystem: true,
      enableCollectionBrowsing: true,
      enableAdvancedFilters: true,
      enableSearchSuggestions: true,
      enableCatalogTelemetry: true,
      catalogMigrationPhase: 'beta',
    };
  }

  // Gradual rollout: Enable features based on migration phase
  if (flags.catalogMigrationPhase === 'gradual') {
    return {
      ...flags,
      enableCatalogSystem: true,
      enableCollectionBrowsing: true,
      enableAdvancedFilters: false, // Gradually enable
      enableSearchSuggestions: true,
      enableCatalogTelemetry: true,
    };
  }

  // Complete migration: All features enabled
  if (flags.catalogMigrationPhase === 'complete') {
    return {
      ...flags,
      enableCatalogSystem: true,
      enableCollectionBrowsing: true,
      enableAdvancedFilters: true,
      enableSearchSuggestions: true,
      enableCatalogTelemetry: true,
    };
  }

  return flags;
}

/**
 * Check if catalog system should be used
 */
export function shouldUseCatalogSystem(userId?: string): boolean {
  const flags = getFeatureFlags(userId);
  return flags.enableCatalogSystem;
}

/**
 * Get catalog route based on feature flags
 */
export function getCatalogRoute(userId?: string): string {
  return shouldUseCatalogSystem(userId) ? '/catalog' : '/featured-books';
}
