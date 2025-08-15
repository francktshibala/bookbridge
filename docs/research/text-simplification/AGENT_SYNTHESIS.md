# Text Simplification — Cross‑Agent Synthesis and Action Plan

## Executive Summary
Goal: Deliver reliable CEFR‑aligned simplification for classic public‑domain literature (Austen, Dickens, Brontë, Tolstoy, Melville, Twain, Hawthorne, Conan Doyle, Stevenson, Early Modern, Victorian/Regency, 19th‑century American) with preserved meaning and <2s P95 latency.

Consensus:
- Model choice should be era/style‑aware with conservative prompting.
- Similarity gate must be era‑calibrated with a fast hybrid validator and a narrow “acceptable band.”
- Latency target requires DB‑first content, precompute/caching per book×level×chunk, and prefetch/streaming fallbacks.

This plan integrates Agent 1 (Model/Prompting), Agent 2 (Evaluation), Agent 3 (Performance) into a single roadmap.

---

## Model Selection & Routing (from Agent 1)
- Default for archaic/Early Modern: Claude 3.5 Sonnet (temp 0.2–0.35) with conservative edit rules.
- Speed tier for A1–B1 and non‑archaic narrative: Claude 3.5 Haiku (temp 0.2–0.3).
- Alternative for B2–C2 Victorian/19th‑century American: GPT‑4o with strict guardrails (negation/conditional/entity preservation).
- Era/style detection (light):
  - Early Modern signals: thou/thee/thy/thine; -eth/-est; o’er/e’en; inversion.
  - Regency/Victorian: long periodic sentences; legal/social lexicon (entailment, chaperone).
  - 19th‑century American: dialect spellings, colloquialisms (ain’t, reckon).
- Chunk sizing: A1–B1 Early Modern ~150–250 words; B2–C2 300–450 words; avoid splitting dialogue.

Prompting scaffolds (high‑level):
- Base CEFR simplification block (meaning preservation, conservative edits, CEFR constraints per level).
- Era adapters:
  - Early Modern: normalize archaisms; keep metaphors; modern SVO syntax.
  - Regency/Victorian: break periodic sentences; light inline gloss for A1–B1.
  - 19thC American: preserve dialectal voice; gloss blockers once at A1–B1.
- Safety rails + “more conservative” retry adapter for MAX_RETRIES.

---

## Evaluation & Similarity Gate (from Agent 2)
- Replace single 0.82 cut‑off with hybrid validator (<~130ms total):
  1) USE pre‑check (~30ms) to filter obvious failures.
  2) text‑embedding‑3‑large main score (~80ms) with era‑specific thresholds:
     - Victorian/Regency: 0.70 base (adjust −0.03 to −0.08 on formal/periodic passage types)
     - 19th‑century American: 0.75 base (adjust −0.02 to −0.10 for dialect/colloquial)
     - Modern: 0.82 base
  3) Rule checks (~20ms): negation/conditional, named entities/numbers, core nouns.
- Acceptable band: 0.78–0.82 only if all rule checks pass; mark quality = "acceptable".
- KPIs for validator: P95 < 500ms; FRR < 5%; FAR < 1%.

---

## Performance & Systems (from Agent 3)
- DB‑first content: store canonical text in `bookContent`; avoid on‑demand external fetch.
- Precompute per `bookId×level×chunkIndex` using workers/queue; extend existing `bookSimplification` with `originalTextHash`, `promptVersion`, `latencyMs`, `status`.
- Cache hierarchy: KV key = `simplify:book:{id}:lvl:{level}:chunk:{idx}:hash:{h}:pv:{v}`; TTL ~30d with refresh on read.
- Prefetch K+1/K+2 on client and server.
- Stream on rare cold misses; keep cold‑miss rate ≤ 2% of chunk requests.
- Targets: P95 ≤ 2s (cached path), TTFB ≤ 150ms, first tokens ≤ 400–700ms if streaming.

---

## Phased Implementation Plan

Phase 0 — Foundations (1–2 days)
- Migrate simplify path to DB‑first for content (read canonical from DB when available).
- Add era/style signal detector (regex/light heuristics) in simplify route for routing + chunk sizing.

Phase 1 — Quality & Safety (2–3 days)
- Introduce hybrid validator: USE pre‑check + embeddings + rule checks; wire era thresholds and acceptable band (0.78–0.82 with rule pass).
- Implement conservative retry adapter and temperature adjustments in retries.

Phase 2 — Performance (3–5 days)
- Add `bookLevelChunk` table and generate per‑level chunk maps.
- Expand `bookSimplification` schema (hash, promptVersion, latency/cost, status).
- Implement queue/worker precompute for first N chunks; prefetch K+1/K+2; KV shadow cache.
- Add telemetry for `ttfbMs`, `firstTokenMs`, `llmLatencyMs`, hitType, queue depth.

Phase 3 — Hardening & Rollout (2–3 days)
- Tune thresholds and chunk sizes by era/level using 8–20 passage bench.
- Set SLOs and alerts; feature flags for DB‑first/precompute.
- Ramp precompute to popular books and levels; measure cold‑miss rate and P95.

---

## Acceptance Criteria (Mapped)
- Works across classic prose (Victorian/Regency/19thC, Early Modern): Era‑aware routing + adapters + chunk tuning.
- Meaning preserved: Safety rails; rule checks on negation/conditionals/entities; conservative retry.
- Reliability of gate: Hybrid validator with era thresholds; acceptable band + rule pass.
- Latency: <2s P95 via DB‑first, precompute, KV cache, prefetch; streaming only on rare cold misses.
- KPIs tracked: similarity distributions, information retention, latency breakdown, cost per chunk.

---

## Decision Matrix (When to Use Which Model)
- Early Modern (strong archaic): Sonnet default; Haiku A1–A2; GPT‑4o optional B2–C2 pilot if similarity ≥ 0.85.
- Regency/Victorian: Haiku for A1–B1; Sonnet or GPT‑4o for B2–C2 (favor GPT‑4o when clarity gains outweigh minimal similarity deltas; always enforce rails).
- 19th‑century American: Sonnet default with dialect preservation; Haiku A1–A2; GPT‑4o case‑by‑case.

---

## Risks & Mitigations
- Meaning drift on metaphors: Keep metaphor with minimal gloss at low CEFR; enforce rails + retry.
- Dialect erasure: Preserve voice; gloss once at low levels.
- Invalidation complexity: Versioned keys with `promptVersion` and text hashes; TTL‑based phasing.
- Cost creep: Prefer Haiku where quality allows; precompute popular levels; cache aggressively.

---

## Concrete Changes (Code/Schema Pointers)
- `app/api/books/[id]/simplify/route.ts`: add routing, era detection, acceptable band, hybrid validator hook, prefetch enqueue.
- `lib/ai/claude-service.ts`: expose temperature/model hints; helpers to compose base + era + safety + retry blocks.
- Schema: add `bookContent`, `bookLevelChunk`; extend `bookSimplification` with identity hash/promptVersion/metrics.
- Infra: queue/worker for precompute; KV layer; telemetry plumbing.

---

## Next Steps (1‑Week Sprint Draft)
1) Implement era detector + routing + conservative retry (Day 1–2)
2) Add hybrid validator with era thresholds + acceptable band (Day 2–3)
3) DB‑first content reads + `bookLevelChunk` generation (Day 3–4)
4) Queue/worker precompute for first 10–20 chunks; KV cache; client/server prefetch (Day 4–6)
5) Bench 8–20 passage set; tune thresholds/chunk sizes; wire dashboards and SLOs (Day 6–7)

---

## References
- Agents:
  - `docs/research/text-simplification/agent-model-prompting.md`
  - `docs/research/text-simplification/agent-evaluation-metrics.md`
  - `docs/research/text-simplification/agent-performance-systems.md`
- Code & Docs:
  - `app/api/books/[id]/simplify/route.ts`
  - `docs/TEXT_SIMPLIFICATION_IMPLEMENTATION.md`
  - `lib/ai/claude-service.ts`
  - `app/library/[id]/read/page.tsx`
  - `lib/book-sources/*` 