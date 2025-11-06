# Book Catalog System - Migration Guide

## Overview

This guide outlines the deployment strategy for migrating from the hardcoded 10-book system to the scalable database-driven catalog system.

**Status:** ✅ Implementation Complete (Phase 1-7)
**Migration Status:** 🚧 Ready for Deployment
**Risk Level:** Low (zero-downtime dual-read strategy)

---

## Migration Phases

### Phase 0: Pre-Deployment Checklist

**Before deploying to production:**

1. **Database Setup**
   ```bash
   # Run migrations on production database
   npx prisma migrate deploy

   # Verify migrations applied
   npx prisma migrate status
   ```

2. **Seed Initial Data**
   ```bash
   # Populate FeaturedBook table with existing 10 books
   # Populate BookCollection table with initial collections
   # See: scripts/seed-catalog.ts (TODO: Create seed script)
   ```

3. **Environment Variables**
   ```bash
   # Add to .env.production
   NEXT_PUBLIC_CATALOG_PHASE=none  # Start with feature disabled
   NEXT_PUBLIC_ENABLE_CATALOG=false
   NEXT_PUBLIC_ENABLE_CATALOG_TELEMETRY=true
   ```

4. **Build Verification**
   ```bash
   npm run build
   # Verify /catalog route builds successfully
   ```

---

### Phase 1: Beta Testing (Week 1)

**Goal:** Test with internal users and beta testers

**Configuration:**
```bash
NEXT_PUBLIC_CATALOG_PHASE=beta
NEXT_PUBLIC_CATALOG_BETA_USERS=user-id-1,user-id-2,user-id-3
```

**Actions:**
1. Deploy to production with feature flag OFF for general users
2. Enable for beta users via `CATALOG_BETA_USERS` environment variable
3. Monitor telemetry for:
   - TTFA (Time to First Activity): Target < 500ms
   - Cache hit rate: Target > 70%
   - Search performance: p95 < 1000ms
   - Error rates: Target < 0.1%

**Verification:**
- Beta users can access `/catalog` route
- All catalog features work (search, filters, collections)
- Telemetry data is being collected
- No impact on non-beta users

**Rollback:** Set `NEXT_PUBLIC_CATALOG_PHASE=none` to disable

---

### Phase 2: Gradual Rollout (Week 2)

**Goal:** Enable for 25% → 50% → 75% of users

**Configuration:**
```bash
NEXT_PUBLIC_CATALOG_PHASE=gradual
NEXT_PUBLIC_ENABLE_CATALOG=true
NEXT_PUBLIC_ENABLE_COLLECTIONS=true
NEXT_PUBLIC_ENABLE_SEARCH=true
NEXT_PUBLIC_ENABLE_FILTERS=false  # Enable in sub-phases
```

**Actions:**
1. Use feature flag logic to gradually enable:
   - Week 2.1: 25% of users (random sampling)
   - Week 2.2: 50% of users
   - Week 2.3: 75% of users
2. Monitor metrics (same as Phase 1)
3. Gradually enable advanced filters if metrics are healthy

**Verification:**
- Cache performance remains strong (> 70% hit rate)
- No increase in error rates
- User feedback is positive
- Database query performance is acceptable

**Rollback:** Reduce percentage or set `NEXT_PUBLIC_CATALOG_PHASE=beta`

---

### Phase 3: Complete Migration (Week 3-4)

**Goal:** Enable for 100% of users, deprecate old system

**Configuration:**
```bash
NEXT_PUBLIC_CATALOG_PHASE=complete
NEXT_PUBLIC_ENABLE_CATALOG=true
NEXT_PUBLIC_ENABLE_COLLECTIONS=true
NEXT_PUBLIC_ENABLE_SEARCH=true
NEXT_PUBLIC_ENABLE_FILTERS=true
NEXT_PUBLIC_ENABLE_CATALOG_TELEMETRY=true
```

**Actions:**
1. Enable catalog for all users
2. Monitor for 1 week with full features
3. If stable, remove feature flag checks from code
4. Archive old BookSelectionGrid component
5. Update navigation to default to `/catalog`

**Verification:**
- All users successfully using new catalog
- Telemetry shows healthy performance
- No support tickets related to catalog issues

**Cleanup:**
```typescript
// Remove from featured-books/page.tsx:
const ALL_FEATURED_BOOKS: FeaturedBook[] = [ /* ... */ ];
```

---

## Rollback Strategy

### Emergency Rollback (< 5 minutes)

If critical issues occur:

```bash
# 1. Set environment variable
NEXT_PUBLIC_CATALOG_PHASE=none

# 2. Redeploy (zero-downtime)
vercel --prod

# 3. Users automatically revert to old system
```

### Partial Rollback

To rollback specific features only:

```bash
# Disable problematic features
NEXT_PUBLIC_ENABLE_FILTERS=false
NEXT_PUBLIC_ENABLE_SEARCH=false
```

---

## Performance Targets

Based on GPT-5 recommendations:

| Metric | Target | Monitoring |
|--------|--------|------------|
| TTFA (Time to First Activity) | < 500ms | Telemetry |
| Cache hit rate | > 70% | Telemetry |
| Search p50 | < 300ms | Telemetry |
| Search p95 | < 1000ms | Telemetry |
| API response time | < 200ms | Server logs |
| Database query time | < 100ms | Prisma logs |

**Monitoring Commands:**
```typescript
import { getTelemetrySummary } from '@/lib/telemetry';

// In browser console or admin panel
getTelemetrySummary();
// Returns: { count, p50, p95, avgResultCount, cacheHitRate }
```

---

## Data Migration

### Step 1: Export Existing Books

```typescript
// scripts/export-books.ts
const existingBooks = [
  {
    id: 'the-necklace',
    title: 'The Necklace',
    author: 'Guy de Maupassant',
    // ... existing data
  },
  // ... 9 more books
];

// Transform to FeaturedBook schema
const featuredBooks = existingBooks.map(book => ({
  slug: book.id,
  title: book.title,
  author: book.author,
  description: book.description,
  sentences: book.sentences,
  bundles: book.bundles,
  gradient: book.gradient,
  abbreviation: book.abbreviation,
  // New fields
  genres: inferGenres(book),
  themes: inferThemes(book),
  moods: inferMoods(book),
  readingTimeMinutes: calculateReadingTime(book.sentences),
  difficultyScore: 0.5,
  popularityScore: 100,
  isClassic: true,
  isFeatured: true,
  isNew: false,
}));
```

### Step 2: Seed Database

```bash
# Run seed script
ts-node scripts/seed-catalog.ts

# Verify data
npx prisma studio
# Check FeaturedBook table has 10 entries
```

### Step 3: Create Collections

```typescript
// Example collections to create
const collections = [
  {
    slug: 'classics',
    name: 'Classic Literature',
    description: 'Timeless masterpieces',
    icon: '📚',
    type: 'genre',
    isPrimary: true,
    books: ['the-necklace', 'the-dead', 'the-metamorphosis', ...]
  },
  {
    slug: 'quick-reads',
    name: 'Quick Reads',
    description: 'Books under 30 minutes',
    icon: '⚡',
    type: 'reading-time',
    isPrimary: true,
    books: ['the-necklace', 'gift-of-the-magi', ...]
  },
  // ... more collections
];
```

---

## Testing Checklist

### Before Deployment

- [ ] All migrations run successfully
- [ ] Database seeded with 10 books
- [ ] Collections created and linked
- [ ] Build passes (`npm run build`)
- [ ] All catalog components render correctly
- [ ] Search returns results
- [ ] Filters work (genres, moods, reading time)
- [ ] Pagination works (cursor-based)
- [ ] Cache is functioning (70%+ hit rate in testing)
- [ ] Telemetry is collecting data

### Post-Deployment (Beta)

- [ ] Beta users can access `/catalog`
- [ ] All features work for beta users
- [ ] No errors in server logs
- [ ] Telemetry shows healthy metrics
- [ ] Book selection navigates to reading interface
- [ ] Regular users still see old system

### Post-Deployment (Complete)

- [ ] All users can access catalog
- [ ] Old system still works as fallback
- [ ] Performance metrics meet targets
- [ ] No increase in error rates
- [ ] Support tickets are minimal

---

## Monitoring & Alerts

### Metrics to Watch

1. **Client-side (Telemetry)**
   ```typescript
   // Check in browser console
   localStorage.getItem('catalog-telemetry')
   ```

2. **Server-side**
   - Database query performance (Prisma logs)
   - API response times (Next.js logs)
   - Error rates (Sentry/logging service)

3. **User Experience**
   - Support tickets
   - User feedback
   - Session recordings (if available)

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| API response time | > 500ms | > 1000ms |
| Error rate | > 1% | > 5% |
| Cache hit rate | < 60% | < 40% |
| Search p95 | > 1500ms | > 3000ms |

---

## Common Issues & Solutions

### Issue: Slow search performance

**Symptoms:** Search takes > 1s
**Cause:** Missing indexes or full-text search not configured
**Solution:**
```sql
-- Verify indexes exist
SELECT indexname FROM pg_indexes WHERE tablename = 'featured_books';

-- Rebuild search index if needed
REINDEX INDEX featured_books_search_vector_idx;
```

### Issue: Low cache hit rate

**Symptoms:** < 50% cache hits
**Cause:** Cache size too small or keys not deterministic
**Solution:**
```typescript
// Increase cache size in CatalogContext.tsx
const responseCache = new LRUCache<PaginatedBooks>(50); // Increase from 20
```

### Issue: Database connection pool exhausted

**Symptoms:** "Too many connections" errors
**Cause:** Prisma connection pool too small
**Solution:**
```prisma
// Update schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  pool_timeout = 20
  connection_limit = 50  // Increase
}
```

---

## Success Criteria

Migration is considered successful when:

1. ✅ All users can browse and discover books
2. ✅ Performance targets are met (TTFA < 500ms, cache hit > 70%)
3. ✅ No increase in error rates or support tickets
4. ✅ User feedback is positive
5. ✅ Old system can be safely deprecated

---

## Future Enhancements

After successful migration, consider:

1. **Scaling to Thousands of Books**
   - Add Elasticsearch for advanced search
   - Implement pagination prefetch
   - Add book recommendations engine
   - See: BOOK_ORGANIZATION_SCHEMES.md "Scaling to Thousands"

2. **Advanced Features**
   - Smart collections (GPT-5 recommendation)
   - Personalized recommendations
   - Reading history integration
   - Social features (wishlists, sharing)

3. **Performance Optimizations**
   - Edge caching (Vercel Edge Network)
   - Database read replicas
   - CDN for book metadata

---

## Contact & Support

For questions or issues during migration:

- **Technical Lead:** [Your Name]
- **Documentation:** docs/BOOK_ORGANIZATION_SCHEMES.md
- **Architecture:** docs/ARCHITECTURE_OVERVIEW.md

---

**Last Updated:** 2025-01-06
**Migration Status:** Phase 1-7 Complete, Ready for Beta Testing
