# Current Deployment Plan - Step by Step

## Current Status
- **Date**: October 2025
- **Current Branch**: `chore/remove-epub-parser`
- **Production Status**: Wave 1 deployed (backend APIs + schema)
- **Pending**: Security fix + 500+ files from continuous reading feature

## What Needs to be Deployed

### 1. Security Fix (IMMEDIATE - Day 1)
**Branch**: `chore/remove-epub-parser`
**Changes**: Removed vulnerable `epub-parser` package
**Files Changed**:
- `package.json`
- `package-lock.json`

### 2. Main Branch Changes (NOT YET PUSHED)
**Contains**: Merge of `feature/continuous-reading-mvp` (500+ files)
**Major Changes**:
- 500+ new files including:
  - Cache files for book content
  - Scripts for book processing
  - Test files for mobile and continuous reading
  - Documentation updates
  - New API routes for bundles
  - React downgrade (19.1.0 → 18.3.1)

---

## Step-by-Step Deployment Plan

### Phase 1: Security Fix Deployment (Day 1 - Immediate)

```bash
# Step 1.1: Ensure we're on the security fix branch
git checkout chore/remove-epub-parser

# Step 1.2: Verify the fix
npm audit
# Expected: 0 vulnerabilities

# Step 1.3: Test build locally
npm run build
# Expected: Build succeeds

# Step 1.4: Commit if not already done
git add package.json package-lock.json
git commit -m "fix: remove vulnerable epub-parser package - fixes 6 security vulnerabilities"

# Step 1.5: Push security fix to GitHub
git push origin chore/remove-epub-parser

# Step 1.6: Create PR and merge to main on GitHub
# Or direct merge:
git checkout main
git merge chore/remove-epub-parser
git push origin main

# Step 1.7: Deploy to production
# Trigger production deployment on Render
```

**Success Criteria**:
- [ ] 0 vulnerabilities in npm audit
- [ ] Production site still works
- [ ] No errors in production logs

**Monitor for**: 24 hours

---

### Phase 2: Push Continuous Reading Features to GitHub (Day 2)

```bash
# Step 2.1: Ensure main has all changes
git checkout main
# Verify merge is complete (should already have continuous-reading-mvp merged)

# Step 2.2: Create backup tag before pushing
git tag pre-continuous-reading-push
git push origin pre-continuous-reading-push

# Step 2.3: Push to staging branch first
git push origin main:staging-continuous-reading

# Step 2.4: After testing, push to main
git push origin main
```

**Files Being Pushed** (Summary):
- 500+ new files
- 200+ cache files
- 100+ scripts
- 50+ test files
- New API routes
- Documentation updates

---

### Phase 3: Deploy to Staging Environment (Day 2-3)

```bash
# Step 3.1: Deploy staging branch to staging environment
# (Using your staging URL/environment)

# Step 3.2: Run full test suite
npm test
npm run lint
npm run typecheck

# Step 3.3: Test critical paths manually
# - Load main page
# - Test existing book functionality
# - Verify new API endpoints work
# - Check that feature flags are OFF
```

**Critical API Endpoints to Test**:
- [ ] `/api/the-necklace-a1/bundles`
- [ ] `/api/the-necklace-a2/bundles`
- [ ] `/api/the-necklace-b1/bundles`
- [ ] `/api/the-dead-a1/bundles`
- [ ] `/api/the-dead-a2/bundles`
- [ ] `/api/the-metamorphosis-a1/bundles`
- [ ] `/api/lady-with-dog-a1/bundles`
- [ ] `/api/gift-of-the-magi-a1/bundles`

---

### Phase 4: Production Deployment with Feature Flags OFF (Day 3-4)

```bash
# Step 4.1: Ensure all feature flags are OFF in production config
ENABLE_SIMPLIFIED_BOOKS_PAGE=false
ENABLE_NAVIGATION_REBRAND=false
ENABLE_THE_NECKLACE=false
ENABLE_THE_DEAD=false
ENABLE_THE_METAMORPHOSIS=false
ENABLE_LADY_WITH_DOG=false
ENABLE_GIFT_OF_MAGI=false

# Step 4.2: Deploy to production
# Trigger deployment on Render from main branch

# Step 4.3: Verify deployment
curl https://bookbridge-mkd7.onrender.com/api/the-necklace-a1/bundles
# Expected: 200 OK with bundle data
```

**Success Criteria**:
- [ ] Site loads normally
- [ ] No new UI elements visible (flags OFF)
- [ ] API endpoints return data
- [ ] No console errors
- [ ] Performance metrics stable

---

### Phase 5: Incremental Feature Rollout (Day 4-7)

#### Book 1: The Necklace (Day 4)
```bash
# Step 5.1.1: Enable The Necklace
ENABLE_THE_NECKLACE=true

# Step 5.1.2: Monitor for 30 minutes
# Check: Error rates, audio playback, sync accuracy

# Step 5.1.3: If issues, rollback
ENABLE_THE_NECKLACE=false
```

#### Book 2: The Gift of the Magi (Day 5)
```bash
# Step 5.2.1: Enable Gift of Magi
ENABLE_GIFT_OF_MAGI=true

# Step 5.2.2: Monitor for 30 minutes

# Step 5.2.3: If issues, rollback
ENABLE_GIFT_OF_MAGI=false
```

#### Book 3: The Metamorphosis (Day 5)
```bash
# Step 5.3.1: Enable Metamorphosis
ENABLE_THE_METAMORPHOSIS=true

# Step 5.3.2: Monitor for 30 minutes

# Step 5.3.3: If issues, rollback
ENABLE_THE_METAMORPHOSIS=false
```

#### Book 4: The Lady with the Dog (Day 6)
```bash
# Step 5.4.1: Enable Lady with Dog
ENABLE_LADY_WITH_DOG=true

# Step 5.4.2: Monitor for 30 minutes

# Step 5.4.3: If issues, rollback
ENABLE_LADY_WITH_DOG=false
```

#### Book 5: The Dead (Day 6)
```bash
# Step 5.5.1: Enable The Dead
ENABLE_THE_DEAD=true

# Step 5.5.2: Monitor for 30 minutes

# Step 5.5.3: If issues, rollback
ENABLE_THE_DEAD=false
```

#### Final: Enable Simplified Books Page & Navigation (Day 7)
```bash
# Step 5.6.1: Enable UI changes
ENABLE_SIMPLIFIED_BOOKS_PAGE=true
ENABLE_NAVIGATION_REBRAND=true

# Step 5.6.2: Monitor UI for issues

# Step 5.6.3: If issues, rollback
ENABLE_SIMPLIFIED_BOOKS_PAGE=false
ENABLE_NAVIGATION_REBRAND=false
```

---

## Emergency Rollback Procedures

### Application Rollback
```bash
# Option 1: Feature flag disable (fastest)
# Set all flags to false in production

# Option 2: Git revert
git revert HEAD
git push origin main

# Option 3: Deploy previous version
# Deploy tag: pre-continuous-reading-push
```

### Database Rollback
```bash
# If schema issues (unlikely since Wave 1 already deployed)
npx prisma migrate rollback
```

---

## Monitoring Checklist

### During Each Phase
- [ ] Check error rates (< 1% increase)
- [ ] Monitor API response times (< 3s)
- [ ] Check browser console for errors
- [ ] Verify audio playback works
- [ ] Test text-audio sync accuracy
- [ ] Monitor server memory/CPU usage

### Alert Thresholds
- API error rate > 5% → Rollback
- Audio load failures > 10% → Rollback
- Page load time > 5 seconds → Investigate
- Server errors (5xx) > 1% → Rollback

---

## Current Git Status

### Local Branches
- `main` - Has merged continuous-reading-mvp + conflicts resolved
- `chore/remove-epub-parser` - Security fix branch
- `feature/continuous-reading-mvp` - Original feature branch

### What's NOT in Production Yet
1. Security fix (epub-parser removal)
2. All continuous reading features (500+ files)
3. React version downgrade
4. New bundle API implementations
5. Cache files and scripts
6. Test files and documentation

---

## Timeline Summary

**Day 1** (Today):
- [ ] Deploy security fix
- [ ] Monitor for 24 hours

**Day 2**:
- [ ] Push everything to GitHub
- [ ] Deploy to staging

**Day 3**:
- [ ] Test in staging
- [ ] Deploy to production (flags OFF)

**Day 4-6**:
- [ ] Enable books one by one
- [ ] Monitor each for 30 minutes

**Day 7**:
- [ ] Enable UI changes
- [ ] Complete deployment

**Total Time**: 7 days for complete, safe deployment

---

## Important Commands Reference

```bash
# Check current branch
git branch --show-current

# Check what will be pushed
git diff origin/main..HEAD --stat

# Test build
npm run build

# Check vulnerabilities
npm audit

# Run tests
npm test

# Check production
curl https://bookbridge-mkd7.onrender.com

# Check API endpoint
curl https://bookbridge-mkd7.onrender.com/api/the-necklace-a1/bundles
```

---

## Notes
- Production URL: https://bookbridge-mkd7.onrender.com
- Platform: Render
- Wave 1 already deployed (Oct 13, 2025)
- This plan ensures zero downtime and safe rollback options