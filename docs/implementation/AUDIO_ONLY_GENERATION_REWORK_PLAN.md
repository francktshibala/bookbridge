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
- Completed: Reduced queue polling cadence; aborts in-flight requests; pauses when tab hidden; AbortError logs silenced.

C. Audio backfill improvements
- Completed: Extended `/api/admin/audio/backfill` to accept optional scope `{ bookId, levels }` and call `generateAudioForExistingChunks()` with filters.
- Completed: Added concurrency control (3 parallel jobs), retry logic (3 attempts with exponential backoff), and 1.5s delays between batches in `generateAudioForExistingChunks()`.

D. Book Management coverage
- [ ] Add API to fetch per-book coverage (counts grouped by `bookId`, `level`).
- [ ] Render coverage badges (e.g., A1: 20/20, A2: 0/20) and progress bars. Enable per-level “Generate Audio”.

E. Reader integration
- Completed: Reader now calls `/api/audio/pregenerated` which falls back to `book_chunks.audio_file_path`; uses returned URL for instant playback.
- Completed: `InstantAudioPlayer` prefers precomputed audio; falls back to progressive generation only when not available.
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

---

## Current Implementation Status (2025-08-22)

### What's Working Now
1. **Audio Backfill API** (`/api/admin/audio/backfill`):
   - Accepts optional `bookId` and `levels` filters
   - Processes with 3 parallel jobs, retry logic, and delays
   - Example: `POST { bookId: "gutenberg-84", levels: ["A1", "A2"] }`

2. **Reader Integration**:
   - `InstantAudioPlayer` checks for precomputed audio via `/api/audio/pregenerated`
   - Falls back to `book_chunks.audio_file_path` for instant playback
   - Shows "⚡ Instant" indicator when playing precomputed audio

### How to Verify Audio Is Working
```bash
# Check if audio files exist in database
npx prisma db push && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.bookChunk.findMany({
  where: { 
    bookId: 'gutenberg-84',  // Replace with your book ID
    cefrLevel: { in: ['A1', 'A2'] },
    audioFilePath: { not: null }
  },
  select: { cefrLevel: true, chunkIndex: true, audioFilePath: true }
}).then(chunks => {
  console.log(\`Found \${chunks.length} chunks with audio\`);
  console.log(chunks.slice(0, 3));
  process.exit(0);
});
"
```

### To Generate Audio for A1/A2
```bash
# Run audio backfill for specific book and levels
curl -X POST http://localhost:3000/api/admin/audio/backfill \
  -H "Content-Type: application/json" \
  -d '{"bookId": "gutenberg-84", "levels": ["A1", "A2"]}'
```

## Phase 1: Pride and Prejudice (gutenberg-1342) - Active Implementation

### Step 1.1: Foundation Setup ✅ COMPLETED
- [x] Fixed chunk alignment by copying simplified text to book_chunks table
- [x] Ensured reader and audio use same data source
- [x] Verified text matches audio on page 1

### Step 1.2: Generate A1 Audio ✅ COMPLETED
- [x] Copied 252 A1 simplifications to book_chunks table
- [x] Generated audio for ALL 252 A1 chunks 
- [x] Verified audio matches displayed text
- [x] Test playback from page 1 with ⚡ instant indicator

### Step 1.3: Generate A2 Audio 🔄 IN PROGRESS
- [x] Copied 282 A2 simplifications to book_chunks table
- [x] Started A2 audio generation (26+ files complete)
- [ ] Complete A2 generation (~282 files)
- [ ] Test A2 level instant playback

### Step 1.4: Generate B1 Audio 🔄 IN PROGRESS  
- [x] Copied 282 B1 simplifications to book_chunks table
- [x] Started B1 audio generation (running in parallel)
- [ ] Complete B1 generation (~282 files)
- [ ] Test B1 level instant playback

### Step 1.5: Generate Remaining Levels (Next)
- [ ] Copy B2, C1, C2 simplifications to book_chunks table
- [ ] Generate B2, C1, C2 audio files
- [ ] Test all 6 levels have instant playbook
- [ ] Document Pride & Prejudice as 100% complete

## Phase 2: Multi-Computer Distribution

### Step 2.1: Distribution Setup ✅ COMPLETED
- [x] Created MULTI_COMPUTER_AUDIO_GENERATION.md instructions
- [x] Built and pushed to GitHub for other computers
- [x] Assigned next books: gutenberg-11 (Alice), gutenberg-1513 (Romeo & Juliet)

### Next Steps to Complete
1. **Continue Pride & Prejudice** - Complete B2, C1, C2 levels (currently generating A2, B1)
2. **Multi-Computer Coordination** - Other computers process their assigned books
3. **Book Management Coverage UI** - Show audio coverage per book/level
4. **Validation Scripts** - Audit coverage and fix missing audio
5. **Storage Migration** - Move from public/audio to CDN
