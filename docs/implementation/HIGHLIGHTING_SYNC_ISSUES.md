# Audio Highlighting Synchronization - Issues & Status

## 🚨 Current Status: DISABLED

**Date**: 2025-08-27  
**Status**: Highlighting functionality temporarily disabled  
**Reason**: Persistent timing sync issues across different CEFR levels

## 📊 Issues Identified

### **Issue 1: Timing Drift Over Time**
- **A1 Level**: Highlighting starts synchronized, then drifts after 2-3 sentences
- **B2 Level**: Highlighting consistently ahead of voice from start
- **Pattern**: Different CEFR levels have different timing characteristics

### **Issue 2: CEFR Level Variations**
- **A1**: Initially good sync, then progressive drift
- **B2**: Highlighting way ahead throughout playback
- **Hypothesis**: Different voice speeds or word timing data per level

### **Root Cause Analysis**
- ✅ Fixed double compensation and inverted timing logic
- ✅ Adjusted `AUDIO_SYNC_OFFSET` from 150ms to 100ms
- ❌ Auto-calibration system not accounting for CEFR-specific variations
- ❌ Possible word timing database inconsistencies per level

## 🔧 Technical Implementation Status

### **Current Highlighting System:**
- **File**: `components/audio/InstantAudioPlayer.tsx`
- **Method**: Database word timings with offset compensation
- **Offset**: `AUDIO_SYNC_OFFSET = 0.10` (100ms)
- **Auto-calibration**: First 3 words only

### **What's Working:**
- ✅ Audio playback perfect
- ✅ Auto-scroll functionality
- ✅ Word timing data exists in database
- ✅ Basic highlighting logic functional

### **What's Broken:**
- ❌ Timing accuracy varies by CEFR level
- ❌ Progressive drift over time
- ❌ Auto-calibration insufficient

## 🛑 Disabling Instructions Applied

### **Files Modified:**
1. `components/audio/InstantAudioPlayer.tsx` - Commenting out highlighting calls
2. `components/audio/WordHighlighter.tsx` - Visual highlighting disabled
3. Reading page maintains auto-scroll functionality

### **What Remains Active:**
- ✅ Audio playback 
- ✅ Auto-scroll to follow content
- ✅ All audio controls
- ❌ Word-by-word highlighting (disabled)

## 🔄 Re-enabling Instructions (Future Work)

### **To Re-enable Highlighting:**

1. **In `InstantAudioPlayer.tsx`:**
   ```typescript
   // Uncomment these lines (~line 520):
   // onWordHighlight(current.wordIndex);
   
   // Uncomment these lines (~line 530):
   // onWordHighlight(idx);
   ```

2. **In reading page (`app/library/[id]/read/page.tsx`):**
   ```typescript
   // Change from:
   // currentWordIndex={-1} // Highlighting disabled
   // To:
   currentWordIndex={currentWordIndex}
   ```

### **Suggested Future Fixes:**

1. **CEFR-Specific Offsets:**
   ```typescript
   const getCEFROffset = (level: string) => {
     switch(level) {
       case 'A1': return 0.12; // 120ms
       case 'B2': return 0.08; // 80ms  
       default: return 0.10;
     }
   };
   ```

2. **Improved Auto-Calibration:**
   - Extend calibration beyond first 3 words
   - Monitor drift throughout playback
   - Adjust offset dynamically

3. **Database Timing Validation:**
   - Verify word timing accuracy per CEFR level
   - Check for systematic offsets in timing data

## 📋 Current Priority

**Focus**: User experience over highlighting  
**Rationale**: Better to have perfect audio + auto-scroll than broken highlighting  
**Next**: Implement scroll-to-pause functionality for better user control

---

**Note**: This documentation ensures highlighting work can be resumed efficiently without losing previous debugging progress.