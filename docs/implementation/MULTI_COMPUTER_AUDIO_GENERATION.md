# Multi-Computer Audio Generation Instructions

## Goal
Generate audio for all 6 CEFR levels (A1-C2) across 11 enhanced books using multiple computers to speed up the process.

## Prerequisites
- Each computer needs the bookbridge project running
- Access to the same database (all computers share the database)
- Node.js and all dependencies installed

## Quick Start (5 Minutes Per Book)

### Step 1: Get Your Book Assignment
**Computer 1:** gutenberg-1342 (Pride and Prejudice) ✅ A1 DONE
**Computer 2:** [TBD - assign next book]
**Computer 3:** [TBD - assign next book]

### Step 2: Copy Simplifications to Database (Once Per Book)
```bash
# Run this script for each CEFR level
node scripts/copy-simplifications-to-chunks.js [BOOK_ID] A1
node scripts/copy-simplifications-to-chunks.js [BOOK_ID] A2
node scripts/copy-simplifications-to-chunks.js [BOOK_ID] B1
node scripts/copy-simplifications-to-chunks.js [BOOK_ID] B2
node scripts/copy-simplifications-to-chunks.js [BOOK_ID] C1
node scripts/copy-simplifications-to-chunks.js [BOOK_ID] C2
```

### Step 3: Generate Audio (One Level at a Time)
```bash
# Generate audio for each level (takes 10-30 minutes per level)
curl -X POST http://localhost:3000/api/admin/audio/backfill \
  -H "Content-Type: application/json" \
  -d '{"bookId": "[BOOK_ID]", "levels": ["A1"]}'
```

**Wait for completion, then repeat for A2, B1, B2, C1, C2**

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

## Book Assignments - Focus on 6-Level Books First

### Priority Books (6 levels each - highest value)
| Computer | Book ID | Title | Status | Levels Complete |
|----------|---------|--------|--------|----------------|
| **Main** | gutenberg-1342 | Pride and Prejudice | ✅ A1 Done | A1: ✅ |
| **Computer 2** | gutenberg-11 | Alice in Wonderland | Assign Next | - |
| **Computer 3** | gutenberg-1513 | Romeo and Juliet | Assign Next | - |

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

## Success Criteria Per Book
- [ ] All 6 levels (A1-C2) have audio files
- [ ] ⚡ instant playback works for all levels
- [ ] Text matches audio on all pages
- [ ] No progressive generation fallbacks

## Time Estimates
- **Copy simplifications:** 2-5 minutes per book
- **Generate audio per level:** 10-30 minutes (depends on book size)
- **Total per book:** 1-3 hours
- **All 11 books:** 3-8 hours (with 3 computers in parallel)

## Next Steps After All Books Complete
1. Test all books and levels
2. Fix highlighting and auto-advance issues
3. Migrate from local files to CDN storage
4. Add coverage monitoring in admin UI