# MASTER MISTAKES PREVENTION GUIDE

## 🎯 EXECUTIVE SUMMARY - READ FIRST

**MISSION**: Achieve Speechify and Netflix-level audiobook quality with zero debugging time and minimal cost.

**PROVEN SUCCESS FORMULA**: This guide documents the exact process that created perfect implementations like Lady with the Dog and The Dead A1. Following these steps meticulously prevents hours of debugging and wasted API calls.

### 🚀 CRITICAL SUCCESS REQUIREMENTS

**MANDATORY FOR ALL NEW IMPLEMENTATIONS:**

1. **Solution 1 is STANDARD** - Every new book MUST use:
   - ✅ Measured actual audio duration (ffprobe during generation)
   - ✅ Proportional sentence timing (word ratio-based)
   - ✅ Cached metadata (audioDurationMetadata JSONB field)
   - ✅ Result: Perfect sync + 2-3 second loads (not 45+ seconds)

2. **Phase 4.5 Frontend Integration** - Every book MUST include:
   - ✅ BOOK_API_MAPPINGS configuration in frontend
   - ✅ Relative audio paths (not full URLs)
   - ✅ Original sentence indices (no double-offset)
   - ✅ Result: No "Level not available" errors + working audio

3. **Enhanced Timing v3 MANDATORY** - All audio generation MUST use:
   - ✅ Character-count proportion (not word-count)
   - ✅ Punctuation penalties: commas (150ms), semicolons (250ms), colons (200ms), em-dashes (180ms), ellipses (120ms)
   - ✅ Pause-budget-first approach (subtract pauses before distributing remaining time)
   - ✅ Renormalization to ensure sum equals measured duration exactly
   - ✅ Safeguards: max 600ms penalty/sentence, min 250ms duration, overflow handling
   - ✅ Result: Perfect sync for complex Victorian sentences (30-50 words, 4+ commas)
   - ❌ NEVER use simple word-count proportion (breaks on B1+ complexity with 15-20 word sentences)
   - 📚 See: `docs/AUDIO_SYNC_IMPLEMENTATION_GUIDE.md` lines 194-238 for technical implementation
   - 📊 Proven: A1/A2 perfect with word-count, B1/C1/C2 require Enhanced Timing v3

4. **Zero-Estimation Policy** - FORBIDDEN:
   - ❌ Estimated audio durations
   - ❌ API-time ffprobe measurement
   - ❌ Fallback to timing formulas
   - ❌ Full URL storage in database

### 📊 SUCCESS METRICS (Netflix/Speechify Quality)

- **Load Time**: 2-3 seconds (not 45+ seconds)
- **Sync Quality**: Perfect sentence highlighting with zero lag/drift
- **Audio Quality**: ElevenLabs + proven voice settings (speed 0.90)
- **User Experience**: Seamless playback, instant chapter navigation
- **Mobile Performance**: <100MB memory usage

### ⚠️ COST PREVENTION

**Following this guide prevents:**
- Hours of debugging frontend integration issues
- Wasted ElevenLabs API calls from regeneration
- Audio sync problems requiring expensive fixes
- Load time issues causing poor user experience

**Proven ROI**: Lady with the Dog + The Dead implementations = zero debugging time, perfect results.

## 🔄 MANDATORY STEP-BY-STEP WORKFLOW

**CRITICAL**: Based on The Dead A2 implementation experience, attempting all phases at once causes costly mistakes. **ALWAYS follow this workflow:**

### Step-by-Step Implementation Protocol:
1. **Read One Phase Completely** - Study all details, requirements, and validation steps
2. **Agent Implementation** - Claude implements that single phase following exact specifications
3. **User Validation** - User confirms phase completion and gives explicit "go ahead"
4. **Next Phase** - Only proceed to next phase after explicit approval

### Why This Prevents Mistakes:
- **Cost Prevention**: Avoids expensive API regeneration from missed requirements
- **Quality Assurance**: Each phase validated before building on it
- **Error Isolation**: Problems caught immediately, not after multiple phases
- **Attention to Detail**: Prevents rushing through critical configurations

### Examples of Phase-by-Phase Success:
- **Phase 1**: Validated script support for A2 + Daniel voice mapping → Go ahead
- **Phase 3**: Confirmed 113 bundles generated with Solution 1 → Go ahead
- **Phase 4.5**: Fixed multiLevelBooks array for clickable buttons → Complete

**NEVER attempt multiple phases simultaneously - this workflow is now MANDATORY for all implementations.**

---

**Purpose**: Consolidated prevention strategies from all audiobook implementations to avoid costly mistakes and ensure successful book generation.

**Sources**: Pipeline documentation, Lessons Learned files, Jekyll Hyde implementation, Christmas Carol debugging, Jane Eyre scaling, Sleepy Hollow success patterns, Lady with the Dog Solution 1, and The Dead A1 frontend integration fixes.

---

## 📋 COMPLETE BOOK IMPLEMENTATION CHECKLIST

**Follow this exact order for every new book implementation:**

### Phase 0: System Validation (MANDATORY FIRST)
```bash
# ✅ 0. System Readiness Check
node scripts/validate-system.js
# - Test all API connections (Claude, ElevenLabs, Pinecone, Supabase)
# - Check storage quotas and available disk space
# - Verify network connectivity and speed
# - Validate all environment variables and API keys
# - Estimate total cost and require user confirmation
# - Check system resources (RAM >4GB, disk >1GB free)
# - Verify Project Gutenberg book accessibility
# - STOP HERE if any validation fails
```

### Phase 1: Pre-Implementation Setup
```bash
# ✅ 1. Environment & Process Check
ps aux | grep -E "(generate|simplify|modernize)" | grep -v grep  # Kill any conflicts
source .env.local                                                # Load environment
npx prisma db pull                                              # Verify database schema

# ✅ 2. Script Level Validation (MANDATORY FIRST - prevents runtime failures)
# BEFORE running any scripts, manually inspect the code to verify:
# For simplification scripts (simplify-[book-name].js):
# - VALID_LEVELS array includes target level: const VALID_LEVELS = ['A1', 'A2', 'B1'];
# - AI guidelines exist for target level: A1_GUIDELINES, A2_GUIDELINES, B1_GUIDELINES
# - Word count validation includes target level: A1: 6-12 words, A2: 8-15 words, B1: 12-25 words
#
# For bundle generation scripts (generate-[book-name]-bundles.js):
# - VALID_LEVELS array includes target level: const VALID_LEVELS = ['A1', 'A2', 'B1'];
# - Voice ID constants are defined: SARAH_VOICE_ID, DANIEL_VOICE_ID
# - getVoiceForLevel() function maps all levels: A1 → Sarah, A2/B1 → Daniel
# - No hardcoded VOICE_ID references (search for "VOICE_ID" not in getVoiceForLevel())
# - SOLUTION 1 REQUIREMENTS (MANDATORY):
#   * Script MUST include ffprobe duration measurement
#   * Script MUST calculate proportional sentence timings
#   * Script MUST cache audioDurationMetadata in database
#   * Script MUST store relative audio paths (not full URLs)
#   * Script MUST use timing.sentenceIndex from metadata (no double-offset)
#
# For API endpoints:
# - Check /api/[book-name]-[level]/bundles/route.ts exists for target level
# - Verify book ID validation includes both formats: 'book-name' and 'book-name-level'

# ✅ 3. Project Planning
# - Choose book ID format: "book-name-level" (e.g., "gift-of-the-magi")
# - Select CEFR level: A1, A2, B1 (start with A1 for classics)
# - Choose voice: Use proven M1 settings (speed 0.90 + eleven_monolingual_v1)
# - Estimate cost: sentences × $0.01 for audio generation
# - Plan chapter structure: 4-8 chapters for optimal UX
```

### Phase 2: Text Acquisition & Processing
```bash
# ✅ 4. Fetch Original Text
node scripts/fetch-[book-name].js
# - Extract between specific Project Gutenberg markers
# - Save to cache with proper content boundaries
# - Verify sentence count and text quality

# ✅ 5. Chapter/Structure Detection (BEFORE simplification)
node scripts/detect-[book-name]-chapters.js
# - NOVELS/BOOKS: Run GPT-5's 3-pass hybrid detection system
#   * Generate era-appropriate chapter titles (no spoilers)
#   * Ensure 100% sentence coverage with no gaps
#   * Target 5-12 chapters with balanced lengths
# - SHORT STORIES: Plan thematic headings for visual breaks
#   * "The Party," "The Loss," "The Truth" (for emotional flow)
#   * 3-5 sections maximum for stories under 30 minutes

# ✅ 6. Text Modernization (Victorian/Classical only)
node scripts/modernize-[book-name].js --fresh
# - Separate step from simplification
# - Preserve story meaning 100%
# - Update archaic language only

# ✅ 7. Text Simplification (CRITICAL: Check script level validation first!)
node scripts/simplify-[book-name].js [LEVEL]
# Example commands: node scripts/simplify-the-necklace.js A1
# BEFORE RUNNING: Verify script supports the target level
# - Check script has A1/A2/B1 level validation arrays
# - Verify voice selection logic includes target level
# - Confirm AI guidelines exist for target level
#
# ⚠️ A1 SPECIFIC VALIDATIONS (learned from A1 implementation issues):
# - Verify A1 is in VALID_LEVELS array: ['A1', 'A2', 'B1']
# - Check getVoiceForLevel() function supports A1 → Sarah voice
# - Confirm A1_GUIDELINES exist with 12-word sentence limits
# - Validate script has A1 word count validation (6-12 words)
#
# - Maintain exact 1:1 sentence count mapping (CRITICAL)
# - Generate compound sentences for natural flow (NOT micro-sentences)
#   * A1: 6-12 words average with simple connectors "and", "but", "when"
#   * A2: 8-15 words average with connectors "and", "but", "so", "then"
#   * B1: 12-25 words average with connectors "however", "meanwhile", "therefore"
#   * AVOID: "He is tall. He walks fast. He goes home." (robotic 4-word micro-sentences)
#   * CORRECT A1: "He is tall and walks fast to his home." (natural 9 words)
#   * CORRECT A2: "He is tall and walks fast, then goes home because he is tired." (natural 13 words)
#   * CORRECT B1: "He is tall and walks fast; however, he goes home because he feels tired after work." (natural 16 words)
# - ENFORCE SENTENCE LENGTH LIMITS to prevent highlighting issues:
#   * A1: Maximum 12 words per sentence (add to AI prompt)
#   * A2: Maximum 15 words per sentence (add to AI prompt)
#   * B1: Maximum 25 words per sentence (add to AI prompt)
#   * Include in prompt: "Each sentence should express one complete thought"
#   * Include in prompt: "Avoid semicolons - use periods instead"
# - Preserve punctuation for proper formatting
# - Cache results after every API batch
# - Validate natural reading flow before proceeding
#
# ⚠️ AI SENTENCE COUNT ALIGNMENT ISSUE (GPT-5 SOLUTION):
# PROBLEM: AI returns wrong sentence count (e.g., 11 instead of 10), breaking 1:1 mapping
# SOLUTION: Implement structured prompting + auto-repair system:
#   1. Use JSON format with IDs: [{"id":"s1","text":"..."}, {"id":"s2","text":"..."}]
#   2. Set temperature=0, top_p=0 for deterministic output
#   3. Add auto-repair: merge shortest adjacent sentences if too many, split longest at punctuation if too few
#   4. Include in simplification scripts for production reliability
#   5. This prevents costly regeneration and maintains perfect audio-text sync
```

### Phase 3: Audio & Bundle Generation
```bash
# ✅ 8. Audio Generation with MANDATORY SOLUTION 1 (PILOT FIRST!)
# CRITICAL: Solution 1 is now REQUIRED for all new implementations
# End Result: Perfect audio-text sync + instant loading (2-3 seconds vs 45+ seconds)

# MANDATORY SETUP (required for all new books):
node scripts/add-audio-metadata-column.js  # Add JSONB field to database
brew install ffmpeg                         # Install ffprobe for measurements

# GENERATION WITH SOLUTION 1 (MANDATORY):
node scripts/generate-[book-name]-bundles.js [LEVEL] --pilot
# Example: node scripts/generate-necklace-bundles.js A1 --pilot

# ⚠️ CRITICAL FFPROBE IMPLEMENTATION (learned from The Necklace A1):
# For ES modules (import syntax), ffprobe measurement requires:
#   1. Import execSync at top: import { execSync } from 'child_process';
#   2. Save audio buffer to temp file first (ffprobe cannot read remote URLs):
#      const tempFile = path.join(process.cwd(), 'temp', `bundle_${index}_temp.mp3`);
#      fs.writeFileSync(tempFile, Buffer.from(audioBuffer));
#   3. Measure the local file:
#      const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tempFile}"`;
#      const result = execSync(command, { encoding: 'utf-8' }).trim();
#      const measuredDuration = parseFloat(result);
#   4. Clean up temp file after measurement:
#      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
# This prevents "require is not defined" errors and ensures accurate measurement

# ⚠️ ELEVENLABS API RELIABILITY (learned from Daniel/Sarah voice failures):
# ElevenLabs API can fail due to rate limits, quota exceeded, network timeouts, or invalid voice IDs
# MANDATORY: Implement robust retry logic in all generation scripts:
#   1. Voice ID validation before requests:
#      const VALIDATED_VOICES = {
#        'daniel': 'onwK4e9ZLuTAKqWW03F9',  // British deep news presenter
#        'sarah': 'EXAVITQu4vr4xnSDxMaL'   // American soft news
#      };
#   2. Retry with exponential backoff (3 attempts minimum):
#      for (let attempt = 1; attempt <= 3; attempt++) {
#        try { /* TTS API call */ }
#        catch (error) {
#          if (attempt === 3) throw error;
#          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
#        }
#      }
#   3. API status validation before processing batches:
#      Check ElevenLabs quota and rate limits before starting generation
#   4. Graceful degradation: If one voice fails, continue with working voice
# This prevents costly regeneration and ensures reliable audio production

# ⚠️ MANDATORY TTS PAYLOAD VERIFICATION (learned from "invisible sentences" bug):
# Add to generation script BEFORE calling TTS API:
#   const textHash = crypto.createHash('sha256').update(bundleText).digest('hex').substring(0, 16);
#   const sentenceCount = bundle.sentences.length; // ✅ Use array count (GPT-5 recommendation)
#   console.log(`TTS Input: "${bundleText}"`);
#   console.log(`Hash: ${textHash}, Sentences: ${sentenceCount}`);
#   // ✅ FLEXIBLE BUNDLE SIZE (learned from The Dead A1 generation):
#   const expectedSentences = bundle.index === bundles.length - 1 ? [3, 4] : [4];
#   if (!expectedSentences.includes(bundle.sentences.length)) {
#     throw new Error(`Bundle ${bundle.index}: Expected ${expectedSentences.join(' or ')} sentences, got ${bundle.sentences.length}`);
#   }
# This prevents TTS from receiving extra sentences that cause "invisible audio" issues
#
# ⚠️ CRITICAL LEARNING: FLEXIBLE FINAL BUNDLE SIZES (The Dead A1 case):
# Problem: 451 sentences ÷ 4 = 112.75, leaving final bundle with only 3 sentences
# Solution: Allow 3-4 sentences in final bundle to prevent generation failures
# Implementation: Check if bundle.index === bundles.length - 1 for flexible validation
# This prevents costly regeneration when sentence counts don't divide evenly by 4
#
# ⚠️ SENTENCE BOUNDARY PROTECTION (learned from title abbreviation bugs):
# NEVER re-split bundle text - use sentence array as single source of truth:
#   const bundleText = bundle.sentences.map(s => s.text).join(' '); // ✅ Safe joining
#   const sentenceCount = bundle.sentences.length; // ✅ Use array count, not regex
# AVOID: bundleText.split(/[.!?]+/) // ❌ Breaks on Mr./Mrs./Dr./St./etc.
# This prevents "Mr. Smith", "Dr. Jones", "St. John" from creating false sentence boundaries
# The sentence array is authoritative - TTS payload must match exactly what API displays
#
# ⚠️ MANDATORY: All generation scripts MUST include Solution 1:
# 1. Generate audio via ElevenLabs TTS
# 2. Measure actual duration with ffprobe immediately after upload
# 3. Calculate proportional sentence timings based on word ratios
# 4. Cache everything in audioDurationMetadata JSONB field
# 5. Store relative paths (not full URLs) in audioFilePath
#
# TEMPLATE for generation script (MANDATORY):
# const measuredDuration = getAudioDuration(tempFile);  // ffprobe measurement
# const sentenceTimings = bundle.sentences.map(sentence => {
#   const wordRatio = sentence.wordCount / totalWords;
#   const duration = measuredDuration * wordRatio;
#   const startTime = currentTime;
#   const endTime = currentTime + duration;
#   currentTime = endTime;
#   return {
#     sentenceIndex: sentence.sentenceIndex,
#     text: sentence.text,
#     startTime: parseFloat(startTime.toFixed(3)),
#     endTime: parseFloat(endTime.toFixed(3)),
#     duration: parseFloat(duration.toFixed(3))
#   };
# });
# const audioDurationMetadata = {
#   version: 1,
#   measuredDuration: measuredDuration,
#   sentenceTimings: sentenceTimings,
#   measuredAt: new Date().toISOString(),
#   method: 'ffprobe-proportional'
# };
# await prisma.bookChunk.create({
#   data: {
#     audioFilePath: filePath,  // Relative path only
#     audioDurationMetadata: audioDurationMetadata  // Solution 1 cached data
#   }
# });
#
# SOLUTION 1 BENEFITS (now standard):
# - First load: Measures once during generation
# - All subsequent loads: 2-3 seconds (uses cached data)
# - Perfect audio-text sync (no lag/drift)
# - No more 45-second waits or API-time ffprobe calls
#
# FOR EXISTING BOOKS (backfill):
node scripts/backfill-audio-durations.js
# - Measures all existing audio files
# - Populates audioDurationMetadata for past books
# - Run once per book, then fast forever
# - Safety buffer: 0.15-0.20s per sentence (not 0.12s)
# - Length penalty: +0.03s per word for sentences over 12 words
# - Always scale by actual/estimated ratio when available
#
# SOLUTION 1 IS NOW STANDARD: Always measure, never estimate
# - This eliminates audio cutoffs and sync issues permanently
# - Works with existing bundle architecture (4 sentences per bundle)
# - Each sentence gets exact start/end times from real audio
# - MANDATORY for all new books (Lady with the Dog + The Dead proven success)
#
# TROUBLESHOOTING: For existing books with sync issues:
# node scripts/measure-audio-durations.js [book-name] [level]
# - Analyzes existing audio files and logs exact timings
# - Use this data to fix problematic books manually
# - Validates audio quality before deploying new books

# ✅ 9. Bundle Architecture Validation
# - Verify 4-sentence bundle structure
# - Check text-audio alignment perfection
# - Validate bundle sequence (0, 1, 2... no gaps)
# - Test resume capability
```

### Phase 4: API & Database Integration
```bash
# ✅ 10. API Endpoint Creation (SOLUTION 1 CACHED DATA ONLY!)
# Create /api/[book-name]/bundles/route.ts
# MANDATORY: APIs must use cached audioDurationMetadata, never estimate
#
# ```typescript
# const chunks = await prisma.bookChunk.findMany({
#   where: { bookId, cefrLevel },
#   select: {
#     chunkText: true,
#     audioFilePath: true,
#     audioDurationMetadata: true  // ← REQUIRED
#   }
# });
#
# REQUIRED API pattern using Solution 1 (no fallbacks to estimation):
# if (chunk.audioDurationMetadata && chunk.audioDurationMetadata.sentenceTimings) {
#   // Use cached Solution 1 data (instant 2-3 second load)
#   const metadata = chunk.audioDurationMetadata;
#   totalDuration = metadata.measuredDuration;
#   sentenceTimings = metadata.sentenceTimings.map(timing => ({
#     sentenceId: `s${timing.sentenceIndex}`,
#     sentenceIndex: timing.sentenceIndex,  // Use original index (no double-offset)
#     text: timing.text,
#     startTime: timing.startTime,
#     endTime: timing.endTime
#   }));
# } else {
#   throw new Error('Missing audioDurationMetadata - regenerate bundles with Solution 1');
# }
# // NO FALLBACKS TO ESTIMATION - Solution 1 is mandatory
# ```

# ✅ 11. Database Structure Creation
# - Create Book record
# - Create BookContent record
# - Verify BookChunks exist (handled by bundle generation)
# - Test complete database relationships
```

### Phase 4.5: 🔗 Frontend API Integration Validation (CRITICAL - PREVENTS COSTLY DEBUGGING)

⚠️ **LEARNED FROM THE DEAD A1 IMPLEMENTATION: Hours wasted on frontend integration issues**

```bash
# ✅ 12. Frontend API Endpoint Mapping (MANDATORY VALIDATION)
# PROBLEM: "Level A1 not available for this book" despite working API
# CAUSE: Missing BOOK_API_MAPPINGS configuration in frontend
# COST: Hours of debugging + wasted API calls

# BEFORE TESTING: Verify frontend configuration in app/featured-books/page.tsx
# Location 1: Add to BOOK_API_MAPPINGS object (around line 227):
# 'your-book-id': {
#   'A1': '/api/your-book-id-a1/bundles',
#   'A2': '/api/your-book-id-a2/bundles',
#   'B1': '/api/your-book-id-b1/bundles'
# },
#
# Location 2: Add to BOOK_DEFAULT_LEVELS object (around line 245):
# 'your-book-id': 'A1',  // Default level
#
# Location 3: Add to multiLevelBooks array (around line 822) - CRITICAL FOR LEVEL BUTTONS:
# 'your-book-id': ['A1', 'A2'], // Must include ALL implemented levels for UI buttons
# SYMPTOM: Level buttons not clickable despite working API
# CAUSE: Missing levels in multiLevelBooks array
#
# ⚠️ VALIDATION TEST: Before any UI testing, run:
node -e "
const BOOK_API_MAPPINGS = { /* copy from frontend */ };
const getBookApiEndpoint = (bookId, level) => {
  if (BOOK_API_MAPPINGS[bookId] && BOOK_API_MAPPINGS[bookId][level]) {
    return BOOK_API_MAPPINGS[bookId][level];
  }
  return '/api/test-book/real-bundles'; // Wrong endpoint
};
console.log('API endpoint for your-book A1:', getBookApiEndpoint('your-book', 'A1'));
// MUST return: /api/your-book-a1/bundles (not /api/test-book/real-bundles)
"

# ✅ 13. Audio URL Storage Format Consistency (PREVENTS DOUBLE-URL ERRORS)
# PROBLEM: Audio files fail to load with "Failed to load bundle" errors
# CAUSE: Generation script stores full URLs instead of relative paths
# SYMPTOMS: Console errors showing double-domain URLs like:
#   https://domain.com/.../https://domain.com/.../book-name/bundle.mp3

# VALIDATION: Check generation script audioFilePath storage:
# CORRECT (relative path): 'the-dead/A1/EXAVITQu4vr4xnSDxMaL/bundle_0.mp3'
# WRONG (full URL): 'https://domain.supabase.co/storage/.../the-dead/...'

# In generation script, ensure storage uses relative paths:
# await prisma.bookChunk.create({
#   data: {
#     audioFilePath: filePath,  // Relative path only
#     // NOT: audioFilePath: publicUrl  // Full URL causes errors
#   }
# });

# ✅ 14. API Sentence Indexing Verification (PREVENTS OFFSET BUGS)
# PROBLEM: "Bundle not found for sentence 152" when only 153 sentences exist
# CAUSE: API double-adds totalSentencesProcessed to existing sentenceIndex values
# SYMPTOMS: Sentence indices exceed actual total (e.g., 158 when max is 153)

# VALIDATION: Check API route.ts sentence index calculation:
# CORRECT: Use metadata sentenceIndex directly:
# sentenceIndex: timing.sentenceIndex,  // From cached metadata
#
# WRONG: Add offset to existing index:
# sentenceIndex: totalSentencesProcessed + idx,  // Creates double-offset

# VERIFICATION QUERY: Check if indices exceed total sentences:
node -e "
console.log('Testing API sentence indexing...');
fetch('http://localhost:3000/api/your-book-a1/bundles?bookId=your-book&level=A1')
  .then(r => r.json())
  .then(data => {
    const lastBundle = data.bundles[data.bundles.length - 1];
    const highestIndex = Math.max(...lastBundle.sentences.map(s => s.sentenceIndex));
    console.log('Total sentences:', data.totalSentences);
    console.log('Highest sentence index:', highestIndex);
    console.log('Index valid:', highestIndex < data.totalSentences ? '✅' : '❌');
  });
"

# ✅ 15. Audio File Path Resolution Test
# VALIDATION: Test actual audio file accessibility from browser
curl -I "$(node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const url = supabase.storage.from('audio-files').getPublicUrl('your-book/A1/voice-id/bundle_0.mp3').data.publicUrl;
console.log(url);
")"
# Should return: HTTP/2 200 (audio file accessible)
# NOT: HTTP/2 404 (file not found) or malformed URL

# ✅ 16. Complete Frontend Integration Test
# MANDATORY: Test complete user flow before considering implementation complete:
# 1. Open http://localhost:3000/featured-books
# 2. Click on your book
# 3. Select target level (A1/A2/B1)
# 4. Verify book loads without "Level not available" error
# 5. Test audio playback starts correctly
# 6. Verify sentence highlighting works
# 7. Check browser console for any audio loading errors
# 8. Test in incognito mode (clear cache)

# ⚠️ CRITICAL SUCCESS CRITERIA:
# - No "Level X not available" errors
# - Audio plays immediately when clicked
# - Sentence highlighting syncs with audio
# - No console errors about failed audio loads
# - Bundle navigation works smoothly
```

# ✅ 13. Thematic Sections JSON Files (MANDATORY for UI Navigation)
# PROBLEM: Books work but show no chapter headers or navigation
# CAUSE: Missing sections JSON file in cache/ directory
# COST: Poor UX + no thematic navigation

# REQUIRED: Create cache/{book-id}-sections.json with 5 thematic sections:
# Format: cache/the-necklace-sections.json (follow existing pattern)
# - spoiler-free titles ("The Invitation", "The Ball", "The Loss")
# - emotional progression mapping story structure
# - proper sentence/bundle ranges for navigation
# - emotionalTone descriptions for user guidance

# VALIDATION: Check file exists in cache/ directory before building
ls cache/{book-id}-sections.json

# CRITICAL FRONTEND INTEGRATION (added after Lady with Dog/Dead fix):
# 1. Create chapter constants in featured-books/page.tsx:
#    const THE_BOOK_CHAPTERS = [...sections...];
# 2. Add to ChapterPicker conditional logic (3 locations):
#    - selectedBook?.id === 'book-id' ? THE_BOOK_CHAPTERS :
#    - getCurrentChapter() function: } else if (selectedBook.id === 'book-id') { chapters = THE_BOOK_CHAPTERS; }
#    - getBookChapters() function: } else if (selectedBook.id === 'book-id') { return THE_BOOK_CHAPTERS; }
# 3. CRITICAL: Verify book ID matches FEATURED_BOOKS array exactly
#    - Use exact ID from FEATURED_BOOKS (e.g., 'lady-with-dog', not 'the-lady-with-the-dog')
#    - ID mismatch = chapters won't show despite working JSON files

### Phase 5: Display Headers (AFTER audio generation)
```bash
# ✅ 17. Add Display Headers (final presentation step)
# - SHORT STORIES: Add thematic headings for visual flow
#   * "The Party," "The Loss," "The Truth" (emotional progression)
#   * Insert headers at natural story breaks
#   * Keep headers concise and spoiler-free
# - NOVELS/BOOKS: Add chapter headers from Phase 2 detection
#   * "CHAPTER I: Mrs. Rachel Lynde Is Surprised"
#   * Use detected chapter structure
#   * Maintain consistent formatting
# NOTE: Headers are added LAST to avoid affecting AI simplification/audio
```

### Phase 6: Featured Books Integration
```bash
# ✅ 18. UI Integration (6 MANDATORY locations)
# Location 1: Add book to FEATURED_BOOKS array
# Location 2: Add chapter structure (BOOK_NAME_CHAPTERS)
# Location 3: Update getCurrentChapter() function
# Location 4: Update ChapterPicker component
# Location 5: Add to BOOK_DEFAULT_LEVELS
# Location 6: Add API endpoint mapping

# ✅ 19. Chapter Header Display (automatic)
# - Verify chapters appear as headers within text
# - Test chapter navigation dropdown works
# - Confirm chapter jump functionality
```

### Phase 7: Testing & Validation
```bash
# ✅ 20. Complete System Test
npm run dev                                    # Start development server
# - Test Featured Books page loads book correctly
# - Verify text displays with chapter headers
# - Test audio playback and sentence highlighting
# - Confirm chapter navigation works
# - Test in incognito mode (clear cache)

# ✅ 21. Final Validation Checklist
# - [ ] Bundle sequence complete (0, 1, 2... no gaps)
# - [ ] Text-audio alignment perfect (no content mismatches)
# - [ ] Audio files exist and play correctly
# - [ ] Chapter headers display within text
# - [ ] Chapter navigation dropdown functional
# - [ ] Database structure complete (Book + BookContent + BookChunks)
# - [ ] Sentence punctuation preserved properly
# - [ ] Text formatting displays correctly (no wall of text)
```

## 🚨 CRITICAL PREVENTION RULES

**Voice Settings (MANDATORY):**
- **ALWAYS use PRODUCTION_SETTINGS** - Hero Demo enhanced settings (similarity_boost 0.8, style 0.05-0.1)
- **NEVER use eleven_multilingual_v2** - worse clarity despite being "advanced"
- **NEVER use eleven_flash_v2_5** - breaks synchronization
- **NEVER use eleven_turbo_v2_5** - tested Oct 2025, worse quality than v1 (see TURBO_V25_TESTING_RESULTS.md)
- **ALWAYS use eleven_monolingual_v1** - English-focused model for ESL clarity (proven best)
- **NEVER change speed from 0.90** - locked for perfect sync (tested 0.85, 0.80 - no improvement)
- **Reference**: See CURRENT PRODUCTION STANDARD section for exact settings

**System & Validation:**
- **NEVER start without system validation** - run validate-system.js first
- **NEVER proceed without cost confirmation** - expensive API calls add up fast
- **NEVER run multiple scripts simultaneously** - causes database conflicts
- **NEVER skip pilot testing** - always test with 5-10 bundles first
- **NEVER skip chapter UI integration** - chapters without UI are invisible
- **NEVER lose sentence punctuation** - use match() not split() for sentences

**Audio & Timing:**
- **NEVER estimate audio duration** - always measure actual TTS output
- **ALWAYS implement Solution 1** - measured duration + proportional timing + cached metadata (mandatory)
- **NEVER use API-time measurement** - APIs must read cached audioDurationMetadata only
- **NEVER double-add sentence indices** - use original sentenceIndex from cached timings

**Storage & Integration:**
- **NEVER use generic CDN paths** - use book-specific paths to prevent collisions
- **NEVER store full audio URLs in database** - use relative paths to prevent double-URL errors
- **NEVER run script without level validation** - verify A1/A2/B1 support in script code first
- **NEVER assume voice mapping exists** - check getVoiceForLevel() function for target level
- **NEVER skip frontend API mapping validation** - verify BOOK_API_MAPPINGS before testing (Phase 4.5)

---

## 📥 Fetching & Text Preparation Phase

### Gutenberg Text Extraction
```javascript
// CORRECT: Extract between specific markers
const startMarker = 'THE LEGEND OF SLEEPY HOLLOW';
const endMarker = 'RIP VAN WINKLE';
const storyText = fullText.substring(startIndex, endIndex);

// WRONG: Taking entire Project Gutenberg file
const storyText = fullText; // Includes headers, footers, metadata
```

**Prevention Strategies:**
- Always use book-specific start/end markers
- Verify extracted text doesn't include Project Gutenberg metadata
- Save extracted text to cache before processing
- Count sentences in extracted text for validation

### Content Versioning & Hashing
```javascript
// MANDATORY: Generate content hash before audio generation
function generateContentHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
}
const contentHash = generateContentHash(simplifiedText);
console.log(`🔒 Content hash: ${contentHash}`);
```

**Why This Matters:**
- Prevents text drift during audio generation
- Enables version control for regeneration
- Detects accidental text changes that break sync
- Essential for maintaining audio-text harmony

### Chapter Structure Planning
```javascript
// REQUIRED: Manual chapter enhancement for UX
const BOOK_CHAPTERS = [
  { chapterNumber: 1, title: "Story of the Door", startSentence: 0, endSentence: 159 },
  { chapterNumber: 2, title: "Search for Mr. Hyde", startSentence: 160, endSentence: 319 },
  // Must cover all sentences with no gaps
];
```

**Critical Requirements:**
- Chapter titles reflect book structure (Acts/Scenes for plays, thematic for novels)
- No gaps between chapters (chapter N endSentence + 1 = chapter N+1 startSentence)
- Last chapter's endSentence = total sentences - 1
- All 3 navigation locations updated in Featured Books page

---

## 🔄 Modernization Phase (For Victorian/Classical Texts)

### Two-Step Process (NEVER Combine)
```javascript
// CORRECT: Separate modernization from simplification
// Step 1: Modernize archaic language only
// Step 2: Simplify to CEFR level separately

// WRONG: Single-step modernization + simplification
// Causes complexity and poor results
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

### Cache Management
```javascript
// MANDATORY: Cache after every API batch
function saveProgressToCache(sentences) {
  const progressCache = {
    sentences: sentences,
    metadata: {
      bookId: BOOK_ID,
      cefrLevel: CEFR_LEVEL,
      inProgress: true,
      savedAt: new Date().toISOString()
    }
  };
  fs.writeFileSync(CACHE_FILE, JSON.stringify(progressCache, null, 2));
}
```

**Prevention Strategies:**
- Use absolute path resolution: `path.resolve(__dirname, '..')`
- Add CLI flags for control: `--clear-cache`, `--fresh`
- Validate cache before using: check `totalChunks` vs `chunks.length`
- Never lose expensive API work due to poor caching

---

## 📖 Chapter Detection Phase (After Modernization, Before Simplification)

### Critical Implementation Order
**MANDATORY**: Run chapter detection after text fetching/modernization but BEFORE simplification to avoid:
- Inconsistent chapter boundaries across CEFR levels
- Lost narrative structure during text processing
- Manual chapter creation after expensive generation

### 3-Pass Hybrid Detection System (GPT-5 Validated)

#### Pass 1: Heuristics Detection
```javascript
// CORRECT: Detect explicit structural markers
const chapterMarkers = [
  /^CHAPTER [IVXLCDM]+\.?\s*$/i,     // Roman numerals
  /^CHAPTER \d+\.?\s*$/i,            // Arabic numerals
  /^CHAPTER [A-Z]+\.?\s*$/i,         // Word numbers
  /^ACT [IVXLCDM]+/i,               // Play acts
  /^SCENE [IVXLCDM]+/i,             // Play scenes
  /^[A-Z\s]{10,}$/,                 // All-caps lines
  /^\*\*\*+\s*$/,                   // Separator lines
];

// Test coverage: ensure 100% of sentences are assigned to chapters
// Flag: sections <200 words or >3000 words for review
```

#### Pass 2: AI Scene Change Detection
```javascript
// CORRECT: When weak structural markers detected
const sceneChangePrompt = `
Analyze this text for natural chapter breaks. Look for:
- Time jumps ("The next morning", "Three days later")
- Location changes (new settings, travel)
- POV shifts (new character focus)
- Narrative tension drops (end of conflict, resolution)

Return confidence score (0-100) and suggested break points.
Era: ${bookEra} | Length: ${totalSentences} sentences
Target: 5-12 chapters with balanced lengths
`;
```

#### Pass 3: Form-Aware Processing
```javascript
// CORRECT: Literary form-specific handling
const formHandlers = {
  novel: generateChapterTitles,
  play: enforceActSceneStructure,
  novella: createThematicSections,
  shortStory: identifyPsychologicalBeats
};

// Victorian/19th century title generation
const titlePrompt = `
Generate chapter title for this section:
- Style: Victorian era, formal but engaging
- Length: 4-8 words maximum
- Tone: Neutral, no spoilers
- Examples: "The Mysterious Door", "A Midnight Visitor"
- Avoid: modern slang, emotional extremes, plot reveals
`;
```

### Quality Validation Checklist
- **Coverage**: 100% sentences assigned, no overlaps
- **Balance**: No chapter <150 or >2000 words (flag for review)
- **Titles**: Era-appropriate, spoiler-free, <8 words
- **Confidence**: Auto-approve scores ≥80%, manual review <80%

### Database Schema Requirements
```sql
-- MANDATORY: Add before any chapter processing
CREATE TABLE chapters (
  id TEXT PRIMARY KEY,
  bookId TEXT NOT NULL,
  chapterIndex INTEGER NOT NULL,
  title TEXT NOT NULL,
  startSentence INTEGER NOT NULL,
  endSentence INTEGER NOT NULL,
  confidence INTEGER DEFAULT 100,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(bookId, chapterIndex)
);
```

### Pilot Testing Protocol
```bash
# ALWAYS test with short books first (5-10 bundles)
# Validate chapter detection before scaling to full books
# Check UI integration with existing chapter navigation
```

### UI Integration Requirements (MANDATORY)
**After chapter detection, ALWAYS implement UI integration in 3 locations:**

1. **Chapter Structure Definition** (`featured-books/page.tsx`):
```javascript
// Add chapter structure for your book
const YOUR_BOOK_CHAPTERS = [
  {
    chapterNumber: 1,
    title: "Chapter Title Here",
    startSentence: 0,
    endSentence: 19,
    startBundle: 0,
    endBundle: 4
  },
  // ... more chapters
];
```

2. **Chapter Navigation Mapping** (2 locations in same file):
```javascript
// Location 1: getCurrentChapter() function
} else if (selectedBook.id === 'your-book-id') {
  chapters = YOUR_BOOK_CHAPTERS;
} else {

// Location 2: ChapterPicker component
selectedBook?.id === 'your-book-id' ? YOUR_BOOK_CHAPTERS :
```

3. **Chapter Header Display** (automatically works):
```javascript
// Text rendering with headers - implemented universally
const chapters = getBookChapters();
const chapter = chapters.find(ch => ch.startSentence === sentence.sentenceIndex);
if (chapter) {
  // Displays: "Chapter 1: Title" as styled header
}
```

**Critical UI Requirements:**
- Chapter headers appear **within the text** at sentence boundaries
- Chapter navigation dropdown shows all chapters
- Chapter jump functionality works via dropdown selection
- Current chapter highlighting updates during playback

### Common Chapter Detection Mistakes
- **DON'T** run detection after simplification (creates inconsistencies)
- **DON'T** skip confidence scoring (leads to poor title quality)
- **DON'T** ignore literary form (plays need Act/Scene structure)
- **DON'T** generate spoiler titles (ruins reading experience)
- **DON'T** create too many chapters (>15) or too few (<3)
- **DON'T** forget UI integration - chapters without UI integration are invisible to users

---

## ✂️ Text Simplification Phase

### Compound Sentence Generation (Not Micro-Sentences)
```javascript
// CORRECT: Natural compound sentences (11-13 words)
"The man is tall and walks fast, then goes home because he is tired."

// WRONG: Robotic micro-sentences (3-6 words)
"The man is tall. He walks fast. He goes home. He is tired."
```

**A2 Natural Flow Rules:**
- Vary sentence length within 11-13 words (not monotone 4-6 words)
- Use A2-safe connectors: "and", "but", "so", "then", "finally"
- Merge adjacent micro-sentences that form action chains
- Replace repeated subjects with pronouns after first mention
- Maximum 1 connector per 2-3 sentences

### Sentence Count Preservation (MANDATORY)
```javascript
// CRITICAL: Perfect 1:1 sentence mapping for audio harmony
if (simplifiedChunkSentences.length !== chunk.length) {
  console.error(`❌ FAILED: Expected ${chunk.length} sentences, got ${simplifiedChunkSentences.length}`);
  throw new Error('Sentence count must match exactly for perfect audio-text harmony');
}
```

**Why This is Non-Negotiable:**
- Audio files generated per sentence bundle
- Text-audio synchronization requires exact alignment
- Speechify-level experience demands perfect harmony
- Any mismatch breaks continuous reading

### CEFR Level Compliance
```javascript
const guidelines = {
  'A1': `- Use 500-1000 most common words
         - Present and simple past tense only
         - Natural compound sentences (8-12 words average - PROVEN BY MAYA STORY)
         - Simple connectors: "and", "but", "when"
         - No cultural references`,
  'A2': `- Use 1200-1500 most common words
         - Present and simple past tense
         - Natural compound sentences (11-13 words average - COMPOUND FLOW)
         - More connectors: "and", "but", "so", "then", "because"
         - Explain cultural references simply`,
  'B1': `- Use 2000-2500 most common words
         - All basic tenses, some conditional
         - Longer sentences (12-16 words average)
         - Basic cultural references explained`
};
```

### Robust JSON Extraction (GPT-5 Validated)
```javascript
// 3-Strategy extraction to prevent parsing failures
function extractSentencesFromText(responseText) {
  // Strategy 1: Try direct JSON parse
  try {
    const parsed = JSON.parse(responseText.trim());
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}

  // Strategy 2: Extract JSON from text with regex
  const jsonMatch = responseText.match(/\[(.*?)\]/s);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {}
  }

  // Strategy 3: Split on sentence endings as fallback
  return responseText.split(/[.!?]+/).filter(s => s.length > 10);
}
```

### GPT-5 Enhanced Safeguards
```javascript
// 3-attempt maximum with auto-correction
let attempt = 0;
const maxAttempts = 3;
while (attempt < maxAttempts && !simplifiedSentenceTexts) {
  attempt++;

  // API call here

  if (attempt === maxAttempts) {
    // Auto-correction for final attempt
    const correctedSentences = autoCorrectSentenceCount(parsedSentences, chunk.length);
    simplifiedSentenceTexts = correctedSentences.map((text, idx) => ({
      sentenceIndex: idx,
      text: text.trim()
    }));
  }
}
```

---

## 🎵 Audio Generation Phase

**⚠️ CRITICAL: Voice Settings Standard**

**ALL new audiobook implementations MUST use:**
- **Production Settings**: See [CURRENT PRODUCTION STANDARD (October 2025)](#-current-production-standard-october-2025---hero-demo-settings) below
- **Model**: `eleven_monolingual_v1` (NOT multilingual/flash variants)
- **Settings**: Sarah (stability 0.5, similarity_boost 0.8, style 0.05) / Daniel (stability 0.45, similarity_boost 0.8, style 0.1)
- **Reference Script**: `scripts/generate-enhanced-demo-audio.js`

### Universal Timing Formula (CRITICAL - GPT-5 Enhanced)
```javascript
// GPT-5 PROVEN FORMULA: Speed-aware + length penalty + safety tail
function calculateSentenceTiming(words, voice, speed, cefrLevel) {
  // Base timing rates (proven M1 settings)
  const baseSecondsPerWord = voice === 'Sarah' ? 0.30 : 0.40;

  // Speed adjustment (CRITICAL for speed 0.90)
  const adjustedSecondsPerWord = baseSecondsPerWord / speed; // 0.40/0.90 = 0.44s

  // CEFR-specific length penalties for complex sentences
  const lengthPenalties = {
    'A1': words > 12 ? (words - 12) * 0.03 : 0,
    'A2': words > 14 ? (words - 14) * 0.04 : 0,
    'B1': words > 15 ? (words - 15) * 0.05 : 0
  };

  // Safety tail prevents audio cutoffs
  const safetyTail = 0.12; // 120ms buffer

  return words * adjustedSecondsPerWord + lengthPenalties[cefrLevel] + safetyTail;
}

// Example usage:
const duration = calculateSentenceTiming(wordCount, voiceType, 0.90, 'B1');
```

**Voice-Specific Proven Settings:**
- **Daniel**: 0.4s per word (M1 proven: onwK4e9ZLuTAKqWW03F9 + speed 0.90 + eleven_monolingual_v1)
- **Sarah**: 0.30s per word (M1 proven: EXAVITQu4vr4xnSDxMaL + speed 0.90 + eleven_monolingual_v1)
- **Critical**: NEVER use custom timing formulas - only these proven rates
- **Result**: Perfect audio-text synchronization, prevents sentence skipping
- **Validation**: Gift of the Magi A2 confirmed Sarah timing works perfectly

---

## 🎯 **CURRENT PRODUCTION STANDARD (October 2025) - HERO DEMO SETTINGS**

**⚠️ CRITICAL: ALL NEW BOOKS MUST USE THESE SETTINGS - NOT THE M1 DEFAULTS BELOW**

These settings are proven in production through the Interactive Hero Demo and deliver superior audio quality while maintaining perfect synchronization. They supersede the conservative M1 defaults documented below.

### **HERO DEMO ENHANCED SETTINGS (PRODUCTION STANDARD)**

**Use these for ALL new audiobook generation:**

```javascript
// SARAH VOICE - Production Standard (Hero Demo Validated)
const PRODUCTION_SARAH_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL',
  model: 'eleven_monolingual_v1',      // CRITICAL: English-focused model
  speed: 0.90,                         // LOCKED - perfect sync
  voice_settings: {
    stability: 0.5,                    // Clarity for ESL learners
    similarity_boost: 0.8,             // +0.05 from defaults = better presence
    style: 0.05,                       // +0.05 from defaults = subtle sophistication
    use_speaker_boost: true
  }
};

// DANIEL VOICE - Production Standard (Hero Demo Validated)
const PRODUCTION_DANIEL_SETTINGS = {
  voice_id: 'onwK4e9ZLuTAKqWW03F9',
  model: 'eleven_monolingual_v1',      // CRITICAL: English-focused model
  speed: 0.90,                         // LOCKED - perfect sync
  voice_settings: {
    stability: 0.45,                   // Enhanced clarity (GPT-5 validated)
    similarity_boost: 0.8,             // +0.05 from defaults = better presence
    style: 0.1,                        // +0.1 from defaults = natural expressiveness
    use_speaker_boost: true
  }
};
```

### **Why These Settings Are Superior**

**Key Improvements over M1 defaults:**
1. **similarity_boost: 0.8** (vs 0.75) - Maintains voice character, better presence
2. **style: 0.05-0.1** (vs 0.0) - Adds natural expressiveness without over-processing
3. **GPT-5 validated** - Tested and optimized for ESL learner clarity
4. **Production proven** - Live in Hero Demo with positive user feedback

**What was tested and rejected:**
- ❌ `eleven_multilingual_v2` - Worse clarity despite "advanced" features
- ❌ `eleven_flash_v2_5` - Breaks synchronization
- ❌ `eleven_turbo_v2_5` - Tested Oct 2025 with speeds 0.90/0.85/0.80, worse quality than v1
- ❌ Speed adjustments (0.85, 0.80) - Tested Oct 2025, no improvement over 0.90
- ❌ Higher style values (>0.15) - Over-processing, unnatural
- ❌ Lower similarity_boost (<0.75) - Loses voice character

**Why eleven_monolingual_v1 beats "advanced" models:**
- Specialized for English ONLY = superior clarity
- Multilingual models sacrifice clarity for language breadth
- ESL learners need **clarity > contextual awareness**
- Proven perfect sync with speed 0.90

**⚠️ MANDATORY for all new implementations:**
- Use PRODUCTION settings above (NOT M1 defaults below)
- Model: `eleven_monolingual_v1` (NOT multilingual/flash variants)
- Speed: 0.90 (NEVER change)
- Reference implementation: `scripts/generate-enhanced-demo-audio.js`

---

### Maya Story Voice Testing Results (HISTORICAL REFERENCE - M1 BASELINE)

**Test Book**: "The Digital Library" (Maya story) - 3 systematic voice tests

#### M1 Test (BASELINE - Conservative Defaults)
```javascript
// HISTORICAL BASELINE: Daniel voice + speed 0.90 + ElevenLabs defaults
// NOTE: Superseded by PRODUCTION_SETTINGS above (similarity_boost: 0.8, style: 0.05-0.1)
const M1_BASELINE_SETTINGS = {
  voice: 'Daniel' (onwK4e9ZLuTAKqWW03F9),
  model: 'eleven_monolingual_v1',  // ✅ Correct model
  speed: 0.90,  // ✅ Perfect sync
  stability: 0.5,        // ✅ Good clarity
  similarity_boost: 0.75, // ⚠️ Now use 0.8 in production
  style: 0.0,            // ⚠️ Now use 0.05-0.1 in production
  use_speaker_boost: true
};
```

#### M2 Test (Failed - Broken Sync)
- Daniel voice + speed 0.90 + **eleven_flash_v2_5 model**
- **Result**: Better quality but broken synchronization
- **Lesson**: eleven_flash_v2_5 causes timing issues

#### M3 Test (Failed - Christmas Carol Settings)
- Daniel voice + Christmas Carol research settings
- Settings: stability 0.55, style 0.0, speed 0.88, similarity_boost 0.75
- **Result**: Less optimal than M1

**Historical Finding**: M1 established the baseline (speed 0.90 + eleven_monolingual_v1) for perfect synchronization. This baseline was later enhanced with Hero Demo settings (similarity_boost 0.8, style 0.05-0.1) which are now the production standard.

⚠️ **DEPRECATED - Use PRODUCTION_SETTINGS above instead:**
```javascript
// DO NOT USE - Historical reference only
// Use PRODUCTION_SARAH_SETTINGS or PRODUCTION_DANIEL_SETTINGS instead
const DEPRECATED_M1_SETTINGS = {
  speed: 0.90,                    // ✅ Still correct
  model: 'eleven_monolingual_v1', // ✅ Still correct
  stability: 0.5,                 // ✅ Still correct
  similarity_boost: 0.75,         // ❌ Use 0.8 now
  style: 0.0,                     // ❌ Use 0.05-0.1 now
  use_speaker_boost: true
};
```

### Book-Specific CDN Paths (NEVER Generic)
```javascript
// CORRECT: Book-specific paths prevent conflicts
const audioFileName = `${BOOK_ID}/${CEFR_LEVEL}/${voiceId}/bundle_${index}.mp3`;
// Example: "great-gatsby-a2/A2/sarah/bundle_0.mp3"

// WRONG: Generic paths cause audio collisions
const audioFileName = `a2/bundle_${index}.mp3`;
// Romeo & Juliet overwrites Pride & Prejudice audio
```

**Critical Audio Path Collision Issue:**
- Generic CDN paths allow later books to overwrite earlier ones
- Results in Romeo & Juliet audio playing for Pride & Prejudice text
- Must use book-specific path patterns for isolation
- Emergency fix: rename all existing audio with book prefixes

### Clean Audio Generation (No Intro Phrases)
```javascript
// CORRECT: Clean audio without intro phrases
const text = bundle.sentences.join(' ');

// WRONG: Intro phrases break immersion
const text = `Here is the simplified version for ${level}: ${bundle.sentences.join(' ')}`;
```

**Why Clean Audio Matters:**
- Intro phrases create jarring interruptions in continuous reading
- Breaks immersion and sounds robotic
- Speechify-level experience requires seamless narration
- All books generated after January 2025 must follow clean audio standards

### Actual Duration Measurement (Never Estimate)
```javascript
// CORRECT: Measure actual TTS audio duration
const audioBuffer = await generateElevenLabsAudio(text);
const actualDuration = await getAudioDuration(audioBuffer);

// Store actual duration, not estimated
const bundleTimings = calculateBundleTiming(sentences, actualDuration);

// WRONG: Hardcoded or estimated timing
const estimatedDuration = sentences.length * 3.0; // Causes sync issues
```

**Why Measurement is Critical:**
- TTS generates variable duration - estimates cause highlighting lag
- ElevenLabs voices have different pacing patterns
- Perfect synchronization requires measured timing metadata
- Prevents 2-second highlighting delay issues

### Upload Retry Logic (Supabase Rate Limits)
```javascript
// MANDATORY: Retry wrapper for Supabase storage
class SupabaseUploadClient {
  async uploadWithRetry(filePath, buffer, options = {}) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const { data, error } = await this.supabase.storage
          .from('audio-files')
          .upload(filePath, buffer, options);

        if (error) throw error;
        return { data, error: null };

      } catch (error) {
        lastError = error;

        if (attempt === this.maxRetries) break;

        // Exponential backoff with jitter
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          this.maxDelay
        );

        console.log(`⏳ Upload failed (attempt ${attempt + 1}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
```

### Pilot Mode Implementation (ALWAYS Test First)
```javascript
class AudioBundleGenerator {
  constructor() {
    this.isPilot = process.argv.includes('--pilot');
    this.maxBundles = this.isPilot ? 10 : Infinity; // Test with 10 bundles
  }

  async generateBundles() {
    if (this.isPilot) {
      console.log('🧪 PILOT MODE: Generating first 10 bundles only (~$1 cost)');
    }

    // Resume capability
    const existingBundles = await this.getExistingBundles();
    const bundlesToProcess = bundles.filter(b => !existingBundles.includes(b.index));

    console.log(`📊 Will process ${bundlesToProcess.length} new bundles`);
  }
}
```

---

## 🏗️ Bundle Architecture Phase

### Race Condition Prevention (CRITICAL)
```javascript
// ALWAYS check for running processes before starting
async function checkRunningProcesses() {
  try {
    const { stdout } = await execAsync('ps aux | grep -E "(generate|simplify)" | grep -v grep');
    if (stdout.trim()) {
      console.warn('⚠️ WARNING: Other generation/simplification processes detected');
      console.warn('Consider stopping them to prevent race conditions');
      process.exit(1);
    }
  } catch (error) {
    // No other processes found - safe to proceed
  }
}
```

**Race Condition Symptoms:**
- Database constraint violations (duplicate key errors)
- Text-audio content mismatches
- Bundle sequence incomplete with missing data
- Wrong audio content playing for displayed text

### Text-Audio Alignment Verification
```javascript
// CRITICAL: Generate audio from final enhanced text, not cache
// 1. Final text locked with content hash
const contentHash = generateContentHash(finalText);

// 2. Audio generated from locked text
const audioBuffer = await generateAudio(finalText);

// 3. Store original text from bundle metadata for consistency
const bundleText = bundle.sentences.map(s => s.text).join(' ');
```

**Text-Audio Mismatch Prevention:**
- Never change simplified text after audio generation
- Always restore original text from bundle metadata if needed
- Generate audio directly from database text, not cache files
- Use content hashing to detect text drift

### Bundle Sequence Validation
```javascript
// Validate complete bundle sequence (no gaps)
async function validateBundleSequence(bookId, level) {
  const bundles = await prisma.bookChunk.findMany({
    where: { bookId, cefrLevel: level },
    orderBy: { chunkIndex: 'asc' }
  });

  // Check for sequence gaps
  for (let i = 0; i < bundles.length; i++) {
    if (bundles[i].chunkIndex !== i) {
      throw new Error(`Bundle sequence gap: expected ${i}, found ${bundles[i].chunkIndex}`);
    }
  }

  console.log(`✅ Bundle sequence validated: 0-${bundles.length - 1}`);
}
```

### Memory Management Patterns
```javascript
// Bundle architecture memory limits
const MEMORY_LIMITS = {
  mobile: 100 * 1024 * 1024,      // 100MB for 2GB devices
  desktop: 500 * 1024 * 1024,     // 500MB for desktop
  bundleSize: 4,                   // 4 sentences per bundle
  slidingWindow: 5,                // Keep 5 bundles in memory (current ± 2)
};

// Memory monitoring
function checkMemoryUsage() {
  const usage = process.memoryUsage();
  if (usage.heapUsed > MEMORY_LIMITS.mobile) {
    console.warn(`⚠️ Memory usage high: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  }
}
```

### Resume Capability Implementation
```javascript
// Save progress after each bundle
const PROGRESS_FILE = `./cache/bundle-progress-${BOOK_ID}-${CEFR_LEVEL}.json`;

async function saveProgress(completedBundleIndex) {
  const progress = {
    bookId: BOOK_ID,
    level: CEFR_LEVEL,
    lastCompletedBundle: completedBundleIndex,
    timestamp: new Date().toISOString(),
    totalBundles: expectedTotalBundles
  };
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function getResumePoint() {
  if (fs.existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    return progress.lastCompletedBundle + 1;
  }
  return 0; // Start from beginning
}
```

---

## 💾 Database Operations

### Field Name Validation (CRITICAL)
```javascript
// CORRECT: Check schema.prisma for exact field names
await prisma.bookSimplification.upsert({
  where: {
    bookId_targetLevel_chunkIndex_versionKey: { // EXACT constraint name
      bookId: BOOK_ID,
      targetLevel: CEFR_LEVEL,
      chunkIndex: 0,
      versionKey: 'v1'
    }
  },
  create: {
    // Only use fields that exist in schema
    bookId: BOOK_ID,
    targetLevel: CEFR_LEVEL,
    chunkIndex: 0,
    originalText: 'Full text here',
    simplifiedText: simplifiedText,
    vocabularyChanges: [],
    culturalAnnotations: [],
    qualityScore: null,
    versionKey: 'v1'
  }
});
```

**Common Database Mistakes:**
```javascript
// WRONG: Using non-existent fields
{
  wordCount: text.split(' ').length,        // Field doesn't exist
  simplificationLogs: [],                   // Field doesn't exist
  bookId_targetLevel_chunkIndex_versionKey  // Wrong constraint name format
}
```

### Constraint Verification Patterns
```javascript
// Verify database constraints before bulk operations
async function verifyDatabaseSchema() {
  try {
    // Test upsert with minimal data
    await prisma.bookSimplification.upsert({
      where: { bookId_targetLevel_chunkIndex_versionKey: { bookId: 'test', targetLevel: 'A1', chunkIndex: 0, versionKey: 'v1' }},
      update: { simplifiedText: 'test' },
      create: { bookId: 'test', targetLevel: 'A1', chunkIndex: 0, originalText: 'test', simplifiedText: 'test', versionKey: 'v1' }
    });

    // Clean up test record
    await prisma.bookSimplification.delete({
      where: { bookId_targetLevel_chunkIndex_versionKey: { bookId: 'test', targetLevel: 'A1', chunkIndex: 0, versionKey: 'v1' }}
    });

    console.log('✅ Database schema validation passed');
  } catch (error) {
    console.error('❌ Database schema validation failed:', error.message);
    process.exit(1);
  }
}
```

### Batch Processing with Caching
```javascript
// MANDATORY: Cache expensive operations before database save
async function processWithCaching(chunks) {
  const results = [];

  for (const chunk of chunks) {
    try {
      // Expensive API operation
      const result = await expensiveAPICall(chunk);

      // SAVE TO CACHE IMMEDIATELY
      results.push(result);
      saveProgressToCache(results);

    } catch (error) {
      console.error(`Failed to process chunk ${chunk.index}:`, error);
      // Results preserved in cache - can resume
      break;
    }
  }

  // Only attempt database save after all API work is cached
  try {
    await saveToDB(results);
  } catch (dbError) {
    console.error('Database save failed, but work is cached and can be recovered');
    console.log('Run recovery script to restore from cache');
  }
}
```

### BookContent Integration (MANDATORY)
```javascript
// ALWAYS create complete database structure
async function createCompleteBookStructure(bookData) {
  // 1. Create Book record
  await prisma.book.upsert({
    where: { bookId: BOOK_ID },
    update: { title: bookData.title, author: bookData.author },
    create: { bookId: BOOK_ID, title: bookData.title, author: bookData.author }
  });

  // 2. Create BookContent record
  await prisma.bookContent.upsert({
    where: { bookId: BOOK_ID },
    update: {
      title: bookData.title,
      author: bookData.author,
      fullText: bookData.text,
      era: 'modern',
      wordCount: bookData.text.split(' ').length,
      totalChunks: 1
    },
    create: { /* same data */ }
  });

  // 3. Create BookChunks records (handled by bundle generation)
  // Bundle generation scripts handle this automatically
}
```

**Why Complete Structure Matters:**
- Bundle APIs expect BookContent record to exist
- Missing Book record causes "Book not found" errors
- Incomplete structure breaks Featured Books integration
- Always verify all relationships exist before deployment

---

## 🔧 Emergency Recovery Procedures

### Cache Recovery Scripts
```javascript
// Emergency recovery from cache when database fails
async function recoverFromCache(cacheFile) {
  if (!fs.existsSync(cacheFile)) {
    throw new Error('No cache file found for recovery');
  }

  const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

  // Restore to database
  await prisma.bookSimplification.upsert({
    where: { /* unique constraint */ },
    update: { simplifiedText: cachedData.simplifiedText },
    create: { /* complete record from cache */ }
  });

  console.log('✅ Recovered from cache successfully');
}
```

### Audio-Only Cleanup (Safe)
```javascript
// Clean only audio assets, preserve text work
async function cleanupAudioOnly(bookId, level) {
  // 1. Delete audio assets from database
  await supabase.from('audio_assets').delete()
    .eq('book_id', bookId)
    .eq('level', level);

  // 2. Delete audio files from storage
  const { data: files } = await supabase.storage
    .from('audio-files')
    .list(`${bookId}/${level}`);

  for (const file of files) {
    await supabase.storage
      .from('audio-files')
      .remove([`${bookId}/${level}/${file.name}`]);
  }

  // 3. DO NOT delete simplification or text data
  console.log('✅ Audio cleanup complete - text data preserved');
}
```

---

## 📊 Validation Checklists

### Pre-Implementation Checklist
- [ ] No running processes: `ps aux | grep script-name`
- [ ] Environment loaded: `source .env.local`
- [ ] Database schema verified: field names and constraints
- [ ] Book ID format chosen: `book-name-level`
- [ ] Chapter structure planned (4-9 chapters recommended)
- [ ] CEFR level and voice selected
- [ ] Cost estimated: sentences × $0.01
- [ ] Storage strategy confirmed (always Supabase)

### Implementation Validation
- [ ] Fetch: Text extracted with proper markers
- [ ] Modernize: Cache saved, language updated, meaning preserved
- [ ] Simplify: Sentence count matches exactly, CEFR compliant
- [ ] Generate: Pilot test successful, actual duration measured
- [ ] Deploy: Featured Books integration, chapter navigation works

### Post-Implementation Verification
- [ ] Bundle sequence complete: 0, 1, 2, 3... no gaps
- [ ] Text-audio alignment perfect: no content mismatches
- [ ] Audio files exist in storage: verify with browser test
- [ ] Database structure complete: Book + BookContent + BookChunks
- [ ] Browser cache cleared: test in incognito mode
- [ ] Chapter navigation working: all chapters jump correctly

---

## 🎯 Success Criteria

**A book implementation is COMPLETE only when:**

1. **Database**: ✅ Book + BookContent + BookChunks all exist with correct data
2. **Audio**: ✅ 95%+ bundles have audio files in Supabase storage
3. **Solution 1**: ✅ All bundles have audioDurationMetadata with measuredDuration and sentenceTimings
4. **Sync**: ✅ Audio text matches displayed text exactly (no mismatches)
5. **Performance**: ✅ API loads in 2-3 seconds using cached data (not 45+ seconds)
6. **UI**: ✅ Featured Books page displays and plays correctly
7. **Chapters**: ✅ Chapter navigation jumps work without errors
8. **Mobile**: ✅ No memory leaks, <100MB usage on mobile
9. **Harmony**: ✅ Perfect sentence-level audio-text synchronization (no lag/drift)

---

## 📚 Quick Reference Commands

### Development Workflow
```bash
# 1. Check status
ps aux | grep script-name
source .env.local

# 2. Clean start (audio only)
node scripts/cleanup-book-name.js

# 3. Implementation sequence
node scripts/fetch-book-name.js
node scripts/modernize-book-name.js --fresh
node scripts/simplify-book-name.js A2
node scripts/generate-book-name-bundles.js --pilot

# 4. Validation
node scripts/verify-book-structure.js book-name
```

### Emergency Recovery
```bash
# Cache recovery
node scripts/save-cached-simplification.js

# Audio-only cleanup (safe)
node scripts/cleanup-book-name.js

# Complete cleanup (dangerous)
node scripts/cleanup-book-name-complete.js
```

---

**Remember**: This guide consolidates lessons from multiple failed and successful implementations. Following these patterns prevents the costliest mistakes and ensures reliable, high-quality audiobook generation at scale.

**Key Insight**: Perfect implementations like Sleepy Hollow and Jekyll & Hyde follow these prevention strategies religiously. Skipping steps leads to hours of debugging and expensive API call losses.