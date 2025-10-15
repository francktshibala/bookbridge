# Audio-Text Synchronization Issues Analysis

## Current Problems

### 1. Highlighting Lag (Great Gatsby)
- **Issue:** Text highlighting is 0.5-1 sentence behind audio
- **Affected Books:** Great Gatsby A2 (902 bundles)
- **Working Reference:** Sleepy Hollow (perfect sync)
- **User Impact:** Poor reading experience, breaks immersion

### 2. Pause/Resume Sentence Skipping
- **Issue:** After pause/resume, audio skips 1-2 sentences forward
- **Affected Books:** Great Gatsby A2
- **Working Reference:** Sleepy Hollow (perfect pause/resume)
- **User Impact:** Users lose reading position, content confusion

## Technical Context

### Current Architecture
- **Bundle System:** 4 sentences per bundle, ~30 seconds audio each
- **TTS Provider:** ElevenLabs with Sarah voice
- **Timing Method:** Pre-computed scaled sentence timings
- **Monitoring:** RequestAnimationFrame at 60fps
- **Lead Time:** -500ms for TTS highlighting

### Book-Specific Differences
```javascript
// API timing calibration
const secondsPerWord = bookId === 'great-gatsby-a2' ? 0.35 : 0.4;
const minDuration = bookId === 'great-gatsby-a2' ? 1.8 : 2.0;
```

### Key Files Involved
- `/lib/audio/BundleAudioManager.ts` - Core audio management
- `/lib/audio/AudioBookPlayer.ts` - Unified player system
- `/app/api/test-book/real-bundles/route.ts` - Timing calculations
- `/app/featured-books/page.tsx` - UI integration

## Root Cause Hypotheses

### Hypothesis 1: Voice-Specific Timing Differences
- **Theory:** Sarah voice (Great Gatsby) has different speech patterns than Sleepy Hollow voice
- **Evidence:** Different timing constants (0.35 vs 0.4 seconds/word)
- **Test:** Compare actual vs estimated durations across bundles

### Hypothesis 2: Asymmetric Scaling Issues
- **Theory:** Duration scaling calculations differ between books
- **Evidence:** Previous asymmetric scaling bug was "fixed" but may still exist
- **Test:** Log scale factors and timing drift over multiple bundles

### Hypothesis 3: Bundle Completion Logic
- **Theory:** Premature bundle completion detection varies by book
- **Evidence:** Different audio durations causing different completion thresholds
- **Test:** Monitor bundle transition timing and completion triggers

### Hypothesis 4: State Management Inconsistency
- **Theory:** Pause/resume state not properly synchronized between books
- **Evidence:** Different implementation paths for the two books
- **Test:** Compare state transitions and position tracking

## Data Collection Needed

### 1. Timing Accuracy Analysis
```javascript
// Log actual vs predicted timings
{
  bundleIndex: number,
  actualDuration: number,
  predictedDuration: number,
  scaleFactor: number,
  sentenceTimings: Array<{
    index: number,
    actualStart: number,
    predictedStart: number,
    actualEnd: number,
    predictedEnd: number,
    drift: number
  }>
}
```

### 2. Pause/Resume Position Tracking
```javascript
// Track position accuracy
{
  pauseTime: number,
  pauseSentence: number,
  resumeTime: number,
  resumeSentence: number,
  expectedSentence: number,
  skippedSentences: number
}
```

### 3. Bundle Transition Analysis
```javascript
// Monitor bundle switches
{
  fromBundle: number,
  toBundle: number,
  transitionTime: number,
  expectedTime: number,
  delay: number,
  missedSentences: number
}
```

## Success Criteria (GPT-5 Recommended)

### Highlighting Sync
- **Target:** <100ms median error across all sentences
- **Threshold:** <250ms worst-case observed lag
- **Test:** 20 random sentence jumps across 5 chapters

### Pause/Resume Accuracy
- **Target:** Zero sentence skips
- **Test:** 50 pause/resume cycles at different positions
- **Validation:** Resume within 120ms suppression window

### Overall Stability
- **Target:** 3 full chapter listens with perfect auto-advance
- **Metrics:** No premature completions, no bundle mismatches
- **Performance:** <150ms processing spikes

## Investigation Plan

### Phase 1: Data Collection (Agent-Driven)
1. **Agent 1:** Analyze current timing implementation differences between books
2. **Agent 2:** Research TTS synchronization best practices and industry solutions
3. **Agent 3:** Deep-dive into BundleAudioManager state management patterns

### Phase 2: Root Cause Analysis
- Compare collected data between working (Sleepy Hollow) and broken (Great Gatsby) books
- Identify specific timing calculation differences
- Map state management flow differences

### Phase 3: Systematic Fix Implementation
- One issue at a time (highlighting first, then pause/resume)
- Test each fix against success criteria
- Ensure solution works for both books before proceeding

## Next Steps

1. **Create investigation agents** to analyze codebase and research solutions
2. **Deploy data collection** logging to both books
3. **GPT-5 consultation** on most effective systematic approach
4. **Implement fixes incrementally** with validation at each step

## Notes

- **Cost Impact:** Fixing these issues prevents wasted TTS costs (~$35/book) on future titles
- **Scalability:** Solution must work for any voice/book combination
- **User Experience:** These are core UX blockers, not optional features
- **Technical Debt:** Current inconsistencies suggest missing unified timing system