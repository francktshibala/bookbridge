# Deep Research: Text Highlighting Synchronization Issues

## Problem Statement

We have a working audio playback and auto-advance system, but the word highlighting synchronization is not matching the actual voice speed. Additionally, auto-scroll interferes with user control.

## Current Issues

### 1. **Highlighting Speed Mismatch**
- **Symptom**: Highlighting moves too fast compared to voice playback
- **Expected**: Words highlight exactly when spoken
- **Current**: Words highlight at estimated intervals, not actual speech timing

### 2. **Auto-Scroll User Control Interference**
- **Symptom**: Auto-scroll prevents user from scrolling up to pause audio
- **Expected**: User should be able to scroll freely and pause when needed
- **Current**: Auto-scroll forces viewport to highlighted word

## Current System Architecture

### Audio Chain:
```
SmartPlayButton → InstantAudioPlayer → Pre-generated audio + word timings
```

### Highlighting Chain:
```
InstantAudioPlayer → onWordHighlight → handleWordHighlight → WordHighlighter → Visual highlight + auto-scroll
```

### Files Involved:

1. **`/app/library/[id]/read/page.tsx`** - Main reading page integration
2. **`/components/audio/SmartPlayButton.tsx`** - Play/pause control
3. **`/components/audio/InstantAudioPlayer.tsx`** - Audio playback + timing logic
4. **`/components/audio/WordHighlighter.tsx`** - Visual highlighting + auto-scroll
5. **`/hooks/useAutoAdvance.ts`** - Auto-advance functionality
6. **`/hooks/useWordHighlighting.ts`** - Word highlighting state management

## What's Working ✅

1. **Audio Playback**: Pre-generated audio plays correctly
2. **Auto-Advance**: Moves to next chunk and loads correct simplified content
3. **Play/Pause Controls**: SmartPlayButton controls work
4. **Word Highlighting Visual**: Words do get highlighted (but wrong timing)
5. **Content Loading**: Simplified content loads correctly after navigation

## What's Not Working ❌

1. **Highlighting Timing**: Words highlight too fast/slow compared to voice
2. **User Scroll Control**: Auto-scroll prevents user from scrolling up to pause
3. **Timing Synchronization**: No real-time sync between audio position and highlights

## Solutions Attempted

### Attempt 1: Simple Interval-Based Highlighting
```typescript
const msPerWord = (duration * 1000) / totalWords;
setInterval(() => highlightNextWord(), msPerWord);
```
**Result**: Too fast, doesn't match actual speech patterns

### Attempt 2: Real-Time Audio Tracking with Database Timings
```typescript
const currentTime = currentAudioRef.current.currentTime;
const currentWord = wordTimings.find(timing => 
  currentTime >= timing.startTime && currentTime <= timing.endTime
);
```
**Result**: Should work but still not synchronized (need to investigate why)

### Attempt 3: Improved Estimation with Audio Progress
```typescript
const progress = currentTime / duration;
const estimatedWordIndex = Math.floor(progress * words.length);
```
**Result**: Better than fixed intervals but still not accurate

## Technical Questions for Research

### For Audio Timing Investigation:
1. Are the pre-generated word timings in the database accurate?
2. Is `audioElement.currentTime` updating correctly during playback?
3. Is there a delay between audio start and timing tracking start?
4. Are the word timings aligned with the actual text being displayed?

### For User Control Investigation:
1. How can we implement pause-on-scroll behavior?
2. Can we disable auto-scroll when user manually scrolls?
3. Should we add a manual scroll detection system?
4. How do other apps (Speechify, etc.) handle this UX challenge?

### For Synchronization Investigation:
1. What's the best practice for TTS highlighting synchronization?
2. Are there browser-specific timing issues to consider?
3. Should we use `requestAnimationFrame` instead of `setInterval`?
4. How do we handle audio buffering and loading delays?

## Research Tasks

### Task 1: Audio Timing Analysis
- Analyze the actual audio file and word timing data from database
- Test `audioElement.currentTime` accuracy during playback
- Compare expected vs actual timing values
- Identify timing drift or offset issues

### Task 2: User Control Flow Analysis
- Research scroll detection patterns in web apps
- Analyze current auto-scroll implementation
- Design pause-on-scroll behavior
- Create user control priority system

### Task 3: Synchronization Best Practices
- Research TTS highlighting implementations
- Analyze timing synchronization methods
- Investigate browser audio API limitations
- Design robust sync mechanism

## Expected Findings

Each research agent should document:
1. **Root cause analysis** of the timing mismatch
2. **Specific code issues** in the current implementation
3. **Recommended solutions** with implementation details
4. **Alternative approaches** if primary solution fails
5. **User experience improvements** for scroll control

## Success Criteria

### Perfect Sync Achievement:
- [ ] Words highlight within 100ms of actual speech
- [ ] No visible lag or acceleration in highlighting
- [ ] Consistent timing across different text lengths

### User Control Improvement:
- [ ] User can scroll up without auto-scroll interference
- [ ] Easy pause access when needed
- [ ] Smooth auto-scroll resume when desired

---

## Research Findings Section

### GPT-5 Research Findings:
- **Root cause**: Startup offset between `audio.play()` resolution and audible output (≈100–200ms) plus interval drift from 50–100ms polling causes highlights to advance ahead of speech even when database timings are correct.
- **Database timings**: Likely accurate; mismatch stems from reference clock/offset, not timing records.
- **`currentTime` reliability**: Okay for coarse sync but needs calibrated offset and drift mitigation; VBR MP3 and pause/buffer events amplify error during scrubs.
- **Immediate fixes**:
  - Add ~150ms startup compensation before beginning highlighting.
  - Subtract a configurable calibration offset from `currentTime` when matching words.
  - Prefer `requestAnimationFrame` loop over `setInterval` to reduce drift and align with paint.
  - Debounce highlight changes to avoid flicker near boundaries.
- **Medium/long term**:
  - Prefer Web Speech boundary events when available; otherwise Whisper alignment or ElevenLabs WebSocket character timings.
  - Optionally persist per-voice/device learned offset.

### Claude Code Agent Findings:

## Technical Timing Analysis & Root Cause Research

### Comprehensive Timing System Analysis

After deep investigation into the audio timing and synchronization system, I've identified the core issues causing highlighting speed mismatch and found evidence of the root causes.

#### **Critical Discovery: Multiple Timing Issues Compounding**

**File Analysis: `components/audio/InstantAudioPlayer.tsx:435-510`**

The current timing implementation has several fundamental problems:

1. **Database Word Timings Accuracy**: Lines 454-474 show the system correctly retrieves word timings from the database, but there are synchronization offset issues:

```typescript
// CURRENT IMPLEMENTATION - InstantAudioPlayer.tsx:466-469
const currentWord = sentenceAudio.wordTimings.words.find(timing =>
  (currentTime + lookahead) >= timing.startTime && 
  (currentTime + lookahead) <= timing.endTime
);
```

**Problem**: The 100ms lookahead (line 465) is arbitrary and doesn't account for actual audio loading delays or playback offset.

2. **Audio Element currentTime Reliability Issues**: Research reveals that `audioElement.currentTime` has significant limitations:

   - **MP3 Format Limitation**: MP3 files don't have absolute positional data, making precise timing impossible
   - **Browser Precision Reduction**: Firefox reduces timer precision to 2ms by default, 100ms+ with fingerprinting protection
   - **VBR Encoding Issues**: Variable bitrate MP3 files have unreliable timing when users scrub
   - **Hardware Clock Mismatch**: Audio hardware time doesn't sync with system time

3. **Interval-Based Tracking Problems**: The 50ms interval (line 481) creates timing drift:

```typescript
// PROBLEMATIC CODE - InstantAudioPlayer.tsx:458-481
timeUpdateIntervalRef.current = setInterval(() => {
  const currentTime = currentAudioRef.current.currentTime;
  // ... timing logic
}, 50); // ← 50ms intervals accumulate timing errors
```

**Issue**: Each 50ms interval can accumulate timing errors, and if audio buffers or system is busy, intervals can be delayed.

#### **Audio Loading Delay Analysis**

**File: `components/audio/InstantAudioPlayer.tsx:255-284`**

Critical timing issue identified in audio startup sequence:

```typescript
// TIMING PROBLEM - InstantAudioPlayer.tsx:272-274
await audio.play();
console.log('🎵 Audio started playing');
startWordHighlighting(audioAssets[0]); // ← Highlighting starts immediately
```

**Root Cause**: `startWordHighlighting()` is called immediately after `audio.play()` resolves, but:
- `audio.play()` only means audio *started* loading, not that sound is coming out of speakers
- Hardware audio latency (typically 50-200ms) means highlighting starts before actual sound
- No compensation for audio processing pipeline delays

#### **Word Timing Generator Analysis**

**File: `lib/word-timing-generator.ts:112-175`**

The Whisper alignment method has accuracy limitations:

1. **Server Context Issues**: Lines 152-163 show fallback logic that estimates duration when not in browser context
2. **Timing Accuracy**: Only achieves "medium" accuracy (0.8 confidence) vs "high" (0.95) for ElevenLabs
3. **Processing Delay**: Whisper API calls add 1-3 seconds delay before timing data is available

#### **Web Audio API Research Findings**

Based on comprehensive research into Web Audio API timing accuracy:

**Key Technical Issues:**

1. **Clock Synchronization Problem**: 
   - `AudioContext.currentTime` starts when context is created, not when audio plays
   - Hardware audio clock vs system clock drift over time
   - No reliable way to sync audio hardware time with DOM timestamps

2. **Precision Limitations**:
   - Browser timing attack protections reduce precision
   - MP3 format lacks precise positional data
   - VBR-encoded files have unreliable seeking

3. **Boundary Event Reliability** (Web Speech API):
   - Chrome Android doesn't support boundary events (known Chromium bug)
   - Character position accuracy not guaranteed at word boundaries
   - `elapsedTime` property accuracy varies by engine

#### **TTS Highlighting Best Practices Research**

**Industry Standard Approaches:**

1. **Real-Time Boundary Events** (Most Accurate):
   - Use `SpeechSynthesisUtterance.boundary` events for live highlighting
   - Only works with Web Speech API voices, not pre-generated audio
   - Provides `elapsedTime` and `charIndex` for precise positioning

2. **Audio-Text Alignment Models**:
   - Treat audio and text as time-aligned streams
   - Use "lookahead" delay (100-150ms) to account for processing
   - Implement streaming TTS for ultra-low latency (<150ms)

3. **Progressive Enhancement Pattern**:
   - Start with basic estimation
   - Upgrade to boundary events when available
   - Fallback to manual synchronization controls

#### **Root Cause Summary**

**Primary Issue: Audio-to-Visual Synchronization Offset**

1. **Startup Delay**: ~100-200ms between `audio.play()` and actual sound output
2. **Timing Method**: Database timings are accurate, but playback timing reference is wrong
3. **Interval Drift**: 50ms polling accumulates errors over time
4. **Format Limitations**: MP3 format prevents precise seeking/timing

**Secondary Issues:**

1. **Browser Variability**: Different timing precision across browsers
2. **Hardware Latency**: Audio pipeline delays vary by device
3. **File Format**: Pre-generated MP3s lack frame-accurate timing data

### **Recommended Technical Solutions**

**Immediate Fix (High Confidence):**

1. **Audio Startup Delay Compensation**:
```typescript
// Add to InstantAudioPlayer.tsx:274
await audio.play();
await new Promise(resolve => setTimeout(resolve, 150)); // Hardware delay compensation
startWordHighlighting(audioAssets[0]);
```

2. **Timing Offset Calibration**:
```typescript
// Calibrate timing offset during playback
const audioStartTime = performance.now();
const calibrationOffset = 0.15; // 150ms typical hardware delay
const adjustedCurrentTime = currentTime - calibrationOffset;
```

**Medium-term Solution (Proven Approach):**

1. **Switch to Web Speech API for Real-time Voices**:
   - Use boundary events for instant synchronization
   - Fallback to pre-generated audio for premium voices
   - Eliminates timing guesswork entirely

**Long-term Solution (Maximum Accuracy):**

1. **ElevenLabs WebSocket Integration**:
   - Character-level timing data (99% accuracy)
   - Real-time streaming eliminates startup delays
   - Word-timing-generator.ts already has infrastructure

### **Testing & Validation Strategy**

**Immediate Tests:**
1. Measure actual delay between `audio.play()` and first audible sound
2. Compare database word timings with manual listening verification
3. Test timing consistency across different chunk lengths

**Calibration Tests:**
1. A/B test different delay compensation values (100ms, 150ms, 200ms)
2. Test across different devices and browsers
3. Verify improvement in subjective timing accuracy

## User Control & UX Research Analysis

### Current Auto-Scroll Implementation Issues

**File: `components/audio/WordHighlighter.tsx:54-91`**

The current auto-scroll logic has several critical UX problems:

1. **Forced Auto-Scroll Override**: Lines 81-84 use `window.scrollTo({ behavior: 'smooth' })` which interrupts any manual user scrolling
2. **No User Detection**: System cannot distinguish between user scrolling and automatic scrolling
3. **Threshold-Based Scrolling**: Only scrolls when word is outside 30%-70% viewport (lines 70-74)
4. **50ms Delay**: Small delay on line 87 but insufficient to detect user intent

```typescript
// PROBLEMATIC CODE - WordHighlighter.tsx:81-84
window.scrollTo({
  top: targetScrollPosition,
  behavior: 'smooth' // ← This prevents user from scrolling up
});
```

### Reading Page User Control Analysis

**File: `app/library/[id]/read/page.tsx`**

Current control layout issues:

1. **Scattered Controls**: Play/pause, CEFR controls, voice selection spread across multiple sections
2. **No Pause Priority**: When auto-scroll moves viewport, user cannot easily access pause button
3. **Mode Switching Complexity**: Requires multiple clicks to pause and access different controls
4. **No Scroll State Awareness**: System doesn't know when user manually scrolls up

### Competitor Research: Industry Best Practices

**Speechify UX Patterns:**

1. **Smart Auto-Scroll Control**: 
   - Toggle-based: Can be enabled/disabled via "More" → "Auto-Scroll"
   - **Issue Identified**: "Auto scroll is not smooth. It automatically jumps to pages up and down (like 5-10 pages)"
   - Lesson: Even industry leaders struggle with smooth auto-scroll implementation

2. **PromptSmart Voice-Following Pattern**:
   - Uses voice recognition to trigger scroll (not timer-based)
   - **Key Innovation**: "When you go off-script the app will not scroll" 
   - Demonstrates scroll-pause behavior when user deviates

3. **User Control Principles**:
   - Floating widget with easy access to play/pause
   - Variable playback speed controls
   - Manual scroll override capability
   - Background color and visual customization options

### Technical Solutions for Manual Scroll Detection

**Research Finding: Multiple Detection Methods Available**

1. **Flag-Based Approach** (Most Reliable):
```typescript
let isAutoScrolling = false;
let userScrolling = false;

// Track user input events
['wheel', 'touchmove', 'mousedown'].forEach(event => {
  document.addEventListener(event, () => {
    userScrolling = true;
    setTimeout(() => { userScrolling = false; }, 100);
  });
});

window.addEventListener('scroll', () => {
  if (userScrolling && !isAutoScrolling) {
    // User manually scrolled - pause auto-scroll or audio
  }
});
```

2. **Event Unsubscribe Pattern**:
```typescript
function programmaticScroll() {
  // Remove scroll listener during auto-scroll
  element.removeEventListener('scroll', scrollHandler);
  element.scrollIntoView({ behavior: 'smooth' });
  // Re-add listener after animation
  setTimeout(() => {
    element.addEventListener('scroll', scrollHandler);
  }, 1000);
}
```

3. **Scroll Prevention During Auto-Scroll**:
```typescript
class ScrollController {
  preventUserScroll() {
    // Prevent wheel/touch events during highlighting
    window.addEventListener('wheel', this.preventDefault, {passive: false});
    window.addEventListener('touchmove', this.preventDefault, {passive: false});
  }
  
  allowUserScroll() {
    // Re-enable user scrolling
    window.removeEventListener('wheel', this.preventDefault);
    window.removeEventListener('touchmove', this.preventDefault);
  }
}
```

### Root Cause Analysis

**Primary Issue**: Competing scroll behaviors without user priority detection

1. **Auto-Scroll Timing**: WordHighlighter forces scroll every 50ms when word changes
2. **User Intent Ignored**: No detection of manual scroll attempts
3. **Control Access**: Play/pause controls may be moved out of viewport by auto-scroll
4. **No Pause-on-Scroll**: Industry standard behavior missing

**Secondary Issues**:
- Timing synchronization problems (words highlight too fast/slow)
- Audio loading delays affecting word timing
- No graceful degradation when user prefers manual control

### Recommended UX Solutions

**1. Pause-on-Scroll Pattern** (Industry Standard):
```typescript
const handleUserScroll = () => {
  if (isPlaying && !isAutoScrolling) {
    // Pause audio when user manually scrolls
    setIsPlaying(false);
    showMessage("Audio paused - scroll interference detected");
  }
};
```

**2. Smart Auto-Scroll Toggle**:
- Default: Auto-scroll enabled
- User scrolls up → Auto-scroll temporarily disabled
- Resume button or timer re-enables auto-scroll
- Setting to permanently disable auto-scroll

**3. Sticky Control Bar**:
```css
.audio-controls {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(0,0,0,0.9);
  backdrop-filter: blur(10px);
}
```

**4. Scroll Conflict Resolution**:
- Detect user scroll direction
- If scrolling up → assume user wants to pause/review
- If scrolling down → allow auto-scroll to continue
- Provide visual feedback about scroll state

### Implementation Priority

**High Priority (Immediate Fix)**:
1. Add user scroll detection to WordHighlighter.tsx
2. Implement pause-on-scroll behavior
3. Make play/pause controls always accessible (sticky positioning)

**Medium Priority (Enhanced UX)**:
1. Auto-scroll toggle setting
2. Visual indicators for scroll state
3. Resume auto-scroll options

**Low Priority (Polish)**:
1. Smooth scroll animations
2. User preference persistence
3. Advanced scroll behaviors (speed matching, etc.)

### Success Criteria

**User Control Restored**:
- [ ] User can scroll up without audio jumping back to highlighted word
- [ ] Play/pause button always accessible during audio playback
- [ ] Clear indication when auto-scroll is active vs disabled

**Scroll Behavior Improved**:
- [ ] Smooth scrolling that doesn't fight user input
- [ ] Pause-on-scroll behavior works reliably
- [ ] Option to disable auto-scroll entirely

**Industry Standard UX**:
- [ ] Similar to Speechify/PromptSmart user control patterns
- [ ] Graceful handling of scroll conflicts
- [ ] Professional, polished reading experience

### Combined Analysis:
*[Final combined analysis and implementation plan will be added here]*

---

## Implementation Plan
*[To be filled after research completion]*

## Testing Strategy
*[To be filled after research completion]*