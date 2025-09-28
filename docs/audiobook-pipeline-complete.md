# Complete Audiobook Pipeline Implementation Guide

## Overview
This document consolidates all lessons learned from Sleepy Hollow and Great Gatsby implementations to provide a bulletproof process for future audiobook generation.

## Table of Contents
1. [Pipeline Overview](#pipeline-overview)
2. [Required Setup](#required-setup)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Script Templates](#script-templates)
5. [Database Schema](#database-schema)
6. [API Integration](#api-integration)
7. [Frontend Integration](#frontend-integration)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Lessons Learned](#lessons-learned)

## Pipeline Overview

**Proven 5-Step Process:**
1. **Fetch** → Download and structure original text
2. **Modernize** → Update language for contemporary readers
3. **Simplify** → Create CEFR-level versions with GPT-5 safeguards
4. **Generate** → Create audio bundles with ElevenLabs
5. **Deploy** → Add to Featured Books with chapters

**Success Metrics:**
- Sleepy Hollow: 325 sentences, 82 bundles, perfect sync
- Great Gatsby: 3,605 sentences, 902 bundles, ~$35 cost

## Required Setup

### Environment Variables (.env.local)
```bash
# Database
DATABASE_URL="postgresql://..."
SUPABASE_SERVICE_ROLE_KEY="..."

# AI APIs
OPENAI_API_KEY="sk-proj-..."
ELEVENLABS_API_KEY="sk_..."

# Voice Selection
VOICE_ID="EXAVITQu4vr4xnSDxMaL"  # Sarah (recommended)
```

### Dependencies
- Prisma ORM
- OpenAI SDK
- ElevenLabs API
- Supabase client
- Node.js file system operations

## Step-by-Step Implementation

### Step 1: Fetch Script Template
**File: `scripts/fetch-{book-name}.js`**

Key features:
- Chapter detection with thematic titles
- Text cleaning and structure
- Metadata generation
- Progress tracking

**Critical lesson:** Always include manual chapter enhancement for better UX.

### Step 2: Modernization Script
**File: `scripts/modernize-{book-name}.js`**

**GPT-5 Validated Safeguards:**
```javascript
// Absolute path resolution (Lesson #1)
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CACHE_FILE = path.join(PROJECT_ROOT, 'cache', `${book}-modernized.json`);

// CLI flags for control
const args = process.argv.slice(2);
const clearCache = args.includes('--clear-cache');
const freshRun = args.includes('--fresh');

// Cache validation
if (cached.totalChunks && cached.chunks.length >= cached.totalChunks) {
  // Complete cache found
  return;
}
```

**Modernization Prompt (Proven):**
```javascript
const promptTemplate = `
CRITICAL RULES:
- PRESERVE STORY MEANING 100% - no plot changes
- Modernize dated expressions for contemporary understanding
- Maintain author's literary style and tone
- Keep all proper nouns unchanged

MODERNIZATION FOCUS:
- "motor-car" → "car"
- "telephone" → "phone"
- Outdated social attitudes → contemporary phrasing
- Victorian formalities → modern conversational tone

Return ONLY the modernized text, no explanations.
`;
```

### Step 3: Simplification Script (GPT-5 Enhanced)
**File: `scripts/simplify-{book-name}.js`**

**Critical GPT-5 Fixes:**
```javascript
// 1. JSON Output Format
const systemPrompt = `
CRITICAL: Return ONLY a JSON array of exactly ${chunk.length} strings.
Format: ["sentence 1", "sentence 2", "sentence 3", ...]
`;

// 2. Retry Logic with Max Attempts
let attempt = 0;
const maxAttempts = 3;
while (attempt < maxAttempts && !simplifiedSentenceTexts) {
  attempt++;
  // ... API call
}

// 3. Auto-correction for Final Attempt
if (attempt === maxAttempts) {
  const correctedSentences = autoCorrectSentenceCount(parsedSentences, chunk.length);
  simplifiedSentenceTexts = correctedSentences.map((text, idx) => ({
    sentenceIndex: idx,
    text: text.trim()
  }));
}

// 4. Robust Extraction Function
function extractSentencesFromText(responseText) {
  // Strategy 1: Try JSON parse
  try {
    const parsed = JSON.parse(responseText.trim());
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}

  // Strategy 2: Extract JSON from text
  const jsonMatch = responseText.match(/\[(.*?)\]/s);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {}
  }

  // Strategy 3: Split on sentence endings
  return responseText.split(/[.!?]+/).filter(s => s.length > 10);
}
```

**CEFR Level Guidelines:**
```javascript
const guidelines = {
  'A2': `- Use the most common 1200-1500 words
         - Present and simple past tense
         - Short sentences (8-12 words average)
         - Simple connecting words (and, but, because)
         - Explain cultural references simply`,
  'B1': `- Use common 2000-2500 words
         - All basic tenses, some conditional
         - Medium sentences (10-15 words average)
         - Basic cultural references explained`
};
```

### Step 4: Audio Bundle Generation
**File: `scripts/generate-{book-name}-bundles.js`**

**Pilot Mode Implementation:**
```javascript
class AudioBundleGenerator {
  constructor() {
    this.isPilot = process.argv.includes('--pilot');
    this.maxBundles = this.isPilot ? 20 : Infinity;
  }

  async generateBundles() {
    if (this.isPilot) {
      console.log('🧪 PILOT MODE: Generating first 20 bundles only (~$1 cost)');
    }

    // Resume capability
    const existingBundles = await this.getExistingBundles();
    const bundlesToProcess = bundles.filter(b => !existingBundles.includes(b.index));

    console.log(`📊 Will process ${bundlesToProcess.length} new bundles`);
  }
}
```

**ElevenLabs Integration:**
```javascript
const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOICE_ID, {
  method: 'POST',
  headers: {
    'Accept': 'audio/mpeg',
    'Content-Type': 'application/json',
    'xi-api-key': ELEVENLABS_API_KEY
  },
  body: JSON.stringify({
    text: bundle.text,
    model_id: 'eleven_monolingual_v1',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.1,
      use_speaker_boost: true
    }
  })
});
```

**Database Storage (BookChunk Schema):**
```javascript
await prisma.bookChunk.upsert({
  where: {
    bookId_cefrLevel_chunkIndex: {
      bookId: BOOK_ID,
      cefrLevel: CEFR_LEVEL,
      chunkIndex: bundle.index
    }
  },
  create: {
    bookId: BOOK_ID,
    cefrLevel: CEFR_LEVEL,
    chunkIndex: bundle.index,
    chunkText: bundle.sentences.join(' '),
    wordCount: bundle.wordCount,
    audioFilePath: uploadData.path,
    audioProvider: 'elevenlabs',
    audioVoiceId: VOICE_ID,
    isSimplified: true
  }
});
```

### Step 5: Reconciliation Script
**File: `scripts/reconcile-{book-name}-orphans.js`**

Handles orphaned files (audio exists but no DB record):
```javascript
// 1. Find orphans
const storageFiles = await this.getStorageFiles();
const existingChunks = await this.getExistingChunks();
const orphans = storageFiles.filter(file => !existingChunks.includes(file.bundleIndex));

// 2. Verify integrity
const isValid = await this.verifyAudioFile(orphan);

// 3. Create DB records with upsert
await prisma.bookChunk.upsert({...});
```

## Database Schema

### BookChunk Table (Primary)
```prisma
model BookChunk {
  id           String   @id @default(cuid())
  bookId       String   @map("book_id")
  cefrLevel    String   @map("cefr_level")
  chunkIndex   Int      @map("chunk_index")
  chunkText    String   @map("chunk_text")
  wordCount    Int      @map("word_count")
  isSimplified Boolean  @default(false)

  // Audio fields
  audioFilePath String?  @map("audio_file_path")
  audioProvider String?  @map("audio_provider")
  audioVoiceId  String?  @map("audio_voice_id")

  @@unique([bookId, cefrLevel, chunkIndex])
}
```

### BookContent Table (Metadata)
```prisma
model BookContent {
  bookId      String @id @map("book_id")
  title       String
  author      String
  fullText    String
  era         String
  wordCount   Int    @map("word_count")
  totalChunks Int    @map("total_chunks")
}
```

## API Integration

### Real Bundles API Update
**File: `app/api/test-book/real-bundles/route.ts`**

**BookChunk Support:**
```javascript
// Try new BookChunk architecture first
const bookChunks = await prisma.bookChunk.findMany({
  where: {
    bookId: bookId,
    cefrLevel: level.toUpperCase(),
    audioFilePath: { not: null }
  },
  orderBy: { chunkIndex: 'asc' }
});

if (bookChunks && bookChunks.length > 0) {
  // Convert to bundle format
  bundleAssets = bookChunks.map(chunk => {
    const audioUrl = supabase.storage
      .from('audio-files')
      .getPublicUrl(chunk.audioFilePath!)
      .data.publicUrl;

    const sentences = chunk.chunkText.split(/(?<=[.!?])\s+/).filter(s => s.trim());

    return {
      book_id: bookId,
      audio_url: audioUrl,
      word_timings: sentences.slice(0, 4).map((text, idx) => {
        const words = text.trim().split(/\s+/).length;
        const duration = Math.max(words * 0.4, 2.0);
        const startTime = idx === 0 ? 0 : /* cumulative calculation */;

        return {
          sentenceId: `${bookId}-${chunk.chunkIndex}-${idx}`,
          sentenceIndex: chunk.chunkIndex * 4 + idx,
          text: text.trim(),
          startTime: startTime,
          endTime: startTime + duration,
          wordTimings: []
        };
      })
    };
  });
}
```

## Frontend Integration

### Featured Books Configuration
**File: `app/featured-books/page.tsx`**

**Book Registration:**
```javascript
const FEATURED_BOOKS = [
  {
    id: 'book-name-level',
    title: 'Book Title',
    author: 'Author Name',
    description: 'Description with sentence/bundle count',
    sentences: 3605,
    bundles: 902,
    gradient: 'from-green-500 to-teal-600',
    abbreviation: 'BT'
  }
];
```

**Chapter Structure:**
```javascript
const BOOK_CHAPTERS = [
  {
    chapterNumber: 1,
    title: "Chapter Title",
    startSentence: 0,
    endSentence: 379,
    startBundle: 0,
    endBundle: 94
  }
  // ... more chapters
];
```

**Audio Manager Configuration:**
```javascript
// TTS timing fix
const audioProvider = data?.audioType || 'elevenlabs';
const isTTS = audioProvider === 'elevenlabs' || bookId.includes('tts');
const leadMs = isTTS ? -500 : 500; // Negative for TTS to highlight earlier

const audioManager = new BundleAudioManager({
  highlightLeadMs: leadMs,
  onSentenceStart: (sentence) => {
    setCurrentSentenceIndex(sentence.sentenceIndex);
  }
});
```

## Troubleshooting Guide

### Common Issues & Solutions

**1. Sentence Count Mismatch**
```
Error: Expected 10 sentences, got 7
Solution: GPT-5 fixes implemented - auto-correction in final attempt
```

**2. Cache Path Issues**
```
Error: Cache persists after deletion
Solution: Use absolute paths anchored to PROJECT_ROOT
```

**3. Rate Limiting**
```
Error: 429 Too Many Requests
Solution: Resume capability handles gaps, re-run script to fill
```

**4. Database Schema Mismatch**
```
Error: Field 'content' doesn't exist
Solution: Use 'chunkText' for BookChunk table
```

**5. Orphaned Files**
```
Error: Audio exists but no DB record
Solution: Run reconciliation script to sync
```

**6. Highlighting Lag**
```
Error: Text highlights behind audio
Solution: Set negative leadMs (-500) for TTS audio
```

## Lessons Learned

### Critical Mistakes Made
1. **No retry limits** → infinite loops on API errors
2. **No resume capability** → money lost on failures
3. **Schema assumptions** → wrong field names
4. **No pilot testing** → went straight to full generation
5. **Relative paths** → cache persistence issues

### GPT-5 Validated Solutions
1. **JSON output format** prevents parsing errors
2. **3-attempt maximum** with auto-correction
3. **Pilot mode (20 bundles)** for $1 testing
4. **Absolute path resolution** for reliability
5. **Upsert operations** prevent duplicates

### Best Practices Established
1. **Always start with pilot mode** (`--pilot` flag)
2. **Implement resume from day one** (check existing bundles)
3. **Use content hashing** for version control
4. **Plan for rate limits** (delays + error handling)
5. **Verify API compatibility** before bulk operations
6. **Test timing synchronization** early in process

## Cost Analysis

### Proven Costs (ElevenLabs Creator Plan)
- **Sleepy Hollow:** 325 sentences → ~$8
- **Great Gatsby:** 3,605 sentences → ~$35
- **Average:** ~$0.01 per sentence

### Optimization Strategies
- Use pilot mode for testing ($1)
- Resume capability prevents re-generation
- Batch processing with delays
- Cache everything aggressively

## Next Book Implementation Checklist

### Pre-Implementation
- [ ] Create book ID format: `book-name-level`
- [ ] Set up chapter structure (4-9 chapters recommended)
- [ ] Choose CEFR level and voice
- [ ] Estimate costs (sentences × $0.01)

### Implementation Steps
1. [ ] Run fetch script with chapter detection
2. [ ] Run modernization with `--fresh` if needed
3. [ ] Run simplification with GPT-5 safeguards
4. [ ] **ALWAYS run pilot first** (`--pilot` flag)
5. [ ] Run full bundle generation
6. [ ] Run reconciliation if needed
7. [ ] Add to Featured Books with chapters
8. [ ] Test highlighting and audio sync

### Validation Steps
- [ ] Verify sentence count matches (no gaps)
- [ ] Test audio playback and highlighting
- [ ] Check chapter progression works
- [ ] Confirm all 902 bundles in database
- [ ] Test resume capability

## File Templates

### Quick Start Commands
```bash
# 1. Fetch
node scripts/fetch-book-name.js

# 2. Modernize
node scripts/modernize-book-name.js --fresh

# 3. Simplify
node scripts/simplify-book-name.js A2

# 4. Generate (PILOT FIRST!)
node scripts/generate-book-name-bundles.js --pilot

# 5. Generate Full
node scripts/generate-book-name-bundles.js

# 6. Reconcile (if needed)
node scripts/reconcile-book-name-orphans.js
```

This guide consolidates all lessons learned and provides a bulletproof process for future audiobook implementations. The GPT-5 validated safeguards ensure reliable, cost-effective generation at scale.