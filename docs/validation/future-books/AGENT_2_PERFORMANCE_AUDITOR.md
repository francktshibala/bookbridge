# Agent 2: Performance Auditor Instructions

## Your Mission
Verify that the proposed system can achieve <100ms audio startup, 60fps scrolling, and zero audio gaps while maintaining <200MB memory usage.

## Context
**Performance Targets**:
- Audio starts in <100ms from click
- 60fps scrolling on iPhone 8+
- Zero audio gaps during playback
- <200MB memory usage on mobile
- Perfect sync maintained over 30+ minute sessions

## End Result We Want
Users experience instant, smooth, uninterrupted reading with perfect audio-text synchronization that feels better than Speechify.

## Files You Must Review
1. `/docs/research/FUTURE_BOOKS_ARCHITECTURE_RESEARCH.md` - Performance specifications
2. `/components/audio/InstantAudioPlayer.tsx` - Current audio implementation
3. `/lib/audio-prefetch-service.ts` - Prefetch infrastructure
4. `/word-timing-research.md` - Timing accuracy analysis

## Critical Performance Questions

### 1. Audio Startup Time (<100ms)
- Can we achieve <100ms with pre-generated files on CDN?
- Impact of sentence-level files vs current chunks?
- Optimal preload strategy (how many sentences ahead)?
- Network latency considerations (3G/4G)?

### 2. Scroll Performance (60fps)
- Virtual scrolling overhead with 10,000+ sentences?
- Smooth scrolling during audio playback?
- Memory usage patterns during long sessions?
- Impact of highlighting updates on frame rate?

### 3. Audio Continuity (Zero Gaps)
- How to ensure gapless playback between sentences?
- Web Audio API vs HTML5 audio for scheduling?
- Buffer management for continuous stream?
- Handling network interruptions?

### 4. Memory Management (<200MB)
- Virtual DOM memory with large texts?
- Audio buffer memory requirements?
- Garbage collection strategies?
- Memory leaks during CEFR switching?

## Research Areas
1. Speechify's audio scheduling technique
2. Audible's approach to gapless chapter transitions
3. YouTube Music's gapless playback implementation
4. Spotify's memory management for long playlists
5. Netflix's virtual scrolling for subtitles

## Performance Testing Scenarios
- Test with "War and Peace" (500,000+ words)
- Slow 3G network simulation
- 2GB RAM Android device
- 30-minute continuous reading session
- Rapid CEFR level switching

## Your Output Format
Create: `/docs/validation/future-books/AGENT_2_FINDINGS.md`

Structure your findings as:
```markdown
# Performance Audit Findings

## ✅ Performance Targets Achievable
- [Target]: [How we'll achieve it] | [Confidence %]

## ⚠️ Performance Risks
- [Risk area]: [Current plan issue] | [Required optimization]

## 🔴 Performance Blockers
- [Blocker]: [Why it prevents target] | [Alternative solution]

## 📊 Benchmark Comparisons
- Speechify: [Their numbers]
- Our Plan: [Expected numbers]
- Gap Analysis: [What we need to improve]

## 🚀 Optimization Recommendations
1. [Specific optimization technique]
2. [Architecture change needed]

## 🧪 Required Performance Tests
```javascript
// Critical test examples
test('audio starts within 100ms', ...);
test('maintains 60fps during scroll', ...);
```

## Performance Score: X/100
[Can we meet ALL targets?]
```

## Time Limit: 30 minutes