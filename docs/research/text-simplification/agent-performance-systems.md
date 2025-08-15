# Agent 3: Performance & Systems — <2s P95 Text Simplification

## Executive Summary
Goal: Reduce click-to-simplified latency from ~8–10s to <2s P95 for book chunk rendering. Strategy centers on DB-first content access, aggressive precompute and caching by `bookId × level × chunkIndex`, client/server prefetching, streaming fallbacks, and precise measurement.

Target latency budget (P95):
- TTFB: ≤ 150ms
- First simplified tokens available: ≤ 400ms (cache hit) / ≤ 700ms (rare cold-miss streaming)
- Complete chunk rendered: ≤ 2s (cache hit path; cold-miss handled via precompute to be rare)

Key levers:
- Store canonical book content in DB and serve from DB-first path (avoid API fetch on request)
- Pre-split into per-level chunks and precompute simplifications
- Cache results with strong keys and long TTL; invalidate via content hash/prompt version
- Prefetch next chunks (K+1, K+2) on both client and server
- Stream when strictly necessary; constrain cold-miss frequency via background jobs

---

## Current Constraints and Observations
- External content fetch adds +200–500ms vs DB; eliminate on hot path.
- AI call (simplification) dominates latency (~8–10s). Must be off the critical path via precompute.
- CEFR chunking already implemented; leverage deterministic chunk maps per level.
- Caching exists in Prisma `bookSimplification` but not comprehensively leveraged for precompute/prefetch.

---

## Target Architecture

```mermaid
flowchart LR
  subgraph Client
    UI[Reader UI]
  end

  subgraph Edge
    CDN[CDN/Cache]
  end

  subgraph App[Next.js API]
    RTE[GET /api/books/{id}/simplify?level&chunk]
    PFE[Prefetch K+1/K+2]
    MQP[Enqueue Precompute]
  end

  subgraph Data
    DB[(Postgres/Prisma)]
    KV[(Redis-like Cache)]
    OBS[(Object Storage - optional)]
  end

  subgraph Workers
    Q[Queue (BullMQ/Cloud Queue)]
    W[Precompute Worker]
  end

  UI -->|request chunk K| CDN --> RTE
  RTE -->|DB-first read| DB
  RTE -->|cache lookup| KV
  RTE -->|enqueue K+1| MQP --> Q --> W
  W -->|read content/chunks| DB
  W -->|LLM simplify| LLM[LLM API]
  LLM --> W --> DB
  W --> KV
  RTE -->|stream if miss| UI
  RTE -->|serve cached| UI
  UI -->|background prefetch| PFE
```

---

## Data Model and Schema Adjustments

1) Canonical content storage (DB-first path)
- Table: `bookContent`
  - `bookId` (PK, string/UUID)
  - `source` (enum: openlibrary, gutenberg, googlebooks, manual)
  - `content` (text)
  - `contentHash` (text, SHA256)
  - `lengthChars` (int)
  - `metadata` (jsonb)
  - `updatedAt` (timestamp)
  - Index: `(bookId)`; Unique `(bookId)`

2) Level-specific chunk maps
- Table: `bookLevelChunk`
  - `bookId` (FK)
  - `level` (enum: A1, A2, B1, B2, C1, C2)
  - `chunkIndex` (int)
  - `text` (text)
  - `textHash` (text)
  - `startOffset` (int), `endOffset` (int) — from canonical content
  - `createdAt`, `updatedAt`
  - Unique index: `(bookId, level, chunkIndex)`
  - Index: `(bookId, level, textHash)`

3) Simplifications (extend existing `bookSimplification`)
- Ensure fields:
  - `bookId`, `level`, `chunkIndex`
  - `originalTextHash` (text) — aligns with `bookLevelChunk.textHash`
  - `simplifiedText` (text)
  - `model` (text), `promptVersion` (int)
  - `latencyMs` (int), `costUsd` (numeric)
  - `status` (enum: ready, queued, failed, stale)
  - `createdAt`, `updatedAt`, `expiresAt` (timestamp)
- Unique composite index: `(bookId, level, chunkIndex, originalTextHash, promptVersion)`
- Hot index: `(bookId, level, chunkIndex)`

4) Optional: KV cache (Redis) shadow
- Key: `simplify:book:{bookId}:lvl:{level}:chunk:{chunkIndex}:hash:{originalTextHash}:pv:{promptVersion}`
- TTL: 30 days (refresh on read); value: small JSON with `simplifiedText`, `model`, `updatedAt`

---

## Cache Keys and Invalidation

- Strong keying with `originalTextHash` and `promptVersion` prevents cross-version leakage.
- Invalidation triggers:
  - Canonical content changed: recompute `contentHash` → invalidate related chunks via `textHash` mismatch
  - Prompt or model change: bump `promptVersion` (config) → new writes coexist; old versions phased out via TTL
  - Manual purge: mark `bookSimplification.status = 'stale'` for targeted ranges

---

## Request Flow (Hot Path)

1) Reader requests chunk K
2) API resolves to DB-first lookup:
   - Check KV; if hit → respond immediately
   - Else check DB `bookSimplification`; if hit → hydrate KV (async) and respond
   - Else enqueue compute for K and adjacent chunks (K+1, K+2), then:
     - If permissible, stream on-demand; otherwise return brief placeholder while worker fills cache quickly
3) API triggers background `MQP` enqueue for K+1/K+2 regardless of hit, to keep lead over user reading pace

Expected hot path latencies:
- KV hit: 20–50ms
- DB hit: 40–120ms
- Rare stream: first tokens 500–1200ms, completion up to 8–10s (kept off P95 via precompute)

---

## Precompute Strategy

- Triggers:
  - On book import/first view: schedule precompute for selected levels (user’s CEFR + adjacent) for first N chunks (e.g., 10–20)
  - On idle server time: expand precompute to entire book for popular levels
  - On-demand misses: enqueue K..K+2 immediately
- Concurrency:
  - Per-book concurrency = 1 to avoid model rate spikes
  - Global concurrency tuned to provider limits (e.g., 4–8 concurrent LLM jobs)
- Batching:
  - Batch API calls where possible; otherwise single-chunk jobs for fair scheduling
- Backoff/retry:
  - Exponential backoff, max retries 3; mark as `failed` with error for observability

---

## Prefetching

- Client: when chunk K is rendered, fire background requests for K+1 and K+2
- Server: API side-effect enqueues K+1/K+2 simplification jobs
- Heuristic: If user reading speed is high (scroll/keypress cadence), widen window (K+1..K+3)

---

## Streaming Strategy and Fallbacks

- Prefer cache hits; stream only on cold miss or explicit refresh
- Use chunked transfer (Next.js streaming/SSE) to show progress text for rare cold-miss
- If streaming exceeds 2s for first tokens, show compact loading UI and keep reading original text while compute finishes in background
- Optionally provide a “fast baseline” simplifier (smaller model) to show interim version, replaced by high-quality cache result when ready

---

## Chunk Size Tuning

- Maintain CEFR-based target words per screen (A1: ~75 → C2: ~450)
- Ensure chunk token counts are under provider context/latency sweet spots (e.g., ~300–1,200 tokens)
- If chunks exceed thresholds, split internally for generation but merge for display

---

## Measurement and Telemetry

Capture per-request metrics:
- `ttfbMs`, `firstTokenMs`, `streamCompleteMs`
- `kvLookupMs`, `dbLookupMs`, `llmQueueWaitMs`, `llmLatencyMs`, `dbWriteMs`
- `hitType` (kv|db|stream), `cacheAgeSec`
- `queueDepth`, `workerUtilization`

Instrumentation:
- Add request/trace IDs across API and worker
- Percentile dashboards (P50/P90/P95/P99), by level and book length
- SLO: P95 ≤ 2s for cached path, cold-miss rate ≤ 2% of chunk requests

---

## Rollout Plan and Safeguards

Phase 0: DB-first Content
- Add `bookContent` population on import/fetch; read from DB in simplify endpoint

Phase 1: Chunk Maps + Partial Precompute
- Generate `bookLevelChunk` for first 20 chunks of user’s CEFR level
- Enqueue background jobs; enable client/server prefetch for K+1/K+2

Phase 2: Full Precompute for Popular Levels
- Precompute all chunks for A2/B1/B2 for top-N books
- Add scheduled jobs to maintain freshness and fill gaps

Phase 3: Optimization and Hardening
- KV shadow cache, compression, HTTP caching (ETag/Cache-Control)
- Add indices and query shaping
- Alerting on cold-miss > threshold, queue backlog, P95 regressions

Rollback
- Feature flag guards for DB-first and precompute
- If issues, disable precompute; continue serving from existing cache/DB results

---

## Indexes and Example SQL

```sql
-- bookContent
CREATE TABLE IF NOT EXISTS bookContent (
  bookId text PRIMARY KEY,
  source text NOT NULL,
  content text NOT NULL,
  contentHash text NOT NULL,
  lengthChars int NOT NULL,
  metadata jsonb,
  updatedAt timestamptz NOT NULL DEFAULT now()
);

-- bookLevelChunk
CREATE TABLE IF NOT EXISTS bookLevelChunk (
  bookId text NOT NULL,
  level text NOT NULL,
  chunkIndex int NOT NULL,
  text text NOT NULL,
  textHash text NOT NULL,
  startOffset int NOT NULL,
  endOffset int NOT NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bookId, level, chunkIndex)
);
CREATE INDEX IF NOT EXISTS idx_bookLevelChunk_hash ON bookLevelChunk (bookId, level, textHash);

-- bookSimplification (ensure indexes)
CREATE UNIQUE INDEX IF NOT EXISTS uix_simplify_identity
ON bookSimplification (bookId, level, chunkIndex, originalTextHash, promptVersion);
CREATE INDEX IF NOT EXISTS idx_simplify_hot
ON bookSimplification (bookId, level, chunkIndex);
```

---

## Worker and API Pseudocode

```ts
// Worker job
async function computeSimplification(bookId, level, chunkIndex) {
  const chunk = await db.bookLevelChunk.findUnique({ where: { bookId_level_chunkIndex: { bookId, level, chunkIndex }}})
  if (!chunk) return

  const key = makeKey(bookId, level, chunkIndex, chunk.textHash, promptVersion)
  if (await kv.exists(key)) return

  const existing = await db.bookSimplification.findFirst({
    where: { bookId, level, chunkIndex, originalTextHash: chunk.textHash, promptVersion }
  })
  if (existing) { await kv.set(key, pack(existing)); return }

  const { text: simplifiedText, model, latencyMs, costUsd } = await llm.simplify(chunk.text, level)

  await db.bookSimplification.create({ data: {
    bookId, level, chunkIndex,
    originalTextHash: chunk.textHash,
    simplifiedText, model, promptVersion,
    latencyMs, costUsd, status: 'ready'
  }})
  await kv.set(key, pack({ simplifiedText, model }))
}

// API hot path
export async function GET(req) {
  const { bookId, level, chunkIndex } = parse(req)
  const chunk = await db.bookLevelChunk.findUnique(...)
  if (!chunk) return notFound()

  const key = makeKey(bookId, level, chunkIndex, chunk.textHash, promptVersion)
  const kvHit = await kv.get(key)
  if (kvHit) return json(kvHit)

  const dbHit = await db.bookSimplification.findFirst({ where: { bookId, level, chunkIndex, originalTextHash: chunk.textHash, promptVersion }})
  if (dbHit) { kv.set(key, pack(dbHit)); return json(dbHit) }

  // Enqueue current and next chunks
  queue.enqueue({ bookId, level, chunkIndex })
  queue.enqueue({ bookId, level, chunkIndex: chunkIndex + 1 })

  // Optional streaming fallback
  return streamSimplification(chunk.text, level)
}
```

---

## Measurement Plan

- Add middleware to time each segment; push to metrics backend
- Monitor: P95 end-to-end, hit rate (kv/db/stream), precompute backlog, worker utilization
- A/B: enable precompute for a cohort; compare P95 and cold-miss rate
- Success criteria:
  - P95 ≤ 2s for cached chunks
  - Cold-miss rate ≤ 2%
  - 99% data consistency between `bookLevelChunk.textHash` and `bookSimplification.originalTextHash`

---

## Dependencies and Risks

- LLM rate limits: handle via queue and per-book concurrency
- Storage growth: mitigated by compression and TTL; can prune rarely read chunks
- Invalidation complexity: simplified via versioned keys and hashes
- User behavior variance: broaden prefetch window adaptively

---

## Next Actions (Implementation Checklist)

- Add `bookContent`, `bookLevelChunk` tables; create indices
- Migrate simplify endpoint to DB-first reads; add KV cache layer
- Implement queue and worker; wire precompute on book view/import
- Add client and server prefetch
- Add telemetry and dashboards; set SLOs and alerts
- Phase rollout with feature flags; track P95 and cold-miss rate 