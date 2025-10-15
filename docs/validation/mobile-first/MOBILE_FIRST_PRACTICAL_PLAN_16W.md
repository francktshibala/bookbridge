## Practical Mobile-First Plan (16 weeks, MVP at 8 weeks, <$200K)

Goal: Deliver tangible improvements by Week 8 and a robust v1 by Week 16, staying within $150–200K. Minimize risk via incremental milestones with clear rollback at each step.

---

### Core Strategy
- Start by optimizing the existing chunk reader to remove 0.5s gaps and improve mobile performance now.
- Ship a Minimum Viable Continuous Experience (MVCE) that virtualizes paragraphs (not per-sentence) and uses sentence-timed audio for sync, deferring full sentence virtualization to v2.
- Use a multi-audio HTMLAudio pool for gapless handoffs; Web Audio only for timing and micro-fade.

---

### MVP Definition (delivered by Week 8)
- Gapless audio between chunks and intra-chunk sentences using a 2–3 element audio pool.
- Predictive prefetch for next sentences/chunk, network-adaptive (reuse existing `lib/predictive-prefetch`, scheduler).
- Paragraph-level virtualized reader (TanStack Virtual) with sliding window capped for mobile memory targets (≤100MB on 2GB devices).
- Render-light highlighting (overlay/throttled) driven by audio time; no per-word DOM spans.
- Clear rollback: toggle to legacy chunk reader.

Deferred to v2 (post-16 weeks): full sentence virtualization, advanced offline bundles, comprehensive accessibility polish beyond essential items, and broad content backfill.

---

### Phasing Overview

Weeks 1–2: Stabilize & Bootstrap
- Remove 0.5s chunk transition delay by preloading next chunk audio + text; maintain current UI.
- Implement audio context unlock on first tap; persist capability flag.
- Add feature flag framework: `continuousReaderEnabled`, `gaplessAudioEnabled`.
Rollback: flip flags off instantly.

Weeks 3–4: Gapless Audio MVP
- Implement multi-audio element pool with 5–20ms crossfade; schedule handoff via rAF.
- Wire `InstantAudioPlayer` to pre-bind next src; strict cleanup of old elements.
- Add basic drift detection and resync hooks.
Rollback: fallback to single-element playback.

Weeks 5–6: Virtualized Paragraph Reader
- Introduce TanStack Virtual with paragraph rows; target 150–300 visible paragraphs.
- Sliding-window state that preserves reading position; gentle auto-scroll.
- Render-light highlighting overlay throttled to ~10 Hz.
Rollback: route flag to legacy chunk page.

Weeks 7–8: Predictive Prefetch + Mobile Hardening
- Integrate `predictive-prefetch` + `intelligent-resource-scheduler` with device-tier limits.
- Memory caps and DOM budgets; test on 2GB devices; fix jank; capture metrics via `performance-monitoring-system`.
- Ship MVCE to 10–20% of users behind feature flag; monitor.
Rollback: disable features per cohort.

Weeks 9–12: v1 Polish & Reliability
- IndexedDB caching with simple LRU eviction; quota-safe writes.
- Robust recovery for network blips; skip-ahead on repeated failures.
- CEFR switching that preserves position via paragraph anchors.
Rollback: disable per-feature.

Weeks 13–16: Performance & Limited Sentence Granularity
- Add optional sentence groups (3–5 sentences per asset) where available to improve timing precision without exploding file count.
- Expand device farm coverage; accessibility passes for motion/contrast/dyslexia font.
- Gradual rollout to 50–100%.
Rollback: revert to paragraph-only mode, keep audio pool.

---

### Technical Priorities (Top 3 for Mobile)
1) Gapless audio handoff with pre-binding next segment and strict cleanup.
2) Virtualized reader with small DOM window and throttled highlighting.
3) Predictive prefetch tuned by network and device tier.

Deferrable to v2:
- Full sentence virtualization everywhere.
- Rich offline bundles and advanced cache orchestration.
- Extensive A/B UX experiments; advanced analytics dashboards.

---

### Budget (rough, USD)
- Engineering (FE + audio): $110–140K
- QA/device farm/accessibility: $20–30K
- Limited content pipeline (sentence groups for select books): $10–15K
- Contingency (~15%): $25–30K
Total: $165–215K; aim to keep scope to $180–195K by limiting v1 content backfill and advanced offline features.

Cost levers: keep sentence grouping to pilot titles; paragraph virtualization first; re-use existing libs; stagger device farm time.

---

### Rollback Plan per Phase
- Feature flags for each capability; runtime toggles.
- Separate routes/components for legacy vs MVCE.
- No destructive migrations in the first 8 weeks; keep data read-only additions.
- Automated canary checks: audio underruns, heap >100MB, FPS <50 sustained → auto-disable feature.

---

### Milestones & Exit Criteria
- Week 2: 0.5s gaps removed; audio unlock working; flags in place.
  - Exit: Next-chunk audio starts <200ms, no page jank regressions.
- Week 4: Gapless audio MVP.
  - Exit: Seamless handoff; underruns <1 per 30min; user gesture respected.
- Week 6: Virtualized paragraph reader.
  - Exit: 55–60fps scroll on iPhone SE/Android 8+; heap ≤100MB.
- Week 8: MVCE ship (10–20%).
  - Exit: Error budgets met; positive user signals; ready to scale.
- Week 12: Reliability v1.
  - Exit: Stable long sessions; recoveries verified; CEFR position preserved.
- Week 16: v1 with sentence groups for pilot titles; wider rollout.
  - Exit: Quality parity with goals; plan v2 (full sentence virtualization).

---

### Implementation Notes (Repo Alignment)
- Extend `components/audio/InstantAudioPlayer.tsx` with audio pool + handoff; keep external `isPlaying` control.
- Add paragraph virtualization component using TanStack Virtual; integrate existing `AutoScrollHandler` and overlay highlighter.
- Wire `lib/predictive-prefetch.ts` and `lib/intelligent-resource-scheduler.ts`; set conservative concurrency on mobile.
- Capture metrics via `lib/performance-monitoring-system.ts`; add auto-disable hooks.


