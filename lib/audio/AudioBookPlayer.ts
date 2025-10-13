import { BundleAudioManager, type BundleData } from '@/lib/audio/BundleAudioManager'
import { readingPositionService, type ReadingPosition, calculateCompletionPercentage } from '@/lib/services/reading-position'

export interface GlobalSentencePosition {
  sentenceIndex: number
  bundleIndex: number
  scaledStart: number
  scaledEnd: number
}

export interface AudioBookPlayerOptions {
  highlightLeadMs?: number
  preloadRadius?: number // how many neighbor bundles to preload
  debug?: boolean
  bookId?: string // Required for position tracking
  onPositionUpdate?: (position: ReadingPosition) => void
}

export class AudioBookPlayer {
  private bundles: BundleData[]
  private manager: BundleAudioManager
  private sentenceMap: Map<number, GlobalSentencePosition> = new Map()
  private preloadRadius: number
  private debug: boolean
  private currentOperationToken: number = 0

  // Position tracking
  private bookId: string | null = null
  private onPositionUpdate?: (position: ReadingPosition) => void
  private currentPosition: ReadingPosition | null = null
  private lastSavedPosition: number = 0
  private totalSentences: number = 0

  constructor(bundles: BundleData[], options: AudioBookPlayerOptions = {}) {
    const lead = typeof options.highlightLeadMs === 'number' ? options.highlightLeadMs : -500
    this.manager = new BundleAudioManager({ highlightLeadMs: lead })
    this.bundles = bundles
    this.preloadRadius = typeof options.preloadRadius === 'number' ? options.preloadRadius : 1
    this.debug = !!options.debug

    // Position tracking setup
    this.bookId = options.bookId || null
    this.onPositionUpdate = options.onPositionUpdate
    this.totalSentences = this.bundles.reduce((total, bundle) => total + bundle.sentences.length, 0)

    this.buildSentenceMap()
    this.setupPositionTracking()
  }

  private buildSentenceMap() {
    this.sentenceMap.clear()
    this.bundles.forEach((bundle, bIndex) => {
      const scale = this.estimateScale(bundle)
      bundle.sentences.forEach(s => {
        this.sentenceMap.set(s.sentenceIndex, {
          sentenceIndex: s.sentenceIndex,
          bundleIndex: bIndex,
          scaledStart: s.startTime * scale,
          scaledEnd: s.endTime * scale
        })
      })
    })
    if (this.debug) console.log(`AudioBookPlayer: built global map for ${this.sentenceMap.size} sentences`)
  }

  private estimateScale(bundle: BundleData): number {
    const meta = Math.max(...bundle.sentences.map(s => s.endTime)) || bundle.totalDuration || 1
    const real = bundle.totalDuration || meta
    // Clamp scale to [0.85, 1.10]
    const scale = Math.min(1.10, Math.max(0.85, real / meta))
    return scale
  }

  /** Jump to a sentence index instantly - handles cross-bundle jumps */
  async jumpToSentence(targetIndex: number): Promise<void> {
    // Generate operation token to prevent race conditions
    const operationToken = ++this.currentOperationToken
    console.log(`🎯 Jump operation ${operationToken}: targeting sentence ${targetIndex}`)

    const pos = this.sentenceMap.get(targetIndex)
    if (!pos) throw new Error(`Sentence ${targetIndex} not found in global map`)

    const targetBundle = this.bundles[pos.bundleIndex]

    // Check if we need to switch bundles
    const currentBundle = this.manager.getCurrentBundle()
    const needsBundleSwitch = !currentBundle || currentBundle.bundleIndex !== targetBundle.bundleIndex

    // ALWAYS stop current playback first to prevent audio overlap
    this.manager.stop()

    if (needsBundleSwitch) {
      console.log(`🔄 Cross-bundle jump (op ${operationToken}): ${currentBundle?.bundleIndex || 'none'} → ${targetBundle.bundleIndex}`)

      // Check if this operation is still the latest before proceeding
      if (this.currentOperationToken !== operationToken) {
        console.log(`❌ Operation ${operationToken} cancelled - newer operation in progress`)
        return
      }

      // Load new bundle and seek to target sentence
      await this.manager.playSequentialSentences(targetBundle, targetIndex)

      // Final check after async operation
      if (this.currentOperationToken !== operationToken) {
        console.log(`❌ Operation ${operationToken} cancelled after load - newer operation completed`)
        return
      }
    } else {
      console.log(`⚡ Same-bundle jump (op ${operationToken}): seeking to sentence ${targetIndex}`)

      // Same bundle - seek to target sentence and resume playback
      await this.manager.playSequentialSentences(targetBundle, targetIndex)
    }

    console.log(`✅ Jump operation ${operationToken} completed`)
  }

  /** Get sentence position for UI access */
  getSentencePosition(sentenceIndex: number) {
    return this.sentenceMap.get(sentenceIndex);
  }

  getManager(): BundleAudioManager { return this.manager }

  // Position tracking methods
  private setupPositionTracking(): void {
    if (!this.bookId) return

    // Listen to sentence changes from the bundle manager
    this.manager.onSentenceStart = (sentence) => {
      this.updateCurrentPosition(sentence.sentenceIndex)
    }

    // Listen to playback time updates
    this.manager.onTimeUpdate = (currentTime, totalTime) => {
      this.updatePlaybackTime(currentTime, totalTime)
    }
  }

  private updateCurrentPosition(sentenceIndex: number): void {
    if (!this.bookId) return

    const position = this.sentenceMap.get(sentenceIndex)
    if (!position) return

    // Calculate chapter (basic implementation - you may want to enhance this)
    const chapter = this.calculateChapter(sentenceIndex)

    // Update current position
    this.currentPosition = {
      currentSentenceIndex: sentenceIndex,
      currentBundleIndex: position.bundleIndex,
      currentChapter: chapter,
      playbackTime: this.manager.getCurrentTime() || 0,
      totalTime: this.manager.getTotalTime() || 0,
      cefrLevel: this.getCurrentCefrLevel(),
      playbackSpeed: this.manager.getPlaybackSpeed() || 1.0,
      contentMode: 'simplified', // Default - can be enhanced
      completionPercentage: calculateCompletionPercentage(sentenceIndex, this.totalSentences),
      sentencesRead: sentenceIndex + 1
    }

    // Trigger callback for UI updates
    if (this.onPositionUpdate) {
      this.onPositionUpdate(this.currentPosition)
    }

    // Save to database/localStorage (throttled)
    this.savePositionIfNeeded()
  }

  private updatePlaybackTime(currentTime: number, totalTime: number): void {
    if (!this.currentPosition) return

    this.currentPosition.playbackTime = currentTime
    this.currentPosition.totalTime = totalTime

    // Save position less frequently for time updates
    if (Date.now() - this.lastSavedPosition > 10000) { // Every 10 seconds
      this.savePositionIfNeeded()
    }
  }

  private savePositionIfNeeded(): void {
    if (!this.bookId || !this.currentPosition) return

    // Only save if position has changed meaningfully
    if (Math.abs(this.currentPosition.currentSentenceIndex - this.lastSavedPosition) >= 1) {
      readingPositionService.savePosition(this.bookId, this.currentPosition)
      this.lastSavedPosition = this.currentPosition.currentSentenceIndex
    }
  }

  private calculateChapter(sentenceIndex: number): number {
    // Basic implementation - could be enhanced with actual chapter mapping
    // For now, estimate based on book structure
    if (this.totalSentences <= 0) return 1

    const progress = sentenceIndex / this.totalSentences
    return Math.max(1, Math.ceil(progress * 9)) // Assume 9 chapters max
  }

  private getCurrentCefrLevel(): string {
    // Default implementation - should be passed from parent component
    return 'B2'
  }

  /** Public methods for position management */
  async loadSavedPosition(): Promise<ReadingPosition | null> {
    if (!this.bookId) return null
    return await readingPositionService.loadPosition(this.bookId)
  }

  async forceSavePosition(): Promise<void> {
    if (!this.bookId || !this.currentPosition) return
    await readingPositionService.forceSave(this.bookId, this.currentPosition)
  }

  async resetPosition(): Promise<void> {
    if (!this.bookId) return
    await readingPositionService.resetPosition(this.bookId)
    this.currentPosition = null
  }

  updateSettings(cefrLevel: string, playbackSpeed: number, contentMode: 'simplified' | 'original'): void {
    if (this.currentPosition) {
      this.currentPosition.cefrLevel = cefrLevel
      this.currentPosition.playbackSpeed = playbackSpeed
      this.currentPosition.contentMode = contentMode
      this.savePositionIfNeeded()
    }
  }

  getCurrentPosition(): ReadingPosition | null {
    return this.currentPosition
  }
}

export default AudioBookPlayer



