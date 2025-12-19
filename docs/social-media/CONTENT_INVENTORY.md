# Social Media Content Inventory

**Purpose:** Track all social media content created for YouTube/TikTok/Instagram
**Storage:** Files on Desktop + Google Drive backup (NOT in GitHub)
**Source Data:** Supabase bundles from BookBridge app

---

## 📚 RELATED DOCUMENTATION

**This file tracks what content has been created. For planning and generation:**

- **[CONTENT_PRODUCTION_PLAN.md](./CONTENT_PRODUCTION_PLAN.md)** - Master strategic plan (7 content pillars, weekly calendar, production workflow)
- **[SOCIAL_MEDIA_AUDIO_GENERATION_PLAN.md](./SOCIAL_MEDIA_AUDIO_GENERATION_PLAN.md)** - Technical workflow for generating audio (scripts, ElevenLabs API, FFmpeg)
- **[CONTENT_PRODUCTION_RESEARCH.md](./CONTENT_PRODUCTION_RESEARCH.md)** - Research findings and strategic analysis

**How to Use These Files Together:**
1. **Plan content** → Use `CONTENT_PRODUCTION_PLAN.md` to choose what to create
2. **Generate audio** → Follow `SOCIAL_MEDIA_AUDIO_GENERATION_PLAN.md` for technical steps
3. **Update this file** → Document all generated files, durations, vocabulary, shadowing sentences

---

## ✅ Romantic Love - Part 1 (Bundles 0-9)
**Generated:** 2025-12-18
**Status:** Complete
**Supabase Source:** `romantic-love-1` bundles 0-9

| Component | Filename | Duration | Size | Notes |
|-----------|----------|----------|------|-------|
| Introduction | `romantic-love-intro.mp3` | 0m 37s | 0.29 MB | Part 1 only (replaced by Cold Open in Part 2+) |
| Hook | `romantic-love-hook.mp3` | 0m 29s | 0.22 MB | Dramatic opening |
| Vocabulary | `romantic-love-vocab.mp3` | 1m 26s | 0.66 MB | 8 words: annoying, secret, shame, scared, guilty, lonely, angry, persisted |
| Shadowing | `romantic-love-shadowing.mp3` | 3m 36s | 1.65 MB | 10 sentences (7 contain vocab words) |
| Main Story | `romantic-love-part1.mp3` | 4m 30s | 2.06 MB | Bundles 0-9 slowed to 0.70x |
| Questions | `romantic-love-questions-part1.mp3` | 0m 52s | 0.40 MB | Bridge to Part 2 |
| **TOTAL** | **6 files** | **~12 min** | **5.3 MB** | 6-component structure |

**Script Files (Desktop):**
- `romantic-love-intro-script.txt`
- `romantic-love-hook-script.txt`
- `romantic-love-vocab-script.txt`
- `romantic-love-shadowing-script.txt`
- `romantic-love-questions-part1-script.txt`
- `romantic-love-part1-transcript.txt`

---

## ✅ Romantic Love - Part 2 (Bundles 10-19)
**Generated:** 2025-12-18
**Status:** Complete
**Supabase Source:** `romantic-love-1` bundles 10-19

| Component | Filename | Duration | Size | Notes |
|-----------|----------|----------|------|-------|
| **Cold Open** | `cold-open-part2.mp3` | 0m 44s | 0.34 MB | **NEW - Reusable format** |
| Hook | `romantic-love-hook-part2.mp3` | 0m 31s | 0.24 MB | References Part 1 cliffhanger |
| Vocabulary | `romantic-love-vocab-part2.mp3` | 1m 30s | 0.69 MB | 8 words: give up, excuse, stress, broke their hearts, respect, trust, terrified, accepted |
| Shadowing | `romantic-love-shadowing-part2.mp3` | 3m 32s | 1.62 MB | 10 sentences (7 contain vocab words) |
| Main Story | `romantic-love-part2.mp3` | 4m 14s | 1.94 MB | Bundles 10-19 slowed to 0.70x |
| Questions | `romantic-love-questions-part2.mp3` | 0m 55s | 0.42 MB | Bridge to Part 3 |
| **CTA** | `romantic-love-cta.mp3` | 0m 16s | 0.13 MB | **NEW - Subscribe prompt (reusable)** |
| **TOTAL** | **7 files** | **~12 min** | **5.4 MB** | 7-component structure |

**Script Files (Desktop):**
- `cold-open-script.txt` (reusable template)
- `cold-open-part2-script.txt`
- `romantic-love-hook-part2-script.txt`
- `romantic-love-vocab-part2-script.txt`
- `romantic-love-shadowing-part2-script.txt`
- `romantic-love-questions-part2-script.txt`
- `romantic-love-cta-script.txt` (reusable)

---

## 🔄 Reusable Components

### Cold Open Template
- **File:** `cold-open-script.txt`
- **Usage:** Change "[X]" to part number
- **Generate:** Once per part (Part 2, Part 3, Part 4...)
- **Duration:** ~45s

### CTA
- **File:** `romantic-love-cta.mp3`
- **Usage:** Same file for all parts
- **Content:** "Subscribe for Part 3 tomorrow"

---

## 📋 Pending Content

### Romantic Love - Part 3 (Bundles 20-28)
**Status:** Not started
**Supabase Source:** `romantic-love-1` bundles 20-28
**Components Needed:**
- [ ] Cold Open Part 3
- [ ] Hook Part 3
- [ ] Vocabulary Part 3 (8 words)
- [ ] Shadowing Part 3 (10 sentences)
- [ ] Main Story Part 3
- [ ] Questions Part 3 (final resolution)
- [ ] CTA (reuse existing)

---

## 📁 File Organization

**Desktop (Working Files):**
```
~/Desktop/
├── cold-open-part2.mp3
├── romantic-love-hook-part2.mp3
├── romantic-love-vocab-part2.mp3
├── romantic-love-shadowing-part2.mp3
├── romantic-love-part2.mp3
├── romantic-love-questions-part2.mp3
├── romantic-love-cta.mp3
└── [script files].txt
```

**Google Drive (Backup - Recommended):**
```
BookBridge Social Media/
├── romantic-love-part1/
│   ├── all 6 audio files
│   └── all script files
└── romantic-love-part2/
    ├── all 7 audio files
    └── all script files
```

**GitHub (Documentation Only):**
```
docs/social-media/
├── SOCIAL_MEDIA_AUDIO_GENERATION_PLAN.md
├── CONTENT_INVENTORY.md (this file)
└── scripts/
    └── generate_*.py (Python generation scripts)
```

---

## 🎯 Generation Stats

**Total Videos Created:** 2 (Part 1, Part 2)
**Total Audio Files:** 13
**Total Duration:** ~24 minutes
**Total Size:** ~10.7 MB
**API Cost:** ~$0.90
**Generation Time:** ~30 minutes

---

---

## ✅ Pillar 4: Emotion Lab - "Nervous" (Day 1)

**Generated:** December 18, 2024  
**Status:** ✅ Complete & Posted (YouTube, TikTok, Instagram)  
**Pillar:** 4 - "Feel It, Say It" Emotion Lab  
**Source:** Standalone content (not from BookBridge)

| Component | Filename | Duration | Size | Notes |
|-----------|----------|----------|------|-------|
| **Complete Audio** | `nervous-emotion.mp3` | 2m 9s | 0.99 MB | Daniel voice at 0.70x speed |

**Emotion Gradations:**
1. **Worried** (Level 1 - mild concern)
2. **Anxious** (Level 2 - moderate anxiety)
3. **Panicked** (Level 3 - extreme fear)

**Example Sentences:**
- "I'm worried about my test tomorrow." (A1)
- "She feels anxious before speaking in public." (A2)
- "He panicked when he lost his passport." (B1)

**Script File (Desktop):**
- `nervous-emotion-script.txt`

**Generation Script:**
- `docs/social-media/scripts/generate_nervous_emotion_audio.py`

**Platforms Posted:**
- ✅ YouTube (Playlist: "Emotion Vocabulary")
- ✅ TikTok
- ✅ Instagram Reels

**Workflow Completed:**
- [x] Step 1: Script writing
- [x] Step 2: Audio generation (ElevenLabs API + FFmpeg)
- [x] Step 3: Visual preparation (3 emotion images)
- [x] Step 4: Video assembly
- [x] Step 5: Posting (YouTube, TikTok, Instagram)

**Cost:** ~$0.15 (ElevenLabs API)  
**Generation Time:** ~15 minutes

---

## 📝 Notes

- All audio uses Jane voice (RILOU7YmBhvwJGDGjNmP) at 0.70x speed for story videos
- Emotion videos use Daniel voice (onwK4e9ZLuTAKqWW03F9) at 0.70x speed for educational content
- Vocabulary-Shadowing overlap strategy: 7-8/8 vocab words appear in shadowing sentences
- Files remain on Desktop - NOT pushed to GitHub
- Source bundles remain in Supabase (can regenerate if needed)
- Scripts saved for reproducibility
