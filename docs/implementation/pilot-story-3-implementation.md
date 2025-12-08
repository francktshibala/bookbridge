# Pilot Story 3: "First-Gen Student Teaching Dad to Read" - Implementation Log

**Status:** 🟡 In Progress  
**Theme:** Education, Family, Language  
**Target Level:** A1 (15-20 minutes)  
**Emotional Impact:** ⭐⭐⭐⭐⭐ (5/5)  
**ESL Resonance:** ⭐⭐⭐⭐⭐ (5/5)

---

## Story Details

**Title:** First-Gen Student Teaching Dad to Read  
**Story ID:** `teaching-dad-to-read`  
**Sources:**
- Primary: Reddit r/TwoXChromosomes (Reddit API)
- Additional: Similar stories for themes (find 1-2 more sources)

**Legal Status:** ✅ Fair use (transformative, educational)  
**Access Method:** Reddit API (easier than manual scraping!)

---

## Implementation Checklist

### Phase 1: Research & Source Material ⏳
- [ ] **Step 0.25: Source Material Check**
  - [ ] Verify story-driven (not fact-driven)
  - [ ] Verify length potential: 15-20 minutes (A1 level)
  - [ ] Verify enough content for engaging narrative
- [x] **Fetch Primary Source** 🟡 IN PROGRESS
  - [ ] Search Reddit r/TwoXChromosomes for posts about teaching parent to read
  - [ ] Extract post(s) using Reddit API or manual copy
  - [ ] Save to `cache/teaching-dad-to-read-source-reddit.txt`
- [ ] **Find Additional Sources** (1-2 more)
  - [ ] Search for similar stories (news articles, interviews)
  - [ ] Document sources in `cache/teaching-dad-to-read-sources.md`
- [ ] **Extract Themes** (NOT text)
  - [ ] Document emotional moments (7 moments identified)
  - [ ] Document themes: family literacy, teaching, intergenerational connection, breakthrough
  - [ ] Save themes to `cache/teaching-dad-to-read-themes.json`

### Phase 2: Narrative Creation ⏳
- [ ] **Step 0.5: Emotional Impact Validation**
  - [ ] "Text a friend" test: ✅ YES - "Beautiful story about teaching a parent to read"
  - [ ] Emotional arc: ✅ YES - Secret illiteracy → Nightly lessons → First book finished
  - [ ] 5-7 emotional moments: ✅ YES (7 moments identified)
  - [ ] 3+ ESL resonance multipliers: ✅ YES (4 multipliers)
- [ ] **Write Background Context** (30-50 words)
  - [ ] Save to `cache/teaching-dad-to-read-background.txt`
- [ ] **Write Emotional Hook** (50-100 words)
  - [ ] Save to `cache/teaching-dad-to-read-hook.txt`
- [ ] **Write Main Story** (original narrative, heavily paraphrased from Reddit)
  - [ ] Structure: discovery → teaching → struggle → breakthrough
  - [ ] Save to `cache/teaching-dad-to-read-original.txt`

### Phase 3: Processing ⏳
- [ ] **Simplify to A1 Level**
  - [ ] Target: 15-20 minutes reading time
  - [ ] Run simplification script
  - [ ] Save to `cache/teaching-dad-to-read-A1-simplified.txt`
- [ ] **Generate Preview Text** (combined: preview + hook + background)
  - [ ] Save to `cache/teaching-dad-to-read-A1-preview-combined.txt`
- [ ] **Generate Preview Audio** (unified intro)
  - [ ] Use Jane voice (RILOU7YmBhvwJGDGjNmP)
  - [ ] Apply Enhanced Timing v3 for sentence timings
  - [ ] Save metadata to `cache/teaching-dad-to-read-A1-preview-combined-audio.json`
- [ ] **Generate Story Bundles**
  - [ ] Split into 4-sentence bundles
  - [ ] Generate audio for each bundle
  - [ ] Apply FFmpeg 0.85× slowdown
  - [ ] Calculate Enhanced Timing v3 timings
  - [ ] Upload to Supabase
  - [ ] Save metadata to `cache/teaching-dad-to-read-A1-bundles-metadata.json`

### Phase 4: Integration ⏳
- [ ] **Database Seeding**
  - [ ] Create FeaturedBook record
  - [ ] Link to Modern Voices collection (`isClassic: false`)
  - [ ] Create BookChunk records with Enhanced Timing v3 metadata
- [ ] **Create API Endpoint**
  - [ ] Create `app/api/teaching-dad-to-read-a1/bundles/route.ts`
  - [ ] Return bundles, previewCombined, previewCombinedAudio with sentenceTimings
- [ ] **Frontend Integration**
  - [ ] Update `lib/config/books.ts`
- [ ] **Testing**
  - [ ] Test reading route
  - [ ] Verify intro section displays correctly
  - [ ] Verify highlighting and autoscroll work
  - [ ] Verify audio playback

---

## Emotional Moments (7)

1. Discovery of dad's secret illiteracy
2. Dad's shame and embarrassment
3. Decision to teach him
4. First lesson (awkward but hopeful)
5. Dad's frustration and wanting to quit
6. Breakthrough moment - first word recognition
7. Finishing first book together (triumph)

---

## ESL Resonance Multipliers (4)

- ✅ Communication & Language Barriers (literacy)
- ✅ Learning & Education Journeys (teaching/learning)
- ✅ Connection Across Differences (generations)
- ✅ Building New Life (dad's new confidence)

---

## Time Estimate

- Research Phase: 2 hours
- Narrative Creation: 3 hours
- Processing Phase: 2 hours
- Integration Phase: 1 hour
- **Total: 8 hours**

