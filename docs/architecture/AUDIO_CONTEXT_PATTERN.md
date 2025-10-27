# AudioContext Pattern - Single Source of Truth

## Overview

AudioContext implements the Single Source of Truth (SSoT) pattern for all book selection, audio playback, and reading state in the BookBridge application.

## Core Principles

### 1. Single Owner
**AudioContext owns:**
- All book/level/content mode selection state
- All bundle data fetching and caching
- All loading/error state transitions
- All audio playback coordination

**Pages/Components do NOT:**
- Fetch book or bundle data
- Manage loading/error states
- Clear or modify context-owned state
- Handle race conditions directly

### 2. State Machine
```typescript
type LoadState = 'idle' | 'loading' | 'ready' | 'error';
```

**Valid Transitions:**
- `idle` → `loading` (user selects book)
- `loading` → `ready` (data loaded successfully)
- `loading` → `error` (fetch failed)
- `ready` → `loading` (user changes level)
- `error` → `loading` (user retries)

**Prevents Invalid States:**
- Cannot be `loading=true` + `error!=null`
- Cannot have `bundleData` without `selectedBook`
- Cannot be `ready` without `bundleData`

### 3. Request ID Pattern (Race Condition Prevention)
```typescript
const loadBookData = async (book, level, mode) => {
  const reqId = crypto.randomUUID();
  currentRequestIdRef.current = reqId;

  // Guard before each async operation
  if (currentRequestIdRef.current !== reqId) {
    return; // Stale request - abort silently
  }

  // Guard before state updates
  if (currentRequestIdRef.current === reqId) {
    setStateSafely(newData);
  }
};
```

**Prevents:**
- Stale responses overwriting newer data
- Race conditions from rapid user actions
- Inconsistent state from concurrent requests

### 4. Dispatch Pattern
Pages dispatch actions instead of managing state:

```typescript
// ❌ BAD: Direct state mutation
const handleClick = () => {
  setSelectedBook(book);
  setLoading(true);
  fetchData();
};

// ✅ GOOD: Dispatch to context
const handleClick = async () => {
  await contextSelectBook(book);
};
```

## API Reference

### State (Read-Only)
```typescript
interface AudioContextState {
  // Book Selection
  selectedBook: FeaturedBook | null;
  cefrLevel: CEFRLevel;
  contentMode: ContentMode;

  // Data
  bundleData: RealBundleApiResponse | null;
  availableLevels: { [key: string]: boolean };
  currentBookAvailableLevels: string[];

  // Load State Machine
  loadState: LoadState;
  loading: boolean; // Computed: loadState === 'loading'
  error: string | null;

  // Audio Playback (read-only)
  isPlaying: boolean;
  currentSentenceIndex: number;
  currentChapter: number;
  playbackSpeed: number;
}
```

### Actions (Dispatch)
```typescript
// Book/Level Selection
await selectBook(book: FeaturedBook, initialLevel?: CEFRLevel)
await switchLevel(newLevel: CEFRLevel)
await switchContentMode(mode: ContentMode)

// Audio Playback
await play(sentenceIndex?: number)
pause()
resume()
seek(sentenceIndex: number)
setSpeed(speed: number)

// Chapter Navigation
nextChapter()
previousChapter()
jumpToChapter(chapter: number)

// Cleanup
unload()
```

## Usage Patterns

### Page Integration
```typescript
export default function MyPage() {
  const {
    // Read state
    selectedBook,
    bundleData,
    loadState,
    error,

    // Dispatch actions
    selectBook,
    switchLevel,
    play,
    pause
  } = useAudioContext();

  // Early return if not ready
  if (!selectedBook || loadState !== 'ready' || !bundleData) {
    return <LoadingSpinner />;
  }

  // Page-local side effects only
  useEffect(() => {
    // ✅ OK: Scroll to position
    scrollToSentence(currentSentenceIndex);

    // ✅ OK: Show toast
    toast.success('Book loaded!');

    // ❌ BAD: Fetch data
    // fetch('/api/books'); // Never do this!

    // ❌ BAD: Mutate context state
    // setBundleData(null); // Never do this!
  }, [bundleData]);

  return (
    <div>
      <button onClick={() => selectBook(book)}>
        Select Book
      </button>
      <button onClick={() => switchLevel('A2')}>
        Switch to A2
      </button>
    </div>
  );
}
```

### Telemetry
AudioContext emits telemetry events for debugging:

```typescript
// Event types
type TelemetryEvent =
  | 'load_started'
  | 'load_completed'
  | 'load_failed'
  | 'stale_apply_prevented';

// Example log
console.log('🔄 [AudioContext] load_started', {
  bookId: 'the-necklace',
  level: 'A2',
  requestId: 'abc123',
  timestamp: '2025-10-27T...'
});
```

## Benefits

### 1. State Survives Navigation
- AudioContext lives in `app/layout.tsx` (above page boundary)
- Audio keeps playing when navigating between pages
- Enables Global Mini Player feature

### 2. No Race Conditions
- RequestId pattern prevents stale updates
- State machine prevents invalid states
- Telemetry logs all transitions

### 3. Easier Testing
- Single code path for state changes
- Mock `useAudioContext()` in tests
- State changes are predictable

### 4. Better Performance
- Single data fetch (not per-page)
- Cached in context between renders
- Reduced bundle size (no duplicate logic)

## Migration Guide

### Before (Page-Scoped State)
```typescript
// 👎 OLD: Each page manages its own state
const [selectedBook, setSelectedBook] = useState(null);
const [loading, setLoading] = useState(false);
const [bundleData, setBundleData] = useState(null);

useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    const data = await fetch('/api/books');
    setBundleData(data);
    setLoading(false);
  };
  loadData();
}, [selectedBook]);
```

### After (Context-Scoped State)
```typescript
// 👍 NEW: Read from context, dispatch actions
const {
  selectedBook,
  bundleData,
  loadState,
  selectBook
} = useAudioContext();

// No useEffect needed - context handles fetching!

// Just dispatch when user acts
const handleClick = () => selectBook(book);
```

## Common Pitfalls

### ❌ Don't Fetch in Pages
```typescript
// BAD: Page fetches data
useEffect(() => {
  fetch('/api/books').then(setBundleData);
}, []);
```

### ❌ Don't Clear Context State
```typescript
// BAD: Page clears context state
useEffect(() => {
  return () => setBundleData(null);
}, []);
```

### ❌ Don't Bypass Actions
```typescript
// BAD: Direct state mutation
onClick={() => setBundleData(newData)}

// GOOD: Dispatch action
onClick={() => selectBook(book)}
```

### ✅ Do Read and Dispatch
```typescript
// GOOD: Read state, dispatch actions
const { bundleData, selectBook } = useAudioContext();

if (!bundleData) {
  return <Empty />;
}

return (
  <button onClick={() => selectBook(book)}>
    {bundleData.title}
  </button>
);
```

## Related Patterns

- **State Machine:** Enforces valid state transitions
- **Request ID:** Prevents race conditions
- **Dispatch Pattern:** Actions instead of setters
- **SSoT:** Single owner for each piece of state

## See Also

- [Phase 1 Completion Report](./PHASE_1_COMPLETION_REPORT.md)
- [Featured Books Refactor Plan](../implementation/FEATURED_BOOKS_REFACTOR_PLAN.md)
- [AudioContext Implementation](../../contexts/AudioContext.tsx)
