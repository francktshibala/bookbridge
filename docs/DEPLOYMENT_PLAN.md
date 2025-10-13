# Continuous Reading MVP Deployment Plan

## Overview
Deploy 2-week feature branch `feature/continuous-reading-mvp` safely to production using GPT-5's recommended strategy: backend-first deployment with feature flags and incremental book rollout.

## Core Strategy
1. **Two-Wave Deployment**: Backend first, then frontend with feature flags
2. **Per-Book Rollout**: Enable books individually with monitoring
3. **Rollback Ready**: Feature flags for quick disable/rollback
4. **Health Monitoring**: Check errors/metrics between each step

## Working Books to Deploy
- ✅ The Necklace (A1/A2/B1 levels, thematic sections)
- ✅ The Dead (A1/A2 levels, Solution 1 architecture)
- ✅ The Metamorphosis (A1 level)
- ✅ The Lady with the Dog (A1/A2 levels)
- ✅ The Gift of the Magi (A1/A2 levels, Solution 1 architecture)

---

## WAVE 1: Backend Deployment

### 1.1 Database Schema Changes
**Branch**: `deploy/backend-schema`
**Cherry-pick commits**:
- [ ] Schema migrations for bookChunk table
- [ ] audioDurationMetadata JSONB field addition
- [ ] Solution 1 metadata structure

**Commands**:
```bash
git checkout main
git checkout -b deploy/backend-schema
# Cherry-pick specific schema commits here
```

**Success Criteria**:
- [ ] Migrations run successfully in staging
- [ ] Backward compatibility maintained
- [ ] Rollback scripts tested

### 1.2 API Endpoints
**Branch**: `deploy/backend-apis`
**Cherry-pick commits**:
- [ ] `/api/the-necklace-a1/bundles` endpoint
- [ ] `/api/the-necklace-a2/bundles` endpoint
- [ ] `/api/the-necklace-b1/bundles` endpoint
- [ ] `/api/the-dead-a1/bundles` endpoint
- [ ] `/api/the-dead-a2/bundles` endpoint
- [ ] `/api/the-metamorphosis-a1/bundles` endpoint
- [ ] `/api/lady-with-dog-a1/bundles` endpoint
- [ ] `/api/lady-with-dog-a2/bundles` endpoint
- [ ] `/api/gift-of-the-magi-a1/bundles` endpoint
- [ ] `/api/gift-of-the-magi-a2/bundles` endpoint

**Success Criteria**:
- [ ] All endpoints return 200 with valid data
- [ ] 404 responses for unavailable books/levels
- [ ] Solution 1 metadata correctly cached
- [ ] Audio files accessible from Supabase storage

---

## WAVE 2: Frontend Deployment with Feature Flags

### 2.1 Feature Flag Implementation
**Branch**: `deploy/feature-flags`

**Required Feature Flags**:
```typescript
interface FeatureFlags {
  ENABLE_SIMPLIFIED_BOOKS_PAGE: boolean;
  ENABLE_NAVIGATION_REBRAND: boolean;
  ENABLE_THE_NECKLACE: boolean;
  ENABLE_THE_DEAD: boolean;
  ENABLE_THE_METAMORPHOSIS: boolean;
  ENABLE_LADY_WITH_DOG: boolean;
  ENABLE_GIFT_OF_MAGI: boolean;
}
```

**Default State**: ALL flags = `false`

### 2.2 Simplified Books Page
**Branch**: `deploy/simplified-books-page`
**Cherry-pick commits**:
- [ ] Simplified Books page component
- [ ] Feature flag integration
- [ ] Book filtering by flags

### 2.3 Navigation Updates
**Branch**: `deploy/navigation-rebrand`
**Cherry-pick commits**:
- [ ] "Featured Books" → "Simplified Books" in Navigation.tsx
- [ ] Mobile navigation update
- [ ] Feature flag wrapper

---

## WAVE 3: Incremental Book Rollout

### Book Rollout Order
1. **The Necklace** (most tested, shortest)
2. **The Gift of the Magi** (Solution 1 architecture)
3. **The Metamorphosis** (single level, simple)
4. **The Lady with the Dog** (2 levels)
5. **The Dead** (longest, most complex)

### Per-Book Deployment Process
For each book:

1. **Enable Feature Flag**
   ```bash
   # Set ENABLE_[BOOK_NAME] = true
   ```

2. **Monitor for 10-30 minutes**:
   - [ ] Error rates in logs
   - [ ] Audio playback success
   - [ ] Sync accuracy
   - [ ] User engagement metrics

3. **Test Critical Paths**:
   - [ ] Book loads on Simplified Books page
   - [ ] Audio plays without errors
   - [ ] Text-audio sync is accurate
   - [ ] Chapter navigation works
   - [ ] Level switching works (if applicable)

4. **Rollback Command** (if issues):
   ```bash
   # Set ENABLE_[BOOK_NAME] = false
   ```

### Final Step: Navigation Rebrand
- [ ] Enable `ENABLE_NAVIGATION_REBRAND = true`
- [ ] Monitor for UI issues
- [ ] Test mobile navigation

---

## Rollback Procedures

### Emergency Rollback
```bash
# Disable all new features immediately
ENABLE_SIMPLIFIED_BOOKS_PAGE = false
ENABLE_NAVIGATION_REBRAND = false
# All book flags = false
```

### Per-Book Rollback
```bash
# Disable specific book
ENABLE_[BOOK_NAME] = false
```

### Database Rollback
```bash
# Run prepared rollback migrations
npm run db:rollback
```

---

## Health Checks & Monitoring

### Key Metrics to Watch
- [ ] API response times for new endpoints
- [ ] Error rates in browser console
- [ ] Audio playback success rate
- [ ] Text-audio sync accuracy
- [ ] User session duration
- [ ] Page load times

### Success Criteria (Per Book)
- [ ] < 1% error rate increase
- [ ] Audio loads within 3 seconds
- [ ] Text highlighting syncs within 500ms
- [ ] No console errors during playback
- [ ] User can complete full book reading

### Alerting Thresholds
- API error rate > 5%
- Audio load failures > 10%
- Sync accuracy < 90%

---

## Commit Hash References

### To Be Populated
Once we identify the specific commits to cherry-pick:

```bash
# Schema changes
git cherry-pick [HASH] # bookChunk table migration
git cherry-pick [HASH] # audioDurationMetadata field

# API endpoints
git cherry-pick [HASH] # The Necklace APIs
git cherry-pick [HASH] # The Dead APIs
git cherry-pick [HASH] # The Metamorphosis API
git cherry-pick [HASH] # Lady with Dog APIs
git cherry-pick [HASH] # Gift of Magi APIs

# Frontend changes
git cherry-pick [HASH] # Simplified Books page
git cherry-pick [HASH] # Navigation rebrand
```

---

## Timeline Estimate

**Wave 1 (Backend)**: 1-2 days
**Wave 2 (Frontend + Flags)**: 1 day
**Wave 3 (Book Rollout)**: 2-3 days (30 min per book + monitoring)

**Total**: 4-6 days for complete deployment

---

## Team Responsibilities

- **Backend deployment**: Wave 1 execution
- **Frontend deployment**: Wave 2 execution
- **Monitoring**: Health checks during Wave 3
- **Rollback authority**: Immediate disable if issues detected

---

## Status Tracking

- [ ] Wave 1: Backend deployment complete
- [ ] Wave 2: Frontend with feature flags deployed
- [ ] The Necklace enabled and stable
- [ ] The Gift of the Magi enabled and stable
- [ ] The Metamorphosis enabled and stable
- [ ] The Lady with the Dog enabled and stable
- [ ] The Dead enabled and stable
- [ ] Navigation rebrand enabled
- [ ] All health checks passing
- [ ] Deployment complete ✅