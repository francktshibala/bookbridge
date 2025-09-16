## Subject: Auto-scroll Debugging – Maintain Perfect First-Page Behavior Across All Pages

### Summary
We need targeted fixes to preserve our “perfect” first-page auto-scroll behavior on every subsequent page (chunk) transition, while eliminating console errors that may disrupt timing. Current harmony is good but drops during page changes due to scroll resets, layout timing, and occasional fetch errors.

### App Context
- **Stack**: React/Next.js
- **Reading UI**: Text in a content container marked with `[data-content="true"]`
- **Audio**: Progressive/instant TTS with word-level timing and sentence events
- **Auto-scroll**: Sentence-driven auto-scroll intended to place the active sentence at a comfortable viewport position while audio plays

### Current Behavior
- **First page**: Scrolling is smooth and precisely aligned with audio.
- **Subsequent pages**: Sometimes the page doesn’t position the first sentence correctly, or scroll jumps are delayed/duplicated. The experience degrades compared to the first page.
- **Console**: Occasional "Failed to fetch" errors during content fetches and warning logs from calibrator/scroll code. These correlate with degraded scroll harmony.

### Goals
1. Maintain the first-page’s “perfect” auto-scroll behavior after every page (chunk) transition.
2. Remove timing/scroll conflicts during transitions and resume steady sentence-following afterward.
3. Prevent console errors (especially "Failed to fetch") from disturbing scroll timing; introduce graceful handling and retries.
4. Keep UX smooth on both mobile and desktop, accounting for fixed bottom controls.

### Key Issues to Solve
- **Page transition scroll reset**: On new pages, initial placement of sentence 0 (or the first active sentence) can be off by a noticeable margin. We need deterministic, immediate placement, followed by normal sentence tracking.
- **Scheduling/order of operations**: Audio play state toggles, content updates, and scroll calls sometimes race. We need a robust order: content ready → initial placement → sentence-following with correct delay.
- **Viewport compensation**: On mobile, a fixed bottom bar (`.mobile-audio-controls`) reduces visible space. We must consistently compensate for it.
- **Fetch instability**: Intermittent "Failed to fetch" when loading simplified content or next chunk causes scroll jitter or premature scroll calls.
- **Console warnings**: Timing/calibration logs and errors should not appear during normal operation.

### Architecture Notes (What’s in use now)
- **Content container**: Single scrolling surface; primary text lives under an element with `[data-content="true"]`.
- **Auto-scroll orchestration**: Single-source-of-truth sentence-based scrolling (coarse placement) with optional word-level smoothing. The scroll system should be the only component issuing scroll commands.
- **Mobile bottom bar**: `.mobile-audio-controls` is fixed and must be considered during positioning.

### Observable Constraints
- Do not scroll if the active sentence is already within a comfortable viewport band (hysteresis to reduce jitter).
- Cap per-event scroll distance to avoid large jumps.
- Respect user-initiated upward scrolling by temporarily pausing auto-scroll and resuming gracefully.

### Files You’ll Work With
- `app/library/[id]/read/page.tsx` – page composition, audio lifecycle, rendering container, and orchestration
- `hooks/useSentenceAnchoredAutoScroll.tsx` – sentence-based auto-scroll logic and timing
- `lib/text-processor.ts` – sentence splitting used for mapping indices
- `lib/audio/TimingCalibrator.ts` – optional timing calibration helper
- If present: `components/audio/AutoScrollHandler.tsx` – any page-level auto-scroll handler component

### Required Deliverables
1. Code-level fixes to maintain perfect first-page behavior on every page:
   - Deterministic initial placement on new pages (immediate positioning of the first active sentence).
   - Reliable scheduling that avoids race conditions (content/DOM readiness → initial placement → sentence follow).
   - Consistent top/bottom padding and fixed-controls compensation.
2. Resilient handling for fetch errors:
   - Add minimal retry/backoff for content fetch.
   - Avoid triggering auto-scroll until content is ready; ensure scroll calculations use the actual rendered content height.
3. Clean console:
   - Remove/guard noisy logs.
   - Prevent calibrator and scheduling errors from surfacing (with safe fallbacks).
4. Maintain the 300ms audio compensation (or propose a strictly better alternative) while ensuring frame-aligned smoothness.

### Constraints/Preferences
- Prefer fixed 300ms compensation which previously outperformed adaptive schemes. If you propose improvements, keep them conservative and measurable. 
- Trigger scrolls via `requestAnimationFrame` after any timers to align with paint.
- Mobile and desktop must both work. Account for `.mobile-audio-controls` height when placing targets.

### What to Change (Guidance)
- In `useSentenceAnchoredAutoScroll.tsx`:
  - On page change, jump immediately to the top of `[data-content="true"]` with a small top margin, then follow sentences.
  - Use rAF-aligned scheduling after a short, consistent delay (~300ms) once content is settled.
  - Enforce a viewport band (e.g., 35%–55%) and forward-only scrolling unless initial placement.
  - Add robust cleanup for timers and any rAF state between page changes.
- In `app/library/[id]/read/page.tsx`:
  - Ensure the sequence for auto-advance: set content → allow layout settle → initial placement → resume play.
  - Gate sentence-following until content mount is confirmed and heights are stable.
  - Compensate for `.mobile-audio-controls`.
- In fetch paths (simplified content):
  - Introduce a single retry with small delay; on failure, keep original content and do not trigger auto-scroll until text is present.

### Reproduction Steps
1. Load any enhanced book; start audio on page 1 – observe perfect behavior.
2. Auto-advance to page 2; verify immediate correct placement of the first active sentence and smooth subsequent sentence-following.
3. Toggle simplified/original modes mid-play; ensure no scroll jitter and no console errors.
4. Test on mobile (narrow viewport) and desktop; verify bottom control compensation.

### CRITICAL REQUIREMENT – Please Report Back
Before implementing, provide a brief plan listing:
- Files you will modify (full paths)
- Specific changes per file (what code sections you’ll add/modify/remove)
- Rollback strategy

After implementation, report:
- Complete list of modified files
- Summary of changes in each file
- Key code blocks added/removed
- Expected improvement and why
- Verification steps and any logs/metrics to review

### Acceptance Criteria
- First-page behavior is preserved across all subsequent pages without regressions.
- No console errors or noisy warnings during normal reading and auto-advance.
- Smooth sentence-following with minimal jitter; scrolls only when needed.
- Works consistently on mobile and desktop, including with fixed bottom controls.

# GPT-5 Auto-Scroll Debug Request

## Problem Summary
BookBridge ESL reading platform has auto-scroll/voice harmony that works perfectly on the first page (10/10 harmony), but fails on page transitions with console errors.

## Current State
- **First page**: Perfect voice-to-scroll synchronization
- **Page transitions**: Auto-scroll doesn't reset to top of new page
- **Console error**: `TypeError: Failed to fetch` (call stack depth 7)
- **Implementation**: React hook with TimingCalibrator for adaptive timing

## Technical Context

### Core Architecture
- **Audio system**: Chunk-based audio with sentence-level timing
- **Auto-scroll**: `useSentenceAnchoredAutoScroll` hook with TextProcessor integration
- **Page transitions**: Auto-advance between chunks triggers text changes
- **Calibration**: TimingCalibrator learns optimal timing offsets

### Key Files
1. `hooks/useSentenceAnchoredAutoScroll.tsx` - Main auto-scroll logic
2. `lib/audio/TimingCalibrator.ts` - Adaptive timing calibration
3. `components/audio/InstantAudioPlayer.tsx` - Audio playback control

### Current Implementation Issues
1. **Page transition detection**: `pageJustChangedRef.current = true` when text changes
2. **Scroll reset logic**: Should scroll to top of content on page change
3. **State management**: Need to reset sentence tracking between pages
4. **Error handling**: TimingCalibrator causing "Failed to fetch" errors

## What Works
```typescript
// First page behavior (perfect):
- Conservative timing calibration (500-800ms bounds)
- TextProcessor sentence splitting
- DOM Range-based positioning
- Smooth scroll with hysteresis
```

## What Fails
```typescript
// Page transition behavior (broken):
- Scroll doesn't reset to top of new content
- TimingCalibrator throws fetch errors
- State variables don't properly reset
- Subsequent pages lose harmony
```

## Code Snippets

### Page Change Detection
```typescript
if (text !== lastTextRef.current) {
  // Text change detected - new page
  sentencesRef.current = sentences;
  lastTextRef.current = text;
  lastSentenceRef.current = -1;
  pageJustChangedRef.current = true; // Should trigger reset
}
```

### Scroll Reset Logic (Current)
```typescript
if (pageJustChangedRef.current) {
  // Force scroll to top of content
  const contentRect = contentEl.getBoundingClientRect();
  const targetY = contentRect.top + window.scrollY - window.innerHeight * 0.15;
  window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
  // Reset state...
}
```

### Error Source (Suspected)
```typescript
// TimingCalibrator localStorage access
calibratorRef.current.getOptimalOffset(bookId) // Throws "Failed to fetch"
calibratorRef.current.recordSample(expected, actual) // May cause errors
```

## Specific Questions for GPT-5

1. **Root cause analysis**: What's causing the "Failed to fetch" TypeError in TimingCalibrator?

2. **Page transition fix**: Why isn't the scroll resetting to top on page changes despite the logic?

3. **State management**: What's the correct pattern for resetting all auto-scroll state between pages?

4. **Error prevention**: How to make TimingCalibrator more robust or eliminate the errors?

5. **Architecture review**: Is there a simpler approach that maintains the perfect first-page behavior across all pages?

## Expected Outcome
- All pages behave like the perfect first page
- Smooth transitions with immediate scroll to top of new content
- No console errors
- Maintained 10/10 voice-to-scroll harmony across all pages

## Current Codebase State
- Branch: `main`
- Recent changes: Added TimingCalibrator integration with conservative bounds
- Error handling: Added try-catch blocks (didn't resolve core issue)
- User feedback: "First page excellent, transitions broken"

## Priority
**High** - This affects core reading experience for ESL learners. First page proves the concept works; need consistent behavior across all pages.