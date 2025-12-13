# Adding CEFR Levels to Modern Stories - Implementation Checklist

**Context:** Many modern stories currently only have A1 level. We need to add A2 (or B1) levels to expand learning progression.

**Current State:**
- 6 collections: Classic Literature (22 books), Starting Over (8), Breaking Barriers (8), Finding Home (7), Building Dreams (5), Making a Difference (6)
- Many modern stories only have A1 level
- Adding **one more level** per story (A2 recommended for B1/B2 originals)

**Process (per story):**
1. Check `cache/{story-id}-complexity-assessment.md` to verify which levels are possible
2. Use existing `cache/{story-id}-original.txt` (don't regenerate)
3. Run simplification: `node scripts/simplify-{story-id}.js A2` (or B1)
4. **Generate preview-combined for new level:** Create new level-specific preview-combined text
   - Reuse existing `background.txt` and `hook.txt` (no CEFR level)
   - Run: `node scripts/generate-{story-id}-preview-combined.js` (modify `CEFR_LEVEL = 'A2'`)
   - Script will simplify background/hook to A2 level automatically
   - Creates: `cache/{story-id}-A2-preview-combined.txt`
5. Generate audio: `node scripts/generate-{story-id}-preview-audio.js A2` and `node scripts/generate-{story-id}-bundles.js A2`
6. Integrate database: Update existing integration script or create new one
7. Update frontend config: Add A2/B1 to `BOOK_API_MAPPINGS` and `MULTI_LEVEL_BOOKS` in `lib/config/books.ts`
8. Run build: `npm run build`
9. Commit locally: `git commit -m "Add A2 level to {story-id}"`
10. Test: Verify level switching works, audio syncs correctly

**Reference:** See "Adding Additional CEFR Levels to Existing Stories" section in `docs/modern-content/AGENT_START_HERE.md` (lines 856-905)

---

## ✅ Implementation Checklist

**Ordered by collection priority (catalog display order) and story number within collection**

### **1. Starting Over Collection** (sortOrder=1)

- [ ] **`single-parent-rising-1`** - B1/B2 original → Add **A2**
- [ ] **`age-defiance-1`** - A1/A2 original → Add **A2** (use original as-is)

### **2. Breaking Barriers Collection** (sortOrder=2)

- [ ] **`medical-crisis-2`** - B1/B2 original → Add **A2**
- [ ] **`teaching-dad-to-read`** - B1/B2 original → Add **A2**
- [ ] **`immigrant-entrepreneur`** - B1/B2 original → Add **A2**

### **3. Finding Home Collection** (sortOrder=3)

- [ ] **`cultural-bridge-2`** - B1/B2 original → Add **A2**
- [ ] **`romantic-love-1`** - B1/B2 original → Add **A2**
- [ ] **`community-builder-3`** - A1/A2 original → Add **A2** (use original, may need expansion)

### **4. Building Dreams Collection** (sortOrder=4)

- [ ] ~~**`career-pivot-3`**~~ - A1/A2 original → **Cannot add** (already at max level)

### **5. Making a Difference Collection** (sortOrder=5)

- [ ] **`grief-to-purpose-1`** - B1/B2 original → Add **A2**
- [ ] **`youth-activism-1`** - A2 original → Add **A2** (use original as-is)

---

## 📊 Summary

**Total stories with assessments: 11**
- **Can add A2 level: 10 stories** ✅
- **Cannot add higher levels: 1 story** (career-pivot-3)

**Next story to work on:** `single-parent-rising-1` (Starting Over collection, first priority)

