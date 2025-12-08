# Modern Story Sources - Incremental Implementation Plan

**Date:** December 2024  
**Purpose:** Break down pilot phase into 2-3 day actionable increments  
**Reference:** Consolidated Implementation Plan + Agent Findings

**Integration with Existing Workflows:**
- **`docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md`** - 21-step checklist for story implementation (Steps 0.25-15)
- **`docs/MODERN_VOICES_IMPLEMENTATION_GUIDE.md`** - Technical implementation guide for modern content (database seeding, API, frontend)
- **`docs/implementation/CODEBASE_OVERVIEW.md`** - Architecture reference and file locations

**How This Plan Works:**
- Each increment maps to specific steps in `MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md`
- Technical details reference `MODERN_VOICES_IMPLEMENTATION_GUIDE.md`
- Follows extraction approach: Extract themes → Rewrite as original narrative → Process for ESL

---

## Overview

This plan breaks the 5 pilot stories into 2-3 day increments, allowing for continuous feedback and course correction. Each increment delivers value and can be tested independently.

**Pilot Phase Total:** 6-8 weeks (5 stories)  
**Increment Size:** 2-3 days per increment  
**Total Increments:** 15 increments across 5 stories

**Workflow Integration:**
- **Increment 1 (Research):** Maps to Steps 0.25, 0.5, 1, 2 in MODERN_CONTENT
- **Increment 2 (Narrative):** Maps to Steps 2.5, 3, 3.5 in MODERN_CONTENT
- **Increment 3 (Processing):** Maps to Steps 4-15 in MODERN_CONTENT + MODERN_VOICES technical guide

---

## How to Use This Plan with Existing Workflow Files

### Step-by-Step Usage Guide

**1. Start with This Incremental Plan**
- Read the increment you're working on (e.g., Increment 1)
- See which MODERN_CONTENT steps it maps to

**2. Reference MODERN_CONTENT for Detailed Steps**
- Open `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md`
- Find the specific steps referenced in the increment (e.g., Step 0.25, 0.5, 1, 2)
- Follow the detailed instructions for each step

**3. Reference MODERN_VOICES for Technical Details**
- Open `docs/MODERN_VOICES_IMPLEMENTATION_GUIDE.md`
- Use for technical implementation details:
  - Database seeding format (Phase 2)
  - API endpoint structure (Phase 6)
  - Frontend integration (Phase 6)
  - Audio generation settings (Phase 4)

**4. Follow Extraction Strategy**
- **CRITICAL:** This plan uses the "extract themes, not text" approach
- Never copy text from sources - always extract themes and rewrite
- Reference `docs/MODERN_STORY_EXTRACTION_STRATEGY.md` for extraction methodology
- Reference `docs/research/Agent2_Legal_Compliance_Findings.md` for legal safety

### Quick Reference: Step Mapping

| Increment | MODERN_CONTENT Steps | MODERN_VOICES Phases | Key Focus |
|-----------|---------------------|---------------------|-----------|
| **Increment 1** | 0.25, 0.5, 1, 2 | - | Research & validation |
| **Increment 2** | 2.5, 3, 3.5 | - | Narrative creation |
| **Increment 3** | 4-15 | 1-6 | Processing & integration |

### File Locations Reference

- **Strategy & Steps:** `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md`
- **Technical Guide:** `docs/MODERN_VOICES_IMPLEMENTATION_GUIDE.md`
- **Extraction Strategy:** `docs/MODERN_STORY_EXTRACTION_STRATEGY.md`
- **Legal Safety:** `docs/research/Agent2_Legal_Compliance_Findings.md`
- **Codebase Overview:** `docs/implementation/CODEBASE_OVERVIEW.md`

---

## Story 1: "Teen Translating for Parents Through Hospital Chaos"

### Increment 1: Research & Theme Extraction (Days 1-2)
**Goal:** Gather sources and extract themes/emotional moments

**Reference:** `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 0.25, 0.5, 1, 2

**Tasks:**
- [ ] **Step 0.25: Source Material Check** (MODERN_CONTENT)
  - Verify story-driven (not fact-driven)
  - Verify length can reach 15-20 minutes (A2 target)
  - Verify enough content for engaging narrative
- [ ] **Step 0.5: Emotional Impact Validation** (MODERN_CONTENT)
  - "Text a friend" test: Would someone share this?
  - Identify clear emotional arc: struggle → perseverance → breakthrough
  - Document 5-7 specific emotional moments
  - Identify 3+ ESL resonance multipliers
  - Compare to Helen Keller benchmark
- [ ] **Step 1: Extract Source Text** (MODERN_CONTENT)
  - Access Vox First Person article (manual scrape)
  - Find 2-3 additional sources (news articles, interviews)
  - **CRITICAL:** Extract themes only (NOT text) - follow extraction strategy
  - Read/watch all sources (factual research)
  - Extract themes: language barrier, medical emergency, teen advocacy, confidence building
  - Cross-reference facts across sources
- [ ] **Step 2: Clean & Structure Text** (MODERN_CONTENT)
  - Document themes in your own words (not copying)
  - Create theme extraction document
  - Verify legal compliance (multiple sources, themes only)

**Deliverables:**
- Source list (3-5 sources)
- Theme extraction document (themes only, not text)
- Emotional moments list (7 moments)
- Legal compliance checklist ✅
- Step 0.25 validation document
- Step 0.5 validation document

**Definition of Done:**
- [ ] 3-5 sources identified and accessed
- [ ] Themes extracted (not text copied) - verified no text copying
- [ ] 7 emotional moments documented
- [ ] Step 0.25 validation passed (story-driven, length OK)
- [ ] Step 0.5 validation passed (emotional impact confirmed)
- [ ] Legal compliance verified (multiple sources, fair use)
- [ ] Ready for narrative creation

**Ship:** Research complete, themes extracted  
**Test:** Verify themes are extracted (not text), verify multiple sources used, verify Step 0.25/0.5 passed

---

### Increment 2: Narrative Creation (Days 3-4)
**Goal:** Write original narrative based on themes

**Reference:** `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 2.5, 3, 3.5

**Tasks:**
- [ ] **Step 2.5: Narrative Structure Creation** (MODERN_CONTENT)
  - Transform themes into story arc: struggle → crisis → breakthrough → confidence
  - Identify struggle moment (beginning challenge)
  - Identify perseverance moments (middle obstacles)
  - Identify breakthrough moment (triumph/achievement)
  - Create emotional journey map
  - Document 5-7 key emotional moments for story flow
- [ ] **Step 3: Create Background Context** (MODERN_CONTENT)
  - Write 2-3 sentence factual background (30-50 words)
  - Format: Neutral, factual tone (no spoilers)
  - Content: Cultural/social context needed to understand story
  - Save to: `cache/teen-translating-background.txt`
- [ ] **Step 3.5: Create Emotional Hook** (MODERN_CONTENT)
  - Write opening hook paragraph (50-100 words)
  - Format: Start with struggle, not facts (e.g., "Imagine..." or "At 16 years old...")
  - Style: Emotional, engaging, creates curiosity
  - Elements: Struggle/challenge → "But then..." → creates desire to continue
  - Save to: `cache/teen-translating-hook.txt`
- [ ] **Write Main Story** (Original narrative based on themes)
  - Create original narrative structure (don't mimic source)
  - Write in your own voice and style
  - Use your own transitions and context
  - Ensure 15-20 minute length (A2 level target)
  - Save to: `cache/teen-translating-original.txt`
- [ ] **Plagiarism Check**
  - Run plagiarism checker on final story
  - Verify no exact text matches source
  - Verify original narrative structure

**Deliverables:**
- Background context text (`cache/teen-translating-background.txt`)
- Emotional hook text (`cache/teen-translating-hook.txt`)
- Main story text (original narrative) (`cache/teen-translating-original.txt`)
- Narrative structure document

**Definition of Done:**
- [ ] Background context written (30-50 words)
- [ ] Emotional hook written (50-100 words)
- [ ] Main story written (original narrative, not copied)
- [ ] Length verified (15-20 minutes)
- [ ] Plagiarism check passed (no text matches sources)
- [ ] Original narrative structure verified (not mimicking source)
- [ ] Ready for processing

**Ship:** Complete narrative ready for simplification  
**Test:** Run plagiarism checker, verify no text matches sources, verify original structure

---

### Increment 3: Processing & Integration (Days 5-6)
**Goal:** Simplify, generate audio, integrate into BookBridge

**Reference:** 
- `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 4-15
- `docs/MODERN_VOICES_IMPLEMENTATION_GUIDE.md` Phases 1-6 (technical details)

**Tasks:**
- [ ] **Step 4: Text Simplification** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/simplify-teen-translating.js A2`
  - Maintain 1:1 sentence count mapping (CRITICAL)
  - Generate compound sentences (NOT micro-sentences)
  - A2: 8-15 words average with connectors "and", "but", "so", "then"
  - ENFORCE sentence length limits: A2 max 15 words
  - Cache results after every 10 sentences
  - Save to: `cache/teen-translating-A2-simplified.txt`
- [ ] **Step 7: Generate Combined Preview Text** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/generate-teen-translating-preview.js A2`
  - **Combine:** Preview (50-75 words) + Background Context (30-50 words) + Emotional Hook (50-100 words)
  - Format: Unified intro section with visual separators (handled in frontend)
  - Total length: ~130-225 words
  - Save to: `cache/teen-translating-A2-preview-combined.txt`
- [ ] **Step 8: Generate Combined Preview Audio** (MODERN_CONTENT)
  - Generate audio for ENTIRE combined text (preview + background + hook)
  - Use Jane voice (RILOU7YmBhvwJGDGjNmP)
  - Apply FFmpeg 0.85× slowdown
  - Measure duration with ffprobe (Solution 1)
  - Upload to Supabase: `teen-translating/A2/preview-combined.mp3`
  - Save metadata: `cache/teen-translating-A2-preview-combined-audio.json`
- [ ] **Step 10.5: Generate Bundle Audio (PILOT FIRST)** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/generate-teen-translating-bundles.js A2 --pilot`
  - Run pilot with 10 bundles first
  - Use Jane voice with production settings (stability 0.5, similarity_boost 0.8, style 0.05)
  - Apply FFmpeg 0.85× slowdown
  - Use Enhanced Timing v3 (character-count proportion, punctuation penalties)
  - Measure duration with ffprobe (Solution 1)
- [ ] **Step 11: Full Bundle Generation** (MODERN_CONTENT)
  - After pilot validation: `node scripts/generate-teen-translating-bundles.js A2`
  - Script saves progress after each bundle (can resume if interrupted)
- [ ] **Step 11.5: Database Integration** (MODERN_CONTENT)
  - Create script: `scripts/integrate-teen-translating-a2-database.ts`
  - Load bundle metadata from cache
  - Create/update BookChunk records with Solution 1 timing format
  - **CRITICAL:** Use startTime/endTime format (NOT start/end)
  - Run: `npx tsx scripts/integrate-teen-translating-a2-database.ts`
- [ ] **Step 5: Create Seed Script** (MODERN_VOICES)
  - Create `scripts/seed-teen-translating.ts`
  - Set `isClassic: false` (CRITICAL for Modern Voices collection)
  - Create FeaturedBook, BookCollection, BookCollectionMembership records
  - Run: `npx tsx scripts/seed-teen-translating.ts`
- [ ] **Step 13: Create API Endpoint** (MODERN_CONTENT)
  - Create `app/api/teen-translating-a2/bundles/route.ts`
  - **MANDATORY API RESPONSE FIELDS:**
    - success, bookId, title, author, level, bundles, bundleCount, totalSentences
    - previewCombined, previewCombinedAudio (unified intro section)
  - Load combined preview from cache: `cache/teen-translating-A2-preview-combined.txt`
  - Load combined preview audio from cache: `cache/teen-translating-A2-preview-combined-audio.json`
- [ ] **Step 13.2: Update Frontend Component** (MODERN_CONTENT)
  - Edit `components/reading/BundleReadingInterface.tsx`
  - Display unified intro section with visual separators
  - Single audio player for entire combined section
  - Visual separators between preview/background/hook sections
  - Display order: Combined Intro Section → Story Content
- [ ] **Step 14: Update Frontend Config** (MODERN_VOICES)
  - Update `lib/config/books.ts`
  - Add to ALL_FEATURED_BOOKS, BOOK_API_MAPPINGS, BOOK_DEFAULT_LEVELS, MULTI_LEVEL_BOOKS
- [ ] **Step 15: Testing** (MODERN_CONTENT)
  - Test reading route: `/read/teen-translating-a2`
  - Verify audio playback and highlighting sync
  - Verify background context and hook display correctly

**Deliverables:**
- A2 simplified text (`cache/teen-translating-A2-simplified.txt`)
- Combined preview text and audio (`cache/teen-translating-A2-preview-combined.txt`, `.json`)
- Bundle audio files (uploaded to Supabase)
- Database records (FeaturedBook, BookCollection, BookChunk)
- API endpoint (`app/api/teen-translating-a2/bundles/route.ts`)
- Frontend integration (`lib/config/books.ts`, `BundleReadingInterface.tsx`)

**Definition of Done:**
- [ ] A2 simplified text complete
- [ ] Preview text and audio generated
- [ ] Bundle audio generated and uploaded (pilot + full)
- [ ] Database seeded correctly (FeaturedBook + Collection + Chunks)
- [ ] API endpoint working (returns all required fields)
- [ ] Frontend integration complete (config + component updates)
- [ ] Reading route tested (`/read/teen-translating-a2`)
- [ ] Background context and hook display correctly
- [ ] Audio playback and highlighting sync verified

**Ship:** Story 1 complete and live in BookBridge  
**Test:** Full reading experience, audio playback, highlighting sync, background context and hook display

---

## Story 2: "Undocumented Student Becomes Lawyer Helping Others"

### Increment 4: Research & Theme Extraction (Days 7-8)
**Goal:** Gather sources and extract themes/emotional moments

**Reference:** `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 0.25, 0.5, 1, 2

**Tasks:**
- [ ] **Step 0.25: Source Material Check** (MODERN_CONTENT)
  - Verify story-driven (not fact-driven)
  - Verify length can reach 30-35 minutes (B1 target)
  - Verify enough content for engaging narrative
- [ ] **Step 0.5: Emotional Impact Validation** (MODERN_CONTENT)
  - "Text a friend" test: Would someone share this?
  - Identify clear emotional arc: fear → education → breakthrough → service
  - Document 5-7 specific emotional moments
  - Identify 3+ ESL resonance multipliers
  - Compare to Helen Keller benchmark
- [ ] **Step 1: Extract Source Text** (MODERN_CONTENT)
  - Access WaPo/NYT articles (manual scrape)
  - Find 2-3 additional sources (interviews, profiles)
  - **CRITICAL:** Extract themes only (NOT text) - follow extraction strategy
  - Read all sources (factual research)
  - Extract themes: undocumented barriers, law school journey, bar exam, service to others
  - Cross-reference facts across sources
- [ ] **Step 2: Clean & Structure Text** (MODERN_CONTENT)
  - Document themes in your own words (not copying)
  - Create theme extraction document
  - Verify legal compliance (multiple sources, themes only)

**Deliverables:**
- Source list (3-5 sources)
- Theme extraction document (themes only, not text)
- Emotional moments list (7 moments)
- Legal compliance checklist ✅
- Step 0.25 validation document
- Step 0.5 validation document

**Definition of Done:**
- [ ] 3-5 sources identified and accessed
- [ ] Themes extracted (not text copied) - verified no text copying
- [ ] 7 emotional moments documented
- [ ] Step 0.25 validation passed (story-driven, length OK)
- [ ] Step 0.5 validation passed (emotional impact confirmed)
- [ ] Legal compliance verified (multiple sources, fair use)
- [ ] Ready for narrative creation

**Ship:** Research complete  
**Test:** Verify themes extracted, multiple sources used, verify Step 0.25/0.5 passed

---

### Increment 5: Narrative Creation (Days 9-10)
**Goal:** Write original narrative based on themes

**Reference:** `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 2.5, 3, 3.5

**Tasks:**
- [ ] **Step 2.5: Narrative Structure Creation** (MODERN_CONTENT)
  - Transform themes into story arc: fear → education → breakthrough → service
  - Identify struggle moment (beginning challenge - undocumented barriers)
  - Identify perseverance moments (middle obstacles - law school, bar exam)
  - Identify breakthrough moment (triumph/achievement - passing bar, first case)
  - Create emotional journey map
  - Document 5-7 key emotional moments for story flow
- [ ] **Step 3: Create Background Context** (MODERN_CONTENT)
  - Write 2-3 sentence factual background (30-50 words)
  - Format: Neutral, factual tone (no spoilers)
  - Content: Context about undocumented students and legal barriers
  - Save to: `cache/undocumented-lawyer-background.txt`
- [ ] **Step 3.5: Create Emotional Hook** (MODERN_CONTENT)
  - Write opening hook paragraph (50-100 words)
  - Format: Start with struggle, not facts
  - Style: Emotional, engaging, creates curiosity
  - Elements: Fear → "But then..." → creates desire to continue
  - Save to: `cache/undocumented-lawyer-hook.txt`
- [ ] **Write Main Story** (Original narrative based on themes)
  - Create original narrative structure (don't mimic source)
  - Write in your own voice and style
  - Use your own transitions and context
  - Ensure 30-35 minute length (B1 level target)
  - Save to: `cache/undocumented-lawyer-original.txt`
- [ ] **Plagiarism Check**
  - Run plagiarism checker on final story
  - Verify no exact text matches source
  - Verify original narrative structure

**Deliverables:**
- Background context text (`cache/undocumented-lawyer-background.txt`)
- Emotional hook text (`cache/undocumented-lawyer-hook.txt`)
- Main story text (original narrative) (`cache/undocumented-lawyer-original.txt`)
- Narrative structure document

**Definition of Done:**
- [ ] Background context written (30-50 words)
- [ ] Emotional hook written (50-100 words)
- [ ] Main story written (original narrative, not copied)
- [ ] Length verified (30-35 minutes)
- [ ] Plagiarism check passed (no text matches sources)
- [ ] Original narrative structure verified (not mimicking source)
- [ ] Ready for processing

**Ship:** Complete narrative ready  
**Test:** Run plagiarism checker, verify no text matches sources, verify original structure

---

### Increment 6: Processing & Integration (Days 11-12)
**Goal:** Simplify, generate audio, integrate

**Reference:** 
- `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 4-15
- `docs/MODERN_VOICES_IMPLEMENTATION_GUIDE.md` Phases 1-6 (technical details)

**Tasks:**
- [ ] **Step 4: Text Simplification** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/simplify-undocumented-lawyer.js B1`
  - Maintain 1:1 sentence count mapping (CRITICAL)
  - Generate compound sentences (NOT micro-sentences)
  - B1: 12-25 words average with connectors "however", "meanwhile", "therefore"
  - ENFORCE sentence length limits: B1 max 25 words
  - Cache results after every 10 sentences
  - Save to: `cache/undocumented-lawyer-B1-simplified.txt`
- [ ] **Step 7: Generate Combined Preview Text** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/generate-undocumented-lawyer-preview.js B1`
  - **Combine:** Preview (50-75 words) + Background Context (30-50 words) + Emotional Hook (50-100 words)
  - Format: Unified intro section with visual separators (handled in frontend)
  - Total length: ~130-225 words
  - Save to: `cache/undocumented-lawyer-B1-preview-combined.txt`
- [ ] **Step 8: Generate Combined Preview Audio** (MODERN_CONTENT)
  - Generate audio for ENTIRE combined text (preview + background + hook)
  - Use Jane voice (RILOU7YmBhvwJGDGjNmP)
  - Apply FFmpeg 0.85× slowdown
  - Measure duration with ffprobe (Solution 1)
  - Upload to Supabase: `undocumented-lawyer/B1/preview-combined.mp3`
  - Save metadata: `cache/undocumented-lawyer-B1-preview-combined-audio.json`
- [ ] **Step 10.5: Generate Bundle Audio (PILOT FIRST)** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/generate-undocumented-lawyer-bundles.js B1 --pilot`
  - Run pilot with 10 bundles first
  - Use Jane voice with production settings
  - Apply FFmpeg 0.85× slowdown
  - Use Enhanced Timing v3 (character-count proportion, punctuation penalties)
  - Measure duration with ffprobe (Solution 1)
- [ ] **Step 11: Full Bundle Generation** (MODERN_CONTENT)
  - After pilot validation: `node scripts/generate-undocumented-lawyer-bundles.js B1`
  - Script saves progress after each bundle
- [ ] **Step 11.5: Database Integration** (MODERN_CONTENT)
  - Create script: `scripts/integrate-undocumented-lawyer-b1-database.ts`
  - Load bundle metadata from cache
  - Create/update BookChunk records with Solution 1 timing format
  - **CRITICAL:** Use startTime/endTime format (NOT start/end)
  - Run: `npx tsx scripts/integrate-undocumented-lawyer-b1-database.ts`
- [ ] **Step 5: Create Seed Script** (MODERN_VOICES)
  - Create `scripts/seed-undocumented-lawyer.ts`
  - Set `isClassic: false` (CRITICAL for Modern Voices collection)
  - Create FeaturedBook, BookCollection, BookCollectionMembership records
  - Run: `npx tsx scripts/seed-undocumented-lawyer.ts`
- [ ] **Step 13: Create API Endpoint** (MODERN_CONTENT)
  - Create `app/api/undocumented-lawyer-b1/bundles/route.ts`
  - **MANDATORY API RESPONSE FIELDS:**
    - success, bookId, title, author, level, bundles, bundleCount, totalSentences
    - previewCombined, previewCombinedAudio (unified intro section)
  - Load combined preview from cache: `cache/undocumented-lawyer-B1-preview-combined.txt`
  - Load combined preview audio from cache: `cache/undocumented-lawyer-B1-preview-combined-audio.json`
- [ ] **Step 13.2: Update Frontend Component** (MODERN_CONTENT)
  - Edit `components/reading/BundleReadingInterface.tsx`
  - Display unified intro section with visual separators
  - Single audio player for entire combined section
  - Visual separators between preview/background/hook sections
- [ ] **Step 14: Update Frontend Config** (MODERN_VOICES)
  - Update `lib/config/books.ts`
  - Add to ALL_FEATURED_BOOKS, BOOK_API_MAPPINGS, BOOK_DEFAULT_LEVELS, MULTI_LEVEL_BOOKS
- [ ] **Step 15: Testing** (MODERN_CONTENT)
  - Test reading route: `/read/undocumented-lawyer-b1`
  - Verify audio playback and highlighting sync
  - Verify background context and hook display correctly

**Deliverables:**
- B1 simplified text (`cache/undocumented-lawyer-B1-simplified.txt`)
- Combined preview text and audio (`cache/undocumented-lawyer-B1-preview-combined.txt`, `.json`)
- Bundle audio files (uploaded to Supabase)
- Database records (FeaturedBook, BookCollection, BookChunk)
- API endpoint (`app/api/undocumented-lawyer-b1/bundles/route.ts`)
- Frontend integration (`lib/config/books.ts`)

**Definition of Done:**
- [ ] B1 simplified text complete
- [ ] Combined preview text and audio generated (unified intro section)
- [ ] Bundle audio generated and uploaded (pilot + full)
- [ ] Database seeded correctly (FeaturedBook + Collection + Chunks)
- [ ] API endpoint working (returns all required fields)
- [ ] Frontend integration complete (config updates)
- [ ] Reading route tested (`/read/undocumented-lawyer-b1`)
- [ ] Unified intro section displays correctly with visual separators
- [ ] Audio playback and highlighting sync verified

**Ship:** Story 2 complete and live  
**Test:** Full reading experience, audio playback, highlighting sync, background context and hook display

---

## Story 3: "First-Gen Student Teaching Dad to Read"

### Increment 7: Research & Theme Extraction (Days 13-14)
**Goal:** Gather sources and extract themes

**Reference:** `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 0.25, 0.5, 1, 2

**Tasks:**
- [ ] **Step 0.25: Source Material Check** (MODERN_CONTENT)
  - Verify story-driven (not fact-driven)
  - Verify length can reach 15-20 minutes (A1 target)
  - Verify enough content for engaging narrative
- [ ] **Step 0.5: Emotional Impact Validation** (MODERN_CONTENT)
  - "Text a friend" test: Would someone share this?
  - Identify clear emotional arc: discovery → teaching → struggle → breakthrough
  - Document 5-7 specific emotional moments
  - Identify 3+ ESL resonance multipliers
  - Compare to Helen Keller benchmark
- [ ] **Step 1: Extract Source Text** (MODERN_CONTENT)
  - Access Reddit r/TwoXChromosomes (Reddit API)
  - Find 1-2 related sources (similar stories for themes)
  - **CRITICAL:** Extract themes only (NOT text) - heavily paraphrase Reddit content
  - Read all sources (factual research)
  - Extract themes: family literacy, teaching, intergenerational connection, breakthrough
  - Cross-reference facts across sources
- [ ] **Step 2: Clean & Structure Text** (MODERN_CONTENT)
  - Document themes in your own words (heavily paraphrased from Reddit)
  - Create theme extraction document
  - Verify legal compliance (transformative use, heavily paraphrased)

**Deliverables:**
- Source list (Reddit + 1-2 related sources)
- Theme extraction document (themes only, heavily paraphrased)
- Emotional moments list (7 moments)
- Legal compliance checklist ✅
- Step 0.25 validation document
- Step 0.5 validation document

**Definition of Done:**
- [ ] Sources identified (Reddit + related sources)
- [ ] Themes extracted (heavily paraphrased from Reddit, not text copied)
- [ ] 7 emotional moments documented
- [ ] Step 0.25 validation passed (story-driven, length OK)
- [ ] Step 0.5 validation passed (emotional impact confirmed)
- [ ] Legal compliance verified (transformative use, heavy paraphrasing)
- [ ] Ready for narrative creation

**Ship:** Research complete  
**Test:** Verify heavy paraphrasing, no text copying, verify Step 0.25/0.5 passed

---

### Increment 8: Narrative Creation (Days 15-16)
**Goal:** Write original narrative

**Reference:** `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 2.5, 3, 3.5

**Tasks:**
- [ ] **Step 2.5: Narrative Structure Creation** (MODERN_CONTENT)
  - Transform themes into story arc: discovery → teaching → struggle → breakthrough
  - Identify struggle moment (beginning challenge - discovering dad's illiteracy)
  - Identify perseverance moments (middle obstacles - teaching struggles, frustration)
  - Identify breakthrough moment (triumph/achievement - first word recognition, finishing book)
  - Create emotional journey map
  - Document 5-7 key emotional moments for story flow
- [ ] **Step 3: Create Background Context** (MODERN_CONTENT)
  - Write 2-3 sentence factual background (30-50 words)
  - Format: Neutral, factual tone (no spoilers)
  - Content: Context about adult literacy and family dynamics
  - Save to: `cache/teaching-dad-read-background.txt`
- [ ] **Step 3.5: Create Emotional Hook** (MODERN_CONTENT)
  - Write opening hook paragraph (50-100 words)
  - Format: Start with struggle, not facts
  - Style: Emotional, engaging, creates curiosity
  - Elements: Discovery → "But then..." → creates desire to continue
  - Save to: `cache/teaching-dad-read-hook.txt`
- [ ] **Write Main Story** (Original narrative based on themes)
  - Create original narrative structure (don't mimic Reddit post)
  - Write in your own voice and style (heavily paraphrased from Reddit)
  - Use your own transitions and context
  - Ensure 15-20 minute length (A1 level target)
  - Save to: `cache/teaching-dad-read-original.txt`
- [ ] **Plagiarism Check**
  - Run plagiarism checker on final story
  - Verify no exact text matches Reddit source
  - Verify original narrative structure (heavily transformed)

**Deliverables:**
- Background context text (`cache/teaching-dad-read-background.txt`)
- Emotional hook text (`cache/teaching-dad-read-hook.txt`)
- Main story text (original narrative) (`cache/teaching-dad-read-original.txt`)
- Narrative structure document

**Definition of Done:**
- [ ] Background context written (30-50 words)
- [ ] Emotional hook written (50-100 words)
- [ ] Main story written (original narrative, heavily paraphrased from Reddit)
- [ ] Length verified (15-20 minutes)
- [ ] Plagiarism check passed (no text matches Reddit source)
- [ ] Original narrative structure verified (not mimicking Reddit post)
- [ ] Ready for processing

**Ship:** Complete narrative ready  
**Test:** Run plagiarism checker, verify heavy paraphrasing, verify original structure

---

### Increment 9: Processing & Integration (Days 17-18)
**Goal:** Simplify, generate audio, integrate

**Reference:** 
- `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 4-15
- `docs/MODERN_VOICES_IMPLEMENTATION_GUIDE.md` Phases 1-6 (technical details)

**Tasks:**
- [ ] **Step 4: Text Simplification** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/simplify-teaching-dad-read.js A1`
  - Maintain 1:1 sentence count mapping (CRITICAL)
  - Generate compound sentences (NOT micro-sentences)
  - A1: 6-12 words average with simple connectors "and", "but", "when"
  - ENFORCE sentence length limits: A1 max 12 words
  - Cache results after every 10 sentences
  - Save to: `cache/teaching-dad-read-A1-simplified.txt`
- [ ] **Step 7: Generate Combined Preview Text** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/generate-teaching-dad-read-preview.js A1`
  - **Combine:** Preview (50-75 words) + Background Context (30-50 words) + Emotional Hook (50-100 words)
  - Format: Unified intro section with visual separators (handled in frontend)
  - Total length: ~130-225 words, A1 level language
  - Save to: `cache/teaching-dad-read-A1-preview-combined.txt`
- [ ] **Step 8: Generate Combined Preview Audio** (MODERN_CONTENT)
  - Generate audio for ENTIRE combined text (preview + background + hook)
  - Use Jane voice (RILOU7YmBhvwJGDGjNmP)
  - Apply FFmpeg 0.85× slowdown
  - Measure duration with ffprobe (Solution 1)
  - Upload to Supabase: `teaching-dad-read/A1/preview-combined.mp3`
  - Save metadata: `cache/teaching-dad-read-A1-preview-combined-audio.json`
- [ ] **Step 10.5: Generate Bundle Audio (PILOT FIRST)** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/generate-teaching-dad-read-bundles.js A1 --pilot`
  - Run pilot with 10 bundles first
  - Use Jane voice with production settings
  - Apply FFmpeg 0.85× slowdown
  - Use Enhanced Timing v3 (character-count proportion, punctuation penalties)
  - Measure duration with ffprobe (Solution 1)
- [ ] **Step 11: Full Bundle Generation** (MODERN_CONTENT)
  - After pilot validation: `node scripts/generate-teaching-dad-read-bundles.js A1`
  - Script saves progress after each bundle
- [ ] **Step 11.5: Database Integration** (MODERN_CONTENT)
  - Create script: `scripts/integrate-teaching-dad-read-a1-database.ts`
  - Load bundle metadata from cache
  - Create/update BookChunk records with Solution 1 timing format
  - **CRITICAL:** Use startTime/endTime format (NOT start/end)
  - Run: `npx tsx scripts/integrate-teaching-dad-read-a1-database.ts`
- [ ] **Step 5: Create Seed Script** (MODERN_VOICES)
  - Create `scripts/seed-teaching-dad-read.ts`
  - Set `isClassic: false` (CRITICAL for Modern Voices collection)
  - Create FeaturedBook, BookCollection, BookCollectionMembership records
  - Run: `npx tsx scripts/seed-teaching-dad-read.ts`
- [ ] **Step 13: Create API Endpoint** (MODERN_CONTENT)
  - Create `app/api/teaching-dad-read-a1/bundles/route.ts`
  - **MANDATORY API RESPONSE FIELDS:**
    - success, bookId, title, author, level, bundles, bundleCount, totalSentences
    - previewCombined, previewCombinedAudio (unified intro section)
  - Load combined preview from cache: `cache/teaching-dad-read-A1-preview-combined.txt`
  - Load combined preview audio from cache: `cache/teaching-dad-read-A1-preview-combined-audio.json`
- [ ] **Step 13.2: Update Frontend Component** (MODERN_CONTENT)
  - Edit `components/reading/BundleReadingInterface.tsx`
  - Display unified intro section with visual separators
  - Single audio player for entire combined section
  - Visual separators between preview/background/hook sections
- [ ] **Step 14: Update Frontend Config** (MODERN_VOICES)
  - Update `lib/config/books.ts`
  - Add to ALL_FEATURED_BOOKS, BOOK_API_MAPPINGS, BOOK_DEFAULT_LEVELS, MULTI_LEVEL_BOOKS
- [ ] **Step 15: Testing** (MODERN_CONTENT)
  - Test reading route: `/read/teaching-dad-read-a1`
  - Verify audio playback and highlighting sync
  - Verify background context and hook display correctly

**Deliverables:**
- A1 simplified text (`cache/teaching-dad-read-A1-simplified.txt`)
- Combined preview text and audio (`cache/teaching-dad-read-A1-preview-combined.txt`, `.json`)
- Bundle audio files (uploaded to Supabase)
- Database records (FeaturedBook, BookCollection, BookChunk)
- API endpoint (`app/api/teaching-dad-read-a1/bundles/route.ts`)
- Frontend integration (`lib/config/books.ts`)

**Definition of Done:**
- [ ] A1 simplified text complete
- [ ] Combined preview text and audio generated (unified intro section)
- [ ] Bundle audio generated and uploaded (pilot + full)
- [ ] Database seeded correctly (FeaturedBook + Collection + Chunks)
- [ ] API endpoint working (returns all required fields)
- [ ] Frontend integration complete (config updates)
- [ ] Reading route tested (`/read/teaching-dad-read-a1`)
- [ ] Unified intro section displays correctly with visual separators
- [ ] Audio playback and highlighting sync verified

**Ship:** Story 3 complete and live  
**Test:** Full reading experience, audio playback, highlighting sync, background context and hook display

---

## Story 4: "Migrant Farmworker's Daughter Earns PhD"

### Increment 10: Research & Theme Extraction (Days 19-20)
**Goal:** Gather sources and extract themes

**Reference:** `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 0.25, 0.5, 1, 2

**Tasks:**
- [ ] **Step 0.25: Source Material Check** (MODERN_CONTENT)
  - Verify story-driven (not fact-driven)
  - Verify length can reach 30-35 minutes (B1 target)
  - Verify enough content for engaging narrative
- [ ] **Step 0.5: Emotional Impact Validation** (MODERN_CONTENT)
  - "Text a friend" test: Would someone share this?
  - Identify clear emotional arc: childhood → education → struggles → PhD
  - Document 5-7 specific emotional moments
  - Identify 3+ ESL resonance multipliers
  - Compare to Helen Keller benchmark
- [ ] **Step 1: Extract Source Text** (MODERN_CONTENT)
  - Access NPR/Latino USA podcast (podcast feed/transcript)
  - Find 2-3 additional sources (news articles, profiles)
  - **CRITICAL:** Extract themes only (NOT text) - follow extraction strategy
  - Read/listen to all sources (factual research)
  - Extract themes: farmworker childhood, education journey, PhD achievement, family support
  - Cross-reference facts across sources
- [ ] **Step 2: Clean & Structure Text** (MODERN_CONTENT)
  - Document themes in your own words (not copying)
  - Create theme extraction document
  - Verify legal compliance (multiple sources, themes only)

**Deliverables:**
- Source list (NPR podcast + 2-3 additional sources)
- Theme extraction document (themes only, not text)
- Emotional moments list (7 moments)
- Legal compliance checklist ✅
- Step 0.25 validation document
- Step 0.5 validation document

**Definition of Done:**
- [ ] Sources identified (podcast + additional sources)
- [ ] Themes extracted (not text copied) - verified no text copying
- [ ] 7 emotional moments documented
- [ ] Step 0.25 validation passed (story-driven, length OK)
- [ ] Step 0.5 validation passed (emotional impact confirmed)
- [ ] Legal compliance verified (multiple sources, fair use)
- [ ] Ready for narrative creation

**Ship:** Research complete  
**Test:** Verify themes extracted, multiple sources used, verify Step 0.25/0.5 passed

---

### Increment 11: Narrative Creation (Days 21-22)
**Goal:** Write original narrative

**Reference:** `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 2.5, 3, 3.5

**Tasks:**
- [ ] **Step 2.5: Narrative Structure Creation** (MODERN_CONTENT)
  - Transform themes into story arc: childhood → education → struggles → PhD
  - Identify struggle moment (beginning challenge - farmworker childhood)
  - Identify perseverance moments (middle obstacles - education barriers, imposter syndrome)
  - Identify breakthrough moment (triumph/achievement - PhD defense)
  - Create emotional journey map
  - Document 5-7 key emotional moments for story flow
- [ ] **Step 3: Create Background Context** (MODERN_CONTENT)
  - Write 2-3 sentence factual background (30-50 words)
  - Format: Neutral, factual tone (no spoilers)
  - Content: Context about migrant farmworker families and education barriers
  - Save to: `cache/farmworker-daughter-phd-background.txt`
- [ ] **Step 3.5: Create Emotional Hook** (MODERN_CONTENT)
  - Write opening hook paragraph (50-100 words)
  - Format: Start with struggle, not facts
  - Style: Emotional, engaging, creates curiosity
  - Elements: Childhood struggle → "But then..." → creates desire to continue
  - Save to: `cache/farmworker-daughter-phd-hook.txt`
- [ ] **Write Main Story** (Original narrative based on themes)
  - Create original narrative structure (don't mimic podcast)
  - Write in your own voice and style
  - Use your own transitions and context
  - Ensure 30-35 minute length (B1 level target)
  - Save to: `cache/farmworker-daughter-phd-original.txt`
- [ ] **Plagiarism Check**
  - Run plagiarism checker on final story
  - Verify no exact text matches podcast transcript
  - Verify original narrative structure

**Deliverables:**
- Background context text (`cache/farmworker-daughter-phd-background.txt`)
- Emotional hook text (`cache/farmworker-daughter-phd-hook.txt`)
- Main story text (original narrative) (`cache/farmworker-daughter-phd-original.txt`)
- Narrative structure document

**Definition of Done:**
- [ ] Background context written (30-50 words)
- [ ] Emotional hook written (50-100 words)
- [ ] Main story written (original narrative, not copied)
- [ ] Length verified (30-35 minutes)
- [ ] Plagiarism check passed (no text matches sources)
- [ ] Original narrative structure verified (not mimicking source)
- [ ] Ready for processing

**Ship:** Complete narrative ready  
**Test:** Run plagiarism checker, verify no text matches sources, verify original structure

---

### Increment 12: Processing & Integration (Days 23-24)
**Goal:** Simplify, generate audio, integrate

**Reference:** 
- `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 4-15
- `docs/MODERN_VOICES_IMPLEMENTATION_GUIDE.md` Phases 1-6 (technical details)

**Tasks:**
- [ ] **Step 4: Text Simplification** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/simplify-farmworker-daughter-phd.js B1`
  - Maintain 1:1 sentence count mapping (CRITICAL)
  - Generate compound sentences (NOT micro-sentences)
  - B1: 12-25 words average with connectors "however", "meanwhile", "therefore"
  - ENFORCE sentence length limits: B1 max 25 words
  - Cache results after every 10 sentences
  - Save to: `cache/farmworker-daughter-phd-B1-simplified.txt`
- [ ] **Step 7: Generate Combined Preview Text** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/generate-farmworker-daughter-phd-preview.js B1`
  - **Combine:** Preview (50-75 words) + Background Context (30-50 words) + Emotional Hook (50-100 words)
  - Format: Unified intro section with visual separators (handled in frontend)
  - Total length: ~130-225 words
  - Save to: `cache/farmworker-daughter-phd-B1-preview-combined.txt`
- [ ] **Step 8: Generate Combined Preview Audio** (MODERN_CONTENT)
  - Generate audio for ENTIRE combined text (preview + background + hook)
  - Use Jane voice (RILOU7YmBhvwJGDGjNmP)
  - Apply FFmpeg 0.85× slowdown
  - Measure duration with ffprobe (Solution 1)
  - Upload to Supabase: `farmworker-daughter-phd/B1/preview-combined.mp3`
  - Save metadata: `cache/farmworker-daughter-phd-B1-preview-combined-audio.json`
- [ ] **Step 10.5: Generate Bundle Audio (PILOT FIRST)** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/generate-farmworker-daughter-phd-bundles.js B1 --pilot`
  - Run pilot with 10 bundles first
  - Use Jane voice with production settings
  - Apply FFmpeg 0.85× slowdown
  - Use Enhanced Timing v3 (character-count proportion, punctuation penalties)
  - Measure duration with ffprobe (Solution 1)
- [ ] **Step 11: Full Bundle Generation** (MODERN_CONTENT)
  - After pilot validation: `node scripts/generate-farmworker-daughter-phd-bundles.js B1`
  - Script saves progress after each bundle
- [ ] **Step 11.5: Database Integration** (MODERN_CONTENT)
  - Create script: `scripts/integrate-farmworker-daughter-phd-b1-database.ts`
  - Load bundle metadata from cache
  - Create/update BookChunk records with Solution 1 timing format
  - **CRITICAL:** Use startTime/endTime format (NOT start/end)
  - Run: `npx tsx scripts/integrate-farmworker-daughter-phd-b1-database.ts`
- [ ] **Step 5: Create Seed Script** (MODERN_VOICES)
  - Create `scripts/seed-farmworker-daughter-phd.ts`
  - Set `isClassic: false` (CRITICAL for Modern Voices collection)
  - Create FeaturedBook, BookCollection, BookCollectionMembership records
  - Run: `npx tsx scripts/seed-farmworker-daughter-phd.ts`
- [ ] **Step 13: Create API Endpoint** (MODERN_CONTENT)
  - Create `app/api/farmworker-daughter-phd-b1/bundles/route.ts`
  - **MANDATORY API RESPONSE FIELDS:**
    - success, bookId, title, author, level, bundles, bundleCount, totalSentences
    - previewCombined, previewCombinedAudio (unified intro section)
  - Load combined preview from cache: `cache/farmworker-daughter-phd-B1-preview-combined.txt`
  - Load combined preview audio from cache: `cache/farmworker-daughter-phd-B1-preview-combined-audio.json`
- [ ] **Step 13.2: Update Frontend Component** (MODERN_CONTENT)
  - Edit `components/reading/BundleReadingInterface.tsx`
  - Display unified intro section with visual separators
  - Single audio player for entire combined section
  - Visual separators between preview/background/hook sections
- [ ] **Step 14: Update Frontend Config** (MODERN_VOICES)
  - Update `lib/config/books.ts`
  - Add to ALL_FEATURED_BOOKS, BOOK_API_MAPPINGS, BOOK_DEFAULT_LEVELS, MULTI_LEVEL_BOOKS
- [ ] **Step 15: Testing** (MODERN_CONTENT)
  - Test reading route: `/read/farmworker-daughter-phd-b1`
  - Verify audio playback and highlighting sync
  - Verify background context and hook display correctly

**Deliverables:**
- B1 simplified text (`cache/farmworker-daughter-phd-B1-simplified.txt`)
- Combined preview text and audio (`cache/farmworker-daughter-phd-B1-preview-combined.txt`, `.json`)
- Bundle audio files (uploaded to Supabase)
- Database records (FeaturedBook, BookCollection, BookChunk)
- API endpoint (`app/api/farmworker-daughter-phd-b1/bundles/route.ts`)
- Frontend integration (`lib/config/books.ts`)

**Definition of Done:**
- [ ] B1 simplified text complete
- [ ] Combined preview text and audio generated (unified intro section)
- [ ] Bundle audio generated and uploaded (pilot + full)
- [ ] Database seeded correctly (FeaturedBook + Collection + Chunks)
- [ ] API endpoint working (returns all required fields)
- [ ] Frontend integration complete (config updates)
- [ ] Reading route tested (`/read/farmworker-daughter-phd-b1`)
- [ ] Unified intro section displays correctly with visual separators
- [ ] Audio playback and highlighting sync verified

**Ship:** Story 4 complete and live  
**Test:** Full reading experience, audio playback, highlighting sync, background context and hook display

---

## Story 5: "Asylum Seeker Becomes ICU Nurse"

### Increment 13: Research & Theme Extraction (Days 25-26)
**Goal:** Gather sources and extract themes

**Reference:** `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 0.25, 0.5, 1, 2

**Tasks:**
- [ ] **Step 0.25: Source Material Check** (MODERN_CONTENT)
  - Verify story-driven (not fact-driven)
  - Verify length can reach 25-30 minutes (B1 target)
  - Verify enough content for engaging narrative
- [ ] **Step 0.5: Emotional Impact Validation** (MODERN_CONTENT)
  - "Text a friend" test: Would someone share this?
  - Identify clear emotional arc: camp → education → graduation → service
  - Document 5-7 specific emotional moments
  - Identify 3+ ESL resonance multipliers
  - Compare to Helen Keller benchmark
- [ ] **Step 1: Extract Source Text** (MODERN_CONTENT)
  - Access WaPo/STAT articles (manual scrape)
  - Find 2-3 additional sources (interviews, profiles)
  - **CRITICAL:** Extract themes only (NOT text) - follow extraction strategy
  - Read all sources (factual research)
  - Extract themes: refugee journey, nursing school, language barriers, ICU service
  - Cross-reference facts across sources
- [ ] **Step 2: Clean & Structure Text** (MODERN_CONTENT)
  - Document themes in your own words (not copying)
  - Create theme extraction document
  - Verify legal compliance (multiple sources, themes only)

**Deliverables:**
- Source list (WaPo/STAT + 2-3 additional sources)
- Theme extraction document (themes only, not text)
- Emotional moments list (7 moments)
- Legal compliance checklist ✅
- Step 0.25 validation document
- Step 0.5 validation document

**Definition of Done:**
- [ ] Sources identified (WaPo/STAT + additional sources)
- [ ] Themes extracted (not text copied) - verified no text copying
- [ ] 7 emotional moments documented
- [ ] Step 0.25 validation passed (story-driven, length OK)
- [ ] Step 0.5 validation passed (emotional impact confirmed)
- [ ] Legal compliance verified (multiple sources, fair use)
- [ ] Ready for narrative creation

**Ship:** Research complete  
**Test:** Verify themes extracted, multiple sources used, verify Step 0.25/0.5 passed

---

### Increment 14: Narrative Creation (Days 27-28)
**Goal:** Write original narrative

**Reference:** `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 2.5, 3, 3.5

**Tasks:**
- [ ] **Step 2.5: Narrative Structure Creation** (MODERN_CONTENT)
  - Transform themes into story arc: camp → education → graduation → service
  - Identify struggle moment (beginning challenge - refugee camp)
  - Identify perseverance moments (middle obstacles - nursing school, language barriers)
  - Identify breakthrough moment (triumph/achievement - graduation, first ICU shift, saving patient)
  - Create emotional journey map
  - Document 5-7 key emotional moments for story flow
- [ ] **Step 3: Create Background Context** (MODERN_CONTENT)
  - Write 2-3 sentence factual background (30-50 words)
  - Format: Neutral, factual tone (no spoilers)
  - Content: Context about refugee camps and nursing education
  - Save to: `cache/asylum-seeker-nurse-background.txt`
- [ ] **Step 3.5: Create Emotional Hook** (MODERN_CONTENT)
  - Write opening hook paragraph (50-100 words)
  - Format: Start with struggle, not facts
  - Style: Emotional, engaging, creates curiosity
  - Elements: Camp struggle → "But then..." → creates desire to continue
  - Save to: `cache/asylum-seeker-nurse-hook.txt`
- [ ] **Write Main Story** (Original narrative based on themes)
  - Create original narrative structure (don't mimic source articles)
  - Write in your own voice and style
  - Use your own transitions and context
  - Ensure 25-30 minute length (B1 level target)
  - Save to: `cache/asylum-seeker-nurse-original.txt`
- [ ] **Plagiarism Check**
  - Run plagiarism checker on final story
  - Verify no exact text matches source articles
  - Verify original narrative structure

**Deliverables:**
- Background context text (`cache/asylum-seeker-nurse-background.txt`)
- Emotional hook text (`cache/asylum-seeker-nurse-hook.txt`)
- Main story text (original narrative) (`cache/asylum-seeker-nurse-original.txt`)
- Narrative structure document

**Definition of Done:**
- [ ] Background context written (30-50 words)
- [ ] Emotional hook written (50-100 words)
- [ ] Main story written (original narrative, not copied)
- [ ] Length verified (25-30 minutes)
- [ ] Plagiarism check passed (no text matches sources)
- [ ] Original narrative structure verified (not mimicking source)
- [ ] Ready for processing

**Ship:** Complete narrative ready  
**Test:** Run plagiarism checker, verify no text matches sources, verify original structure

---

### Increment 15: Processing & Integration (Days 29-30)
**Goal:** Simplify, generate audio, integrate

**Reference:** 
- `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 4-15
- `docs/MODERN_VOICES_IMPLEMENTATION_GUIDE.md` Phases 1-6 (technical details)

**Tasks:**
- [ ] **Step 4: Text Simplification** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/simplify-asylum-seeker-nurse.js B1`
  - Maintain 1:1 sentence count mapping (CRITICAL)
  - Generate compound sentences (NOT micro-sentences)
  - B1: 12-25 words average with connectors "however", "meanwhile", "therefore"
  - ENFORCE sentence length limits: B1 max 25 words
  - Cache results after every 10 sentences
  - Save to: `cache/asylum-seeker-nurse-B1-simplified.txt`
- [ ] **Step 7: Generate Combined Preview Text** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/generate-asylum-seeker-nurse-preview.js B1`
  - **Combine:** Preview (50-75 words) + Background Context (30-50 words) + Emotional Hook (50-100 words)
  - Format: Unified intro section with visual separators (handled in frontend)
  - Total length: ~130-225 words
  - Save to: `cache/asylum-seeker-nurse-B1-preview-combined.txt`
- [ ] **Step 8: Generate Combined Preview Audio** (MODERN_CONTENT)
  - Generate audio for ENTIRE combined text (preview + background + hook)
  - Use Jane voice (RILOU7YmBhvwJGDGjNmP)
  - Apply FFmpeg 0.85× slowdown
  - Measure duration with ffprobe (Solution 1)
  - Upload to Supabase: `asylum-seeker-nurse/B1/preview-combined.mp3`
  - Save metadata: `cache/asylum-seeker-nurse-B1-preview-combined-audio.json`
- [ ] **Step 10.5: Generate Bundle Audio (PILOT FIRST)** (MODERN_CONTENT)
  - **MANDATORY: Run in TERMINAL** - `node scripts/generate-asylum-seeker-nurse-bundles.js B1 --pilot`
  - Run pilot with 10 bundles first
  - Use Jane voice with production settings
  - Apply FFmpeg 0.85× slowdown
  - Use Enhanced Timing v3 (character-count proportion, punctuation penalties)
  - Measure duration with ffprobe (Solution 1)
- [ ] **Step 11: Full Bundle Generation** (MODERN_CONTENT)
  - After pilot validation: `node scripts/generate-asylum-seeker-nurse-bundles.js B1`
  - Script saves progress after each bundle
- [ ] **Step 11.5: Database Integration** (MODERN_CONTENT)
  - Create script: `scripts/integrate-asylum-seeker-nurse-b1-database.ts`
  - Load bundle metadata from cache
  - Create/update BookChunk records with Solution 1 timing format
  - **CRITICAL:** Use startTime/endTime format (NOT start/end)
  - Run: `npx tsx scripts/integrate-asylum-seeker-nurse-b1-database.ts`
- [ ] **Step 5: Create Seed Script** (MODERN_VOICES)
  - Create `scripts/seed-asylum-seeker-nurse.ts`
  - Set `isClassic: false` (CRITICAL for Modern Voices collection)
  - Create FeaturedBook, BookCollection, BookCollectionMembership records
  - Run: `npx tsx scripts/seed-asylum-seeker-nurse.ts`
- [ ] **Step 13: Create API Endpoint** (MODERN_CONTENT)
  - Create `app/api/asylum-seeker-nurse-b1/bundles/route.ts`
  - **MANDATORY API RESPONSE FIELDS:**
    - success, bookId, title, author, level, bundles, bundleCount, totalSentences
    - previewCombined, previewCombinedAudio (unified intro section)
  - Load combined preview from cache: `cache/asylum-seeker-nurse-B1-preview-combined.txt`
  - Load combined preview audio from cache: `cache/asylum-seeker-nurse-B1-preview-combined-audio.json`
- [ ] **Step 13.2: Update Frontend Component** (MODERN_CONTENT)
  - Edit `components/reading/BundleReadingInterface.tsx`
  - Display unified intro section with visual separators
  - Single audio player for entire combined section
  - Visual separators between preview/background/hook sections
- [ ] **Step 14: Update Frontend Config** (MODERN_VOICES)
  - Update `lib/config/books.ts`
  - Add to ALL_FEATURED_BOOKS, BOOK_API_MAPPINGS, BOOK_DEFAULT_LEVELS, MULTI_LEVEL_BOOKS
- [ ] **Step 15: Testing** (MODERN_CONTENT)
  - Test reading route: `/read/asylum-seeker-nurse-b1`
  - Verify audio playback and highlighting sync
  - Verify background context and hook display correctly

**Deliverables:**
- B1 simplified text (`cache/asylum-seeker-nurse-B1-simplified.txt`)
- Combined preview text and audio (`cache/asylum-seeker-nurse-B1-preview-combined.txt`, `.json`)
- Bundle audio files (uploaded to Supabase)
- Database records (FeaturedBook, BookCollection, BookChunk)
- API endpoint (`app/api/asylum-seeker-nurse-b1/bundles/route.ts`)
- Frontend integration (`lib/config/books.ts`)

**Definition of Done:**
- [ ] B1 simplified text complete
- [ ] Combined preview text and audio generated (unified intro section)
- [ ] Bundle audio generated and uploaded (pilot + full)
- [ ] Database seeded correctly (FeaturedBook + Collection + Chunks)
- [ ] API endpoint working (returns all required fields)
- [ ] Frontend integration complete (config updates)
- [ ] Reading route tested (`/read/asylum-seeker-nurse-b1`)
- [ ] Unified intro section displays correctly with visual separators
- [ ] Audio playback and highlighting sync verified

**Ship:** Story 5 complete and live  
**Test:** Full reading experience, audio playback, highlighting sync, background context and hook display

---

## Pilot Phase Summary

**Total Increments:** 15 (3 per story × 5 stories)  
**Total Time:** ~43 hours (6-8 weeks)  
**Increment Size:** 2-3 days per increment  
**Deliverables:** 5 complete stories live in BookBridge

**Success Pattern:** Ship → Measure → Learn → Adjust

**Decision Points:** Review after each story (5 reviews total) to validate direction and gather feedback.

---

## Post-Pilot Actions

### After Story 1 (Increment 3)
- [ ] Gather user feedback
- [ ] Measure engagement metrics
- [ ] Refine extraction workflow if needed
- [ ] Document learnings

### After Story 2 (Increment 6)
- [ ] Compare feedback between stories
- [ ] Identify patterns
- [ ] Refine narrative creation process
- [ ] Document best practices

### After Story 3 (Increment 9)
- [ ] Assess theme diversity
- [ ] Evaluate quality consistency
- [ ] Refine processing workflow
- [ ] Update documentation

### After Story 4 (Increment 12)
- [ ] Review overall quality
- [ ] Assess user engagement trends
- [ ] Refine integration process
- [ ] Prepare for expansion phase

### After Story 5 (Increment 15)
- [ ] Complete pilot phase review
- [ ] Document all learnings
- [ ] Create expansion phase plan
- [ ] Begin expansion phase (20 stories)

---

## Key Principles

**Increment Size:** 2-3 days maximum (quick feedback)  
**Value Delivery:** Each increment delivers independently testable value  
**Quality Gates:** Plagiarism check, legal compliance, quality validation at each stage  
**Continuous Improvement:** Learn from each increment, adjust process

**Success Pattern:** Ship → Measure → Learn → Adjust

---

**Document Status:** ✅ Complete  
**Ready for Execution:** ✅ YES  
**Next Step:** Begin Increment 1 (Research & Theme Extraction for Story 1)

