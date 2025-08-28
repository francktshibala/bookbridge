# Audio Debug Overlay - Usage Guide

## 🚀 Quick Start

1. **Start your app**: `npm run dev`
2. **Go to enhanced book**: Navigate to library → Select enhanced book
3. **Look for debug button**: You'll see a red 🐛 button in bottom-right corner
4. **Click to open debug panel**: Access all debugging tools

## 🧰 Debug Tools Available

### 1. **Log State** Button
- **What it does**: Logs current audio element state and player info to console
- **When to use**: To check if audio is loaded and playing correctly
- **Console output**: Audio element properties, player state, highlighted elements

### 2. **Test Audio** Button
- **What it does**: Runs 5-second audio timing accuracy test
- **When to use**: To verify browser audio timing is accurate
- **Console output**: Wall clock vs audio time comparison, drift measurement
- **Good result**: < 50ms drift

### 3. **Monitor Timing** Button
- **What it does**: Continuously logs timing data every 200ms
- **When to use**: To watch real-time sync between audio and highlighting
- **Console output**: Audio time, wall clock time, drift measurements
- **Stop**: Click "Stop Monitor" to end

### 4. **Test Words** Button
- **What it does**: Monitors word highlighting events for 30 seconds
- **When to use**: To see exactly when words highlight vs when they're spoken
- **Console output**: `🎯 WORD HIGHLIGHTED: "word" at audio time X.XXXs`
- **Manual testing**: Listen and compare highlighted words to spoken words

### 5. **Sync Offset Hints**
- **+50ms Button**: If highlighting is ahead of voice (most common issue)
- **-50ms Button**: If highlighting is behind voice
- **Note**: These show console instructions for manual code changes

## 📊 Reading the Console Output

### Key Log Messages:
```
🎯 REAL-TIME HIGHLIGHTING: Starting with audio tracking
  fixApplied: "Double compensation removed, timing direction corrected"
  
🎯 WORD HIGHLIGHT: "The" (index 0) at audio 0.245s | Word timing: 0.000-0.150s

🎯 AUTO-CALIBRATION: Word 0 - Lead: 180ms, New offset: 156ms
```

### What to Look For:
- ✅ **Good sync**: Word highlights when you hear it spoken
- ❌ **Bad sync**: Word highlights before/after you hear it
- ⚠️ **Timing drift**: > 50ms drift in accuracy test
- 📊 **Auto-calibration**: Should converge to reasonable offset (50-200ms)

## 🔧 Troubleshooting

### If highlighting is still ahead of voice:
1. Click **Test Words** button
2. Listen carefully and note timing difference
3. If consistently ahead by ~100ms, click **+50ms** button
4. Follow console instructions to increase `AUDIO_SYNC_OFFSET`
5. Reload page and test again

### If highlighting is behind voice:
1. Same process but click **-50ms** button
2. Decrease `AUDIO_SYNC_OFFSET` value
3. Test with smaller decrements (25ms)

### If audio timing is inaccurate:
1. **Test Audio** showing high drift (>100ms)
2. Try different browser (Chrome vs Firefox vs Safari)
3. Check for background processes affecting audio

## 📝 Making Manual Adjustments

When debug tools suggest offset changes:

**File**: `/components/audio/InstantAudioPlayer.tsx`
**Line**: ~70
**Change**: `const AUDIO_SYNC_OFFSET = 0.XX;` (where XX is new value)

**Examples**:
- Highlighting 100ms ahead → Change 0.15 to 0.25 (+100ms)
- Highlighting 50ms behind → Change 0.15 to 0.10 (-50ms)

## 🎯 Success Indicators

- Words highlight within 50ms of being spoken
- Console shows "fixApplied: Double compensation removed"  
- Auto-calibration stabilizes around 50-200ms offset
- No user perception of timing mismatch
- Test Audio shows < 50ms timing drift

## 🧪 Complete Testing Flow

1. **Log State** → Verify audio is loaded
2. **Test Audio** → Confirm timing accuracy  
3. **Play audio** → Start book playback
4. **Test Words** → Monitor word sync for 30 seconds
5. **Listen carefully** → Note any sync issues
6. **Adjust if needed** → Use offset hint buttons
7. **Reload and repeat** → Verify improvements

This debug overlay gives you complete visibility into the audio highlighting synchronization system!