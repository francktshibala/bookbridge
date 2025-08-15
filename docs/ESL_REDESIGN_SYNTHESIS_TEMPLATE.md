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

### Performance Optimization Strategy
**Critical Performance Targets**
- **Time-to-First-Simplified**: <2s cached, <5s generated
- **TTS Continuity**: <100ms gaps between chunks
- **Initial Page Load**: <2s including basic content
- **Cache Hit Rates**: 85%+ simplifications, 95%+ vocabulary lookups
- **Memory Efficiency**: <50MB per reading session

### Multi-Layer Caching Architecture

**Layer 1: Browser Cache (Immediate Access)**
```typescript
// Service Worker + IndexedDB for offline-capable ESL content
interface CachedSimplification {
  bookId: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  chunkIndex: number;
  content: string;
  timestamp: number;
  version: string; // Model version for cache invalidation
}

// Smart prefetching based on reading progress
class SimplificationPrefetcher {
  prefetchNextChunks(currentChunk: number, level: string, bookId: string) {
    // Prefetch next 2-3 chunks at 70% current chunk progress
    // Priority: B1/B2 > A2 > A1 > C1/C2 (based on usage)
  }
}
```

**Layer 2: CDN/Edge Cache (Global Distribution)**
- Precomputed simplifications for top 50 titles at B1/B2 levels
- Static TTS audio files cached at edge locations
- Cache-Control headers: `max-age=86400, s-maxage=604800` (1 day/1 week)

**Layer 3: Application Cache (Redis/Upstash)**
```typescript
// Key format: `${bookId}:${level}:${chunkIndex}:${modelVersion}`
const cacheKey = `pride-prejudice:B1:023:haiku_a1b2c3_v2`;
// TTL: 7 days for simplifications, 24h for vocabulary state
```

**Layer 4: Database Cache (Supabase)**
- Permanent storage with composite indexing for ESL content
- Optimized queries using `book_id, target_level, chunk_index` composite index

### Intelligent TTS Performance Strategy

**Smart Audio Prefetching Pipeline**
```typescript
interface TTSPrefetchStrategy {
  // Start prefetch when user is 80% through current chunk
  prefetchTrigger: 0.8;
  
  // Queue management to prevent memory bloat
  maxQueuedChunks: 3;
  
  // Provider-specific optimization
  chunkSizes: {
    'web-speech': 10000,      // Can handle large chunks efficiently
    'elevenlabs': 2000,       // Smaller for faster response
    'openai': 1500,          // Balance quality vs speed
    'elevenlabs-websocket': 5000 // Real-time streaming
  };
}

class AudioPrefetchManager {
  private audioQueue = new Map<string, ArrayBuffer>();
  
  async prefetchNextChunk(chunkId: string, provider: VoiceProvider) {
    // Use optimal chunk size per provider for fastest response
    const optimalSize = this.getOptimalChunkSize(provider);
    
    // Prefetch in background, don't block current playback
    this.backgroundFetch(chunkId, optimalSize);
  }
  
  // Seamless handoff with 150-250ms crossfade
  crossfadeToNext(currentAudio: HTMLAudioElement, nextBuffer: ArrayBuffer) {
    // Implementation for smooth transitions
  }
}
```

**Highlighting Performance for Large Books**
```typescript
// Memory-efficient highlighting for 500+ page books
class HighlightingOptimizer {
  private highlightPool = new Map<string, HighlightElement[]>();
  
  // Only create DOM elements for visible/nearby chunks
  createVirtualizedHighlights(visibleRange: [number, number]) {
    // Recycle highlight elements using object pooling
    // Only highlight words in current viewport + 1 chunk buffer
  }
  
  // Provider-specific optimization
  getHighlightStrategy(provider: VoiceProvider) {
    return {
      'web-speech': 'boundary-events',    // Most accurate
      'elevenlabs-websocket': 'character-timing', // Real-time precise
      'openai': 'whisper-alignment',      // Post-process timing
      'elevenlabs': 'time-estimation'     // Fallback method
    };
  }
}
```

### Database Query Optimization

**Vocabulary Tracking Performance**
```sql
-- Optimized index for SRS vocabulary queries
CREATE INDEX CONCURRENTLY idx_vocab_srs_lookup 
ON esl_vocabulary_progress(user_id, next_review) 
WHERE next_review <= CURRENT_DATE + INTERVAL '1 day';

-- Partitioned table for high-volume vocabulary events
CREATE TABLE vocabulary_events_y2024m12 PARTITION OF vocabulary_events
FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
```

**Book Content Query Optimization**
```typescript
// Streaming content delivery to avoid memory spikes
class BookContentStreamer {
  async streamChunks(bookId: string, startChunk: number = 0) {
    // Fetch chunks in batches of 5, stream to client
    for (let i = startChunk; i < totalChunks; i += 5) {
      yield await this.fetchChunkBatch(bookId, i, 5);
      
      // Yield control to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}
```

### Memory Management Strategy

**ESL Session Memory Budget: <50MB**
```typescript
interface MemoryBudget {
  // Current chunk content + simplified version
  activeContent: 5_000_000,      // ~5MB text content
  
  // Audio buffers (3 chunks max)
  audioPrefetch: 15_000_000,     // ~15MB MP3 audio
  
  // Vocabulary state + SRS data
  vocabularyData: 2_000_000,     // ~2MB structured data
  
  // UI highlighting elements (virtualized)
  highlightElements: 1_000_000,  // ~1MB DOM elements
  
  // Vector embeddings cache
  embeddingsCache: 10_000_000,   // ~10MB semantic search
  
  // Component state + React overhead
  reactOverhead: 12_000_000,     // ~12MB framework
  
  // Buffer for unexpected growth
  safetyBuffer: 5_000_000        // ~5MB safety margin
}

class MemoryMonitor {
  checkMemoryPressure() {
    if (performance.memory?.usedJSHeapSize > 50_000_000) {
      // Trigger cleanup: clear old audio buffers, simplification cache
      this.aggressiveCleanup();
    }
  }
}
```

### Performance Monitoring & Telemetry

**Real-time Performance Metrics**
```typescript
interface PerformanceMetrics {
  // ESL Feature Performance
  simplificationLatency: number;    // Target: <2s cached, <5s generated
  ttsGenerationTime: number;        // Target: <3s ElevenLabs, <2s OpenAI
  highlightingAccuracy: number;     // % of words highlighted correctly
  
  // Memory & Caching
  cacheHitRatio: number;           // Target: 85%+ simplifications
  memoryUsage: number;             // Target: <50MB per session
  prefetchEffectiveness: number;    // % of prefetched content used
  
  // User Experience
  chunkTransitionGaps: number[];    // Target: <100ms gaps
  initialLoadTime: number;          // Target: <2s to readable content
  vocabularyLookupTime: number;     // Target: <200ms
}

// Automatic performance degradation detection
class PerformanceDegrader {
  adaptToSlowDevice() {
    if (this.detectSlowDevice()) {
      // Reduce chunk sizes, disable prefetch, simplify highlighting
      return {
        chunkSize: 500,              // Smaller chunks for slower devices
        prefetchEnabled: false,       // Disable prefetch to save memory
        highlightingMode: 'minimal'   // Basic highlighting only
      };
    }
  }
}
```

### Chunking Strategy for Reading, TTS & Simplification
**Sentence-Safe Chunking for TTS Continuity**
- **Primary Unit**: Sentence boundaries (preserves natural audio flow like Speechify)
- **Chunk Size**: 500-800 words with sentence completion buffer
- **TTS Continuity**: No word-level highlighting breaks mid-sentence
- **Cross-Chunk Handoff**: Prefetch next chunk at 80% progress, seamless transition

```typescript
interface OptimizedTTSChunk {
  id: string;
  sentences: Array<{
    text: string;
    startTime: number;
    words: Array<{ word: string; start: number; end: number }>;
  }>;
  audioUrl?: string;
  prefetchedBuffer?: ArrayBuffer;  // Preloaded for instant playback
  nextChunkId?: string;
  memoryFootprint: number;         // Track for memory management
}
```

**Vector Search Integration**
- Existing `EnhancedContentChunker` + `VectorService` pipeline
- Pinecone embeddings for semantic similarity
- Fallback to keyword search when vector unavailable
- **Performance**: Vector search cached with 1-hour TTL to reduce API calls

### Reliability & Observability
- Cache hit rates for simplifications (target: 85%+)
- TTS streaming continuity metrics (target: <100ms gaps)
- Semantic similarity confidence scores (gate at 0.82 threshold)
- Memory usage monitoring with automatic cleanup at 80% budget
- Real-time performance degradation detection with adaptive responses

### Decisions
- [x] **Memory Budget**: <50MB per ESL reading session with automatic cleanup
- [x] **Chunking boundaries**: Sentence-safe with 500-800 word target
- [x] **Cache Strategy**: 4-layer caching with smart prefetching and TTL management
- [x] **TTS Optimization**: Provider-specific chunk sizes for fastest response
- [x] **Highlighting Strategy**: Virtualized highlights for large books with object pooling
- [x] **Performance Monitoring**: Real-time metrics with automatic adaptation to slow devices
- [x] **Similarity gating thresholds**: Cosine ≥ 0.82 (allow some flexibility for ESL learning)
- [x] **TTS prefetch**: Begin at 80% chunk progress with 3-chunk queue limit

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

### 🚫 SIMPLIFICATION PRIORITIES: What NOT to Build

#### Features to REMOVE or HIDE for Clean UX:

**1. Visual Noise Elimination**
- ❌ **Remove**: Floating tooltips, pop-overs, and contextual help bubbles
- ❌ **Remove**: Multiple colored highlights (keep ONE subtle highlight for TTS only)
- ❌ **Remove**: Animated transitions between pages (use instant navigation)
- ❌ **Remove**: Gradient backgrounds, shadows, glows (flat design only)
- ❌ **Remove**: Icon animations and hover effects (static icons only)
- ❌ **Remove**: Progress percentage numbers (keep only slim bar)
- ❌ **Remove**: "Click words for definitions" prompt
- ❌ **Remove**: Keyboard shortcut hints floating on screen
- ❌ **Remove**: Cultural context yellow boxes (integrate inline or remove)
- ❌ **Remove**: Similarity score badges

**2. Control Bar Minimalism**
```
CURRENT (Too Complex):
[B1] [Original/Simplified/Compare] [▶] [■] [Speed: 1.0x ----o----] [Auto] [2/5] 12:34

SIMPLIFIED (Clean):
[B1] [Simplified ▼] [▶] [1.0x]                                    2/5
```
- ❌ **Hide**: Stop button (pause is enough)
- ❌ **Hide**: Speed slider (just show current speed, click to adjust)
- ❌ **Hide**: Auto-advance toggle (make it default behavior)
- ❌ **Hide**: Timecodes (keep only page number)
- ❌ **Combine**: Mode switcher into single dropdown

**3. Library Page Decluttering**
- ❌ **Remove**: AI Chat widget (move to separate help page)
- ❌ **Remove**: ESL Progress widget from library (move to profile)
- ❌ **Remove**: Recommendations section (cognitive overload)
- ❌ **Remove**: Multiple filter dropdowns (keep only search)
- ❌ **Remove**: "Upload Book" from main nav (bury in settings)
- ❌ **Remove**: Genre/Year/Author filters (just search is enough)
- ❌ **Remove**: Pagination controls (infinite scroll only)
- ❌ **Remove**: Book cards' publish year and language badges

**4. Reading View Simplification**
- ❌ **Remove**: Compare/Split mode entirely (too complex for ESL learners)
- ❌ **Remove**: Vocabulary lookup on-demand (auto-show for difficult words only)
- ❌ **Remove**: Page navigation arrows (swipe/scroll only)
- ❌ **Remove**: Book title from reading view (users know what they're reading)
- ❌ **Remove**: Source badges during reading (show only in library)

**5. Navigation Bar Reduction**
```
CURRENT:
[📚 BookBridge] [Home] [Library] [Upload Book] [Settings] [Subscription Status] [User Menu]

SIMPLIFIED:
[BookBridge]                                                      [Library] [☰]
```
- ❌ **Remove**: Home link (logo goes to library)
- ❌ **Remove**: Upload Book from nav
- ❌ **Remove**: Settings from nav (in user menu)
- ❌ **Remove**: Subscription status badge (bury in profile)
- ❌ **Remove**: Emoji from logo

### ✅ What to KEEP (Core Features Only)

**Essential Reading Controls:**
- Level selector (B1, B2, etc.) - single tap to change
- Mode toggle (Original/Simplified) - two states only
- Play/Pause button - single action
- Speed indicator - tap to adjust in modal
- Page indicator (2/5) - minimal progress

**Clean Visual Hierarchy:**
```css
/* Remove ALL of this: */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.2);
--shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.4);
--shadow-brand: 0 4px 12px rgba(102, 126, 234, 0.4);
background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%);

/* Use this instead: */
background: #0f172a; /* Single flat color */
border: 1px solid rgba(255, 255, 255, 0.1); /* Subtle borders only */
```

### Mobile-First Simplification
**Current Mobile (cluttered):**
- 6 control buttons in single row
- Long-press interactions
- Swipe gestures competing with text selection

**Simplified Mobile:**
- 3 buttons MAX: [B1] [▶] [Page]
- Tap-only interactions (no long-press)
- Vertical scroll only (no swipes)

### Component Removal Checklist

| Component | Current State | Action | Reason |
|-----------|--------------|--------|---------|
| AIChat | Floating widget | ❌ REMOVE | Visual noise, blocks content |
| SubscriptionStatus | Nav bar badge | ❌ REMOVE | Not essential for reading |
| RecommendationsSection | Library page | ❌ REMOVE | Cognitive overload |
| Tooltips | Hover everywhere | ❌ REMOVE | Clutters interface |
| Animations | Transitions, floats | ❌ REMOVE | Distracting |
| Cultural Notes | Yellow boxes | ❌ REMOVE | Breaks reading flow |
| Compare Mode | Split view | ❌ REMOVE | Too complex |
| Upload Book | Main nav | ❌ HIDE | Not core feature |
| Settings | Main nav | ❌ HIDE | Bury in menu |
| Voice Provider | Control bar | ❌ HIDE | Advanced setting |

### Decisions
- [x] **Remove visual effects**: No gradients, shadows, animations, or transitions
- [x] **Minimize controls**: 3-4 buttons max on reading bar
- [x] **Remove Compare mode**: Too complex for target users  
- [x] **Hide advanced settings**: Voice selection, pronunciation guides to settings
- [x] **Simplify navigation**: Logo + Library + Menu only
- [x] **Remove all floating elements**: No tooltips, help bubbles, or overlays

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

**Tier 1: Primary Books (Original 5)**
1. Pride and Prejudice (gutenberg-1342) ✅ Complete
2. Tom Sawyer (gutenberg-74) ❌ Blocked by API issue
3. Alice in Wonderland (gutenberg-11) ✅ Complete
4. Christmas Carol (gutenberg-46) ❌ Blocked by API issue
5. Great Expectations (gutenberg-1400) ❌ Blocked by API issue

**Tier 2: Additional Priority Books (Database Available)**
6. Emma (gutenberg-158) - Jane Austen
7. A Room with a View (gutenberg-2641) - E.M. Forster
8. Little Women (gutenberg-514) - Louisa May Alcott
9. Romeo and Juliet (gutenberg-1513) - Shakespeare
10. A Modest Proposal (gutenberg-1080) - Jonathan Swift (Self-improvement/Philosophy)

**Processing Schedule**
- Batch process B1/B2 levels first (highest usage)
- A1/A2 on-demand (more variable, personalized)
- C1/C2 minimal processing (preserve original style)

### Decisions
- [x] **Version key format**: `${model}_${promptHash}_v${schema}` 
- [x] **TTL strategy**: 30 days for simplifications, 24h for sessions
- [x] **Precompute scope**: Top 10 priority titles × B1/B2 levels = ~60 high-value assets (expanded from original 5 to 10 books)

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
- [x] Design system: implement tokens (colors/spacing/type) and primitives (Button/Toggle/Tabs/Pager/Tooltip/Sheet/Progress/Toast); wire into reading page
- [x] Reading modes: Original/Simplified/Compare with mode toggle and clear indicators; persist per user/book
- [x] ESL/TTS bar: Level chip A1–C2, Simplify toggle, Play/Pause/Stop, Speed (0.5–1.2×), Auto‑advance toggle; mobile one‑row collapse
- [x] **TEXT SIMPLIFICATION PIPELINE COMPLETE**: Basic chunking API at `/api/books/[id]/simplify`, CEFR-based text chunking (A1: 75 words → C2: 450 words), adaptive font sizes, session timers, database caching
- [ ] Simplification reliability: call API, apply 0.82 similarity gate; on fail → conservative retry → return original with "simplification unavailable" micro‑hint
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

## 8) Technical Risk Assessment

### Component Architecture Risks

**🚨 CRITICAL: Design System Fragmentation**
- **Risk**: 4 different audio components (AudioPlayer, ESLAudioPlayer, SmartAudioPlayer, AudioPlayerWithHighlighting) with duplicate styling logic and hardcoded values
- **Impact**: 813 lines of inline styles in AudioPlayer.tsx will break with new design tokens
- **Files**: `/components/AudioPlayer.tsx:276-811`, `/components/ESLAudioPlayer.tsx:278-609`
- **Prevention**: Create shared `BaseAudioPlayer` with composition pattern before ESL implementation
- **Early Warning**: If you see gradients like `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` hardcoded across multiple components

**🚨 CRITICAL: Missing Design Token System**
- **Risk**: Color `#667eea` appears 47 times across components instead of using design tokens
- **Impact**: Cannot implement ESL-specific theming (reading level colors, proficiency-based layouts)
- **Files**: `/components/Navigation.tsx:30-275`, `/components/AIChat.tsx:604-1540`
- **Prevention**: Extract all hardcoded colors/spacing to CSS custom properties in `globals.css`
- **Early Warning**: Any new component using inline `style` props instead of design system classes

### State Management Risks  

**⚠️ HIGH: Multiple Competing State Systems**
- **Risk**: ESL features will conflict with existing state management patterns
- **Impact**: Race conditions between SmartAudioPlayer chunk state, ESLAudioPlayer mode state, and highlighting state
- **Files**: `/hooks/useESLMode.ts:43-67`, `/hooks/useTextHighlighting.ts:36-54`
- **Prevention**: Implement unified ESL session manager before adding new features
- **Early Warning**: `useState` calls in components that should use shared context

**⚠️ MEDIUM: AccessibilityContext Limitations**
- **Risk**: Current accessibility context doesn't support ESL-specific preferences
- **Impact**: Cannot adjust interface complexity or visual hierarchy for different proficiency levels
- **Files**: `/contexts/AccessibilityContext.tsx:16-23`
- **Prevention**: Extend context with ESL-aware preferences (reading speed, complexity level)
- **Early Warning**: ESL components bypassing accessibility context for styling

### TTS/Highlighting Implementation Risks

**🚨 CRITICAL: Sentence-Safe Chunking Conflicts**  
- **Risk**: Current chunking limits (OpenAI: 1200, ElevenLabs: 1800) conflict with required 500-800 word sentence-safe chunks
- **Impact**: Will create jarring breaks mid-paragraph for ESL learners, breaking learning flow
- **Files**: `/components/SmartAudioPlayer.tsx:54-107`, `/lib/voice-service.ts:55-71`
- **Prevention**: Rewrite chunking logic to prioritize sentence boundaries over arbitrary limits
- **Early Warning**: TTS stops mid-sentence or creates awkward pauses during testing

**🚨 CRITICAL: Highlighting Range API Silent Failures**
- **Risk**: Text highlighting appears to work in dev but fails silently in production (documented issue)
- **Impact**: ESL learners lose critical word-level feedback for vocabulary acquisition
- **Files**: `/lib/highlighting-manager.ts:22-370`, `/docs/HIGHLIGHTING_RANGE_API_ISSUE.md`
- **Prevention**: Implement regex-based fallback as identified in existing documentation
- **Early Warning**: Highlighting works in Chrome dev tools but fails in Safari/Firefox

**🚨 CRITICAL: Cross-Chunk Continuity Failure**
- **Risk**: No handoff mechanism between audio chunks (200ms+ gaps current)
- **Impact**: Breaks ESL learning flow, fails <100ms gap requirement
- **Files**: `/components/SmartAudioPlayer.tsx:260-421`
- **Prevention**: Implement audio prefetching at 80% progress with crossfade transitions
- **Early Warning**: Audible gaps between paragraphs during TTS playback

### Database Migration Risks

**🚨 CRITICAL: SM-2 Algorithm Data Loss**
- **Risk**: Adding SM-2 SRS fields to existing vocabulary records will reset user progress
- **Impact**: All users lose spaced repetition learning history, disrupting established review schedules
- **Files**: `/prisma/schema.prisma:85-92` (esl_vocabulary_progress table)
- **Prevention**: Calculate approximate SRS values from existing mastery_level and encounters data
- **Migration Script**:
```sql
UPDATE esl_vocabulary_progress SET
  repetitions = GREATEST(encounters - 1, 0),
  ease_factor = CASE WHEN mastery_level >= 4 THEN 2.5 WHEN mastery_level >= 2 THEN 2.2 ELSE 1.8 END,
  srs_interval = CASE WHEN next_review > NOW() THEN EXTRACT(days FROM (next_review - NOW())) ELSE 1 END;
```
- **Early Warning**: User complaints about vocabulary words they "already mastered" appearing in reviews

**⚠️ MEDIUM: Index Creation Downtime**  
- **Risk**: Creating performance indices on large tables may require 30-60 minute maintenance window
- **Impact**: Application downtime during peak usage
- **Files**: Database schema modifications for SRS lookups and cache optimization
- **Prevention**: Use `CREATE INDEX CONCURRENTLY` and schedule during low-traffic hours
- **Early Warning**: Query performance degradation as user base grows

### TypeScript Compatibility Risks

**🚨 CRITICAL: CEFR Level Type Fragmentation**
- **Risk**: Multiple conflicting CEFR level definitions will cause runtime type errors
- **Impact**: Components expecting different CEFR interfaces will fail at boundaries
- **Files**: `/lib/voice-service-esl.ts`, `/lib/ai/esl-simplifier.ts`, API routes
- **Prevention**: Create single `CEFRLevel` type in shared types file, audit all usages
- **Early Warning**: TypeScript errors about incompatible CEFR level assignments

**⚠️ HIGH: API Contract Mismatches**
- **Risk**: Frontend components expect different response shapes than synthesis template defines
- **Impact**: ESL features fail with "property undefined" errors in production
- **Files**: API routes vs component interfaces
- **Prevention**: Generate shared type definitions from OpenAPI spec or similar
- **Early Warning**: Frequent null checks in components for properties that "should exist"

### Performance Risks

**🚨 CRITICAL: Memory Budget Violations**
- **Risk**: Current implementation uses 75-120MB per session (target: <50MB)
- **Impact**: Mobile devices run out of memory, causing tab crashes for ESL learners
- **Files**: `/hooks/useTextHighlighting.ts:81-174`, `/components/SmartAudioPlayer.tsx`
- **Prevention**: Implement memory monitoring and aggressive cleanup of audio buffers
- **Early Warning**: Increasing browser memory usage over time, especially on mobile

**🚨 CRITICAL: TTS Gap Performance**
- **Risk**: Current 500-2000ms gaps between chunks (target: <100ms)
- **Impact**: Disrupts ESL learning flow, makes audio books unusable for language acquisition
- **Files**: Voice service TTS chunk handling
- **Prevention**: Implement audio prefetching and crossfade system
- **Early Warning**: Users complaining about "choppy" or "interrupted" audio

**⚠️ HIGH: Real-Time Highlighting Performance**
- **Risk**: 10 FPS polling-based highlighting will cause UI jank on lower-end devices
- **Impact**: Poor user experience for ESL learners on budget Android devices
- **Files**: `/hooks/useTextHighlighting.ts:111-141`
- **Prevention**: Implement virtualized highlighting (only render visible text ranges)
- **Early Warning**: Frame rate drops below 30fps during TTS highlighting

### Content & Legal Risks

**⚠️ MEDIUM: Public Domain Verification Gaps**
- **Risk**: Current system lacks automated copyright validation for ESL-simplified content
- **Impact**: Legal liability for copyrighted content that gets simplified/distributed
- **Files**: Content ingestion and book catalog management
- **Prevention**: Implement strict provenance tracking with pre-1928 validation
- **Early Warning**: Content from ambiguous publication dates appearing in ESL catalog

### Implementation Priority Mitigation Plan

**Phase 1: Critical Infrastructure (Before ESL Development)**
1. Fix highlighting Range API fallback system
2. Implement unified state management for ESL features  
3. Create design token system with ESL-specific variants
4. Add database migrations with proper SRS field population

**Phase 2: Performance Foundation**
1. Implement TTS audio prefetching and crossfade
2. Add memory monitoring and cleanup systems
3. Create performance indices for ESL database queries
4. Implement virtualized text highlighting

**Phase 3: Type Safety & API Contracts** 
1. Standardize CEFR level types across codebase
2. Align API responses with synthesis template contracts
3. Add comprehensive ESL feature type definitions
4. Implement proper error boundaries for ESL components

**Phase 4: Content Safety & Legal**
1. Implement automated copyright verification
2. Add content provenance tracking
3. Create quick removal procedures for questionable content
4. Add cultural sensitivity review workflow

### Success Metrics & Monitoring

**Critical Performance KPIs**:
- TTS chunk gap time: <100ms (currently 500-2000ms)
- Memory usage per session: <50MB (currently 75-120MB)  
- Time-to-first-simplified: <2s cached, <5s generated
- Cache hit rate: >85% for book simplifications

**Technical Stability KPIs**:
- Zero silent highlighting failures in production
- <1% ESL feature runtime errors
- Database migration rollback capability maintained
- TypeScript strict mode compatibility maintained

**Early Warning Alert System**:
```typescript
// Implement monitoring hooks
const useESLPerformanceMonitor = () => {
  // Track memory usage, TTS gaps, API response times
  // Alert when approaching limits
};
```

By addressing these risks proactively, the ESL redesign can succeed without compromising existing functionality or user experience.

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

## 9) Feature Prioritization Matrix

### Executive Summary: The 80/20 Path to Success

Based on the codebase analysis and ESL redesign plan, I've identified that **20% of features will deliver 80% of user value**. The absolute MVP focuses on **reliable text simplification with basic reading modes** - everything else is nice-to-have. The existing codebase already has substantial ESL infrastructure (SRS algorithm, vocabulary pedagogy, simplification API) but lacks the clean reading experience that makes it usable.

### Priority Tiers

#### 🎯 TIER 1: Core MVP (Ship This First)
**These 4 features deliver 80% of value with minimal complexity**

| Feature | User Impact | Effort | Risk | Why Critical |
|---------|------------|--------|------|--------------|
| **1. Basic Reading Modes** | 🔥🔥🔥 | Low | Low | Users need Original OR Simplified, not fancy UI |
| **2. Cached Simplification** | 🔥🔥🔥 | Low | Low | API already exists; just add caching |
| **3. Simple TTS Playback** | 🔥🔥 | Low | Low | Web Speech API only; no ElevenLabs complexity |
| **4. Level Selection** | 🔥🔥🔥 | Low | Low | Single dropdown; persist in localStorage |

**Implementation Path:**
```typescript
// Week 1: Just these 4 features
const MVP = {
  modes: ['original', 'simplified'], // NO compare mode yet
  tts: 'web-speech-only',           // NO ElevenLabs/OpenAI
  caching: 'supabase-only',          // Already implemented
  ui: 'minimal-controls'             // Level + Mode + Play button
};
```

#### ⚡ TIER 2: High-Value Enhancements (Sprint 2)
**Add ONLY after Tier 1 is rock-solid**

| Feature | User Impact | Effort | Risk | Why Wait |
|---------|------------|--------|------|----------|
| **5. Vocabulary Tooltips** | 🔥🔥 | Medium | Low | Existing vocab system; needs UI integration |
| **6. Compare Mode** | 🔥 | Medium | Medium | Complex UI; not essential for learning |
| **7. TTS Auto-advance** | 🔥 | Medium | High | Cross-chunk sync is complex |
| **8. Reading Progress** | 🔥 | Low | Low | Nice metric but not core |

#### 🌟 TIER 3: Nice-to-Have (v2 Features)
**Defer these - they add complexity without proportional value**

| Feature | User Impact | Effort | Risk | Why Defer |
|---------|------------|--------|------|-----------|
| SRS Integration | 🔥 | High | High | Complex; users just want to read |
| ElevenLabs TTS | 💧 | High | High | Expensive, complex WebSocket handling |
| Highlighting Sync | 💧 | High | Very High | Browser compatibility nightmare |
| Cultural Notes | 💧 | Medium | Medium | Information overload for users |
| Reading Analytics | 💧 | Medium | Low | Vanity metrics |
| Pronunciation Guide | 💧 | High | Medium | Requires audio recording |
| Voice Selection | 💧 | Low | Low | Web Speech has limited options |
| Speed Control 0.1x | 💧 | Low | Low | 0.5/0.75/1.0/1.25 is enough |

#### ❌ TIER 4: Cut These Features
**Remove from scope - they hurt more than help**

| Feature | Why Cut |
|---------|---------|
| **Semantic Similarity Gate** | Over-engineering; if AI fails, show original |
| **Precomputation Pipeline** | Premature optimization; cache on-demand |
| **Multi-Model Strategy** | Use Claude Haiku for everything |
| **Vocabulary Mastery Levels** | Too gamified for serious readers |
| **Cross-page Handoff** | Technical debt; restart TTS per page |
| **Gesture Controls** | Mobile browsers are inconsistent |
| **PWA/Offline** | Scope creep; online-only is fine |
| **RTL Support** | <0.1% of ESL learners need this |

### The Absolute MVP Architecture

```typescript
// This is ALL you need for v1
interface MinimalESLReader {
  // Data
  book: { id: string; content: string };
  userLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  
  // UI State (localStorage)
  currentMode: 'original' | 'simplified';
  
  // Core Functions (4 total!)
  simplifyText: (text: string, level: string) => Promise<string>;
  playTTS: () => void;  // Web Speech only
  stopTTS: () => void;
  switchMode: () => void;
}

// That's it. Ship it.
```

### Risk Mitigation Strategy

**High-Risk Features to Avoid in MVP:**
1. **WebSocket TTS** - Connection drops, buffering, sync issues
2. **Word-level Highlighting** - Browser timing inconsistencies  
3. **Cross-chunk Continuity** - State management complexity
4. **SRS Algorithm** - Cognitive overhead for casual readers
5. **Multiple AI Models** - Cost and latency variance

**Low-Risk Quick Wins:**
1. **localStorage Persistence** - Simple, works everywhere
2. **Web Speech API** - Built-in, no dependencies
3. **Supabase Caching** - Already implemented
4. **Basic CSS Modes** - Just toggle classes

### Implementation Timeline

**Week 1: Ship Tier 1 (4 features)**
- Day 1-2: Reading modes UI (Original/Simplified toggle)
- Day 3: Wire up existing simplification API
- Day 4: Add Web Speech TTS (play/stop only)
- Day 5: Testing and polish

**Week 2: Add Tier 2 (if time permits)**
- Day 1-2: Vocabulary tooltips
- Day 3-4: Compare mode
- Day 5: Metrics and monitoring

### Success Metrics for MVP

**User-Facing (What Actually Matters):**
- Time to first simplified text: <3 seconds
- Mode switching: Instant (<100ms)
- TTS reliability: 99%+ (Web Speech is stable)
- Cache hit rate: >80% after first week

**Technical (Keep It Simple):**
- Total LOC added: <1000
- Dependencies added: 0 (use what exists)
- API calls per session: <5
- Error rate: <1%

### Decisions for Immediate Action

- [x] **Cut features aggressively**: Ship 4 core features only
- [x] **Use Web Speech only**: No ElevenLabs in v1
- [x] **Cache everything**: Simplify once, reuse forever
- [x] **Single AI model**: Claude Haiku for all levels
- [x] **No fancy UI**: Text + 3 buttons maximum
- [x] **localStorage only**: No complex state management
- [x] **No highlighting**: Audio plays, text stays static
- [x] **No cross-page**: Each page is independent

### The Counter-Intuitive Truth

**What ESL learners actually want:**
1. Text they can understand (simplified)
2. Audio they can follow (TTS)
3. To not feel stupid (level selection)

**What they DON'T need:**
- Gamification
- Analytics dashboards  
- Perfect word-timing
- Voice variety
- Cultural explanations
- Progress tracking
- Vocabulary drills

**The Painful Reality:** Your beautiful SRS algorithm and vocabulary pedagogy system? Users don't care. They just want to read Harry Potter at their level. Build that first.

---

## Wireframes (to be linked after upload)
- Desktop Original: ../wireframes/desktop-original.png
- Desktop Simplified: ../wireframes/desktop-simplified.png
- Desktop Compare: ../wireframes/desktop-compare.png
- Desktop TTS (playing): ../wireframes/desktop-tts.png
- Mobile Simplified: ../wireframes/mobile-simplified.png
- Level Sheet: ../wireframes/level-sheet.png

## Future Mobile Design Considerations

**Text Display Research Note**: Mobile screens will require adjusted word counts per CEFR level:
- Mobile displays need 15-20% fewer words per screen than desktop
- Optimal mobile ranges: A1: 60 words, A2: 120 words, B1: 200 words, B2: 280 words, C1: 320 words, C2: 360 words
- Touch-friendly level switching and original/simplified toggle required
- Session timers may need mobile-specific shorter intervals due to context switching 