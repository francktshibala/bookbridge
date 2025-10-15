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

- [x] **Wave 1: Backend deployment complete** ✅ **DEPLOYED OCT 13, 2025**
  - [x] Database schema successfully migrated
  - [x] API endpoints deployed and working
  - [x] Production site: https://bookbridge-mkd7.onrender.com
  - [x] Test API working: /api/the-necklace-a1/bundles returns 71 bundles, 283 sentences
- [ ] Wave 2: Frontend with feature flags deployed
- [ ] The Necklace enabled and stable
- [ ] The Gift of the Magi enabled and stable
- [ ] The Metamorphosis enabled and stable
- [ ] The Lady with the Dog enabled and stable
- [ ] The Dead enabled and stable
- [ ] Navigation rebrand enabled
- [ ] All health checks passing
- [ ] Deployment complete ✅

---

## 📚 LESSONS LEARNED - Wave 1 Execution

### ✅ What Worked Successfully

1. **Manual Schema Extraction Strategy**
   - Cherry-picking caused merge conflicts due to mixed commits (schema + API + frontend)
   - **Solution**: Manually extracted only schema changes instead of fighting conflicts
   - **Result**: Clean, focused commits that deployed successfully

2. **GPT-5 Deployment Guidance**
   - Asked GPT-5 for advice when hitting cherry-picking challenges
   - **Recommendation**: Merge schema branch into APIs branch to resolve dependencies
   - **Result**: Eliminated API dependency errors and simplified deployment

3. **Backward-Compatible Database Changes**
   - Used nullable fields (`audioDurationMetadata Json?`)
   - Added new ReadingPosition model without breaking existing functionality
   - **Result**: Zero downtime, no user impact during schema deployment

4. **Production Environment Validation**
   - Fixed Stripe API version compatibility (local: `2025-08-27.basil` vs production: `2025-06-30.basil`)
   - **Result**: Successful production deployment on Render

5. **Backend-First Approach**
   - Deployed database + APIs before any user-facing changes
   - **Result**: Infrastructure ready, zero user impact, APIs working perfectly

### ⚠️ Critical Mistakes to Avoid

1. **Never Assume Deployment Success Without Verification**
   - Initially thought deployment failed when it was actually still building
   - **Lesson**: Always test production endpoints after deployment
   - **Action**: Verified both main site AND new API endpoints working

2. **Don't Cherry-Pick Large Mixed Commits**
   - Commits mixing schema + API + frontend changes caused complex merge conflicts
   - **Lesson**: Manual extraction is safer for complex deployments
   - **Future**: Keep commits focused on single concerns when possible

3. **Environment Compatibility is Critical**
   - Local environment had newer Stripe API version than production
   - **Lesson**: Always use production-compatible versions
   - **Future**: Document known version differences between environments

4. **Git Branch Management Complexity**
   - Created multiple deploy branches which caused confusion
   - **Lesson**: Simpler branch strategy when possible
   - **Future**: Merge deploy branches promptly after success

### 🔧 Proven Best Practices

1. **Pre-Deployment Verification**
   - ✅ Run `npm run build` locally first
   - ✅ Test new functionality in development
   - ✅ Verify environment variables are production-compatible
   - ✅ Ensure database changes are backward-compatible

2. **Post-Deployment Verification**
   - ✅ Test main site loads: https://bookbridge-mkd7.onrender.com
   - ✅ Test new API endpoints return expected data
   - ✅ Verify no errors in production logs
   - ✅ Confirm database migrations completed successfully

3. **Emergency Procedures**
   - Keep previous working commit hash: `8385752`
   - Have rollback plan ready
   - Feature flags prepared for quick disable

### 📊 Wave 1 Final Results

**Deployment Date**: October 13, 2025
**Platform**: Render (https://bookbridge-mkd7.onrender.com)
**Status**: ✅ **SUCCESSFUL - VERIFIED WORKING**

**Technical Changes Deployed**:
- ✅ 15 files changed, 1,986 insertions
- ✅ Prisma schema updated with audioDurationMetadata JSONB field
- ✅ ReadingPosition model added for cross-device progress tracking
- ✅ 8 new API routes deployed and responding correctly
- ✅ Stripe compatibility fixed for production environment
- ✅ Database migrations successful with zero downtime

**Verification Results**:
- ✅ Main site loading and functioning normally
- ✅ API test successful: The Necklace A1 returns 71 bundles with 283 sentences
- ✅ No user-facing disruptions or changes
- ✅ Backend infrastructure fully ready for Wave 2

---

## 🎯 Immediate Next Steps

1. **Execute Wave 2**: Deploy frontend components with feature flags (all OFF)
2. **Verify Wave 2**: Ensure UI components load but remain completely disabled
3. **Begin Wave 3**: Enable The Necklace A1 first (shortest, most stable)
4. **Monitor closely**: Watch error rates and performance metrics
5. **Document learnings**: Update this plan after each wave