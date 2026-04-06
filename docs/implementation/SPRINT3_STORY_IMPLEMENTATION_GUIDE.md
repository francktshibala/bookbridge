# Sprint 3: Story Implementation Guide (Public Domain, Text-Only)

This guide covers the simplified workflow for Sprint 3 stories:
- Source: Project Gutenberg (public domain)
- No voice generation
- Architecture stays compatible with future audio addition

---

## Overview of the workflow

```
Gutenberg URL → Copilot fetches raw text → paste into cache/
→ simplify to CEFR level → write background + hook
→ upload to Supabase → seed quiz questions
→ verify on site
```

---

## Step 1 — Copilot fetches the raw story text

Ask Copilot:

> "Please fetch the text of [Chapter X] from [Project Gutenberg URL].
> Copy only the chapter text — no front matter, no table of contents, no footnotes.
> Paste it here so I can save it."

Save the output to:
```
cache/[book-id]-source.txt
```

Examples:
- `cache/frederick-douglass-reading-source.txt`
- `cache/mary-antin-promised-land-source.txt`
- `cache/booker-washington-school-source.txt`

**Check before moving on:** Is the text the right chapter? Is it complete? (~1,500–3,000 words is ideal)

---

## Step 2 — Simplify to CEFR level

Use the existing simplification API route or ask Claude directly with this prompt:

```
Simplify the following text to CEFR [A1/A2] level English for ESL learners.

Rules:
- Replace complex words with simpler alternatives
- Break long sentences into short ones (max 15 words per sentence)
- Keep all story facts and emotional moments — do not summarize or skip scenes
- Use present tense where natural
- Target: 6–10 paragraphs, ~600–1000 words after simplification
- Do NOT add titles, headers, or commentary — output the story text only

Text:
[paste source text here]
```

Save output to:
```
cache/[book-id]-[level]-simplified.txt
```

Examples:
- `cache/frederick-douglass-reading-A2-simplified.txt`
- `cache/mary-antin-promised-land-A1-simplified.txt`
- `cache/booker-washington-school-A2-simplified.txt`

---

## Step 3 — Write background + hook

**Background** (30–50 words): Sets historical context so the reader understands the world of the story.

Example format:
> In 1845, Frederick Douglass published his life story. He had been enslaved in America. Learning to read was illegal for enslaved people. But Frederick taught himself in secret. This is how he did it.

Save to: `cache/[book-id]-background.txt`

**Hook** (50–100 words): Emotional entry point. Pull the reader in immediately. First-person or dramatic third-person.

Example format:
> He was not allowed to read. The law said so. His enslaver said so. But every time he saw a word on a crate, on a sign, on a newspaper — Frederick Douglass studied it. Secretly. Slowly. He traded bread for lessons from poor white boys who didn't know any better. He was determined. And what he discovered changed everything.

Save to: `cache/[book-id]-hook.txt`

---

## Step 4 — Upload to Supabase

Sprint 3 stories go into the PRIMARY reading system (`story_bundles` table).

Split the simplified text into bundles of **4 sentences each**, then insert:

```sql
-- 1. Insert the story record first (if it doesn't exist)
-- Check your existing stories table for the right columns

-- 2. Insert bundles (text-only, audio_url is NULL)
INSERT INTO story_bundles (story_id, bundle_index, text, audio_url, word_timings)
VALUES
  ('[book-id]', 0, '[first 4 sentences]', NULL, NULL),
  ('[book-id]', 1, '[next 4 sentences]', NULL, NULL),
  -- continue for all bundles
;
```

**Note:** `audio_url = NULL` is intentional. The `BundleReadingInterface` already handles this and shows text-only mode when no audio is present.

---

## Step 5 — Seed quiz questions

Add the new book IDs to `scripts/seed-quiz-questions.js`:

```js
{ bookId: 'frederick-douglass-reading', level: 'A2', textFile: 'cache/frederick-douglass-reading-A2-simplified.txt' },
{ bookId: 'mary-antin-promised-land',   level: 'A1', textFile: 'cache/mary-antin-promised-land-A1-simplified.txt' },
{ bookId: 'booker-washington-school',   level: 'A2', textFile: 'cache/booker-washington-school-A2-simplified.txt' },
```

Then run:
```bash
node scripts/seed-quiz-questions.js
```

---

## Step 6 — Verify on site

1. Open bookbridge.app → browse to the new story
2. Confirm it loads and text renders (no audio controls expected)
3. Click "Take Quiz" and confirm 5 questions appear
4. Submit the quiz and confirm the score is recorded

---

## Architecture notes for future voice addition

When you are ready to add audio to these stories:

1. Generate audio using the ElevenLabs scripts (see `AUDIO_GENERATION_IMPLEMENTATION_PLAN.md`)
2. Upload audio files to Supabase Storage
3. Update the `story_bundles` rows to set `audio_url` for each bundle
4. No schema changes, no component changes — the reading interface already supports audio

```sql
-- Future: populate audio when ready
UPDATE story_bundles
SET audio_url = 'https://[your-storage-url]/[filename].mp3',
    word_timings = '[{...timing data...}]'
WHERE story_id = 'frederick-douglass-reading'
  AND bundle_index = 0;
```

---

## What this guide does NOT cover

- ElevenLabs voice generation (see `AUDIO_GENERATION_IMPLEMENTATION_PLAN.md`)
- Modernizing copyright-sensitive content (not needed — public domain text is already clear)
- Story onboarding system (see `PHASE_1_STORY_ONBOARDING.md`)
- Teacher dashboard (deferred to post-graduation)
