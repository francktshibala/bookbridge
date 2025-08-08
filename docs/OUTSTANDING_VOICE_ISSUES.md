# Outstanding Voice Integration Issues

**Date:** January 2025  
**Status:** Needs Resolution

## 🚨 Issue 1: Voice Selector Disappearing in Chat (HIGH PRIORITY)

### Problem:
The voice selector appears briefly when AI responses load, then **disappears immediately** after. This happens consistently on the book detail page chat (`/library/[id]/page.tsx`).

### Current Behavior:
1. User asks question in chat
2. AI response appears
3. SmartAudioPlayer with voice selector shows up
4. **Voice selector vanishes within seconds**
5. User cannot listen to AI responses

### Console Evidence:
```
SmartAudioPlayer.tsx:108 [SMART AUDIO] Display words (simple): Array(10) ...
AIChat.tsx:355 📡 Messages API response: 200
AIChat.tsx:359 ✅ Messages loaded: 2 messages
AIChat.tsx:373 🎉 Successfully set 2 messages to state for conversation: cmdycr8l1000113qv07nimhif
```

### Attempted Fixes:
- ✅ Removed `voiceSupported` conditional check
- ✅ Enhanced chat variant styling
- ✅ Added stable key prop: `key={audio-${content.substring(0, 50)}}`
- ✅ Added debug logging for component lifecycle
- ❌ **Still disappearing after conversation loading**

### Root Cause Theory:
React component re-mounting during message state updates when conversation persistence loads messages from database.

### Files Involved:
- `/components/AIChat.tsx` - Main chat component
- `/components/SmartAudioPlayer.tsx` - Audio player component
- `/app/library/[id]/page.tsx` - Book detail page

---

## 🚨 Issue 2: Duplicate Text Sections on Reading Page (MEDIUM PRIORITY)

### Problem:
The reading page (`/library/[id]/read/page.tsx`) currently shows **two separate sections**:
1. **Book text section** - Original book content for reading
2. **Voice highlighting section** - Duplicate text with highlighting during audio playback

### Current Behavior:
- User sees the same text twice
- One section for reading, one section for voice highlighting
- Creates visual clutter and confusion

### Desired Behavior:
**Single unified section** where the actual book text gets highlighted directly as audio plays, eliminating duplicate text display.

### Benefits of Fix:
- ✅ Cleaner, more integrated user experience
- ✅ Less visual clutter
- ✅ More intuitive highlighting (on the text user is reading)
- ✅ Better mobile experience (less scrolling)

### Files Involved:
- `/app/library/[id]/read/page.tsx` - Reading page layout
- `/components/SmartAudioPlayer.tsx` - May need `variant` adjustments

---

## 🎯 Next Steps for Tomorrow

### Priority 1: Fix Voice Selector Disappearing
1. **Deep dive into React DevTools** - Track component mounting/unmounting
2. **Check conversation loading timing** - Messages might be overwriting current state
3. **Consider useCallback/useMemo** - Prevent unnecessary re-renders
4. **Alternative: Move SmartAudioPlayer outside message component** - Prevent re-mounting

### Priority 2: Unify Reading Page Text
1. **Analyze current reading page structure** - Understand text display logic
2. **Modify SmartAudioPlayer highlighting** - Target existing book text instead of creating new section
3. **Update reading variant styling** - Integrate highlighting into main text area
4. **Test with long book sections** - Ensure highlighting works across chunks

## 📁 Key Files to Debug

### High Priority:
- `/components/AIChat.tsx` - Chat message rendering and state management
- `/components/SmartAudioPlayer.tsx` - Audio player component lifecycle

### Medium Priority:
- `/app/library/[id]/read/page.tsx` - Reading page text structure
- `/app/library/[id]/page.tsx` - Book detail page integration

---

**Status:** Both issues documented and ready for resolution
**Next Session:** Focus on voice selector persistence first, then text unification