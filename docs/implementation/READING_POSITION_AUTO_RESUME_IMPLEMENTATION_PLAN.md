# Reading Position Auto-Resume Implementation Plan

**Date**: October 25, 2025
**Feature**: Netflix-Style Auto-Resume on Page Refresh
**Status**: Planning Phase - Awaiting GPT-5 Review

---

## 📋 Expected Behavior (Netflix-Style Auto-Resume)

### Current (Broken) Flow:
1. User reads "The Necklace" to sentence 45
2. User refreshes page → Shows book selection screen
3. User must click "The Necklace" card again
4. **Sometimes** shows "Continue Reading?" modal
5. User clicks "Continue" → Resumes from sentence 45

### Expected (Netflix-Style) Flow:
1. User reads "The Necklace" to sentence 45
2. User refreshes page → **Auto-loads "The Necklace" immediately**
3. **Auto-scrolls to sentence 45** (no manual selection needed)
4. Shows toast: "Resuming from Chapter 2, Sentence 45..." (3-second auto-dismiss)
5. User can click toast to "Start from Beginning" if desired
6. Audio ready to play from exact position

### Visual End Result:

```
Page Refresh Flow:
┌─────────────────────────────────────────────────┐
│ [Loading bundles for "The Necklace"...]        │ ← 1-2 sec loading
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│              The Necklace                       │
│          by Guy de Maupassant                   │
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ 📖 Resuming from Chapter 2, Sentence 45... ││ ← Toast notification
│ │ [Start from Beginning]                 [✕] ││   (Neo-Classic theme)
│ └─────────────────────────────────────────────┘│
│                                                 │
│ Chapter 2: The Ball                            │
│                                                 │
│ She arrives at the party wearing the necklace.│ ← Auto-scrolled
│ █████████████████████████████████████████████  │   to saved position
│ Everyone admires her beauty and elegance...    │   (highlighted sentence)
│                                                 │
│ [1x]  [▶]  [📖]  [🎙️]                         │ ← Ready to play
└─────────────────────────────────────────────────┘
```

---

## 🔍 Root Cause Analysis

### Problem Identification

**Key Files:**
- `app/featured-books/page.tsx` - Main reading page (2,500+ lines)
- `lib/services/reading-position.ts` - Position tracking service
- `app/api/reading-position/recent/route.ts` - Recent books API

### Current Implementation Issues:

1. **Line 633** (`featured-books/page.tsx`):
   ```typescript
   const [showBookSelection, setShowBookSelection] = useState(true);
   ```
   - Always defaults to `true` on every page load
   - Forces book selection screen on refresh

2. **Line 1098-1140** (`featured-books/page.tsx`):
   ```typescript
   setTimeout(async () => {
     const savedPosition = await readingPositionService.loadPosition(currentBookId);
     // Position restore only runs AFTER book is manually selected
   }, 100);
   ```
   - Reading position restore only triggers after book selection
   - No auto-load logic on page mount

3. **Missing Workflow**:
   - No code checks for recent books on page mount
   - No auto-selection of last-read book
   - Page refresh → always shows book grid

### What Works (Partially):
- ✅ Reading position is saved correctly during playback
- ✅ Continue modal works IF user manually selects same book again
- ✅ Position restore logic works (scrolling, highlighting, settings)
- ✅ API `/api/reading-position/recent` exists and returns last book

### What's Broken:
- ❌ No auto-load on page refresh
- ❌ User must manually re-select book every time
- ❌ Breaks Netflix-style "pick up where you left off" UX

---

## 📋 Proposed Implementation Plan

### Phase 1: Add Auto-Load Logic on Mount

**Location**: `app/featured-books/page.tsx` (add new useEffect at line ~690)

**What to add:**
```typescript
// New useEffect - check for recent book on page mount
useEffect(() => {
  async function checkForRecentBook() {
    try {
      // Check for recent reading activity
      const recentBooks = await readingPositionService.getRecentBooks(1);

      if (recentBooks.length > 0) {
        const lastBook = recentBooks[0];

        // Check if book was read within last 7 days
        const daysSinceLastRead =
          (Date.now() - new Date(lastBook.lastAccessed).getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceLastRead <= 7) {
          // Find book in FEATURED_BOOKS array
          const book = FEATURED_BOOKS.find(b => b.id === lastBook.bookId);

          if (book) {
            console.log('📖 Auto-loading last book:', book.title);
            setSelectedBook(book);
            setShowBookSelection(false);
            setCefrLevel(lastBook.cefrLevel as any);
            setAutoResumeBookId(lastBook.bookId); // New state flag
          }
        }
      }
    } catch (error) {
      console.error('Failed to auto-load recent book:', error);
      // Silently fail - show book selection on error
    }
  }

  checkForRecentBook();
}, []); // Run once on mount
```

**New state variables needed:**
```typescript
const [autoResumeBookId, setAutoResumeBookId] = useState<string | null>(null);
const [showResumeToast, setShowResumeToast] = useState(false);
```

---

### Phase 2: Replace Modal with Toast Notification

**Location**: `app/featured-books/page.tsx` (replace lines 2290-2330)

**Changes:**
1. Remove existing "Continue Reading?" modal
2. Add new toast component with Neo-Classic theme
3. Show toast automatically when auto-resume completes
4. 3-second auto-dismiss with option to "Start from Beginning"

**Toast UI to add:**
```tsx
{/* Resume Toast Notification */}
{showResumeToast && savedPosition && (
  <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
    <div className="bg-[var(--bg-secondary)] border-2 border-[var(--accent-primary)]/40 rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4 min-w-96">
      <div className="text-2xl">📖</div>
      <div className="flex-1">
        <div className="text-[var(--text-primary)] font-semibold mb-1">
          Resuming from Chapter {savedPosition.chapter}, Sentence {savedPosition.sentenceIndex + 1}
        </div>
        <div className="text-[var(--text-secondary)] text-sm">
          {Math.round(savedPosition.completion)}% complete
        </div>
      </div>
      <button
        onClick={startFromBeginning}
        className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] underline"
      >
        Start from Beginning
      </button>
      <button
        onClick={() => setShowResumeToast(false)}
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xl"
      >
        ×
      </button>
    </div>
  </div>
)}
```

**CSS animation to add to `app/globals.css`:**
```css
@keyframes slide-down {
  from { opacity: 0; transform: translate(-50%, -20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.animate-slide-down {
  animation: slide-down 0.3s ease-out;
}
```

---

### Phase 3: Update Position Restore Logic

**Location**: `app/featured-books/page.tsx` (lines 1098-1140)

**Changes:**
```typescript
const savedPosition = await readingPositionService.loadPosition(currentBookId);
if (savedPosition && savedPosition.currentSentenceIndex > 0) {
  // Restore UI state
  setCurrentSentenceIndex(savedPosition.currentSentenceIndex);
  setCurrentChapter(savedPosition.currentChapter);

  const hoursSinceLastRead = savedPosition.lastAccessed
    ? (Date.now() - new Date(savedPosition.lastAccessed).getTime()) / (1000 * 60 * 60)
    : 999;

  if (autoResumeBookId === currentBookId) {
    // Auto-resumed from page refresh - show toast
    setSavedPosition({
      sentenceIndex: savedPosition.currentSentenceIndex,
      chapter: savedPosition.currentChapter,
      completion: savedPosition.completionPercentage
    });
    setShowResumeToast(true);

    // Auto-dismiss after 3 seconds
    setTimeout(() => setShowResumeToast(false), 3000);

    // Clear flag after use
    setAutoResumeBookId(null);
  } else if (hoursSinceLastRead < 24) {
    // Manually selected book - show modal (keep existing behavior)
    setSavedPosition({
      sentenceIndex: savedPosition.currentSentenceIndex,
      timestamp: new Date(savedPosition.lastAccessed || Date.now()).getTime()
    });
    setShowContinueReading(true);
  }

  // Restore all settings (existing code)
  if (savedPosition.cefrLevel) setCefrLevel(savedPosition.cefrLevel as any);
  if (savedPosition.playbackSpeed) setPlaybackSpeed(savedPosition.playbackSpeed);
  if (savedPosition.contentMode) setContentMode(savedPosition.contentMode);

  // Auto-scroll to position (existing code)
  setTimeout(() => {
    const sentenceElement = document.querySelector(`[data-sentence-index="${savedPosition.currentSentenceIndex}"]`);
    if (sentenceElement) {
      sentenceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 500);
}
```

---

### Phase 4: Update Recent Books API

**Location**: `app/api/reading-position/recent/route.ts` (lines 46-57)

**Issue**: Featured books metadata is hardcoded for only 2 books

**Fix**: Add all featured books to metadata

```typescript
// Replace hardcoded metadata with complete list
const featuredBooks = {
  'the-necklace': {
    title: 'The Necklace',
    author: 'Guy de Maupassant',
    totalSentences: 20
  },
  'the-dead': {
    title: 'The Dead',
    author: 'James Joyce',
    totalSentences: 451
  },
  'the-metamorphosis': {
    title: 'The Metamorphosis',
    author: 'Franz Kafka',
    totalSentences: 280
  },
  'lady-with-dog': {
    title: 'The Lady with the Dog',
    author: 'Anton Chekhov',
    totalSentences: 349
  },
  'gift-of-the-magi': {
    title: 'The Gift of the Magi',
    author: 'O. Henry',
    totalSentences: 153
  },
  'yellow-wallpaper': {
    title: 'The Yellow Wallpaper',
    author: 'Charlotte Perkins Gilman',
    totalSentences: 180
  },
  'devoted-friend': {
    title: 'The Devoted Friend',
    author: 'Oscar Wilde',
    totalSentences: 200
  }
  // Add remaining featured books...
};
```

---

### Phase 5: Add Loading State for Auto-Resume

**Location**: `app/featured-books/page.tsx`

**What to add:**
```tsx
{/* Auto-Resume Loading Indicator */}
{loading && autoResumeBookId && (
  <div className="fixed inset-0 bg-[var(--bg-primary)] flex items-center justify-center z-50">
    <div className="text-center">
      <div className="text-4xl mb-4">📖</div>
      <div className="text-[var(--text-primary)] text-xl font-semibold mb-2">
        Loading {selectedBook?.title}...
      </div>
      <div className="text-[var(--text-secondary)]">
        Resuming your reading session
      </div>
    </div>
  </div>
)}
```

---

## ✅ Implementation Checklist

### Files to Modify:

1. **`app/featured-books/page.tsx`** (Main implementation)
   - Add `autoResumeBookId` and `showResumeToast` state variables
   - Add `checkForRecentBook()` useEffect on mount
   - Update position restore logic (distinguish auto vs manual)
   - Add toast notification UI
   - Add auto-resume loading indicator
   - Implement `startFromBeginning()` function

2. **`app/api/reading-position/recent/route.ts`**
   - Update `featuredBooks` object with all books
   - Ensure consistent bookId format

3. **`app/globals.css`**
   - Add `@keyframes slide-down` animation
   - Add `.animate-slide-down` class

4. **`lib/services/reading-position.ts`** (Optional enhancement)
   - Add better TypeScript types
   - Add helper methods if needed

### New Functions Required:

```typescript
// Start book from beginning
const startFromBeginning = async () => {
  if (selectedBook) {
    await readingPositionService.resetPosition(selectedBook.id);
    setCurrentSentenceIndex(0);
    setCurrentChapter(1);
    setShowResumeToast(false);
    setShowContinueReading(false);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
```

### Testing Requirements:

- [ ] Test auto-load on page refresh (within 7 days)
- [ ] Test toast shows with correct chapter/sentence
- [ ] Test "Start from Beginning" button works
- [ ] Test auto-dismiss after 3 seconds
- [ ] Test manual book selection still shows modal
- [ ] Test no auto-load if last read > 7 days
- [ ] Test graceful fallback if API fails
- [ ] Test works when user is not authenticated
- [ ] Test localStorage fallback works
- [ ] Test multiple books in reading history

---

## 📊 Estimated Impact

**Before Fix:**
- User must click 2-3 times to resume reading
- High friction, breaks immersion
- Position saved but not auto-restored
- Poor user experience on page refresh

**After Fix:**
- 0 clicks to resume (automatic)
- Netflix-style seamless experience
- 60% increase in session continuity (estimated)
- Matches user expectations from streaming platforms

---

## 🤔 Questions for GPT-5 Review

Please review this implementation plan and provide recommendations on:

1. **Architecture**: Is the auto-load useEffect the right approach, or should we use a different pattern?

2. **State Management**: Are the new state variables (`autoResumeBookId`, `showResumeToast`) sufficient, or should we consolidate state?

3. **UX Decision**: Should we:
   - Auto-resume immediately with dismissible toast (proposed)
   - Show confirmation before auto-loading
   - Different behavior for mobile vs desktop?

4. **Edge Cases**: What edge cases are we missing?
   - User deletes book from database
   - Concurrent sessions across devices
   - Book data structure changes
   - API failures during auto-load

5. **Performance**: Is the `getRecentBooks(1)` API call on every page mount acceptable, or should we:
   - Use localStorage cache first
   - Add server-side caching
   - Debounce or throttle calls

6. **Code Organization**: Should we:
   - Extract auto-resume logic into a custom hook (`useAutoResume`)?
   - Create a separate component for the toast?
   - Keep everything in the main page component?

7. **Testing Strategy**: What additional test cases should we add?

8. **Accessibility**: Are there accessibility concerns with auto-loading and toast notifications?

9. **Mobile Considerations**: Any specific mobile UX considerations?

10. **Feature Flags**: Should we implement this behind a feature flag initially?

---

## 📚 Context Files for GPT-5 to Review

Please read these files to fully understand the context:

### Required Reading (in order):

1. **`/docs/implementation/ARCHITECTURE_OVERVIEW.md`**
   - Lines 17-66: Critical distinction between PRIMARY (bundle-based) vs LEGACY systems
   - Lines 70-314: Featured Books Page deep dive (the page we're modifying)
   - Understanding of the 35+ features and state management

2. **`/app/featured-books/page.tsx`**
   - Lines 630-680: Current state initialization (where we add new state)
   - Lines 690-710: URL-based book selection logic (understand existing auto-select)
   - Lines 1050-1150: Bundle loading logic (where auto-resume will integrate)
   - Lines 1098-1140: Current position restore logic (what we're enhancing)
   - Lines 2290-2330: Current "Continue Reading" modal (what we're replacing)

3. **`/lib/services/reading-position.ts`**
   - Lines 1-86: `loadPosition()` method (how we get saved position)
   - Lines 160-180: `getRecentBooks()` method (how we get last book)
   - Understand the localStorage fallback pattern

4. **`/app/api/reading-position/recent/route.ts`**
   - Lines 1-84: Complete API implementation
   - Lines 46-57: Featured books metadata (needs updating)
   - Understand the response format

5. **`/docs/MASTER_MISTAKES_PREVENTION.md`**
   - Lines 1-50: Critical success requirements
   - Lines 976-1084: Current production standards
   - Understand the quality bar we must meet

### Optional but Helpful:

6. **`/docs/implementation/audiobook-pipeline-complete.md`**
   - Understanding of bundle architecture
   - Solution 1 metadata structure

7. **`/app/globals.css`**
   - Current theme CSS variables
   - Understand Neo-Classic theme styling

---

## 🎯 Success Criteria

The implementation will be considered successful when:

1. ✅ Page refresh automatically loads last-read book (within 7 days)
2. ✅ Toast notification appears with correct chapter/sentence
3. ✅ Auto-scroll to saved position works
4. ✅ "Start from Beginning" button resets position
5. ✅ Toast auto-dismisses after 3 seconds
6. ✅ Manual book selection still shows existing modal
7. ✅ No auto-load if no recent books or > 7 days
8. ✅ Graceful fallback on API errors
9. ✅ Works with localStorage fallback (unauthenticated users)
10. ✅ No performance degradation on page load
11. ✅ Neo-Classic theme styling matches existing UI
12. ✅ Accessibility standards met (keyboard navigation, screen readers)

---

## 📝 Notes for Implementation

- Follow MASTER_MISTAKES_PREVENTION.md guidelines
- Use Neo-Classic theme CSS variables (--bg-primary, --accent-primary, etc.)
- Maintain existing position save/restore logic
- Don't break manual book selection flow
- Test on mobile and desktop
- Consider implementing behind feature flag initially
- Update ARCHITECTURE_OVERVIEW.md after implementation

---

**GPT-5**: Please review this plan and provide your recommendations. Feel free to suggest alternative approaches, identify missing edge cases, or propose architectural improvements. We want to ensure this implementation is robust, performant, and maintains the high quality bar of the BookBridge application.

## GPT-5 RECOMMENDATIONS

### Approved approach (with refinements)
- Keep the client-side auto-load on mount in `featured-books/page.tsx`, but make it localStorage-first and API-second to avoid blocking UI on auth/network.
- Add a small orchestration layer to avoid races with existing URL-based selection and manual clicks:
  - Priority order on mount: URL param bookId → in-memory selection from prior navigation → localStorage recent → API recent.
  - Abort auto-resume if the user selects a book before auto-resume resolves.
- Replace the modal with a non-blocking, accessible toast as proposed. Make it ARIA live="polite" and dismissible.

### Critical edge cases to handle
- Unauthenticated users: 401 from `/api/reading-position/recent` → fall back to localStorage recent key; never show errors.
- Stale positions: saved `currentSentenceIndex` beyond `totalSentences` after content changes → clamp to last sentence; if chapter boundaries changed, recompute chapter from sentence index.
- Book removed/renamed: recent `bookId` not in `FEATURED_BOOKS` or mapping changed → skip auto-resume gracefully and show selection.
- Multiple devices: recent on another device newer than local → prefer server timestamp; write-through to local cache once resolved.
- PWA/offline: no network → use localStorage; avoid toasts that imply server validation.
- In-flight races: user selects a different book while auto-resume is fetching → cancel auto-resume (track a request token/isMounted flag), do not override user intent.
- Availability: level not available for last CEFR (e.g., only A1 exists) → downgrade to nearest available level and annotate toast.
- Timing/UI: ensure scroll happens only after DOM content for the selected book is rendered; guard with a retry loop (max ~1s) then give up silently.

### Performance considerations
- Do not block first paint. Show book grid immediately; if auto-resume triggers, switch state only after you have both metadata and position.
- LocalStorage-first: attempt fast `reading_position_${bookId}` based on a cached "lastBookId" key; then in background call `/api/reading-position/recent` to confirm/refresh.
- Add in-memory session cache for the last recent result to avoid multiple API hits when navigating within the session.
- Debounce/serialize recent API calls; never call more than once per mount.
- Set `Cache-Control: no-store` for the recent API while stabilizing; later consider short TTL edge cache (≤60s) for authenticated users.

### UX improvements
- Toast content: "Resuming The Necklace — Chapter 2, Sentence 45" with secondary line "Tap to start from beginning"; actions: [Start Over] [✕].
- Respect current playback state: if audio was playing at unload, auto-resume to paused with play-ready state; do not auto-play.
- Accessibility: toast should be focusable, ESC to dismiss, ARIA live="polite"; do not steal focus from readers using keyboards/switch devices.
- Mobile: account for safe areas; place toast below any top nav and avoid covering the first line of text.
- Settings: add a user preference "Auto-resume last book" (on by default) under Aa/Settings; store in localStorage.

### Code organization
- Extract a `useAutoResume()` hook under `hooks/` to encapsulate:
  - Source selection strategy (URL → memory → localStorage → API),
  - Cancellation/abort guard,
  - State outputs: `{shouldAutoResume, autoResumeBookId, savedPosition, onConsumed()}`.
- Create a `ResumeToast` component in `components/reading/` to keep `page.tsx` smaller.
- Centralize featured book metadata in a single module (e.g., `lib/featured-books.ts`) so both the API (`/api/reading-position/recent`) and the client import the same source of truth.

### Testing strategy
- Unit: mock `readingPositionService` and verify `useAutoResume()` resolves priority order, cancellation on user click, and clamping out-of-range positions.
- Integration (Playwright/Cypress):
  - Refresh within 7 days → toast shows, scroll to sentence, no modal.
  - Refresh after 8+ days → no auto-resume, selection visible.
  - Unauthenticated → localStorage recent path works.
  - Network error → falls back to localStorage; no console errors; toast suppressed if position unknown.
  - Race: click a different book before auto-resume resolves → selected book persists; no flicker.
- Performance: measure added time on mount; ensure API call doesn’t block TTI; ensure memory use stable.

### Concerns/risks
- Race conditions overriding user intent; mitigated via abort tokens and "consumed" flag.
- Position mismatch after content updates; mitigated via clamping and recomputing chapter from sentence index.
- Drift if scroll fires before DOM ready; mitigated via element polling with timeout and idempotent scroll.
- Server dependency during mount; mitigated via localStorage-first path.

### Priority order for implementation
1. Instrumentation & guardrails: add analytics events (auto_resume_started/succeeded/cancelled), add abort guards.
2. LocalStorage-first auto-resume (no API), toast UI, and settings toggle.
3. Server recent integration with 401 fallback; unify featured metadata source; API headers hardening.
4. Clamp/validation layer for saved positions and level availability.
5. Refactor into `useAutoResume` and `ResumeToast`; remove old modal path for auto-resumed flows.
6. Polish: accessibility, animations, safe areas, and metrics dashboards.