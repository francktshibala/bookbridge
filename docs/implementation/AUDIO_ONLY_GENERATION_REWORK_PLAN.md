# Audio-Only Generation Rework Plan

Goal: Use existing simplified text (already in DB) and precompute audio only, so reading is instant. Remove accidental simplification queuing from the admin flow. Align Admin UI, Queue, and Reader to precomputed audio.

## TL;DR (2 lines)
- Make the system audio-only: stop queuing simplifications; backfill audio for existing simplified chunks by book/level; fix dashboards to reflect audio coverage; keep a light, throttled queue.
- Wire the reader to load `book_chunks.audioFilePath` for `(bookId, level, chunkIndex)` with deterministic fallback; add coverage audit and ensure chunk alignment.

---

## Current Findings (from code)
- `app/api/admin/books/pregenerate/route.ts` queues simplification jobs (and stores content) when called with `task='both'`.
- `components/admin/BookManagement.tsx` calls the pregenerate route with `task: 'both'` on “Generate Audio”.
- `app/api/admin/queue/route.ts` lists `precompute_queue` without filtering by `taskType` (mixes any jobs).
- `lib/precompute/book-processor.ts` has `generateAudioForExistingChunks()` which correctly finds `isSimplified=true & audioFilePath IS NULL` and writes files to `/public/audio/{bookId}/{level}/chunk_{index}.mp3`, updating DB.
- Reader (`app/library/[id]/read/page.tsx`) uses instant/on-demand audio components; it does not prefer `audioFilePath` for precomputed audio yet.

## Scope of Work
1) Audio-Only Job Model
- Enforce `taskType='audio'` in all admin-triggered operations.
- Remove/disable simplification queuing from admin endpoints.
- Allow scoping backfill by `bookId` and `level`.

2) Admin API changes
- `POST /api/admin/books/pregenerate` → either deprecate or repurpose for audio-only (validate inputs; return 400 if `task !== 'audio'`).
- `POST /api/admin/audio/backfill` → accept optional `{ bookId, levels?: string[] }` and run `generateAudioForExistingChunks()` scoped.
- `GET /api/admin/queue` → filter by `taskType='audio'`; include book title; pagination.
- Consider small control endpoints for throttling and retry policy.

3) Admin UI changes
- Book Management: 
  - Replace “Generate Audio” action to call audio backfill with `{ bookId }` (and selected level).
  - Show per-book coverage by level from DB: count of `book_chunks` with `audio_file_path` vs total simplified chunks.
- Pre-generation Queue:
  - Show only audio jobs; reduce poll interval to 5–10s; pause polling when tab hidden.
- Audio Management:
  - Keep global stats; add filters by book/level.

4) Reader wiring (instant playback)
- At chunk render time, resolve audio URL:
  - Preferred: `book_chunks.audio_file_path` for `(bookId, level, chunkIndex)`.
  - Fallback: deterministic path `/audio/{bookId}/{level}/chunk_{index}.mp3` if DB field missing but file exists.
  - Last resort: on-demand TTS or disabled control.
- Ensure chunk alignment matches the 400-word segmentation used for generation. If the reader uses character-based chunks, map page→nearest generation chunk index or switch reader to 400-word pages for simplified mode.

5) Reliability & performance
- Throttle backfill: small concurrency (e.g., 2–3), 1–2s delay between jobs; exponential backoff for transient failures.
- DB connections: continue using Prisma singleton; group stats queries in `$transaction`.
- Logging/metrics: log failures, durations, and file sizes; expose counts in Admin.

6) Storage plan (production-ready)
- Migrate audio files from `public/` to Supabase Storage (or S3) with CDN.
- Update `audioFilePath` to a public URL; adapt AudioGenerator to upload and return URL.
- Add a cleanup/retention strategy.

7) Validation & tooling
- Script: `scripts/audit-audio-coverage.js` → for a list of books/levels, assert DB coverage and file/url existence.
- Script: `scripts/fix-missing-audio.js` → attempts regeneration for missing paths.

---

## Step-by-Step Implementation Checklist

A. Stop Simplifications from Admin
- Completed: In `app/api/admin/books/pregenerate/route.ts`, removed `storeBookContent` and `queueSimplificationJobs`; now accepts only `{ bookId, task: 'audio' }` (or returns 400).
- Completed: In `components/admin/BookManagement.tsx`, updated `triggerGeneration` to call `POST /api/admin/audio/backfill` with `{ bookId }` (optionally `levels`).

B. Queue & Stats alignment (audio-only)
- Completed: `GET /api/admin/queue` now filters with `where: { taskType: 'audio' }` and includes `bookTitle`, `cefrLevel`, and pagination.
- [ ] Reduce polling to 5–10s; stop when window not visible.

C. Audio backfill improvements
- [ ] Extend `/api/admin/audio/backfill` to accept optional scope `{ bookId, levels }` and call `generateAudioForExistingChunks()` with filters.
- [ ] Add simple concurrency + retry in `generateAudioForExistingChunks()`.

D. Book Management coverage
- [ ] Add API to fetch per-book coverage (counts grouped by `bookId`, `level`).
- [ ] Render coverage badges (e.g., A1: 20/20, A2: 0/20) and progress bars. Enable per-level “Generate Audio”.

E. Reader integration
- [ ] Add a helper: `resolvePrecomputedAudioUrl(bookId, level, chunkIndex)` that checks DB → public path → null.
- [ ] Update `InstantAudioPlayer` usage to prefer resolved URL; only fall back to on-demand when null.
- [ ] Ensure chunkIndex mapping matches generation segmentation for simplified mode.

F. Storage migration (optional, next phase)
- [ ] Switch AudioGenerator to upload to Supabase Storage; store CDN URL in `audioFilePath`.
- [ ] Provide a one-time migration script to move local files and update DB.

G. Validation
- [ ] Implement `scripts/audit-audio-coverage.js` to print coverage and missing files for selected books.
- [ ] Add Admin “Validate Audio” button (optional) that runs a lightweight server-side check and shows a report.

---

## Risks & Mitigations
- Misaligned chunking between reader and generator → enforce 400-word segmentation for simplified mode or add mapping.
- Pool exhaustion under load → keep Prisma singleton + transactions; throttle backfill.
- API rate limits (OpenAI/others) → retries + backoff; per-minute cap.
- Large local storage footprint → migrate to Storage/CDN; add cleanup.

## Success Criteria
- Admin Queue shows only audio jobs; Book Management shows accurate per-book/level coverage.
- Reader plays precomputed audio instantly for generated chunks.
- Stats endpoint reflects accurate global coverage.
- Audit script reports 100% coverage for target books/levels with no missing files/URLs.

---

## File Retention Policy (interim)
- Keep all existing audio files in `public/audio/` for now; they enable instant playback and serve as a baseline for validation.
- After audio-only wiring and a successful coverage audit, delete only orphaned or outdated files.
- Prefer performing cleanup after migrating to Storage/CDN, where listing and lifecycle rules are easier to manage.
