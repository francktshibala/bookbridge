# Instructions for GPT-5 via Cursor: Fix Highlighting Synchronization Issue

## **URGENT DEBUGGING TASK**

Word highlighting is running significantly **FASTER** than the voice audio in our BookBridge reading app. Despite multiple attempts at timing compensation (150ms, 300ms, 500ms offsets), the highlighting still advances ahead of the spoken words.

## **Problem Context**

### **Current Status:**
- ✅ Audio plays correctly from pre-generated MP3 files
- ✅ Word highlighting visually works (words get highlighted)
- ❌ **Timing is wrong**: Words highlight before they are spoken
- ❌ User reports highlighting is "super faster" than voice speed

### **What We've Tried:**
1. Added startup delays (150ms, 300ms, 500ms) after `audio.play()`
2. Applied calibration offsets to `currentTime` during tracking
3. Tried different offset values and directions
4. **None of these fixes worked - highlighting still too fast**

## **Files to Analyze (Priority Order)**

### **1. PRIMARY TIMING LOGIC** 
`/Users/user/bookbridge/bookbridge/components/audio/InstantAudioPlayer.tsx`

**Key Functions to Debug:**
- **Lines 255-284**: `playInstantAudio()` - Where audio starts and highlighting begins
- **Lines 436-510**: `startWordHighlighting()` - Core timing tracking logic
- **Lines 463-481**: Database word timing method (most important)
- **Lines 498-516**: Estimation fallback method

**Current Timing Logic:**
```typescript
// Lines 463-481: This is where the timing problem likely exists
timeUpdateIntervalRef.current = setInterval(() => {
  const currentTime = currentAudioRef.current.currentTime;
  const adjustedCurrentTime = Math.max(0, currentTime - AUDIO_SYNC_OFFSET);
  const currentWord = sentenceAudio.wordTimings.words.find(timing =>
    adjustedCurrentTime >= timing.startTime && 
    adjustedCurrentTime <= timing.endTime
  );
  if (currentWord) {
    onWordHighlight(currentWord.wordIndex);
  }
}, 50);
```

### **2. WORD HIGHLIGHTING INTEGRATION**
`/Users/user/bookbridge/bookbridge/app/library/[id]/read/page.tsx`

**Key Functions:**
- `handleWordHighlight()` - Receives word index from audio player
- Audio player integration and state management

### **3. VISUAL HIGHLIGHTING**
`/Users/user/bookbridge/bookbridge/components/audio/WordHighlighter.tsx`

**Check for:**
- Any timing modifications in the visual highlighting
- Auto-scroll interference with timing perception

## **Database Structure Context**

Word timings come from pre-generated database entries:
```typescript
interface WordTiming {
  word: string;
  startTime: number;    // Time in seconds when word starts
  endTime: number;      // Time in seconds when word ends  
  wordIndex: number;    // Position in text array
  confidence: number;   // Accuracy of timing (0-1)
}
```

**Example timing data:**
```javascript
Word 0 "The" at 0.00-0.15s
Word 1 "quick" at 0.16-0.35s  
Word 2 "brown" at 0.36-0.58s
```

## **Test Environment**

- **URL**: http://localhost:3001
- **Test Path**: Navigate to enhanced book → Click play → Observe highlighting vs voice
- **Console Logs**: Monitor browser console for timing debug output

## **Specific Debug Questions for GPT-5**

### **1. Timing Chain Analysis**
- Is `audio.currentTime` accurate immediately after `play()`?
- Is the 50ms `setInterval` polling fast enough for precision?
- Are we comparing the right time values (adjusted vs database timings)?

### **2. Database Timing Validation**  
- Are the database `startTime`/`endTime` values correct?
- Do they align with when words are actually spoken in the audio?
- Is there a systematic offset in all the timing data?

### **3. Logic Flow Verification**
- Does the word finding algorithm work correctly?
- Are we handling multiple sentences properly?
- Is there a race condition or timing calculation error?

### **4. Alternative Approaches**
- Should we use `audio.ontimeupdate` instead of `setInterval`?
- Would `requestAnimationFrame` be more accurate?
- Is Web Audio API needed for precise timing?

## **Expected Deliverables from GPT-5**

### **1. Root Cause Analysis**
Identify exactly why the timing compensation isn't working and what's causing the highlighting to run ahead.

### **2. Specific Code Fixes**
Provide exact code changes with line numbers for:
- `InstantAudioPlayer.tsx`  
- Any other files that need modification

### **3. Alternative Solutions**
If current approach is flawed, suggest a completely different timing method.

### **4. Testing Strategy**
How to validate that the fix actually works.

## **Current Configuration**

```typescript
// Current sync offset (line 70 in InstantAudioPlayer.tsx)
const AUDIO_SYNC_OFFSET = 0.5; // 500ms - we've tried 0.15, 0.3, 0.5
```

## **Console Output Example**

When testing, you'll see logs like:
```
🎵 Audio started playing
⏱️ Applying 500ms hardware delay compensation for sync
🎯 Using DATABASE word timings for perfect sync  
🎯 DATABASE TIMING: Word 0 "The" at 0.00s (raw: 0.50s) | Word timing: 0.00-0.15s
🎯 DATABASE TIMING: Word 1 "quick" at 0.16s (raw: 0.66s) | Word timing: 0.16-0.35s
```

**Key Question**: Why is highlighting still ahead despite these timing adjustments?

## **Critical Success Criteria**

The fix is successful when:
- Words highlight within 50ms of being spoken (not before)
- Highlighting stays synchronized throughout the entire audio
- No performance degradation from timing changes

## **Notes for GPT-5**

- This is a production BookBridge reading application
- Users depend on accurate highlighting for language learning
- The audio files are pre-generated MP3s (not real-time TTS)
- Database word timings were generated using Whisper alignment
- Previous attempts at fixing have all failed - need fresh perspective

**Please provide a comprehensive solution that actually resolves this timing synchronization issue.**