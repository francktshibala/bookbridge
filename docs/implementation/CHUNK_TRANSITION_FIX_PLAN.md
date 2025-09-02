# Chunk Transition Fix Plan
## Safe Implementation for Current Books & Future Template

**Date**: 2025-09-02  
**Problem**: 3-5 second delays between chunks breaking reading flow  
**Goal**: <100ms seamless transitions like Speechify/Audible  
**Risk Level**: Low (incremental, testable changes)  

---

## 🔥 PHASE 1: QUICK WINS (Day 1)
### Remove Hardcoded Delays - 1300ms Immediate Savings

**File**: `/hooks/useAutoAdvance.ts` (lines 38-47)

**Current (BAD)**:
```typescript
setTimeout(() => {
  onNavigate('next', true);
  setTimeout(() => {
    onPlayStateChange(true); // 800ms additional delay
  }, 800);
}, 500); // 500ms initial delay
```

**Fix (GOOD)**:
```typescript
// Immediate transition with promise-based flow
const handleAutoAdvance = async () => {
  // Navigate immediately
  await onNavigate('next', true);
  
  // Resume playback immediately if audio is ready
  if (isAudioReady) {
    onPlayStateChange(true);
  }
};
```

**Testing**: 
- Test with Pride & Prejudice (gutenberg-1342) first
- Verify auto-advance still works but without delays
- Check manual navigation still functions

---

## 🔧 PHASE 2: FIX CURRENT ENHANCED BOOKS (Day 2-3)

### Step 1: Remove Visual Animation Delays

**File**: `/app/library/[id]/read/page.tsx`

**Current (0.4s delay)**:
```tsx
<motion.div
  animate={{ opacity: 1, x: 0 }}
  initial={{ opacity: 0, x: direction === 'next' ? 50 : -50 }}
  transition={{ duration: 0.4, ease: 'easeOut' }}
>
```

**Fix (Instant or fast crossfade)**:
```tsx
<motion.div
  animate={{ opacity: 1 }}
  initial={{ opacity: 0 }}
  transition={{ duration: 0.1 }} // 100ms fast fade
>
```

### Step 2: Integrate Existing Prefetch Service

**File**: `/components/audio/InstantAudioPlayer.tsx`

**Add prefetch trigger** (line ~260):
```typescript
// When playback reaches 80% of current chunk
useEffect(() => {
  if (progress > 0.8 && !isPrefetching) {
    // Trigger prefetch for next chunk
    prefetchNextChunk(bookId, currentChunk + 1, cefrLevel, voiceId);
  }
}, [progress]);

// Add prefetch function
const prefetchNextChunk = async (bookId: string, nextChunk: number, level: string, voice: string) => {
  try {
    // Pre-fetch next chunk's audio data
    const response = await fetch(`/api/audio/pregenerated?bookId=${bookId}&chunkIndex=${nextChunk}&level=${level}&voiceId=${voice}`);
    const data = await response.json();
    
    // Store in memory for instant access
    nextChunkCache.current = data.audioAssets;
  } catch (error) {
    console.error('Prefetch failed:', error);
  }
};
```

### Step 3: Memory-Based Chunk Cache

**New file**: `/lib/chunk-memory-cache.ts`
```typescript
export class ChunkMemoryCache {
  private cache = new Map<string, { 
    audioAssets: AudioAsset[], 
    simplifiedText?: string,
    timestamp: number 
  }>();
  
  private maxCacheSize = 5; // Keep 5 chunks in memory
  
  getCacheKey(bookId: string, chunk: number, level: string): string {
    return `${bookId}-${level}-chunk_${chunk}`;
  }
  
  set(key: string, data: any): void {
    // Evict oldest if cache full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      ...data,
      timestamp: Date.now()
    });
  }
  
  get(key: string): any | null {
    return this.cache.get(key) || null;
  }
}
```

### Step 4: Database Query Optimization

**File**: `/app/api/audio/pregenerated/route.ts`

**Add bulk chunk retrieval**:
```typescript
// Add support for fetching multiple chunks
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId');
  const chunkIndex = searchParams.get('chunkIndex');
  const bulkFetch = searchParams.get('bulk'); // New parameter
  
  if (bulkFetch === 'true') {
    // Fetch current + next 2 chunks in one query
    const chunks = await db.audioAsset.findMany({
      where: {
        book_id: bookId,
        chunk_index: {
          in: [parseInt(chunkIndex), parseInt(chunkIndex) + 1, parseInt(chunkIndex) + 2]
        }
      },
      orderBy: [
        { chunk_index: 'asc' },
        { sentence_index: 'asc' }
      ]
    });
    
    // Group by chunk for easy access
    const groupedChunks = chunks.reduce((acc, asset) => {
      const key = asset.chunk_index;
      if (!acc[key]) acc[key] = [];
      acc[key].push(asset);
      return acc;
    }, {});
    
    return NextResponse.json({ chunks: groupedChunks });
  }
  
  // Original single chunk logic...
}
```

---

## 🚀 PHASE 3: SAFE TESTING PROTOCOL

### Test Order (One Book at a Time):
1. **Pride & Prejudice** (gutenberg-1342) - Most complete book
2. **Alice in Wonderland** (gutenberg-11) - Shorter for quick testing
3. **Romeo & Juliet** (gutenberg-1513) - Different genre
4. Apply to remaining enhanced books after validation

### Test Checklist:
- [ ] Auto-advance transitions < 500ms (down from 3-5s)
- [ ] Manual navigation still works
- [ ] Audio doesn't cut off mid-sentence
- [ ] Simplification loading doesn't break
- [ ] Memory usage stays under 50MB
- [ ] No regression in existing features

---

## 📚 PHASE 4: FUTURE BOOK TEMPLATE

### Enhanced Audio Generation Script Template

**Template**: `/scripts/templates/generate-book-audio-seamless.ts`

```typescript
import { ChunkMemoryCache } from '@/lib/chunk-memory-cache';
import { AudioPrefetchService } from '@/lib/audio-prefetch-service';

// MANDATORY: Book-specific paths (prevent collision issues)
const BOOK_ID = 'gutenberg-XXXX'; // Replace with actual ID

async function generateEnhancedBookAudio() {
  // 1. Generate audio with book-specific paths
  for (const chunk of chunks) {
    // CRITICAL: Use book-specific path pattern
    const fileName = `${BOOK_ID}/${cefrLevel.toLowerCase()}/chunk_${chunkIndex}.mp3`;
    
    // Generate with overlap for seamless transitions
    const audioConfig = {
      // Add 100ms overlap at chunk boundaries
      overlapDuration: 100,
      // Ensure sentence boundaries align
      forceSentenceBoundary: true,
      // Enable crossfade metadata
      includeCrossfadePoints: true
    };
    
    // Store with prefetch hints
    await db.audioAsset.create({
      data: {
        ...audioData,
        prefetch_hint: chunkIndex > 0 ? chunkIndex - 1 : null,
        crossfade_start: overlapStart,
        crossfade_end: overlapEnd
      }
    });
  }
  
  // 2. Pre-generate chunk relationships
  await generateChunkRelationships(BOOK_ID);
  
  // 3. Optimize for CDN delivery
  await optimizeForCDN(BOOK_ID);
}

// Helper: Generate chunk relationship metadata
async function generateChunkRelationships(bookId: string) {
  const chunks = await getBookChunks(bookId);
  
  for (let i = 0; i < chunks.length; i++) {
    await db.chunkRelationship.create({
      data: {
        book_id: bookId,
        chunk_index: i,
        prev_chunk: i > 0 ? i - 1 : null,
        next_chunk: i < chunks.length - 1 ? i + 1 : null,
        prefetch_priority: 'high',
        transition_type: 'crossfade'
      }
    });
  }
}
```

### Database Schema Addition

**File**: `/supabase/migrations/XXXX_add_chunk_relationships.sql`

```sql
-- Add chunk relationship tracking
CREATE TABLE chunk_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id VARCHAR NOT NULL,
  chunk_index INTEGER NOT NULL,
  prev_chunk INTEGER,
  next_chunk INTEGER,
  prefetch_priority VARCHAR(10) DEFAULT 'normal',
  transition_type VARCHAR(20) DEFAULT 'crossfade',
  overlap_duration INTEGER DEFAULT 100, -- milliseconds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, chunk_index)
);

-- Add prefetch hints to audio_assets
ALTER TABLE audio_assets 
ADD COLUMN prefetch_hint INTEGER,
ADD COLUMN crossfade_start FLOAT,
ADD COLUMN crossfade_end FLOAT;

-- Index for fast prefetch queries
CREATE INDEX idx_chunk_prefetch 
ON chunk_relationships(book_id, chunk_index, next_chunk);
```

---

## 🛡️ SAFETY MEASURES

### Rollback Plan:
1. **Feature flags** for each optimization:
   ```typescript
   const FEATURE_FLAGS = {
     removeAutoAdvanceDelays: true,
     enablePrefetch: true,
     enableMemoryCache: true,
     enableBulkQueries: true
   };
   ```

2. **Monitoring** during rollout:
   - Track chunk transition times
   - Monitor memory usage
   - Log any playback errors
   - User feedback collection

3. **Quick revert** if issues:
   - Git tags before each phase
   - Database migrations reversible
   - Feature flags can disable instantly

---

## 📊 SUCCESS METRICS

### Current State:
- Chunk transitions: 3-5 seconds
- User experience: Broken flow
- Auto-advance: 1300ms+ delays

### Target State (Phase 1-2):
- Chunk transitions: <500ms
- User experience: Noticeable improvement
- Auto-advance: Immediate

### Future State (Phase 4):
- Chunk transitions: <100ms
- User experience: Seamless like Speechify
- Auto-advance: Imperceptible

---

## 🎯 IMPLEMENTATION PRIORITY

### Week 1:
1. **Day 1**: Phase 1 - Remove delays (1 hour)
2. **Day 2**: Phase 2 Steps 1-2 - Animation & prefetch (3 hours)
3. **Day 3**: Phase 2 Steps 3-4 - Cache & queries (4 hours)
4. **Day 4**: Testing & validation (2 hours)
5. **Day 5**: Apply to all enhanced books (2 hours)

### Week 2:
1. Update audio generation templates
2. Test with new book generation
3. Document best practices
4. Monitor production metrics

---

## ⚠️ CRITICAL REMINDERS

From `/docs/archived/AUDIO_PATH_CONFLICT_PREVENTION.md`:

1. **ALWAYS use book-specific paths**:
   ```typescript
   // ✅ CORRECT
   const path = `${bookId}/${level}/chunk_${index}.mp3`;
   
   // ❌ WRONG (causes overwrites)
   const path = `${level}/chunk_${index}.mp3`;
   ```

2. **Test before bulk generation**:
   - Generate one chunk first
   - Verify correct audio plays
   - Then proceed with full book

3. **Verify paths in database**:
   ```sql
   -- Check all paths include book ID
   SELECT COUNT(*) FROM audio_assets 
   WHERE audio_url NOT LIKE '%gutenberg-%';
   -- Should return 0
   ```

---

This plan provides safe, incremental improvements for current books while establishing best practices for future generation. Start with Phase 1 for immediate impact.