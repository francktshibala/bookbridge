/**
 * Audio Pre-Generation Service for BookBridge Enhanced Books
 * Handles bulk audio generation for all CEFR levels and voices
 */

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
  fileSize: number;
  format: string;
  wordTimings: WordTimingData;
  cacheKey: string;
  createdAt: Date;
  expiresAt: Date;
}

interface WordTimingData {
  words: WordTiming[];
  method: string;
  accuracy: number;
  generatedAt: string;
}

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  wordIndex: number;
  confidence: number;
}

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
  errorMessage?: string;
  estimatedCostCents?: number;
  actualCostCents?: number;
}

export class AudioPreGenerationService {
  private static instance: AudioPreGenerationService;
  
  // Configuration
  private readonly CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  private readonly OPENAI_VOICES = ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'];
  private readonly ELEVENLABS_VOICES = ['eleven_jessica', 'eleven_adam', 'eleven_daniel'];
  
  // Popular combinations for priority generation
  private readonly POPULAR_COMBINATIONS = [
    { cefrLevel: 'B2', voiceId: 'nova', provider: 'openai' as const },
    { cefrLevel: 'B1', voiceId: 'nova', provider: 'openai' as const },
    { cefrLevel: 'B2', voiceId: 'eleven_jessica', provider: 'elevenlabs' as const },
  ];

  public static getInstance(): AudioPreGenerationService {
    if (!AudioPreGenerationService.instance) {
      AudioPreGenerationService.instance = new AudioPreGenerationService();
    }
    return AudioPreGenerationService.instance;
  }

  /**
   * Initialize pre-generation for a book (Pride & Prejudice)
   */
  async initializeBookPreGeneration(bookId: string, totalChunks: number): Promise<void> {
    console.log(`Starting pre-generation for book: ${bookId} with ${totalChunks} chunks`);
    
    // Check if book status already exists
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const existingStatus = await supabase
      .from('book_pregeneration_status')
      .select('id')
      .eq('book_id', bookId)
      .single();

    if (existingStatus.error && existingStatus.error.code !== 'PGRST116') {
      throw new Error(`Failed to check book status: ${existingStatus.error.message}`);
    }

    if (!existingStatus.data) {
      // Create book status entry only if it doesn't exist
      await this.createBookStatus(bookId, totalChunks);
      
      // Queue popular combinations first (urgent priority)
      await this.queuePopularCombinations(bookId, Math.min(totalChunks, 3)); // First 3 chunks
      
      // Queue remaining combinations (background priority)
      await this.queueAllCombinations(bookId, totalChunks);
    } else {
      console.log(`Book ${bookId} already initialized, skipping setup`);
    }
    
    console.log(`Pre-generation queued for ${bookId}`);
  }

  /**
   * Process the pre-generation queue (background worker)
   */
  async processQueue(): Promise<void> {
    const jobs = await this.getNextJobs(5); // Process 5 jobs at a time
    
    if (jobs.length === 0) {
      return; // No jobs to process
    }

    console.log(`Processing ${jobs.length} pre-generation jobs`);
    
    // Process jobs in parallel (but limit concurrency to avoid API rate limits)
    const promises = jobs.map(job => this.processJob(job));
    await Promise.allSettled(promises);
  }

  /**
   * Get pre-generated audio for instant playback
   */
  async getPreGeneratedAudio(
    bookId: string, 
    cefrLevel: string, 
    chunkIndex: number, 
    voiceId: string
  ): Promise<AudioAsset[] | null> {
    try {
      // Check database for pre-generated audio
      const cacheKey = this.generateCacheKey(bookId, cefrLevel, chunkIndex, voiceId);
      
      const response = await fetch(`/api/audio/pregenerated?cacheKey=${cacheKey}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.audioAssets || null;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get pre-generated audio:', error);
      return null;
    }
  }

  /**
   * Process a single pre-generation job
   */
  private async processJob(job: PreGenerationJob): Promise<void> {
    try {
      console.log(`Processing job: ${job.id} for ${job.bookId} ${job.cefrLevel} chunk ${job.chunkIndex}`);
      
      // Mark job as processing
      await this.updateJobStatus(job.id, 'processing');
      
      // Get chunk content for this CEFR level
      const chunkContent = await this.getChunkContent(job.bookId, job.cefrLevel, job.chunkIndex);
      
      if (!chunkContent) {
        throw new Error(`No content found for ${job.bookId} ${job.cefrLevel} chunk ${job.chunkIndex}`);
      }
      
      // Split into sentences
      const sentences = await this.splitIntoSentences(chunkContent);
      
      // Generate audio for each sentence
      const audioAssets: AudioAsset[] = [];
      let totalCost = 0;
      
      for (const sentenceIndex of job.sentenceIndices) {
        if (sentenceIndex >= sentences.length) continue;
        
        const sentence = sentences[sentenceIndex];
        const audioAsset = await this.generateSentenceAudio(
          job.bookId,
          job.cefrLevel,
          job.chunkIndex,
          sentenceIndex,
          sentence,
          job.provider,
          job.voiceId
        );
        
        audioAssets.push(audioAsset);
        totalCost += this.estimateGenerationCost(sentence, job.provider);
      }
      
      // Store all audio assets
      await this.storeAudioAssets(audioAssets);
      
      // Update job as completed (convert dollars to cents)
      await this.updateJobStatus(job.id, 'completed', Math.round(totalCost * 100));
      
      // Update book progress
      await this.updateBookProgress(job.bookId);
      
      console.log(`Completed job: ${job.id} - Generated ${audioAssets.length} audio files`);
      
    } catch (error) {
      console.error(`Failed to process job ${job.id}:`, error);
      
      // Mark job as failed and increment retry count
      await this.handleJobFailure(job, error as Error);
    }
  }

  /**
   * Generate audio for a single sentence with word timings
   */
  private async generateSentenceAudio(
    bookId: string,
    cefrLevel: string,
    chunkIndex: number,
    sentenceIndex: number,
    text: string,
    provider: 'openai' | 'elevenlabs',
    voiceId: string
  ): Promise<AudioAsset> {
    // Generate audio using TTS API
    const audioResult = await this.callTTSAPI(text, provider, voiceId);
    
    // Generate word timings
    const wordTimings = await this.generateWordTimings(text, audioResult.audioUrl, provider, voiceId);
    
    // Create cache key
    const cacheKey = this.generateCacheKey(bookId, cefrLevel, chunkIndex, voiceId, sentenceIndex);
    
    return {
      id: crypto.randomUUID(),
      bookId,
      cefrLevel,
      chunkIndex,
      sentenceIndex,
      provider,
      voiceId,
      audioUrl: audioResult.audioUrl,
      audioBlob: audioResult.audioBlob,
      duration: audioResult.duration,
      fileSize: audioResult.fileSize,
      format: 'mp3',
      wordTimings,
      cacheKey,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    };
  }

  /**
   * Call TTS API (OpenAI or ElevenLabs)
   */
  private async callTTSAPI(
    text: string, 
    provider: 'openai' | 'elevenlabs', 
    voiceId: string
  ): Promise<{ audioUrl: string; audioBlob: Buffer; duration: number; fileSize: number }> {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
    
    if (provider === 'openai') {
      const response = await fetch(`${baseUrl}/api/openai/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice: voiceId,
          speed: 1.0
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI TTS failed: ${response.statusText}`);
      }

      const audioBlob = Buffer.from(await response.arrayBuffer());
      const audioUrl = await this.uploadToStorage(audioBlob, 'mp3');
      const duration = await this.getAudioDuration(audioUrl);

      return {
        audioUrl,
        audioBlob,
        duration,
        fileSize: audioBlob.length
      };
    } else {
      // ElevenLabs implementation
      const response = await fetch(`${baseUrl}/api/elevenlabs/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice_id: voiceId.replace('eleven_', ''),
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
      }

      const audioBlob = Buffer.from(await response.arrayBuffer());
      const audioUrl = await this.uploadToStorage(audioBlob, 'mp3');
      const duration = await this.getAudioDuration(audioUrl);

      return {
        audioUrl,
        audioBlob,
        duration,
        fileSize: audioBlob.length
      };
    }
  }

  /**
   * Generate word timings using the word timing generator
   */
  private async generateWordTimings(
    text: string,
    audioUrl: string,
    provider: 'openai' | 'elevenlabs',
    voiceId: string
  ): Promise<WordTimingData> {
    try {
      const { wordTimingGenerator, WordTimingGenerator } = await import('./word-timing-generator');
      
      const timingProvider = WordTimingGenerator.getBestTimingMethod(voiceId);
      
      const result = await wordTimingGenerator.generateWordTimings({
        text,
        voiceId,
        provider: timingProvider,
        audioUrl
      });

      return {
        words: result.wordTimings.map(timing => ({
          ...timing,
          confidence: 0.8 // Add confidence property for pre-generated audio
        })),
        method: result.method,
        accuracy: typeof result.accuracy === 'string' ? 0.8 : result.accuracy,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Word timing generation failed, using fallback:', error);
      
      // Fallback to estimated timings
      const words = text.split(' ');
      const avgWordDuration = 0.6; // 600ms per word
      
      const wordTimings = words.map((word, index) => ({
        word: word.replace(/[.,!?]/g, ''),
        startTime: index * avgWordDuration,
        endTime: (index + 1) * avgWordDuration,
        wordIndex: index,
        confidence: 0.7
      }));

      return {
        words: wordTimings,
        method: 'estimated-fallback',
        accuracy: 0.7,
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Helper methods
   */
  private generateCacheKey(
    bookId: string,
    cefrLevel: string,
    chunkIndex: number,
    voiceId: string,
    sentenceIndex?: number
  ): string {
    const components = [bookId, cefrLevel, chunkIndex, voiceId];
    if (sentenceIndex !== undefined) {
      components.push(sentenceIndex.toString());
    }
    return Buffer.from(components.join('-')).toString('base64').slice(0, 64);
  }

  private async getChunkContent(bookId: string, cefrLevel: string, chunkIndex: number): Promise<string | null> {
    try {
      // Use the existing cached-simplification API
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/books/${bookId}/cached-simplification?level=${cefrLevel}&chunk=${chunkIndex}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Got content for ${bookId} ${cefrLevel} chunk ${chunkIndex}: ${data.content ? 'SUCCESS' : 'NO CONTENT'}`);
        return data.content;
      }
      console.log(`API response not ok for ${bookId} ${cefrLevel} chunk ${chunkIndex}: ${response.status}`);
      return null;
    } catch (error) {
      console.error('Failed to get chunk content:', error);
      return null;
    }
  }

  private async splitIntoSentences(text: string): Promise<string[]> {
    const { TextProcessor } = await import('./text-processor');
    const processedSentences = TextProcessor.splitIntoSentences(text);
    return processedSentences.map(s => s.text);
  }

  private async uploadToStorage(audioBlob: Buffer, format: string): Promise<string> {
    // TODO: Implement Cloudflare R2 upload
    // For now, create a data URL
    const base64 = audioBlob.toString('base64');
    return `data:audio/${format};base64,${base64}`;
  }

  private async getAudioDuration(audioUrl: string): Promise<number> {
    // TODO: Implement actual audio duration detection
    // For now, estimate based on content
    return 3.0; // 3 second fallback
  }

  private estimateGenerationCost(text: string, provider: 'openai' | 'elevenlabs'): number {
    const charCount = text.length;
    if (provider === 'openai') {
      return Math.ceil(charCount / 1000) * 1.5; // $0.015 per 1k chars in cents
    } else {
      return Math.ceil(charCount / 1000) * 16.5; // $0.165 per 1k chars in cents
    }
  }

  // Database operations
  private async createBookStatus(bookId: string, totalChunks: number): Promise<void> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const totalCombinations = this.CEFR_LEVELS.length * this.OPENAI_VOICES.length * totalChunks;
    
    const { error } = await supabase
      .from('book_pregeneration_status')
      .upsert({
        book_id: bookId,
        total_combinations: totalCombinations,
        status: 'pending',
        estimated_total_cost_cents: totalCombinations * 10,
        started_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to create book status: ${error.message}`);
    }
    
    console.log(`Created book status for ${bookId}: ${totalCombinations} combinations`);
  }

  private async queuePopularCombinations(bookId: string, chunkCount: number): Promise<void> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const jobs = [];
    
    // Queue urgent jobs for popular combinations in first few chunks
    for (let chunk = 0; chunk < chunkCount; chunk++) {
      for (const combo of this.POPULAR_COMBINATIONS) {
        jobs.push({
          book_id: bookId,
          cefr_level: combo.cefrLevel,
          chunk_index: chunk,
          sentence_indices: [0, 1, 2], // First 3 sentences
          provider: combo.provider,
          voice_id: combo.voiceId,
          priority: 'urgent',
          estimated_cost_cents: 9 // 3 sentences * ~$0.03
        });
      }
    }
    
    const { error } = await supabase
      .from('pre_generation_queue')
      .insert(jobs);
      
    if (error) {
      throw new Error(`Failed to queue popular combinations: ${error.message}`);
    }
    
    console.log(`Queued ${jobs.length} popular combinations for ${bookId}`);
  }

  private async queueAllCombinations(bookId: string, totalChunks: number): Promise<void> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const jobs = [];
    
    // Queue high priority for all combinations in first 3 chunks
    for (let chunk = 0; chunk < Math.min(3, totalChunks); chunk++) {
      for (const level of this.CEFR_LEVELS) {
        for (const voice of this.OPENAI_VOICES) {
          // Skip if already queued as popular
          const isPopular = this.POPULAR_COMBINATIONS.some(combo => 
            combo.cefrLevel === level && combo.voiceId === voice && combo.provider === 'openai'
          );
          if (isPopular) continue;
          
          jobs.push({
            book_id: bookId,
            cefr_level: level,
            chunk_index: chunk,
            sentence_indices: [0, 1, 2],
            provider: 'openai',
            voice_id: voice,
            priority: 'high',
            estimated_cost_cents: 9
          });
        }
      }
    }
    
    // Queue normal priority for remaining chunks with popular combinations
    for (let chunk = 3; chunk < totalChunks; chunk++) {
      for (const combo of this.POPULAR_COMBINATIONS) {
        jobs.push({
          book_id: bookId,
          cefr_level: combo.cefrLevel,
          chunk_index: chunk,
          sentence_indices: [0, 1, 2],
          provider: combo.provider,
          voice_id: combo.voiceId,
          priority: 'normal',
          estimated_cost_cents: 9
        });
      }
    }
    
    // Queue background priority for all remaining combinations
    for (let chunk = 3; chunk < totalChunks; chunk++) {
      for (const level of this.CEFR_LEVELS) {
        for (const voice of this.OPENAI_VOICES) {
          const isPopular = this.POPULAR_COMBINATIONS.some(combo => 
            combo.cefrLevel === level && combo.voiceId === voice && combo.provider === 'openai'
          );
          if (isPopular) continue;
          
          jobs.push({
            book_id: bookId,
            cefr_level: level,
            chunk_index: chunk,
            sentence_indices: [0, 1, 2],
            provider: 'openai',
            voice_id: voice,
            priority: 'background',
            estimated_cost_cents: 9
          });
        }
      }
    }
    
    // Insert in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      const { error } = await supabase
        .from('pre_generation_queue')
        .insert(batch);
        
      if (error) {
        throw new Error(`Failed to queue batch ${i}: ${error.message}`);
      }
    }
    
    console.log(`Queued ${jobs.length} total combinations for ${bookId}`);
  }

  private async getNextJobs(limit: number): Promise<PreGenerationJob[]> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data: jobs, error } = await supabase
      .from('pre_generation_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(limit);
      
    if (error) {
      throw new Error(`Failed to get next jobs: ${error.message}`);
    }
    
    return jobs?.map(job => ({
      id: job.id,
      bookId: job.book_id,
      cefrLevel: job.cefr_level,
      chunkIndex: job.chunk_index,
      sentenceIndices: job.sentence_indices,
      provider: job.provider as 'openai' | 'elevenlabs',
      voiceId: job.voice_id,
      priority: job.priority as 'urgent' | 'high' | 'normal' | 'background',
      status: job.status as 'pending' | 'processing' | 'completed' | 'failed',
      retryCount: job.retry_count || 0,
      errorMessage: job.error_message,
      estimatedCostCents: job.estimated_cost_cents,
      actualCostCents: job.actual_cost_cents
    })) || [];
  }

  private async updateJobStatus(jobId: string, status: string, costCents?: number): Promise<void> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const updates: any = { 
      status,
      ...(status === 'processing' && { processing_started_at: new Date().toISOString() }),
      ...(status === 'completed' && { completed_at: new Date().toISOString() }),
      ...(costCents && { actual_cost_cents: costCents })
    };
    
    const { error } = await supabase
      .from('pre_generation_queue')
      .update(updates)
      .eq('id', jobId);
      
    if (error) {
      throw new Error(`Failed to update job status: ${error.message}`);
    }
    
    console.log(`Job ${jobId} status: ${status}`);
  }

  private async handleJobFailure(job: PreGenerationJob, error: Error): Promise<void> {
    // TODO: Implement retry logic and failure handling
    console.error(`Job ${job.id} failed:`, error.message);
  }

  private async storeAudioAssets(audioAssets: AudioAsset[]): Promise<void> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const records = audioAssets.map(asset => ({
      book_id: asset.bookId,
      cefr_level: asset.cefrLevel,
      chunk_index: asset.chunkIndex,
      sentence_index: asset.sentenceIndex,
      provider: asset.provider,
      voice_id: asset.voiceId,
      audio_url: asset.audioUrl,
      duration: asset.duration,
      file_size: asset.fileSize,
      format: asset.format,
      word_timings: asset.wordTimings,
      cache_key: asset.cacheKey,
      expires_at: asset.expiresAt.toISOString()
    }));
    
    const { error } = await supabase
      .from('audio_assets')
      .upsert(records, {
        onConflict: 'book_id,cefr_level,chunk_index,sentence_index,provider,voice_id'
      });
      
    if (error) {
      throw new Error(`Failed to store audio assets: ${error.message}`);
    }
    
    console.log(`Stored ${audioAssets.length} audio assets`);
  }

  private async updateBookProgress(bookId: string): Promise<void> {
    // TODO: Implement progress calculation and update
    console.log(`Updating progress for book ${bookId}`);
  }
}

// Export singleton instance
export const audioPreGenerationService = AudioPreGenerationService.getInstance();