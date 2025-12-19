# Social Media Audio Generation Plan
**For:** YouTube, TikTok, Instagram Reels
**Date:** December 2025
**Status:** ✅ Production (1 complete video, proven workflow)
**Last Updated:** December 18, 2025

---

## 🎯 Purpose

Generate **standalone audio files** for social media marketing content. These are **NOT** part of the BookBridge app - they're external marketing materials to drive traffic to the app.

**Key Difference from BookBridge Stories:**
- ✅ Simple, standalone MP3 files (not bundles)
- ✅ Local files only (not pushed to GitHub/Supabase)
- ✅ No database integration
- ✅ No word-level sync required
- ✅ No frontend code changes

---

## 📋 Content Types

### 1. **Educational/Instructional Content**
**Example:** "The REAL Way to Learn English" intro video
**Duration:** 5-7 minutes (YouTube)
**Features:**
- Scripted teaching content
- Strategic pauses for viewer engagement
- Call-to-action sections
- Shadowing exercises

### 2. **Story Previews/Hooks**
**Example:** 60-second clips from Medical Crisis, Romantic Love, etc.
**Duration:** 30-60 seconds (TikTok/Reels)
**Features:**
- Emotional hooks
- Cliffhangers
- Clear, slow narration
- Drives viewers to full story on YouTube or BookBridge app

### 3. **Full Story Videos (6-Component Structure)**
**Example:** "I Hid My Love for 5 Years" - Part 1
**Duration:** 10-12 minutes (YouTube)
**Voice:** Jane (RILOU7YmBhvwJGDGjNmP) for story content
**Speed:** 0.70x for A1 beginners

**Complete Video Structure:**
1. **Introduction (30-40s)** - Explains video format ("First, vocabulary. Then shadowing...")
2. **Hook (20-30s)** - Dramatic opening with emotional cliffhanger
3. **Vocabulary (1-2 min)** - 8 key words with definitions and 3s pauses
4. **Shadowing Practice (3-4 min)** - 10 sentences, each spoken twice with 5s pauses
5. **Main Story (4-5 min)** - Story bundles slowed to 0.70x with 3s pauses between bundles
6. **Questions (1 min)** - Mix of rhetorical, yes/no, and bridge questions

**Why This Structure Works:**
- ✅ Sets clear expectations upfront (reduces learner anxiety)
- ✅ Vocabulary prep before story (comprehension aid)
- ✅ Active practice before passive listening (engagement)
- ✅ Questions reinforce comprehension and bridge to next part
- ✅ Reusable format across all story videos

---

## 🎙️ Audio Generation Workflow

### Phase 1: Script Preparation
**Input:** Raw script with pause markers
**Process:**
1. Review script for natural flow
2. Mark pauses with exact timing (e.g., `[PAUSE 2s]`)
3. Remove any intro phrases or filler
4. Validate total duration estimate

**Quality Check:**
- ✅ No repetitive phrases
- ✅ Natural sentence boundaries
- ✅ Appropriate pause placement
- ✅ Clear vocabulary

### Phase 2: Audio Generation (ElevenLabs API)
**Tool:** ElevenLabs TTS via API

**Voice Selection:**
- **Daniel** (onwK4e9ZLuTAKqWW03F9) - Educational/instructional content
- **Jane** (RILOU7YmBhvwJGDGjNmP) - Story videos (proven excellent for narrative)

**Settings:**
```javascript
{
  voice_id: "RILOU7YmBhvwJGDGjNmP", // Jane for stories
  model_id: "eleven_multilingual_v2",
  voice_settings: {
    stability: 0.75,
    similarity_boost: 0.85,
    style: 0.0,
    use_speaker_boost: true
  }
}
```

**Why Jane for Stories:**
- Professional audiobook reader quality
- Clear pronunciation for ESL learners
- Warm, engaging tone for emotional content
- Consistent across all story video components

**Process:**
1. Split script by pause markers
2. Generate audio for each text segment
3. Generate silence segments for pauses
4. Concatenate all segments using FFmpeg

### Phase 3: Post-Processing
**Tool:** FFmpeg
**Process:**
1. **Speed Adjustment:**
   ```bash
   ffmpeg -i input.mp3 -filter:a "atempo=0.70" slow.mp3
   ```
   - Use 0.70x for educational content
   - Use 0.85x for story content

2. **Silence Insertion:**
   ```bash
   # Generate silence
   ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 2.0 silence.mp3

   # Concatenate segments
   ffmpeg -i "concat:part1.mp3|silence.mp3|part2.mp3" output.mp3
   ```

3. **Quality Check (ffprobe):**
   ```bash
   ffprobe -v error -show_entries format=duration output.mp3
   ```
   - Verify actual duration matches expected
   - Check file size is reasonable (< 5MB for 7min video)

### Phase 4: Validation
**Checks:**
- [ ] Audio plays smoothly without glitches
- [ ] Pauses are exact duration specified
- [ ] Speed is appropriate for target audience
- [ ] No clipping or distortion
- [ ] File format: MP3, 64kbps, Mono, 44.1kHz

---

## 📂 File Organization

### Local Storage Structure
```
~/Desktop/
├── social-media-audio/
│   ├── educational/
│   │   ├── intro-v1.mp3
│   │   ├── intro-v2.mp3
│   │   └── intro-script.txt
│   ├── story-hooks/
│   │   ├── medical-crisis-hook-60s.mp3
│   │   ├── romantic-love-hook-60s.mp3
│   │   └── teaching-dad-hook-60s.mp3
│   └── README.md
```

**Naming Convention:**
- `{content-type}-{topic}-{version}.mp3`
- Example: `intro-learning-method-v2.mp3`
- Example: `hook-romantic-love-60s.mp3`

---

## 🚨 Critical Rules (Learned from BookBridge Mistakes)

### ✅ DO:
1. **Clean Text Only** - No intro phrases like "Here is the audio for..."
2. **Measured Duration** - Always use ffprobe to verify actual duration
3. **Exact Pauses** - Generate actual silence, don't estimate
4. **Local Files Only** - DO NOT push to GitHub or upload to Supabase
5. **Test First Segment** - Generate first 30 seconds, validate before full generation

### ❌ DON'T:
1. **No Estimation** - Never estimate audio duration with formulas
2. **No Generic Paths** - Each file gets unique, descriptive name
3. **No Database** - These are standalone files, not integrated into app
4. **No Multiple Phases** - Complete and validate each step before moving on
5. **No App Code Changes** - These files are completely separate from BookBridge codebase

---

## 🎬 60-Second Hook Creation (for TikTok/Reels)

### Best Hook Segments from Intro Video:

**Option 1: The Problem (30s)**
```
You study English grammar every day.
You memorize new words every week.
But when someone speaks to you in English... you freeze.
[PAUSE 2s]
Why does this happen?
[PAUSE 2s]
Today, I'll show you the secret method that actually works.
```

**Option 2: The Solution (45s)**
```
It's called shadowing.
[PAUSE 2s]
Shadowing means: Listen to English, and repeat immediately.
[PAUSE 2s]
Let me show you how it works.
[PAUSE 2s]
Listen: "I wake up every morning at seven o'clock."
[PAUSE 3s]
Now repeat after me: "I wake up every morning at seven o'clock."
[PAUSE 5s]
When you shadow, your mouth learns the correct movements.
```

**Recommendation:** Use Option 1 for TikTok (shorter, more dramatic)

---

## 🔧 Technical Implementation Steps

### For "Intro Video" Generation:

**Step 1:** Parse script and extract text segments
```javascript
const segments = [
  { text: "You study English grammar every day.", pause: 1000 },
  { text: "You memorize new words every week.", pause: 1000 },
  // ... etc
];
```

**Step 2:** Generate audio for each text segment via ElevenLabs

**Step 3:** Generate silence files
```bash
for duration in 1.0 2.0 3.0 5.0; do
  ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t $duration pause_${duration}s.mp3
done
```

**Step 4:** Create concat list
```
file 'segment_001.mp3'
file 'pause_1.0s.mp3'
file 'segment_002.mp3'
file 'pause_1.0s.mp3'
...
```

**Step 5:** Concatenate all segments
```bash
ffmpeg -f concat -safe 0 -i concat_list.txt -c copy temp.mp3
```

**Step 6:** Apply 0.70x speed reduction
```bash
ffmpeg -i temp.mp3 -filter:a "atempo=0.70" final.mp3
```

**Step 7:** Verify with ffprobe
```bash
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 final.mp3
```

---

## 📝 Component-Specific Formats (Full Story Videos)

### 1. Cold Open Script Format (UPDATED - Now Used for All Parts)
**Purpose:** Explain shadowing method + part navigation for all videos
**Duration:** 45-60 seconds
**Format:**
```
Most people study English but cannot speak.
[PAUSE 1s]
Why? Your brain knows English, but your mouth does not.
[PAUSE 1s]
We use shadowing. Listen to me, then repeat immediately.
[PAUSE 1s]
Shadowing trains your mouth to move correctly.
[PAUSE 1s]
After 30 days, you will speak without thinking.
[PAUSE 1s]
This is Part [X] of our story.
[PAUSE 1s]
New here? Watch the previous parts on our channel first.
[PAUSE 1s]
Ready? Let's continue.
```

**Why This Change:**
- ✅ Explains method benefits (not just format)
- ✅ Works for all parts (only [X] changes)
- ✅ Directs new viewers to previous parts
- ✅ Avoids "link in description" (doesn't work on TikTok)
- ✅ Reusable - generate once for each part number

### 2. Hook Script Format
**Purpose:** Emotional engagement and cliffhanger
**Duration:** 20-30 seconds
**Format:**
```
[Dramatic statement about secret/conflict]
[PAUSE 1s]
[Family/authority opposition]
[PAUSE 1s]
[Character's emotional response]
[PAUSE 1s]
[Escalation]
[PAUSE 1s]
[Consequence/breaking point]
[PAUSE 2s]
This is [Character's] story.
```

**Example:**
```
I hid my boyfriend for 5 years.
[PAUSE 1s]
My family said I could never be with him.
[PAUSE 1s]
But I loved him.
[PAUSE 1s]
So I lied to everyone.
[PAUSE 1s]
For five years, I kept this secret.
[PAUSE 1s]
Until the stress broke me.
[PAUSE 2s]
This is my story.
```

### 3. Vocabulary Script Format
**Purpose:** Pre-teach key words before story
**Duration:** 1-2 minutes (8 words)
**Format per word:**
```
[Word]. [Definition]. [Word]. Now repeat:
[PAUSE 3s]
```

**Selection Criteria:**
- Choose emotionally powerful words (scared, guilty, lonely)
- A1 level vocabulary only
- Words that appear in the story
- Focus on feelings/actions relevant to theme

**🔥 CRITICAL: Vocabulary-Shadowing Overlap Strategy**
- **7-8 vocabulary words MUST appear in shadowing sentences**
- This creates spaced repetition: Definition → Sentence practice → Full story
- Learners hear/speak each word 3 times in different contexts
- Example: "Stress" → "Stress. Worry that makes you sick." → "The stress made me feel sick and tired." → Appears in main story
- **This overlap is the secret to retention!**

**Example:**
```
Annoying. Feeling bothered by someone. Annoying. Now repeat:
[PAUSE 3s]
Secret. Something you hide from others. Secret. Now repeat:
[PAUSE 3s]
```

### 4. Shadowing Practice Script Format
**Purpose:** Active speaking practice before passive listening
**Duration:** 3-4 minutes (10 sentences)
**Format per sentence:**
```
[Sentence from story]
[PAUSE 5s - learner tries to repeat]
[Same sentence repeated]
[PAUSE 5s - learner repeats again]
```

**Selection Criteria:**
- Choose 10 key sentences from the story
- Mix of simple and slightly complex sentences
- Cover the full story arc
- Include emotional turning points
- **🔥 CRITICAL: 7-8 sentences MUST contain vocabulary words from Section 3**

**Why Speak Twice:**
- First time: Learner hears and attempts
- Second time: Reinforcement and confidence building
- 5s pauses: Enough time for A1 learners to speak full sentence

**Vocabulary Integration (Spaced Repetition):**
- Vocabulary Section: Learn isolated word + definition
- Shadowing Section: Practice word in sentence (2 min later)
- Main Story: Hear word in full narrative context (8 min later)
- **3 exposures = deep memory encoding**

### 5. Main Story Format
**Purpose:** The complete narrative with comprehension pauses
**Duration:** 4-5 minutes (10 bundles for Part 1)
**Format:**
```
[Bundle 0 audio - slowed to 0.70x]
[PAUSE 3s - processing time]
[Bundle 1 audio - slowed to 0.70x]
[PAUSE 3s - processing time]
...
```

**Technical Process:**
1. Extract bundles 0-9 from BookBridge story
2. Slow each bundle from 0.85x to 0.70x (multiply by 0.8235)
3. Add 3s pause after each bundle
4. Concatenate all segments

**Duration Calculation:**
- Original bundles at 0.85x: ~X minutes
- After slowing to 0.70x: X * (0.85/0.70) minutes
- With 3s pauses: Add (num_bundles * 3) seconds

### 6. Questions Script Format
**Purpose:** Check comprehension and bridge to next part
**Duration:** ~1 minute (5 questions)
**Question Mix:**

**Format:**
```
[Rhetorical question - personal reflection]
[PAUSE 3s]

[Yes/No question]
[PAUSE 2s]
[Answer: "Yes" or "No"]
[PAUSE 3s]

[Rhetorical question - story comprehension]
[PAUSE 3s]

[Yes/No question]
[PAUSE 2s]
[Answer: "Yes" or "No"]
[PAUSE 3s]

[Bridge question to Part 2 - cliffhanger]
[PAUSE 4s]
```

**Example:**
```
Have you ever hidden something important from your family?
[PAUSE 3s]

Did Maya's family allow her to date Alex?
[PAUSE 2s]
No.
[PAUSE 3s]

Why did Maya keep Alex a secret for so long?
[PAUSE 3s]

Did Maya feel guilty about lying?
[PAUSE 2s]
Yes.
[PAUSE 3s]

Maya's father is very angry. What will Maya do next?
[PAUSE 4s]
```

**Why This Question Mix:**
- Rhetorical questions: No pressure, emotional connection
- Yes/No questions: Easy wins, builds confidence
- Bridge question: Creates anticipation for next part
- All A1-friendly vocabulary

---

## 🎬 Multi-Part Story Planning

### When to Split Stories
**Indicators a story is too long:**
- More than 15-20 bundles at 0.70x speed
- Estimated full video > 15 minutes
- Natural story break points exist

**How to Split:**
1. Calculate total duration at 0.70x with pauses
2. If > 15 min, identify natural break points (e.g., bundle 9-10, 19-20)
3. Create Part 1, Part 2, Part 3, etc.
4. Use bridge questions to connect parts

**Example: "I Hid My Love for 5 Years" (29 bundles)**
- **Analysis:** Full story = ~19 minutes (too long)
- **Solution:** Split into 3 parts
  - Part 1 (bundles 0-9): Meeting → Parents find out (11 min video)
  - Part 2 (bundles 10-19): Confrontation → Decision
  - Part 3 (bundles 20-28): Resolution → Outcome

**Naming Convention:**
- `romantic-love-part1.mp3`
- `romantic-love-questions-part1.mp3`
- All components include "part1" suffix

---

## ✅ Case Study: "I Hid My Love for 5 Years" - Part 1
**Date:** December 18, 2025
**Status:** ✅ Complete

### Overview
Successfully created complete 6-component video structure for romantic-love-1 story Part 1.

### Files Generated
| Component | Filename | Duration | Size | Segments |
|-----------|----------|----------|------|----------|
| Introduction | `romantic-love-intro.mp3` | 0m 37s | 0.29 MB | 6 text + 5 pauses |
| Hook | `romantic-love-hook.mp3` | 0m 29s | 0.22 MB | 7 text + 6 pauses |
| Vocabulary | `romantic-love-vocab.mp3` | 1m 26s | 0.66 MB | 8 words + 8 pauses |
| Shadowing | `romantic-love-shadowing.mp3` | 3m 36s | 1.65 MB | 20 text + 20 pauses |
| Main Story | `romantic-love-part1.mp3` | 4m 30s | 2.06 MB | 10 bundles + 10 pauses |
| Questions | `romantic-love-questions-part1.mp3` | 0m 52s | 0.40 MB | 7 text + 7 pauses |
| **TOTAL** | **6 files** | **~12 min** | **5.3 MB** | **68 segments** |

### Vocabulary Words Used
1. **Annoying** - Feeling bothered by someone
2. **Secret** - Something you hide from others
3. **Shame** - Bad feeling about yourself
4. **Scared** - Feeling afraid
5. **Guilty** - Bad feeling when you lie
6. **Lonely** - Feeling alone
7. **Angry** - Very mad feeling
8. **Persisted** - Continued trying

### Shadowing Sentences (10 key moments)
1. "I met Alex when I was 17 years old."
2. "Something about him made me smile."
3. "I had real feelings for him."
4. "My family has strict rules."
5. "I could not tell anyone about it."
6. "Living this double life was very tiring."
7. "We started to date quietly and kept it a secret."
8. "I was scared when they found out my secret."
9. "I lied to everyone I loved and felt very guilty."
10. "After two years, my parents found out my secret."

### Technical Specifications
- **Voice:** Jane (RILOU7YmBhvwJGDGjNmP)
- **Speed:** 0.70x (beginner-friendly)
- **Format:** MP3, 64kbps, Mono, 44.1kHz
- **ElevenLabs Settings:**
  - Model: eleven_multilingual_v2
  - Stability: 0.75
  - Similarity boost: 0.85
  - Style: 0.0
  - Speaker boost: true

### Duration Analysis
**Original Story (29 bundles at 0.85x):**
- Total: 9m 15s

**After Processing:**
- At 0.70x speed: 11m 14s
- With 3s pauses (29 bundles): 12m 41s
- **Full video with all components: 19m 11s (TOO LONG)**

**Solution: Split into 3 parts**
- Part 1 (bundles 0-9): 11m video ✅
- Part 2 (bundles 10-19): TBD
- Part 3 (bundles 20-28): TBD

### Key Learnings
1. **Introduction section essential** - Reduces learner anxiety by setting clear expectations
2. **Shadowing works best with repetition** - Speak sentence twice with 5s pauses
3. **Question mix optimal for A1** - Rhetorical (reflection) + Yes/No (confidence) + Bridge (anticipation)
4. **Story length matters** - 10 bundles = perfect for ~12 min video
5. **Jane voice excellent for stories** - Professional, clear, warm tone
6. **Vocabulary selection critical** - Choose emotionally powerful, story-relevant words

### Workflow Efficiency
**Total Generation Time:** ~15 minutes
- Script preparation: 5 min
- Audio generation (68 segments via ElevenLabs API): 8 min
- Post-processing (concatenation + speed adjustment): 2 min

**API Costs:**
- ElevenLabs: 68 text segments ≈ $0.40
- Total per video: < $0.50

### Success Metrics Target
- [ ] YouTube upload complete
- [ ] Viewer retention > 40%
- [ ] Average view duration > 5 minutes
- [ ] Comments mention clear pronunciation
- [ ] Learners complete full video

### Next Steps
1. ✅ Create Part 2 (bundles 10-19) - COMPLETED
2. Create Part 3 (bundles 20-28)
3. Test with A1 learners for feedback
4. Apply learnings to other stories (Medical Crisis, Grief to Purpose)

---

## ✅ Case Study: "I Hid My Love for 5 Years" - Part 2
**Date:** December 18, 2025
**Status:** ✅ Complete

### Overview
Successfully created Part 2 with new Cold Open format (reusable for all parts).

### Files Generated
| Component | Filename | Duration | Size | Notes |
|-----------|----------|----------|------|-------|
| **Cold Open** | `cold-open-part2.mp3` | 0m 44s | 0.34 MB | **NEW - Reusable format** |
| Hook | `romantic-love-hook-part2.mp3` | 0m 31s | 0.24 MB | Cliffhanger from Part 1 |
| Vocabulary | `romantic-love-vocab-part2.mp3` | 1m 30s | 0.69 MB | 8 escalation words |
| Shadowing | `romantic-love-shadowing-part2.mp3` | 3m 32s | 1.62 MB | 10 key sentences |
| Main Story | `romantic-love-part2.mp3` | 4m 14s | 1.94 MB | Bundles 10-19 |
| Questions | `romantic-love-questions-part2.mp3` | 0m 55s | 0.42 MB | Bridge to Part 3 |
| **CTA** | `romantic-love-cta.mp3` | 0m 16s | 0.13 MB | **NEW - Subscribe prompt** |
| **TOTAL** | **7 files** | **~12 min** | **5.4 MB** | 7-component structure |

### Vocabulary Words (Escalation Theme)
1. **Give up** - Stop trying
2. **Excuse** - Fake reason to hide truth
3. **Stress** - Worry that makes you sick
4. **Broke their hearts** - Made them very sad
5. **Respect** - Honor and care for someone
6. **Trust** - Believe in someone
7. **Terrified** - Extremely scared
8. **Accepted** - Welcomed and approved

### Shadowing Sentences (Part 2 Arc)
1. "But I did not give up."
2. "I made excuses and did not tell the truth."
3. "The stress made me feel sick and tired."
4. "I told them I was still with Alex after five years."
5. "I felt sad because I broke their hearts."
6. "They said it was a sign of respect."
7. "I felt very scared and was terrified."
8. "My parents liked Alex very much."
9. "My family slowly accepted me."
10. "We got engaged and are very happy."

### Key Improvements from Part 1
1. **Cold Open replaces Introduction** - Explains method benefits, not just format
2. **Added CTA at end** - "Subscribe for Part 3 tomorrow"
3. **Vocabulary reflects story arc** - Escalation words (stress, terrified, accepted)
4. **Questions bridge harder** - Creates stronger anticipation for Part 3
5. **TikTok-friendly navigation** - "Watch previous parts on channel" (no link needed)

### Technical Notes
- Cold Open can be reused for Part 3, 4, etc. (only part number changes)
- CTA is reusable for all story videos
- Total generation time: ~15 minutes
- API cost: ~$0.45 per video

---

## 📊 Quality Standards

**Audio Quality:**
- Format: MP3
- Bitrate: 64 kbps (sufficient for voice)
- Sample Rate: 44.1 kHz
- Channels: Mono
- No clipping, distortion, or artifacts

**Timing Accuracy:**
- Pauses within ±50ms of specified duration
- Total duration within ±200ms of expected
- No awkward gaps or overlaps

**Voice Quality:**
- Clear, natural-sounding speech
- Appropriate speed for target audience
- Consistent volume throughout

---

## 🎯 Success Metrics

**For Educational Content:**
- [ ] Viewer retention > 40% (YouTube analytics)
- [ ] Clear pronunciation for ESL learners
- [ ] Pauses allow time for shadowing

**For Story Hooks:**
- [ ] Emotional impact in first 5 seconds
- [ ] Clear cliffhanger or question
- [ ] Drives curiosity to see full story

---

## 📝 Documentation & Tracking

**For Each Audio File, Document:**
1. Script version used
2. Voice settings applied
3. Post-processing steps
4. Actual duration vs expected
5. File size and format
6. Usage (YouTube, TikTok, Instagram)

**Example Record:**
```
File: intro-learning-method-v2.mp3
Voice: Daniel (onwK4e9ZLuTAKqWW03F9)
Speed: 0.70x
Duration: 7m 14s (expected 7m 00s)
Size: 3.8 MB
Format: MP3, 64kbps, Mono, 44.1kHz
Status: Ready for YouTube upload
```

---

## 🔄 Iteration Process

**If Audio Needs Revision:**
1. Identify specific issue (pace, pauses, clarity)
2. Update script or settings
3. Regenerate affected segments only
4. Re-concatenate and test
5. Document what changed and why

**Version Control:**
- Keep all versions with clear naming (v1, v2, v3)
- Document changes in README.txt
- Delete old versions only after new version is approved

---

## ⚠️ Important Reminders

1. **Local Only:** All files stay on Desktop, never pushed to GitHub
2. **No App Integration:** These are standalone marketing materials
3. **Test Before Full Generation:** Always validate first segment
4. **Measure, Don't Estimate:** Use ffprobe for all duration checks
5. **Clean Scripts:** No AI-generated intro phrases or filler

---

## 📞 Reference Files (in BookBridge Repo)

**For Learning Only (DO NOT modify these):**
- `docs/MASTER_MISTAKES_PREVENTION.md` - Timing best practices
- `docs/implementation/AUDIO_GENERATION_GUIDELINES.md` - Clean text principles
- `docs/implementation/HIGHLIGHTING_SYNC_FIX_PLAN.md` - Timing accuracy methods

**What to Take from Them:**
- ✅ Pause timing methodology
- ✅ Clean text generation (no intro phrases)
- ✅ Measured duration validation
- ✅ Quality assurance checklist

**What to Ignore:**
- ❌ Bundle architecture
- ❌ Frontend integration
- ❌ Database structures
- ❌ Word-level sync requirements
