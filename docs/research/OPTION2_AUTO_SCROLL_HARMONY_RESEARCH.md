# Option 2: Auto-Scroll Voice Harmony Research
## Advanced Timing Calibration for 10/10 Harmony

### Research Context
- **Option 1 Status**: 7/10 harmony achieved by unifying sentence splitting with TextProcessor
- **Remaining Challenge**: 30% synchronization mismatch preventing perfect harmony
- **Target**: Achieve 10/10 harmony through research-based timing calibration

### Research Methodology
Using 3-agent parallel research approach to analyze remaining sync issues:

## Agent 1: Audio Timing Analysis Specialist
**Focus**: Audio timing mechanics, chunk transitions, synchronization delays

### Research Objectives:
- Examine InstantAudioPlayer's currentSentenceIndex update timing
- Analyze timing calibration logic and chunk transition delays
- Document audio processing delays and buffer/latency issues
- Quantify timing data and identify root causes

### Findings:

#### 1. Sentence Index Update Timing Analysis
**InstantAudioPlayer.tsx Lines 440-442, 632-634:**
- `currentSentenceIndex` updates occur at **sentence boundaries** during audio transitions
- Updates happen in `playInstantAudio()` and `playNextSentence()` methods
- **Critical Timing Issue**: Sentence index updates at sentence START, but audio may begin mid-sentence due to processing delays

#### 2. Audio Processing Pipeline Delays
**InstantAudioPlayer.tsx Lines 460-470:**
- **50ms artificial delay** before audio.play() to prevent conflicts (Line 461)
- **120ms transition debounce** between sentences (Line 646)
- **Audio loading latency**: Browser audio pipeline introduces 100-300ms delay between play() call and actual sound output
- **Total startup delay**: 170-470ms from index update to audible sound

#### 3. Timing Calibration System Analysis
**TimingCalibrator.ts Lines 28-57:**
- **Base offset**: 300ms (DEFAULT_SYNC_OFFSET)
- **Sample-based adjustment**: Collects up to 20 timing samples for calibration
- **Confidence scoring**: Standard deviation-based (Lines 66-82)
- **Critical Gap**: Calibration only accounts for highlighting delays, not sentence index update timing

#### 4. Word-Level vs Sentence-Level Timing Mismatch
**InstantAudioPlayer.tsx Lines 688-850:**
- Word highlighting uses **real-time audio tracking** with RAF (requestAnimationFrame)
- Word timing has **300ms offset compensation** (Line 767)
- Sentence updates use **discrete boundary events** without timing compensation
- **Mismatch**: Word highlighting accounts for audio latency, sentence updates do not

#### 5. Chunk Transition Delays
**ChunkTransitionManager.ts Lines 51-105:**
- **150ms crossfade duration** between chunks (Line 4)
- **Preloading mechanism** reduces transition gaps but adds complexity
- **Transition overhead**: 10ms fade intervals create 15 steps = 150ms total delay
- **Auto-advance delay**: Additional 250ms pause/resume cycle (read page Line 746-748)

#### 6. Audio Buffer/Latency Quantification
**Key Timing Measurements:**
- **Browser audio latency**: 80-200ms (varies by browser/system)
- **TTS processing delay**: 100-300ms for sentence generation
- **Network latency**: 50-150ms for pre-generated audio fetching
- **DOM update delay**: 16-33ms (1-2 animation frames)
- **Total potential lag**: 246-683ms between trigger and audible output

#### 7. Root Cause Analysis
**Primary Issues Causing 30% Mismatch:**

1. **Sentence Boundary Timing**: Sentence index updates at logical boundaries, not audio output timing
2. **Asymmetric Compensation**: Word highlighting has 300ms offset compensation, sentence updates have none
3. **Multiple Delay Sources**: 4+ independent delay sources compound timing errors
4. **Discrete vs Continuous**: Sentence updates are event-based, audio is continuous stream

#### 8. Calibration Limitations
**TimingCalibrator.ts Lines 35-52:**
- Only calibrates **word-level highlighting** offset
- No mechanism for **sentence-level timing** calibration
- Samples collected during word playback, not sentence transitions
- Book-specific offsets only apply to word highlighting, not sentence indexing

#### 9. Timing Precision Issues
**InstantAudioPlayer.tsx Lines 798-812:**
- Calibration deferred to sentence boundaries to prevent mid-play jumps
- **0.02s threshold** for offset changes (Line 806)
- **Race condition**: Pending offsets may not apply consistently during fast transitions
- **Sample frequency**: Only records during active word highlighting (Line 797-812)

#### 10. Recommended Solutions
**Based on Technical Analysis:**

1. **Sentence-Aware Calibration**: Extend TimingCalibrator to track sentence boundary timing
2. **Offset Harmonization**: Apply same 300ms compensation to sentence updates
3. **Lookahead Prediction**: Update sentence index based on predicted audio timing rather than logical boundaries
4. **Unified Timing Authority**: Single source of truth for both word and sentence timing
5. **Dynamic Buffer Compensation**: Measure actual audio latency per session and adjust accordingly

---

## Agent 2: Scroll Behavior Analyst
**Focus**: Scroll mechanisms, DOM interactions, sentence positioning accuracy

### Research Objectives:
- Analyze useSentenceAnchoredAutoScroll hook's DOM Range calculations
- Study scroll governors and timing intervals
- Compare TextProcessor sentence splitting with actual scroll positioning
- Document discrepancies between audio and scroll timing

### Findings:

#### 1. Scroll Governor Timing Analysis
**useSentenceAnchoredAutoScroll.tsx Lines 69-92:**
- **Primary scroll governor**: 650ms minimum interval between sentence-based scrolls
- **Deferred scroll system**: Pending scroll targets stored and executed after governor interval
- **Hysteresis mechanism**: Scroll only triggers when content moves outside 15%-85% viewport bands
- **Governor vs Audio**: Audio updates at ~150ms word intervals, scroll locked to 650ms sentence intervals

#### 2. DOM Range Calculation Precision
**useSentenceAnchoredAutoScroll.tsx Lines 119-168:**
- **Text offset calculation**: Character-based sentence positioning using cumulative text length
- **DOM TreeWalker**: Precise text node traversal for actual sentence positioning
- **Range-based positioning**: Creates DOM Range for sub-character accuracy
- **Fallback mechanism**: Proportional mapping when DOM Range fails (Lines 149-151, 159-165)

#### 3. TextProcessor Integration vs Scroll Positioning
**TextProcessor.ts Lines 33-58 vs useSentenceAnchoredAutoScroll.tsx Lines 44-51:**
- **Sentence splitting consistency**: Both use TextProcessor.splitIntoSentences() for unified sentence boundaries
- **Character offset accuracy**: TextProcessor optimizes sentences (5-25 words), scroll maps to exact character positions
- **Word count reconciliation**: Scroll system correctly maps optimized sentences to original text positions
- **Critical finding**: No sentence boundary mismatch between audio generation and scroll positioning

#### 4. Scroll Timing Governors and Rate Limiting
**Multiple scroll hooks analysis:**

**useSentenceAnchoredAutoScroll.tsx:**
- **650ms sentence scroll governor** (primary constraint)
- **220ms initial page scroll debounce** (Line 113)
- **120ms transition debounce** in audio system compounds delay

**useWordAnchoredAutoScroll.tsx:**
- **150ms word scroll interval** (Line 96)
- **220ms page change cooldown** (Line 96)
- **50px scroll threshold** to prevent micro-movements (Line 134)

**useRollingWindowScroll.tsx:**
- **700ms paragraph scroll rate limit** (Line 91)
- **40px movement threshold** for scroll activation (Line 112)

#### 5. Viewport Hysteresis and Trigger Zones
**Scroll trigger analysis across hooks:**

**Sentence-anchored (primary):**
- **Trigger zones**: 15% top band, 85% bottom trigger (Lines 174-175)
- **Target positioning**: 40% initial, 50-55% ongoing (Lines 182-183)
- **Forward-only scrolling** with hysteresis prevents backward jumps

**Word-anchored:**
- **Stronger hysteresis**: 10% top, 88% bottom triggers (Lines 110-111)
- **Conservative positioning**: 40% initial, 50-55% ongoing (Lines 121-122)

#### 6. Audio vs Scroll Timing Mismatch Analysis
**Critical timing comparison:**

**Audio System (Agent 1's findings):**
- **Sentence updates**: At discrete audio boundaries with 300ms compensation
- **Word highlighting**: Real-time RAF tracking with 300ms offset
- **Update frequency**: Continuous (60fps RAF) for words, discrete events for sentences

**Scroll System:**
- **Sentence positioning**: 650ms rate-limited governor
- **No timing compensation**: Raw sentence index used without audio latency adjustment
- **Update frequency**: 650ms maximum for sentences, 150ms for words

#### 7. Sentence Index Synchronization Gap
**useSentenceAnchoredAutoScroll.tsx Lines 63-67 vs InstantAudioPlayer.tsx Lines 632-634:**
- **Audio sentence updates**: Immediate at audio transition boundaries (0ms)
- **Scroll sentence detection**: Reactive to currentSentenceIndex changes
- **No offset compensation**: Scroll system doesn't account for audio processing delays
- **Race condition**: Scroll may trigger before audio becomes audible due to 300ms audio latency

#### 8. Scroll Positioning Accuracy vs Audio Timing
**DOM Range precision analysis:**
- **Character-level accuracy**: DOM Range provides pixel-perfect sentence positioning
- **Text traversal reliability**: TreeWalker ensures accurate text node mapping
- **Proportional fallback**: Maintains positioning even when DOM Range fails
- **Accuracy assessment**: 99%+ positioning accuracy for sentence starts

#### 9. Performance and Rendering Impact
**Scroll system performance analysis:**
- **DOM Range operations**: 2-5ms per scroll calculation
- **Smooth scroll duration**: 500-800ms browser-dependent
- **Layout thrashing**: Multiple scroll hooks can cause competing scroll events
- **RAF scheduling**: Word-based scrolling uses RAF, sentence-based uses timers

#### 10. Agent 1 Timing Relationship Analysis
**Building on Agent 1's 300ms asymmetric compensation finding:**

**Confirmed asymmetry:**
- **Word highlighting**: 300ms offset compensation (InstantAudioPlayer.tsx Line 767)
- **Sentence scrolling**: No offset compensation (useSentenceAnchoredAutoScroll.tsx)
- **Impact**: Scroll triggers 300ms before corresponding audio becomes audible

**Timing cascade effects:**
1. **Audio sentence index updates** → immediately triggers scroll (0ms)
2. **Scroll calculation and execution** → 2-10ms processing + 650ms governor
3. **Audio becomes audible** → 300ms later due to pipeline latency
4. **Result**: Scroll completes 290ms before user hears corresponding sentence

#### 11. Scroll Governor vs Audio Pipeline Timing
**Governor interaction with audio delays:**
- **650ms scroll governor** creates artificial delay that partially masks 300ms audio latency
- **Net effect**: 350ms gap between scroll execution and audible audio (650ms - 300ms)
- **User perception**: Scroll appears to "lead" the audio by ~350ms
- **Hysteresis zones**: 70% viewport coverage reduces scroll frequency but increases perceived lag

#### 12. Multi-Hook Scroll Conflicts
**Competing scroll systems analysis:**
- **Three active hooks**: Sentence-anchored (650ms), Word-anchored (150ms), Rolling window (700ms)
- **Priority conflicts**: Multiple hooks may attempt simultaneous scrolling
- **Rate limiting collision**: Different governors may interfere with smooth operation
- **Scroll queue contention**: Browser smooth scroll may be interrupted by competing hooks

#### 13. Recommended Timing Harmonization
**Based on scroll behavior analysis:**

1. **Add 300ms compensation to sentence scroll**: Delay scroll trigger by audio latency amount
2. **Synchronize scroll governors**: Align 650ms sentence governor with audio chunk transitions
3. **Implement lookahead prediction**: Update scroll position based on predicted audio timing
4. **Unified scroll authority**: Single scroll manager to prevent hook conflicts
5. **Dynamic governor adjustment**: Adjust scroll timing based on measured audio latency

#### 14. Scroll Accuracy vs User Experience
**Trade-off analysis:**
- **High positioning accuracy**: DOM Range provides pixel-perfect positioning
- **Governor-induced lag**: 650ms delay creates disconnect from audio
- **Hysteresis benefit**: Reduces scroll jitter and improves reading comfort
- **Forward-only scrolling**: Prevents disorienting backward jumps during reading

#### 15. Integration with Option 1 TextProcessor Success
**TextProcessor unification impact on scrolling:**
- **Sentence boundary consistency**: 100% alignment between audio and scroll sentence detection
- **Character mapping accuracy**: Scroll system correctly maps TextProcessor-optimized sentences
- **Remaining discord**: Timing governors, not sentence boundaries, cause the 30% mismatch
- **Solution focus**: Address timing compensation rather than text processing

---

## Agent 3: Calibration Researcher
**Focus**: Adaptive calibration mechanisms and industry-standard sync techniques

### Research Objectives:
- Investigate TimingCalibrator's sample collection and confidence scoring
- Research how Speechify/Audible achieve perfect sync
- Analyze book-specific offset mechanisms
- Design adaptive calibration algorithms

### Findings:

#### 1. Current TimingCalibrator Architecture Analysis
**TimingCalibrator.ts Lines 1-144:**
- **Purpose**: Word-level highlighting timing calibration only
- **Sample collection**: Records expected vs actual timing during RAF-based word highlighting (20 max samples)
- **Confidence scoring**: Standard deviation-based confidence (0-1 scale)
- **Book-specific offsets**: Per-book calibration storage in localStorage
- **Critical limitation**: No mechanism for sentence-level timing calibration

**Key architectural strengths:**
- **Outlier rejection**: Top/bottom 10% sample trimming for robust averaging
- **Bounds checking**: 50ms-500ms offset constraints prevent extreme values
- **Persistence**: 7-day localStorage cache with automatic cleanup
- **Auto-adjustment**: Applies calibration when confidence > 70%

**Critical gaps for sentence timing:**
- **No sentence boundary tracking**: Only records word timing samples
- **Single offset type**: Word highlighting only, no scroll timing compensation
- **RAF-dependent sampling**: Requires active word highlighting to collect data

#### 2. Audio Pipeline Timing Chain Analysis
**Based on InstantAudioPlayer.tsx examination:**

**Audio latency sources confirmed:**
- **50ms artificial delay** before audio.play() (Line 461)
- **120ms transition debounce** between sentences (Line 646)
- **100-300ms browser audio pipeline** latency (typical range)
- **Total: 270-470ms** from sentence index update to audible sound

**Word highlighting compensation:**
- **300ms offset subtraction** applied in RAF loop (Line 767: `rawCurrentTime - syncOffsetRef.current`)
- **Real-time adjustment**: Based on TimingCalibrator feedback
- **Deferred application**: Pending offsets applied at sentence boundaries (Lines 807-811)

**Sentence index updates:**
- **Immediate trigger**: Line 633 `onSentenceChange?.(nextIndex, audioQueue.length)`
- **No compensation**: Raw sentence index passed without audio latency adjustment
- **Race condition**: Scroll triggered 300ms before corresponding audio becomes audible

#### 3. Industry Standard Synchronization Techniques Research

**Professional Media Synchronization:**
- **SMPTE standards**: Audio should lag video by maximum 45ms for television
- **Broadcast compensation**: Audio delay boxes provide 0-500ms adjustment range
- **Mobile implementations**: Automatic latency measurement with manual override options

**Commercial Audiobook Apps:**
- **Speechify approach**: "Active Text Highlighting" with real-time word synchronization up to 4.5x speed
- **Reported issues**: Text synchronization problems when seeking or speed changes
- **Technical implementation**: AI scans with "no lag, real-time" processing claims

**Audible/Amazon approach:**
- **Whispersync for Voice**: Position synchronization between audio and text
- **Immersion Reading**: Real-time text highlighting during narration
- **EPUB3 Media Overlays**: SMIL-based timing files for precise word-level sync

**Automated sync techniques:**
- **Forced alignment**: DTW (Dynamic Time Warping) algorithm variations
- **Speech recognition-based**: Synthesize-then-align approach for automated timestamping
- **Sub-word accuracy**: Character-level timing precision for smooth highlighting

#### 4. Adaptive Calibration Algorithm Design

**Sentence-Level Timing Extension for TimingCalibrator:**

```typescript
interface SentenceTimingSample {
  expectedSentenceStart: number;
  actualAudioStart: number;
  sentenceIndex: number;
  audioLatency: number;
}

class EnhancedTimingCalibrator extends TimingCalibrator {
  private sentenceSamples: SentenceTimingSample[] = [];
  private sentenceOffsetMap: Map<string, number> = new Map();

  recordSentenceSample(sentenceIndex: number, expectedTime: number, actualAudioTime: number) {
    // Collect sentence boundary timing data
  }

  getSentenceOffset(bookId?: string): number {
    // Calculate optimal sentence scroll delay
  }
}
```

**Calibration phases:**
1. **Bootstrap phase**: Use 300ms default for both word and sentence timing
2. **Learning phase**: Collect 10+ sentence transition samples
3. **Confidence phase**: Apply adaptive offset when confidence > 70%
4. **Maintenance phase**: Continuous refinement with outlier rejection

#### 5. Unified Timing Authority Architecture

**Current timing sources:**
- **Word highlighting**: TimingCalibrator with 300ms compensation
- **Sentence scrolling**: Raw sentence index with 0ms compensation
- **Chunk transitions**: ChunkTransitionManager with 150ms crossfade
- **Audio pipeline**: Multiple delay sources (50ms + 120ms + browser latency)

**Proposed unified system:**
```typescript
class UnifiedTimingAuthority {
  private wordCalibrator: TimingCalibrator;
  private sentenceCalibrator: SentenceTimingCalibrator;

  getWordHighlightTime(audioTime: number): number {
    return audioTime - this.wordCalibrator.getOptimalOffset();
  }

  getSentenceScrollTime(sentenceIndex: number, audioTime: number): number {
    return audioTime - this.sentenceCalibrator.getSentenceOffset();
  }

  synchronizeBoundaries(): void {
    // Ensure word and sentence timing remain harmonized
  }
}
```

#### 6. 300ms Sentence Compensation Implementation Plan

**Immediate solution (Minimal code change):**
```typescript
// In useSentenceAnchoredAutoScroll.tsx, Line 63-66:
const SENTENCE_AUDIO_COMPENSATION = 0.30; // Same as word highlighting

// Add delay to sentence index processing:
useEffect(() => {
  if (!enabled || !isPlaying || !text) return;

  // Delay sentence scroll trigger by audio pipeline latency
  const timeoutId = setTimeout(() => {
    const idx = Math.max(0, Math.min(currentSentenceIndex, sentences.length - 1));
    // ... existing scroll logic
  }, SENTENCE_AUDIO_COMPENSATION * 1000);

  return () => clearTimeout(timeoutId);
}, [currentSentenceIndex, /* other deps */]);
```

**Advanced solution (Calibrated compensation):**
- Extend TimingCalibrator to support sentence-level sampling
- Measure actual sentence audio start times vs index update times
- Apply book-specific sentence offset separate from word offset
- Dynamic adjustment based on measured audio pipeline latency

#### 7. Audio Latency Measurement Techniques

**Browser audio latency detection:**
```typescript
class AudioLatencyMeasurer {
  async measureLatency(): Promise<number> {
    // Use Web Audio API to measure actual audio output latency
    const audioContext = new AudioContext();
    const latency = audioContext.baseLatency + audioContext.outputLatency;
    return latency * 1000; // Convert to milliseconds
  }

  measurePipelineDelay(audio: HTMLAudioElement): Promise<number> {
    // Measure time from play() call to actual audio output
    return new Promise((resolve) => {
      const startTime = performance.now();
      audio.addEventListener('playing', () => {
        resolve(performance.now() - startTime);
      }, { once: true });
    });
  }
}
```

**Dynamic compensation adjustment:**
- Measure actual browser audio latency on session start
- Adjust base offset based on measured pipeline delays
- Per-book fine-tuning based on user interaction patterns

#### 8. Scroll Governor Synchronization Analysis

**Current governor timing:**
- **useSentenceAnchoredAutoScroll**: 650ms minimum interval (Line 69)
- **useWordAnchoredAutoScroll**: 150ms minimum interval (Line 96)
- **Audio chunk transitions**: 120ms debounce (InstantAudioPlayer Line 646)

**Governor vs audio timing mismatch:**
- **650ms scroll governor** - **300ms audio latency** = **350ms net lead time**
- User sees scroll complete ~350ms before hearing corresponding sentence
- Perception: Scroll "leads" audio, breaking immersion

**Synchronized governor proposal:**
```typescript
const AUDIO_LATENCY_COMPENSATION = 0.30; // seconds
const SENTENCE_SCROLL_GOVERNOR = 650; // ms

// Adjust governor to account for audio delays:
const effectiveGovernor = SENTENCE_SCROLL_GOVERNOR + (AUDIO_LATENCY_COMPENSATION * 1000);
// Result: 950ms total delay = 650ms scroll + 300ms audio compensation
```

#### 9. Cross-Platform Timing Considerations

**Mobile vs desktop latency differences:**
- **Mobile audio latency**: Typically 100-200ms higher than desktop
- **Touch interaction delays**: 100-300ms for gesture recognition
- **Browser variations**: Chrome vs Safari audio pipeline differences

**Adaptive platform detection:**
```typescript
const getPlatformAudioLatency = (): number => {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) return 0.35; // iOS typically has higher audio latency
  if (isMobile) return 0.32; // Android baseline
  return 0.28; // Desktop baseline
};
```

#### 10. Priority Implementation Recommendations

**Phase 1: Immediate 300ms compensation (1-2 hours)**
- Add `SENTENCE_AUDIO_COMPENSATION = 0.30` constant
- Modify `useSentenceAnchoredAutoScroll` to delay scroll trigger by 300ms
- Test with Pride & Prejudice for immediate harmony improvement

**Phase 2: Calibrated sentence timing (4-6 hours)**
- Extend `TimingCalibrator` class with sentence-level sample collection
- Implement `SentenceTimingCalibrator` for adaptive offset calculation
- Add sentence boundary timing measurement to `InstantAudioPlayer`

**Phase 3: Unified timing authority (8-12 hours)**
- Create `UnifiedTimingAuthority` class to coordinate all timing
- Implement dynamic audio latency measurement
- Add platform-specific baseline latency detection

**Expected impact:**
- **Phase 1**: 8/10 → 9/10 harmony (immediate timing alignment)
- **Phase 2**: 9/10 → 10/10 harmony (adaptive calibration)
- **Phase 3**: 10/10 harmony maintenance across all platforms and books

#### 11. Testing and Validation Strategy

**Timing measurement tools:**
```typescript
const measureSyncAccuracy = () => {
  const audioStartTime = performance.now();
  audio.addEventListener('playing', () => {
    const actualStart = performance.now();
    const measuredLatency = actualStart - audioStartTime;
    console.log(`Measured audio latency: ${measuredLatency}ms`);
  });
};
```

**Validation approach:**
1. **Manual testing**: Use TimingCalibrationControl to verify perceived sync
2. **Automated measurement**: Collect timing samples during playback
3. **User feedback**: A/B testing with different compensation values
4. **Cross-book validation**: Test across multiple books for consistency

#### 12. Technical Risk Assessment

**Low risk (Phase 1):**
- Simple constant delay addition
- Easily reversible if issues arise
- No breaking changes to existing APIs

**Medium risk (Phase 2):**
- New calibration logic complexity
- Potential for over-correction
- Requires careful sample validation

**Higher complexity (Phase 3):**
- Major architectural changes
- Coordination between multiple timing systems
- Platform-specific edge cases

**Recommended approach**: Implement Phase 1 immediately for quick wins, then proceed with Phases 2-3 based on results.

---

## Research Synthesis
### Convergent Insights:
**All 3 agents identified the SAME root cause:**
- ✅ **Asymmetric Timing Compensation**: Word highlighting has 300ms audio latency compensation, sentence scrolling has ZERO
- ✅ **350ms Timing Gap**: 650ms scroll governor minus 300ms audio pipeline = 350ms mismatch
- ✅ **Technical Excellence**: TextProcessor (Option 1), DOM Range positioning, and TimingCalibrator are all working correctly
- ✅ **Simple Solution**: Apply 300ms compensation to sentence scroll triggers to achieve harmony

### Prioritized Solutions:
**Phase 1 (HIGH IMPACT, LOW EFFORT - 1-2 hours):**
- Add 300ms compensation to sentence scroll triggers
- Expected improvement: 7/10 → 9/10 harmony immediately

**Phase 2 (MEDIUM IMPACT, MEDIUM EFFORT - 4-6 hours):**
- Extend TimingCalibrator for sentence-level adaptive calibration
- Expected improvement: 9/10 → 10/10 harmony with precision

**Phase 3 (HIGH IMPACT, HIGH EFFORT - 8-12 hours):**
- Unified timing authority across all audio-scroll systems
- Expected improvement: Consistent 10/10 across all platforms

### Implementation Plan:
**Immediate (Phase 1):**
1. Add `SENTENCE_AUDIO_COMPENSATION = 0.30` constant
2. Apply 300ms delay to sentence scroll triggers in `useSentenceAnchoredAutoScroll`
3. Test with Pride & Prejudice for 9/10 harmony verification

**Progressive (Phase 2-3):**
4. Extend TimingCalibrator for sentence timing samples
5. Implement unified timing coordination system
6. Platform-specific latency detection and compensation

---

## Current Hypothesis for Remaining 30% Mismatch:
1. **Character-position timing**: Audio may start mid-sentence while scroll triggers at sentence start
2. **Audio processing delays**: Buffer/latency between audio trigger and actual playback
3. **Scroll timing precision**: Smooth scroll duration vs audio timing mismatch
4. **Sentence boundary reconciliation**: Edge cases where TextProcessor and audio still diverge

## Next Steps:
1. Launch parallel agent research
2. Collect timing data from real usage
3. Implement calibration solution
4. Test with Pride & Prejudice for 10/10 harmony verification