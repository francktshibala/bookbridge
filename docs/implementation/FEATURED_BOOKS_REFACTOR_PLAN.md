# Featured Books Page - Refactoring Plan

> **Purpose**: This document provides the complete strategy for refactoring `/app/featured-books/page.tsx` from a 2,506-line monolith into a maintainable, scalable architecture. Created after a failed 2-day attempt to add Global Mini Player exposed fundamental architectural issues.

---

## 📋 Executive Summary

**What This File Is:**
A step-by-step refactoring roadmap created by combining analyses from Claude Code and GPT-5 to transform the featured-books page from an unmaintainable 2,506-line monolith into a clean, modular architecture.

**When to Use This File:**
- Before starting any refactoring work on featured-books page
- When adding new features (check if page is ready for that feature)
- When bugs occur in featured-books (understand the architectural context)
- Monthly reviews to track refactoring progress

**Quick Status Check:**
- **Current State**: 2,506 lines, 28 useState hooks, 12 responsibilities in one file
- **Target State**: <400 line composition page with contexts handling state
- **Refactoring Status**: Not started (as of January 2025)
- **Feature Development**: CAN continue with guardrails (see Rules section)

---

## 🎯 Goals of This Refactoring Plan

### Primary Goals

1. **Fix the Root Cause of Global Mini Player Failure**
   - Problem: Audio state was page-scoped when it needed to be app-scoped
   - Solution: Extract AudioContext as Single Source of Truth

2. **Reduce Feature Development Time**
   - Current: 2 days per feature (with high failure risk)
   - Target: Hours per feature (with confidence)

3. **Enable Testing**
   - Current: Cannot unit test (2,506 lines, 28 interdependent states)
   - Target: Each context and component testable independently

4. **Maintain Working Features**
   - All 35+ features must continue working throughout refactoring
   - Users should not notice any changes

5. **Establish Best Practices**
   - Clear system boundaries per ARCHITECTURE_OVERVIEW.md
   - Single Responsibility Principle enforced
   - Incremental development with confidence

### Success Criteria

- ✅ Global Mini Player can be implemented in <4 hours
- ✅ Adding new features doesn't risk breaking existing ones
- ✅ New developers can understand page in <30 minutes
- ✅ Page.tsx reduced from 2,506 lines to <400 lines
- ✅ Can write unit tests for audio, reading, and UI logic
- ✅ Zero regression bugs from refactoring

---

## 🔍 Current State Analysis

### File Statistics

**Location**: `/app/featured-books/page.tsx`

**Size Metrics:**
- Total lines: 2,506
- Component function: 1,876 lines (630-2506)
- Static data: 581 lines (1-630)
- JSX rendering: 761 lines (1745-2506)

**Complexity Metrics:**
- State hooks: 28 `useState`
- Effect hooks: 10 `useEffect`
- Ref hooks: 9 `useRef`
- Handler functions: 10+
- Responsibilities: 12 distinct concerns

### Responsibilities (Too Many for One File)

1. **Book Selection** - Grid UI, book data, selection state
2. **Bundle Data Loading** - API calls, level availability checking, request cancellation
3. **Audio Playback Control** - Play, pause, resume, speed, BundleAudioManager integration
4. **Reading Position Tracking** - Save/restore, continue reading modal
5. **CEFR Level Management** - Level switching, availability, defaults
6. **Chapter Navigation** - Chapter structure, modal, jumping
7. **Dictionary Integration** - Word selection, lookup, bottom sheet modal
8. **AI Chat Modal** - Book context, conversation management
9. **Settings Modal** - Level selector, content mode, text size
10. **Auto-scroll Behavior** - Scroll detection, pause/resume, highlighting sync
11. **Theme Integration** - Neo-classic theme application
12. **Continue Reading Modal** - Position restoration, user choice

---

## 🤖 Dual Analysis Findings

### GPT-5 Key Insights (Independent Analysis)

**Core Problem Identified:**
> "Dueling Loaders" - Page-level `loadData()` and context-level `loadBook()/switchLevel()` run concurrently, causing race conditions.

**Critical Issues (Prioritized):**
1. Two sources of truth for book/level/bundles (page vs context)
2. Effect loops clearing `bundleData` causing infinite spinners
3. Play/resume relies on partially restored state (not atomic)
4. Implicit timing with setTimeout/polling for DOM readiness
5. Massive file hinders change velocity

**Root Cause Analysis:**
- Local `selectedBook`/`cefrLevel`/`bundleData` conflicts with global context equivalents
- Effects try to reconcile them with manual synchronization
- Level-setting effect re-applies defaults after user clicks
- Clearing `bundleData` in effects was prime spinner trigger

**Validated Solution:**
> "AudioContext owns ALL book/level/audio state. Page becomes read-only dispatcher."

### Claude Code Key Insights (Initial Analysis)

**Strengths Found:**
- Feature completeness (35+ working features)
- Data-driven design (clean constant separation)
- Performance optimizations (AbortController, request ID tracking)
- Extracted services exist (BundleAudioManager, readingPositionService)

**Problems Found:**
- Violates Single Responsibility Principle (12 concerns)
- State management anti-pattern (28 interdependent states)
- Massive function component (1,876 lines)
- Over-engineered complexity, under-engineered structure
- Testing impossible (need 100+ lines of setup per test)

**Software Engineering Principles Violated:**
- "Functions should do ONE thing" - this does 12
- "Keep functions small" (recommended 50-100 lines, actual 1,876)
- "Low cyclomatic complexity" - branches everywhere

### Consensus Between Both Analyses

**Agreement on:**
1. Single Source of Truth in AudioContext is mandatory fix
2. Component extraction is necessary but secondary priority
3. Can continue feature development with guardrails
4. Refactor incrementally (don't rewrite from scratch)
5. Service layer should be thin, not over-abstracted

**Key Difference:**
- **Claude**: Suggested 4-phase refactoring (contexts, components, services, data)
- **GPT-5**: Prioritized SSoT first, then components, services optional
- **Synthesis**: Do SSoT immediately (Week 1), components next (Week 2-3), services later

---

## 📐 Architecture Vision (Target State)

### File Structure (After Refactoring)

```
app/featured-books/
├── page.tsx (200-400 lines)
│   └── Role: Pure composition, no business logic
│
├── components/
│   ├── BookSelectionGrid.tsx (150 lines)
│   ├── ReadingInterface.tsx (200 lines)
│   │   ├── ReadingHeader.tsx (80 lines)
│   │   ├── TextDisplay.tsx (120 lines)
│   │   └── AudioControls.tsx (150 lines)
│   ├── SettingsModal.tsx (100 lines)
│   ├── ChapterModal.tsx (80 lines)
│   └── ContinueReadingModal.tsx (60 lines)
│
└── hooks/
    ├── useAutoResume.ts (exists)
    ├── useAudioControls.ts (to create)
    └── useReadingUI.ts (to create)

contexts/
├── AudioContext.tsx (400-500 lines)
│   └── Owns: book, level, bundles, isPlaying, position
│
└── ReadingUIContext.tsx (150 lines)
    └── Owns: modals, toasts, UI-only preferences

data/
├── featured-books.ts (book definitions)
├── api-mappings.ts (API endpoints)
└── chapter-structures.ts (chapter metadata)
```

### State Ownership (Single Source of Truth)

**AudioContext Owns (App-Scoped):**
- `selectedBook: FeaturedBook | null`
- `cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'`
- `bundleData: RealBundleApiResponse | null`
- `isPlaying: boolean`
- `currentSentenceIndex: number`
- `currentBundle: string | null`
- `playbackTime: number`
- `playbackSpeed: number`
- `audioManagerRef: BundleAudioManager`

**ReadingUIContext Owns (Page-Scoped):**
- `showSettingsModal: boolean`
- `showChapterModal: boolean`
- `showContinueReading: boolean`
- `isDictionaryOpen: boolean`
- `isAIChatOpen: boolean`

**Page Component:**
- NO state ownership
- Only calls: `ctx.selectBook()`, `ctx.switchLevel()`, `ctx.play()`, etc.
- Pure presentation layer

---

## 🛠️ Complete Implementation Plan

### Phase 1: Establish Single Source of Truth (Week 1) ⚡ CRITICAL ✅ **COMPLETED**

**Goal**: Fix "dueling loaders" by making AudioContext the sole owner of book/level/audio state.

#### Task 1.1: Audit AudioContext (Current State) ✅
- [x] Read `/contexts/AudioContext.tsx` (if exists, or create)
- [x] Document what state it currently owns
- [x] Identify what's missing (book selection, level management)
- [x] Check if `loadBook()` and `switchLevel()` exist
- **Deliverable**: Document current AudioContext API

#### Task 1.2: Extend AudioContext with Book Selection ✅
- [x] Add `selectedBook` state to AudioContext
- [x] Add `selectBook(book: FeaturedBook, initialLevel?: string)` method
- [x] Method should: load bundles, set level, initialize audio
- [x] Add `unloadBook()` method for cleanup
- [x] Test: Can select book via context
- **Deliverable**: AudioContext handles book selection

#### Task 1.3: Ensure Level Management in AudioContext ✅
- [x] Confirm `cefrLevel` state exists in AudioContext
- [x] Confirm `switchLevel(newLevel: string)` exists
- [x] Method should: stop audio, load new level bundles, save position
- [x] Add level persistence (save to localStorage on switch)
- [x] Test: Can switch levels via context
- **Deliverable**: AudioContext handles all level operations

#### Task 1.4: Remove Page-Level Data Fetching ✅
- [x] Locate `loadData()` useEffect in page.tsx (around line 865)
- [x] Comment out or remove fetch logic
- [x] Replace with: Read from `const { bundleData } = useAudioContext()`
- [x] Remove `setBundleData()` calls from page
- [x] Test: Page renders bundle data from context
- **Deliverable**: Page is read-only consumer of context

#### Task 1.5: Convert Page Actions to Context Dispatches ✅
- [x] Find book selection onClick handlers (around line 1770)
- [x] Replace `setSelectedBook()` with `audioContext.selectBook(book)`
- [x] Find level selector onChange (in SettingsModal)
- [x] Replace `setCefrLevel()` with `audioContext.switchLevel(level)`
- [x] Remove page-level `cefrLevel` state variable
- [x] Test: Clicking book/level calls context methods
- **Deliverable**: Page dispatches to context only

#### Task 1.6: Remove Effect-Based State Clearing ✅
- [x] Find effects that call `setBundleData(null)` (around line 722)
- [x] Remove these clearing calls
- [x] Let AudioContext manage bundle lifecycle
- [x] Test: No infinite spinners when switching books/levels
- **Deliverable**: Effects don't fight context

#### Task 1.7: Integration Testing (Critical Checkpoint) ✅
- [x] Manual test: Select book → audio loads
- [x] Manual test: Switch level → new audio loads
- [x] Manual test: Play → audio plays from correct bundle
- [x] Manual test: Navigate away → state preserved (if global)
- [x] Manual test: Refresh page → position restored
- [x] Check: No console errors
- [x] Check: No infinite loading spinners
- **Deliverable**: Core functionality working via context

**Success Criteria for Phase 1:**
- ✅ AudioContext is single source of truth
- ✅ Page.tsx has zero fetch calls
- ✅ Selecting books and switching levels works perfectly
- ✅ No race conditions or spinner bugs
- ✅ Global Mini Player becomes theoretically possible

**Completion Summary:**
- **Merged to main**: PR #20 (dfcbb21) on 2025-10-27
- **Total Commits**: 15 commits
- **Code Reduction**: -414 lines (-18.6%)
- **Documentation**: 3 comprehensive docs created (1,293 lines)
- **See**: `docs/architecture/PHASE_1_COMPLETION_REPORT.md` for full details

**Estimated Time**: 3-5 days (critical, high-risk phase) | **Actual Time**: 5 days

---

### Phase 2: Fix Navigation & Resume Bugs (Week 2) ✅ **COMPLETED**

**Goal**: Ensure reading position restoration and navigation work correctly with new architecture.

#### Task 2.1: Atomic Resume Implementation ✅
- [x] Find `restorePosition()` in AudioContext
- [x] Ensure it calls: `audioManager.playBundleSentence(bundle, sentenceIndex)`
- [x] Make resume atomic (bundle + index set together, not separately)
- [x] Add guard: don't start audio until bundles loaded
- [x] Test: Refresh page → resumes at exact position
- **Deliverable**: Resume works atomically
- **Status**: Already complete from Phase 1

#### Task 2.2: Level Persistence on Navigation ✅
- [x] Ensure `switchLevel()` saves level to ReadingPosition
- [x] On restore, use saved level not default A1
- [x] Test: Read A2, navigate away, return → still A2
- [x] Test: Refresh → level preserved
- **Deliverable**: Level persists across navigation
- **Commit**: d263750 - Completed DB persistence with 300ms debounce

#### Task 2.3: Continue Reading Modal Integration ✅
- [x] Check Continue Reading modal shows on return (if <24hrs)
- [x] Ensure it reads from AudioContext.resumeInfo
- [x] "Continue" button uses context position
- [x] "Start Over" button calls: `context.seek(0)`
- [x] Test: Modal appears with correct position
- **Deliverable**: Continue modal works with context
- **Commit**: d9a0e1b - Changed to use context.seek(0) instead of page-level setState

#### Task 2.4: Remove DOM Polling Hacks ✅
- [x] Find setTimeout calls for DOM readiness (found 7 total)
- [x] Replace with state guards (loadState === 'ready')
- [x] Use requestAnimationFrame for DOM operations
- [x] Add one-time guard refs to prevent duplicates
- [x] Test: No race conditions on fast refreshes
- **Deliverable**: No timing band-aids
- **Commit**: a0f2e8e - Removed 6 setTimeout correctness hacks, kept 1 UX debounce

**Success Criteria for Phase 2:**
- ✅ Resume from saved position works 100%
- ✅ Level preserved on navigation
- ✅ No setTimeout hacks for correctness (6 removed → 0)
- ✅ Continue reading modal integrated

**Completion Summary:**
- **Merged to main**: PR #TBD (2ce12fa) on 2025-10-27
- **Total Commits**: 4 commits (3 code + 1 docs)
- **Files Modified**: 2 files (AudioContext, page.tsx)
- **Lines Changed**: +67 added, -55 removed (net +12)
- **setTimeout Removed**: 6 → 0 (only 1 UX debounce remains)
- **Documentation**: 2 comprehensive docs created (886 lines)
- **See**: `docs/architecture/PHASE_2_COMPLETION_REPORT.md` for full details

**Estimated Time**: 2-3 days | **Actual Time**: 1 day

---

### Phase 3: Extract UI Components (Week 3) ✅ **COMPLETED**

**Goal**: Break down 1,876-line component into manageable, reusable pieces.

#### Task 3.1: Extract BookSelectionGrid Component ✅
- [x] Create: `/app/featured-books/components/BookSelectionGrid.tsx`
- [x] Move: Lines 1748-1833 (book grid JSX)
- [x] Props: `books: FeaturedBook[]`, `onSelectBook: (book) => void`, `onAskAI: (book) => void`
- [x] Keep framer-motion animations
- [x] Test: Grid looks identical, clicks work
- **Deliverable**: Reusable book grid component (131 lines)
- **Commit**: dd2eb27

#### Task 3.2: Extract ReadingHeader Component ✅
- [x] Create: `/app/featured-books/components/ReadingHeader.tsx`
- [x] Move: Lines 1839-1871 (back button, auto-scroll status, settings button)
- [x] Props: `onBack: () => void`, `onSettings: () => void`, `autoScrollPaused: boolean`
- [x] Test: Header looks identical, buttons work
- **Deliverable**: Reusable reading header (66 lines)
- **Commit**: 1b1f048

#### Task 3.3: Extract SettingsModal Component ✅
- [x] Create: `/app/featured-books/components/SettingsModal.tsx`
- [x] Move: Settings modal JSX (find with "Settings Modal")
- [x] Props: `isOpen: boolean`, `onClose: () => void`, `currentLevel: string`, `onLevelChange: (level) => void`
- [x] Test: Modal opens/closes, level selector works
- **Deliverable**: Reusable settings modal (157 lines)
- **Commit**: 942d0d5

#### Task 3.4: Extract ChapterModal Component ✅
- [x] Create: `/app/featured-books/components/ChapterModal.tsx`
- [x] Move: Chapter picker modal JSX
- [x] Props: `isOpen: boolean`, `chapters: Chapter[]`, `currentChapter: number`, `onSelectChapter: (ch) => void`
- [x] Test: Modal shows chapters, navigation works
- **Deliverable**: Reusable chapter modal (106 lines)
- **Commit**: 10a9e46

#### Task 3.5: ContinueReadingModal - Deferred to Phase 4 ⏭️
- [x] **Decision**: Skipped due to portal visibility issues from Phase 2
- [ ] Create: `/app/featured-books/components/ContinueReadingModal.tsx` (Future)
- **Rationale**: Component had portal issues in Phase 2, better to address in dedicated phase with proper portal architecture
- **Deliverable**: Deferred to Phase 4

#### Task 3.6: Update Page to Use Components ✅
- [x] Import all new components
- [x] Replace JSX blocks with `<BookSelectionGrid />`, `<ReadingHeader />`, etc.
- [x] Pass required props
- [x] Remove extracted JSX from page.tsx
- [x] Test: Everything looks and works identically
- [x] Remove unused framer-motion import
- [x] Add comprehensive documentation header to page.tsx
- **Deliverable**: Page.tsx reduced by ~270 lines (2,506 → 1,988)
- **Commit**: e6deeb4

**Success Criteria for Phase 3:**
- ✅ Page.tsx reduced from 2,506 to ~1,900 lines (achieved: 1,988 lines)
- ✅ Each component <200 lines (achieved: all under 160 lines)
- ✅ Zero visual or functional regressions (achieved: user confirmed all work perfectly)
- ✅ Components are reusable (achieved: all follow explicit prop pattern)

**Completion Summary:**
- **Branch**: `refactor/featured-books-phase-3`
- **Total Commits**: 5 commits (dd2eb27, 1b1f048, 942d0d5, 10a9e46, e6deeb4)
- **Components Created**: 4 (460 total lines)
  - BookSelectionGrid: 131 lines
  - ReadingHeader: 66 lines
  - SettingsModal: 157 lines
  - ChapterModal: 106 lines
- **Code Reduction**: ~270 lines net from main page (2,506 → 1,988)
- **Testing**: Incremental testing after each component, zero regressions
- **Architecture**: All components follow GPT-5's explicit prop pattern (no context in leaves)
- **Documentation**: `docs/architecture/PHASE_3_COMPLETION_REPORT.md` (755 lines)
- **Status**: Ready for merge to main

**Estimated Time**: 4-5 days (low-risk, incremental) | **Actual Time**: 1 day

---

### ✅ Phase 4: Service Layer Extraction (Complete - Oct 2025)

**Goal**: Extract business logic from AudioContext into testable service modules.

**Status**: ✅ Complete - Merged to main on October 27, 2025
**Branch**: `refactor/featured-books-phase-4`
**Commits**: 5 commits (8b48108, caecb15, 68b89c6, 18cdf1a, f5ff574)

**What Was Extracted:**
```typescript
// lib/services/book-loader.ts (130 lines)
async function loadBookBundles(
  bookId: string,
  level: CEFRLevel | 'original',
  mode: ContentMode,
  signal: AbortSignal
): Promise<RealBundleApiResponse>

// lib/services/availability.ts (97 lines)
async function checkLevelAvailability(
  bookId: string,
  signal: AbortSignal
): Promise<AvailabilityResult>

// lib/services/level-persistence.ts (71 lines)
function saveLevelToStorage(bookId: string, level: CEFRLevel): void
function loadLevelFromStorage(bookId: string): CEFRLevel | null

// lib/services/audio-transforms.ts (92 lines)
function determineFinalLevel(...): CEFRLevel | 'original'
function calculateHoursSinceLastRead(...): number
```

**Completion Summary:**
- **Services Created**: 4 modules (390 lines total)
  - book-loader.ts: Bundle data fetching (original + simplified)
  - availability.ts: Level availability checking
  - level-persistence.ts: LocalStorage operations
  - audio-transforms.ts: Pure data transformations
- **Tests Created**: 31 unit tests (100% coverage for pure functions)
  - audio-transforms.test.ts: 16 tests
  - level-persistence.test.ts: 15 tests
- **Code Reduction**: 212 lines of inline logic → service calls
- **Testing**: All tests passing, TypeScript strict mode
- **Architecture**: Services as pure functions, Context as orchestrator
- **Documentation**: `docs/architecture/PHASE_4_COMPLETION_REPORT.md` (650+ lines)

**Key Benefits:**
- ✅ Testable business logic (31 unit tests)
- ✅ Reusable services (no React dependencies)
- ✅ Clear separation (I/O, transforms, orchestration)
- ✅ Type-safe contracts (TypeScript strict mode)

**Estimated Time**: 3-4 days (conservative) | **Actual Time**: 1 day (~2 hours)

---

### Phase 5: Performance Optimization (Nov 2025) 🚀

**Goal**: Reduce book loading time from 4-5 seconds to <500ms for instant UX.

**Timeline**: November 2025 (estimated 2-3 days)
**Branch**: `performance/phase-5-instant-loading`
**Status**: 🔬 Investigation Complete - Ready to Implement

**Target Metrics:**
- Book loading time: 4-5 sec → **<500ms** (10x improvement)
- Time to interactive: 5 sec → **<300ms**
- Availability check: 2-3 sec → **<50ms** (cached) or **instant** (skipped)
- Perceived performance: Instant UI with progressive data loading

---

#### 🔬 Investigation Results: Bottlenecks Identified

**Current Loading Flow (4-5 seconds):**
```
User clicks book
  ↓
checkAvailableLevels() - 2-3 sec (BOTTLENECK #1)
  ├─ For multi-level books: Sequential API calls in for loop
  ├─ Each level: fetch(apiUrl) with cache: 'no-store'
  └─ Original content check: Another fetch call
  ↓
loadBookBundles() - 2 sec (BOTTLENECK #2)
  ├─ Fetch bundle data with cache: 'no-store'
  ├─ For large books (Great Gatsby): 3,605 sentences
  └─ Multiple Supabase round trips (1000 row limit)
  ↓
readingPositionService.loadPosition() - 200ms
  ↓
UI renders - Total: 4-5 seconds
```

**Identified Bottlenecks:**

1. **Sequential Availability Checks (2-3 sec)** 🔴 CRITICAL
   - Location: `lib/services/availability.ts` lines 43-66
   - Problem: `for (const level of MULTI_LEVEL_BOOKS[bookId])` with `await` inside loop
   - Impact: For a book with 3 levels (A1, A2, B1), makes 3 sequential API calls
   - Solution: Use `Promise.all()` for parallel requests

2. **No Caching (adds 100% overhead)** 🔴 CRITICAL
   - Location: All fetch calls use `cache: 'no-store'`
   - Problem: Every book selection repeats all API calls
   - Impact: User switching levels = full reload every time
   - Solution: Next.js fetch caching with revalidation

3. **Wasteful Availability Checks (1-2 sec)** 🟡 MEDIUM
   - Location: `checkLevelAvailability()` for single-level books
   - Problem: Makes API call to check availability we already know from config
   - Impact: Unnecessary API roundtrip for ~60% of books
   - Solution: Use `SINGLE_LEVEL_BOOKS` config, skip API call

4. **Large Database Queries (1-2 sec)** 🟡 MEDIUM
   - Location: `/api/featured-books/bundles/route.ts` lines 67-92
   - Problem: Fetches ALL audio assets in batches
   - Impact: For Great Gatsby: 902 bundles = multiple Supabase roundtrips
   - Solution: Pagination + lazy loading of bundles

5. **No Optimistic UI (perceived slowness)** 🟢 LOW
   - Problem: User waits with loading spinner, no immediate feedback
   - Solution: Show UI skeleton immediately, load data progressively

---

#### 📋 Task Breakdown

#### ✅ Task 5.0: Investigation & Planning
- [x] Profile current loading time (4-5 seconds measured)
- [x] Identify bottlenecks using Chrome DevTools Network tab
- [x] Analyze code flow in availability.ts and book-loader.ts
- [x] Document findings and create optimization plan
- **Status**: Complete (see above)

---

#### Task 5.1: Parallelize Availability Checks ⚡ HIGH IMPACT

**Goal**: Reduce availability check from 2-3 sec → <300ms

**Problem**: Sequential for loop makes API calls one at a time
```typescript
// Current (SLOW - Sequential)
for (const level of MULTI_LEVEL_BOOKS[bookId]) {
  const response = await fetch(apiUrl, { signal }); // Waits for each
  // ...
}
```

**Solution**: Use `Promise.all()` for parallel requests
```typescript
// New (FAST - Parallel)
const levelChecks = MULTI_LEVEL_BOOKS[bookId].map(async (level) => {
  const response = await fetch(apiUrl, { signal });
  return { level, available: response.ok };
});
const results = await Promise.all(levelChecks);
```

**Files to Modify:**
- `lib/services/availability.ts` (lines 43-66)

**Expected Impact**:
- 3 levels: 3 sec → 1 sec (66% faster)
- 5 levels: 5 sec → 1 sec (80% faster)

**Testing**:
- Unit test: Mock fetch, verify parallel execution
- Integration test: Time availability check for "the-necklace" (3 levels)

**Programming Principles:**
- ✅ **Separation of Concerns**: Keep parallel logic in service, not context
- ✅ **Single Responsibility**: Service only fetches data, doesn't decide caching strategy
- ✅ **Open/Closed**: Easy to add new optimization (e.g., batching) without breaking contract

---

#### Task 5.2: Implement Intelligent Caching Layer ⚡ HIGH IMPACT

**Goal**: Reduce repeated loads from 4-5 sec → <50ms (cached)

**Problem**: Every fetch uses `cache: 'no-store'`, forces fresh API calls

**Solution**: Multi-level caching strategy

**Level 1: Next.js Fetch Cache (Server-side)**
```typescript
// Current
const response = await fetch(apiUrl, {
  cache: 'no-store',  // ❌ No caching
  signal
});

// New (Phase 5.2.1)
const response = await fetch(apiUrl, {
  next: {
    revalidate: 3600,  // ✅ Cache for 1 hour
    tags: [`book-${bookId}`, `level-${level}`]
  },
  signal
});
```

**Level 2: Client-side React Query / SWR (Optional Phase 5.2.2)**
```typescript
// Use React Query for client-side caching + background revalidation
const { data, isLoading } = useQuery({
  queryKey: ['book', bookId, level],
  queryFn: () => loadBookBundles(bookId, level, mode, signal),
  staleTime: 5 * 60 * 1000,  // 5 minutes
  cacheTime: 30 * 60 * 1000   // 30 minutes
});
```

**Level 3: IndexedDB for Offline Support (Future - Phase 6)**
- Store book bundles locally for offline reading
- Use Service Worker for background sync

**Files to Modify:**
- `lib/services/book-loader.ts` (add caching to fetch calls)
- `lib/services/availability.ts` (add caching to fetch calls)
- Optional: Add `lib/hooks/useBookData.ts` with React Query

**Cache Invalidation Strategy:**
```typescript
// Invalidate cache when:
// 1. User explicitly requests refresh
// 2. Book metadata updated (detected via version tag)
// 3. 1 hour elapsed (automatic revalidation)

export async function invalidateBookCache(bookId: string) {
  revalidateTag(`book-${bookId}`);
}
```

**Expected Impact**:
- First load: 4-5 sec (no change)
- Subsequent loads: 4-5 sec → **<50ms** (98% faster)
- Level switching: 4-5 sec → **<50ms** (same book, different level)

**Testing**:
- Test cache hit/miss with Network tab (should see "(disk cache)" in Chrome)
- Test cache invalidation after 1 hour
- Test concurrent requests (should deduplicate)

**Programming Principles:**
- ✅ **DRY**: Centralize caching logic in service layer
- ✅ **Scalability**: Cache reduces server load, handles more users
- ✅ **Reliability**: Fallback to fresh fetch if cache fails

---

#### Task 5.3: Skip Unnecessary Availability Checks ⚡ MEDIUM IMPACT

**Goal**: Eliminate wasteful API calls for single-level books

**Problem**: Even for single-level books (60% of catalog), we make API calls we don't need

**Current Flow:**
```typescript
// For "the-dead" (single-level A1 book)
checkLevelAvailability("the-dead", signal)
  ↓
Makes API call to check A1 availability (1-2 sec)
  ↓
Returns { availability: { a1: true }, bookLevels: ['A1'] }
// We already knew this from SINGLE_LEVEL_BOOKS config!
```

**Solution**: Use config first, API as fallback
```typescript
export async function checkLevelAvailability(
  bookId: string,
  signal: AbortSignal
): Promise<AvailabilityResult> {
  const availability: Record<string, boolean> = {};

  // NEW: Fast path for single-level books (no API call)
  if (SINGLE_LEVEL_BOOKS[bookId]) {
    const bookLevel = SINGLE_LEVEL_BOOKS[bookId];
    return {
      availability: { [bookLevel.toLowerCase()]: true },
      bookLevels: [bookLevel]
    };
    // ✅ 0ms instead of 1-2 sec!
  }

  // Existing: Multi-level books need API check
  if (MULTI_LEVEL_BOOKS[bookId]) {
    // ... parallel checks from Task 5.1
  }

  // ... rest of function
}
```

**Files to Modify:**
- `lib/services/availability.ts` (add fast path)

**Expected Impact**:
- Single-level books: 1-2 sec → **0ms** (100% faster)
- Applies to: ~60% of book selections

**Testing**:
- Unit test: Verify no fetch called for single-level books
- Integration test: Time "the-dead" selection (should skip availability check)

**Programming Principles:**
- ✅ **Performance**: Don't fetch data we already have
- ✅ **Maintainability**: Config is source of truth, API is backup
- ✅ **Single Source of Truth**: Config defines book structure

---

#### Task 5.4: Add Optimistic UI Patterns 🎨 USER EXPERIENCE

**Goal**: Make app feel instant even while loading

**Problem**: User sees loading spinner for 4-5 seconds with no feedback

**Solution 1: Skeleton UI (Immediate Feedback)**
```typescript
// Show UI immediately while data loads
{loadState === 'loading' ? (
  <BookReaderSkeleton
    bookTitle={selectedBook.title}
    showProgress={true}
  />
) : (
  <BookReaderContent data={bundleData} />
)}
```

**Solution 2: Progressive Loading**
```typescript
// Load and display data in chunks
const [visibleBundles, setVisibleBundles] = useState<BundleData[]>([]);

// Load first 10 bundles immediately (200ms)
const initialBundles = await loadBookBundles(bookId, level, mode, { limit: 10 });
setVisibleBundles(initialBundles);
setLoadState('ready'); // ✅ User can start reading!

// Load remaining bundles in background (non-blocking)
const remainingBundles = await loadBookBundles(bookId, level, mode, { offset: 10 });
setVisibleBundles([...initialBundles, ...remainingBundles]);
```

**Solution 3: Optimistic Navigation**
```typescript
// Navigate immediately, load in background
const selectBook = (book: FeaturedBook) => {
  setSelectedBook(book);  // ✅ UI updates instantly
  setLoadState('ready');   // ✅ Show reader immediately

  // Load data in background
  loadBookData(book.id, cefrLevel, contentMode)
    .then(data => {
      // Update with real data when ready
      setBundleData(data);
    });
};
```

**Files to Modify:**
- `app/featured-books/page.tsx` (add skeleton UI)
- Create: `components/BookReaderSkeleton.tsx`
- `contexts/AudioContext.tsx` (add progressive loading)

**Expected Impact**:
- Time to interactive: 5 sec → **<300ms** (perceived)
- User engagement: Can start reading while rest loads

**Programming Principles:**
- ✅ **User Experience**: Prioritize perceived performance
- ✅ **Progressive Enhancement**: Basic experience immediate, full experience loads progressively
- ✅ **Reliability**: Always have fallback if background load fails

---

#### Task 5.5: Implement Prefetching Strategy 🚀 PROACTIVE

**Goal**: Predict and preload likely next actions

**Strategy 1: Prefetch on Hover**
```typescript
// In BookSelectionGrid component
<BookCard
  book={book}
  onMouseEnter={() => prefetchBook(book.id)}  // ✅ Start loading on hover
  onClick={() => selectBook(book)}
/>

// Prefetch function (Next.js Link-style)
const prefetchBook = (bookId: string) => {
  // Prefetch availability (instant when clicked)
  checkLevelAvailability(bookId, new AbortController().signal);

  // Prefetch first bundle (reader shows immediately)
  loadBookBundles(bookId, defaultLevel, 'simplified', signal, { limit: 10 });
};
```

**Strategy 2: Prefetch Popular Books**
```typescript
// On page load, prefetch top 3 most popular books
useEffect(() => {
  const popularBooks = ['the-necklace', 'the-dead', 'gift-of-the-magi'];
  popularBooks.forEach(bookId => {
    setTimeout(() => prefetchBook(bookId), 1000);  // After 1 sec idle
  });
}, []);
```

**Strategy 3: Prefetch Next Chapter**
```typescript
// While reading, prefetch next chapter bundles
useEffect(() => {
  if (currentChapter < totalChapters) {
    const nextChapterBundles = getChapterBundles(currentChapter + 1);
    preloadBundles(nextChapterBundles);  // Background load
  }
}, [currentChapter]);
```

**Files to Modify:**
- `app/featured-books/components/BookSelectionGrid.tsx` (add hover prefetch)
- `contexts/AudioContext.tsx` (add prefetch functions)
- `lib/services/prefetch.ts` (create new service)

**Expected Impact**:
- Hover → Click: 4-5 sec → **<100ms** (data already loaded)
- Chapter navigation: 1 sec → **instant** (next chapter preloaded)

**Programming Principles:**
- ✅ **Performance**: Utilize idle time for preloading
- ✅ **Scalability**: Only prefetch likely selections, not everything
- ✅ **User Experience**: Instant response to user actions

---

#### Success Criteria for Phase 5

**Performance Metrics:**
- [ ] Book loading time: 4-5 sec → **<500ms** (10x improvement)
- [ ] Availability check: 2-3 sec → **<50ms** (cached) or **instant** (skipped)
- [ ] Time to interactive: 5 sec → **<300ms**
- [ ] Subsequent loads (cached): **<50ms**
- [ ] Level switching: 4-5 sec → **<100ms**

**User Experience:**
- [ ] UI shows skeleton within **100ms** of book selection
- [ ] First content visible within **300ms**
- [ ] Full reading experience ready within **500ms**
- [ ] Level switching feels instant (<100ms perceived delay)
- [ ] Chapter navigation is instant (preloaded)

**Technical Quality:**
- [ ] All caching uses Next.js native features (no external dependencies)
- [ ] Cache invalidation strategy documented and tested
- [ ] Parallel requests properly handle errors and race conditions
- [ ] Progressive loading gracefully handles slow connections
- [ ] Prefetching doesn't impact initial page load performance

**Programming Principles Maintained:**
- [ ] **Separation of Concerns**: Caching in services, not in components
- [ ] **Single Responsibility**: Each optimization in dedicated task
- [ ] **Scalability**: Caching reduces server load, supports 10x more users
- [ ] **Reliability**: Fallbacks for cache misses, network errors
- [ ] **Maintainability**: Clear cache invalidation rules, easy to debug
- [ ] **DRY**: Centralized caching logic, no duplication
- [ ] **Testability**: Each optimization has unit + integration tests

---

#### Architecture Impact

**Before Phase 5 (Phases 1-4):**
```typescript
// Clean architecture, but slow data fetching
AudioContext (orchestrator)
  ↓
Services (pure functions)
  ├─ book-loader.ts (no cache, sequential)
  ├─ availability.ts (no cache, sequential)
  └─ level-persistence.ts (localStorage only)
  ↓
API Routes
  ↓
Database (Prisma + Supabase)
```

**After Phase 5:**
```typescript
// Clean architecture + performance optimizations
AudioContext (orchestrator + prefetch)
  ↓
Services (pure functions + caching)
  ├─ book-loader.ts (Next.js cache, progressive loading)
  ├─ availability.ts (parallel + skip unnecessary checks)
  ├─ level-persistence.ts (localStorage only)
  └─ prefetch.ts (NEW - proactive loading)
  ↓
Cache Layer (Next.js)
  ├─ Revalidate: 1 hour
  ├─ Tags: book-{id}, level-{level}
  └─ Deduplication: automatic
  ↓
API Routes (unchanged)
  ↓
Database (unchanged)
```

**Key Improvements:**
- ✅ Services stay pure (caching is fetch configuration, not state)
- ✅ AudioContext stays clean (orchestration only, prefetch is separate concern)
- ✅ No new dependencies (Next.js native caching)
- ✅ Backward compatible (fallback to fresh fetch if cache fails)
- ✅ Testable (cache can be disabled in tests)

---

#### Risk Assessment & Mitigation

**Risk 1: Cache Staleness** 🟡 MEDIUM
- **Problem**: User sees old data if cache not invalidated
- **Mitigation**:
  - 1-hour revalidation (reasonable for book content)
  - Manual refresh button in settings
  - Version tags on book metadata

**Risk 2: Memory Pressure** 🟢 LOW
- **Problem**: Caching too much data in client memory
- **Mitigation**:
  - Server-side cache (Next.js) not client-side
  - React Query cache limits (if used)
  - Progressive loading keeps memory usage low

**Risk 3: Race Conditions** 🟡 MEDIUM
- **Problem**: Parallel requests may complete out of order
- **Mitigation**:
  - Existing requestId pattern prevents stale state
  - AbortController cancels outdated requests
  - Tests verify race condition handling

**Risk 4: Breaking Changes** 🟢 LOW
- **Problem**: Caching changes API contract
- **Mitigation**:
  - Caching is transparent (same function signature)
  - Phase 4 tests verify behavior unchanged
  - Incremental rollout (one task at a time)

---

#### Estimated Timeline

| Task | Estimated Time | Priority |
|------|----------------|----------|
| 5.1 Parallelize availability | 2 hours | HIGH |
| 5.2.1 Next.js fetch cache | 3 hours | HIGH |
| 5.3 Skip unnecessary checks | 1 hour | MEDIUM |
| 5.4 Optimistic UI | 4 hours | MEDIUM |
| 5.5 Prefetching | 3 hours | LOW |
| 5.2.2 React Query (optional) | 4 hours | LOW |
| Testing + Documentation | 4 hours | - |
| **Total** | **~1-2 days** | - |

**Recommended Order:**
1. Task 5.3 (1 hour) - Quick win, immediate 100% improvement for 60% of books
2. Task 5.1 (2 hours) - High impact, reduces sequential bottleneck
3. Task 5.2.1 (3 hours) - Caching layer, enables all future optimizations
4. Task 5.4 (4 hours) - UX improvement, makes app feel instant
5. Task 5.5 (3 hours) - Polish, makes transitions seamless

---

## 🚦 Rules & Guardrails (Feature Development During Refactoring)

### ✅ SAFE to Add (These Won't Conflict)

**Features that dispatch to existing contexts:**
- New audio control (add method to AudioContext)
- New UI modal (extract as component)
- New reading preference (add to ReadingUIContext)
- Analytics tracking
- Keyboard shortcuts

**Example Safe Feature: "Audio Bookmarks"**
```typescript
// In AudioContext.tsx
const [bookmarks, setBookmarks] = useState<number[]>([])

const addBookmark = (sentenceIndex: number) => {
  setBookmarks(prev => [...prev, sentenceIndex])
  // Save to localStorage
}

// In page.tsx - just call it
const { bookmarks, addBookmark } = useAudioContext()
<button onClick={() => addBookmark(currentSentenceIndex)}>
  Bookmark
</button>
```

### ❌ PAUSE Until Refactor Done (These Will Conflict)

**Features that need page-level state/loading:**
- Global Mini Player (needs app-scoped audio - wait for Phase 1)
- Playlist system (needs global book queue - wait for Phase 1)
- Cross-book search (needs data refactoring)
- Any feature that requires new page-level fetch logic

**Why Wait:**
Adding these now will create more "dueling loaders" and make refactoring harder.

### Decision Matrix

Before starting any new feature, ask:

| Question | Yes | No |
|----------|-----|-----|
| Does it need app-scoped state? | ❌ Wait | ✅ Safe |
| Does it add page-level fetch? | ❌ Wait | ✅ Safe |
| Does it duplicate context state? | ❌ Wait | ✅ Safe |
| Is it pure UI (modal/button)? | ✅ Safe | Check other questions |
| Does it just call context method? | ✅ Safe | Check other questions |

---

## 📝 Progress Tracking

### Completion Status

**Phase 1: Single Source of Truth** (Week 1) - ✅ **COMPLETED**
- [x] Task 1.1: Audit AudioContext
- [x] Task 1.2: Add book selection to context
- [x] Task 1.3: Ensure level management in context
- [x] Task 1.4: Remove page-level fetching
- [x] Task 1.5: Convert to context dispatches
- [x] Task 1.6: Remove state clearing effects
- [x] Task 1.7: Integration testing

**Phase 2: Navigation & Resume** (Week 2) - ✅ **COMPLETED**
- [x] Task 2.1: Atomic resume
- [x] Task 2.2: Level persistence
- [x] Task 2.3: Continue modal integration
- [x] Task 2.4: Remove DOM polling

**Phase 3: Component Extraction** (Week 3) - ✅ **COMPLETED**
- [x] Task 3.1: BookSelectionGrid
- [x] Task 3.2: ReadingHeader
- [x] Task 3.3: SettingsModal
- [x] Task 3.4: ChapterModal
- [x] Task 3.5: ContinueReadingModal (Deferred to Phase 4)
- [x] Task 3.6: Update page composition

**Phase 4: Service Layer** (Optional/Future)
- [ ] Not started (low priority)

**Phase 5: Performance Optimization** (Nov 2025)
- [x] Investigation: Identified bottlenecks (sequential API calls, no caching, wasteful availability checks)
- [x] Created comprehensive performance optimization plan (see Phase 5 section below)
- [ ] Task 5.1: Parallelize availability checks
- [ ] Task 5.2: Implement intelligent caching layer
- [ ] Task 5.3: Skip unnecessary availability checks
- [ ] Task 5.4: Add optimistic UI patterns
- [ ] Task 5.5: Implement prefetching strategy
- [ ] Target: <500ms load time (from 4-5 seconds)

### Metrics to Track

| Metric | Before | Target | Current (After Phase 3) |
|--------|--------|--------|---------|
| Page LOC | 2,506 | <400 | **1,988** ✅ (↓518 lines) |
| Components Extracted | 0 | 5+ | **4** (460 lines total) |
| useState Count | 28 | <5 | 28 (Phase 4 target) |
| useEffect Count | 10 | <3 | 10 (Phase 4 target) |
| Responsibilities | 12 | 1 (composition) | **8** ✅ (4 UI concerns extracted) |
| Time to Add Feature | 2 days | <4 hours | ~4 hours (Phase 1 & 2 improvement) |
| Book Loading Time | 4-5 sec | <1 sec | 4-5 sec (Phase 5 target) |
| Can Test Components? | No | Yes | **Yes** ✅ (4 components testable) |

### Velocity Indicators

**Before Refactoring:**
- Global Mini Player: 2 days, failed, reverted
- Adding dictionary: Days
- Adding AI chat: Days

**After Phase 1:**
- Global Mini Player: Should take <4 hours

**After Phase 3:**
- Any new modal: <1 hour
- Any new control: <2 hours

---

## 🔗 Related Documentation

### Reference These Docs

1. **`/docs/implementation/ARCHITECTURE_OVERVIEW.md`**
   - System boundaries (5 systems defined)
   - Featured Books deep dive (lines 70-315)
   - Component architecture expectations

2. **`/docs/implementation/GLOBAL_MINI_PLAYER_LESSONS.md`**
   - Failure analysis from 2-day attempt
   - What went wrong (state scoping)
   - Lessons learned

3. **`/docs/implementation/GLOBAL_MINI_PLAYER_FIX_PLAN.md`**
   - Original 3-fix plan (now superseded by this refactor)
   - Bug analysis still relevant

### Update After Refactoring

**When Phase 1 Complete:**
- Update ARCHITECTURE_OVERVIEW.md with AudioContext details
- Document new state ownership model
- Add code anchors for AudioContext

**When Phase 3 Complete:**
- Update component architecture diagram
- Document new file structure
- Add code anchors for extracted components

---

## 📚 Which Files to Reference for Future Work

### When Adding New Features

**Use this decision tree:**

```
Adding a new feature?
│
├─ Is it for featured-books page specifically?
│  └─ YES → Read FEATURED_BOOKS_REFACTOR_PLAN.md (this file)
│           Check "Rules & Guardrails" section
│           Follow "Best Practices" section
│
├─ Is it app-wide (any page)?
│  └─ YES → Read ARCHITECTURE_OVERVIEW.md
│           Identify which system it belongs to
│           Follow documented patterns
│
└─ Not sure?
   └─ Read both files, ask:
      - Does it need app-scoped state? (ARCHITECTURE_OVERVIEW.md)
      - Will it touch featured-books? (FEATURED_BOOKS_REFACTOR_PLAN.md)
```

### File Purposes (Quick Reference)

| File | Use When | Contains |
|------|----------|----------|
| **FEATURED_BOOKS_REFACTOR_PLAN.md** | Working on featured-books page refactoring or adding features to it | Refactoring roadmap, task checklist, rules for safe features, progress tracking |
| **ARCHITECTURE_OVERVIEW.md** | Understanding system boundaries, adding features to ANY page, architecting new systems | 5 core systems, data models, component patterns, code anchors for entire app |
| **NEO_CLASSIC_TRANSFORMATION_PLAN.md** | Styling/theming components, maintaining visual consistency | Theme variables, typography system, design patterns, page-by-page styling guide |
| **GLOBAL_MINI_PLAYER_LESSONS.md** | Understanding why we're refactoring, learning from past mistakes | Failure analysis, lessons learned, what NOT to do |

### Examples

**Scenario 1: "I want to add a bookmark feature"**
1. Read ARCHITECTURE_OVERVIEW.md → Identify this is Audio System
2. Read FEATURED_BOOKS_REFACTOR_PLAN.md → Check if safe to add now
3. Follow: Add method to AudioContext, page dispatches to it

**Scenario 2: "I want to add a new reading page for essays"**
1. Read ARCHITECTURE_OVERVIEW.md → Understand Reading System patterns
2. DON'T read FEATURED_BOOKS_REFACTOR_PLAN.md (different page)
3. Follow: Create new page following same context patterns

**Scenario 3: "I want to fix a bug in featured-books audio"**
1. Read FEATURED_BOOKS_REFACTOR_PLAN.md → Understand current state
2. Read "Current State Analysis" section
3. Check if AudioContext exists, follow SSoT principle

**Scenario 4: "I want to understand how the app works"**
1. Start with ARCHITECTURE_OVERVIEW.md (10-minute overview)
2. Then FEATURED_BOOKS_REFACTOR_PLAN.md (specific deep dive)
3. Then code files with anchors provided

### Update Frequency

**ARCHITECTURE_OVERVIEW.md:**
- Update after adding ANY new system or major component
- Update monthly with new code anchors
- Update after major refactoring (like this one)

**FEATURED_BOOKS_REFACTOR_PLAN.md:**
- Update after completing each phase
- Check off tasks as you complete them
- Add lessons learned if new issues discovered
- Archive when all phases complete (mark as "COMPLETED")

---

## 💡 Best Practices Established

### Principles to Follow Going Forward

1. **Single Source of Truth**
   - Each piece of state has ONE owner
   - If needed globally → Context
   - If needed locally → Component useState
   - Never duplicate state between page and context

2. **Dispatch, Don't Manage**
   - Pages dispatch actions: `ctx.selectBook()`
   - Pages don't manage state: `setSelectedBook()`
   - Context handles all side effects

3. **Test After Every Task**
   - Manual test after each task (~30 min)
   - Catch regressions immediately
   - Never accumulate untested changes

4. **Incremental, Reversible Changes**
   - One task = one small PR
   - Each task should be shippable
   - Can revert without losing other work

5. **Component Extraction Pattern**
   - Extract presentational components first
   - Props should be simple and typed
   - Components should be reusable
   - Logic stays in contexts/hooks

6. **Documentation-Driven Development**
   - Update ARCHITECTURE_OVERVIEW after each feature
   - Document state ownership
   - Keep code anchors current

---

## 🎯 Next Immediate Action

**Start Here:**

1. **Read**: This entire document (you're doing this now ✓)
2. **Check**: Is AudioContext already implemented?
   - If yes: Start Task 1.1 (audit it)
   - If no: Create it before Task 1.1
3. **Branch**: Create `refactor/featured-books-phase-1`
4. **Begin**: Task 1.1 - Audit AudioContext

**Command to Start:**
```bash
git checkout -b refactor/featured-books-phase-1
# Create or read contexts/AudioContext.tsx
```

**First Question to Answer:**
Does `/contexts/AudioContext.tsx` exist? What does it currently own?

---

## 📊 Risk Assessment

### High-Risk Areas (Test Thoroughly)

1. **Audio Playback** - Users' primary feature
   - Test play, pause, resume after each task
   - Test bundle transitions (seamless playback)

2. **Position Restoration** - Users expect to resume
   - Test after page refresh
   - Test after navigation away and back

3. **Level Switching** - Common user action
   - Test switching while playing
   - Test switching while paused
   - Test level persistence

### Low-Risk Areas (Can Move Fast)

1. **UI Components** - Visual only, no logic
   - BookSelectionGrid
   - Modals (Settings, Chapter, Continue)

2. **Static Data** - No runtime impact
   - Moving constants to data/ folder

### Rollback Plan

**If Phase 1 Breaks Production:**
1. Git revert to last working commit
2. Document what broke
3. Fix in isolation on branch
4. Try again with smaller task

**Prevention:**
- Test after EVERY task
- Commit frequently
- Deploy to staging first
- Feature flag risky changes

---

## 🏁 Definition of Done

### Phase 1 Complete When:
- [ ] AudioContext owns all book/level/audio state
- [ ] Page.tsx has zero fetch calls
- [ ] No page-level state variables for book/level/bundles
- [ ] All features work (book selection, level switch, audio playback)
- [ ] Global Mini Player can theoretically be added
- [ ] No console errors or infinite spinners

### Phase 2 Complete When:
- [ ] Resume works 100% of the time (atomic operation)
- [ ] Level persists across navigation and refresh
- [ ] No setTimeout hacks remain
- [ ] Continue modal integrated with context

### Phase 3 Complete When:
- [ ] Page.tsx <1,000 lines (ideally <600)
- [ ] At least 5 components extracted
- [ ] Zero visual regressions
- [ ] Components are reusable and typed

### Entire Refactor Complete When:
- [ ] All 3 phases done
- [ ] Can add Global Mini Player in <4 hours
- [ ] Can write unit tests for contexts
- [ ] ARCHITECTURE_OVERVIEW.md updated
- [ ] Team can confidently add features

---

**Document Version**: 1.1
**Created**: January 2025
**Last Updated**: January 2025 (Added Phase 5: Performance Optimization + File Reference Guide)
**Next Review**: After Phase 1 completion
**Status**: Ready to begin Phase 1

**Changelog:**
- v1.1: Added Phase 5 (Performance Optimization), File Reference Guide for future features, Book Loading Time metric
- v1.0: Initial document with Phases 1-4
