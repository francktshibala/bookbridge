# Global Mini Player - Issue Investigation & Fix Plan

## Issues Identified

### Issue 1: Back Button Loop on Reading Page ⚠️ CRITICAL
**Problem:** Clicking back button on `/featured-books` reading view causes page to stay stuck
**Root Cause:**
- Back button (line 1642-1647) sets `selectedBook = null` and `showBookSelection = true`
- Sync effect (line 658-664) detects `globalSelectedBook` still exists
- Effect immediately re-sets `selectedBook` and `showBookSelection = false`
- User stays stuck on reading view

**Fix Strategy:**
- When back button clicked, clear BOTH local state AND global context
- Add `unloadBook()` call to properly clear audio
- This will show books grid and stop audio

---

### Issue 2: Position Not Restored on Refresh ⚠️ CRITICAL
**Problem:** Page refresh causes audio to start from beginning instead of saved position
**Root Cause:**
- `restorePosition()` (line 530-558) only sets STATE variables
- Does NOT seek audio manager to saved position
- Audio manager starts playing from beginning of bundle

**Fix Strategy:**
- After restoring state, call `audioManagerRef.current?.seekToSentence(savedPosition.currentSentenceIndex)`
- Need to ensure audio manager is initialized before seeking
- Add delay or promise to wait for audio ready

---

### Issue 3: Level Switching on Navigation ⚠️ HIGH
**Problem:** Navigating away and back loads different CEFR level
**Root Cause:**
- `restorePosition()` sets `cefrLevel` from saved position (line 545)
- BUT this happens AFTER `loadBook()` already loaded bundles
- loadBook uses default level or parameter, not saved level
- Restored level state doesn't match loaded bundles

**Fix Strategy:**
- loadBook should check for saved position FIRST
- Use saved level from position when available
- Only use default level if no saved position exists

---

## Fix Order (One at a Time)

### ✅ Fix 1: Back Button Loop (Do First)
**File:** `app/featured-books/page.tsx`
**Change:** Update back button onClick to call `unloadBook()` from global context
**Impact:** Properly clears audio, returns to books grid
**Test:** Click back button on reading page → should show books grid, audio stops

### ✅ Fix 2: Position Restoration (Do Second)
**File:** `contexts/AudioContext.tsx`
**Change:** Add audio seeking after state restoration in `restorePosition()`
**Impact:** Audio resumes from saved sentence, not beginning
**Test:** Refresh page while audio playing → should resume from same position

### ✅ Fix 3: Level Persistence (Do Third)
**File:** `contexts/AudioContext.tsx`
**Change:** Check saved position for level BEFORE loading bundles
**Impact:** Always loads correct CEFR level user was reading
**Test:** Switch levels, navigate away, return → should restore same level

---

## Implementation Notes

### Fix 1 Implementation
```typescript
// In featured-books/page.tsx
// Import unloadBook from context
const { ..., unloadBook } = useAudioContext();

// Update back button onClick:
onClick={() => {
  unloadBook(); // Clear global context
  setShowBookSelection(true);
  setSelectedBook(null);
}}
```

### Fix 2 Implementation
```typescript
// In AudioContext.tsx restorePosition()
if (savedPosition) {
  // Set all state...
  setCurrentSentenceIndex(savedPosition.currentSentenceIndex);
  // ... other state

  // NEW: Seek audio to saved position
  if (audioManagerRef.current) {
    await audioManagerRef.current.seekToSentence(savedPosition.currentSentenceIndex);
  }
}
```

### Fix 3 Implementation
```typescript
// In AudioContext.tsx loadBook()
const loadBook = async (book: FeaturedBook, level?: string) => {
  // NEW: Check for saved position first
  const savedPosition = await readingPositionService.loadPosition(book.id);
  const targetLevel = savedPosition?.cefrLevel || level || 'A1';

  // Use targetLevel instead of level parameter
  const endpoint = getBookApiEndpoint(book.id, targetLevel);
  // ... rest of loading
}
```

---

## Testing Checklist

After each fix:
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] Manual test passes
- [ ] Commit with clear message
- [ ] User confirms fix works
