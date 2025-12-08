# Pilot Story 1: "Teen Translating for Parents Through Hospital Chaos" - Implementation Log

**Status:** ⏸️ Paused - Switching to Story 3 (easier source access)  
**Theme:** Immigration, Health, Language  
**Target Level:** A2 (20-25 minutes)  
**Emotional Impact:** ⭐⭐⭐⭐⭐ (5/5)  
**ESL Resonance:** ⭐⭐⭐⭐⭐ (5/5)

---

## Story Details

**Title:** Teen Translating for Parents Through Hospital Chaos  
**Story ID:** `teen-translating-hospital`  
**Sources:**
- Primary: Vox First Person (manual scrape)
- Additional: News articles, interviews (find 2-3 more sources)

**Legal Status:** ✅ Fair use (transformative, educational)  
**Access Method:** Manual scrape from public site

---

## Implementation Checklist

### Phase 1: Research & Source Material ⏳
- [x] **Step 0.25: Source Material Check** ✅ COMPLETE
  - [x] Verify story-driven (not fact-driven) ✅ PASS
  - [x] Verify length potential: 20-25 minutes (A2 level) ✅ PASS
  - [x] Verify enough content for engaging narrative ✅ PASS
- [x] **Fetch Primary Source** ✅ COMPLETE
  - [x] Manually access Vox First Person article (found Chalkbeat article instead)
  - [x] Save raw text to `cache/teen-translating-hospital-source-chalkbeat.txt`
- [x] **Find Additional Sources** (2-3 more) ✅ COMPLETE
  - [x] Search for related news articles (found NPR Youth Radio)
  - [x] Find interviews or profiles (found KQED crowdsourced stories)
  - [x] Document sources: 3 sources total (Chalkbeat + NPR + KQED)
- [x] **Extract Themes** (NOT text) ✅ COMPLETE
  - [x] Document emotional moments (7 moments identified)
  - [x] Document themes: language barrier, medical emergency, teen advocacy, confidence building
  - [x] Save themes to `cache/teen-translating-hospital-themes.json`

### Phase 2: Narrative Creation ⏳
- [x] **Step 0.5: Emotional Impact Validation** ✅ COMPLETE
  - [x] "Text a friend" test: ✅ YES - "You have to read about this teen who saved her parents"
  - [x] Emotional arc: ✅ YES - Language barrier → Medical emergency → Advocacy → Confidence
  - [x] 5-7 emotional moments: ✅ YES (7 moments identified)
  - [x] 3+ ESL resonance multipliers: ✅ YES (4 multipliers)
  - [x] Helen Keller benchmark: ✅ MATCHES
- [x] **Write Background Context** (30-50 words) ✅ COMPLETE
  - [x] Save to `cache/teen-translating-hospital-background.txt`
- [x] **Write Emotional Hook** (50-100 words) ✅ COMPLETE
  - [x] Save to `cache/teen-translating-hospital-hook.txt`
- [x] **Write Main Story** (original narrative based on themes) ✅ COMPLETE
  - [x] Structure: struggle → crisis → breakthrough → confidence
  - [x] Save to `cache/teen-translating-hospital-original.txt`
  - [x] Length: ~1,866 words (~19 minutes A2 level) ✅
- [ ] **Modernize Language** (if needed)
  - [ ] Run modernization script
  - [ ] Save to `cache/teen-translating-hospital-modernized.txt`

### Phase 3: Processing ⏳
- [ ] **Simplify to A2 Level**
  - [ ] Target: 20-25 minutes reading time
  - [ ] Run simplification script
  - [ ] Save to `cache/teen-translating-hospital-A2-simplified.txt`
- [ ] **Generate Preview Text** (combined: preview + hook + background)
  - [ ] Save to `cache/teen-translating-hospital-A2-preview-combined.txt`
- [ ] **Generate Preview Audio** (unified intro)
  - [ ] Use Jane voice (RILOU7YmBhvwJGDGjNmP)
  - [ ] Apply Enhanced Timing v3 for sentence timings
  - [ ] Save metadata to `cache/teen-translating-hospital-A2-preview-combined-audio.json`
- [ ] **Generate Story Bundles**
  - [ ] Split into 4-sentence bundles
  - [ ] Generate audio for each bundle
  - [ ] Apply FFmpeg 0.85× slowdown
  - [ ] Calculate Enhanced Timing v3 timings
  - [ ] Upload to Supabase
  - [ ] Save metadata to `cache/teen-translating-hospital-A2-bundles-metadata.json`

### Phase 4: Integration ⏳
- [ ] **Database Seeding**
  - [ ] Create FeaturedBook record
  - [ ] Link to Modern Voices collection (`isClassic: false`)
  - [ ] Create BookChunk records with Enhanced Timing v3 metadata
- [ ] **Create API Endpoint**
  - [ ] Create `app/api/teen-translating-hospital-a2/bundles/route.ts`
  - [ ] Return bundles, previewCombined, previewCombinedAudio with sentenceTimings
- [ ] **Frontend Integration**
  - [ ] Update `lib/config/books.ts`:
    - [ ] Add to ALL_FEATURED_BOOKS
    - [ ] Add to BOOK_API_MAPPINGS
    - [ ] Add to BOOK_DEFAULT_LEVELS
    - [ ] Add to MULTI_LEVEL_BOOKS
- [ ] **Testing**
  - [ ] Test reading route
  - [ ] Verify intro section displays correctly
  - [ ] Verify highlighting and autoscroll work
  - [ ] Verify audio playback

---

## Emotional Moments (7)

1. Parents' medical emergency, can't communicate
2. Teen realizes she must translate
3. Fear of making mistakes with medical terms
4. First successful translation saves parent
5. Doctor's recognition of her skill
6. Confidence building moment
7. Realization of her own strength

---

## ESL Resonance Multipliers (4)

- ✅ Communication & Language Barriers (core theme)
- ✅ First-Time Courage (stepping up in crisis)
- ✅ Building New Life (gaining confidence)
- ✅ Connection Across Differences (bridging language gap)

---

## Time Estimate

- Research Phase: 2 hours
- Narrative Creation: 3 hours
- Processing Phase: 2 hours
- Integration Phase: 1 hour
- **Total: 8 hours**

---

## Notes

- Follow `MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` Steps 0-20
- Reference `MODERN_VOICES_IMPLEMENTATION_GUIDE.md` for technical details
- Extract themes only, never copy text (legal compliance)
- Use multiple sources (3-5 sources) for factual research

