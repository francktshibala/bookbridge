# Multi-Computer Audio Generation Instructions (Updated 2025-08-24)

## ⚠️ Common Pitfalls & Solutions (MUST READ BEFORE STARTING)

### 🚨 Critical Mistakes to Avoid

#### 1. **Storage Path Conflicts**
- **Problem**: Using same paths for all books (`/a1/chunk_0.mp3`) causes audio mix-ups
- **Solution**: ALWAYS use book-specific paths: `bookId/level/chunk_X.mp3`
- **Example**: `gutenberg-11/a1/chunk_0.mp3` NOT just `a1/chunk_0.mp3`

#### 2. **Skipping Database Setup**
- **Problem**: Generating expensive audio before chunks exist in database
- **Solution**: ALWAYS run this checklist first:
  ```bash
  # 1. Verify simplifications exist
  node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.bookSimplification.count({where:{bookId:'YOUR_BOOK_ID'}}).then(c => console.log('Simplifications:', c));"
  
  # 2. Copy ALL levels to bookChunk table
  for level in A1 A2 B1 B2 C1 C2; do node scripts/copy-simplifications-to-chunks.js YOUR_BOOK_ID $level; done
  
  # 3. ONLY THEN generate audio
  ```

#### 3. **No Verification Before Generation**
- **Problem**: Wasting hours generating audio that won't work
- **Solution**: Test first chunk before full generation:
  ```bash
  # Generate just chunk 0 of A1 first
  # Check it plays correctly on Vercel
  # THEN proceed with full generation
  ```

#### 4. **Wrong Content in CDN**
- **Problem**: Audio content doesn't match text (e.g., Romeo playing Pride & Prejudice)
- **Solution**: If reusing scripts, update ALL book IDs and paths carefully

### ✅ Correct Workflow Order
1. **Check** simplifications exist
2. **Copy** to bookChunk table  
3. **Update** script with correct book ID and paths
4. **Test** one chunk first
5. **Generate** all audio
6. **Verify** on Vercel

### 📊 Lessons from Completed Books
- Pride & Prejudice: ✅ Success (but wrong initial paths)
- Romeo & Juliet: ⚠️ Fixed audio-text mismatches, missing C1 chunks
- Alice in Wonderland: ⚠️ Fixed path conflicts, required file moves

---

## Goal
Generate audio for all 6 CEFR levels (A1-C2) across 11 enhanced books using multiple computers with **automatic Supabase CDN migration**.

## Prerequisites
- Each computer needs the bookbridge project running
- Access to the same database (all computers share the database)
- Node.js and all dependencies installed
- `.env.local` synced with Supabase credentials

## 🚀 Modern Workflow (Terminal-Based - FASTEST)

### Step 1: Sync Environment & Pull Latest
```bash
# On each computer before starting
git switch main && git pull
vercel env pull .env.local
nvm use --lts && npm ci
```

### Step 2: Get Your Book Assignment
**Computer 1 (Main):** gutenberg-1342 (Pride and Prejudice) ✅ **100% COMPLETE**
**Computer 2:** gutenberg-11 (Alice in Wonderland) 🔄 **IN PROGRESS**
**Computer 3:** gutenberg-1513 (Romeo and Juliet) 📋 **ASSIGNED**

### Step 3: Terminal Audio Generation (RECOMMENDED - 10x FASTER)
```bash
# Create a book-specific generation script
npx ts-node scripts/generate-full-book-audio.ts --bookId=gutenberg-11 --levels=A1,A2,B1,B2,C1,C2

# OR generate level by level for monitoring
npx ts-node scripts/generate-book-level-audio.ts --bookId=gutenberg-11 --level=A1
```

**Benefits of Terminal Approach:**
- ✅ **10x faster** than API calls through chat/browser
- ✅ **Automatic Supabase upload** - files go straight to CDN
- ✅ **Database auto-update** - URLs automatically saved
- ✅ **Progress monitoring** - real-time status updates
- ✅ **Error handling** - automatic retries and logging

### Step 4: Legacy API Method (SLOWER - Only if terminal fails)
```bash
# Generate audio using API (slower but more reliable for troubleshooting)
curl -X POST http://localhost:3000/api/admin/audio/backfill \
  -H "Content-Type: application/json" \
  -d '{"bookId": "gutenberg-11", "levels": ["A1"]}' \
  --max-time 3600

# Wait for completion, then repeat for A2, B1, B2, C1, C2
```

### Step 4: Test Each Level
1. Go to your book in the reader
2. Select the CEFR level
3. Test page 1 - should show ⚡ and play instantly
4. Test a few pages throughout the book

## Commands Reference

### Check Progress
```bash
# Count audio files generated
ls /path/to/public/audio/[BOOK_ID]/A1/ | wc -l

# Check if simplifications were copied
npx prisma studio
# Look for: bookChunk table, filter by bookId and cefrLevel
```

### Find Your Books
```bash
# List all enhanced books
npx prisma db push && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.bookChunk.groupBy({
  by: ['bookId'],
  where: { isSimplified: true },
  _count: { cefrLevel: true }
}).then(books => {
  console.log('Enhanced books with simplifications:');
  books.forEach(book => console.log('- ' + book.bookId));
  process.exit(0);
});
"
```

## 📋 Current Book Assignments (Updated 2025-08-24)

### Priority Books (6 levels each - highest value)
| Computer | Book ID | Title | Status | Levels Complete | CDN Status |
|----------|---------|--------|--------|----------------|------------|
| **Main** | gutenberg-1342 | Pride and Prejudice | ✅ **COMPLETE** | A1-C2: ✅ (1,606 files) | 100% Supabase CDN |
| **Computer 2** | gutenberg-11 | Alice in Wonderland | 🚀 **READY** | - | Ready for generation |
| **Computer 3** | gutenberg-1513 | Romeo and Juliet | 🚀 **READY** | - | Ready for generation |

### Remaining 6-Level Books (Assign After Priority)
- gutenberg-1524 (6 levels)
- gutenberg-158 (6 levels) 
- gutenberg-1952 (6 levels)
- gutenberg-215 (6 levels)
- gutenberg-43 (6 levels)
- gutenberg-46 (6 levels)
- gutenberg-55 (6 levels)
- gutenberg-64317 (6 levels)
- gutenberg-84 (6 levels)
- gutenberg-844 (6 levels)

## Troubleshooting

### No Chunks Found
- Run the copy script first: `node scripts/copy-simplifications-to-chunks.js [BOOK_ID] [LEVEL]`

### Audio Generation Fails
- Check terminal logs for errors
- Try generating one level at a time
- Ensure OpenAI API key is valid

### Files Not Found
- Check that `public/audio/[BOOK_ID]/[LEVEL]/` directory exists
- Verify file permissions

## ✅ Success Criteria Per Book (2025 Standard)
- [ ] All 6 levels (A1-C2) have audio files **uploaded to Supabase CDN**
- [ ] ⚡ instant playbook works for all levels **globally**
- [ ] Text matches audio on all pages
- [ ] **No local file dependencies** - 100% CDN-based
- [ ] Database contains only Supabase URLs (no `/audio/` paths)

## ⏱️ Updated Time Estimates (Terminal Method)
- **Copy simplifications:** 2-5 minutes per book (unchanged)
- **Generate audio per level (Terminal):** 5-15 minutes (50% faster)
- **Auto-upload to Supabase:** Included automatically  
- **Total per book:** 30 minutes - 1.5 hours
- **All 11 books:** 2-4 hours (with 3 computers in parallel)

## 🎯 Next Steps After All Books Complete
1. **Deploy to Vercel** - Test global instant audio
2. **Build admin dashboard** - Monitor generation progress
3. **Performance optimization** - Track load times globally  
4. **Scale to more books** - Apply to full library

## 📚 Quick Reference Commands
```bash
# Check book progress
node scripts/check-final-status.js --bookId=gutenberg-11

# Fix any missing chunks
npx ts-node scripts/fix-missing-audio.ts --bookId=gutenberg-11

# Verify CDN migration
node -e "console.log('CDN files:', await prisma.bookChunk.count({where:{bookId:'gutenberg-11',audioFilePath:{startsWith:'https://'}}}))"
```