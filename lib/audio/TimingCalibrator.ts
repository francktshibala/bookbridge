export class TimingCalibrator {
  private samples: Array<{ expected: number; actual: number }> = [];
  private readonly maxSamples = 20;
  private readonly minSamples = 5;
  private baseOffset: number;
  private bookSpecificOffsets: Map<string, number> = new Map();

  constructor(initialOffset: number = 0.30) {
    this.baseOffset = initialOffset;
    this.loadFromStorage();
  }

  // Record a timing sample
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

  // Set book-specific offset
  setBookOffset(bookId: string, offset: number) {
    this.bookSpecificOffsets.set(bookId, offset);
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

  // Manual adjustment by user
  adjustOffset(delta: number) {
    this.baseOffset = Math.max(0.05, Math.min(0.5, this.baseOffset + delta));
    this.samples = []; // Reset samples after manual adjustment
    this.saveToStorage();
  }

  // Reset calibration
  reset() {
    this.samples = [];
    this.baseOffset = 0.30; // Align with InstantAudioPlayer default
    this.bookSpecificOffsets.clear();
    this.saveToStorage();
  }

  // Persistence
  private saveToStorage() {
    if (typeof window !== 'undefined') {
      const data = {
        baseOffset: this.baseOffset,
        samples: this.samples.slice(-10), // Keep only last 10 samples
        bookOffsets: Array.from(this.bookSpecificOffsets.entries()),
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
            this.baseOffset = data.baseOffset || 0.25;
            this.samples = data.samples || [];
            this.bookSpecificOffsets = new Map(data.bookOffsets || []);

            console.log(`📊 Loaded calibration: offset=${(this.baseOffset * 1000).toFixed(0)}ms, ${this.samples.length} samples`);
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
      sampleCount: this.samples.length,
      confidence: this.getConfidence(),
      bookSpecificOffsets: Array.from(this.bookSpecificOffsets.entries()),
      recentSamples: this.samples.slice(-5)
    };
  }
}