# Incremental Audio Generation Plan

## Goal
Generate audio for all 6 CEFR levels (A1-C2) for 11 enhanced books, one step at a time.

## Current Status
- 11 enhanced books have simplified text stored in database
- Audio files exist only for chunks 92-121 of gutenberg-1342 (Pride and Prejudice) A1 level
- Data structure issue: 
  - Simplified text is stored in `book_chunks` table with chunkIndex 92-121 for A1
  - But the reader API expects chunks 0-29 when displaying pages 1-30
  - The audio files match the database (chunk_92.mp3 for chunkIndex 92)

## Phase 1: Fix Foundation (Pride and Prejudice)

### Step 1.1: Fix Chunk Alignment ✓ REVISED
- [x] Decision: Keep audio files as-is (they match the database)
- [x] Added temporary offset for Pride & Prejudice (+92 when simplified)
- [ ] TODO: Fix the reader's simplification API to use book_chunks table
- [ ] TODO: Implement proper chunk offset mapping for all books

### Step 1.2: Generate A1 Audio ✅ COMPLETED
- [x] Generated audio for ALL 252 A1 chunks 
- [x] Verified audio matches displayed text
- [x] Test playback from page 1

### Step 1.3: Test & Verify ✅ COMPLETED  
- [x] Audio plays instantly (⚡ indicator)
- [x] Text and audio are synchronized
- [x] Navigation works (next/previous page)
- [ ] Auto-advance works correctly (minor issue - will fix later)

## Phase 2: Complete Pride and Prejudice

### Step 2.1: Generate Remaining Levels
- [ ] A2 level audio generation
- [ ] B1 level audio generation  
- [ ] B2 level audio generation
- [ ] C1 level audio generation
- [ ] C2 level audio generation

### Step 2.2: Full Book Testing
- [ ] Test level switching preserves audio sync
- [ ] Verify all 6 levels have instant playback
- [ ] Check memory/performance with all audio loaded

## Phase 3: Scale to All Books

### Step 3.1: Identify All Enhanced Books
```sql
-- Query to find enhanced books with simplifications
SELECT DISTINCT bookId, COUNT(DISTINCT cefrLevel) as levels
FROM book_chunks 
WHERE isSimplified = true
GROUP BY bookId;
```

### Step 3.2: Process Each Book
For each book:
1. [ ] Run audio generation for all 6 levels
2. [ ] Verify chunk counts match
3. [ ] Test first and last page audio
4. [ ] Check total file size
5. [ ] Document any issues

### Step 3.3: Books to Process
- [ ] gutenberg-1342 (Pride and Prejudice) ✓ A1 partial
- [ ] Book 2: [TBD]
- [ ] Book 3: [TBD]
- [ ] Book 4: [TBD]
- [ ] Book 5: [TBD]
- [ ] Book 6: [TBD]
- [ ] Book 7: [TBD]
- [ ] Book 8: [TBD]
- [ ] Book 9: [TBD]
- [ ] Book 10: [TBD]
- [ ] Book 11: [TBD]

## Implementation Commands

### Check Current Status
```bash
# See what simplified chunks exist
npx prisma studio
# Look for: bookChunk table, filter by isSimplified=true

# Check audio files
ls -la public/audio/
```

### Generate Audio for Specific Book/Level
```bash
# Generate audio for one book, one level
curl -X POST http://localhost:3000/api/admin/audio/backfill \
  -H "Content-Type: application/json" \
  -d '{"bookId": "gutenberg-1342", "levels": ["A1"]}'
```

### Monitor Progress
- Check terminal logs for generation progress
- Look for "✅ Generated audio" messages
- Watch for any "❌ Failed" errors

## Success Metrics
- [ ] All 11 books × 6 levels = 66 complete sets
- [ ] 100% instant playback (no progressive generation)
- [ ] Zero text/audio mismatches
- [ ] Average load time < 500ms

## Next Immediate Action
Fix chunk alignment for gutenberg-1342 A1 level so page 1 plays the correct audio.