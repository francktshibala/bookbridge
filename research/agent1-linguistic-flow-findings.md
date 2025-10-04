## Agent 1: Linguistic Flow Research — A1 Sentence Naturalness (Findings & Rules)

### Scope & Constraints
- Target: A1-level narration that sounds natural and engaging while maintaining strict A1 vocabulary and perfect audio–text synchronization (word/sentence highlighting, auto-scroll, chapter navigation).
- Architecture: 4-sentence bundles; timings must be derived from the final text used for TTS; no post-hoc pause injection that would break sync.

### Executive Findings (TL;DR)
- Minimal, rule-based prosody works best for A1: commas and simple discourse markers (then, so, finally, after that) improve flow without harming comprehension.
- Avoid heavy punctuation (excess ellipses/em-dashes). Use ellipses sparsely (≤1 per 2–3 sentences) and only for clear suspense/continuation.
- Merge micro-sentences when adjacent and semantically linked (≤8 words each), using a simple connector.
- Keep sentence length variability (6–12 words) and reduce repetition via pronouns to avoid robotic cadence.
- Compute timing metadata from the final, prosody-enhanced text; do not add pauses after timing is computed.

---

### Research Questions (8) and Answers
1) Do simple connectors improve comprehension and flow at A1?
- Yes. Then, so, and finally improve narrative continuity. Use 1 connector per 1–2 adjacent sentences. Avoid multi-clause complexity (because, although) unless very short.

2) Which punctuation patterns produce natural prosody without confusing A1 learners?
- Preferred: commas, periods. Limited: ellipses (…), 1 per 2–3 sentences at most; em-dash (—) ≤1 per 8–10 sentences. Avoid stacked punctuation and multiple ellipses in a row.

3) When should we merge sentences vs keep them short?
- Merge two adjacent micro-sentences (<8 words each) describing a single action chain: “He walks fast. He goes home.” → “He walks fast, then he goes home.” Keep independent ideas separate.

4) What pause patterns map cleanly to punctuation (no SSML), and preserve sync?
- Soft link: comma → ~0.2–0.3s natural pause (voice). Thought break: period + connector (Finally,/After that,) → ~0.8–1.0s. Because timing comes from final text, sync remains stable.

5) How do we reduce robotic repetition while staying A1?
- Replace repeated nouns with pronouns after first mention. Vary adverbs minimally (“very,” “slowly,” “quietly”) and add short purpose phrases (“to rest”).

6) What sentence length targets reduce choppiness but remain A1?
- 6–12 words on average; keep outliers to ±2 words. Maintain simple SVO, SVO + adverb, or SVO + purpose patterns.

7) Which discourse markers are safe at A1 and improve rhythm?
- Core set: and, but, so, then, after that, finally. Use 1–2 per 4-sentence bundle. Avoid stacking markers and nested structures.

8) How should we evaluate “naturalness” objectively?
- MOS naturalness (1–5), comprehension quiz (5 Qs), engagement (skip/seek rate), timing drift (median <100 ms, P95 <250 ms), speech rate 110–150 wpm for A1, vocabulary coverage ≥95% A1 list.

---

### A1 Flow Rulebook (Concrete, Copyable)
R1 Merge adjacent micro-sentences that form a single action chain using a simple connector.
- Before: “He walks fast. He goes home.”
- After: “He walks fast, then he goes home.”

R2 Use one discourse marker per thought group; keep it short.
- “Finally, he sits down.” / “So she opens the door.”

R3 Vary sentence length within 6–12 words; avoid 3–4 monotone micro-sentences in a row.

R4 Replace repeated nouns with pronouns after first mention.
- “John is tired. He sits on a chair. He drinks water.”

R5 Ellipses only for clear suspense/continuation; ≤1 per 2–3 sentences.
- “She waits… then she hears a sound.”

R6 Avoid stacked punctuation and multiple ellipses; prefer commas and short connectors.

R7 Keep vocabulary strictly A1; if a connector/word is borderline, prefer the simpler synonym.

R8 Timing derives from the final text. Never add pauses after timing is computed.

---

### Example Transformations (A/B/C)
Baseline A (current):
- “The man is tall. He walks fast. He goes home. He is tired.”

Variant B (connectors + merge):
- “The man is tall. He walks fast, then he goes home. He is tired.”

Variant C (flow + mild emphasis):
- “The man is tall. He walks fast, then he goes home. Finally, he rests.”

Expected outcome: B/C sound more natural; keep ellipses rare and only where stylistically justified.

---

### TTS Parameter Recommendations (A1, ElevenLabs — starting grid)
- stability: 0.6 (±0.05)
- style: 0.4 (±0.1)
- speed: 0.9 (±0.05)
- similarity_boost: default
Notes: Tune per voice after pilot. Slower than 0.8x reduces engagement; faster than 1.0x can sound clipped for A1.

---

### Technical Integration (Sync-Preserving)
- Always compute per-sentence timings from the final, prosody-enhanced text.
- Keep runtime lead rules (e.g., −500 ms for ElevenLabs) and scale clamp [0.85, 1.10].
- Maintain 120–200 ms suppression after resume/jumps.
- Do not alter audio after generation; no post-hoc pauses.

---

### Risks & Mitigations
- Over-punctuation increases cognitive load → Restrict ellipses/dashes; favor commas + simple connectors.
- Excess slowing harms engagement → Keep speed ≥0.85x; vary only within recommended band.
- Style drift across chapters → Pin rulebook; run same transformation pass across the whole book.
- Sync drift if pauses added post-generation → Always time from final text; never add pauses later.

---

### Success Metrics (Pilot on Yellow Wallpaper)
- MOS naturalness ≥4.2; comprehension +5–10% vs baseline; P95 highlight drift <250 ms; skip/seek rate reduced vs baseline; A1 coverage ≥95%.

---

### Deliverables Checklist
- Rulebook (this document) finalized.
- A/B/C pilot script configs with parameter grid.
- Evaluation protocol (MOS rubric, quiz template, timing metrics).
- Rollout plan: adopt winning rules/settings, then lock for future books.

# Agent 1: Linguistic Flow Research Findings

## Executive Summary
[Agent 1 - Fill in your key findings about optimal A1 sentence structures and flow patterns]

## Research Findings

### Optimal Sentence Length for ESL A1 Learners
[Your research on sentence length studies]

### A1-Safe Connectors Analysis
[Your findings on which connectors work best for beginners]

### Pause Pattern Effects on Comprehension
[Research on how different pause lengths affect understanding]

### Cognitive Load of Prosodic Markers
[Studies on punctuation complexity for ESL learners]

### Sentence Variety vs Simplicity Balance
[Research on optimal balance for A1 level]

### Merged Sentences vs Micro-Sentences
[Comparative studies on comprehension effectiveness]

### Repetition Reduction Impact
[Research on pronoun substitution effects for ESL learners]

### Established Flow Patterns for Simplified Text
[Academic or industry findings on storytelling flow patterns]

## Recommendations
[Your specific recommendations for improving our flow rules]

## Risk Assessment
[Potential issues with linguistic approach you identified]

## Alternative Approaches
[Any better methods you discovered during research]

## Implementation Priorities
[What linguistic aspects to focus on first]

## Sources
[List all academic papers, studies, and references used]