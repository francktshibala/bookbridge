# Global Mini Player - UI Flow & Interaction Guide

**Visual Guide**: How the reading page looks and works with Global Mini Player

---

## 📱 Reading Page Layout (LOOKS THE SAME, WORKS BETTER)

### Before Global Mini Player (Current - Broken)
```
┌─────────────────────────────────────────────────────────────┐
│ BookBridge          [L] [D] [S] [F]                    [≡]  │ ← Nav
├─────────────────────────────────────────────────────────────┤
│  [←]                                              [Aa]      │ ← Header
│                                                              │
│                    The Necklace                              │ ← Title
│                 by Guy de Maupassant                         │
│                                                              │
│              Chapter 1: The Invitation                       │ ← Chapter
│                                                              │
│  She is a pretty girl from a family of clerks.              │ ← Text
│  ████████████████████████████████ ← (highlighted)           │   with
│  She has no money or hope for a rich husband.               │   real-time
│  She marries a clerk.                                        │   highlighting
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ ━━━━━━━━━━━━━━━━━━━━━ 45% ━━━━━━━━━━━━━━━━━━━━━━━         │ ← Progress
│ 1:23        Sentence 8/20 • Chapter 1 of 5        3:45      │
│                                                              │
│   [1x]        [⏸]        [📖]      [🎙️]                    │ ← Controls
│   Speed     Play/Pause   Chapter   Voice                    │
└─────────────────────────────────────────────────────────────┘

⚠️ PROBLEM: Refresh page → All state lost → Can't resume
⚠️ PROBLEM: Navigate away → Audio stops
```

### After Global Mini Player (Same Look, Works Perfectly)
```
┌─────────────────────────────────────────────────────────────┐
│ BookBridge          [L] [D] [S] [F]                    [≡]  │ ← Nav
├─────────────────────────────────────────────────────────────┤
│  [←]                                              [Aa]      │ ← Header
│                                                              │
│                    The Necklace                              │ ← Title
│                 by Guy de Maupassant                         │
│                                                              │
│              Chapter 1: The Invitation                       │ ← Chapter
│                                                              │
│  She is a pretty girl from a family of clerks.              │ ← Text
│  ████████████████████████████████ ← (highlighted)           │   with
│  She has no money or hope for a rich husband.               │   real-time
│  She marries a clerk.                                        │   highlighting
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ ━━━━━━━━━━━━━━━━━━━━ 45% ━━━━━━━━━━━━━━━━━━━━━━━         │ ← Progress
│ 1:23        Sentence 8/20 • Chapter 1 of 5        3:45      │
│                                                              │
│   [1x]        [⏸]        [📖]      [🎙️]                    │ ← Controls
│   Speed     Play/Pause   Chapter   Voice                    │
└─────────────────────────────────────────────────────────────┘
     ↑ Connected to Global Audio Context (persists)

✅ FIXED: Refresh page → State persists → Can resume
✅ FIXED: Navigate away → Mini player appears, audio continues
```

**Key Difference**:
- **UI looks identical** - same layout, same controls
- **State source changed** - from local useState → global AudioContext
- **Behavior improved** - persistence, mini player support

---

## 🎨 Visual Comparison: Reading Page vs Other Pages

### Scenario 1: User is on Reading Page (/featured-books)

```
┌─────────────────────────────────────────────────────────────┐
│                     READING PAGE                             │
│                                                              │
│  Chapter 1: The Invitation                                   │
│                                                              │
│  She is a pretty girl from a family of clerks.              │
│  ████████████████████████████████ ← Sentence 2 playing      │
│  She has no money or hope for a rich husband.               │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━ 45% ━━━━━━━━━━━━━━━━━━━━━          │
│  1:23        Sentence 8/20 • Chapter 1 of 5        3:45     │
│                                                              │
│  [1x]  [⏮]  [⏸]  [⏭]  [📖]  [🎙️]  ← Full controls       │
└─────────────────────────────────────────────────────────────┘

Mini Player Status: ❌ HIDDEN (you're on the reading page)
```

### Scenario 2: User Navigates to Library (/library)

```
┌─────────────────────────────────────────────────────────────┐
│                     LIBRARY PAGE                             │
│                                                              │
│  Enhanced Collection                                         │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                    │
│  │ Book 1  │  │ Book 2  │  │ Book 3  │                    │
│  │ [Read]  │  │ [Read]  │  │ [Read]  │                    │
│  └─────────┘  └─────────┘  └─────────┘                    │
│                                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 45% ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           │ ← Progress
│ [TN] The Necklace       [⏮] [⏸] [⏭] [1x]    [Click↗]     │ ← Mini Player
│      Ch 1 • Sentence 8/20                                    │
└─────────────────────────────────────────────────────────────┘

Mini Player Status: ✅ VISIBLE (you left the reading page)
Audio Status: 🎵 STILL PLAYING (sentence 2 continues)
Click Mini Player: Returns to /featured-books at exact position
```

### Scenario 3: User Clicks Mini Player to Return

```
┌─────────────────────────────────────────────────────────────┐
│                     READING PAGE                             │
│                                                              │
│  Chapter 1: The Invitation                                   │
│                                                              │
│  She is a pretty girl from a family of clerks.              │
│  She has no money or hope for a rich husband.               │
│  ████████████████████████████████ ← Sentence 5 now playing  │
│  She marries a clerk.                                        │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━ 58% ━━━━━━━━━━━━━━━━━━━━━          │
│  2:15        Sentence 12/20 • Chapter 1 of 5       3:45     │
│                                                              │
│  [1x]  [⏮]  [⏸]  [⏭]  [📖]  [🎙️]                        │
└─────────────────────────────────────────────────────────────┘

✅ Returns to exact position (sentence 12, not sentence 8)
✅ Highlighting automatically synced
✅ Auto-scroll catches up to current sentence
✅ Mini player hides (replaced by full controls)
```

---

## 🔊 How Highlighting Works with Global State

### Current Flow (Broken)
```
Audio plays sentence 5
   ↓
BundleAudioManager.onSentenceStart callback
   ↓
setCurrentSentenceIndex(5) ← LOCAL STATE
   ↓
Component re-renders
   ↓
Highlighting updated to sentence 5
   ↓
User refreshes page
   ↓
❌ LOCAL STATE DESTROYED
   ↓
currentSentenceIndex = 0 (default)
   ↓
Highlighting broken
```

### New Flow (Works Perfectly)
```
Audio plays sentence 5
   ↓
BundleAudioManager.onSentenceStart callback
   ↓
audioContext.setCurrentSentenceIndex(5) ← GLOBAL STATE
   ↓
ALL components re-render (reading page + mini player)
   ↓
Highlighting updated to sentence 5
   ↓
User refreshes page
   ↓
✅ GLOBAL STATE PERSISTS (in AudioContext)
   ↓
currentSentenceIndex = 5 (from context)
   ↓
Highlighting restored automatically
```

**Code Example**:
```typescript
// Reading Page Component
export default function FeaturedBooksPage() {
  const { currentSentenceIndex, bundleData } = useAudioContext(); // ← Global state

  return (
    <div>
      {bundleData?.bundles.flatMap(bundle =>
        bundle.sentences.map(sentence => (
          <span
            key={sentence.sentenceIndex}
            className={
              currentSentenceIndex === sentence.sentenceIndex
                ? 'bg-yellow-200 font-semibold' // ← Highlighted
                : 'text-gray-800'
            }
          >
            {sentence.text}
          </span>
        ))
      )}
    </div>
  );
}
```

**How it stays synced**:
1. AudioContext updates `currentSentenceIndex` when audio plays
2. Reading page reads from context → highlights correct sentence
3. Mini player reads from context → shows correct progress
4. Both always in sync (single source of truth)

---

## 📜 How Auto-Scroll Works with Global State

### Current Behavior (Works, but resets on refresh)
```typescript
// In featured-books/page.tsx
useEffect(() => {
  if (!isPlaying || !currentSentenceIndex) return;

  // Find the sentence element
  const element = document.getElementById(`sentence-${currentSentenceIndex}`);
  if (element && autoScrollEnabledRef.current) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }
}, [currentSentenceIndex, isPlaying]); // ← Depends on local state
```

### After Global Mini Player (Persists across navigation)
```typescript
// In featured-books/page.tsx
export default function FeaturedBooksPage() {
  const { currentSentenceIndex, isPlaying } = useAudioContext(); // ← Global state
  const autoScrollEnabledRef = useRef(true);

  useEffect(() => {
    if (!isPlaying || !currentSentenceIndex) return;

    // Find the sentence element
    const element = document.getElementById(`sentence-${currentSentenceIndex}`);
    if (element && autoScrollEnabledRef.current) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentSentenceIndex, isPlaying]); // ← Now uses global state

  // User scroll detection (pauses auto-scroll)
  useEffect(() => {
    const handleUserScroll = () => {
      autoScrollEnabledRef.current = false;
      setAutoScrollPaused(true);

      setTimeout(() => {
        autoScrollEnabledRef.current = true;
        setAutoScrollPaused(false);
      }, 3000); // Re-enable after 3s
    };

    window.addEventListener('wheel', handleUserScroll, { passive: true });
    window.addEventListener('touchmove', handleUserScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleUserScroll);
      window.removeEventListener('touchmove', handleUserScroll);
    };
  }, []);

  // ... rest of component
}
```

**What Changes**:
- ✅ Auto-scroll still works exactly the same
- ✅ User scroll still pauses auto-scroll for 3 seconds
- ✅ But now uses global `currentSentenceIndex` from context
- ✅ Returns to correct position when navigating back from mini player

**Visual Flow**:
```
Audio plays sentence 10
   ↓
audioContext.setCurrentSentenceIndex(10)
   ↓
Reading page useEffect triggers
   ↓
Auto-scroll to sentence 10 (smooth animation)
   ↓
User scrolls manually
   ↓
autoScrollEnabledRef.current = false (paused for 3s)
   ↓
Audio continues playing (sentence 11, 12...)
   ↓
After 3s: autoScrollEnabledRef.current = true
   ↓
Auto-scroll resumes from sentence 13
```

---

## 🎙️ How Voice (TTS) Works with Global State

### Voice Selection Flow

**Current Implementation**:
- Voice is hardcoded per book (Sarah, Daniel, etc.)
- No UI to change voice (🎙️ button exists but inactive)
- Voice determined by which API endpoint is called

**After Global Mini Player** (same behavior, better architecture):
```typescript
// In AudioContext.tsx
interface AudioContextState {
  // ... other state
  selectedVoice: 'Sarah' | 'Daniel' | 'Charlie'; // Future: user-selectable
}

// When loading book
const loadBook = async (book: FeaturedBook, level?: string) => {
  const endpoint = getBookApiEndpoint(book.id, level);
  const response = await fetch(endpoint);
  const data = await response.json();

  setBundleData(data); // Bundles already have the correct voice audio
  // Voice is baked into the bundle audio URLs from API
};
```

**Audio Playback**:
```typescript
// BundleAudioManager plays from bundle.audioUrl
// URL example: /audio/the-necklace-a1-sarah-bundle-1.mp3
//                                    ^^^^^ Voice name in filename

await audioManagerRef.current.playSequentialSentences(bundle, sentenceIndex);
```

**No Change Needed**:
- Voice works the same way (audio URLs contain correct voice)
- Global context just passes bundles to audio manager
- Future enhancement: Let user select voice, re-fetch bundles with different voice

---

## ⚙️ How Aa Settings Work with Global State

### Settings Modal (CEFR Level, Text Size, Content Mode)

**Before** (Local State):
```typescript
// In featured-books/page.tsx
const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1'>('A1');
const [contentMode, setContentMode] = useState<'simplified' | 'original'>('simplified');
const [textSize, setTextSize] = useState<number>(16);

// Settings Modal
<div className="settings-modal">
  <select value={cefrLevel} onChange={e => setCefrLevel(e.target.value)}>
    <option value="A1">A1</option>
    <option value="A2">A2</option>
    <option value="B1">B1</option>
  </select>
</div>

// Problem: Settings lost on refresh
```

**After** (Global State):
```typescript
// In AudioContext.tsx
interface AudioContextState {
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  contentMode: 'simplified' | 'original';
  textSize: number; // New: global text size preference
}

// Method to switch level
const switchLevel = async (newLevel: string) => {
  if (!selectedBook) return;

  setCefrLevel(newLevel as any);

  // Re-fetch bundles with new level
  const endpoint = getBookApiEndpoint(selectedBook.id, newLevel);
  const response = await fetch(endpoint);
  const data = await response.json();

  if (data.success) {
    setBundleData(data);

    // Save preference
    localStorage.setItem('preferred_cefr_level', newLevel);

    // If playing, restart from current sentence with new level
    if (isPlaying && currentSentenceIndex > 0) {
      await play(currentSentenceIndex);
    }
  }
};
```

**Settings Modal in Reading Page**:
```typescript
// In featured-books/page.tsx
export default function FeaturedBooksPage() {
  const { cefrLevel, contentMode, textSize, switchLevel, setContentMode, setTextSize } = useAudioContext();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  return (
    <>
      {/* Settings Button */}
      <button onClick={() => setShowSettingsModal(true)}>
        Aa
      </button>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal">
          <h3>Reading Settings</h3>

          {/* CEFR Level */}
          <div>
            <label>Difficulty Level</label>
            <select
              value={cefrLevel}
              onChange={e => switchLevel(e.target.value)}
            >
              <option value="A1">A1 - Beginner</option>
              <option value="A2">A2 - Elementary</option>
              <option value="B1">B1 - Intermediate</option>
            </select>
          </div>

          {/* Content Mode */}
          <div>
            <label>Content Mode</label>
            <select
              value={contentMode}
              onChange={e => setContentMode(e.target.value as any)}
            >
              <option value="simplified">Simplified</option>
              <option value="original">Original</option>
            </select>
          </div>

          {/* Text Size */}
          <div>
            <label>Text Size</label>
            <input
              type="range"
              min="12"
              max="24"
              value={textSize}
              onChange={e => setTextSize(Number(e.target.value))}
            />
            <span>{textSize}px</span>
          </div>
        </div>
      )}
    </>
  );
}
```

**Apply Text Size Globally**:
```typescript
// In featured-books/page.tsx
<div
  className="reading-content"
  style={{ fontSize: `${textSize}px` }} // ← From global context
>
  {bundleData?.bundles.flatMap(bundle =>
    bundle.sentences.map(sentence => (
      <span key={sentence.sentenceIndex}>
        {sentence.text}
      </span>
    ))
  )}
</div>
```

**Benefits**:
- ✅ Settings persist across refreshes (saved in context + localStorage)
- ✅ Changing CEFR level re-fetches bundles and continues from current position
- ✅ Text size applies immediately and persists
- ✅ Content mode switch works seamlessly

---

## 🔄 Complete Interaction Flow Diagram

### Scenario: User Journey from Start to Return

```
Step 1: User Selects Book
┌────────────────────────────────────┐
│  Enhanced Collection Page          │
│  ┌──────┐  ┌──────┐  ┌──────┐    │
│  │ Book │  │ Book │  │ Book │    │
│  │ [→]  │  │ [→]  │  │ [→]  │    │
│  └──────┘  └──────┘  └──────┘    │
│         Click "The Necklace"       │
└────────────────────────────────────┘
              ↓
    audioContext.loadBook(book)
              ↓
┌────────────────────────────────────┐
│  Global Audio Context              │
│  selectedBook = "The Necklace"     │
│  bundleData = [fetched from API]   │
│  currentSentenceIndex = 0          │
│  isPlaying = false                 │
└────────────────────────────────────┘

Step 2: Reading Page Loads
┌────────────────────────────────────┐
│  Reading Page (/featured-books)    │
│                                    │
│  Chapter 1: The Invitation         │
│  She is a pretty girl...           │
│                                    │
│  [1x]  [▶]  [📖]  [🎙️]          │
└────────────────────────────────────┘
              ↓
      User clicks Play
              ↓
    audioContext.play(0)
              ↓
┌────────────────────────────────────┐
│  Global Audio Context              │
│  isPlaying = true                  │
│  currentSentenceIndex = 0 → 1 → 2  │
│  currentBundle = "bundle_0"        │
└────────────────────────────────────┘
              ↓
┌────────────────────────────────────┐
│  Reading Page Updates              │
│  Sentence 2: ████████ ← Highlight │
│  Auto-scroll to sentence 2         │
│  Progress bar: 10%                 │
└────────────────────────────────────┘

Step 3: User Navigates Away
┌────────────────────────────────────┐
│  Reading Page                      │
│  (Sentence 8 playing)              │
└────────────────────────────────────┘
              ↓
    User clicks [←] back button
              ↓
    Navigate to /library
              ↓
┌────────────────────────────────────┐
│  Global Audio Context              │
│  isPlaying = true ← STILL TRUE!    │
│  currentSentenceIndex = 8          │
│  isMiniPlayerVisible = true        │
└────────────────────────────────────┘
              ↓
┌────────────────────────────────────┐
│  Library Page                      │
│  ┌──────┐  ┌──────┐  ┌──────┐    │
│  │ Book │  │ Book │  │ Book │    │
│  └──────┘  └──────┘  └──────┘    │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│ [TN] The Necklace  [⏮][⏸][⏭][1x] │ ← Mini Player
│      Ch 1 • 40% • Sentence 8/20    │
└────────────────────────────────────┘
    Audio STILL PLAYING (sentence 8 → 9 → 10...)

Step 4: User Returns via Mini Player
┌────────────────────────────────────┐
│ [TN] The Necklace  [⏮][⏸][⏭][1x] │
│      Ch 1 • 50% • Sentence 10/20   │
│      ↑ User clicks mini player     │
└────────────────────────────────────┘
              ↓
    audioContext.navigateToReading()
              ↓
    router.push('/featured-books?bookId=the-necklace')
              ↓
┌────────────────────────────────────┐
│  Reading Page (/featured-books)    │
│                                    │
│  Chapter 1: The Invitation         │
│  She is a pretty girl...           │
│  She has no money...               │
│  ████████████ ← Sentence 10        │
│  She marries a clerk.              │
│                                    │
│  [1x]  [⏸]  [📖]  [🎙️]          │
│  50% ━━━━━━━━━━━━━━━━━━━━         │
└────────────────────────────────────┘
    ✅ Returns to sentence 10 (not sentence 0)
    ✅ Highlighting correct
    ✅ Auto-scroll catches up
    ✅ Mini player hides (on reading page now)

Step 5: User Refreshes Page
┌────────────────────────────────────┐
│  Reading Page (Sentence 10 playing)│
│  User presses Ctrl+R (refresh)     │
└────────────────────────────────────┘
              ↓
    Page unmounts → remounts
              ↓
┌────────────────────────────────────┐
│  Global Audio Context              │
│  ✅ PERSISTS (in React Context)    │
│  isPlaying = true                  │
│  currentSentenceIndex = 10         │
│  currentBundle = "bundle_2"        │
│  selectedBook = "The Necklace"     │
└────────────────────────────────────┘
              ↓
┌────────────────────────────────────┐
│  Reading Page Re-renders           │
│  ✅ State restored from context    │
│  ✅ Highlighting on sentence 10    │
│  ✅ Audio still playing            │
│  ✅ Controls show correct state    │
└────────────────────────────────────┘
```

---

## 🎯 Key Takeaways

### What Stays the Same
- ✅ Reading page UI looks identical
- ✅ Highlighting works the same way
- ✅ Auto-scroll works the same way
- ✅ Settings modal works the same way
- ✅ Voice/audio works the same way

### What Gets Better
- ✅ State persists across refreshes
- ✅ Can browse other pages while audio continues
- ✅ Mini player provides always-visible controls
- ✅ One-click return to exact reading position
- ✅ Settings saved globally and restored
- ✅ Position save/restore becomes automatic

### What Changes Under the Hood
- ❌ Remove: Local useState hooks for audio state
- ❌ Remove: Local audioManagerRef
- ❌ Remove: Complex position restore useEffects
- ✅ Add: useAudioContext() hook
- ✅ Add: Global AudioContext wrapping app
- ✅ Add: GlobalMiniPlayer component
- ✅ Add: Persistent BundleAudioManager singleton

**Net Result**: Better UX with simpler, more maintainable code.

---

**End of UI Flow Guide**
