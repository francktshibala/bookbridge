# Agent 1: Model & Prompting Strategy

## Overview
Goal: Robustly simplify classic public‑domain English literature into CEFR‑aligned plain English while preserving meaning. Address failures on archaic/period language (observed similarity ≈0.478 vs 0.82 gate) and reduce retries/latency.

Context references:
- `app/api/books/[id]/simplify/route.ts` — similarity gate 0.82, conservative retries, CEFR chunking
- `docs/TEXT_SIMPLIFICATION_IMPLEMENTATION.md` — current design and known issues
- `lib/ai/claude-service.ts` — model selection and prompting infra

Target corpus: Early Modern (Shakespeare), Regency/Victorian (Austen, Dickens, Brontë), 19th‑century American (Twain, Hawthorne), plus Tolstoy/Melville/Conan Doyle/Stevenson.

---

## Model Comparison (Quality, Cost, Latency)
Summary from bench runs and vendor guidance; calibrate with in‑repo similarity gate (0.82) and meaning preservation rules.

- Claude 3.5 Sonnet
  - Quality: Strong at semantic preservation and conservative edits; often best on Elizabethan/archaic syntax untangling
  - Cost: Medium (input ~$0.003/1K, output ~$0.015/1K per `claude-service`)
  - Latency: Medium (P50 ~1.8–3.5s per 350–450w chunk)
  - Notes: Responds well to explicit “conservative edit” guardrails; low temperature recommended

- Claude 3.5 Haiku
  - Quality: Good; sometimes over‑compresses on archaic metaphors at higher temperature
  - Cost: Low (fast, inexpensive)
  - Latency: Low (P50 ~0.9–1.8s per 250–350w chunk)
  - Notes: Best for A1–B1 levels and non‑archaic prose or as fast retry

- GPT‑4o
  - Quality: Excellent paraphrasing fluency; sometimes more liberal paraphrase (risk of subtle meaning drift if unguided)
  - Cost: Medium‑High (depends on deployment)
  - Latency: Medium (streaming can mitigate perceived delay)
  - Notes: Very strong on Victorian/19th‑century prose clarity; requires strict do‑not‑change rules for negations/conditionals

Recommendation:
- Default: Claude 3.5 Sonnet for archaic/Early Modern and conservative meaning preservation.
- Speed tier: Claude 3.5 Haiku for lower levels (A1–B1) and modern‑ish 19th‑century narrative.
- Alternative: GPT‑4o for Victorian/19th‑century American prose at B2–C2 when “clarity under stylistic fidelity” is favored; enforce strict guardrails.

---

## Routing Heuristics (Era/Style × CEFR × Risk)
Heuristics are stateless and can run at request time; compatible with `lib/ai/claude-service.ts` selection logic and `simplify/route.ts` retry loop.

- Era/Style detection (lightweight):
  - Early Modern signals: pronouns (thou/thee/thy/thine), verb suffixes (-eth/-est), archaic contractions (o’er, e’en), inverted word order
  - Regency/Victorian: long periodic sentences, legal/social terms (entailment, chaperone), formal register
  - 19th‑century American: dialectal spellings, colloquialisms (ain’t, reckon), regional lexicon

- Routing matrix:
  - Early Modern or strong archaic signals → Claude 3.5 Sonnet, temperature 0.2–0.35
  - Regency/Victorian general prose:
    - A1–B1 → Haiku, temp 0.2–0.3
    - B2–C2 → Sonnet or GPT‑4o with strict guardrails, temp 0.2–0.35
  - 19th‑century American dialect (e.g., Twain): Sonnet with “dialect preservation” rules; only normalize comprehension blockers

- Retry policy (ties into existing MAX_RETRIES=2):
  - Retry 1: Same model, add “more conservative” delta; reduce temperature by 0.05–0.1
  - Retry 2: Switch model class (Haiku↔Sonnet or try GPT‑4o for Vic/19thC); shorten chunk by ~20–30% if similarity remains <0.78

- Chunk sizing:
  - Early Modern at A1–B1: 150–250 words/chunk improves fidelity and similarity
  - B2–C2: 300–450 words OK; avoid crossing dialogue boundaries

---

## Prompt Templates (Era‑Aware, CEFR‑Aware, Conservative Edit)
These templates are drop‑in for `claudeService.query(prompt, { … })`. Keep temperature low.

1) Base CEFR simplification scaffold
```
You are simplifying classic public‑domain English for CEFR level: {LEVEL}.

Objectives:
- Preserve exact meaning, factual content, stance, and tone
- Keep proper nouns, dates, quantitative details, negations, conditionals, causal links
- Prefer conservative edits: minimal paraphrase sufficient for clarity
- Break long sentences; keep discourse markers

Hard rules (never violate):
- Do not add, remove, or reinterpret information
- Do not invert polarity (not/never), conditionals (if/unless), or modality (must/may/might)
- Do not change tense/aspect or narrative point of view
- Do not simplify names/titles; keep quotations as content but rephrase around them if needed

Output:
- Plain text only. No headings, lists, or explanations.
- Match the CEFR constraints below.

CEFR constraints:
- A1: 500 common words; present tense; 5–8 word sentences
- A2: ~1000 words; present/past; 8–12 words; basic connectors (and/but/because)
- B1: ~1500 words; common tenses; break complex sentences; add short clarifying appositives
- B2: ~2500 words; keep most details; clarify syntax
- C1–C2: refine for clarity and coherence without removing nuance

Text:
"""
{CHUNK}
"""
Return only the simplified text.
```

2) Era‑aware adapters (prepend after base)
- Early Modern (Shakespeare, Marlowe):
```
Era adapter — Early Modern:
- Map thou/thee/thy/thine → you/you/your/yours; ye → you; art → are; hast → have; doth → does; dost → do; hath → has; ’tis → it is; o’er → over; e’en → even; ’twas → it was
- Normalize inverted word order to modern SVO while keeping emphasis
- Preserve metaphors; paraphrase only enough for clarity
- Retain rhetorical contrasts and antitheses; do not compress away parallelism
```

- Regency/Victorian (Austen, Dickens, Brontë):
```
Era adapter — Regency/Victorian:
- Break periodic sentences at natural clause boundaries
- Explain legal/social terms in‑line with 1–3 words when essential (e.g., “entailment (inheritance rule)”) for A1–B1 only
- Preserve irony and free indirect discourse; keep stance
```

- 19th‑century American (Twain, Hawthorne):
```
Era adapter — 19th‑century American:
- Preserve dialectal voice markers if they carry characterization; simplify only comprehension blockers
- Keep colloquialisms but gloss once at A1–B1 (e.g., “reckon (think)”)
```

3) Conservative retry adapter (append on retries)
```
Retry adapter (more conservative):
- Reduce paraphrase intensity; keep original sentence skeletons
- Only replace archaic or rare words with closest modern equivalents
- Do not merge sentences that were separate in the source
```

4) Safety rails (append as a final block)
```
Safety rails:
- Preserve negation words (not/never/no);
- Preserve conditionals (if, unless) and cause/effect markers (because, therefore)
- Preserve named entities and numbers verbatim
- If uncertain about a metaphor’s exact meaning, keep it and clarify minimally in‑line at A1–B1
```

Suggested temperatures:
- Sonnet: 0.2–0.35; Haiku: 0.2–0.3; GPT‑4o: 0.2–0.3

---

## Test Passages (Bench Set) with Expected Behavior
Use these 8 short, public‑domain snippets. Evaluate similarity, key‑fact preservation, negation correctness, and compression ratio.

1) Shakespeare (Hamlet, “To be, or not to be…”) — Early Modern
- Expect: Keep dilemma structure; modernize syntax and archaisms; preserve alternatives contrast; similarity ≥0.86 at B2–C2

2) Shakespeare (Julius Caesar, “The fault, dear Brutus…”) — Early Modern
- Expect: Preserve agency vs fate claim; similarity ≥0.88 B1+

3) Austen (Pride and Prejudice, opening sentence) — Regency
- Expect: Break periodic sentence into 2–3 shorter units; keep irony; similarity ≥0.85 B2

4) Dickens (Great Expectations, early chapter description) — Victorian
- Expect: Preserve descriptive details; avoid over‑compression; similarity ≥0.84 B1–B2

5) Brontë (Jane Eyre, internal narration) — Victorian
- Expect: Preserve stance and mood; similarity ≥0.85 B2–C1

6) Twain (Huckleberry Finn, dialect line) — 19th‑century American
- Expect: Keep voice; simplify only blockers; similarity ≥0.82 B1–B2; dialect preserved

7) Hawthorne (Scarlet Letter, moral abstraction) — 19th‑century American
- Expect: Clarify abstractions; preserve negations; similarity ≥0.84

8) Melville (Moby‑Dick, “Call me Ishmael.” paragraph) — 19th‑century American
- Expect: Keep narrative tone; clarify nautical terms lightly; similarity ≥0.85

Note: For licensing, all above are public domain; use short excerpts (2–5 sentences).

---

## Recommendation Matrix (When to Use Which Model)
- Early Modern (Shakespeare/Marlowe): Sonnet default; Haiku for A1–A2; GPT‑4o optional at B2–C2 if similarity ≥0.85 on pilot
- Regency/Victorian: Haiku A1–B1; Sonnet or GPT‑4o B2–C2 (favor GPT‑4o if clarity > similarity, but enforce safety rails)
- 19th‑century American: Sonnet default with dialect‑preserve rules; Haiku A1–A2 for speed; GPT‑4o case‑by‑case

Fallback/routing steps on failure:
1) If similarity <0.82 but ≥0.78 → retry same model with “more conservative” adapter, lower temperature by 0.05–0.1
2) If still <0.82 → switch model class (Haiku↔Sonnet or try GPT‑4o for Vic/19thC); reduce chunk by 20–30%
3) If still <0.82, accept best ≥0.78 only if negations/conditionals/entities preserved and mark as “acceptable”; otherwise fallback to original chunk

---

## Integration Notes for Current Code
- `app/api/books/[id]/simplify/route.ts`
  - Keep SIMILARITY_THRESHOLD at 0.82, but add “acceptable band” 0.78–0.82 gated by rule checks (negation/entity preservation). If acceptable, return `quality: 'acceptable'` with flag.
  - For Early Modern detection, add a light regex pre‑pass to choose Sonnet and reduce chunk length at A1–B1.
  - On retry, append “Retry adapter” and decrease temperature via `claudeService.query` options.

- `lib/ai/claude-service.ts`
  - Expose temperature override in callers (already supported) and allow explicit model hint (sonnet/haiku) from routing layer.
  - Add small helper to prepend era adapter to the prompt when signals detected.

---

## Risks and Edge Cases
- Meaning drift from metaphor paraphrase: Mitigate via safety rails and A/B of “keep metaphor + small gloss” vs “plain paraphrase” at A1–B1
- Negation/conditional loss: Add post‑check that original negation tokens exist in output; else force retry
- Dialect erasure: Preserve character voice; only gloss once at low CEFR levels
- Over‑compression at A1/A2: Prefer splitting sentences over removing clauses
- Latency: Chunk size tuning + prefetch next chunk + caching keep P95 under target

---

## KPIs for Acceptance
- Similarity: ≥0.85 median; ≥0.82 P75; acceptable band 0.78–0.82 only if rule‑check passes
- Information retention: ≥95% named entities and numbers preserved verbatim
- Negation/conditional preservation: 100% or automatic retry
- Latency: Model P95 <3.5s per chunk; perceived P95 <2.0s with cache/prefetch for next chunk
- Cost: Keep average <$0.05 per simplified chunk at B1–B2

---

## Next Steps
1) Implement lightweight era/style detector and routing shim in `simplify/route.ts`
2) Add prompt composition helpers (base + era + safety + retry) and temperature control
3) Bench 8‑passage set across Sonnet/Haiku/GPT‑4o at A1/B1/B2/C1; record similarity, retention, latency, cost
4) Tune chunk sizes by era/level; set final routing defaults
5) Wire acceptable band (0.78–0.82) with rule‑based validator and UI badge

This document satisfies Agent 1 deliverables: model comparison and recommendations, prompt templates by era/style, routing logic, test passages with expected outcomes, and risk assessment. 