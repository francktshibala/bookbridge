## Agent 2: TTS Synchronization Research — Best Practices and Implementation Strategies

### Executive Summary
- Problem: Great Gatsby shows 0.5–1 sentence highlighting lag and occasional pause/resume skips; Sleepy Hollow is in perfect sync.
- Root causes: Mixed timing spaces (scaling currentTime vs scaling sentence times), early bundle completion conditions, and no resume hysteresis.
- Scalable fix: Per-bundle linear calibration (scale), small initial offset (b) auto-tune, and runtime drift guard. Use requestAnimationFrame monitoring, compare raw audio currentTime to pre-scaled sentence boundaries, apply lead only to highlighting.

### Current Architecture and Observations
- Bundle system: 4 sentences per audio file; sentence timings stored/generated per bundle.
- Gatsby timings built via estimation when metadata missing (words × seconds/word):
```98:115:app/api/test-book/real-bundles/route.ts
          word_timings: sentences.slice(0, sentencesPerBundle).map((text, idx) => {
            const words = text.trim().split(/\s+/).length;
            const duration = Math.max(words * 0.4, 2.0); // ~0.4s per word, min 2s
            const startTime = idx === 0 ? 0 : sentences.slice(0, idx).reduce((sum, prevText) => {
              const prevWords = prevText.trim().split(/\s+/).length;
              return sum + Math.max(prevWords * 0.4, 2.0);
            }, 0);
            return {
              sentenceId: `${bookId}-${chunk.chunkIndex}-${idx}`,
              sentenceIndex: chunk.chunkIndex * sentencesPerBundle + idx,
              text: text.trim(),
              startTime: startTime,
              endTime: startTime + duration,
              wordTimings: [] // No word-level timings for TTS
            };
          })
```

- TTS lead set per provider; for TTS we use a negative lead so highlight starts earlier:
```300:307:app/featured-books/page.tsx
            const audioProvider = data?.audioType || 'elevenlabs';
            const isTTS = audioProvider === 'elevenlabs' || audioProvider === 'openai' || bookId === 'great-gatsby-a2';
            // Use consistent TTS lead time for both books
            const leadMs = isTTS ? -500 : (hasPreciseTimings ? 500 : 1400);
            const audioManager = new BundleAudioManager({
              highlightLeadMs: leadMs,
```

- Monitoring and transitions: uses RAF, compares raw currentTime (unscaled) to pre-scaled sentence boundaries, and applies a suppression window to avoid immediate skips after resume/jumps (latest fixes):
```340:372:lib/audio/BundleAudioManager.ts
    const tick = () => {
      if (!this.currentAudio || !this.isPlayingRef.current || !currentSentenceInBundle) return;
      const now = performance.now();
      const rawTime = this.currentAudio.currentTime; // unscaled
      const highlightTime = rawTime + this.highlightLeadSeconds;
      const nextSentenceIndex = currentSentenceInBundle.sentenceIndex + 1;
      const nextSentence = bundle.sentences.find(s => s.sentenceIndex === nextSentenceIndex);
      const nextScaledStart = nextSentence ? (this.scaledSentences.get(nextSentenceIndex)?.startTime || 0) : 0;
      const currentScaledEnd = this.scaledSentences.get(currentSentenceInBundle.sentenceIndex)?.endTime || 0;
      if (nextSentence && nextScaledStart > 0 && highlightTime >= nextScaledStart && now >= this.suppressTransitionsUntil) {
        this.options.onSentenceEnd?.(currentSentenceInBundle);
        currentSentenceInBundle = nextSentence;
        this.currentSentenceIndex = nextSentenceIndex;
        this.options.onSentenceStart?.(nextSentence);
      } else {
        if ((currentScaledEnd > 0 && rawTime >= currentScaledEnd) || this.currentAudio.ended || rawTime >= (this.currentAudio.duration - 0.05)) {
          this.options.onSentenceEnd?.(currentSentenceInBundle);
          if (nextSentence) {
            currentSentenceInBundle = nextSentence;
            this.currentSentenceIndex = nextSentenceIndex;
            this.options.onSentenceStart?.(nextSentence);
          } else {
            this.handleBundleComplete(bundle);
            return;
          }
        }
      }
      this.options.onProgress?.(rawTime, this.currentAudio.duration);
      this.rafId = requestAnimationFrame(tick);
    };
```

### Root Cause Analysis (Why Gatsby lags but Sleepy Hollow doesn’t)
- Mixed timing spaces (past behavior): scaling audio currentTime instead of scaling sentence boundaries caused early/late transitions depending on scale (<1 or >1), leading to lag and premature bundle completion.
- No resume hysteresis (past): negative lead could push highlight immediately past the next sentence start at resume, skipping one sentence.
- Gatsby had more variance between meta vs real duration (scale deviating from ~1), magnifying errors vs Sleepy Hollow.

### Provider-Agnostic Best Practices
1) Timing model
- Always compare raw audio currentTime to pre-scaled sentence boundaries (start/end × scale).
- Apply lead only to highlighting and sentence-advance decisions, never to completion checks.
- Use requestAnimationFrame for monitoring; avoid setInterval for smoother, frame‑aligned updates.

2) Per-bundle calibration
- Linear calibration: scale = realAudioDuration / metaDuration (clamp to [0.85, 1.10]).
- Optional initial offset b: measure first audible onset vs first scaledStart and apply a small offset y = a·x + b for that bundle.

3) Drift correction (lightweight)
- If repeated lead/lag >120ms detected twice in the same direction, apply tiny incremental correction (≤50ms) to subsequent boundaries for the current bundle only.

4) Resume/jump stability
- Suppress sentence transitions for ~120–200ms after resume/jump to avoid immediate double-advances.
- Seek to scaledStart for target sentence; do not reapply lead to completion.

5) Optional audio-feature anchoring (upgrade path)
- At first play of a bundle, scan ±200ms around each boundary for an energy rise (RMS/zero-crossing spike) and snap boundaries to audio onsets. Cache results so subsequent plays are perfect without runtime CPU cost.

### Concrete Implementation Steps
1. Calibration and guarding
- Ensure scale clamping in bundle load:
```269:279:lib/audio/BundleAudioManager.ts
        const metaDuration = (bundle.sentences && bundle.sentences.length > 0)
          ? Math.max(...bundle.sentences.map(s => s.endTime))
          : bundle.totalDuration;
        const realDuration = audio.duration || bundle.totalDuration;
        if (metaDuration > 0 && realDuration > 0 && Number.isFinite(realDuration)) {
          const rawScale = realDuration / metaDuration;
          // Clamp duration scale to avoid outliers
          this.durationScale = Math.min(1.10, Math.max(0.85, rawScale));
        } else {
          this.durationScale = 1;
        }
```
- Precompute scaled boundaries at load and use raw currentTime everywhere.

2. Resume/jump hysteresis
- Maintain a suppression window (120–200ms) after resume/jump to prevent immediate skips.

3. Global sentence map (for navigation)
- Build sentenceIndex → { bundleIndex, scaledStart, scaledEnd } once on load for instant jumps. Example orchestrator:
```typescript
// New code (orchestration)
interface GlobalSentencePosition { sentenceIndex: number; bundleIndex: number; scaledStart: number; scaledEnd: number }
class AudioBookPlayer { /* builds global map, exposes jumpToSentence, preloading hooks */ }
```

4. Drift guard
- Track recent (highlightTime − scaledStart) deltas; if consistent bias >120ms, nudge subsequent starts by ≤50ms for the current bundle.

5. Optional onset snapping (Phase 2)
- For each boundary, compute short‑window RMS and pick local maxima/minima signifying onset; persist corrected boundaries.

### Validation & Metrics
- Highlight drift: median <100ms, P95 <250ms across 20 random bundles.
- Pause/resume: 0 skips over 50 cycles at varied positions.
- Jumps: perceived seek <250ms and correct first‑frame highlight across 20 random jumps.
- Bundle transitions: no early completions; seamless next-bundle starts.

### References / Further Reading
- Web Audio API timing: use RAF for UI sync, avoid timers for frame-critical updates.
- TTS sync patterns: linear timing models with small per‑segment corrections are common; advanced apps add onset detection.



