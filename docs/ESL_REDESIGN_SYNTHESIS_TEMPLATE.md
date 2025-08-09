# ESL Redesign Synthesis (Template)

Use this document to merge findings from multiple agents (architecture, UX, accessibility, ESL pedagogy, performance) into a single, actionable plan. Keep sections concise and decision‑oriented.

## 0) How to use this template
- Paste each agent’s key findings into the relevant sections below.
- Resolve conflicts in “Decisions” blocks.
- Convert open questions into action items for the roadmap.

---

## 1) Executive Summary (1–2 paragraphs)
BookBridge will deliver reliable, level‑aware book simplification for ESL learners (A1–C2) while preserving a clean, professional reading experience that serves both ESL and non‑ESL users. Technically, we standardize on sentence‑safe chunking for TTS continuity, apply a semantic similarity gate (0.82) to prevent meaning drift, and cache per (book, level, chunk) with versioning so responses are fast, consistent, and cost‑controlled.

Over the next two sprints we will ship: a focused reading surface with three modes (Original, Simplified, Compare), one compact ESL/TTS control bar, basic TTS auto‑advance with prefetch and soft crossfade, similarity‑gated simplification with graceful fallbacks, precompute for top B1/B2 titles, and a minimal SM‑2 SRS loop with metrics. Accessibility (WCAG 2.1 AA) and performance targets (time‑to‑first‑simplified <2s cached / <5s generated) guide implementation.

### Decisions
- [x] Sentence‑safe chunking (~500–800 words) for simplification and TTS
- [x] Similarity gate at 0.82 with conservative retry then fallback to original
- [x] Default mode: ESL → Simplified; non‑ESL → Original; persist per user/book
- [x] TTS prefetch at 90% elapsed or ≤10 words remaining; soft crossfade (150–250ms)

---

## 2) Architecture Overview

### Chunking Strategy for Reading, TTS & Simplification
**Sentence-Safe Chunking for TTS Continuity**
- **Primary Unit**: Sentence boundaries (preserves natural audio flow like Speechify)
- **Chunk Size**: 500-800 words with sentence completion buffer
- **TTS Continuity**: No word-level highlighting breaks mid-sentence
- **Cross-Chunk Handoff**: Prefetch next chunk at 80% progress, seamless transition

```typescript
interface TTSChunk {
  id: string;
  sentences: Array<{
    text: string;
    startTime: number;
    words: Array<{ word: string; start: number; end: number }>;
  }>;
  audioUrl?: string;
  nextChunkId?: string;
}
```

**Vector Search Integration**
- Existing `EnhancedContentChunker` + `VectorService` pipeline
- Pinecone embeddings for semantic similarity
- Fallback to keyword search when vector unavailable

### Reliability & Observability
- Cache hit rates for simplifications (target: 85%+)
- TTS streaming continuity metrics (target: <100ms gaps)
- Semantic similarity confidence scores (gate at 0.82 threshold)

### Decisions
- [x] **Chunking boundaries**: Sentence-safe with 500-800 word target
- [x] **Similarity gating thresholds**: Cosine ≥ 0.82 (allow some flexibility for ESL learning)
- [x] **TTS prefetch**: Begin at 80% chunk progress

---

## 3) CEFR Simplification Pipeline

### Processing Flow
```
Input Text → Chunking → CEFR Simplification → Similarity Gate → Cultural Notes → Cache
```

**1. Text Preprocessing**
- Sentence-safe chunking (reuse TTS chunk boundaries)
- Preserve proper names, dialogue structure
- Extract cultural references for annotation

**2. CEFR-Level Simplification with Pedagogical Guardrails**

```typescript
interface CEFRSimplificationRules {
  vocabularyLimit: number; // max unknown words per chunk
  acquisitionRate: number; // new words per week
  retentionThreshold: number; // mastery requirement
  complexityGates: string[]; // sentence structures allowed
}
```

- **A1 (Beginner)**: 500-word vocabulary, 8 new words/week, simple present/past only
  - Sentence limit: 8 words, no subordinate clauses
  - Cultural notes: Essential for every reference
  - Model: Claude 3.5 Haiku with strict vocabulary constraints

- **A2 (Elementary)**: 1000-word vocabulary, 12 new words/week, basic compound sentences  
  - Sentence limit: 12 words, simple connectors (and, but, because)
  - Cultural notes: For Victorian/historical references
  - Model: Claude 3.5 Haiku with expanded vocabulary

- **B1 (Intermediate)**: 1500-word vocabulary, 15 new words/week, complex sentences allowed
  - Sentence limit: 18 words, conditional structures permitted
  - Cultural notes: Optional, context-dependent
  - Model: Claude 3.5 Sonnet with balanced complexity

- **B2 (Upper-Intermediate)**: 2500-word vocabulary, 18 new words/week, abstract concepts
  - Sentence limit: 25 words, passive voice and reported speech
  - Cultural notes: Subtle integration in text
  - Model: Claude 3.5 Sonnet with literary awareness

- **C1/C2 (Advanced/Proficient)**: Minimal intervention, preserve literary style
  - Focus on stylistic analysis rather than simplification
  - Model: Light processing or original text with annotations

**3. Meaning Preservation Gate**
```typescript
interface SimilarityGate {
  threshold: number; // 0.82 minimum
  fallbackStrategies: ['retry_conservative', 'return_original', 'highlight_differences'];
}
```

**4. Cultural Context Layer**
- Victorian era references → modern explanations
- British idioms → universal alternatives
- Social customs → accessible context

**5. Vocabulary Surfacing & SRS Integration**
```typescript
interface VocabularySurfacing {
  unknown: 'tooltip on-demand'; // New words - click to define
  review: 'highlight immediate'; // SRS due - subtle highlight
  context: 'highlight delayed'; // Important context - after 2s
  mastered: 'no_highlight'; // Mastery level 5 - no distraction
}
```

**6. Caching Strategy**
- **Key Format**: `${bookId}:${cefrLevel}:${chunkIndex}:${modelVersion}`
- **TTL**: 30 days (or until model/prompt update) 
- **Precompute**: Top 50 titles at B1/B2 levels (80% of usage)
- **SRS Cache**: User vocabulary state cached in Redis for instant lookup

### Decisions
- [x] **Model selection**: Haiku (A1/A2), Sonnet (B1/B2), minimal (C1/C2)
- [x] **Similarity gate**: 0.82 threshold with conservative retry → original fallback
- [x] **Precompute policy**: Priority books (Pride & Prejudice, Tom Sawyer, etc.) at B1/B2

---

## 4) TTS Auto‑Advance & Highlighting Continuity
- Auto‑advance between sentence‑safe chunks with a brief 150–250ms crossfade/silence window to avoid abrupt cuts.
- Prefetch policy: when either (a) elapsed time ≥ 90% of current chunk duration, or (b) remaining words ≤ 10, begin pre‑loading the next chunk and initializing highlighting metadata.
- Boundary events:
  - Web Speech: use `onboundary` events → `highlightingManager.handleWebSpeechBoundary(sessionId, wordIndex)`.
  - ElevenLabs WebSocket: use character/word boundary events → `highlightingManager.handleElevenLabsWebSocketBoundary(sessionId, wordIndex)`.
- Cross‑page continuity: if the last chunk ends on page N and next chunk starts on page N+1, carry over a `handoff` object: `{ nextPageIndex, firstSentenceStartWordIndex }`. On navigation, auto‑scroll the first sentence into view and apply the initial highlight with a 250ms fade.
- Error recovery:
  - If provider stream stalls > 1.5s: attempt resume once; if still stalled, fall back to Web Speech for the remaining chunk and announce the fallback via the live region.
  - If boundary events are missing for > 3s during playback, re‑sync by estimating word index from elapsed time vs. chunk duration; correct on the next boundary event.
- Telemetry hooks: emit events for `tts_prefetch_started`, `tts_chunk_ended`, `tts_auto_advanced`, `tts_provider_fallback` with payloads: provider, chunkIndex, durationMs, latencyMs, gapMs.

### Decisions
- [x] Prefetch threshold: 90% elapsed OR ≤10 words remaining; warm the next chunk’s highlight map.
- [x] Cross‑page handoff: carry `handoff` state; auto‑scroll to first sentence and start highlight with soft fade.
- [x] Recovery: 1 retry resume then provider fallback to Web Speech; re‑sync highlighting using elapsed‑time heuristic.

---

## 5) Reading UI: Modes & Controls
- Modes
  - **Original**: render source text; vocabulary tooltips optional.
  - **Simplified**: render CEFR‑simplified text (A1–C2); preserves structure/paragraphs.
  - **Compare (Split)**: side‑by‑side original and simplified with linked scroll and active‑panel highlighting.

- Compact ESL/TTS Bar (sticky within reading surface)
  - Always visible in reading view; collapses to one row on mobile.
  - On‑bar controls (tap‑sized ≥ 44×44):
    - **Level**: CEFR chip A1–C2 (opens level sheet on click).
    - **Simplify**: toggle Original/Simplified.
    - **Play/Pause** and Stop.
    - **Speed**: 0.5–1.2× slider in 0.1 steps with label (Very Slow → Very Fast).
    - **Auto‑advance**: toggle for cross‑chunk/page continuation.
  - Overflow (Sheet/Popover): voice provider (Web Speech/OpenAI/ElevenLabs), voice selection, pronunciation guide, emphasize difficult words, pause after sentences, volume.
  - Progress: slim progress bar + timecodes; chunk indicator when applicable (e.g., “2/5”).

- Compare mode specifics
  - Scroll sync: compute scroll percentage and mirror to the inactive pane.
  - Highlight target is the active pane (Simplified‑only view highlights the simplified panel).

- Defaults & persistence
  - ESL users default to Simplified; non‑ESL default to Original. Respect prior user choice per book (localStorage or DB). 

- Mobile & touch
  - Single row with icons + labels hidden at ≤360px; long‑press the Level chip to open Level sheet; horizontal swipe for prev/next page when not selecting text.

- Content Provenance & Legal Indicators
  - **Source Badge**: Subtle provenance indicator below title
    - Gutenberg: "From Project Gutenberg" with book icon
    - Standard Ebooks: "Standard Ebooks Edition" with quality badge
    - Open Library: "Open Library Text" with library icon
  - **Info Sheet**: Tap badge for full details
    - Publication date, source URL, last updated
    - Copyright status verification
    - "Report Issue" link for content concerns
  - **Historical Context Warning**: Auto-shown for pre-1900 texts
    - Dismissible banner: "This historical text reflects the language and attitudes of its time"
    - Link to cultural notes when available

### Decisions
- [x] What’s on the bar: Level, Simplify, Play/Pause, Stop, Speed, Auto‑advance; everything else in overflow.
- [x] Default mode: ESL → Simplified; non‑ESL → Original; persist per user/book.
- [x] Provenance badges: Subtle source indicators with expandable info sheet
- [x] Content warnings: Auto-display for historical texts with dismissible banner

---

## 6) Design System (Tokens & Primitives)
- Tokens (CSS variables; dark‑first with light fallbacks)
  - Colors
    - `--color-bg-surface`: #0f172a (light: #ffffff)
    - `--color-bg-panel`: rgba(26,32,44,0.95) (light: #f9fafb)
    - `--color-brand`: #667eea
    - `--color-brand-2`: #764ba2
    - `--color-accent`: #10b981
    - `--color-info`: #3b82f6
    - `--color-warning`: #f59e0b
    - `--color-danger`: #ef4444
    - `--color-text-primary`: #e2e8f0 (light: #111827)
    - `--color-text-muted`: #a0aec0 (light: #6b7280)
    - `--color-highlight-bg`: #fbbf24
    - `--color-highlight-text`: #111827
  - Spacing (px): 4, 8, 12, 16, 20, 24, 32, 40
  - Radius: sm 8, md 12, lg 16, xl 20, pill 999
  - Shadows
    - `--shadow-1`: 0 1px 2px rgba(0,0,0,.2)
    - `--shadow-2`: 0 4px 20px rgba(0,0,0,.3)
    - `--shadow-ring`: 0 0 0 1px rgba(102,126,234,.2)
  - Typography
    - Reading base size min 16px, user‑scaled; line height 1.8–1.9; dyslexia font optional.
    - Headings use Inter; body can use Inter/Georgia/Charter.
  - Z‑index: nav 50, player 40, split‑view 100, modal 110, tooltip 120
  - Motion: durations 120/200/300ms; ease‑out for enters, ease‑in for exits
  - Touch target: min‑tap‑area 44×44

- Primitives & APIs
  - `Button` (variants: primary, secondary, danger, ghost; sizes: sm/md/lg; iconStart/iconEnd; aria‑label)
  - `Toggle` (aria‑pressed, label, size, onChange)
  - `Tabs` (keyboard roving tabindex; onChange; aria‑controls)
  - `Pager` (prev/next, select, total, current; disabled states)
  - `Tooltip` (aria‑describedby; openDelay; closeOnEsc)
  - `Sheet` (side=top|bottom|left|right; trapFocus; returnFocusOnClose)
  - `Progress` (role=progressbar; aria‑valuenow/min/max; indeterminate)
  - `Toast` (status=info|success|warning|error; autoDismiss; aria‑live)

### Decisions
- [x] Finalize tokens above; implement as CSS variables in `globals.css` and Tailwind theme extensions.
- [x] Component API contracts set as listed; use consistently across reading and ESL/TTS bar.

---

## 7) Caching & Precomputation

### Multi-Layer Caching Strategy

**Layer 1: CDN (Vercel Edge)**
- Static audio files, precomputed simplifications
- Geographic distribution for global ESL users
- Cache hit target: 90%+ for popular content

**Layer 2: Application Cache (Redis/Upstash)**
- Session state, user preferences, temporary simplifications
- TTL: 24 hours for dynamic content
- Key format: `user:${userId}:session:${bookId}`

**Layer 3: Database Cache (Supabase)**
- Permanent simplifications, user progress, vocabulary tracking
- Table: `book_simplifications` with composite indexing
- Existing schema supports chunk-level caching

### Versioning & Invalidation
```typescript
interface CacheKey {
  bookId: string;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  chunkIndex: number;
  version: string; // "${modelName}_${promptHash}_v${schemaVersion}"
}

// Example: "pride-prejudice:B1:023:haiku_a1b2c3_v2"
```

**Invalidation Triggers**
- Model updates (Claude version changes)
- Prompt engineering improvements  
- CEFR level adjustments
- Cultural context database updates

### Precomputation Pipeline
**Priority Titles** (from ESL master plan):
1. Pride and Prejudice (gutenberg-1342)
2. Tom Sawyer (gutenberg-74)
3. Alice in Wonderland (gutenberg-11)
4. Christmas Carol (gutenberg-46)
5. Great Expectations (gutenberg-1400)

**Processing Schedule**
- Batch process B1/B2 levels first (highest usage)
- A1/A2 on-demand (more variable, personalized)
- C1/C2 minimal processing (preserve original style)

### Decisions
- [x] **Version key format**: `${model}_${promptHash}_v${schema}` 
- [x] **TTL strategy**: 30 days for simplifications, 24h for sessions
- [x] **Precompute scope**: Top 50 titles × B1/B2 levels = ~100 high-value assets

---

## 8) API Contracts

### Text Simplification API
**Endpoint**: `GET /api/esl/books/[id]/simplify`
```typescript
// Request
interface SimplifyRequest {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  section: number; // chunk index
  regenerate?: boolean; // bypass cache
}

// Response (existing implementation)
interface SimplifyResponse {
  success: boolean;
  content: string;
  vocabularyChanges: Array<{
    original: string;
    simplified: string;
    reason: string;
  }>;
  culturalAnnotations: Array<{
    term: string;
    explanation: string;
  }>;
  qualityScore: number; // 0-1
  source: 'cache' | 'generated';
  level: string;
  stats: {
    originalLength: number;
    simplifiedLength: number;
    compressionRatio: string;
  };
}
```

### TTS Metadata API  
**Integration with existing Voice Service**
```typescript
interface TTSChunkMetadata {
  chunkId: string;
  sentences: Array<{
    text: string;
    startTime: number;
    endTime: number;
    words: Array<{
      word: string;
      start: number;
      end: number;
      confidence: number;
    }>;
  }>;
  totalDuration: number;
  nextChunkPreload?: {
    chunkId: string;
    audioUrl: string;
  };
}
```

### Vocabulary Lookup API
**Endpoint**: `POST /api/esl/vocabulary`  
```typescript
interface VocabularyRequest {
  word: string;
  context: string;
  userLevel: string;
  userId: string;
}

interface VocabularyResponse {
  word: string;
  definition: string;
  pronunciation: string; // IPA notation
  examples: string[];
  culturalNote?: string;
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  isNewWord: boolean;
  srsSchedule?: {
    nextReview: string; // ISO date
    interval: number; // days
  };
}
```

### Error Handling (follows existing patterns)
```typescript
interface APIError {
  error: string;
  details?: string;
  code: 'SIMPLIFICATION_FAILED' | 'BOOK_NOT_FOUND' | 'INVALID_LEVEL' | 'RATE_LIMITED';
  fallback?: {
    originalText: string;
    message: string;
  };
}
```

### Decisions
- [x] **JSON schemas**: Defined above building on existing `/api/esl/books/[id]/simplify` 
- [x] **Error codes**: 400/404/429/500 with structured fallbacks  
- [x] **TTS integration**: Extend existing VoiceService with chunk metadata

---

## 9) Database Schema Updates

### Existing Schema (Already Implemented)
**Users table extensions**:
```sql
-- ESL profile fields (already added)
ALTER TABLE users ADD COLUMN esl_level VARCHAR(2) DEFAULT NULL;
ALTER TABLE users ADD COLUMN native_language VARCHAR(10) DEFAULT NULL;
ALTER TABLE users ADD COLUMN learning_goals JSON DEFAULT NULL;
```

**Book simplifications cache**:
```sql  
-- Primary cache table (already exists)
CREATE TABLE book_simplifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id VARCHAR NOT NULL,
    target_level VARCHAR(2) NOT NULL,
    chunk_index INTEGER NOT NULL,
    original_text TEXT NOT NULL,
    simplified_text TEXT NOT NULL,
    vocabulary_changes JSON DEFAULT '[]',
    cultural_annotations JSON DEFAULT '[]',
    quality_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(book_id, target_level, chunk_index)
);
```

### Enhanced Schema for SM-2 SRS System
**Vocabulary progress with SRS fields**:
```sql
CREATE TABLE esl_vocabulary_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    definition TEXT,
    difficulty_level VARCHAR(2), -- CEFR level of word
    encounters INTEGER DEFAULT 1,
    mastery_level INTEGER DEFAULT 0, -- 0-5 scale
    
    -- SM-2+ SRS Algorithm fields
    ease_factor DECIMAL(3,2) DEFAULT 2.5, -- 1.3-2.5 range
    srs_interval INTEGER DEFAULT 1, -- days until next review
    repetitions INTEGER DEFAULT 0, -- successful reviews
    last_quality INTEGER DEFAULT 0, -- 0-5 response quality
    
    -- Timestamps
    first_seen TIMESTAMP DEFAULT NOW(),
    last_reviewed TIMESTAMP DEFAULT NOW(),
    next_review TIMESTAMP DEFAULT NOW() + INTERVAL '1 day',
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, word)
);

-- Add word difficulty index for SRS calculations
CREATE INDEX idx_vocab_difficulty ON esl_vocabulary_progress(difficulty_level, ease_factor);
```

**Reading session analytics**:
```sql
CREATE TABLE reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id VARCHAR NOT NULL,
    session_start TIMESTAMP DEFAULT NOW(),
    session_end TIMESTAMP,
    words_read INTEGER DEFAULT 0,
    avg_reading_speed INTEGER, -- WPM
    difficulty_level VARCHAR(2),
    comprehension_score DECIMAL(3,2),
    vocabulary_lookups INTEGER DEFAULT 0,
    time_on_simplified INTEGER DEFAULT 0, -- seconds
    time_on_original INTEGER DEFAULT 0, -- seconds
    tts_usage_time INTEGER DEFAULT 0, -- seconds
    auto_advance_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Performance Indices (Hot Paths)
```sql
-- Book simplifications lookup
CREATE INDEX idx_book_simplifications_lookup 
ON book_simplifications(book_id, target_level, chunk_index);

-- Vocabulary SRS queries  
CREATE INDEX idx_vocab_next_review 
ON esl_vocabulary_progress(user_id, next_review);

-- Reading analytics
CREATE INDEX idx_reading_sessions_user_book 
ON reading_sessions(user_id, book_id);

-- User progress queries
CREATE INDEX idx_vocab_progress_user_word 
ON esl_vocabulary_progress(user_id, word);
```

### Cache Versioning Strategy
```sql  
-- Add version tracking to simplifications
ALTER TABLE book_simplifications 
ADD COLUMN version_key VARCHAR(100) DEFAULT 'v1';

-- Index for version-aware cache lookups
CREATE INDEX idx_simplifications_version 
ON book_simplifications(book_id, target_level, chunk_index, version_key);
```

### Decisions
- [x] **DDL changes approved**: Enhanced `esl_vocabulary_progress` with SM-2+ SRS fields
- [x] **Index strategy**: SRS-optimized indices for review scheduling and difficulty calculations
- [x] **Schema extensions**: Support for ease factor, repetitions, quality scores in vocabulary tracking
- [x] **Analytics support**: Reading session tracking with vocabulary lookup correlation

---

## 10) Accessibility & Internationalization
- WCAG 2.1 AA practices
  - Roles/regions: keep main landmark on reading surface; compact bar controls get explicit labels; progress uses `role="progressbar"` with `aria‑valuenow/min/max`.
  - Live regions: use `#live-region` (polite) for play/pause/advance announcements; `#error-region` (assertive) for failures/fallbacks.
  - Focus management: trap focus in Compare (Split) sheet; restore focus to trigger on close; visible focus ring; no focus‑traps elsewhere.
  - Target sizes ≥ 44×44; contrast ≥ 4.5:1 for text/icons; 3:1 for large UI.

- Keyboard shortcuts (announce via help tooltip on the bar)
  - Space / K: Play/Pause
  - J / Left: Previous page; L / Right: Next page
  - Shift+J / Shift+Left: Previous section; Shift+L / Shift+Right: Next section
  - S: Toggle Simplified
  - C: Toggle Compare (Split)
  - A: Toggle Auto‑advance
  - + / −: Increase/Decrease speed
  - Esc: Close Split view / dismiss popovers

- Touch/gesture
  - Tap center: Play/Pause; Swipe left/right: Next/Prev page (when selection inactive)
  - Long‑press word: vocabulary tooltip; Two‑finger double‑tap: toggle Simplified

- i18n & RTL
  - `dir="auto"` on reading container; mirror icons in RTL; ensure logical order for Compare panes in RTL.
  - Number/date localization via `Intl.*`; voice provider lists filtered by locale where applicable.

### Decisions
- [x] Live regions and announcements: reuse `#live-region` and `#error-region`; standardize messages for start/stop/advance/fallback.
- [x] Keyboard shortcuts and gestures as listed; expose a shortcut help dialog from the overflow menu.

---

## 11) Metrics & Instrumentation

### ESL Learning KPIs
**Primary Metrics (LingQ/Duolingo-inspired)**
- **Vocabulary Acquisition Rate**: New words learned per week vs CEFR target
- **Retention Rate**: SRS review accuracy over 30-day periods  
- **Reading Speed Impact**: WPM improvement correlated with vocabulary mastery
- **Engagement Depth**: Time on simplified vs original text ratios
- **Mastery Progression**: Words moving from passive (mastery 1-2) to active (mastery 3-5)

**Technical Performance KPIs**
- **Time-to-First-Simplified**: <2s for cached, <5s for generated content
- **TTS Continuity Rate**: <100ms gaps between chunks (target: 95%+ sessions)
- **Cache Hit Rate**: 85%+ for book simplifications, 95%+ for vocabulary lookups
- **Similarity Gate Accuracy**: % of simplifications passing 0.82 threshold

### Event Schema & Tracking
```typescript
// Vocabulary Learning Events
interface VocabularyEvent {
  type: 'vocab_encounter' | 'vocab_lookup' | 'vocab_review' | 'vocab_mastered';
  userId: string;
  word: string;
  cefrLevel: string;
  context: string;
  responseQuality?: number; // 0-5 for reviews
  sessionId: string;
  timestamp: string;
}

// Reading Session Events  
interface ReadingEvent {
  type: 'session_start' | 'session_end' | 'mode_switch' | 'tts_usage';
  userId: string;
  bookId: string;
  mode: 'original' | 'simplified' | 'compare';
  duration: number; // seconds
  wordsRead: number;
  vocabularyLookups: number;
  timestamp: string;
}

// Simplification Quality Events
interface SimplificationEvent {
  type: 'simplification_generated' | 'similarity_gate_failed' | 'user_feedback';
  bookId: string;
  chunkIndex: number;
  cefrLevel: string;
  qualityScore: number;
  similarityScore: number;
  model: string;
  timestamp: string;
}
```

### SRS Analytics Dashboard
**Vocabulary Progress Tracking**
- Active vocabulary size by CEFR level
- Weekly acquisition vs target curves
- Retention curves by difficulty level  
- Struggling words needing intervention
- Mastery distribution heat maps

**Reading Comprehension Analytics**
- Reading speed trends by content difficulty
- Mode preference patterns (original/simplified/compare)
- Vocabulary density impact on reading flow
- Cultural context annotation usage rates

**Pedagogical Effectiveness**
- Optimal review intervals by user characteristics
- Vocabulary acquisition patterns by native language
- Simplification quality feedback loops
- Level advancement readiness indicators

### Decisions  
- [x] **Event schema**: Vocabulary, reading, and simplification events with structured payloads
- [x] **KPI targets**: 85%+ retention, <2s simplification time, 95%+ TTS continuity  
- [x] **Analytics focus**: SRS effectiveness, reading speed impact, vocabulary acquisition rates

---

## 12) Risks & Mitigations

### Technical Risks & Responses

**1. Semantic Similarity Failures** 
- **Risk**: AI simplification changes meaning too much (< 0.82 similarity)
- **Mitigation**: Conservative retry with stricter prompts → return original text with highlighting of difficult words
- **Threshold**: 3 consecutive failures = disable simplification for that chunk

**2. TTS Continuity Breaks**
- **Risk**: Audio gaps/breaks disrupt reading flow (like Speechify issues)
- **Mitigation**: 150-250ms crossfade buffer + prefetch at 80% → fallback to Web Speech API
- **Monitoring**: Track gap duration, auto-fallback if >500ms

**3. Cache Staleness**
- **Risk**: Model updates invalidate cached simplifications  
- **Mitigation**: Version-keyed cache with automated invalidation + graceful degradation
- **Strategy**: Precompute new versions in background, swap atomically

**4. Chunk Boundary Mismatches**
- **Risk**: TTS highlighting doesn't align with simplified text chunks
- **Mitigation**: Sentence-safe chunking ensures word boundaries match + error recovery via elapsed-time estimation
- **Fallback**: Re-sync on next valid boundary event

### User Experience Risks

**5. Cognitive Overload**
- **Risk**: Too many ESL controls overwhelm users (unlike clean Duolingo UX)
- **Mitigation**: Progressive disclosure - essential controls on bar, advanced in overflow menu
- **Testing**: A/B test control density with ESL learners

**6. Reading Mode Confusion**
- **Risk**: Users lose track of Original vs Simplified vs Compare modes
- **Mitigation**: Clear visual indicators + persistent mode state per book
- **Recovery**: Esc key always returns to Original mode

**7. Performance Degradation**
- **Risk**: Vector search + AI calls slow down reading experience
- **Mitigation**: Aggressive caching (85%+ hit rate) + graceful degradation to keyword search
- **Monitoring**: <2s time-to-first-simplification, 95th percentile

### Business/Content Risks

**8. AI Cost Overruns**
- **Risk**: Unlimited simplification requests drain budget
- **Mitigation**: Precompute top 50 titles, rate limiting for on-demand, usage analytics
- **Target**: <$500/month AI costs at 10K active users

**9. Quality Consistency**
- **Risk**: Variable simplification quality across different books/genres
- **Mitigation**: Genre-aware prompts + human quality spot-checks + user feedback loops
- **Standard**: >4.5/5 average quality rating from ESL users

### Content & Legal Risks

**10. Public Domain Verification**
- **Risk**: Copyrighted content mistakenly included in catalog
- **Mitigation**: 
  - Strict provenance tracking (Gutenberg, Standard Ebooks, Open Library only)
  - Automated copyright expiry validation (pre-1928 for US)
  - Manual review for edge cases (translations, annotations)
- **Quick Remove**: 24-hour content takedown workflow via admin panel

**11. Content Variations & Quality**
- **Risk**: Multiple versions of same title confuse users
- **Mitigation**:
  - Prefer Standard Ebooks (best typography/formatting)
  - Fall back to Gutenberg (widest catalog)
  - Clear source attribution in UI
- **Disclaimers**: "This edition from [source] may differ from other versions"

**12. Cultural Sensitivity**
- **Risk**: Outdated language/concepts in classic texts
- **Mitigation**:
  - Contextual warnings for historical content
  - Cultural notes explain rather than censor
  - Community reporting mechanism
- **UI Cues**: Subtle info icon with "Historical Context" tooltip

### Decisions
- [x] **Similarity gate**: 0.82 threshold with 3-strike fallback to original
- [x] **TTS recovery**: 150-250ms crossfade + Web Speech fallback after 500ms
- [x] **Cache strategy**: Version keys + background precomputation + atomic swaps  
- [x] **Cost control**: Precompute high-value content, rate limit on-demand generation
- [x] **UX safeguards**: Progressive disclosure + clear mode indicators + Esc-to-original

---

## 13) Two‑Sprint Roadmap (Implementation Plan)
- Sprint 1: Design system, Reading UI shell, Simplification reliability (gates), basic auto‑advance
- Sprint 2: Cross‑page highlighting, SRS integration, precompute pipeline, polish & a11y passes

### Sprint 1 Backlog
- [ ] Design system: implement tokens (colors/spacing/type) and primitives (Button/Toggle/Tabs/Pager/Tooltip/Sheet/Progress/Toast); wire into reading page
- [ ] Reading modes: Original/Simplified/Compare with mode toggle and clear indicators; persist per user/book
- [ ] ESL/TTS bar: Level chip A1–C2, Simplify toggle, Play/Pause/Stop, Speed (0.5–1.2×), Auto‑advance toggle; mobile one‑row collapse
- [ ] Simplification reliability: call API, apply 0.82 similarity gate; on fail → conservative retry → return original with “simplification unavailable” micro‑hint
- [ ] TTS basics: auto‑advance between chunks with 150–250ms crossfade; prefetch next chunk at 90% or ≤10 words
- [ ] Telemetry: emit key events (time‑to‑first‑simplified, tts_auto_advanced, similarity_gate_failed); minimal dashboard

### Sprint 2 Backlog
- [ ] Cross‑page highlighting: carry handoff state; auto‑scroll first sentence; fade‑in highlight continuity
- [ ] SRS integration: SM‑2 scheduling fields + review events; surface due words subtly; progress tiles on ESL dashboard
- [ ] Precompute pipeline: top 50 B1/B2 titles; background jobs; cache versioning & invalidation on model/prompt updates
- [ ] Accessibility polish: finalize live‑region copy, focus order, shortcuts; add a11y tests for bar/modes/compare
- [ ] Performance: hit <2s cached / <5s generated; raise cache hit rates to 85%+ simplifications, 95%+ vocab lookups
- [ ] Content provenance: source badges (Gutenberg/SE/OL/GB), disclaimers, and quick‑remove hook

---

## 14) Open Questions & Dependencies
- Similarity gate per level: keep global 0.82 or adjust (e.g., A1/A2 stricter)?
- TTS timings: confirm per‑word boundary fidelity for OpenAI/ElevenLabs; fallback quality expectations
- Top 50 titles: finalize list and IDs for precompute (B1/B2 priority)
- Cultural notes UX: length cap, placement (inline tooltip vs footnote callouts), and translation policy
- API caching: ETag/If‑None‑Match for simplify responses and CDN behavior on Vercel
- Env/infra: Redis URL on Vercel, Stripe webhook secret, Pinecone/AI rate limits and monthly budget
- Privacy/analytics: event payload PII policy and retention; opt‑out handling
- Edge cases: poetry/dialogue formatting, illustrations, mixed RTL content
- i18n/RTL: locale roadmap and icon mirroring schedule; initial languages beyond English UI
- Offline/Downloads: scope for PWA reading and audio caching in MVP 

---

## Wireframes (to be linked after upload)
- Desktop Original: ../wireframes/desktop-original.png
- Desktop Simplified: ../wireframes/desktop-simplified.png
- Desktop Compare: ../wireframes/desktop-compare.png
- Desktop TTS (playing): ../wireframes/desktop-tts.png
- Mobile Simplified: ../wireframes/mobile-simplified.png
- Level Sheet: ../wireframes/level-sheet.png 