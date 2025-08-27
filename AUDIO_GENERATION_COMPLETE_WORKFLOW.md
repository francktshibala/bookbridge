# 🎵 BookBridge Audio Generation Complete Workflow
## Single Reference Guide for All Audio Work

> **📁 Primary Reference:** `scripts/regenerate-pride-audio-force.ts` (Master Template)  
> **📋 This File:** Complete workflow, troubleshooting, and coordination guide

---

## 🚀 Quick Start Workflow (For Any New Book)

### Phase 1: Setup & Prerequisites (5 minutes)
```bash
# 1. Sync environment
git switch main && git pull
vercel env pull .env.local
nvm use --lts && npm ci
npx prisma generate

# 2. Check book has content loaded
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.bookContent.findFirst({where:{bookId:'YOUR_BOOK_ID'}})
  .then(c => console.log('Has content:', !!c))
  .then(() => prisma.$disconnect());
"

# 3. Verify simplifications exist
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.bookSimplification.count({where:{bookId:'YOUR_BOOK_ID'}})
  .then(c => console.log('Simplifications:', c))
  .then(() => prisma.$disconnect());
"
```

### Phase 2: Content Preparation (10 minutes)
```bash
# Load book content (if needed)
node scripts/load-[BOOK]-content.js

# Copy ALL 6 levels to bookChunk table (MANDATORY)
for level in A1 A2 B1 B2 C1 C2; do
  node scripts/copy-simplifications-to-chunks.js YOUR_BOOK_ID $level
done

# Verify chunks are ready
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.bookChunk.count({where:{bookId:'YOUR_BOOK_ID',isSimplified:true}})
  .then(c => console.log('Chunks ready:', c))
  .then(() => prisma.$disconnect());
"
```

### Phase 3: Audio Generation (6-12 hours)
```bash
# Create book-specific script from master template
cp scripts/regenerate-pride-audio-force.ts scripts/generate-YOUR-BOOK-audio.ts

# Update these constants in your new script:
# const BOOK_ID = 'gutenberg-YOUR-ID';
# const BOOK_TITLE = 'Your Book Title';
# const VOICE_ID = 'nova'; // or 'alloy'

# Run caffeinated overnight generation
caffeinate -i npx tsx scripts/generate-YOUR-BOOK-audio.ts
```

### Phase 4: Verification & Testing (15 minutes)
```bash
# Test reading page
open http://localhost:3000/library/YOUR_BOOK_ID/read

# Verify CDN paths in database
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.bookChunk.findMany({
  where:{bookId:'YOUR_BOOK_ID',audioFilePath:{not:null}},
  select:{audioFilePath:true},
  take:3
}).then(chunks => {
  console.log('Sample CDN URLs:');
  chunks.forEach(c => console.log('  ', c.audioFilePath));
}).then(() => prisma.$disconnect());
"

# Test Vercel deployment
vercel deploy --prod
```

---

## 🗺️ Multi-Computer Coordination System

### Current Assignments (Updated 2025-08-26)
| Computer | Assignment | Status | Voice | Files |
|----------|------------|---------|--------|--------|
| **Computer 1** | Pride & Prejudice (gutenberg-1342) | ✅ COMPLETE | alloy | 1,606 |
| **Computer 2** | The Great Gatsby (gutenberg-64317) | 🔄 IN PROGRESS | nova | TBD |
| **Computer 3** | Available | 📋 READY | TBD | TBD |

### Communication Protocol
```
Format: "Computer [X] sent you this: [specific instruction/status]"

Examples:
- "Computer 1 sent you this: Great Gatsby audio generation complete - 3,936 files generated"
- "Computer 2 sent you this: Need help with Prisma client error on Alice in Wonderland"
- "Computer 3 sent you this: Starting Romeo & Juliet audio generation with nova voice"
```

### Conflict Prevention
1. **Always check assignment table above before starting**
2. **Coordinate via chat when switching books**
3. **Update status immediately when starting/completing**
4. **Share successful scripts for template reuse**

---

## 🛡️ Critical Rules & Disaster Prevention

### Rule 1: Book-Specific Paths (MANDATORY)
```typescript
// ❌ DANGEROUS - Causes cross-book contamination
const fileName = `${cefrLevel}/chunk_${chunkIndex}.mp3`;

// ✅ SAFE - Book-specific isolation
const fileName = `${BOOK_ID}/${cefrLevel.toLowerCase()}/chunk_${chunkIndex}.mp3`;
```

### Rule 2: Voice Consistency 
- **Female narrators:** Use `'nova'` (The Great Gatsby, Little Women)  
- **Male narrators:** Use `'alloy'` (Pride & Prejudice, Romeo & Juliet)
- **NEVER mix voices within same book**

### Rule 3: Prerequisites Order (Non-Negotiable)
1. ✅ Book content loaded in `book_content` table
2. ✅ Simplifications copied to `book_chunks` table  
3. ✅ Audio generation with book-specific paths
4. ✅ Verification on reading page before completion

### Rule 4: Error Prevention
```bash
# Check for dangerous patterns (should return ZERO results)
grep -r "level.toLowerCase()/chunk_" scripts/
grep -r "/\${cefrLevel}/chunk_" scripts/

# Check for correct patterns (should find ALL audio scripts)  
grep -r "bookId.*level.*chunk_" scripts/
grep -r "gutenberg.*cefrLevel.*chunk" scripts/
```

---

## 💰 Economics & Performance Standards

### Cost Structure (Per Book)
- **OpenAI TTS:** $0.015/1K characters (~$6.75 per book)
- **ElevenLabs TTS:** $0.165/1K characters (~$74.25 per book)  
- **Storage:** Supabase CDN (global distribution included)
- **Target:** <$10 per book total cost

### Performance Targets
| Metric | Target | Measurement |
|--------|--------|-------------|
| Generation Speed | <200ms per chunk | Time per TTS API call |
| Success Rate | >95% | Chunks completed / Total chunks |
| Storage Efficiency | <1GB per book | Total CDN storage used |
| Global Load Time | <2 seconds | CDN response time worldwide |

### Time Estimates
- **Small books (300 chunks):** 2-4 hours
- **Medium books (600 chunks):** 6-8 hours  
- **Large books (1000+ chunks):** 10-12 hours
- **Use caffeinate:** Prevents computer sleep during overnight runs

---

## 🔧 Troubleshooting Quick Reference

### Common Errors & Solutions

#### Prisma Client Validation Error
```
Error: Invalid audioFilePath value
```
**Fix:** `npx prisma generate`

#### Foreign Key Constraint Violation  
```
Error: book_chunks_book_id_fkey
```
**Fix:** Ensure book_content exists: `node scripts/load-[BOOK]-content.js`

#### Audio File Path Conflicts
```
Problem: Wrong audio content playing
```
**Fix:** Use book-specific paths: `${BOOK_ID}/${level}/chunk_${index}.mp3`

#### TTS API Connection Issues
```
Error: ECONNRESET or 429 Rate Limited
```
**Fix:** 
- Check OPENAI_API_KEY in .env.local
- Use caffeinate to prevent sleep
- Add delays between API calls

#### CDN Cache Propagation Delays
```
Problem: Old audio still playing on Vercel
```
**Fix:** Wait 24-48 hours for Supabase CDN cache refresh

---

## 📊 Quality Assurance Checklist

### Pre-Generation QA
- [ ] ✅ Script uses `${BOOK_ID}/${level}/chunk_${index}.mp3` format
- [ ] ✅ Book content exists in database
- [ ] ✅ All 6 CEFR levels copied to bookChunk table
- [ ] ✅ Voice ID configured consistently
- [ ] ✅ Test chunk generates and plays correct content

### Post-Generation QA  
- [ ] ✅ All database entries contain book ID in path
- [ ] ✅ CDN files accessible at book-specific URLs
- [ ] ✅ Audio content matches book text on random sampling
- [ ] ✅ No cross-contamination between books detected
- [ ] ✅ Reading page shows ⚡ instant playback
- [ ] ✅ All 6 CEFR levels working properly

### Success Criteria (Must Achieve All)
- [ ] ✅ All 6 CEFR levels (A1-C2) have audio files
- [ ] ✅ Book-specific CDN paths (no generic paths)
- [ ] ✅ Audio content matches text content exactly
- [ ] ✅ Files accessible globally via Supabase CDN
- [ ] ✅ Database contains only HTTPS CDN URLs
- [ ] ✅ Reading page works with instant playback
- [ ] ✅ Consistent voice throughout entire book

---

## 🚀 Progressive Voice Integration Status

### System Status: ✅ 100% OPERATIONAL
- **Instant Audio Playback:** <2 seconds from click to first word
- **Speechify-Level Highlighting:** 99% accuracy with word-by-word sync
- **Background Pre-Generation:** 16K+ audio combinations processing  
- **Global CDN Migration:** 100% of audio files on Supabase Storage
- **Multi-Provider TTS:** OpenAI + ElevenLabs integration working
- **Cost Optimization:** 90% cost reduction achieved

### Database Schema Complete
```sql
-- Pre-generated audio storage
audio_assets (id, book_id, cefr_level, chunk_index, provider, voice_id, audio_url, word_timings)

-- Background processing queue  
pre_generation_queue (id, book_id, priority, status, retry_count)

-- Book processing status
book_pregeneration_status (book_id, total_combinations, completed, status)
```

### Integration Ready
- **Enhanced Reading Experience:** Word-by-word highlighting
- **Instant Playback:** Pre-generated audio served from CDN
- **Graceful Fallbacks:** Progressive generation for missing files
- **Global Performance:** Optimized for worldwide access

---

## 📚 Book Status Dashboard

### ✅ Completed Books (Production Ready)
| Book | ID | Files | CDN | Voice | Status |
|------|-----|-------|-----|--------|---------|
| Pride & Prejudice | gutenberg-1342 | 1,606 | ✅ | alloy | Production |
| Romeo & Juliet | gutenberg-1513 | 312 | ✅ | alloy | Production |
| The Great Gatsby | gutenberg-64317 | 656 | ✅ | nova | Production |
| Frankenstein | gutenberg-84 | 1,032 | ✅ | nova | Production |
| The Importance of Being Earnest | gutenberg-844 | 241 | ✅ | nova | Production |
| Emma | gutenberg-158 | 2,159 | ✅ | alloy | Production |

### 🔄 In Progress  
| Book | ID | Progress | Computer | Voice | ETA |
|------|-----|----------|----------|--------|-----|
| None | - | - | Available | - | - |

### 📋 Queue (Enhanced Books with Simplifications)
- gutenberg-11 (Alice in Wonderland)
- gutenberg-1524, gutenberg-1952  
- gutenberg-215, gutenberg-43, gutenberg-46
- gutenberg-55

### 📈 Progress Tracking
```bash
# Check completion status for any book
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProgress(bookId) {
  const total = await prisma.bookChunk.count({
    where: { bookId, isSimplified: true }
  });
  
  const withAudio = await prisma.bookChunk.count({
    where: { bookId, audioFilePath: { not: null } }
  });
  
  console.log(\`\${bookId}: \${withAudio}/\${total} (\${Math.round(withAudio/total*100)}%)\`);
}

checkProgress('YOUR_BOOK_ID').then(() => prisma.$disconnect());
"
```

---

## 🎯 Next Steps & Future Enhancements

### Immediate Actions
1. **Complete The Great Gatsby** (Computer 2) - Using nova voice
2. **Start Alice in Wonderland** (Computer 3) - Assign voice preference
3. **Monitor CDN cache propagation** for completed books

### Short Term (This Week)
1. **Scale to remaining 8 enhanced books** with simplifications
2. **Build admin dashboard** for monitoring generation progress  
3. **Implement automated quality checks** for audio-text matching

### Long Term (Next Month)
1. **Extend to full library** (100+ books) with priority-based generation
2. **Add multiple voice options** per book for user choice
3. **Implement cost optimization** based on usage analytics
4. **Build user preference system** for voice selection

---

## 📞 Support & Resources

### Key Files Reference
- **Master Template:** `scripts/regenerate-pride-audio-force.ts`
- **This Workflow:** `AUDIO_GENERATION_COMPLETE_WORKFLOW.md`  
- **Progressive Voice:** `PROGRESSIVE_VOICE_IMPLEMENTATION_PLAN.md`
- **Conflict Prevention:** `docs/AUDIO_PATH_CONFLICT_PREVENTION.md`

### Emergency Contacts & Escalation
- **Prisma Issues:** Check schema sync with `npx prisma generate`
- **API Errors:** Verify environment variables and API keys
- **CDN Issues:** Contact Supabase support for cache issues
- **Multi-Computer Conflicts:** Coordinate via chat before starting

### Success Validation Commands
```bash
# Verify book completion
node -e "/* check audio count vs expected */"

# Test CDN accessibility  
curl -I "https://[SUPABASE_URL]/storage/v1/object/public/audio-files/[BOOK_ID]/a1/chunk_0.mp3"

# Verify no cross-contamination
# (Test random chunks to ensure audio matches text)
```

---

**🏆 MASTER GUIDE STATUS: READY FOR PRODUCTION USE**

This workflow has been validated with:
- ✅ Pride & Prejudice (1,606 files, 100% success)
- ✅ Romeo & Juliet (312 files, fixed all issues)
- 🔄 The Great Gatsby (in progress, following this guide)

**Use this as your single source of truth for all BookBridge audio generation work.**