# Message for Adding CEFR Levels to Modern Stories

**Context:** Many modern stories currently only have A1 level. We need to add A2, B1 (and possibly B2) levels to expand learning progression.

**Current State:**
- 6 collections: Classic Literature (22 books), Starting Over (8), Breaking Barriers (8), Finding Home (7), Building Dreams (5), Making a Difference (6)
- Many modern stories only have A1 level
- Need to add A2, B1 levels to selected stories

**Priority Stories to Expand:**
1. **Starting Over collection:**
   - Refugee Journey #1, #2, #3 (currently A1 only)
   - Single Parent Rising #1, #2 (currently A1 only)
   
2. **Breaking Barriers collection:**
   - Disability Overcome #1, #2 (currently A1 only)
   - Medical Crisis #1, #2 (currently A1 only)
   
3. **Finding Home collection:**
   - Community Builder #1, #2, #3 (currently A1 only)
   - Cultural Bridge #1, #2 (currently A1 only)
   
4. **Building Dreams collection:**
   - Career Pivot #1, #2, #3 (currently A1 only)
   
5. **Making a Difference collection:**
   - TED Talks (currently A1/A2/B1 - may need expansion)

**Process:**
1. Check `cache/{story-id}-complexity-assessment.md` to verify which levels are possible
2. Use existing `cache/{story-id}-original.txt` (don't regenerate)
3. Run simplification: `node scripts/simplify-{story-id}.js A2` (or B1)
4. Generate audio: `node scripts/generate-{story-id}-preview-audio.js A2` and `node scripts/generate-{story-id}-bundles.js A2`
5. Integrate database: Update existing integration script or create new one
6. Update frontend config: Add A2/B1 to `BOOK_API_MAPPINGS` and `MULTI_LEVEL_BOOKS` in `lib/config/books.ts`
7. Test: Verify level switching works, audio syncs correctly

**Reference:** See "Adding Additional CEFR Levels to Existing Stories" section in `docs/modern-content/AGENT_START_HERE.md` (lines 848-897)

**Start with:** Refugee Journey #1 (high engagement, clear progression value)

