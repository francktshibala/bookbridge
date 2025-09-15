export class TimingCalibrator {
  private samples: Array<{ expected: number; actual: number }> = [];
  private sentenceSamples: Array<{ expected: number; actual: number }> = [];
  private readonly maxSamples = 20;
  private readonly minSamples = 5;
  private baseOffset: number;
  private sentenceBaseOffset: number;
  private bookSpecificOffsets: Map<string, number> = new Map();
  private bookSpecificSentenceOffsets: Map<string, number> = new Map();

  constructor(initialOffset: number = 0.30) {
    this.baseOffset = initialOffset;
    this.sentenceBaseOffset = initialOffset; // Initialize sentence timing with same default
    this.loadFromStorage();
  }

  // Record a timing sample (for word-level highlighting)
  recordSample(expectedTime: number, actualTime: number) {
    this.samples.push({ expected: expectedTime, actual: actualTime });

    // Keep only recent samples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    // Auto-save calibration after enough samples
    if (this.samples.length >= this.minSamples && this.samples.length % 5 === 0) {
      this.saveToStorage();
    }
  }

  // Record a sentence timing sample (for sentence-level auto-scroll)
  recordSentenceSample(expectedTime: number, actualTime: number) {
    this.sentenceSamples.push({ expected: expectedTime, actual: actualTime });

    // Keep only recent samples
    if (this.sentenceSamples.length > this.maxSamples) {
      this.sentenceSamples.shift();
    }

    // Auto-save calibration after enough samples
    if (this.sentenceSamples.length >= this.minSamples && this.sentenceSamples.length % 5 === 0) {
      this.saveToStorage();
    }
  }

  // Calculate optimal offset based on collected samples
  getOptimalOffset(bookId?: string): number {
    // Check for book-specific offset first
    if (bookId && this.bookSpecificOffsets.has(bookId)) {
      return this.bookSpecificOffsets.get(bookId)!;
    }

    // Need minimum samples for calibration
    if (this.samples.length < this.minSamples) {
      return this.baseOffset;
    }

    // Calculate average delay between expected and actual
    const deltas = this.samples.map(s => s.actual - s.expected);

    // Remove outliers (top and bottom 10%)
    const sorted = [...deltas].sort((a, b) => a - b);
    const trimCount = Math.floor(sorted.length * 0.1);
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

    // Calculate trimmed mean
    const avgDelta = trimmed.reduce((sum, d) => sum + d, 0) / trimmed.length;

    // Apply bounds to prevent extreme offsets
    const calibratedOffset = Math.max(0.05, Math.min(0.5, this.baseOffset + avgDelta));

    console.log(`📊 Calibration: ${this.samples.length} samples, avg delta: ${(avgDelta * 1000).toFixed(0)}ms, offset: ${(calibratedOffset * 1000).toFixed(0)}ms`);

    return calibratedOffset;
  }

  // Calculate optimal sentence offset based on collected sentence samples
  getOptimalSentenceOffset(bookId?: string): number {
    // Check for book-specific sentence offset first
    if (bookId && this.bookSpecificSentenceOffsets.has(bookId)) {
      return this.bookSpecificSentenceOffsets.get(bookId)!;
    }

    // Need minimum samples for calibration
    if (this.sentenceSamples.length < this.minSamples) {
      return this.sentenceBaseOffset;
    }

    // Calculate average delay between expected and actual for sentences
    const deltas = this.sentenceSamples.map(s => s.actual - s.expected);

    // Remove outliers (top and bottom 10%)
    const sorted = [...deltas].sort((a, b) => a - b);
    const trimCount = Math.floor(sorted.length * 0.1);
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

    // Calculate trimmed mean
    const avgDelta = trimmed.reduce((sum, d) => sum + d, 0) / trimmed.length;

    // Apply bounds to prevent extreme offsets
    const calibratedOffset = Math.max(0.05, Math.min(0.5, this.sentenceBaseOffset + avgDelta));

    console.log(`📊 Sentence Calibration: ${this.sentenceSamples.length} samples, avg delta: ${(avgDelta * 1000).toFixed(0)}ms, offset: ${(calibratedOffset * 1000).toFixed(0)}ms`);

    return calibratedOffset;
  }

  // Set book-specific offset
  setBookOffset(bookId: string, offset: number) {
    this.bookSpecificOffsets.set(bookId, offset);
    this.saveToStorage();
  }

  // Set book-specific sentence offset
  setBookSentenceOffset(bookId: string, offset: number) {
    this.bookSpecificSentenceOffsets.set(bookId, offset);
    this.saveToStorage();
  }

  // Get confidence score (0-1) for current calibration
  getConfidence(): number {
    if (this.samples.length < this.minSamples) {
      return 0;
    }

    // Calculate standard deviation of deltas
    const deltas = this.samples.map(s => s.actual - s.expected);
    const mean = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
    const variance = deltas.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / deltas.length;
    const stdDev = Math.sqrt(variance);

    // Lower std dev = higher confidence
    // Map stdDev of 0-0.2 to confidence of 1-0
    const confidence = Math.max(0, Math.min(1, 1 - (stdDev * 5)));

    return confidence;
  }

  // Get confidence score (0-1) for sentence calibration
  getSentenceConfidence(): number {
    if (this.sentenceSamples.length < this.minSamples) {
      return 0;
    }

    // Calculate standard deviation of sentence deltas
    const deltas = this.sentenceSamples.map(s => s.actual - s.expected);
    const mean = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
    const variance = deltas.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / deltas.length;
    const stdDev = Math.sqrt(variance);

    // Lower std dev = higher confidence
    // Map stdDev of 0-0.2 to confidence of 1-0
    const confidence = Math.max(0, Math.min(1, 1 - (stdDev * 5)));

    return confidence;
  }

  // Manual adjustment by user
  adjustOffset(delta: number) {
    this.baseOffset = Math.max(0.05, Math.min(0.5, this.baseOffset + delta));
    this.samples = []; // Reset samples after manual adjustment
    this.saveToStorage();
  }

  // Manual adjustment for sentence offset
  adjustSentenceOffset(delta: number) {
    this.sentenceBaseOffset = Math.max(0.05, Math.min(0.5, this.sentenceBaseOffset + delta));
    this.sentenceSamples = []; // Reset sentence samples after manual adjustment
    this.saveToStorage();
  }

  // Reset calibration
  reset() {
    this.samples = [];
    this.sentenceSamples = [];
    this.baseOffset = 0.30; // Align with InstantAudioPlayer default
    this.sentenceBaseOffset = 0.30;
    this.bookSpecificOffsets.clear();
    this.bookSpecificSentenceOffsets.clear();
    this.saveToStorage();
  }

  // Persistence
  private saveToStorage() {
    if (typeof window !== 'undefined') {
      const data = {
        baseOffset: this.baseOffset,
        sentenceBaseOffset: this.sentenceBaseOffset,
        samples: this.samples.slice(-10), // Keep only last 10 samples
        sentenceSamples: this.sentenceSamples.slice(-10),
        bookOffsets: Array.from(this.bookSpecificOffsets.entries()),
        bookSentenceOffsets: Array.from(this.bookSpecificSentenceOffsets.entries()),
        timestamp: Date.now()
      };
      localStorage.setItem('audio-timing-calibration', JSON.stringify(data));
    }
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('audio-timing-calibration');
      if (stored) {
        try {
          const data = JSON.parse(stored);

          // Only use data if it's less than 7 days old
          if (data.timestamp && Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
            this.baseOffset = data.baseOffset || 0.30;
            this.sentenceBaseOffset = data.sentenceBaseOffset || 0.30;
            this.samples = data.samples || [];
            this.sentenceSamples = data.sentenceSamples || [];
            this.bookSpecificOffsets = new Map(data.bookOffsets || []);
            this.bookSpecificSentenceOffsets = new Map(data.bookSentenceOffsets || []);

            console.log(`📊 Loaded calibration: word offset=${(this.baseOffset * 1000).toFixed(0)}ms (${this.samples.length} samples), sentence offset=${(this.sentenceBaseOffset * 1000).toFixed(0)}ms (${this.sentenceSamples.length} samples)`);
          }
        } catch (e) {
          console.error('Failed to load calibration data:', e);
        }
      }
    }
  }

  // Get diagnostic info
  getDiagnostics() {
    return {
      baseOffset: this.baseOffset,
      sentenceBaseOffset: this.sentenceBaseOffset,
      sampleCount: this.samples.length,
      sentenceSampleCount: this.sentenceSamples.length,
      confidence: this.getConfidence(),
      sentenceConfidence: this.getSentenceConfidence(),
      bookSpecificOffsets: Array.from(this.bookSpecificOffsets.entries()),
      bookSpecificSentenceOffsets: Array.from(this.bookSpecificSentenceOffsets.entries()),
      recentSamples: this.samples.slice(-5),
      recentSentenceSamples: this.sentenceSamples.slice(-5)
    };
  }
}