# Social Media Content Inventory

**Purpose:** Track all social media content created for YouTube/TikTok/Instagram
**Storage:** Files on Desktop + Google Drive backup (NOT in GitHub)
**Source Data:** Supabase bundles from BookBridge app

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

## 📝 Notes

- All audio uses Jane voice (RILOU7YmBhvwJGDGjNmP) at 0.70x speed
- Vocabulary-Shadowing overlap strategy: 7-8/8 vocab words appear in shadowing sentences
- Files remain on Desktop - NOT pushed to GitHub
- Source bundles remain in Supabase (can regenerate if needed)
- Scripts saved for reproducibility
