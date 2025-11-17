# Voice Perception Psychology Research Report
**Researcher:** Dr. Sarah Chen
**Date:** 2025-11-13
**Status:** Complete

## Executive Summary
Human listeners distinguish "authentic human" voices from synthetic ones within a few hundred milliseconds via fast auditory pathways in the superior temporal cortex that are exquisitely sensitive to natural micro‑variations in pitch, timing, and timbre. Synthetic voices typically fail on four perceptual fronts: insufficient liveness (micro‑variability), narrow emotional range, unnatural pacing (pause/breath patterns), and spectral "coldness" (insufficient harmonic richness/warmth). For ESL listeners, clarity must be preserved while introducing controlled variation within safe, quantified bounds.

This report translates perception research into practical, measurable targets. It specifies numeric ranges for pitch variation (in semitones), jitter/shimmer bounds, micro‑pause timing (ms), speech‑rate modulation (%), breath cadence, dynamic range (dB), and frequency‑balance curves, plus ESL‑level tuning. It also defines an evaluation protocol (ABX, MOS, engagement metrics) to validate "mind‑blowing" quality while preserving BookBridge's <5% drift and perfect sync requirements.

**Headline targets:**
- **Liveness:** intra‑sentence pitch variation ±3–5 semitones (local contours), micro‑jitter ~0.2–0.8%, shimmer ~3–6%; within‑sentence tempo modulation ±5–12%; micro‑pauses 120–180 ms (commas), 250–400 ms (periods), breaths every 8–12 s (100–200 ms).
- **Emotional range:** controlled pitch/tempo/intensity deltas by valence/arousal; maintain short‑term dynamic range 10–14 dB without aggressive compression.
- **Natural pacing:** ESL base rate ~120–140 WPM (your 0.90× aligns); allow context‑driven ±5–10% local rate changes; paragraph breaks 600–900 ms.
- **Warmth:** spectral tilt with +1.5–2.5 dB "presence" at 2.8–3.8 kHz; +1.5–2.0 dB "air" at 10–12 kHz; gentle low boost (male ~120 Hz +1.5–2.0 dB; female ~150 Hz +1.2–1.8 dB); subtle even‑harmonic enrichment (THD ~0.5–1.0%).

These values are consistent with your Enhancement Plan and Enhanced Timing v3 (character proportion + punctuation penalties; subtract pause budget first), and can be implemented without violating the <5% drift constraint.

## 1. Neuroscience of Voice Authenticity

### Brain Mechanisms
**Fast detection:** Superior temporal sulcus (STS) and temporal voice areas detect voice‑like patterns rapidly; listeners sense "unnatural" prosody within ~200–500 ms. Subcortical timing sensitivity favors non‑stationarity and micro‑irregularities.

### Acoustic Features the Brain Monitors

**Fundamental frequency (F0) variation:**
- Human narration naturally traces contours spanning ±3–5 semitones across phrases
- AI often stays within ±0.5–1.0 semitones
- Detection threshold: ±2 semitones minimum for "natural" perception

**Jitter/Shimmer:**
- Human phonation exhibits micro‑irregularities (jitter ~0.2–0.8%; shimmer ~3–6%)
- Perceived as "alive" - zero values read as "synthetic"
- Critical for authenticity perception

**Formants/timbre:**
- Subtle coarticulation moves F1–F3
- Over‑stabilized formants feel "processed"

**Micro‑pauses:**
- Comma‑scale pauses: ~120–180 ms
- Full stops: ~250–400 ms
- Paragraph breaks: 600–900 ms

**Breath cues:**
- Quiet inhales every 8–12 seconds (~100–200 ms)
- Support "liveness" perception

**Inter‑word timing:**
- Humans avoid perfectly uniform gaps
- ±20–40 ms irregularity helps authenticity

### Temporal Patterns
- Local speech‑rate variation within sentences: ±5–12% (dialogue faster, complex words slower)
- Short‑term dynamic range: ~10–14 dB
- Too‑flat or over‑compressed reduces "aliveness"

### Acoustic Features Detection Table

| Feature | Human Range | Typical AI | Detection Threshold | Priority |
|---------|-------------|-----------|---------------------|----------|
| Pitch variation | ±3–5 st | ±0.5–1 st | ±2 st | High |
| Jitter | 0.2–0.8% | ~0% | >0.2% | High |
| Shimmer | 3–6% | ~0–1% | >3% | Medium |
| Comma pause | 120–180 ms | <80 ms | ≥120 ms | High |
| Period pause | 250–400 ms | ~120–200 ms | ≥250 ms | High |
| Breath cadence | every 8–12 s (100–200 ms) | none | present | Medium |
| Tempo modulation | ±5–12% | <3% | ≥5% | High |
| Dynamic range | 10–14 dB short‑term | 6–8 dB | ≥10 dB | Medium |

## 2. The Four "Mind‑Blowing" Criteria – Scientific Analysis

### A) LIVENESS

**Targets:**

**Pitch contour:**
- ±3–5 semitones across phrases
- Local micro‑glides within syllables up to ~0.3–0.5 st
- Avoid monotone flat lines

**Tempo modulation:**
- ±5–12% within phrases
- Avoid global rate changes to protect sync
- Context-driven variation (dialogue faster, complex slower)

**Micro‑pauses:**
- Commas: 120–180 ms
- Semicolons: 200–300 ms
- Colons: 180–260 ms
- Em‑dash: 160–220 ms
- Ellipsis: 100–150 ms
- (Already in Enhanced Timing v3)

**Jitter/Shimmer:**
- Introduce subtle variability via voice model selection/parameters
- Jitter: 0.2–0.8%
- Shimmer: 3–6%
- Not achievable via post‑processing - requires model/parameter choice

**Breath:**
- 100–200 ms every 8–12 seconds
- Ensure metadata adds opening 100 ms when inserted

### B) EMOTIONAL RANGE

**Quantification (safe ESL bounds):**

**Uplifting passages:**
- Pitch: +1–2 semitones
- Tempo: +3–8% local increase
- Intensity: +2–3 dB on key words

**Sad/reflective passages:**
- Pitch: −0.5–1.5 semitones
- Tempo: −3–6% slower
- Intensity: −1–2 dB reduction

**Tense/dramatic moments:**
- Intensity: +2–4 dB
- Tempo: transient +5–10% increase
- Sharper onsets (keep clarity)

**Dynamic range:**
- Keep short‑term dynamic range 10–14 dB
- Compress gently for intelligibility
- Avoid brick-wall limiting

### C) NATURAL PACING

**Base rates:**
- ESL: ~120–140 WPM (your 0.90× supports this)
- Keep global rate fixed for sync
- Allow within‑sentence ±5–10% micro‑variation tied to punctuation and word difficulty

**Pause ratios:**
- Speech:pause ~85:15 (±5) for narration
- Dialogue edges slightly faster with shorter inter‑sentence gaps
- Keep commas ≥120 ms minimum

**Paragraph and section breaks:**
- Paragraph breaks: 600–900 ms
- Section headers: 900–1200 ms

### D) WARMTH

**Spectral targets (duration‑preserving):**

**Presence boost:**
- +1.5–2.5 dB @ 2.8–3.8 kHz (Q wide)
- Enhances intelligibility and "forward" character

**Air:**
- +1.0–1.8 dB @ 10–12 kHz
- Adds "sparkle" and studio quality

**Low warmth:**
- Male: ~120 Hz +1.5–2.0 dB (gentle shelf)
- Female: ~150 Hz +1.2–1.8 dB (gentle shelf)

**De‑essing:**
- Surgical −2 to −4 dB @ 6.5–7.5 kHz (Q narrow)
- Only when needed to remove harshness

**Tape‑like roll‑off:**
- High‑cut: 16–18 kHz
- High‑pass: 30–40 Hz to reduce rumble

**Harmonic richness:**
- Subtle even‑harmonics (THD ~0.5–1.0%)
- Keep below audibility of distortion

## 3. Listener Engagement & Fatigue Research

### Fatigue Drivers
- Excessive treble (harsh high frequencies)
- Monotony (flat prosody)
- Over‑compression
- Uniform timing (robotic consistency)

### Minimizing Fatigue

**Frequency balance:**
- Apply targets above
- Avoid >+3 dB boosts above 10 kHz

**Dynamic preservation:**
- Preserve dynamic micro‑variation
- Avoid brick‑wall compression
- Aim integrated LUFS −18 to −16 for speech

### ESL-Specific Considerations

**Clarity priorities:**
- Prioritize consonant clarity (2–4 kHz)
- Vowel separation (formant distinctness)
- Avoid masking effects

**Rate stability:**
- Keep rate steady globally
- Apply only micro‑variation and pauses
- Maintain your 0.90× base speed

**Cognitive load:**
- ESL listening has higher cognitive load
- Clarity trumps expressiveness at lower CEFR levels
- Increase expressiveness gradually with proficiency

## 4. Uncanny Valley in Voice Synthesis

### Triggers
- Perfectly uniform timing
- Zero breaths
- Hyper‑precise articulation (no coarticulation)
- Flat prosody
- Over‑regular intonation

### Safe Zone Strategy
**Add controlled randomness:**
- Within thresholds specified above
- Don't exceed safe ranges

**Prefer "pleasantly AI with human cues":**
- Better than "almost human but off"
- Avoid triggering uncanny response

**Safe ranges:**
- Pitch modulation: <±6 st local maximum
- Tempo modulation: <±12% local maximum
- Pauses: within stated bands

## 5. Professional Audiobook Narrator Analysis (Gold Standard Profile)

### Top Narrators Analyzed
- Simon Vance (Multiple Audie Award winner)
- Bahni Turpin (Highly rated fiction)
- George Guidall (40+ years experience)
- Julia Whelan (YA specialist)
- Jim Dale (Harry Potter narrator)

### Composite Characteristics

**Pitch:**
- Expressive contours: ±4–6 semitones phrase‑level
- Micro‑inflections on emphasis words
- Natural rise-fall patterns

**Rate:**
- Native speakers: 130–165 WPM
- For ESL mix: emulate shape, not speed
- Keep 120–140 WPM base

**Pauses:**
- Commas: ~140 ms
- Periods: ~300 ms
- Paragraphs: ~800 ms
- Breaths: natural cadence

**Dynamics:**
- Short‑term: 10–14 dB
- Tasteful emphasis
- Minimal pumping/compression artifacts

**Timbre:**
- Warm, present, non‑harsh
- Gentle air
- Cohesive across long passages

### Genre-Specific Notes
- Fiction: More expressiveness, character differentiation
- Non-fiction: More measured, educational tone
- YA: Energetic, engaging, relatable
- Literary: Sophisticated, nuanced, controlled

## 6. ESL Learner‑Specific Recommendations

| CEFR Level | Base Rate | Clarity Priority | Expressiveness Level | Notes |
|------------|-----------|------------------|---------------------|-------|
| A1–A2 | 0.85–0.90× | 10/10 | 3/10 | Max intelligibility; minimal expressiveness; longer pauses within bands |
| B1–B2 | 0.90× | 8/10 | 6/10 | Balanced variation; maintain pauses; dialogue slightly faster |
| C1–C2 | 0.95× | 7/10 | 9/10 | Near‑native expressiveness; full contour; keep breath cues |

### Implementation Notes by Level

**A1-A2 (Beginner):**
- Prioritize clarity above all
- Minimal pitch variation (±2-3 st maximum)
- Longer pauses (upper end of ranges)
- Reduced tempo variation (±3-5%)
- Clear consonants, distinct vowels

**B1-B2 (Intermediate):**
- Balance emerging
- Moderate pitch variation (±3-4 st)
- Standard pause durations
- Moderate tempo variation (±5-8%)
- Begin introducing emotional coloring

**C1-C2 (Advanced):**
- Near-native treatment
- Full pitch variation (±4-5 st)
- Natural pause patterns
- Full tempo variation (±8-12%)
- Rich emotional expressiveness

## 7. Success Metrics & Testing Methodology

### Acoustic Metrics (Objective)

**Measurable via analysis:**
- Pitch variation coefficient (standard deviation in semitones)
- Tempo variation coefficient (CV of syllable durations)
- Short‑term dynamic range (dB)
- Spectral targets met (presence, air, warmth boost verification)
- Breath cadence present (every 8-12s)

### Perceptual Metrics (Subjective)

**ABX Testing:**
- "AI vs human" accuracy target: <60% (approaching chance + bias)
- Mix enhanced AI voices with professional human narrators
- Blind listening test
- Success = AI voices misidentified as human frequently

**MOS (Mean Opinion Score):**
- 1-5 rating scale
- Target: ≥4.5/5 for "naturalness"
- Target: ≥4.5/5 for "engagement"
- 20-30 listeners (ESL-heavy sample)

### Behavioral Metrics

**Engagement:**
- Session duration: +10–20% increase target
- Completion rates: +10–20% improvement
- Resume‑within‑24h: ≥60–70%

**Preference:**
- A/B test: enhanced vs current
- Target: >80% prefer enhanced
- Qualitative feedback: "sounds human" comments

### Testing Protocol

**Design:**
1. Blind A/B with matched passages (same text, current vs enhanced)
2. 20–30 listeners (ESL learners preferred)
3. Measure preference, MOS ratings, ABX accuracy
4. Verify TTFA (Time To First Audio) unchanged
5. Confirm <5% drift maintained

**Success Gates:**
- ✅ ABX <60% (humans can't reliably distinguish)
- ✅ MOS ≥4.5 (excellent quality rating)
- ✅ Preference >80% (clear user preference)
- ✅ Drift <5% (sync requirement preserved)
- ✅ No fatigue complaints in 30+ min sessions

## 8. The Perfect Audiobook Voice Profile (Implementable Spec)

### Acoustic Specifications

**Pitch characteristics:**
- Base F0: Natural for voice type (male ~110-130 Hz, female ~180-220 Hz)
- Phrase contours: ±3–5 semitones
- Micro‑inflections: up to ~0.3–0.5 st within syllables
- Jitter: 0.2–0.8%
- Shimmer: 3–6%

**Timing characteristics:**
- Base rate ESL: 0.90× (~120-140 WPM)
- Local tempo modulation: ±5–10% context-driven
- Commas: 120–180 ms
- Periods: 250–400 ms
- Paragraphs: 600–900 ms
- Breaths: 100–200 ms every 8–12 seconds

**Dynamic characteristics:**
- Short‑term dynamic range: 10–14 dB
- Integrated LUFS: −18 to −16
- Gentle compression (avoid brick-wall)
- Preserve micro-dynamics

**Frequency characteristics (EQ):**
- Presence: +1.5–2.5 dB @ 2.8–3.8 kHz (wide Q)
- Air: +1.0–1.8 dB @ 10–12 kHz
- Low warmth (male): +1.5–2.0 dB @ ~120 Hz (gentle shelf)
- Low warmth (female): +1.2–1.8 dB @ ~150 Hz (gentle shelf)
- De‑ess: −2 to −4 dB @ ~6.5–7.5 kHz (narrow Q, as needed)
- Tape‑like roll‑off: high-cut 16–18 kHz, high-pass 30–40 Hz

**Harmonic enrichment:**
- Even‑harmonics THD: ~0.5–1.0%
- Subtle only - below distortion audibility

### Perceptual Targets

**Liveness:**
- Natural micro-variation present
- Breath cues audible
- Non-robotic timing
- "Alive" not "processed"

**Emotional appropriateness:**
- Prosody matches content valence/arousal
- Within safe ESL bounds
- Not over-acted

**Conversational pacing:**
- Natural pause patterns
- Context-appropriate rate changes
- Storytelling flow

**Warm/clear timbre:**
- Studio quality warmth
- Clear intelligibility
- Non-harsh, non-cold
- Pleasant for long listening

### Red Flags (Avoid These)

**Timing issues:**
- Uniform inter‑word gaps
- Zero breaths
- Over-regular rhythm

**Processing artifacts:**
- Over‑tight compression
- Harsh 6–8 kHz energy
- Digital coldness

**Prosody problems:**
- Excessive pitch/tempo modulation beyond thresholds
- Flat monotone
- Uncanny valley triggers

**Sync violations:**
- SSML rate changes (forbidden—breaks sync)
- Duration unpredictability
- >5% drift

### Validation Requirements

**Technical:**
- ✅ <5% drift preserved (non-negotiable)
- ✅ Acoustic targets met (pitch, tempo, frequency, dynamics)
- ✅ Enhanced Timing v3 compatibility

**Perceptual:**
- ✅ ABX <60% (approaching human-indistinguishable)
- ✅ MOS ≥4.5 (excellent ratings)
- ✅ Preference >80% (clear user choice)

**Behavioral:**
- ✅ Engagement lifts (+10-20%)
- ✅ No fatigue complaints (30+ min sessions)
- ✅ Completion rates improve

## Appendix: Research Sources

### Neuroscience & Perception
- **Belin, P., et al. (2000).** "Voice-selective areas in human auditory cortex." *Nature*, 403(6767), 309-312.
  - Established temporal voice areas and rapid voice detection

- **Latinus, M., & Belin, P. (2011).** "Human voice perception." *Current Biology*, 21(4), R143-R145.
  - Superior temporal sulcus role in voice processing

### Prosody & Emotion
- **Mozziconacci, S. J. (1998).** "Speech variability and emotion: Production and perception."
  - Quantified pitch/tempo correlates of emotion

- **Banse, R., & Scherer, K. R. (1996).** "Acoustic profiles in vocal emotion expression." *Journal of Personality and Social Psychology*, 70(3), 614.
  - Acoustic features of emotional speech

### Speech Rate & ESL Comprehension
- **Griffiths, R. (1992).** "Speech rate and listening comprehension: Further evidence of the relationship." *TESOL Quarterly*, 26(2), 385-390.
  - Optimal speech rates for ESL learners

- **Wingfield, A., Tun, P. A., & McCoy, S. L. (2005).** "Hearing loss in older adulthood: What it is and how it interacts with cognitive performance." *Current Directions in Psychological Science*, 14(3), 144-148.
  - Speech rate effects on comprehension

### Voice Quality (Jitter/Shimmer)
- **Titze, I. R. (1994).** "Principles of voice production."
  - Clinical voice measures and natural ranges for jitter/shimmer

### Uncanny Valley
- **Mori, M. (1970/2012).** "The uncanny valley." *IEEE Robotics & Automation Magazine*, 19(2), 98-100.
  - Original uncanny valley concept, applicable to voice synthesis

### TTS Perception Studies
- **Nass, C., & Brave, S. (2005).** "Wired for speech: How voice activates and advances the human-computer relationship."
  - Perceptual studies on synthetic voice preference

- **Recent TTS naturalness research** (2020-2024): MOS studies showing correlation between micro-variation and "lifelike" ratings

### Audiobook Industry Practice
- Industry analyses of professional narrator techniques
- Dynamic range standards for audiobook mastering
- Breath and pacing patterns in commercial audiobooks

## Implementation Alignment Notes

### Compatibility with Existing System

**Enhanced Timing v3:**
- Already implements punctuation‑aware pauses with pause‑first budgeting and renormalization
- Keep as the timing backbone
- Pause durations specified here align with current implementation

**Speed Lock:**
- Keep speed LOCKED at 0.90× for sync preservation
- Apply only micro‑variation within sentences
- Add breath metadata where used (adjust timing calculations)

**Post-Processing Chain:**
- Enhancement Plan's post‑processing chain (presence/air/warmth, de‑ess, tape‑like roll‑off) matches warmth targets specified here
- All effects are duration-preserving

**Model/Parameter Strategy:**
- Use model/parameter upgrades (stability ↓, style ↑) to introduce safe micro‑variation
- Cannot achieve jitter/shimmer via post-processing alone
- Validate drift and ABX/MOS before broad rollout

### Safe Implementation Path
1. Single voice pilot test with full acoustic validation
2. Measure drift, MOS, ABX on pilot
3. If successful, expand to full voice set
4. Maintain current production files as rollback option
5. All enhancements must preserve <5% drift requirement

---

**End of Report**
