# Text Simplification Research Prompts

## Overview
Research to solve classic literature simplification issues: archaic language fails similarity gate (0.478 vs 0.82 threshold) and 8-10 second latency.

## Book Sources & Content Profile
- **Primary Sources**: Project Gutenberg, Open Library, Google Books (public domain filter)
- **Content**: Classic public-domain English literature (pre-1928)
- **Authors/Styles**: Austen, Dickens, Brontë, Tolstoy, Melville, Twain, Hawthorne, Conan Doyle, Stevenson, etc.
- **Language Challenges**: Victorian/Regency/19th-century American prose, archaic pronouns, long periodic sentences, dialect

## Key Files to Reference
```
app/api/books/[id]/simplify/route.ts          # Current AI + similarity gate + caching
docs/TEXT_SIMPLIFICATION_IMPLEMENTATION.md   # Current design/known issues  
lib/ai/claude-service.ts                      # LLM integration
app/library/[id]/read/page.tsx               # UX trigger, loading states
lib/book-sources/gutenberg-api.ts            # Project Gutenberg integration
lib/book-sources/openlibrary-api.ts          # Open Library integration  
lib/book-sources/google-books-api.ts         # Google Books integration
prisma/schema.prisma                          # bookSimplification table
```

---

## Agent 1: Model & Prompting Strategy
**Use Model**: Claude 3.5 Sonnet
**Output File**: `docs/research/text-simplification/agent-model-prompting.md`

### Research Prompt:
You are researching the best AI models and prompting strategies for simplifying classic public-domain English literature into CEFR-aligned plain English while preserving meaning.

**Context:**
- Current system uses Claude API with 0.82 similarity gate and fails on archaic/period language
- Content includes Victorian/Regency/19th-century American prose (Austen, Dickens, Brontë, Tolstoy, Melville, Twain, Hawthorne, Conan Doyle, Stevenson)
- Text is chunked by CEFR words-per-screen (A1: 75 words, C2: 450 words)
- Must work consistently across different historical prose styles and dialects

**Tasks:**
1. Compare Claude 3.5 Sonnet/Haiku vs GPT-4o on archaic→modern simplification with meaning preservation
2. Propose when to switch models or route by era/style  
3. Design robust prompting patterns (guardrails, "conservative edit" retries, explicit keep-meaning rules, era-aware instructions)
4. Create 5-10 test passages spanning corpus styles and expected failure modes
5. Provide model recommendation matrix (quality, cost, latency), prompt templates, routing heuristics per style/era

**Deliverables:**
- Model comparison and recommendations
- Prompt templates for different eras/styles
- Routing logic for model selection
- Test passages with expected outcomes
- Risk assessment and edge cases

Save findings in: `docs/research/text-simplification/agent-model-prompting.md`

---

## Agent 2: Evaluation & Similarity Gate  
**Use Model**: Claude 3.5 Haiku
**Output File**: `docs/research/text-simplification/agent-evaluation-metrics.md`

### Research Prompt:
You are designing a robust, fast similarity/quality validation system that reduces false rejections on classic prose while preventing meaning drift.

**Context:**
- Current heuristic similarity gate at 0.82 blocks period prose (observed 0.478 on archaic texts)
- Needs per-style thresholding or better metrics
- Validation must complete in <500ms
- Must work across Victorian/Regency/19th-century American literature

**Tasks:**
1. Evaluate embeddings (OpenAI text-embedding-3-large), BERTScore/USE, and hybrid metrics
2. Propose thresholds by era/style and dynamic gating strategies
3. Design a small, fast validator that correlates with human judgment on classic texts
4. Include failure-prevention rules (preserve negation/conditionals/core nouns/tenor)
5. Create lightweight test harness and acceptance criteria
6. Define "acceptable simplification" KPIs

**Deliverables:**
- Metric comparison and recommendations
- Thresholds per literary style/era
- Fast validator design (<500ms)
- Sample evaluation rubric
- Test plan and acceptance criteria

Save findings in: `docs/research/text-simplification/agent-evaluation-metrics.md`

---

## Agent 3: Performance & Systems
**Use Model**: GPT-4o  
**Output File**: `docs/research/text-simplification/agent-performance-systems.md`

### Research Prompt:
You are architecting a system to reduce click-to-simplified latency from ~8-10s to <2s P95.

**Context:**
- Current fetch path: +200-500ms when fetching content via API vs DB
- AI call dominates latency (8-10 seconds total)
- CEFR chunking active, caching via Prisma bookSimplification table
- Background precompute not fully leveraged

**Tasks:**
1. Design architecture to precompute and cache simplifications by bookId × level × chunk
2. Propose background jobs, prefetch next chunk, store full text in DB for direct access
3. Recommend streaming strategies, chunk-size tuning, concurrency controls
4. Outline cache keys/TTL, invalidation strategy, DB schema adjustments
5. Create measurement plan (network, CPU, LLM latency breakdown)
6. Provide rollout strategy with rollback plan

**Deliverables:**
- System architecture diagram
- Step-by-step plan to achieve <2s P95
- Cache strategy and implementation
- DB-first content access plan  
- Performance measurement and rollback strategy

Save findings in: `docs/research/text-simplification/agent-performance-systems.md`

---

## Final Synthesis
**Use Model**: Claude 3.5 Sonnet or GPT-4o
**Output File**: `docs/research/text-simplification/AGENT_SYNTHESIS.md`

### Research Prompt:
Compare and synthesize findings from the three research agents into one actionable proposal with phased implementation.

**Tasks:**
1. Reconcile model choices, thresholds, and performance recommendations
2. Create unified implementation plan with phases
3. Identify conflicts and propose resolutions
4. Provide concrete next steps and success metrics

**Acceptance Criteria to Address:**
- Works across classic public-domain prose (Victorian/Regency/19th-century American)
- Maintains meaning under conservative edits
- Passes improved similarity gate reliably  
- Achieves <2s P95 with caching/prefetching
- Clear KPIs: similarity, information retention, latency, cost

Save synthesis in: `docs/research/text-simplification/AGENT_SYNTHESIS.md`

---

## Instructions for Use

1. **Create output files first** (if they don't exist):
   ```bash
   touch docs/research/text-simplification/agent-model-prompting.md
   touch docs/research/text-simplification/agent-evaluation-metrics.md  
   touch docs/research/text-simplification/agent-performance-systems.md
   touch docs/research/text-simplification/AGENT_SYNTHESIS.md
   ```

2. **Run each agent prompt** in Cursor using the specified model

3. **Save findings** in the designated files as you complete each research task

4. **Final step**: Run synthesis prompt to combine all findings into actionable plan 