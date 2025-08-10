# Incremental Implementation Plan: ESL Redesign

## Overview
This plan breaks down the ESL redesign into 3-4 day increments, each shipping working features without breaking existing functionality. Uses feature flags and progressive enhancement to enable easy rollback.

## Guiding Principles
1. **No Big Bang**: Every increment is shippable and doesn't break existing features
2. **Feature Flags**: New features hidden behind flags until ready
3. **Progressive Enhancement**: Build on existing components, don't replace wholesale
4. **Test in Production**: Ship behind flags to select users for real-world feedback
5. **Quick Rollback**: Any increment can be disabled without affecting others

---

## Phase 0: Foundation & Setup (Day 1-3)
**Goal**: Establish infrastructure without touching user-facing features

### Day 1: Feature Flag System & Environment Setup
```typescript
// utils/featureFlags.ts
interface FeatureFlags {
  eslRedesign: boolean;
  sentenceSafeChunking: boolean;
  similarityGate: boolean;
  eslControlBar: boolean;
  compareMode: boolean;
  srsIntegration: boolean;
  precomputedSimplifications: boolean;
  nonStopListening: boolean; // NEW: Cross-page auto-advance
  easyNavigation: boolean;   // NEW: Swipe/keyboard navigation
}
```

**Tasks**:
- [ ] Create feature flag service with user-level overrides
- [ ] Add ESL feature flags to environment variables
- [ ] Set up Redis/Upstash for session caching (reuse existing Redis connection)
- [ ] Create basic telemetry hooks for A/B testing

**Testing**: Feature flags return correct values per user
**Rollback**: Disable flags in env vars

### Day 2: Design System Tokens
**Tasks**:
- [ ] Add CSS variables to `globals.css` (non-breaking, additive only)
- [ ] Create `useThemeTokens()` hook for gradual migration
- [ ] Update Tailwind config with new tokens (backwards compatible)

```css
/* Add to globals.css - doesn't affect existing styles */
:root {
  --color-brand: #667eea;
  --color-brand-2: #764ba2;
  --color-accent: #10b981;
  /* ... other tokens */
}
```

**Testing**: Existing UI unchanged, new tokens available
**Rollback**: Remove CSS variables (no dependencies yet)

### Day 3: Database Schema Extensions
**Tasks**:
- [ ] Add ESL fields to users table (nullable, no breaking changes)
- [ ] Create book_simplifications cache table
- [ ] Create esl_vocabulary_progress table with SRS fields
- [ ] Add indices for hot paths

```sql
-- All additive, no modifications to existing schema
ALTER TABLE users ADD COLUMN IF NOT EXISTS esl_level VARCHAR(2) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS native_language VARCHAR(10) DEFAULT NULL;
```

**Testing**: Existing queries unaffected, new tables accessible
**Rollback**: Tables remain but unused if features disabled

---

## Phase 1: Core Reading Experience (Day 4-6)
**Goal**: Enhance existing reading view without replacing it

### Day 4: Sentence-Safe Chunking Pipeline
**Behind Flag**: `sentenceSafeChunking`

**Tasks**:
- [ ] Create `SentenceSafeChunker` class extending existing chunker
- [ ] Add chunking mode toggle in content processing
- [ ] Update TTS metadata to include sentence boundaries
- [ ] Cache both old and new chunk formats during transition

```typescript
// services/chunking/SentenceSafeChunker.ts
class SentenceSafeChunker extends EnhancedContentChunker {
  async chunk(text: string): Promise<TTSChunk[]> {
    if (!featureFlags.sentenceSafeChunking) {
      return super.chunk(text); // Fall back to existing
    }
    // New implementation
  }
}
```

**Testing**: Compare old vs new chunking side-by-side
**Rollback**: Flag off returns to original chunker

### Day 5: ESL Control Bar Component
**Behind Flag**: `eslControlBar`

**Tasks**:
- [ ] Create `ESLControlBar` component (hidden by default)
- [ ] Add to reading page conditionally based on flag
- [ ] Wire up basic controls (level selector, speed)
- [ ] Store preferences in localStorage

```tsx
// components/esl/ESLControlBar.tsx
export function ESLControlBar({ show = false }) {
  if (!show || !featureFlags.eslControlBar) return null;
  // Render controls
}
```

**Testing**: Bar appears only for flagged users
**Rollback**: Component hidden, no UI changes

### Day 6: Reading Mode Toggle + Easy Navigation
**Behind Flag**: `eslRedesign` + `easyNavigation`

**Tasks**:
- [ ] Add mode state to reading page
- [ ] Create mode switcher UI (part of ESL bar)
- [ ] Connect to existing `/api/esl/books/[id]/simplify` endpoint
- [ ] Show loading state during simplification
- [ ] **NEW**: Add swipe/keyboard page navigation
- [ ] **NEW**: Add page jump controls (prev/next buttons)
- [ ] **NEW**: Implement smooth page transitions

```typescript
// hooks/usePageNavigation.ts
export function usePageNavigation() {
  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right') navigateToNextPage();
    if (direction === 'left') navigateToPrevPage();
  };
  
  const handleKeyboard = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') navigateToNextPage();
    if (e.key === 'ArrowLeft') navigateToPrevPage();
  };
}
```

**Testing**: Toggle between modes + smooth page navigation
**Rollback**: Always show original mode, navigation disabled

---

## Phase 2: Simplification Pipeline (Day 7-9)
**Goal**: Reliable text simplification with quality gates

### Day 7: Similarity Gate Implementation
**Behind Flag**: `similarityGate`

**Tasks**:
- [ ] Create `SimilarityGate` service
- [ ] Integrate with Pinecone for embeddings
- [ ] Add retry logic with conservative prompts
- [ ] Implement fallback to original text

```typescript
// services/esl/SimilarityGate.ts
class SimilarityGate {
  async validate(original: string, simplified: string): Promise<boolean> {
    if (!featureFlags.similarityGate) return true; // Pass through
    const similarity = await this.computeSimilarity(original, simplified);
    return similarity >= 0.82;
  }
}
```

**Testing**: Log similarity scores, monitor gate failures
**Rollback**: Gate always passes when flag off

### Day 8: Caching Layer
**Tasks**:
- [ ] Implement cache key generation
- [ ] Add Redis caching for simplifications
- [ ] Create cache warming endpoint for testing
- [ ] Add cache hit/miss metrics

```typescript
// Format: bookId:level:chunk:version
const cacheKey = `${bookId}:${level}:${chunkIndex}:v1`;
```

**Testing**: Monitor cache hit rates
**Rollback**: Cache misses fall through to generation

### Day 9: Cultural Context Annotations
**Tasks**:
- [ ] Create cultural reference detector
- [ ] Add annotation generation to simplification pipeline
- [ ] Update API response with annotations
- [ ] Display annotations in UI (tooltips)

**Testing**: Annotations appear for Victorian-era texts
**Rollback**: Annotations array empty when disabled

---

## Phase 3: TTS Enhancement (Day 10-12)
**Goal**: Seamless audio experience with highlighting

### Day 10: Non-Stop TTS & Cross-Page Auto-Advance
**Behind Flag**: `nonStopListening`

**Tasks**:
- [ ] Add prefetch logic at 90% progress within page
- [ ] **NEW**: Implement cross-page audio continuation
- [ ] **NEW**: Auto-navigate to next page when TTS finishes current page
- [ ] **NEW**: Preload next page content during TTS playback
- [ ] Add seamless audio handoff between pages
- [ ] Create "Continue Reading" mode (like Speechify)

```typescript
// services/NonStopTTS.ts
class NonStopTTSManager {
  async onPageTTSComplete() {
    if (!featureFlags.nonStopListening) return;
    
    // Preload next page while finishing current
    await this.preloadNextPage();
    
    // Navigate and start TTS immediately
    this.navigateToNextPage();
    this.startTTSOnNewPage();
  }
  
  async preloadNextPage() {
    // Load next page content + simplification in background
  }
}
```
- [ ] Implement chunk transition with crossfade
- [ ] Create handoff state for cross-page continuity
- [ ] Add progress indicators

```typescript
// hooks/useTTSPrefetch.ts
function useTTSPrefetch(currentChunk: number, progress: number) {
  useEffect(() => {
    if (progress >= 0.9) {
      prefetchChunk(currentChunk + 1);
    }
  }, [progress]);
}
```

**Testing**: No audio gaps between chunks
**Rollback**: Disable auto-advance, manual chunk selection

### Day 11: Highlighting Synchronization
**Tasks**:
- [ ] Update highlighting manager for sentence boundaries
- [ ] Add WebSocket boundary event handlers
- [ ] Implement fallback re-sync logic
- [ ] Test with multiple TTS providers

**Testing**: Words highlight in sync with audio
**Rollback**: Basic highlighting without perfect sync

### Day 12: Provider Fallback System
**Tasks**:
- [ ] Add provider health checks
- [ ] Implement automatic fallback to Web Speech
- [ ] Add user notification for provider switches
- [ ] Log provider reliability metrics

**Testing**: Audio continues when primary provider fails
**Rollback**: Single provider mode

---

## Phase 4: Compare Mode & Polish (Day 13-15)
**Goal**: Advanced features for power users

### Day 13: Split-Screen Compare Mode
**Behind Flag**: `compareMode`

**Tasks**:
- [ ] Create `SplitScreenView` component
- [ ] Implement synchronized scrolling
- [ ] Add active panel highlighting
- [ ] Handle mobile responsive layout

```tsx
// components/esl/SplitScreenView.tsx
export function SplitScreenView({ original, simplified }) {
  if (!featureFlags.compareMode) return <SingleView />;
  // Split view implementation
}
```

**Testing**: Side-by-side comparison works
**Rollback**: Return to single view

### Day 14: Mobile Optimization
**Tasks**:
- [ ] Collapse ESL bar to single row on mobile
- [ ] Add touch gestures for navigation
- [ ] Optimize button sizes for touch (44x44)
- [ ] Test on various screen sizes

**Testing**: Usable on phones without horizontal scroll
**Rollback**: Desktop layout on all devices

### Day 15: Accessibility Pass
**Tasks**:
- [ ] Add ARIA labels to all controls
- [ ] Implement keyboard shortcuts
- [ ] Set up live regions for announcements
- [ ] Run axe-core tests

**Testing**: Screen reader navigation works
**Rollback**: Basic accessibility maintained

---

## Phase 5: SRS & Vocabulary (Day 16-18)
**Goal**: Spaced repetition for vocabulary learning

### Day 16: SRS Algorithm Implementation
**Behind Flag**: `srsIntegration`

**Tasks**:
- [ ] Implement SM-2+ algorithm
- [ ] Create review scheduling service
- [ ] Add vocabulary tracking endpoints
- [ ] Build review queue system

```typescript
// services/srs/SM2Plus.ts
class SM2Plus {
  calculateNextReview(quality: number, repetitions: number, easeFactor: number) {
    // SM-2+ implementation
  }
}
```

**Testing**: Review intervals follow SM-2 pattern
**Rollback**: No vocabulary tracking

### Day 17: Vocabulary UI Components
**Tasks**:
- [ ] Create vocabulary tooltip component
- [ ] Add word difficulty indicators
- [ ] Build vocabulary progress widget
- [ ] Implement click-to-define interaction

**Testing**: Words show definitions on click
**Rollback**: Plain text without interactions

### Day 18: Progress Dashboard
**Tasks**:
- [ ] Create ESL dashboard page
- [ ] Add vocabulary progress charts
- [ ] Show reading speed metrics
- [ ] Display mastery levels

**Testing**: Dashboard shows accurate metrics
**Rollback**: Dashboard hidden from navigation

---

## Phase 6: Precomputation & Performance (Day 19-21)
**Goal**: Fast, cached responses for popular content

### Day 19: Precompute Pipeline
**Behind Flag**: `precomputedSimplifications`

**Tasks**:
- [ ] Create batch processing script
- [ ] Process top 5 books at B1/B2 levels
- [ ] Store in database cache
- [ ] Add version tracking

```bash
# scripts/precompute-simplifications.ts
npm run precompute -- --books=1342,74,11 --levels=B1,B2
```

**Testing**: Cached books load instantly
**Rollback**: Generate on-demand

### Day 20: Performance Optimization
**Tasks**:
- [ ] Add CDN caching headers
- [ ] Optimize database queries
- [ ] Implement request batching
- [ ] Add performance monitoring

**Testing**: <2s load time for cached content
**Rollback**: Slower but functional

### Day 21: Load Testing & Fixes
**Tasks**:
- [ ] Run load tests with 100 concurrent users
- [ ] Fix any bottlenecks found
- [ ] Optimize memory usage
- [ ] Add rate limiting

**Testing**: System stable under load
**Rollback**: Reduce concurrent users

---

## Rollout Strategy

### Week 1: Internal Testing
- Enable all flags for dev team
- Fix critical bugs
- Gather initial feedback

### Week 2: Beta Users (5%)
- Enable for volunteer beta testers
- Monitor metrics closely
- Iterate on feedback

### Week 3: Gradual Rollout (25% → 50% → 100%)
- Progressive flag enablement
- A/B test key features
- Monitor error rates

### Week 4: Full Launch
- Enable for all users
- Remove feature flags for stable features
- Keep flags for experimental features

---

## Monitoring & Success Metrics

### Technical Health
- Error rate < 0.1%
- P95 latency < 2s
- Cache hit rate > 85%
- TTS continuity > 95%

### User Engagement
- Reading time +20%
- Vocabulary lookups +50%
- Mode switches indicate usage
- Return rate > 60%

### Quality Gates
- Similarity score > 0.82
- User feedback > 4.5/5
- Simplification accuracy > 90%
- Cultural annotation relevance > 80%

---

## Risk Mitigation

### Rollback Procedures
Each phase has independent rollback:

1. **Feature Flags**: Disable in environment
2. **Database**: Tables remain, queries ignore
3. **Cache**: Clear and regenerate
4. **UI Components**: Hidden when flags off
5. **API Endpoints**: Return original behavior

### Emergency Fixes
- Hot fix branch strategy
- Canary deployments
- Quick disable via env vars
- Fallback to original implementation

### Communication Plan
- Status page for major issues
- In-app notifications for degraded features
- Email updates for beta testers
- GitHub issues for bug tracking

---

## Testing Checkpoints

### After Each Phase
1. **Smoke Tests**: Core functionality works
2. **Regression Tests**: Existing features unaffected
3. **Performance Tests**: No degradation
4. **Accessibility Tests**: WCAG compliance
5. **Mobile Tests**: Responsive on devices

### Before Major Rollout
1. **Load Testing**: Handle expected traffic
2. **Security Audit**: No new vulnerabilities
3. **User Acceptance**: Beta feedback positive
4. **Monitoring**: All metrics tracked
5. **Documentation**: Updated for new features

---

## Implementation Notes

### Code Organization
```
/components/esl/          # New ESL components
/services/esl/           # ESL business logic
/utils/featureFlags.ts   # Feature flag service
/app/api/esl/           # ESL API endpoints (existing)
```

### Branch Strategy
- `main`: Production-ready code
- `feat/esl-phase-X`: Each phase in separate branch
- `hotfix/esl-*`: Emergency fixes
- PRs for all merges to main

### Documentation Updates
- Update README with ESL features
- Add ESL setup guide
- Document feature flags
- Create user guides

---

## Success Criteria

### MVP (End of Phase 3)
✅ Original/Simplified modes working
✅ TTS with auto-advance
✅ Basic ESL controls
✅ Similarity gate active
✅ No breaking changes

### Full Feature (End of Phase 6)
✅ All features from ESL_REDESIGN_SYNTHESIS_TEMPLATE
✅ Performance targets met
✅ 95% uptime maintained
✅ User satisfaction > 4.5/5
✅ Ready for scale

---

## Next Steps
1. Review plan with team
2. Set up feature flag infrastructure
3. Create Phase 0 branches
4. Begin Day 1 implementation
5. Daily standup for progress tracking