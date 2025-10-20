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

### Phase 1: Security Fix Deployment (Day 1 - Immediate) ✅ COMPLETED

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
- [x] 0 vulnerabilities in npm audit
- [x] Production site still works
- [x] No errors in production logs

**Monitor for**: 24 hours ✅

---

### Phase 2: Push Continuous Reading Features to GitHub (Day 2) ✅ COMPLETED

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
- 500+ new files ✅
- 200+ cache files ✅
- 100+ scripts ✅
- 50+ test files ✅
- New API routes ✅
- Documentation updates ✅

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

### Phase 4: Production Deployment with Feature Flags OFF (Day 3-4) ✅ COMPLETED

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
- [x] Site loads normally
- [x] No new UI elements visible (flags OFF)
- [x] API endpoints return data
- [x] No console errors (constructor error fixed)
- [x] Performance metrics stable

---

### Phase 5: Incremental Feature Rollout (Day 4-7) ✅ COMPLETED

#### All Books: Live and Functional ✅
- [x] The Necklace (A1 & A2 levels) - LIVE
- [x] The Gift of the Magi (A1 level) - LIVE
- [x] The Metamorphosis (A1 level) - LIVE
- [x] The Lady with the Dog (A1 level) - LIVE
- [x] The Dead (A1 & A2 levels) - LIVE

**Status**: All 5 target books are deployed and functional via auto-detection system
**Books Page**: https://bookbridge-mkd7.onrender.com/featured-books
**Verification**: Production books match main branch `ALL_FEATURED_BOOKS` array

#### Auto-Detection Success ✅
Books are automatically detected via bundle API endpoints without manual feature flags:
- `/api/the-necklace-a1/bundles` ✅
- `/api/the-necklace-a2/bundles` ✅
- `/api/the-dead-a1/bundles` ✅
- `/api/the-dead-a2/bundles` ✅
- `/api/the-metamorphosis-a1/bundles` ✅
- `/api/lady-with-dog-a1/bundles` ✅
- `/api/gift-of-the-magi-a1/bundles` ✅

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
- [x] Deploy security fix ✅
- [x] Monitor for 24 hours ✅

**Day 2**:
- [x] Push everything to GitHub ✅
- [x] Deploy to staging ✅

**Day 3**:
- [x] Test in staging ✅
- [x] Deploy to production (flags OFF) ✅

**Day 4-6**:
- [x] Enable books one by one ✅
- [x] Monitor each for 30 minutes ✅

**Day 7**:
- [x] Enable UI changes ✅
- [x] Complete deployment ✅

**Total Time**: 3 days (accelerated via auto-detection) - DEPLOYMENT COMPLETE ✅

---

## LATEST: Hero Interactive Demo Deployment Plan

### Current Status (October 2025)
- **Date**: October 20, 2025
- **Current Branch**: `main` (includes merged `feature/hero-interactive-demo`)
- **Production Status**: Continuous reading features + Neo-Classic UI deployed and stable
- **Next**: Hero Interactive Reading Demo ready for incremental deployment

### What Was Completed
✅ **Complete Hero Interactive Reading Demo**:
- Full-featured demo component with all 6 CEFR levels (A1-C2) + Original
- Dual voice support (Daniel & Sarah) with ElevenLabs integration
- Real-time sentence highlighting with audio synchronization
- Mobile-first responsive design with sticky controls
- Navigation improvements and spacing fixes
- Audio generation system with <5% drift validation
- Enhanced UI/UX with theme-aware design

---

## Hero Demo Incremental Deployment Strategy

### Phase 1: Core Infrastructure (Day 1 - Low Risk)
**Target**: Foundation files and data without interactive features
**Reasoning**: Scripts and data files have minimal impact, easy rollback

```bash
# Step 1.1: Verify build passes
npm run build
# Expected: ✅ Build succeeds (confirmed)

# Step 1.2: Create infrastructure-only branch
git checkout main
git checkout -b deploy/hero-infrastructure
git push origin deploy/hero-infrastructure

# Step 1.3: Cherry-pick infrastructure changes
# Scripts and data only, no UI components yet
```

**Files in Phase 1**:
- `scripts/generate-all-levels.js` - Content generation
- `scripts/generate-complete-audio.js` - Audio generation
- `public/data/demo/pride-prejudice-demo.json` - Demo content
- Audio files (if generated)

**Success Criteria**:
- [ ] Scripts run without errors
- [ ] Demo data loads correctly
- [ ] No impact on existing functionality
- [ ] Build continues to pass

---

### Phase 2: Basic Demo Component (Day 2 - Medium Risk)
**Target**: Hero component structure without advanced features
**Reasoning**: Component shell with basic functionality, audio disabled

```bash
# Step 2.1: Create demo component branch
git checkout main
git checkout -b deploy/hero-basic-component

# Step 2.2: Deploy with audio features disabled
# Use feature flags to control audio integration
```

**Files in Phase 2**:
- `components/hero/InteractiveReadingDemo.tsx` (basic version)
- `components/hero/LevelSwitcher.tsx`
- `components/hero/TextDisplay.tsx`
- `app/page.tsx` (homepage integration)

**Success Criteria**:
- [ ] Hero demo appears on homepage
- [ ] Level switching works
- [ ] Text displays correctly
- [ ] No audio features active yet
- [ ] Mobile responsiveness maintained

---

### Phase 3: Audio Integration (Day 3-4 - Higher Risk)
**Target**: Full audio playback and highlighting system
**Reasoning**: Most complex features with potential performance impact

```bash
# Step 3.1: Create audio features branch
git checkout main
git checkout -b deploy/hero-audio-complete

# Step 3.2: Enable audio features gradually
# Monitor performance and error rates closely
```

**Files in Phase 3**:
- `components/hero/AudioControls.tsx`
- Complete `InteractiveReadingDemo.tsx` with audio
- Audio enhancement and synchronization features

**Success Criteria**:
- [ ] Audio preloading works across devices
- [ ] Sentence highlighting synchronizes with audio
- [ ] Mobile audio controls function properly
- [ ] Performance remains acceptable (<3s load)
- [ ] Error handling for audio failures works
- [ ] Cross-browser compatibility maintained

---

### Phase 4: Navigation & Polish (Day 5-6 - Final Integration)
**Target**: Navigation improvements and final UI polish
**Reasoning**: Final touches affecting overall user experience

```bash
# Step 4.1: Create navigation polish branch
git checkout main
git checkout -b deploy/hero-navigation-final

# Step 4.2: Deploy final navigation improvements
```

**Files in Phase 4**:
- `components/Navigation.tsx` - Enhanced navigation
- `app/layout.tsx` - Spacing improvements
- Final UI polish and theme integration

**Success Criteria**:
- [ ] Navigation improvements function correctly
- [ ] Home tab text cutoff fixed
- [ ] Library button navigates properly
- [ ] Overall user experience enhanced
- [ ] No regressions in existing functionality

---

## Feature Flag Strategy for Hero Demo

### Environment Variables:
```bash
# Hero demo control
NEXT_PUBLIC_ENABLE_HERO_DEMO=true|false
NEXT_PUBLIC_ENABLE_HERO_AUDIO=true|false
NEXT_PUBLIC_ENABLE_HERO_HIGHLIGHTING=true|false
NEXT_PUBLIC_ENABLE_HERO_MOBILE_CONTROLS=true|false

# Performance monitoring
NEXT_PUBLIC_ENABLE_HERO_ANALYTICS=true|false
```

### Implementation:
```typescript
// In components/hero/InteractiveReadingDemo.tsx
const isDemoEnabled = process.env.NEXT_PUBLIC_ENABLE_HERO_DEMO === 'true'
const isAudioEnabled = process.env.NEXT_PUBLIC_ENABLE_HERO_AUDIO === 'true'
const isHighlightingEnabled = process.env.NEXT_PUBLIC_ENABLE_HERO_HIGHLIGHTING === 'true'
```

---

## Emergency Rollback for Hero Demo

### Quick Rollback Options:
```bash
# Option 1: Feature flag disable (fastest)
export NEXT_PUBLIC_ENABLE_HERO_DEMO=false
export NEXT_PUBLIC_ENABLE_HERO_AUDIO=false

# Option 2: Component-level disable
# Edit app/page.tsx to comment out InteractiveReadingDemo

# Option 3: Branch revert
git checkout main
git revert [hero-demo-commit-hash]
git push origin main
```

### Rollback Triggers:
- Homepage load time > 5 seconds
- Audio loading failures > 10%
- Mobile functionality broken
- Error rate > 2%
- Memory usage spike > 50%

---

## Monitoring for Hero Demo

### Key Metrics:
- [ ] Homepage load time (target: <3s)
- [ ] Audio file load time (target: <5s)
- [ ] Demo engagement rate
- [ ] Mobile vs desktop performance
- [ ] Error rates and crash reports
- [ ] Memory usage during audio playback

### Testing Checklist (Each Phase):
- [ ] `npm run build` passes ✅
- [ ] `npm run lint` clean
- [ ] TypeScript compilation successful
- [ ] Mobile responsiveness verified
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Audio functionality on different devices
- [ ] Theme switching with demo active

---

## PREVIOUS: Neo-Classic UI Transformation Deployment Plan

### Current Status (October 2025)
- **Date**: October 19, 2025
- **Current Branch**: `main` (includes merged `feature/neo-classic-transformation`)
- **Production Status**: Continuous reading features deployed and stable
- **Next**: Neo-Classic UI transformation ready for incremental deployment

### What Was Completed
✅ **Complete Neo-Classic UI Transformation**:
- Typography system: Playfair Display + Source Serif Pro
- CSS variables theme system (Light/Dark/Sepia variants)
- Authentication pages redesign
- Collection pages redesign (Enhanced, Browse All, Featured Books)
- Reading experience transformation
- AI Chat modal integration fixes
- 20 files modified, -720 net lines (optimized)

---

## Neo-Classic Incremental Deployment Strategy

### Phase 1: Authentication Foundation (Day 1 - Low Risk)
**Target**: Deploy authentication page transformations first
**Reasoning**: Isolated components, minimal user impact, easy rollback

```bash
# Step 1.1: Create authentication-only branch
git checkout main
git checkout -b deploy/auth-neo-classic
git push origin deploy/auth-neo-classic

# Step 1.2: Cherry-pick auth changes only
git cherry-pick <auth-commit-hash>

# Step 1.3: Deploy to staging
# Test login/signup flows thoroughly

# Step 1.4: Deploy to production
# Monitor authentication success rates
```

**Files in Phase 1**:
- `app/auth/login/page.tsx`
- `app/auth/signup/page.tsx`
- `app/globals.css` (theme variables only)

**Success Criteria**:
- [ ] Login/signup flows work identically
- [ ] No authentication errors
- [ ] Theme switching works on auth pages
- [ ] Mobile responsiveness maintained

---

### Phase 2: Collection Pages (Day 2-3 - Medium Risk)
**Target**: Deploy collection page transformations
**Reasoning**: High visibility but non-critical to core functionality

```bash
# Step 2.1: Create collection branch
git checkout main
git checkout -b deploy/collections-neo-classic

# Step 2.2: Deploy collection pages
# Featured Books, Enhanced Collection, Browse All Books
```

**Files in Phase 2**:
- `app/enhanced-collection/page.tsx`
- `app/featured-books/page.tsx`
- `app/library/page.tsx`
- `components/ui/EnhancedBookCard.tsx`
- `components/library/CleanBookCard.tsx`

**Success Criteria**:
- [ ] All book collection pages load correctly
- [ ] AI Chat functionality works (fixed in this phase)
- [ ] Book navigation and filtering work
- [ ] Cards display properly across all themes

---

### Phase 3: Reading Experience (Day 4-5 - Higher Risk)
**Target**: Deploy core reading interface transformation
**Reasoning**: Critical user functionality, requires thorough testing

```bash
# Step 3.1: Create reading experience branch
git checkout main
git checkout -b deploy/reading-neo-classic

# Step 3.2: Test reading functionality extensively
# Audio playback, text highlighting, theme switching
```

**Files in Phase 3**:
- `app/library/[id]/read/page.tsx`
- `components/ai/AIBookChatModal.tsx`
- `contexts/ThemeContext.tsx`

**Success Criteria**:
- [ ] Book reading interface works flawlessly
- [ ] Audio playback and highlighting preserved
- [ ] Theme switching works during reading
- [ ] AI chat integration maintained

---

### Phase 4: Navigation & Layout (Day 6-7 - Final Polish)
**Target**: Deploy navigation and global layout changes
**Reasoning**: Final touches, affects entire app experience

```bash
# Step 4.1: Create navigation branch
git checkout main
git checkout -b deploy/navigation-neo-classic

# Step 4.2: Deploy final layout components
```

**Files in Phase 4**:
- `app/layout.tsx`
- `app/page.tsx` (homepage)
- `components/Navigation.tsx`
- `components/Footer.tsx`
- `components/MobileNavigationMenu.tsx`
- `components/theme/ThemeSwitcher.tsx`

**Success Criteria**:
- [ ] Navigation works across all pages
- [ ] Homepage reflects new design
- [ ] Mobile navigation functions properly
- [ ] Theme switcher works globally

---

## Emergency Rollback Procedures for Neo-Classic

### Quick Rollback Options
```bash
# Option 1: Branch-specific rollback
git checkout main
git revert <neo-classic-commit-hash>
git push origin main

# Option 2: Deploy previous stable version
git checkout <previous-stable-tag>
# Trigger production deployment

# Option 3: Feature flag disable (if implemented)
# Set NEO_CLASSIC_UI=false in production env
```

### Monitoring for Neo-Classic Deployment
- [ ] Page load times (target: <3s)
- [ ] Authentication success rates (target: >99%)
- [ ] Theme switching functionality
- [ ] Mobile responsiveness
- [ ] AI chat modal functionality
- [ ] Audio playback in reading mode
- [ ] Console errors (target: 0 critical errors)

---

## Neo-Classic Testing Checklist

### Pre-Deployment (Each Phase)
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] No TypeScript errors
- [ ] All themes render correctly (Light/Dark/Sepia)
- [ ] Mobile responsiveness verified
- [ ] AI functionality preserved

### Post-Deployment (Each Phase)
- [ ] All pages load without errors
- [ ] Theme switching works smoothly
- [ ] Typography renders correctly
- [ ] No layout breaks on mobile
- [ ] Performance metrics stable

---

## Commands for Neo-Classic Deployment

```bash
# Check current Neo-Classic status
git log --oneline -10 | grep -E "(neo|classic|auth|transform)"

# Test theme switching locally
npm run dev
# Navigate to different pages and test theme toggle

# Build verification
npm run build
npm run start

# Check for TypeScript issues
npm run typecheck

# Lint verification
npm run lint
```

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