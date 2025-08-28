# Highlighting Synchronization & User Control Fix Plan

## Project Overview
**Goal**: Fix word highlighting synchronization with voice and restore user scroll control during audio playback  
**Status**: 🔵 Ready to Implement  
**Estimated Time**: 4-6 hours  
**Priority**: High - Core reading experience issue  

## Root Cause Summary
Both research agents identified the same critical issue:
- **150ms hardware delay** between `audio.play()` and actual sound output
- **Database timings are accurate** - the issue is playback reference timing
- **Auto-scroll forcefully overrides** user attempts to scroll

## Implementation Plan

### Phase 1: Quick Timing Fix (1 hour)
**Goal**: Add 150ms compensation to sync highlighting with voice

#### Step 1.1: Audio Startup Delay Compensation
**File**: `/components/audio/InstantAudioPlayer.tsx`
- Add 150ms delay after `audio.play()` (line 272)
- This compensates for hardware audio pipeline latency

```typescript
// Line 272-274 modification
await audio.play();
console.log('🎵 Audio started playing');
await new Promise(resolve => setTimeout(resolve, 150)); // Hardware delay compensation
startWordHighlighting(audioAssets[0]);
```

#### Step 1.2: Calibration Offset for currentTime
**File**: `/components/audio/InstantAudioPlayer.tsx`
- Subtract calibration offset when matching words (line 462)
- Adjust the lookahead value based on calibration

```typescript
// Line 465-469 modification
const calibrationOffset = 0.15; // 150ms offset
const adjustedCurrentTime = currentTime - calibrationOffset;
const currentWord = sentenceAudio.wordTimings.words.find(timing =>
  adjustedCurrentTime >= timing.startTime && 
  adjustedCurrentTime <= timing.endTime
);
```

### Phase 2: Performance Optimization (1 hour)
**Goal**: Replace setInterval with requestAnimationFrame for smoother sync

#### Step 2.1: Switch to requestAnimationFrame
**File**: `/components/audio/InstantAudioPlayer.tsx`
- Replace setInterval with requestAnimationFrame (line 458)
- Add debouncing to prevent highlight flicker

```typescript
// Replace lines 458-481
let animationFrameId: number;
let lastHighlightedIndex = -1;

const updateHighlight = () => {
  if (!currentAudioRef.current || currentAudioRef.current.paused) {
    return;
  }
  
  const currentTime = currentAudioRef.current.currentTime - 0.15;
  const currentWord = sentenceAudio.wordTimings.words.find(timing =>
    currentTime >= timing.startTime && currentTime <= timing.endTime
  );
  
  // Debounce - only update if word changed
  if (currentWord && currentWord.wordIndex !== lastHighlightedIndex) {
    lastHighlightedIndex = currentWord.wordIndex;
    onWordHighlight(currentWord.wordIndex);
  }
  
  animationFrameId = requestAnimationFrame(updateHighlight);
};

animationFrameId = requestAnimationFrame(updateHighlight);
```

### Phase 3: User Scroll Control (2 hours)
**Goal**: Implement pause-on-scroll and prevent auto-scroll interference

#### Step 3.1: Add User Scroll Detection
**File**: `/components/audio/WordHighlighter.tsx`
- Implement manual scroll detection (before line 54)
- Track user vs automatic scrolling

```typescript
// Add at component top level
const [userScrolling, setUserScrolling] = useState(false);
const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
const isAutoScrolling = useRef(false);

// User scroll detection
useEffect(() => {
  const handleUserInput = () => {
    setUserScrolling(true);
    setTimeout(() => setUserScrolling(false), 150);
  };

  ['wheel', 'touchmove', 'mousedown'].forEach(event => {
    document.addEventListener(event, handleUserInput);
  });

  return () => {
    ['wheel', 'touchmove', 'mousedown'].forEach(event => {
      document.removeEventListener(event, handleUserInput);
    });
  };
}, []);
```

#### Step 3.2: Implement Pause-on-Scroll
**File**: `/app/library/[id]/read/page.tsx`
- Add scroll detection that pauses audio
- Show notification when paused by scroll

```typescript
// Add to handleWordHighlight function
useEffect(() => {
  const handleScroll = () => {
    if (isPlaying && !isAutoScrolling.current) {
      // User manually scrolled - pause audio
      setIsPlaying(false);
      toast.info("Audio paused - manual scroll detected");
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, [isPlaying]);
```

#### Step 3.3: Modify Auto-Scroll Logic
**File**: `/components/audio/WordHighlighter.tsx`
- Only auto-scroll if user hasn't manually scrolled recently
- Make auto-scroll less aggressive

```typescript
// Modify lines 81-84
if (autoScrollEnabled && !userScrolling) {
  isAutoScrolling.current = true;
  window.scrollTo({
    top: targetScrollPosition,
    behavior: 'smooth'
  });
  setTimeout(() => {
    isAutoScrolling.current = false;
  }, 500);
}
```

### Phase 4: Enhanced User Controls (1 hour)
**Goal**: Make controls always accessible and add auto-scroll toggle

#### Step 4.1: Sticky Audio Controls
**File**: `/app/library/[id]/read/page.tsx`
- Make SmartPlayButton sticky during playback
- Add CSS for sticky positioning

```css
.audio-controls-sticky {
  position: sticky;
  top: 20px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 10px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
```

#### Step 4.2: Auto-Scroll Toggle
**File**: `/components/audio/SmartPlayButton.tsx`
- Add toggle for auto-scroll feature
- Visual indicator for auto-scroll state

```typescript
// Add auto-scroll toggle to SmartPlayButton
<button
  onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
  className="auto-scroll-toggle"
  title={autoScrollEnabled ? "Disable auto-scroll" : "Enable auto-scroll"}
>
  {autoScrollEnabled ? "📜" : "📄"}
</button>
```

### Phase 5: Testing & Calibration (1 hour)
**Goal**: Fine-tune timing values and test across devices

#### Step 5.1: Timing Calibration
- Test different delay values (100ms, 150ms, 200ms)
- Measure actual audio-to-sound delay
- Create device/browser matrix

#### Step 5.2: User Experience Testing
- Verify pause-on-scroll works smoothly
- Test auto-scroll toggle functionality
- Ensure controls remain accessible

### Success Metrics
- [ ] Words highlight within 50ms of being spoken
- [ ] User can scroll up without fighting auto-scroll
- [ ] Pause controls always accessible
- [ ] No highlight flicker or jumping
- [ ] Smooth performance on all devices

## Implementation Order
1. **Day 1**: Phase 1 & 2 (Timing fixes) - Immediate improvement
2. **Day 2**: Phase 3 (Scroll control) - Critical UX fix
3. **Day 3**: Phase 4 & 5 (Polish and testing)

## Risk Mitigation
- Test each phase independently before moving to next
- Keep original code commented for quick rollback
- Monitor performance impact of requestAnimationFrame

## Future Enhancements (Post-MVP)
1. Web Speech API integration for real-time boundary events
2. Per-device calibration persistence
3. Advanced scroll behaviors (direction detection)
4. ElevenLabs WebSocket for character-level timing

---

**Note**: This plan addresses the critical issues identified by both research agents. Start with Phase 1 for immediate improvement to highlighting sync.