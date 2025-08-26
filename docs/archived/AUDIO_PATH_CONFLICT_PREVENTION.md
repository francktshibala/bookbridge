# AUDIO PATH CONFLICT PREVENTION GUIDE
## Critical Issues Documentation & Prevention Strategy

**Date**: 2025-08-25  
**Context**: Multi-computer audio generation resulted in path conflicts causing wrong audio content to play

---

## 🚨 ROOT CAUSE ANALYSIS

### The Core Problem: Generic Path Collision
**Issue**: Multiple books using identical CDN paths, causing later generations to overwrite earlier ones.

**Examples of Wrong Implementation**:
```typescript
// ❌ BAD - Generic paths (all books share same files)
const fileName = `${cefrLevel.toLowerCase()}/chunk_${chunkIndex}.mp3`;
// Results in: a1/chunk_0.mp3, a1/chunk_1.mp3, etc.
```

**What Happened**:
1. Pride & Prejudice generated first → saved to `a1/chunk_0.mp3`
2. Romeo & Juliet generated later → overwrote `a1/chunk_0.mp3` with Romeo content
3. Pride & Prejudice database still points to `a1/chunk_0.mp3` but file contains Romeo audio
4. Result: Pride & Prejudice plays Romeo & Juliet content

---

## ✅ CORRECT IMPLEMENTATION

### Book-Specific Path Pattern
```typescript
// ✅ GOOD - Book-specific paths (each book has own directory)
const fileName = `${bookId}/${cefrLevel.toLowerCase()}/chunk_${chunkIndex}.mp3`;
// Results in: gutenberg-1342/a1/chunk_0.mp3, gutenberg-1513/a1/chunk_0.mp3, etc.
```

### Verified Working Examples
From successful implementations:

**Jekyll & Hyde (gutenberg-43)**:
```typescript
// Line 104 in generate-gutenberg-43-audio.ts
const fileName = `gutenberg-43/${item.cefrLevel.toLowerCase()}/chunk_${item.chunkIndex}.mp3`;
```

**Little Women (gutenberg-514)**:
```typescript  
// Line 101 in generate-little-women-audio.ts
const fileName = `gutenberg-514/${item.targetLevel.toLowerCase()}/chunk_${item.chunkIndex}.mp3`;
```

---

## 🛡️ MANDATORY PREVENTION CHECKLIST

### Before Any Audio Generation Script:

1. **Path Pattern Verification**:
   ```bash
   # Search for generic patterns (DANGEROUS)
   grep -r "level.toLowerCase()/chunk_" scripts/
   grep -r "/\${cefrLevel}/chunk_" scripts/
   
   # Should find ZERO matches
   ```

2. **Book-Specific Pattern Enforcement**:
   ```bash
   # Search for correct patterns (SAFE)
   grep -r "bookId.*level.*chunk_" scripts/
   grep -r "gutenberg.*cefrLevel.*chunk" scripts/
   
   # Should find ALL audio generation scripts
   ```

3. **Database Path Audit**:
   ```sql
   -- Check for generic paths in database (DANGER)
   SELECT DISTINCT audio_file_path 
   FROM book_chunks 
   WHERE audio_file_path NOT LIKE '%gutenberg-%' 
   AND audio_file_path IS NOT NULL;
   
   -- Should return EMPTY result
   ```

### Script Template (MANDATORY FORMAT):
```typescript
// ✅ TEMPLATE: Use this exact pattern for all audio generation scripts
async function generateBookAudio(bookId: string) {
  // ...generation logic...
  
  // CRITICAL: Book-specific path format
  const fileName = `${bookId}/${cefrLevel.toLowerCase()}/chunk_${chunkIndex}.mp3`;
  
  const { data, error } = await supabase.storage
    .from('audio-files')
    .upload(fileName, audioBuffer, {
      contentType: 'audio/mp3',
      cacheControl: '2592000', // 30 days
      upsert: true // Safe to overwrite own files
    });
    
  // Update database with full CDN URL
  await prisma.bookChunk.update({
    where: { id: chunkId },
    data: { audioFilePath: publicUrl } // Contains bookId in path
  });
}
```

---

## 🔧 EMERGENCY FIX PROCEDURES

### If Path Conflicts Discovered:

1. **Identify Affected Books**:
   ```sql
   -- Find books with generic paths
   SELECT book_id, COUNT(*) as generic_paths
   FROM book_chunks 
   WHERE audio_file_path LIKE '%/a1/chunk_%'
      OR audio_file_path LIKE '%/a2/chunk_%'
      OR audio_file_path LIKE '%/b1/chunk_%'
      OR audio_file_path LIKE '%/b2/chunk_%'
      OR audio_file_path LIKE '%/c1/chunk_%' 
      OR audio_file_path LIKE '%/c2/chunk_%'
   GROUP BY book_id;
   ```

2. **Fix Database Paths** (if original files exist):
   ```sql
   -- Update paths to book-specific format
   UPDATE book_chunks 
   SET audio_file_path = REPLACE(
     audio_file_path,
     '/audio-files/' || LOWER(cefr_level) || '/chunk_',
     '/audio-files/' || book_id || '/' || LOWER(cefr_level) || '/chunk_'
   )
   WHERE book_id = 'AFFECTED_BOOK_ID'
     AND audio_file_path IS NOT NULL
     AND audio_file_path NOT LIKE '%' || book_id || '%';
   ```

3. **Regenerate if Files Corrupted**:
   ```bash
   # If original files were overwritten, must regenerate
   npx tsx scripts/regenerate-BOOKID-audio.ts
   ```

---

## 📊 CURRENT STATUS AFTER FIXES

### Fixed Books:
- **Jekyll & Hyde (gutenberg-43)**: ✅ Using book-specific paths, working correctly
- **Little Women (gutenberg-514)**: ✅ Using book-specific paths, working correctly
- **Alice (gutenberg-11)**: ✅ Using book-specific paths, working correctly
- **Romeo & Juliet (gutenberg-1513)**: ✅ Fixed - database points to correct book-specific paths

### Partially Fixed:
- **Pride & Prejudice (gutenberg-1342)**: ⚠️ Database updated to book-specific paths, but CDN files may not exist at new paths (400 errors observed)

---

## 🎯 PREVENTION RULES (MANDATORY)

### Rule 1: Always Use Book-Specific Paths
```typescript
// ❌ NEVER DO THIS
const path = `${level}/chunk_${index}.mp3`;

// ✅ ALWAYS DO THIS  
const path = `${bookId}/${level}/chunk_${index}.mp3`;
```

### Rule 2: Verify Script Before Running
```bash
# Before running any new audio script:
grep "fileName.*chunk_" scripts/your-script.ts

# Must contain bookId in the path string
```

### Rule 3: Test First Chunk Always
```bash
# Generate one chunk first, verify it plays correct content
# THEN proceed with full generation
```

### Rule 4: Database Schema Enforcement
Consider adding database constraints:
```sql
-- Future enhancement: Enforce path format in database
ALTER TABLE book_chunks 
ADD CONSTRAINT valid_audio_path 
CHECK (audio_file_path IS NULL OR audio_file_path LIKE '%gutenberg-%');
```

---

## 🚀 QUALITY ASSURANCE PROCESS

### Pre-Generation QA:
1. ✅ Script uses `${bookId}/${level}/chunk_${index}.mp3` format
2. ✅ Database paths verified book-specific
3. ✅ No generic path patterns found in codebase
4. ✅ Test chunk generates and plays correct content

### Post-Generation QA:
1. ✅ All database entries contain book ID in path
2. ✅ CDN files accessible at book-specific URLs
3. ✅ Audio content matches book text on random sampling
4. ✅ No cross-contamination between books detected

---

## 💡 LESSONS LEARNED

1. **Isolation is Critical**: Each book must have completely separate CDN paths
2. **Database Consistency**: Always verify paths in database match CDN structure  
3. **Test Early**: Generate one chunk first to catch path issues before bulk generation
4. **Documentation**: This exact problem has occurred 4+ times - prevention is essential
5. **Template Enforcement**: All future scripts must use the verified template format

---

**Remember**: This issue has cost significant time and money. Following this prevention guide is MANDATORY for all future audio generation work.