# Research Instructions for AI Agents

## Overview
Two AI agents will conduct parallel research on text-to-speech highlighting synchronization and user control issues in the BookBridge application.

## Research Repository
**Main Research File**: `/Users/user/bookbridge/bookbridge/docs/research/HIGHLIGHTING_SYNC_DEEP_RESEARCH.md`

**Current System Status**: `/Users/user/bookbridge/bookbridge/docs/research/CURRENT_SYSTEM_STATUS.md`

## Instructions for Both Agents

### **IMPORTANT**: Document All Findings
- **Save your complete findings** in the designated section of `HIGHLIGHTING_SYNC_DEEP_RESEARCH.md`
- **Update the file directly** - don't just provide suggestions
- **Include code examples, specific line references, and actionable solutions**
- **Cross-reference the Current System Status document** for context

## Agent Assignments

---

## 📱 **GPT-5 Research Assignment: Audio Timing & Synchronization**

### Primary Research Questions:
1. **Audio Timing Analysis**: Why is the highlighting not matching the actual voice speed despite having word timing data?
2. **Database Timing Accuracy**: Are the pre-generated word timings correctly aligned with the audio?
3. **Browser Audio API Investigation**: Is `audioElement.currentTime` reliable for precise synchronization?
4. **Synchronization Best Practices**: What are proven methods for TTS highlighting sync?

### Files to Analyze:
- `/components/audio/InstantAudioPlayer.tsx` (lines 435-510: `startWordHighlighting`)
- `/app/library/[id]/read/page.tsx` (audio integration section)
- `/lib/word-timing-generator.ts` (timing generation methods)
- `/docs/TTS_HIGHLIGHTING_MASTER_PLAN.md` (existing research)
- `/docs/HIGHLIGHTING_SYSTEM_STATUS.md` (95% complete system)

### Specific Technical Deep Dives:
1. **Analyze the timing chain**: Audio.play() → currentTime tracking → word finding → highlight callback
2. **Investigate timing offset**: Is there a delay between audio start and currentTime updates?
3. **Database timing format**: Are startTime/endTime values absolute or relative?
4. **Browser compatibility**: Are there Chrome/Safari/Firefox differences in audio timing?
5. **Alternative sync methods**: Should we use Web Audio API, requestAnimationFrame, or other approaches?

### Expected Deliverables:
- Root cause analysis of timing mismatch
- Specific code fixes with line numbers
- Alternative implementation approaches
- Testing methodology for timing accuracy

### Save Findings In:
`HIGHLIGHTING_SYNC_DEEP_RESEARCH.md` → **GPT-5 Research Findings** section

---

## 🎯 **Claude Code Agent Research Assignment: User Control & UX**

### Primary Research Questions:
1. **Auto-Scroll Control**: How can we allow users to scroll freely without auto-scroll interference?
2. **Pause Accessibility**: How can users easily pause when auto-scroll moves them away from controls?
3. **Scroll Detection**: How can we detect manual user scrolling vs automatic scrolling?
4. **UX Best Practices**: How do apps like Speechify handle this challenge?

### Files to Analyze:
- `/components/audio/WordHighlighter.tsx` (lines 54-91: auto-scroll logic)
- `/app/library/[id]/read/page.tsx` (scroll handling and user controls)
- `/components/audio/SmartPlayButton.tsx` (control accessibility)
- Research existing apps and web patterns for similar functionality

### Specific UX Deep Dives:
1. **Auto-scroll implementation**: Current logic and why it prevents user control
2. **Scroll event handling**: How to detect user-initiated scrolling
3. **Pause button accessibility**: How to keep controls accessible during auto-scroll
4. **User preference system**: Should auto-scroll be toggleable?
5. **Gesture controls**: Could we add tap-to-pause or scroll-to-pause?

### User Experience Research:
1. **Analyze competitor apps**: How do Speechify, Natural Reader, Voice Dream handle this?
2. **Web accessibility standards**: What are best practices for audio reading apps?
3. **Mobile considerations**: How does this work on touch devices?
4. **User flow analysis**: What's the most intuitive way to pause while reading?

### Expected Deliverables:
- UX flow diagrams for improved user control
- Specific code solutions for scroll conflict resolution
- Design recommendations for pause accessibility
- Implementation plan for user preference system

### Save Findings In:
`HIGHLIGHTING_SYNC_DEEP_RESEARCH.md` → **Claude Code Agent Findings** section

---

## Collaboration Guidelines

### For Both Agents:
1. **Read both research files first** to understand the full context
2. **Cross-reference findings** - timing issues might affect UX and vice versa
3. **Provide concrete solutions** with code examples, not just analysis
4. **Include implementation priorities** (quick wins vs long-term solutions)
5. **Update the research file directly** with your complete findings

### Research Quality Standards:
- **Specific line references** when analyzing code
- **Actionable recommendations** with implementation steps
- **Alternative solutions** if primary approach fails
- **Testing methodology** for validating solutions
- **Risk assessment** for proposed changes

## Success Criteria

### The research is complete when we have:
1. **Root cause identification** for timing sync issues
2. **Concrete implementation plan** for fixing synchronization
3. **User control solution** that maintains auto-scroll benefits while allowing manual control
4. **Testing strategy** for validating the fixes
5. **Risk mitigation plan** for potential issues

## Timeline
Each agent should complete their research and update the findings file within their assigned scope. The findings will then be combined into a comprehensive implementation plan.

---

**Remember**: Save all findings directly in `HIGHLIGHTING_SYNC_DEEP_RESEARCH.md` in your designated section. This will be the master document for solving these issues.