import { BundleAudioManager, type BundleData } from '@/lib/audio/BundleAudioManager'

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
}

export class AudioBookPlayer {
  private bundles: BundleData[]
  private manager: BundleAudioManager
  private sentenceMap: Map<number, GlobalSentencePosition> = new Map()
  private preloadRadius: number
  private debug: boolean
  private currentOperationToken: number = 0

  constructor(bundles: BundleData[], options: AudioBookPlayerOptions = {}) {
    const lead = typeof options.highlightLeadMs === 'number' ? options.highlightLeadMs : -500
    this.manager = new BundleAudioManager({ highlightLeadMs: lead })
    this.bundles = bundles
    this.preloadRadius = typeof options.preloadRadius === 'number' ? options.preloadRadius : 1
    this.debug = !!options.debug

    this.buildSentenceMap()
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
}

export default AudioBookPlayer


