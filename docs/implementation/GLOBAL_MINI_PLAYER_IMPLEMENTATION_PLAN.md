# Global Mini Player - Implementation Plan

**Feature**: Persistent Audio Context + Spotify-Style Mini Player
**Priority**: Critical Foundation (Required before Reading Position Memory)
**Complexity**: High (Architectural change)
**Estimated Time**: 3-4 days
**Status**: Planning

---

## 🎯 Executive Summary

### Problem We're Solving

The current audio architecture has **page-scoped state** that gets destroyed on navigation/refresh, making it impossible to:
- Resume playback after page refresh
- Browse other pages while audio continues
- Maintain playback state across the app

**Current Architecture (Broken)**:
```
FeaturedBooksPage Component (destroyed on refresh)
└── audioManagerRef (dies on unmount)
    └── State (isPlaying, currentSentenceIndex, currentBundle)
        └── Control Bar (dies with page)
```

**New Architecture (Like Podcasts)**:
```
App Layout (never destroyed)
└── GlobalAudioContext
    ├── BundleAudioManager (singleton)
    ├── Global State (persists across navigation)
    ├── GlobalMiniPlayer (always visible when active)
    └── Used by all pages
```

### End Result

Users can:
1. ✅ Start reading a book on `/featured-books`
2. ✅ Navigate to `/library` while audio continues
3. ✅ Mini player stays visible at bottom with controls
4. ✅ Click mini player to return to exact reading position
5. ✅ Refresh page → state persists, can resume instantly
6. ✅ Close browser → reopen → position saved, ready to resume

**Like**: Spotify, Apple Podcasts, YouTube Music

---

## 📋 Implementation Phases

### Phase 1: Global Audio Context (Foundation)
**Files**: `contexts/AudioContext.tsx`, `app/layout.tsx`
**Goal**: Create persistent audio state that survives navigation

### Phase 2: Global Mini Player UI
**Files**: `components/audio/GlobalMiniPlayer.tsx`
**Goal**: Always-visible control bar at bottom of screen

### Phase 3: Integration with Reading Page
**Files**: `app/featured-books/page.tsx`
**Goal**: Remove local state, use global context

### Phase 4: Testing & Polish
**Goal**: Verify persistence, fix edge cases, optimize performance

---

## 🏗️ Phase 1: Global Audio Context

### 1.1 Create AudioContext (contexts/AudioContext.tsx)

**Purpose**: Central state management for all audio playback

**State to Manage**:
```typescript
interface AudioContextState {
  // Book & Content
  selectedBook: FeaturedBook | null;
  bundleData: RealBundleApiResponse | null;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  contentMode: 'original' | 'simplified';

  // Playback State
  isPlaying: boolean;
  currentSentenceIndex: number;
  currentBundle: string | null;
  currentChapter: number;
  playbackTime: number;
  totalTime: number;
  playbackSpeed: number;

  // UI State
  isMiniPlayerVisible: boolean;
  isFullPlayerVisible: boolean; // Whether on reading page
}
```

**Actions/Methods**:
```typescript
interface AudioContextActions {
  // Book Management
  loadBook: (book: FeaturedBook, level?: string) => Promise<void>;
  unloadBook: () => void;
  switchLevel: (level: string) => Promise<void>;

  // Playback Controls
  play: (sentenceIndex?: number) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => void;
  seek: (sentenceIndex: number) => Promise<void>;
  setSpeed: (speed: number) => void;

  // Bundle Navigation
  nextBundle: () => Promise<void>;
  previousBundle: () => Promise<void>;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;

  // Position Management
  savePosition: () => Promise<void>;
  restorePosition: (bookId: string) => Promise<void>;

  // UI Control
  showMiniPlayer: () => void;
  hideMiniPlayer: () => void;
  navigateToReading: () => void;
}
```

**Implementation Details**:

```typescript
'use client';

import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { BundleAudioManager, type BundleData } from '@/lib/audio/BundleAudioManager';
import { readingPositionService } from '@/lib/services/reading-position';
import { useRouter } from 'next/navigation';

// [State and Actions interfaces from above]

type AudioContextValue = AudioContextState & AudioContextActions;

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  // State management
  const [selectedBook, setSelectedBook] = useState<FeaturedBook | null>(null);
  const [bundleData, setBundleData] = useState<RealBundleApiResponse | null>(null);
  const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('A1');
  const [contentMode, setContentMode] = useState<'original' | 'simplified'>('simplified');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentBundle, setCurrentBundle] = useState<string | null>(null);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(false);
  const [isFullPlayerVisible, setIsFullPlayerVisible] = useState(false);

  // Refs
  const audioManagerRef = useRef<BundleAudioManager | null>(null);
  const isPlayingRef = useRef(false);
  const router = useRouter();

  // Initialize audio manager (once)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    audioManagerRef.current = new BundleAudioManager({
      onSentenceStart: (sentence) => {
        setCurrentSentenceIndex(sentence.sentenceIndex);
      },
      onTimeUpdate: (current, total) => {
        setPlaybackTime(current);
        setTotalTime(total);
      },
      onBundleComplete: (bundleId) => {
        // Auto-advance to next bundle
        nextBundle();
      }
    });

    // Cleanup on app unmount (rare)
    return () => {
      audioManagerRef.current?.destroy();
    };
  }, []);

  // Auto-save position every 5 seconds during playback
  useEffect(() => {
    if (!isPlaying || !selectedBook) return;

    const interval = setInterval(async () => {
      await savePosition();
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, selectedBook, currentSentenceIndex, currentChapter]);

  // Load book and bundles
  const loadBook = async (book: FeaturedBook, level?: string) => {
    setSelectedBook(book);
    const targetLevel = level || 'A1';
    setCefrLevel(targetLevel as any);

    // Fetch bundles
    const endpoint = getBookApiEndpoint(book.id, targetLevel);
    const response = await fetch(`${endpoint}?bookId=${book.id}&level=${targetLevel}`);
    const data = await response.json();

    if (data.success) {
      setBundleData(data);
      setIsMiniPlayerVisible(true);

      // Try to restore saved position
      const savedPosition = await readingPositionService.loadPosition(book.id);
      if (savedPosition) {
        setCurrentSentenceIndex(savedPosition.currentSentenceIndex);
        setCurrentBundle(savedPosition.currentBundleId);
        setCurrentChapter(savedPosition.currentChapter);
      }
    }
  };

  const play = async (sentenceIndex?: number) => {
    if (!audioManagerRef.current || !bundleData) return;

    const targetIndex = sentenceIndex ?? currentSentenceIndex;
    const bundle = findBundleForSentence(targetIndex, bundleData);

    if (!bundle) return;

    setCurrentBundle(bundle.bundleId);
    setCurrentSentenceIndex(targetIndex);
    setIsPlaying(true);
    isPlayingRef.current = true;

    audioManagerRef.current.setPlaybackRate(playbackSpeed);
    await audioManagerRef.current.playSequentialSentences(bundle, targetIndex);
  };

  const pause = () => {
    audioManagerRef.current?.pause();
    setIsPlaying(false);
    isPlayingRef.current = false;
    savePosition(); // Save on pause
  };

  const savePosition = async () => {
    if (!selectedBook) return;

    await readingPositionService.savePosition(selectedBook.id, {
      currentSentenceIndex,
      currentBundleIndex: getCurrentBundleIndex(),
      currentChapter,
      playbackTime,
      totalTime,
      cefrLevel,
      playbackSpeed,
      contentMode,
      completionPercentage: calculateCompletion(),
      sentencesRead: currentSentenceIndex
    });
  };

  // [Implement other methods...]

  const value: AudioContextValue = {
    // State
    selectedBook,
    bundleData,
    cefrLevel,
    contentMode,
    isPlaying,
    currentSentenceIndex,
    currentBundle,
    currentChapter,
    playbackTime,
    totalTime,
    playbackSpeed,
    isMiniPlayerVisible,
    isFullPlayerVisible,

    // Actions
    loadBook,
    unloadBook,
    switchLevel,
    play,
    pause,
    resume,
    stop,
    seek,
    setSpeed,
    nextBundle,
    previousBundle,
    skipForward,
    skipBackward,
    savePosition,
    restorePosition,
    showMiniPlayer,
    hideMiniPlayer,
    navigateToReading
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioContext must be used within AudioProvider');
  }
  return context;
}

// Helper functions
function findBundleForSentence(sentenceIndex: number, bundleData: RealBundleApiResponse): BundleData | null {
  return bundleData.bundles.find(bundle =>
    bundle.sentences.some(s => s.sentenceIndex === sentenceIndex)
  ) || null;
}

function getBookApiEndpoint(bookId: string, level: string): string {
  // [Implementation from featured-books/page.tsx]
}
```

**Key Design Decisions**:
1. **Single BundleAudioManager instance** - Created once in useEffect, never recreated
2. **Refs for closure safety** - `isPlayingRef` prevents stale closures
3. **Auto-save** - Position saved every 5s during playback + on pause
4. **SSR-safe** - Audio manager only created client-side
5. **Memory management** - Cleanup on unmount (though rare in practice)

---

### 1.2 Integrate AudioProvider in app/layout.tsx

**Purpose**: Wrap entire app so context is available everywhere

**Changes to app/layout.tsx**:
```typescript
import { AudioProvider } from '@/contexts/AudioContext';
import { GlobalMiniPlayer } from '@/components/audio/GlobalMiniPlayer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AudioProvider>
          {children}
          <GlobalMiniPlayer />
        </AudioProvider>
      </body>
    </html>
  );
}
```

**Important**: GlobalMiniPlayer is rendered at app level, so it persists across all pages.

---

## 🎨 Phase 2: Global Mini Player UI

### 2.1 Create GlobalMiniPlayer Component

**File**: `components/audio/GlobalMiniPlayer.tsx`

**Design Requirements**:
- Fixed position at bottom of screen
- Height: 72px (mobile), 80px (desktop)
- Z-index: 50 (above content, below modals)
- Slide up animation when visible
- Click anywhere → navigate to reading page
- Theme-aware colors (Neo-Classic compatibility)

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ [Cover] The Necklace        [◀◀] [⏸] [▶▶] [1.0x] │
│         Ch 2 • 35% complete                         │
└─────────────────────────────────────────────────────┘
```

**Component Structure**:
```typescript
'use client';

import { useAudioContext } from '@/contexts/AudioContext';
import { motion, AnimatePresence } from 'framer-motion';

export function GlobalMiniPlayer() {
  const {
    selectedBook,
    bundleData,
    isPlaying,
    currentSentenceIndex,
    currentChapter,
    playbackSpeed,
    isMiniPlayerVisible,
    isFullPlayerVisible,
    play,
    pause,
    skipBackward,
    skipForward,
    setSpeed,
    navigateToReading
  } = useAudioContext();

  // Don't show if no book loaded or on reading page
  if (!selectedBook || !bundleData || isFullPlayerVisible) {
    return null;
  }

  const completionPercentage = (currentSentenceIndex / bundleData.totalSentences) * 100;

  return (
    <AnimatePresence>
      {isMiniPlayerVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-secondary)] border-t-2 border-[var(--accent-primary)]/30 shadow-2xl"
          onClick={navigateToReading}
        >
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--bg-primary)]">
            <div
              className="h-full bg-[var(--accent-primary)] transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          <div className="flex items-center gap-4 px-4 py-3 max-w-6xl mx-auto">
            {/* Book Cover Thumbnail */}
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md"
              style={{ background: selectedBook.gradient }}
            >
              {selectedBook.abbreviation}
            </div>

            {/* Book Info */}
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={navigateToReading}
            >
              <div
                className="font-semibold text-[var(--text-accent)] truncate"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                {selectedBook.title}
              </div>
              <div
                className="text-sm text-[var(--text-secondary)]"
                style={{ fontFamily: 'Source Serif Pro, serif' }}
              >
                Chapter {currentChapter} • {completionPercentage.toFixed(0)}% complete
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              {/* Skip Backward 15s */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  skipBackward(15);
                }}
                className="w-10 h-10 rounded-full bg-[var(--bg-primary)] hover:bg-[var(--accent-primary)]/10 text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-all flex items-center justify-center"
                aria-label="Skip backward 15 seconds"
              >
                ⏪
              </button>

              {/* Play/Pause */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  isPlaying ? pause() : play();
                }}
                className="w-12 h-12 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white transition-all flex items-center justify-center shadow-lg"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              {/* Skip Forward 15s */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  skipForward(15);
                }}
                className="w-10 h-10 rounded-full bg-[var(--bg-primary)] hover:bg-[var(--accent-primary)]/10 text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-all flex items-center justify-center"
                aria-label="Skip forward 15 seconds"
              >
                ⏩
              </button>

              {/* Playback Speed */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cycleSpeed();
                }}
                className="w-14 h-10 rounded-full bg-[var(--bg-primary)] hover:bg-[var(--accent-primary)]/10 text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-all flex items-center justify-center text-sm font-medium"
                aria-label={`Playback speed: ${playbackSpeed}x`}
              >
                {playbackSpeed}x
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  function cycleSpeed() {
    const speeds = [0.8, 0.9, 1.0, 1.1, 1.2, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setSpeed(nextSpeed);
  }
}
```

**Accessibility**:
- ARIA labels on all buttons
- Keyboard navigation support
- Focus indicators
- Screen reader announcements

**Responsive Design**:
- Mobile: Stacked controls, smaller buttons
- Tablet: Horizontal layout
- Desktop: Full controls with larger touch targets

---

## 🔄 Phase 3: Integration with Reading Page

### 3.1 Refactor featured-books/page.tsx

**Goal**: Remove local audio state, use global context instead

**Changes Required**:

**Step 1: Remove Local State**
```typescript
// ❌ DELETE these useState hooks:
const [isPlaying, setIsPlaying] = useState(false);
const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
const [currentBundle, setCurrentBundle] = useState<string | null>(null);
const [currentChapter, setCurrentChapter] = useState(1);
const [playbackTime, setPlaybackTime] = useState(0);
const [totalTime, setTotalTime] = useState(0);
const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
const audioManagerRef = useRef<BundleAudioManager | null>(null);

// ✅ REPLACE with:
const audioContext = useAudioContext();
```

**Step 2: Update Book Selection Handler**
```typescript
// Before:
onClick={() => {
  setSelectedBook(book);
  setShowBookSelection(false);
}}

// After:
onClick={async () => {
  await audioContext.loadBook(book);
  setShowBookSelection(false);
  audioContext.setIsFullPlayerVisible(true); // Hide mini player on reading page
}}
```

**Step 3: Update Play Button**
```typescript
// Before:
await handlePlaySequential(0);

// After:
await audioContext.play(0);
```

**Step 4: Update Pause Button**
```typescript
// Before:
handlePause();

// After:
audioContext.pause();
```

**Step 5: Update Speed Control**
```typescript
// Before:
setPlaybackSpeed(newSpeed);
audioManagerRef.current?.setPlaybackRate(newSpeed);

// After:
audioContext.setSpeed(newSpeed);
```

**Step 6: Update Highlighting**
```typescript
// Still works! Context provides currentSentenceIndex
<span
  className={currentSentenceIndex === sentence.sentenceIndex ? 'highlighted' : ''}
>
  {sentence.text}
</span>
```

**Step 7: Clean Up Effects**
```typescript
// ❌ DELETE entire audio manager initialization effect
useEffect(() => {
  audioManagerRef.current = new BundleAudioManager({...});
  return () => audioManagerRef.current?.destroy();
}, []);

// ❌ DELETE bundle loading effect (now in context.loadBook())
// ❌ DELETE position auto-save effect (now in context)
```

**Step 8: Page Visibility Control**
```typescript
// On mount:
useEffect(() => {
  audioContext.setIsFullPlayerVisible(true);
  return () => {
    audioContext.setIsFullPlayerVisible(false);
  };
}, []);
```

**Benefits**:
- **-200 lines of code** from featured-books/page.tsx
- State now survives page refresh
- Mini player works automatically
- Position save/restore handled by context

---

### 3.2 Add Navigation Handler to Mini Player

**In AudioContext.tsx**:
```typescript
const navigateToReading = () => {
  if (!selectedBook) return;
  router.push(`/featured-books?bookId=${selectedBook.id}`);
};
```

**In featured-books/page.tsx**:
```typescript
// Auto-load book from URL on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const urlBookId = params.get('bookId');

  if (urlBookId && !audioContext.selectedBook) {
    const book = FEATURED_BOOKS.find(b => b.id === urlBookId);
    if (book) {
      audioContext.loadBook(book);
    }
  }
}, []);
```

---

## 🧪 Phase 4: Testing & Polish

### 4.1 Test Scenarios

**Persistence Tests**:
1. ✅ Start playback on /featured-books → Navigate to /library → Audio continues, mini player visible
2. ✅ Click mini player → Returns to /featured-books at exact position
3. ✅ Refresh page during playback → Position saved, can resume
4. ✅ Close browser → Reopen → Position restored from DB
5. ✅ Switch books → Old book stops, new book loads

**Control Tests**:
1. ✅ Play/Pause from mini player → Works correctly
2. ✅ Play/Pause from reading page → Syncs with mini player
3. ✅ Skip forward/backward → Updates sentence highlighting
4. ✅ Speed control → Affects playback immediately

**Edge Cases**:
1. ✅ Load book without bundles → Show error, hide mini player
2. ✅ Network error during bundle fetch → Graceful fallback
3. ✅ Multiple tabs open → State synced via localStorage events
4. ✅ Very long session (1+ hour) → Auto-save works, no memory leaks

### 4.2 Performance Validation

**Metrics to Track**:
- Context re-renders per second (should be <5)
- Memory usage after 1 hour playback (should be <150MB)
- Mini player animation FPS (should be 60fps)
- Position save latency (should be <100ms)

**Optimization Techniques**:
- useMemo for expensive computations
- useCallback for event handlers
- React.memo for mini player (only re-render on state changes)
- Debounce position saves (5 seconds)

### 4.3 Known Issues & Solutions

**Issue 1: Context re-renders entire app on playback**
```typescript
// Solution: Split context into two
// AudioStateContext (changes frequently: currentSentenceIndex, playbackTime)
// AudioActionsContext (stable: play, pause, etc.)
```

**Issue 2: Mini player blocks bottom content**
```typescript
// Solution: Add padding-bottom to body when mini player visible
<style>{`body { padding-bottom: ${isMiniPlayerVisible ? '80px' : '0'}; }`}</style>
```

**Issue 3: Audio continues after unmounting AudioProvider**
```typescript
// Solution: Cleanup in AudioProvider unmount
useEffect(() => {
  return () => {
    audioManagerRef.current?.stop();
    audioManagerRef.current?.destroy();
  };
}, []);
```

---

## 📁 File Summary

### New Files
```
contexts/
  AudioContext.tsx                    (500 lines) - Global audio state management

components/audio/
  GlobalMiniPlayer.tsx                (200 lines) - Always-visible mini player
```

### Modified Files
```
app/
  layout.tsx                          (+5 lines)  - Wrap with AudioProvider

app/featured-books/
  page.tsx                            (-200 lines, +50 lines) - Use global context
```

### Total Changes
- **New code**: ~700 lines
- **Deleted code**: ~200 lines
- **Net addition**: +500 lines
- **Files modified**: 3
- **Files created**: 2

---

## 🚀 Implementation Checklist

### Phase 1: Global Audio Context
- [ ] Create `contexts/AudioContext.tsx`
  - [ ] Define interfaces (AudioContextState, AudioContextActions)
  - [ ] Implement AudioProvider component
  - [ ] Initialize BundleAudioManager singleton
  - [ ] Implement loadBook()
  - [ ] Implement play(), pause(), resume()
  - [ ] Implement savePosition(), restorePosition()
  - [ ] Implement bundle navigation (next, previous)
  - [ ] Implement skip controls (±15s)
  - [ ] Add auto-save effect (5s interval)
  - [ ] Export useAudioContext() hook
- [ ] Update `app/layout.tsx`
  - [ ] Import AudioProvider
  - [ ] Wrap children with AudioProvider
  - [ ] Add GlobalMiniPlayer component

### Phase 2: Global Mini Player UI
- [ ] Create `components/audio/GlobalMiniPlayer.tsx`
  - [ ] Implement layout (cover, title, controls)
  - [ ] Add play/pause button
  - [ ] Add skip buttons (±15s)
  - [ ] Add speed control button
  - [ ] Add progress bar
  - [ ] Implement slide-up animation (Framer Motion)
  - [ ] Add click-to-navigate handler
  - [ ] Make responsive (mobile/desktop)
  - [ ] Add theme support (CSS variables)
  - [ ] Add ARIA labels for accessibility

### Phase 3: Integration
- [ ] Refactor `app/featured-books/page.tsx`
  - [ ] Remove local state (isPlaying, currentSentenceIndex, etc.)
  - [ ] Remove audioManagerRef
  - [ ] Replace with `useAudioContext()`
  - [ ] Update book selection handler → `audioContext.loadBook()`
  - [ ] Update play button → `audioContext.play()`
  - [ ] Update pause button → `audioContext.pause()`
  - [ ] Update speed control → `audioContext.setSpeed()`
  - [ ] Remove audio manager initialization effect
  - [ ] Remove bundle loading effect
  - [ ] Remove position save effect
  - [ ] Add isFullPlayerVisible control
  - [ ] Add URL-based book loading

### Phase 4: Testing
- [ ] Test persistence across navigation
- [ ] Test mini player controls
- [ ] Test position save/restore
- [ ] Test browser refresh
- [ ] Test multiple books
- [ ] Test edge cases (no bundles, network errors)
- [ ] Performance testing (memory, FPS)
- [ ] Accessibility testing (keyboard, screen reader)

### Phase 5: Documentation
- [ ] Update ARCHITECTURE_OVERVIEW.md
- [ ] Add JSDoc comments to AudioContext
- [ ] Create usage examples
- [ ] Document state management approach
- [ ] Update UI_UX_TRANSFORMATION_PLAN.md with completion

---

## 📊 Expected Outcomes

### User Experience
- ✅ Seamless playback across pages (like Spotify)
- ✅ Position persists across sessions (like Netflix)
- ✅ Discoverable controls always visible
- ✅ One-click return to reading

### Technical Benefits
- ✅ Single source of truth for audio state
- ✅ No more timing issues with position restore
- ✅ Simplified reading page (~200 lines removed)
- ✅ Foundation for Reading Position Memory feature
- ✅ Foundation for Offline Mode feature

### Metrics
- **Position Restore Success**: 0% → 100%
- **Code Complexity**: High → Medium (centralized state)
- **Bundle Size**: +15KB (GlobalMiniPlayer + AudioContext)
- **Performance**: No degradation (singleton audio manager)

---

## 🎯 Next Steps After Completion

1. ✅ **Implement Reading Position Memory** - Now trivial with persistent context
2. ✅ **Add auto-resume on page load** - 4 lines of code vs 150+
3. ✅ **Implement Offline Mode** - Download books, use same persistent state
4. ✅ **Add keyboard shortcuts** - Global context makes this easy
5. ✅ **Add system media controls** - Already set up in useMediaSession hook

---

## 🚨 Critical Success Factors

1. **Single BundleAudioManager instance** - Never create multiple
2. **SSR safety** - Audio only on client side
3. **Memory management** - Cleanup on unmount
4. **Performance** - Minimize context re-renders
5. **Testing** - Validate persistence thoroughly

**Documentation Reference**: See `docs/implementation/AUTO_RESUME_SESSION_REPORT.md` for what NOT to do.

---

**End of Implementation Plan**
