# Sprint 3: Expanded Content Library Plan

**Sprint:** Week 5 of CSE499 Senior Project
**Goal:** Add 3 engaging public domain stories across different genres
**Status:** ⏳ IN PROGRESS

---

## Selected Stories

### Story 1: Frederick Douglass — "Learning to Read and Write"
**Source:** *Narrative of the Life of Frederick Douglass* (1845) — Chapter VII
**Public Domain:** Yes (pre-1929) ✅
**Gutenberg ID:** [eBook #23]
**Proposed Book ID:** `frederick-douglass-reading`
**Genre:** Inspirational / Historical
**CEFR Target:** A2

**Why this story:**
- Directly resonates with ESL learners (literacy as freedom/empowerment)
- Short, self-contained chapter (~2,000 words in original)
- High emotional arc: forbidden → determined → triumphant
- Universally relatable theme of learning language against obstacles
- "Text a friend" test: ✅ — "This man taught himself to read in secret and it changed everything"

**Requirements met:**
- [x] Public domain (pre-1929) — no copyright concerns
- [x] Emotional and compelling narrative
- [x] Clear ESL resonance (language learning = survival/freedom)
- [x] Appropriate length for featured book (6–10 paragraphs after simplification)
- [x] Strong thematic fit for BookBridge audience (immigrants, adult learners)

---

### Story 2: Mary Antin — "The Promised Land" (arrival chapter)
**Source:** *The Promised Land* (1912) — Chapter I or the arrival/school chapters
**Public Domain:** Yes (pre-1929) ✅
**Gutenberg ID:** [eBook #3680]
**Proposed Book ID:** `mary-antin-promised-land`
**Genre:** Immigration / Inspirational
**CEFR Target:** A1

**Why this story:**
- Written by an immigrant about her own immigration experience — perfect resonance
- First day of school chapter is vivid, emotional, accessible
- Speaks directly to BookBridge's core audience (immigrants learning English)
- "Text a friend" test: ✅ — "She couldn't speak English but walked into school and it changed her life"

**Requirements met:**
- [x] Public domain (pre-1929) — no copyright concerns
- [x] Immigration narrative (core BookBridge theme)
- [x] Emotional first-person voice
- [x] Short enough to simplify to A1 without losing impact
- [x] Strong cliffhanger potential in school/arrival moments

---

### Story 3: Booker T. Washington — "Up From Slavery" (school arrival)
**Source:** *Up From Slavery* (1901) — Chapter II or III (arrival at Hampton Institute)
**Public Domain:** Yes (pre-1929) ✅
**Gutenberg ID:** [eBook #2376]
**Proposed Book ID:** `booker-washington-school`
**Genre:** Inspirational / Drama
**CEFR Target:** A2

**Why this story:**
- Walking hundreds of miles to reach a school — extraordinary determination
- Clear ESL resonance (education as the path out of hardship)
- Strong visual scenes that simplify well
- "Text a friend" test: ✅ — "He walked 500 miles just to get into a school, and they almost didn't let him in"

**Requirements met:**
- [x] Public domain (pre-1929) — no copyright concerns
- [x] Perseverance and education themes (core BookBridge values)
- [x] Dramatic, cinematic scenes (sweeping floor, earning entry)
- [x] Appropriate length for featured book format
- [x] High emotional arc: desperation → arrival → test → acceptance

---

## Implementation Approach

### What we're doing differently from previous stories

| Previous approach | Sprint 3 approach |
|---|---|
| Fetch story from copyrighted modern sources | Fetch directly from Project Gutenberg (public domain) |
| Generate voice audio with ElevenLabs | No voice generation — text-only for now |
| Run modernization scripts | Skip (originals are already in English) |
| Run simplification scripts via Claude | Same — Claude still simplifies to CEFR level |

### Architecture decision: voice-ready but voice-free

Even though we are not generating audio for Sprint 3, all story data will be stored in a format compatible with the existing audio bundle system. This means:

- Stories will be uploaded to Supabase in the same `story_bundles` structure as audio stories
- The `audio_url` field will be `null` for Sprint 3 stories
- The `BundleReadingInterface` already handles `null` audio gracefully (text-only mode)
- When we want to add voice later: run the audio generation script and populate `audio_url` for each bundle — no schema changes needed

---

## Task Breakdown

### Tasks (Est. 20 hours total)

- [ ] **Fetch raw story text from Project Gutenberg** (Est: 1hr)
  - Frederick Douglass Chapter VII
  - Mary Antin arrival/school chapter
  - Booker T. Washington Hampton arrival chapter

- [ ] **Simplify to target CEFR level** (Est: 4hr)
  - Douglass → A2 simplification
  - Antin → A1 simplification
  - Washington → A2 simplification

- [ ] **Write background + hook for each story** (Est: 2hr)
  - Background: 30-50 words (sets historical context)
  - Hook: 50-100 words (emotional entry point)

- [ ] **Upload stories to Supabase** (Est: 3hr)
  - Create story_bundles rows (no audio_url)
  - Create story metadata rows
  - Test that BundleReadingInterface renders them correctly

- [ ] **Build story preview cards** (Est: 5hr)
  - Genre tag
  - Estimated read time
  - First 2 paragraphs as preview

- [ ] **Implement "Next Read" recommendation** (Est: 4hr)
  - Based on genre/completion
  - Auto-suggest after a story finishes

- [ ] **Generate quiz questions** (Est: 1hr)
  - Run seed-quiz-questions.js for the 3 new book IDs
  - Verify questions appear in the quiz modal

### Total: ~20 hours

---

## Completion Checklist

- [ ] All 3 stories live in production at bookbridge.app
- [ ] Each story has: background, hook, simplified text, preview card
- [ ] Quiz questions seeded for all 3 stories
- [ ] Stories appear in the correct genre collection
- [ ] BundleReadingInterface renders text-only (no audio controls visible when audio_url is null)
- [ ] Story preview cards show on the browse page
- [ ] "Next Read" recommendation triggers after finishing a story

---

## Notes

- Teacher dashboard (deferred from Sprint 2) remains deferred — not in scope for Sprint 3
- Voice generation can be added post-graduation by running existing audio scripts on these 3 story IDs
- All 3 stories are from Project Gutenberg — always verify the exact chapter URL before fetching
