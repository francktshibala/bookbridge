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

### Phase 1: Establish Single Source of Truth (Week 1) ⚡ CRITICAL

**Goal**: Fix "dueling loaders" by making AudioContext the sole owner of book/level/audio state.

#### Task 1.1: Audit AudioContext (Current State)
- [ ] Read `/contexts/AudioContext.tsx` (if exists, or create)
- [ ] Document what state it currently owns
- [ ] Identify what's missing (book selection, level management)
- [ ] Check if `loadBook()` and `switchLevel()` exist
- **Deliverable**: Document current AudioContext API

#### Task 1.2: Extend AudioContext with Book Selection
- [ ] Add `selectedBook` state to AudioContext
- [ ] Add `selectBook(book: FeaturedBook, initialLevel?: string)` method
- [ ] Method should: load bundles, set level, initialize audio
- [ ] Add `unloadBook()` method for cleanup
- [ ] Test: Can select book via context
- **Deliverable**: AudioContext handles book selection

#### Task 1.3: Ensure Level Management in AudioContext
- [ ] Confirm `cefrLevel` state exists in AudioContext
- [ ] Confirm `switchLevel(newLevel: string)` exists
- [ ] Method should: stop audio, load new level bundles, save position
- [ ] Add level persistence (save to localStorage on switch)
- [ ] Test: Can switch levels via context
- **Deliverable**: AudioContext handles all level operations

#### Task 1.4: Remove Page-Level Data Fetching
- [ ] Locate `loadData()` useEffect in page.tsx (around line 865)
- [ ] Comment out or remove fetch logic
- [ ] Replace with: Read from `const { bundleData } = useAudioContext()`
- [ ] Remove `setBundleData()` calls from page
- [ ] Test: Page renders bundle data from context
- **Deliverable**: Page is read-only consumer of context

#### Task 1.5: Convert Page Actions to Context Dispatches
- [ ] Find book selection onClick handlers (around line 1770)
- [ ] Replace `setSelectedBook()` with `audioContext.selectBook(book)`
- [ ] Find level selector onChange (in SettingsModal)
- [ ] Replace `setCefrLevel()` with `audioContext.switchLevel(level)`
- [ ] Remove page-level `cefrLevel` state variable
- [ ] Test: Clicking book/level calls context methods
- **Deliverable**: Page dispatches to context only

#### Task 1.6: Remove Effect-Based State Clearing
- [ ] Find effects that call `setBundleData(null)` (around line 722)
- [ ] Remove these clearing calls
- [ ] Let AudioContext manage bundle lifecycle
- [ ] Test: No infinite spinners when switching books/levels
- **Deliverable**: Effects don't fight context

#### Task 1.7: Integration Testing (Critical Checkpoint)
- [ ] Manual test: Select book → audio loads
- [ ] Manual test: Switch level → new audio loads
- [ ] Manual test: Play → audio plays from correct bundle
- [ ] Manual test: Navigate away → state preserved (if global)
- [ ] Manual test: Refresh page → position restored
- [ ] Check: No console errors
- [ ] Check: No infinite loading spinners
- **Deliverable**: Core functionality working via context

**Success Criteria for Phase 1:**
- ✅ AudioContext is single source of truth
- ✅ Page.tsx has zero fetch calls
- ✅ Selecting books and switching levels works perfectly
- ✅ No race conditions or spinner bugs
- ✅ Global Mini Player becomes theoretically possible

**Estimated Time**: 3-5 days (critical, high-risk phase)

---

### Phase 2: Fix Navigation & Resume Bugs (Week 2)

**Goal**: Ensure reading position restoration and navigation work correctly with new architecture.

#### Task 2.1: Atomic Resume Implementation
- [ ] Find `restorePosition()` in AudioContext
- [ ] Ensure it calls: `audioManager.playBundleSentence(bundle, sentenceIndex)`
- [ ] Make resume atomic (bundle + index set together, not separately)
- [ ] Add guard: don't start audio until bundles loaded
- [ ] Test: Refresh page → resumes at exact position
- **Deliverable**: Resume works atomically

#### Task 2.2: Level Persistence on Navigation
- [ ] Ensure `switchLevel()` saves level to ReadingPosition
- [ ] On restore, use saved level not default A1
- [ ] Test: Read A2, navigate away, return → still A2
- [ ] Test: Refresh → level preserved
- **Deliverable**: Level persists across navigation

#### Task 2.3: Continue Reading Modal Integration
- [ ] Check Continue Reading modal shows on return (if <24hrs)
- [ ] Ensure it reads from AudioContext.savedPosition
- [ ] "Continue" button calls: `audioContext.resume()`
- [ ] "Start Over" button calls: `audioContext.play(0)`
- [ ] Test: Modal appears with correct position
- **Deliverable**: Continue modal works with context

#### Task 2.4: Remove DOM Polling Hacks
- [ ] Find setTimeout calls for DOM readiness (search "setTimeout")
- [ ] Replace with explicit "bundles ready" checks
- [ ] Add `bundlesReady` boolean to AudioContext
- [ ] Page waits for `bundlesReady` before rendering text
- [ ] Test: No race conditions on fast refreshes
- **Deliverable**: No timing band-aids

**Success Criteria for Phase 2:**
- ✅ Resume from saved position works 100%
- ✅ Level preserved on navigation
- ✅ No setTimeout hacks for correctness
- ✅ Continue reading modal integrated

**Estimated Time**: 2-3 days

---

### Phase 3: Extract UI Components (Week 3)

**Goal**: Break down 1,876-line component into manageable, reusable pieces.

#### Task 3.1: Extract BookSelectionGrid Component
- [ ] Create: `/app/featured-books/components/BookSelectionGrid.tsx`
- [ ] Move: Lines 1748-1833 (book grid JSX)
- [ ] Props: `books: FeaturedBook[]`, `onSelectBook: (book) => void`, `onAskAI: (book) => void`
- [ ] Keep framer-motion animations
- [ ] Test: Grid looks identical, clicks work
- **Deliverable**: Reusable book grid component

#### Task 3.2: Extract ReadingHeader Component
- [ ] Create: `/app/featured-books/components/ReadingHeader.tsx`
- [ ] Move: Lines 1839-1871 (back button, auto-scroll status, settings button)
- [ ] Props: `onBack: () => void`, `onSettings: () => void`, `autoScrollPaused: boolean`
- [ ] Test: Header looks identical, buttons work
- **Deliverable**: Reusable reading header

#### Task 3.3: Extract SettingsModal Component
- [ ] Create: `/app/featured-books/components/SettingsModal.tsx`
- [ ] Move: Settings modal JSX (find with "Settings Modal")
- [ ] Props: `isOpen: boolean`, `onClose: () => void`, `currentLevel: string`, `onLevelChange: (level) => void`
- [ ] Test: Modal opens/closes, level selector works
- **Deliverable**: Reusable settings modal

#### Task 3.4: Extract ChapterModal Component
- [ ] Create: `/app/featured-books/components/ChapterModal.tsx`
- [ ] Move: Chapter picker modal JSX
- [ ] Props: `isOpen: boolean`, `chapters: Chapter[]`, `currentChapter: number`, `onSelectChapter: (ch) => void`
- [ ] Test: Modal shows chapters, navigation works
- **Deliverable**: Reusable chapter modal

#### Task 3.5: Extract ContinueReadingModal Component
- [ ] Create: `/app/featured-books/components/ContinueReadingModal.tsx`
- [ ] Move: Continue reading toast JSX
- [ ] Props: `isOpen: boolean`, `position: SavedPosition`, `onContinue: () => void`, `onStartOver: () => void`
- [ ] Test: Modal shows on resume
- **Deliverable**: Reusable resume modal

#### Task 3.6: Update Page to Use Components
- [ ] Import all new components
- [ ] Replace JSX blocks with `<BookSelectionGrid />`, `<ReadingHeader />`, etc.
- [ ] Pass required props
- [ ] Remove extracted JSX from page.tsx
- [ ] Test: Everything looks and works identically
- **Deliverable**: Page.tsx reduced by ~600 lines

**Success Criteria for Phase 3:**
- ✅ Page.tsx reduced from 2,506 to ~1,900 lines
- ✅ Each component <200 lines
- ✅ Zero visual or functional regressions
- ✅ Components are reusable

**Estimated Time**: 4-5 days (low-risk, incremental)

---

### Phase 4: Optional Service Layer (Future)

**Goal**: Extract business logic from contexts into testable services.

**When to Do This:**
- After Phases 1-3 complete
- When you need to add automated tests
- When logic complexity increases

**What to Extract:**
```typescript
// services/AudioSessionService.ts
class AudioSessionService {
  async loadBook(bookId: string, level: string): Promise<BundleData>
  async switchLevel(newLevel: string): Promise<BundleData>
  savePosition(position: ReadingPosition): Promise<void>
  restorePosition(bookId: string): Promise<ReadingPosition | null>
}
```

**Not Urgent**: This is a "nice-to-have" for testing, not critical path.

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

**Phase 1: Single Source of Truth** (Week 1)
- [ ] Task 1.1: Audit AudioContext
- [ ] Task 1.2: Add book selection to context
- [ ] Task 1.3: Ensure level management in context
- [ ] Task 1.4: Remove page-level fetching
- [ ] Task 1.5: Convert to context dispatches
- [ ] Task 1.6: Remove state clearing effects
- [ ] Task 1.7: Integration testing

**Phase 2: Navigation & Resume** (Week 2)
- [ ] Task 2.1: Atomic resume
- [ ] Task 2.2: Level persistence
- [ ] Task 2.3: Continue modal integration
- [ ] Task 2.4: Remove DOM polling

**Phase 3: Component Extraction** (Week 3)
- [ ] Task 3.1: BookSelectionGrid
- [ ] Task 3.2: ReadingHeader
- [ ] Task 3.3: SettingsModal
- [ ] Task 3.4: ChapterModal
- [ ] Task 3.5: ContinueReadingModal
- [ ] Task 3.6: Update page composition

**Phase 4: Service Layer** (Optional/Future)
- [ ] Not started (low priority)

**Phase 5: Performance Optimization** (After Phases 1-3)
- [ ] Investigation: Profile current loading time (4-5 seconds)
- [ ] Investigation: Identify bottlenecks (API, network, parsing)
- [ ] Investigation: Research caching strategies
- [ ] Create performance optimization plan
- [ ] Note: This is a separate project after architecture fixes

### Metrics to Track

| Metric | Before | Target | Current |
|--------|--------|--------|---------|
| Page LOC | 2,506 | <400 | 2,506 |
| useState Count | 28 | <5 | 28 |
| useEffect Count | 10 | <3 | 10 |
| Responsibilities | 12 | 1 (composition) | 12 |
| Time to Add Feature | 2 days | <4 hours | 2 days |
| Book Loading Time | 4-5 sec | <1 sec | 4-5 sec |
| Can Test? | No | Yes | No |

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
