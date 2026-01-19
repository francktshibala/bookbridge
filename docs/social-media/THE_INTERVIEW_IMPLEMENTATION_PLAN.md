# "The Interview" - Multi-Level Story Implementation Plan

**Story:** The Interview (Work Rejection Theme)  
**Format:** One video with A1/B1/C1 levels (5 min each = 15 min total)  
**Status:** Scripts created, ready for validation

---

## 📁 File Organization

### Scripts (Cache Folder)
- `cache/the-interview-A1-script.txt` ✅ Created
- `cache/the-interview-B1-script.txt` ✅ Created
- `cache/the-interview-C1-script.txt` ✅ Created

### Audio Files (Desktop - NOT GitHub)
- `~/Desktop/the-interview-A1.mp3`
- `~/Desktop/the-interview-B1.mp3`
- `~/Desktop/the-interview-C1.mp3`

### Documentation (GitHub)
- `docs/social-media/THE_INTERVIEW_IMPLEMENTATION_PLAN.md` (this file)

---

## ⚠️ Mistakes to Avoid

1. **Don't generate audio before validating scripts** - Check sentence length, natural flow first
2. **Don't mix speeds** - All levels at 0.70x (Slow English branding)
3. **Don't use micro-sentences** - Use compound sentences for natural audio
4. **Don't skip validation** - Read scripts aloud to test natural flow
5. **Don't save audio to GitHub** - Desktop only, backup to Google Drive

---

## 📋 Step-by-Step Implementation Plan

### Phase 1: Script Validation (Do First)

**Step 1.1: Validate A1 Script**
- [ ] Check sentence length: 8-12 words average, max 12 words
- [ ] Verify connectors: "and", "but", "when" only
- [ ] Read aloud: Does it sound natural?
- [ ] Word count: ~400-450 words (5 min at 0.70x)
- [ ] Fix any micro-sentences or choppy flow

**Step 1.2: Validate B1 Script**
- [ ] Check sentence length: 12-16 words average, max 25 words
- [ ] Verify connectors: "however", "despite", "although", "because"
- [ ] Read aloud: Does it sound natural?
- [ ] Word count: ~500-550 words (5 min at 0.70x)
- [ ] Fix any unnatural structures

**Step 1.3: Validate C1 Script**
- [ ] Check sentence length: 20-30 words average
- [ ] Verify sophisticated connectors: "nevertheless", "furthermore", "consequently"
- [ ] Read aloud: Does it sound natural?
- [ ] Word count: ~650-700 words (5 min at 0.70x)
- [ ] Ensure complexity matches C1 level

**Step 1.4: Cross-Level Consistency Check**
- [ ] Same story arc across all levels (struggle → perseverance → breakthrough)
- [ ] Same 7 emotional moments in all versions
- [ ] Same character name (Carlos) in all versions
- [ ] Same ending (gets the job) in all versions

---

### Phase 2: Audio Generation (One Level at a Time)

**Step 2.1: Generate A1 Audio**
- [ ] Create Python script: `generate-the-interview-A1.py`
- [ ] Use Daniel voice, 0.70x speed
- [ ] Generate audio from validated A1 script
- [ ] Save to: `~/Desktop/the-interview-A1.mp3`
- [ ] Validate duration: ~5 minutes (with ffprobe)
- [ ] Test playback: Does it sound natural?

**Step 2.2: Generate B1 Audio**
- [ ] Create Python script: `generate-the-interview-B1.py`
- [ ] Use Daniel voice, 0.70x speed
- [ ] Generate audio from validated B1 script
- [ ] Save to: `~/Desktop/the-interview-B1.mp3`
- [ ] Validate duration: ~5 minutes
- [ ] Test playback: Does it sound natural?

**Step 2.3: Generate C1 Audio**
- [ ] Create Python script: `generate-the-interview-C1.py`
- [ ] Use Daniel voice, 0.70x speed
- [ ] Generate audio from validated C1 script
- [ ] Save to: `~/Desktop/the-interview-C1.mp3`
- [ ] Validate duration: ~5 minutes
- [ ] Test playback: Does it sound natural?

---

### Phase 3: Video Assembly (CapCut)

**Step 3.1: Create Video Structure**
- [ ] On-camera intro (30s): "Same story, three levels"
- [ ] Hook (30s): Emotional opening
- [ ] Level switching demo (60s): Show A1 → B1 → C1 preview
- [ ] A1 Level (5 min): Full story at A1
- [ ] B1 Level (5 min): Full story at B1
- [ ] C1 Level (5 min): Full story at C1
- [ ] CTA (15s): "Which level fit you? Comment below"

**Step 3.2: Add YouTube Chapters**
- [ ] 0:00 - Intro & Hook
- [ ] 0:30 - Level Demo
- [ ] 1:30 - A1 Level Story
- [ ] 6:30 - B1 Level Story
- [ ] 11:30 - C1 Level Story
- [ ] 16:30 - CTA

**Step 3.3: Add Visual Elements**
- [ ] Text overlays: Key phrases, vocabulary words
- [ ] Level badges: "A1 Level" → "B1 Level" → "C1 Level"
- [ ] Visual transitions between levels
- [ ] Consistent branding (yellow/white/black)

---

### Phase 4: Testing & Validation

**Step 4.1: Test Navigation**
- [ ] Can users easily jump to A1/B1/C1 using chapters?
- [ ] Are timestamps clear in description?
- [ ] Do level badges appear on screen?

**Step 4.2: Test Engagement**
- [ ] Does hook create curiosity?
- [ ] Does level demo showcase value?
- [ ] Does CTA drive comments?

---

## ✅ Success Criteria

- [ ] All 3 scripts validated (sentence length, natural flow)
- [ ] All 3 audio files generated (5 min each, 0.70x speed)
- [ ] Video assembled with chapters for easy navigation
- [ ] Visual elements added (overlays, badges, transitions)
- [ ] Ready for upload and testing

---

## 🎯 Next Steps After This Story

1. Upload to YouTube with chapters
2. Monitor engagement (views, comments, watch time)
3. Test if multi-level format drives more engagement than single-level
4. Iterate based on data
5. If successful, create more multi-level stories

