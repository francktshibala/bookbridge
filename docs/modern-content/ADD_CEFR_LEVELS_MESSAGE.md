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

## ⚠️ CRITICAL: Pre-Flight Checks (ALWAYS RUN BEFORE STARTING)

**Prevent wasting credits and time by verifying scripts BEFORE running ANY commands:**

### **Step 0: Verify All Scripts Accept Level Arguments**

Before giving ANY commands to the user, check these files:

```bash
# 1. Check simplify script
grep "const.*CEFR_LEVEL\|const.*targetLevel" scripts/simplify-{story-id}.js

# 2. Check preview-combined script
grep "const.*CEFR_LEVEL\|const.*targetLevel" scripts/generate-{story-id}-preview-combined.js

# 3. Check preview-audio script
grep "const.*CEFR_LEVEL\|const.*targetLevel" scripts/generate-{story-id}-preview-audio.js

# 4. Check bundles script
grep "const.*CEFR_LEVEL\|const.*targetLevel" scripts/generate-{story-id}-bundles.js

# 5. Check integration script
grep "const.*CEFR_LEVEL\|const.*targetLevel" scripts/integrate-{story-id}-database.ts
```

**Expected Pattern:**
```javascript
// ✅ CORRECT - Script accepts level from command line
const targetLevel = process.argv[2] || 'A1';
const VALID_LEVELS = ['A1', 'A2'];
const CEFR_LEVEL = targetLevel;

// ❌ WRONG - Hardcoded level (will waste credits)
const CEFR_LEVEL = 'A1';  // Script ignores command line argument!
```

**If ANY script is hardcoded:**
1. ✅ Fix ALL scripts FIRST before running anything
2. ✅ Use Edit tool to add level argument support
3. ✅ Verify fixes with grep before proceeding

### **Step 1: Verify Output After EVERY Command**

**After user runs command, ALWAYS verify:**

```bash
# After simplification
✅ Check: File saved to correct level: cache/{story-id}-A2-simplified.txt
✅ Check: Sentence count matches original

# After preview-combined
✅ Check: File saved to correct level: cache/{story-id}-A2-preview-combined.txt

# After preview-audio
✅ Check: Audio JSON created: cache/{story-id}-A2-preview-combined-audio.json
✅ Check: File contains sentenceTimings array

# After bundles
✅ Check: Output says "A2 level" (NOT A1!)
✅ Check: Metadata saved to: cache/{story-id}-A2-bundles-metadata.json
✅ Check: Bundle count matches expected (NOT regenerating existing level!)

# After database integration
✅ Check: Output says "A2" level
✅ Check: BookChunks created matches bundle count
```

**If output is wrong:**
- ❌ STOP immediately
- ❌ Don't continue to next step
- ✅ Check what went wrong (wrong level? wrong file?)
- ✅ Fix before proceeding

### **Step 2: Common Mistakes to Prevent**

**Mistake #1: Wasting Credits on Wrong Level**
- ❌ User runs bundles command → generates A1 instead of A2 → wastes $5-10
- ✅ **Prevention:** Verify script accepts level argument BEFORE giving command
- ✅ **Prevention:** Check output immediately shows correct level

**Mistake #2: Missing Preview Audio File**
- ❌ Intro section doesn't display because preview audio JSON missing
- ✅ **Prevention:** Verify `cache/{story-id}-{LEVEL}-preview-combined-audio.json` exists
- ✅ **Prevention:** Check file contains `sentenceTimings` array

**Mistake #3: Not Checking Command Output**
- ❌ User says "done" but we don't verify what actually happened
- ✅ **Prevention:** ALWAYS ask user to paste first/last lines of output
- ✅ **Prevention:** Use Bash tool to verify files created with correct names

**Mistake #4: Typos in Commands**
- ❌ User types "A2--pilot" (no space) → command fails
- ✅ **Prevention:** Show command in code block with clear spacing
- ✅ **Prevention:** Verify error messages and help user fix typos

### **Quick Verification Checklist**

Before starting ANY story:
- [ ] All 5 scripts accept level as `process.argv[2]`
- [ ] All scripts have `VALID_LEVELS` array check
- [ ] No hardcoded `CEFR_LEVEL = 'A1'` anywhere

After EACH command:
- [ ] User pastes output showing correct level
- [ ] Bash tool verifies correct file created
- [ ] File naming matches level: `{story-id}-{LEVEL}-*.{ext}`

---

## ✅ Implementation Checklist

**Ordered by collection priority (catalog display order) and story number within collection**

### **1. Starting Over Collection** (sortOrder=1)

- [x] **`single-parent-rising-1`** - B1/B2 original → Add **A2** ✅ Complete (2025-12-12)
- [x] **`age-defiance-1`** - A1/A2 original → Add **A2** ✅ Complete (2025-12-13)

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

**Last completed:** `age-defiance-1` ✅ (2025-12-13)

**Next story to work on:** `medical-crisis-2` (Breaking Barriers collection, first priority)

