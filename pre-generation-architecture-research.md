# TTS Pre-Generation Architecture Research for BookBridge

## Executive Summary

This document presents research findings and architectural recommendations for implementing a scalable TTS pre-generation system for BookBridge's enhanced books. The proposed architecture addresses the current limitations of progressive audio generation (slow and expensive) by implementing a comprehensive pre-generation pipeline that supports multiple CEFR levels and voice providers.

## 1. Industry Best Practices Research

### 1.1 How Major Platforms Handle Pre-Generated Audio

#### **Speechify**
- **Architecture**: Hybrid cloud/on-premise deployment options
- **Scale**: Powers billions of words generated per week
- **Key Features**:
  - API-based scaling with multiple tiers
  - On-premise options for security/compliance needs
  - Consumer app focus with cloud-based infrastructure

#### **Audible**
- **Architecture**: Large-scale pre-generation with professional narration
- **Storage**: Distributed CDN for global delivery
- **Key Features**:
  - Chapter-level segmentation
  - Multiple quality tiers (standard/high)
  - Offline download support

#### **ReadSpeaker**
- **Architecture**: Flexible deployment (cloud, on-premise, embedded)
- **Key Features**:
  - Multi-threaded TTS sessions
  - Private server deployment options
  - SDK for embedded devices
  - speechCloud API for dynamic generation

### 1.2 Technical Architecture Components

Modern TTS systems utilize:
- **Deep Neural Networks**: For understanding phonemes and generating spectrograms
- **VITS (Variational Inference with adversarial learning for end-to-end Text-to-Speech)**: State-of-the-art approach for natural speech
- **Concatenative TTS**: High-quality but computationally intensive
- **Statistical Parametric TTS**: Mathematical models simulating vocal tract

## 2. Optimal Chunking Strategy Analysis

### 2.1 Research Findings

Based on analysis of Deepgram, OpenAI, and industry best practices:

#### **Sentence-Level Chunking** (RECOMMENDED)
- **Pros**:
  - Preserves natural speech patterns
  - Optimal for time-to-first-byte latency
  - Natural pause points align with human speech
  - Best balance between quality and performance
- **Cons**:
  - More storage overhead
  - More API calls required
- **Implementation**: Split at `.`, `?`, `!`, `;` boundaries

#### **Paragraph-Level Chunking**
- **Pros**:
  - Fewer API calls
  - Better context preservation
  - Lower storage overhead
- **Cons**:
  - Higher initial latency
  - Less flexible for progressive playback
  - Risk of choppy audio at artificial breaks

#### **Chapter-Level Chunking**
- **Pros**:
  - Minimal API calls
  - Best audio continuity
- **Cons**:
  - Very high latency
  - Large storage requirements
  - Poor user experience for initial load

### 2.2 Recommended Approach

**Hybrid Sentence-Based Strategy with Smart Grouping**:
```
- Target chunk size: 10-25 words per audio segment
- Maximum chunk size: 140-250 characters (model-dependent)
- Grouping logic: Combine short sentences up to 25 words
- Split long sentences at clause boundaries if >30 words
- Never split mid-sentence (causes choppy audio)
```

## 3. Multiple Voice Provider Architecture

### 3.1 Storage Strategy

#### **Unified Storage Schema**
```typescript
interface AudioAsset {
  id: string;
  bookId: string;
  cefrLevel: string;
  chunkIndex: number;
  sentenceIndex: number;
  provider: 'openai' | 'elevenlabs';
  voiceId: string;
  audioUrl: string;
  audioBlob?: Buffer;
  duration: number;
  wordTimings: WordTiming[];
  fileSize: number;
  format: 'mp3' | 'wav';
  createdAt: Date;
  expiresAt: Date;
}
```

#### **Cache Key Generation**
```typescript
function generateCacheKey(params: {
  bookId: string;
  cefrLevel: string;
  chunkIndex: number;
  sentenceIndex: number;
  provider: string;
  voiceId: string;
}): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(params))
    .digest('hex');
}
```

### 3.2 Provider-Specific Considerations

#### **OpenAI TTS**
- Latency: ~200ms TTFA
- Pricing: ~$0.015/minute
- Formats: mp3, opus, aac, flac
- Max input: 4096 characters
- Voices: 6 options (alloy, echo, fable, onyx, nova, shimmer)

#### **ElevenLabs**
- Latency: ~150ms TTFA (Flash v2.5: 75ms)
- Pricing: ~$0.10/minute (higher quality)
- Formats: mp3, pcm, μ-law
- Better voice cloning and emotional range
- More natural variability in repeated text

## 4. Pre-Generation Workflow Architecture

### 4.1 Triggering Strategies

#### **Option 1: On-Upload Pre-Generation** (RECOMMENDED)
```typescript
async function onBookUpload(bookId: string) {
  // 1. Process book into chunks
  await processBookChunks(bookId);
  
  // 2. Queue pre-generation for default CEFR level (B2)
  await queuePreGeneration(bookId, 'B2', 'high');
  
  // 3. Queue other levels with lower priority
  for (const level of ['A1', 'A2', 'B1', 'C1', 'C2']) {
    await queuePreGeneration(bookId, level, 'background');
  }
}
```

**Pros**:
- Best user experience (audio ready on first access)
- Predictable costs
- Can optimize during off-peak hours

**Cons**:
- Higher upfront costs
- May generate unused audio

#### **Option 2: On-First-Access Generation**
```typescript
async function onFirstAccess(bookId: string, cefrLevel: string) {
  // Check if audio exists
  const exists = await checkAudioExists(bookId, cefrLevel);
  
  if (!exists) {
    // Generate first chunk immediately
    await generateChunk(bookId, cefrLevel, 0, 'urgent');
    
    // Queue remaining chunks
    await queueRemainingChunks(bookId, cefrLevel, 'high');
  }
}
```

**Pros**:
- Cost-efficient (only generate what's used)
- Adaptive to actual usage patterns

**Cons**:
- Initial latency for users
- Unpredictable load spikes

#### **Option 3: Hybrid Approach** (BEST BALANCE)
```typescript
async function hybridStrategy(bookId: string) {
  // 1. Pre-generate first 3 chapters for popular CEFR levels
  const popularLevels = ['B1', 'B2'];
  for (const level of popularLevels) {
    await preGenerateChapters(bookId, level, [0, 1, 2], 'high');
  }
  
  // 2. Use predictive pre-generation based on user behavior
  scheduleJob('0 2 * * *', async () => {
    const predictions = await analyzeUsagePatterns();
    await preGenerateBasedOnPredictions(predictions);
  });
}
```

### 4.2 Background Job Processing

#### **Queue Architecture**
```typescript
interface PreGenerationJob {
  id: string;
  bookId: string;
  cefrLevel: string;
  chunkIndex: number;
  sentenceIndices: number[];
  provider: 'openai' | 'elevenlabs';
  voiceId: string;
  priority: 'urgent' | 'high' | 'normal' | 'background';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  createdAt: Date;
  processingStartedAt?: Date;
  completedAt?: Date;
}
```

#### **Worker Implementation**
```typescript
class TTSWorker {
  async processJob(job: PreGenerationJob) {
    try {
      // 1. Fetch text content
      const content = await getChunkContent(
        job.bookId, 
        job.cefrLevel, 
        job.chunkIndex
      );
      
      // 2. Split into sentences
      const sentences = splitIntoSentences(content);
      
      // 3. Generate audio for each sentence
      for (const sentenceIndex of job.sentenceIndices) {
        const audio = await generateAudio(
          sentences[sentenceIndex],
          job.provider,
          job.voiceId
        );
        
        // 4. Store in database
        await storeAudioAsset({
          ...job,
          sentenceIndex,
          audioBlob: audio.blob,
          duration: audio.duration,
          wordTimings: audio.timings
        });
      }
      
      // 5. Update job status
      await updateJobStatus(job.id, 'completed');
      
    } catch (error) {
      await handleJobError(job, error);
    }
  }
}
```

## 5. CEFR Level Variation Handling

### 5.1 Storage Optimization

#### **Differential Storage**
Instead of storing complete audio for each CEFR level, store:
1. Base audio (original text)
2. Diff segments for simplified versions

```typescript
interface CEFRDiffSegment {
  cefrLevel: string;
  originalRange: [startWord: number, endWord: number];
  simplifiedAudio: AudioAsset;
}
```

### 5.2 Generation Strategy

```typescript
async function generateCEFRVariations(bookId: string, chunkIndex: number) {
  // 1. Generate original audio first
  const originalAudio = await generateAudio(bookId, 'original', chunkIndex);
  
  // 2. For each CEFR level, identify changed segments
  for (const level of CEFR_LEVELS) {
    const diffs = await identifyTextDifferences(
      originalText, 
      simplifiedText[level]
    );
    
    // 3. Generate audio only for changed segments
    for (const diff of diffs) {
      if (diff.changeRatio > 0.3) { // Significant change
        await generateAudioSegment(bookId, level, diff);
      }
    }
  }
}
```

## 6. Integration with BookBridge Infrastructure

### 6.1 Database Schema Updates

```sql
-- Audio assets table
CREATE TABLE audio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id),
  cefr_level VARCHAR(10) NOT NULL,
  chunk_index INTEGER NOT NULL,
  sentence_index INTEGER NOT NULL,
  provider VARCHAR(20) NOT NULL,
  voice_id VARCHAR(50) NOT NULL,
  cache_key VARCHAR(64) UNIQUE NOT NULL,
  audio_url TEXT,
  audio_blob BYTEA,
  duration FLOAT NOT NULL,
  word_timings JSONB NOT NULL,
  file_size INTEGER NOT NULL,
  format VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(book_id, cefr_level, chunk_index, sentence_index, provider, voice_id)
);

-- Pre-generation queue
CREATE TABLE pre_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id),
  cefr_level VARCHAR(10) NOT NULL,
  chunk_index INTEGER NOT NULL,
  priority VARCHAR(20) NOT NULL,
  provider VARCHAR(20) NOT NULL,
  voice_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX idx_audio_assets_lookup ON audio_assets(book_id, cefr_level, chunk_index);
CREATE INDEX idx_audio_assets_cache ON audio_assets(cache_key);
CREATE INDEX idx_pre_gen_queue_status ON pre_generation_queue(status, priority, created_at);
```

### 6.2 API Endpoints

```typescript
// Pre-generation management
POST   /api/books/{bookId}/pregenerate
GET    /api/books/{bookId}/pregeneration-status
DELETE /api/books/{bookId}/pregeneration

// Audio retrieval
GET    /api/books/{bookId}/audio?cefrLevel={level}&chunk={index}&voice={voiceId}
GET    /api/books/{bookId}/audio/manifest?cefrLevel={level}

// Cache management
POST   /api/audio/cache/warmup
DELETE /api/audio/cache/expire
GET    /api/audio/cache/stats
```

### 6.3 Integration Points

1. **Book Upload Service**
   - Trigger pre-generation queue
   - Extract text for all CEFR levels
   - Calculate estimated costs

2. **Progressive Audio Player**
   - Check pre-generated cache first
   - Fallback to on-demand generation
   - Prefetch next chunks

3. **Background Worker Service**
   - Process pre-generation queue
   - Handle retries and failures
   - Monitor API rate limits

## 7. Performance Optimizations

### 7.1 Caching Strategy

```typescript
class AudioCacheService {
  private readonly layers = {
    memory: new MemoryCache({ maxSize: '1GB', ttl: '1h' }),
    redis: new RedisCache({ ttl: '24h' }),
    cdn: new CDNCache({ ttl: '30d' }),
    database: new DatabaseCache({ ttl: '90d' })
  };
  
  async getAudio(key: string): Promise<AudioAsset | null> {
    // Check each layer in order
    for (const [name, cache] of Object.entries(this.layers)) {
      const result = await cache.get(key);
      if (result) {
        // Promote to faster layers
        await this.promoteToFasterLayers(name, key, result);
        return result;
      }
    }
    return null;
  }
}
```

### 7.2 CDN Integration

- Use CloudFront or similar CDN for audio delivery
- Implement edge caching for frequently accessed content
- Use signed URLs for security
- Implement progressive download for large files

### 7.3 Batch Processing

```typescript
async function batchGenerateAudio(
  sentences: string[], 
  provider: string, 
  voiceId: string
) {
  const BATCH_SIZE = 10;
  const results = [];
  
  for (let i = 0; i < sentences.length; i += BATCH_SIZE) {
    const batch = sentences.slice(i, i + BATCH_SIZE);
    
    // Parallel generation within batch
    const batchResults = await Promise.all(
      batch.map(text => generateAudioWithRetry(text, provider, voiceId))
    );
    
    results.push(...batchResults);
    
    // Rate limiting between batches
    await sleep(1000);
  }
  
  return results;
}
```

## 8. Cost Analysis and Optimization

### 8.1 Cost Breakdown

```typescript
interface CostEstimate {
  provider: string;
  pricePerMinute: number;
  estimatedMinutes: number;
  totalCost: number;
}

function estimateBookCost(book: Book): CostEstimate[] {
  const wordCount = book.wordCount;
  const avgReadingSpeed = 150; // words per minute
  const estimatedMinutes = wordCount / avgReadingSpeed;
  
  return [
    {
      provider: 'openai',
      pricePerMinute: 0.015,
      estimatedMinutes,
      totalCost: estimatedMinutes * 0.015 * 6 // 6 CEFR levels
    },
    {
      provider: 'elevenlabs',
      pricePerMinute: 0.10,
      estimatedMinutes,
      totalCost: estimatedMinutes * 0.10 * 6
    }
  ];
}
```

### 8.2 Optimization Strategies

1. **Selective Pre-Generation**
   - Only pre-generate popular books
   - Focus on frequently accessed CEFR levels
   - Use analytics to predict usage

2. **Voice Provider Selection**
   - Use OpenAI for general content (cost-effective)
   - Use ElevenLabs for premium/featured content
   - Implement user choice for premium subscribers

3. **Expiration Policies**
   - Expire unused audio after 90 days
   - Keep popular content cached longer
   - Implement LRU eviction for storage limits

## 9. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema implementation
- [ ] Basic pre-generation queue
- [ ] Audio storage service
- [ ] Cache key generation

### Phase 2: Core Features (Week 3-4)
- [ ] Background worker implementation
- [ ] Multi-provider support
- [ ] Sentence-based chunking
- [ ] Basic API endpoints

### Phase 3: Optimization (Week 5-6)
- [ ] Multi-layer caching
- [ ] CDN integration
- [ ] Batch processing
- [ ] Cost tracking

### Phase 4: Advanced Features (Week 7-8)
- [ ] CEFR differential storage
- [ ] Predictive pre-generation
- [ ] Analytics integration
- [ ] Admin dashboard

## 10. Monitoring and Maintenance

### 10.1 Key Metrics
```typescript
interface PreGenerationMetrics {
  totalAudioGenerated: number;
  cacheHitRate: number;
  avgGenerationTime: number;
  costPerBook: number;
  storageUsage: number;
  queueBacklog: number;
  failureRate: number;
}
```

### 10.2 Alerting Rules
- Queue backlog > 1000 jobs
- Cache hit rate < 80%
- Generation failure rate > 5%
- Storage usage > 80% capacity
- API rate limit approaching

## Conclusion

The proposed pre-generation architecture provides a scalable, cost-effective solution for BookBridge's TTS needs. By implementing a hybrid approach with intelligent caching, multiple provider support, and optimized chunking strategies, the system can deliver high-quality audio with minimal latency while managing costs effectively.

Key recommendations:
1. Start with sentence-based chunking for optimal performance
2. Implement a hybrid pre-generation strategy (popular content + on-demand)
3. Use multi-layer caching to minimize costs
4. Support multiple providers with intelligent routing
5. Build comprehensive monitoring from day one

This architecture will significantly improve user experience while providing the flexibility to scale with BookBridge's growth.