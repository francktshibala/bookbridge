# Pride & Prejudice Audio Regeneration Required

## Date: 2025-08-25

## Current Status: ⚠️ BROKEN - Audio Not Playing

### Problem Summary
Pride & Prejudice (gutenberg-1342) database entries point to correct book-specific CDN paths, but the actual audio files don't exist at those paths in Supabase Storage.

### Root Cause
1. **Original Generation**: Pride & Prejudice was generated with generic paths (`a1/chunk_0.mp3`)
2. **Romeo Overwrite**: Romeo & Juliet generation later overwrote the same generic paths with Romeo content
3. **Path Fix Applied**: Database was updated to point to book-specific paths (`gutenberg-1342/a1/chunk_0.mp3`)
4. **Missing Files**: CDN files don't exist at the new book-specific paths → 400 Bad Request errors

### Current Database State
- **Database entries**: ✅ 1,606 entries with correct book-specific CDN URLs
- **CDN files**: ❌ Files don't exist at the book-specific paths
- **User experience**: Audio fails to play with 400 errors

### Working Books Status
1. ✅ **Alice (gutenberg-11)**: 372 files - Working
2. ❌ **Pride & Prejudice (gutenberg-1342)**: 1,606 files - BROKEN (needs regeneration)
3. ✅ **Frankenstein (gutenberg-84)**: 1,026 files - Working  
4. ✅ **Romeo & Juliet (gutenberg-1513)**: 312 files - Working
5. ✅ **Jekyll & Hyde (gutenberg-43)**: 302 files - Working
6. ✅ **Little Women (gutenberg-514)**: 5 files - Working

### Solution Required
**Regenerate Pride & Prejudice audio** with correct book-specific paths to create the missing CDN files.

### Regeneration Script Needed
```bash
# Create script: scripts/regenerate-pride-prejudice-audio.ts
# Must use: gutenberg-1342/${cefrLevel.toLowerCase()}/chunk_${chunkIndex}.mp3
# Will create ~1,606 audio files at correct CDN paths
```

### Verification Steps After Regeneration
1. Test Pride & Prejudice audio playback in app
2. Verify no 400 errors in browser console
3. Confirm audio content matches Pride & Prejudice text (not Romeo)
4. Check CDN files exist at book-specific paths

### Impact
- **Users**: Pride & Prejudice completely unusable for audio features
- **System**: 5/6 books work correctly, 1 book needs fix
- **Priority**: High - major book is completely broken

---
**Status**: Ready for regeneration once other computers sync latest changes