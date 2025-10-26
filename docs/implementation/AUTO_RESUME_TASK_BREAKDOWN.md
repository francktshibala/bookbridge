# Auto-Resume Implementation - Micro-Task Breakdown

**Date**: October 25, 2025
**Feature**: Netflix-Style Auto-Resume
**Approach**: Incremental development with testable checkpoints

---

## 📋 Task Tracking Legend

- [ ] Not started
- [IN PROGRESS] Currently working
- [✓] Completed and verified

---

## PHASE 1: Instrumentation & Guardrails

### Task 1.1: Add analytics event infrastructure
- [ ] **File**: `lib/analytics/auto-resume-events.ts` (NEW)
- [ ] Create event types: `auto_resume_started`, `auto_resume_succeeded`, `auto_resume_cancelled`
- [ ] Add helper functions: `trackAutoResumeStart()`, `trackAutoResumeSuccess()`, `trackAutoResumeCancel()`
- [ ] **Verify**: Events console.log when called (no actual analytics yet)

### Task 1.2: Add feature flag for dark launch
- [ ] **File**: `.env.local`
- [ ] Add: `NEXT_PUBLIC_ENABLE_AUTO_RESUME=true`
- [ ] **File**: `hooks/useAutoResume.tsx` (will create in Phase 2)
- [ ] Add early return if flag is false
- [ ] **Verify**: Can toggle feature on/off via env var

### Task 1.3: Add abort guard state
- [ ] **File**: `app/featured-books/page.tsx` (line ~670)
- [ ] Add state: `const [autoResumeAborted, setAutoResumeAborted] = useState(false);`
- [ ] Add ref: `const autoResumeInProgress = useRef(false);`
- [ ] **Verify**: State and ref accessible in component

### Task 1.4: Add manual book selection abort logic
- [ ] **File**: `app/featured-books/page.tsx` (lines 1772, 1817)
- [ ] In book card `onClick` handlers, add: `setAutoResumeAborted(true);`
- [ ] **Verify**: Clicking book card sets `autoResumeAborted` to true (use React DevTools)

### Task 1.5: Add abort lifecycle guards
- [ ] **File**: `app/featured-books/page.tsx`
- [ ] Set `autoResumeInProgress.current = true` at start of auto-resume
- [ ] Set `autoResumeInProgress.current = false` when complete/cancelled
- [ ] Add cleanup in useEffect return: clear timers/intervals on unmount
- [ ] Cancel auto-resume if URL param selection occurs mid-fetch
- [ ] **Verify**: Auto-resume properly cancels when component unmounts

### Task 1.6: Test Phase 1
- [ ] Console log when abort flag is set
- [ ] Verify no breaking changes to existing functionality
- [ ] **Checkpoint**: Phase 1 complete ✓

---

## PHASE 2: LocalStorage-First Auto-Resume (No API)

### Task 2.1: Create localStorage helper utilities
- [ ] **File**: `lib/utils/auto-resume-storage.ts` (NEW)
- [ ] Function: `getLastBookId(): string | null` - reads `bookbridge_last_book_id`
- [ ] Function: `setLastBookId(bookId: string): void` - writes to localStorage
- [ ] Function: `getLocalPosition(bookId: string): ReadingPosition | null`
- [ ] **Verify**: Can read/write to localStorage in browser console

### Task 2.2: Save last book ID on book selection
- [ ] **File**: `app/featured-books/page.tsx` (lines 1772, 1817)
- [ ] In book card `onClick`, add: `setLastBookId(book.id);`
- [ ] **Verify**: localStorage shows `bookbridge_last_book_id` after clicking book

### Task 2.2b: Persist lastBookId on actual reading activity
- [ ] **File**: `lib/services/reading-position.ts`
- [ ] Update `savePosition()` to also call `setLastBookId(bookId)`
- [ ] Update `loadPosition()` to set lastBookId when position found
- [ ] Handle deep links: save lastBookId when reading starts from URL
- [ ] **Verify**: lastBookId updates on every save/load, not just card clicks

### Task 2.3: Create basic useAutoResume hook (localStorage only)
- [ ] **File**: `hooks/useAutoResume.tsx` (NEW)
- [ ] Add SSR/hydration guard: `if (typeof window === 'undefined') return { shouldAutoResume: false, bookId: null }`
- [ ] Add feature flag check: `if (process.env.NEXT_PUBLIC_ENABLE_AUTO_RESUME !== 'true') return ...`
- [ ] Export interface: `AutoResumeResult { shouldAutoResume: boolean, bookId: string | null }`
- [ ] Read from localStorage: `getLastBookId()`
- [ ] Check if bookId exists in FEATURED_BOOKS array
- [ ] Return `{ shouldAutoResume: true, bookId }` if valid
- [ ] **Verify**: Hook only runs client-side and respects feature flag

### Task 2.4: Integrate useAutoResume hook in featured-books page
- [ ] **File**: `app/featured-books/page.tsx` (line ~690)
- [ ] Import and call: `const { shouldAutoResume, bookId } = useAutoResume();`
- [ ] Add useEffect to handle auto-resume:
  ```typescript
  useEffect(() => {
    if (shouldAutoResume && bookId && !autoResumeAborted) {
      const book = FEATURED_BOOKS.find(b => b.id === bookId);
      if (book) {
        setSelectedBook(book);
        setShowBookSelection(false);
      }
    }
  }, [shouldAutoResume, bookId]);
  ```
- [ ] **Verify**: Refreshing page auto-loads last book (no API call yet)

### Task 2.5: Create ResumeToast component
- [ ] **File**: `components/reading/ResumeToast.tsx` (NEW)
- [ ] Props: `{ isOpen, position: { chapter, sentence, completion }, onDismiss, onStartOver }`
- [ ] Basic UI with Neo-Classic theme CSS variables
- [ ] ESC key to dismiss
- [ ] ARIA live="polite"
- [ ] **Verify**: Toast renders with correct text when isOpen=true

### Task 2.6: Add toast state and logic
- [ ] **File**: `app/featured-books/page.tsx`
- [ ] Add state: `const [showResumeToast, setShowResumeToast] = useState(false);`
- [ ] Update position restore logic (line ~1110):
  - If auto-resumed, set `showResumeToast = true`
  - Add setTimeout to auto-dismiss after 3 seconds
- [ ] **Verify**: Toast appears on auto-resume and auto-dismisses

### Task 2.6b: Maintain playback state (no auto-play)
- [ ] **File**: `app/featured-books/page.tsx`
- [ ] On auto-resume, ensure `isPlaying` stays `false`
- [ ] Audio should be ready to play but paused
- [ ] Add check: do not call `handlePlaySequential()` on auto-resume
- [ ] **Verify**: Auto-resume loads to paused state, doesn't start playing automatically

### Task 2.7: Add "Start from Beginning" functionality
- [ ] **File**: `app/featured-books/page.tsx`
- [ ] Create function:
  ```typescript
  const startFromBeginning = async () => {
    if (selectedBook) {
      await readingPositionService.resetPosition(selectedBook.id);
      setCurrentSentenceIndex(0);
      setCurrentChapter(1);
      setShowResumeToast(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  ```
- [ ] Pass to ResumeToast component
- [ ] **Verify**: Clicking "Start Over" resets position to sentence 0

### Task 2.8: Add settings toggle for auto-resume
- [ ] **File**: `app/featured-books/page.tsx` (Settings Modal, line ~2095)
- [ ] Add state: `const [autoResumeEnabled, setAutoResumeEnabled] = useState(true);`
- [ ] Load from localStorage on mount
- [ ] Add toggle UI in settings modal
- [ ] Save to localStorage on change
- [ ] Update useAutoResume to respect this setting
- [ ] **Verify**: Toggle disables/enables auto-resume behavior

### Task 2.9: Add CSS animations
- [ ] **File**: `app/globals.css`
- [ ] Add keyframes:
  ```css
  @keyframes slide-down {
    from { opacity: 0; transform: translate(-50%, -20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
  .animate-slide-down {
    animation: slide-down 0.3s ease-out;
  }
  ```
- [ ] **Verify**: Toast animates smoothly when appearing

### Task 2.10: Test Phase 2 (localStorage-only auto-resume)
- [ ] Test: Refresh page → auto-loads last book
- [ ] Test: Toast shows with correct chapter/sentence
- [ ] Test: "Start Over" resets position
- [ ] Test: Toast auto-dismisses after 3 seconds
- [ ] Test: ESC key dismisses toast
- [ ] Test: Settings toggle disables auto-resume
- [ ] Test: Clicking different book before auto-resume completes → user selection wins
- [ ] **Checkpoint**: Phase 2 complete ✓

---

## PHASE 3: Server Integration (API + LocalStorage)

### Task 3.1: Create centralized featured books metadata
- [ ] **File**: `lib/featured-books.ts` (NEW)
- [ ] Export constant: `FEATURED_BOOKS_METADATA`
- [ ] Include all featured books with: `{ id, title, author, totalSentences }`
- [ ] **Verify**: Can import in both client and API routes

### Task 3.2: Update featured-books page to use centralized metadata
- [ ] **File**: `app/featured-books/page.tsx`
- [ ] Import: `import { FEATURED_BOOKS_METADATA } from '@/lib/featured-books';`
- [ ] Update FEATURED_BOOKS array to use centralized data
- [ ] **Verify**: Page still renders correctly

### Task 3.3: Update recent books API with all featured books
- [ ] **File**: `app/api/reading-position/recent/route.ts` (line 46)
- [ ] Import: `import { FEATURED_BOOKS_METADATA } from '@/lib/featured-books';`
- [ ] Replace hardcoded `featuredBooks` object with `FEATURED_BOOKS_METADATA`
- [ ] **Verify**: API returns correct metadata for all books

### Task 3.4: Enhance useAutoResume to call API in background
- [ ] **File**: `hooks/useAutoResume.tsx`
- [ ] Add API call to `readingPositionService.getRecentBooks(1)`
- [ ] Strategy: Try localStorage first (instant), then API in background
- [ ] If API returns newer position, update state
- [ ] Handle 401 gracefully (unauthenticated users)
- [ ] **Verify**: API called after localStorage check, doesn't block UI

### Task 3.5: Add in-memory session cache
- [ ] **File**: `lib/services/reading-position.ts`
- [ ] Add private property: `private recentBooksCache: RecentBook[] | null = null;`
- [ ] Add private property: `private cacheTimestamp: number = 0;`
- [ ] Update `getRecentBooks()` to check cache first (TTL: 60 seconds)
- [ ] **Verify**: Second call within 60s doesn't hit API (check Network tab)

### Task 3.6: Add Cache-Control header to API
- [ ] **File**: `app/api/reading-position/recent/route.ts`
- [ ] Add header: `Cache-Control: no-store` to response
- [ ] **Verify**: Response headers show no-store in Network tab

### Task 3.6b: Add Vary header for future caching
- [ ] **File**: `app/api/reading-position/recent/route.ts`
- [ ] Add header: `Vary: Authorization` to response
- [ ] Prevents cross-user CDN caching when caching enabled later
- [ ] **Verify**: Response headers show Vary: Authorization in Network tab

### Task 3.7: Handle API failures gracefully
- [ ] **File**: `hooks/useAutoResume.tsx`
- [ ] Wrap API call in try/catch
- [ ] On error, continue with localStorage result
- [ ] Never show error to user (silent fallback)
- [ ] Log to console for debugging
- [ ] **Verify**: Network failure doesn't break auto-resume

### Task 3.8: Add multi-device sync logic
- [ ] **File**: `hooks/useAutoResume.tsx`
- [ ] Compare timestamps: localStorage vs API
- [ ] Prefer newer timestamp
- [ ] Write server result to localStorage if newer
- [ ] **Verify**: Server position overrides stale localStorage

### Task 3.9: Test Phase 3 (API integration)
- [ ] Test: Auto-resume works when authenticated
- [ ] Test: Auto-resume falls back to localStorage when unauthenticated
- [ ] Test: Network failure doesn't break functionality
- [ ] Test: Multi-device sync picks newer position
- [ ] Test: API not called multiple times on same mount
- [ ] **Checkpoint**: Phase 3 complete ✓

---

## PHASE 4: Position Validation & Edge Cases

### Task 4.1: Add position clamping utility
- [ ] **File**: `lib/utils/position-validation.ts` (NEW)
- [ ] Function: `clampPosition(position: ReadingPosition, totalSentences: number): ReadingPosition`
- [ ] If `currentSentenceIndex >= totalSentences`, clamp to `totalSentences - 1`
- [ ] Recalculate completion percentage if clamped
- [ ] **Verify**: Out-of-range positions are corrected

### Task 4.2: Apply clamping in position restore
- [ ] **File**: `app/featured-books/page.tsx` (line ~1110)
- [ ] Import clamping utility
- [ ] Apply before setting state: `const validPosition = clampPosition(savedPosition, bundleData.totalSentences);`
- [ ] **Verify**: Saved position of sentence 500 in 100-sentence book clamps to 99

### Task 4.3: Add CEFR level availability check
- [ ] **File**: `hooks/useAutoResume.tsx`
- [ ] Check if saved CEFR level exists for book
- [ ] If not available, find nearest (A1 → A2 → B1)
- [ ] Update toast to show: "Resuming at A1 (A2 not available)"
- [ ] **Verify**: Book with only A1 falls back from saved A2 level

### Task 4.4: Handle removed/renamed books gracefully
- [ ] **File**: `hooks/useAutoResume.tsx`
- [ ] Check if `bookId` exists in FEATURED_BOOKS array
- [ ] If not found, return `{ shouldAutoResume: false }`
- [ ] Clear stale localStorage entry
- [ ] **Verify**: Removed book doesn't crash, shows book selection

### Task 4.5: Add DOM ready polling for scroll
- [ ] **File**: `app/featured-books/page.tsx` (line ~1134)
- [ ] Replace direct scroll with polling function:
  ```typescript
  const scrollToSentence = (index: number, maxRetries = 10) => {
    let retries = 0;
    const poll = setInterval(() => {
      const el = document.querySelector(`[data-sentence-index="${index}"]`);
      if (el || retries >= maxRetries) {
        clearInterval(poll);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      retries++;
    }, 100);
  };
  ```
- [ ] **Verify**: Scroll works even if DOM not ready immediately

### Task 4.6: Add PWA/offline detection
- [ ] **File**: `hooks/useAutoResume.tsx`
- [ ] Check `navigator.onLine` before API call
- [ ] If offline, skip API and use localStorage only
- [ ] Update toast text to not mention server sync when offline
- [ ] **Verify**: Offline mode works correctly

### Task 4.7: Test Phase 4 (validation)
- [ ] Test: Out-of-range sentence index is clamped
- [ ] Test: Unavailable CEFR level falls back gracefully
- [ ] Test: Removed book doesn't crash app
- [ ] Test: Scroll works when DOM loads slowly
- [ ] Test: Offline mode uses localStorage only
- [ ] **Checkpoint**: Phase 4 complete ✓

---

## PHASE 5: Code Refactoring & Cleanup

### Task 5.1: Finalize useAutoResume hook
- [ ] **File**: `hooks/useAutoResume.tsx`
- [ ] Add all logic from previous phases:
  - Priority order (URL → memory → localStorage → API)
  - Abort guards
  - Position validation
  - CEFR level fallback
  - Offline detection
- [ ] Export clean interface: `{ shouldAutoResume, bookId, savedPosition, isLoading }`
- [ ] Add JSDoc comments
- [ ] **Verify**: Hook is self-contained and reusable

### Task 5.2: Extract ResumeToast component fully
- [ ] **File**: `components/reading/ResumeToast.tsx`
- [ ] Move all toast-related logic from page.tsx
- [ ] Add accessibility features (ARIA, keyboard nav)
- [ ] Add mobile safe area adjustments
- [ ] **Verify**: Component works standalone

### Task 5.3: Remove old "Continue Reading" modal for auto-resume
- [ ] **File**: `app/featured-books/page.tsx` (line ~2290-2330)
- [ ] Keep modal ONLY for manual book selection
- [ ] Remove modal display when `autoResumeBookId` is set
- [ ] **Verify**: Modal only shows for manual selections, not auto-resume

### Task 5.4: Clean up unused state variables
- [ ] **File**: `app/featured-books/page.tsx`
- [ ] Review all state variables added during implementation
- [ ] Remove any that were replaced by hook
- [ ] Consolidate duplicates
- [ ] **Verify**: No unused state variables in component

### Task 5.5: Add TypeScript types
- [ ] **File**: `types/auto-resume.ts` (NEW)
- [ ] Define: `AutoResumeSource = 'url' | 'memory' | 'localStorage' | 'api';`
- [ ] Define: `AutoResumeResult`, `ResumeToastProps`
- [ ] Export all types
- [ ] **Verify**: No TypeScript errors

### Task 5.6: Test Phase 5 (refactored code)
- [ ] Test: All previous functionality still works
- [ ] Test: Code is cleaner and more maintainable
- [ ] Test: TypeScript has no errors
- [ ] **Checkpoint**: Phase 5 complete ✓

---

## PHASE 6: Polish & Analytics

### Task 6.1: Implement enhanced analytics tracking
- [ ] **File**: `lib/analytics/auto-resume-events.ts`
- [ ] Connect to actual analytics service (PostHog/Mixpanel)
- [ ] Track: `auto_resume_started` with:
  - source (url/memory/localStorage/api)
  - startTimestamp
- [ ] Track: `auto_resume_succeeded` with:
  - bookId, chapter, sentence
  - latencyToResume (ms from start to completion)
  - scrollSuccess (boolean - did sentence element exist?)
  - sentenceFound (boolean - was target sentence in DOM?)
- [ ] Track: `auto_resume_cancelled` with:
  - reason (user_click/unmount/error)
  - source (where it was cancelled from)
- [ ] Add custom header: `X-Resume-Latency` with time in ms
- [ ] **Verify**: Events appear in analytics dashboard with all fields

### Task 6.2: Add loading state polish
- [ ] **File**: `app/featured-books/page.tsx`
- [ ] Show skeleton loader during auto-resume
- [ ] Add smooth transition from loader to content
- [ ] **Verify**: No janky transitions

### Task 6.3: Mobile-specific adjustments
- [ ] **File**: `components/reading/ResumeToast.tsx`
- [ ] Add safe area padding: `padding-top: env(safe-area-inset-top);`
- [ ] Adjust position to avoid covering first line
- [ ] Test on iOS/Android
- [ ] **Verify**: Toast doesn't overlap with content on mobile

### Task 6.4: Accessibility audit
- [ ] Toast is keyboard navigable (Tab, ESC)
- [ ] ARIA live region announces to screen readers
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus management is correct
- [ ] **Verify**: Passes axe DevTools audit

### Task 6.5: Performance testing
- [ ] Measure time-to-interactive with auto-resume
- [ ] Ensure no jank in animations
- [ ] Check memory usage
- [ ] Profile React rendering
- [ ] **Verify**: Performance metrics acceptable

### Task 6.6: Create analytics dashboard
- [ ] **File**: `app/admin/analytics/auto-resume/page.tsx` (NEW)
- [ ] Show: Auto-resume success rate
- [ ] Show: Source breakdown (localStorage vs API)
- [ ] Show: Cancellation reasons
- [ ] Show: Average time saved
- [ ] **Verify**: Dashboard shows real data

### Task 6.7: Final testing (all scenarios)
- [ ] Authenticated user, recent book → auto-resume with toast
- [ ] Unauthenticated user → localStorage fallback works
- [ ] Offline → localStorage only
- [ ] No recent book → book selection shown
- [ ] Book read 8+ days ago → no auto-resume
- [ ] User clicks different book during auto-resume → user choice wins
- [ ] Removed book → graceful fallback
- [ ] Out-of-range position → clamped correctly
- [ ] Unavailable CEFR level → falls back to available
- [ ] Settings toggle disabled → no auto-resume
- [ ] **Checkpoint**: Phase 6 complete ✓

---

## PHASE 7: Documentation & Deployment

### Task 7.1: Update ARCHITECTURE_OVERVIEW.md
- [ ] **File**: `docs/implementation/ARCHITECTURE_OVERVIEW.md`
- [ ] Update "Reading Position Memory" section (line 199)
- [ ] Change status from "⚠️ BROKEN" to "✅ WORKING"
- [ ] Document the auto-resume feature
- [ ] Add code anchors for new hook and component
- [ ] **Verify**: Documentation is accurate

### Task 7.2: Create feature documentation
- [ ] **File**: `docs/features/AUTO_RESUME.md` (NEW)
- [ ] Document how it works
- [ ] Document settings toggle
- [ ] Document fallback behaviors
- [ ] Add troubleshooting section
- [ ] **Verify**: Documentation is clear and complete

### Task 7.3: Update UI_UX_TRANSFORMATION_PLAN.md
- [ ] Mark "Reading Position Memory" as COMPLETED
- [ ] Add completion date
- [ ] Document actual vs estimated effort
- [ ] **Verify**: Plan is updated

### Task 7.4: Run full build and test suite
- [ ] `npm run build` - no errors
- [ ] `npm run type-check` - no TypeScript errors
- [ ] `npm run lint` - no linting errors
- [ ] Test in production mode
- [ ] **Verify**: Everything passes

### Task 7.5: Create pull request
- [ ] Write detailed PR description
- [ ] Include before/after videos
- [ ] List all breaking changes (should be none)
- [ ] Request review from team
- [ ] **Verify**: PR is ready for review

### Task 7.6: Deploy to staging
- [ ] Deploy to staging environment
- [ ] Test all scenarios in staging
- [ ] Monitor analytics for errors
- [ ] Get user feedback
- [ ] **Verify**: Staging works perfectly

### Task 7.7: Production deployment
- [ ] Deploy to production
- [ ] Monitor analytics for first 24 hours
- [ ] Check error rates
- [ ] Verify user engagement increases
- [ ] **Checkpoint**: Feature live in production ✓

---

## 📊 Progress Tracking

**Overall Progress**: 0/95 tasks completed (0%)

### Phase Completion:
- [ ] Phase 1: Instrumentation (0/4 tasks)
- [ ] Phase 2: LocalStorage Auto-Resume (0/10 tasks)
- [ ] Phase 3: API Integration (0/9 tasks)
- [ ] Phase 4: Validation (0/7 tasks)
- [ ] Phase 5: Refactoring (0/6 tasks)
- [ ] Phase 6: Polish (0/7 tasks)
- [ ] Phase 7: Documentation (0/7 tasks)

---

## 🎯 Quick Start Guide

**To begin implementation:**

1. Start with Phase 1, Task 1.1
2. Complete each task in order
3. Mark tasks as [✓] when verified
4. Run tests after each phase checkpoint
5. Don't skip tasks (each builds on previous)
6. Update progress tracking as you go

**Estimated Timeline:**
- Phase 1: 1 hour
- Phase 2: 4-6 hours
- Phase 3: 3-4 hours
- Phase 4: 2-3 hours
- Phase 5: 2-3 hours
- Phase 6: 3-4 hours
- Phase 7: 2 hours

**Total: ~20-25 hours of development**

---

**Ready to start?** Begin with Phase 1, Task 1.1!
