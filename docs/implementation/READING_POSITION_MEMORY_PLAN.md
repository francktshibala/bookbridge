# Reading Position Memory - Implementation Plan

**Feature**: Session Persistence for Reading Position
**Developer**: Claude Code
**Start Date**: 2025-10-23
**Status**: Planning

---

## 🎯 Goal

Create a Netflix-style "resume from where you left off" experience that remembers:
- Exact sentence/chunk position
- Audio timestamp (if playing)
- Scroll position
- Playback speed
- Selected voice
- Chapter number
- CEFR level
- Content mode (simplified/original)

---

## 📋 Requirements Analysis

### What We Need to Track

| Data Point | Type | Purpose | Storage |
|------------|------|---------|---------|
| `bookId` | string | Identify which book | Both |
| `sentenceIndex` | number | Exact sentence position | Both |
| `chunkIndex` | number | Current page/chunk | Both |
| `audioTimestamp` | number | Audio playback position (seconds) | Both |
| `scrollPosition` | number | Scroll offset (pixels) | localStorage only |
| `playbackSpeed` | number | Audio speed (0.5-2.0) | Both |
| `selectedVoice` | string | Voice ID | Both |
| `chapter` | number | Chapter number | Both |
| `cefrLevel` | string | CEFR level (A1-C2) | Both |
| `contentMode` | string | 'simplified' or 'original' | Both |

### Storage Strategy

1. **localStorage** (Immediate)
   - Fast, synchronous
   - Works offline
   - Single-device only
   - Key format: `reading_position_${bookId}`

2. **Database** (Sync)
   - Cross-device support
   - Persistent
   - Requires authentication
   - Table: `reading_positions`

---

## 🏗️ Architecture

### Components to Create

1. **Hook**: `hooks/useReadingPosition.ts`
   - Manages position state
   - Auto-save every 5 seconds
   - Save on page unload/visibility change
   - Load position on mount

2. **Component**: `components/reading/ResumeToast.tsx`
   - Shows "Resuming from Chapter X, Sentence Y"
   - Provides "Start from beginning" option
   - Auto-dismisses after 5 seconds

3. **Integration Points**:
   - `/app/library/[id]/read/page.tsx` - Main reading page
   - `/app/featured-books/page.tsx` - Featured books reader

### Existing Infrastructure (DO NOT MODIFY)

✅ Already exists:
- `lib/services/reading-position.ts` - Service layer (complete)
- `prisma/schema.prisma` - ReadingPosition model (complete)
- `scripts/create-reading-positions-table.js` - DB setup (complete)

---

## ✅ DO's

### Implementation
1. ✅ **Use existing service**: Import and use `readingPositionService` from `lib/services/reading-position.ts`
2. ✅ **Auto-save frequently**: Save every 5 seconds during active reading
3. ✅ **Save on critical events**:
   - Page unload (`beforeunload` event)
   - Tab switch (`visibilitychange` event)
   - Component unmount
   - Manual navigation
4. ✅ **Show user feedback**: Toast notification when resuming
5. ✅ **Provide user control**: "Start from beginning" option
6. ✅ **Smooth scroll**: Animate scroll to saved position
7. ✅ **Validate positions**: Ensure chunk/sentence indices are within bounds
8. ✅ **Handle edge cases**:
   - Deleted books
   - Invalid positions (out of range)
   - Unauthenticated users (localStorage only)
   - Network failures (graceful degradation)

### User Experience
1. ✅ **Be transparent**: Show what chapter/sentence resuming to
2. ✅ **Be quick**: Load and apply position within 500ms
3. ✅ **Be forgiving**: If position invalid, start from beginning silently
4. ✅ **Be consistent**: Save position across all navigation methods

---

## ❌ DON'Ts

### Implementation
1. ❌ **Don't create new database tables** - Use existing `reading_positions`
2. ❌ **Don't modify the service layer** - It's complete and tested
3. ❌ **Don't create new API routes** - Existing `/api/reading-position/[bookId]` works
4. ❌ **Don't save too frequently** - Respect 5-second throttle to avoid DB overload
5. ❌ **Don't block rendering** - Load position asynchronously
6. ❌ **Don't assume authentication** - Always have localStorage fallback
7. ❌ **Don't break existing code** - The reading page already has basic localStorage (line 171)

### User Experience
1. ❌ **Don't auto-resume without notification** - Always show toast
2. ❌ **Don't force resume** - Provide "Start from beginning" option
3. ❌ **Don't show errors** - Gracefully degrade to beginning if position invalid
4. ❌ **Don't save empty positions** - Only save if user has read something

---

## 🔧 Implementation Steps

### Step 1: Create `useReadingPosition` Hook
**File**: `hooks/useReadingPosition.ts`

**Purpose**: Wrap the existing service with React hooks pattern

**Features**:
- Load position on mount
- Auto-save every 5 seconds
- Save on unload/visibility change
- Provide `savePosition()` and `resetPosition()` methods

**Dependencies**:
- `lib/services/reading-position.ts` (existing)
- React hooks: `useEffect`, `useCallback`, `useRef`, `useState`

---

### Step 2: Create Resume Toast Component
**File**: `components/reading/ResumeToast.tsx`

**Purpose**: Notify user when resuming from saved position

**Features**:
- Show chapter and sentence info
- "Start from beginning" button
- Auto-dismiss after 5 seconds
- Accessible (screen reader friendly)

**UI Specs**:
- Position: Top-center, fixed
- Animation: Slide down from top
- Colors: Theme-aware (use CSS variables)
- Mobile responsive

---

### Step 3: Integrate into Main Reading Page
**File**: `app/library/[id]/read/page.tsx`

**Changes**:
1. Import `useReadingPosition` hook
2. Load position on mount
3. Apply position (scroll + state)
4. Show resume toast
5. Save position on chunk navigation
6. Save position every 5 seconds

**Existing Code to Preserve**:
- Lines 169-172: Basic localStorage (will be replaced by hook)
- Lines 289-316: `loadReadingPosition()` function (will be enhanced)

---

### Step 4: Integrate into Featured Books Page
**File**: `app/featured-books/page.tsx`

**Changes**: Same as Step 3

---

### Step 5: Testing Checklist

**Functional Tests**:
- [ ] Position saves when navigating away
- [ ] Position restores after page refresh (F5)
- [ ] Position persists after browser close/reopen
- [ ] Works across different books (no cross-contamination)
- [ ] Handles invalid positions gracefully
- [ ] Works for unauthenticated users (localStorage only)
- [ ] Works for authenticated users (DB sync)

**Edge Cases**:
- [ ] Book deleted: Shows error, doesn't crash
- [ ] Position beyond book length: Resets to beginning
- [ ] Negative position: Resets to beginning
- [ ] Network offline: Falls back to localStorage
- [ ] Multiple tabs open: Last save wins (acceptable)

**Cross-Browser**:
- [ ] Chrome/Edge (Chromium)
- [ ] Safari
- [ ] Firefox
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Performance**:
- [ ] No memory leaks (check DevTools)
- [ ] Save throttling works (max 1 save per 5 seconds)
- [ ] Page load time <3s (no regression)

---

## 🚨 Known Limitations

1. **Multiple Tabs**: If user has same book open in multiple tabs, last save wins
   - **Why**: Complex to implement tab sync without WebSockets
   - **Future Fix**: Broadcast Channel API or SharedWorker

2. **Offline Sync**: Positions saved offline don't sync to DB until online
   - **Why**: No background sync implemented yet
   - **Future Fix**: Service Worker background sync

3. **Scroll Position Accuracy**: Scroll might be slightly off if window size changed
   - **Why**: Pixel-based scroll doesn't account for layout changes
   - **Future Fix**: Use sentence ID + offset instead

---

## 📊 Success Metrics

### Must Have (P0)
- ✅ Position saves reliably (99% success rate)
- ✅ Position restores on page refresh
- ✅ Toast notification shows on resume
- ✅ "Start from beginning" option works

### Should Have (P1)
- ✅ Cross-device sync (for authenticated users)
- ✅ Works offline (localStorage fallback)
- ✅ No performance regression

### Nice to Have (P2)
- ⬜ Smooth scroll animation to saved position
- ⬜ Auto-resume audio playback (if was playing)
- ⬜ Multiple reading positions per book (bookmarks)

---

## 🎓 Best Practices & Patterns

### 1. Separation of Concerns
```
Service Layer (lib/services/reading-position.ts)
    ↓ provides API
Hook Layer (hooks/useReadingPosition.ts)
    ↓ provides React integration
Component Layer (page.tsx)
    ↓ uses hook
```

### 2. Progressive Enhancement
```
Start: No position tracking
→ Add: localStorage (works immediately)
→ Add: DB sync (works when authenticated)
→ Add: Cross-device (works when online)
```

### 3. Error Handling Pattern
```typescript
try {
  await savePosition(data);
} catch (error) {
  console.warn('Save failed, but localStorage has it');
  // Don't show error to user - graceful degradation
}
```

### 4. Ref Pattern for Cleanup
```typescript
const currentPositionRef = useRef<Position | null>(null);

// Update ref on every change
currentPositionRef.current = newPosition;

// Use ref in cleanup
useEffect(() => {
  return () => {
    if (currentPositionRef.current) {
      saveToLocalStorage(currentPositionRef.current);
    }
  };
}, []);
```

---

## 🔗 References

- Original Guide: `/COLLABORATOR_IMPLEMENTATION_GUIDE.md`
- Existing Service: `/lib/services/reading-position.ts`
- Database Schema: `/prisma/schema.prisma` (lines 361-395)
- Main Reading Page: `/app/library/[id]/read/page.tsx`
- Featured Books: `/app/featured-books/page.tsx`

---

## 📝 Next Steps

1. ✅ Review this plan
2. ⬜ Create `useReadingPosition` hook
3. ⬜ Create `ResumeToast` component
4. ⬜ Integrate into reading pages
5. ⬜ Test thoroughly
6. ⬜ Document implementation (what was built, challenges, lessons)
7. ⬜ Create PR with preview URL

---

**Ready to proceed?** Awaiting approval to start implementation.
