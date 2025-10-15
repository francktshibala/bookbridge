## Agent 1: Current Architecture Analysis — Sentence-Level Jumping

### Mission
Analyze current `AudioBookPlayer` and `BundleAudioManager` architecture to understand how to implement professional‑grade sentence jumping (Speechify‑style) with bundled audio.

### Context
- Goal: Instant sentence jumping — click any sentence, voice starts immediately.
- Challenge: Audio is bundled (4 sentences/bundle), not per‑sentence files.
- Current state: Highlighting is solid after recent fixes; need robust cross‑bundle jumping and preload.

### Files Analyzed
- `lib/audio/AudioBookPlayer.ts` — global sentence map, orchestrator, `jumpToSentence()`.
- `lib/audio/BundleAudioManager.ts` — audio element control, bundle load/seek/play, timing loop.
- `app/featured-books/page.tsx` — UI integration and jump/continue wiring.

---

## Findings

### 1) Sentence → Bundle Mapping (Global Map)
- `AudioBookPlayer` builds a global sentence map at construction; each `sentenceIndex` maps to `{ bundleIndex, scaledStart, scaledEnd }` computed from bundle metadata and a clamped per‑bundle scale.

```1:36:lib/audio/AudioBookPlayer.ts
import { BundleAudioManager, type BundleData } from '@/lib/audio/BundleAudioManager'

export interface GlobalSentencePosition {
  sentenceIndex: number
  bundleIndex: number
  scaledStart: number
  scaledEnd: number
}

export interface AudioBookPlayerOptions {
  highlightLeadMs?: number
  preloadRadius?: number // how many neighbor bundles to preload
  debug?: boolean
}

export class AudioBookPlayer {
  private bundles: BundleData[]
  private manager: BundleAudioManager
  private sentenceMap: Map<number, GlobalSentencePosition> = new Map()
  private preloadRadius: number
  private debug: boolean

  constructor(bundles: BundleData[], options: AudioBookPlayerOptions = {}) {
    const lead = typeof options.highlightLeadMs === 'number' ? options.highlightLeadMs : -500
    this.manager = new BundleAudioManager({ highlightLeadMs: lead })
    this.bundles = bundles
    this.preloadRadius = typeof options.preloadRadius === 'number' ? options.preloadRadius : 1
    this.debug = !!options.debug
```

```36:65:lib/audio/AudioBookPlayer.ts
  private buildSentenceMap() {
    this.sentenceMap.clear()
    this.bundles.forEach((bundle, bIndex) => {
      const scale = this.estimateScale(bundle)
      bundle.sentences.forEach(s => {
        this.sentenceMap.set(s.sentenceIndex, {
          sentenceIndex: s.sentenceIndex,
          bundleIndex: bIndex,
          scaledStart: s.startTime * scale,
          scaledEnd: s.endTime * scale
        })
      })
    })
    if (this.debug) console.log(`AudioBookPlayer: built global map for ${this.sentenceMap.size} sentences`)
  }
```

### 2) Current Jump Logic
- `AudioBookPlayer.jumpToSentence(targetIndex)` looks up the sentence position, identifies the correct bundle, and calls `BundleAudioManager.playSequentialSentences(bundle, targetIndex)`.

```65:89:lib/audio/AudioBookPlayer.ts
  /** Jump to a sentence index instantly */
  async jumpToSentence(targetIndex: number): Promise<void> {
    const pos = this.sentenceMap.get(targetIndex)
    if (!pos) throw new Error(`Sentence ${targetIndex} not found in global map`)

    const bundle = this.bundles[pos.bundleIndex]
    await this.manager.playSequentialSentences(bundle, targetIndex)
  }

  getManager(): BundleAudioManager { return this.manager }
}
```

- In `app/featured-books/page.tsx`, `jumpToSentence` prefers the unified player and falls back to the older sequential path if needed.

```365:386:app/featured-books/page.tsx
  const handlePlaySequential = async (startSentenceIndex: number = 0) => {
    if (!audioManagerRef.current || !bundleData) return;
    try {
      const bundle = findBundleForSentence(startSentenceIndex);
      if (!bundle) {
        console.error(`Bundle not found for sentence ${startSentenceIndex}`);
        return;
      }
      setCurrentBundle(bundle.bundleId);
      setCurrentSentenceIndex(startSentenceIndex);
      setIsPlaying(true);
      isPlayingRef.current = true;
      audioManagerRef.current.setPlaybackRate(playbackSpeed);
      await audioManagerRef.current.playSequentialSentences(bundle, startSentenceIndex);
      console.log(`📌 playSequentialSentences completed for bundle ${bundle.bundleId}, isPlayingRef.current = ${isPlayingRef.current}`);
    } catch (error) {
      console.error('Sequential playback failed:', error);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };
```

```410:427:app/featured-books/page.tsx
  const jumpToSentence = async (targetIndex: number) => {
    if (!playerRef.current) {
      await handlePlaySequential(targetIndex);
      return;
    }
    setIsPlaying(true);
    isPlayingRef.current = true;
    await playerRef.current.jumpToSentence(targetIndex);
  };
```

### 3) Bundle Loading & Timing Loop
- `BundleAudioManager.loadBundle()` constructs a new `Audio`, computes clamped `durationScale`, precomputes scaled per‑sentence boundaries, then resolves when ready.

```260:292:lib/audio/BundleAudioManager.ts
      const onCanPlay = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        this.currentAudio = audio;
        this.currentBundle = bundle;
        const metaDuration = (bundle.sentences && bundle.sentences.length > 0)
          ? Math.max(...bundle.sentences.map(s => s.endTime))
          : bundle.totalDuration;
        const realDuration = audio.duration || bundle.totalDuration;
        if (metaDuration > 0 && realDuration > 0 && Number.isFinite(realDuration)) {
          const rawScale = realDuration / metaDuration;
          this.durationScale = Math.min(1.10, Math.max(0.85, rawScale));
        } else {
          this.durationScale = 1;
        }
        this.scaledSentences.clear();
        bundle.sentences.forEach(sentence => {
          this.scaledSentences.set(sentence.sentenceIndex, {
            startTime: sentence.startTime * this.durationScale,
            endTime: sentence.endTime * this.durationScale
          });
        });
        if (process.env.NEXT_PUBLIC_AUDIO_DEBUG === '1') {
          console.log(`🧭 Duration calibration: meta=${metaDuration.toFixed(2)}s real=${realDuration.toFixed(2)}s scale=${this.durationScale.toFixed(3)}`);
        }
        if (process.env.NEXT_PUBLIC_AUDIO_DEBUG === '1') {
          console.log(`✅ Bundle loaded: ${bundle.bundleId} (${bundle.totalDuration.toFixed(1)}s)`);
        }
        resolve();
      };
```

- `startSequentialMonitoring()` uses requestAnimationFrame, compares raw `currentTime` to pre‑scaled boundaries, applies a suppression window to avoid immediate skips, and advances sentences.

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

### 4) State Coordination
- `app/featured-books/page.tsx` manages UI state and delegates to manager/player; `isPlayingRef` prevents closure issues; bundle auto‑advance is coordinated via `onBundleComplete`.
- `BundleAudioManager.resume()` restores playback and restarts sequential monitoring; suppression window is used to prevent immediate transitions after resume.

```450:470:lib/audio/BundleAudioManager.ts
  async resume() {
    if (this.currentAudio && this.currentAudio.paused) {
      this.isPlaying = true;
      this.isPlayingRef.current = true;
      await this.currentAudio.play();
      if (this.currentBundle && this.currentSentenceIndex >= 0) {
        // Determine active sentence and restart monitoring
        const rawTime = this.currentAudio.currentTime;
        const highlightTime = rawTime + this.highlightLeadSeconds;
        const epsilon = 0.12;
        let activeIndex = this.currentSentenceIndex;
        for (const [idx, times] of Array.from(this.scaledSentences.entries()).sort((a, b) => a[0] - b[0])) {
          if (times.startTime - epsilon <= highlightTime) {
            activeIndex = idx;
          } else {
            break;
          }
        }
        const activeSentence = this.currentBundle.sentences.find(s => s.sentenceIndex === activeIndex) || this.currentBundle.sentences[0];
        this.currentSentenceIndex = activeSentence.sentenceIndex;
        this.options.onSentenceStart?.(activeSentence);
        this.suppressTransitionsUntil = performance.now() + 120;
        this.startSequentialMonitoring(this.currentBundle, this.currentSentenceIndex);
      }
    }
  }
```

---

## Gaps Identified
1) Preloading: No active preloading of adjacent bundles. For <250ms perceived jump time across 902 bundles, preloading ±1 (or ±2 adaptively) is recommended.
2) Atomic switches: No `switchToken`/operation token to cancel stale in‑flight loads on rapid jumps; potential race conditions under quick successive jumps.
3) Suppression on jump: Suppression window is applied after resume; explicitly applying 120–200ms suppression after jumps would further reduce immediate double‑advance.
4) Memory/backpressure: No abort/cancel hooks for preloads on far jumps; no integration with device capability heuristics.

---

## Implementation Plan (References GPT‑5 Architecture)
Target: 902 bundles scale, <250ms jump targets.

1) Orchestrator‑first jumping (AudioBookPlayer)
- Add `switchToken` increment per jump; pass token through load/seek; ignore late callbacks with stale tokens.
- On `jumpToSentence(targetIndex)`: if bundle changes, stop audio, load new bundle, seek to `scaledStart`, apply 120–200ms suppression, start monitoring; update highlight immediately.

2) Preloading (Option E)
- Maintain a moving window of preloads around current bundle (±1 default, ±2 adaptively based on observed jump latency and device capacity).
- Use `Audio` with `preload='auto'` and `load()` to warm cache; abort and discard preloads when user jumps far.

3) Stability and sync guarantees
- Keep RAF monitoring; compare raw `currentTime` vs pre‑scaled boundaries.
- Lead (−500ms for ElevenLabs) only affects advancement/highlighting, not completion.
- Clamp `durationScale` to [0.85, 1.10] (already implemented) and optionally auto‑tune a tiny offset `b` on first sentence per bundle if consistent bias >120ms.

4) Metrics & thresholds
- Collect jump latency (click→play), drift (ms) per sentence, and skip rate.
- Acceptance: median drift <100ms, P95 <250ms; jump P95 <250ms; 0 skips under 50 pause/resume cycles and 20 random jumps.

5) Integration points
- `AudioBookPlayer.ts`: implement preloader, `switchToken`, and adaptive preload radius.
- `BundleAudioManager.ts`: expose a cancellable `loadBundle` with token; add optional `suppressTransitionsUntil` setter for jumps.
- `app/featured-books/page.tsx`: route all user jumps through `playerRef.jumpToSentence()`; optionally show a minimal spinner if readiness >250ms.

---

## Conclusion
The current system has the essential pieces: a global sentence map, RAF‑based timing, calibrated boundaries, and a robust sequential player. To reach professional‑grade sentence jumping, add atomic jump coordination with `switchToken`, implement adjacent bundle preloading with adaptive radius, and apply suppression on jumps. These changes, aligned with GPT‑5 recommendations, will deliver sub‑250ms perceived jumps and stable sync at 902‑bundle scale.



