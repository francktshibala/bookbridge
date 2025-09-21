# Alternative Architectures - Backup Plans

## Overview
GPT-5 validated our sentence bundle approach but provided two alternative architectures in case the primary plan fails to deliver the perfect Speechify experience at scale.

## 🎯 Primary Plan (Current Focus)
**Sentence Bundles with Sliding Window**
- 3-5 sentences per audio file with embedded word timings
- Sliding window (10 ahead, 10 behind)
- 32-48 kbps AAC-LC compression
- HTMLAudio element queue with micro-crossfade

## 🚨 Pivot Triggers
Switch to alternative plan if:
- ❌ Bundle crossfade gaps > 50ms despite optimization
- ❌ Memory usage > 80-100MB with minimal content
- ❌ User stuttering reports > 5%
- ❌ iOS crashes > 1%
- ❌ Noticeable cue drift affecting sync

---

## 📋 Plan B: HLS Chapter Streaming with Sentence Cues

### Core Architecture
- **Per-chapter HLS streams** (audio-only) with 2-6 second AAC-LC segments
- **WebVTT or ID3 metadata** carries sentence and word timing cues
- **CDN delivery** with adaptive bitrate (32-64 kbps mono)

### Implementation
```javascript
// Example HLS with WebVTT cues
const hlsPlayer = {
  source: "chapter_1.m3u8",
  textTracks: [{
    kind: "metadata",
    src: "chapter_1_cues.vtt", // Sentence/word timings
    mode: "hidden"
  }]
};

// Sync from cue events
video.textTracks[0].oncuechange = (e) => {
  const activeCue = e.target.activeCues[0];
  highlightSentence(activeCue.id);
  updateWordPosition(activeCue.startTime);
};
```

### Technical Stack
- **Server:** HLS playlist generation with AAC-LC segments
- **Client:** Hidden `<video>` element on iOS (native HLS support)
- **Sync:** WebVTT/ID3 cue events drive text highlighting
- **Cache:** Service Worker for playlist/segment caching

### Pros & Cons
**Pros:**
- ✅ Proven mobile gapless playback
- ✅ Fewer requests than individual files
- ✅ Native buffering smooths network jitter
- ✅ Industry-standard streaming protocol

**Cons:**
- ⚠️ More complex cue pipeline
- ⚠️ Must use `<video>` not `<audio>` on iOS
- ⚠️ Per-word accuracy depends on cue quality

### Complexity: 6/10

### When to Use
Switch to Plan B if:
- Bundle crossfade gaps persist > 50ms
- Request overhead too high on low-end devices
- Need adaptive bitrate for variable networks

---

## 📋 Plan C: Native Audio Queue via Capacitor

### Core Architecture
- **Native gapless audio queue** using platform APIs
- **AVQueuePlayer** (iOS) / **ExoPlayer** (Android)
- **Capacitor plugin** bridges native to web UI
- **High-frequency time updates** (30-60 Hz) to JavaScript

### Implementation
```javascript
// Capacitor plugin interface
const NativeAudioQueue = {
  async initialize() {
    await CapacitorAudioPlugin.init({
      updateFrequency: 60, // Hz
      bufferSize: 3 // Queue items
    });
  },

  async queueBundle(bundleUrl, metadata) {
    return CapacitorAudioPlugin.enqueue({
      url: bundleUrl,
      sentences: metadata.sentences,
      wordTimings: metadata.wordTimings
    });
  },

  onTimeUpdate: (callback) => {
    CapacitorAudioPlugin.addListener('timeUpdate', callback);
  }
};
```

### Technical Stack
- **Native:** AVQueuePlayer (iOS), ExoPlayer (Android)
- **Bridge:** Custom Capacitor plugin
- **Audio:** AAC-LC bundles (3-5 sentences)
- **UI:** JavaScript with TanStack Virtual
- **Storage:** Native filesystem + IndexedDB

### Pros & Cons
**Pros:**
- ✅ Best gapless reliability on iOS
- ✅ Immune to WebView audio quirks
- ✅ Precise native playback control
- ✅ Superior background audio handling

**Cons:**
- ⚠️ Requires native plugin development
- ⚠️ App store submission/review process
- ⚠️ Dual code paths (web + native)
- ⚠️ More complex debugging

### Complexity: 7/10

### When to Use
Switch to Plan C if:
- iOS HTMLAudio gaps persist > 50ms
- Autoplay restrictions cause UX issues
- Stuttering > 5% despite web optimizations
- Need background audio capabilities

---

## 🧪 Parallel Prototyping Strategy

While implementing the primary bundle approach:

1. **HLS Prototype** (1 developer, 1 week)
   - Single chapter of "The Yellow Wallpaper"
   - Generate HLS playlist with 6-second segments
   - Create WebVTT file with sentence cues
   - Test gap-free playback on iOS

2. **Native Queue POC** (1 developer, 1 week)
   - Minimal Capacitor plugin
   - Queue 3-5 test bundles
   - Verify gapless transitions
   - Measure time update accuracy

## 📊 Decision Matrix

| Metric | Bundle Approach | HLS Streaming | Native Queue |
|--------|----------------|---------------|--------------|
| Implementation Time | 2-3 weeks | 3-4 weeks | 4-5 weeks |
| Gapless Reliability | Good | Very Good | Excellent |
| iOS Compatibility | Good | Very Good | Excellent |
| Maintenance Burden | Low | Medium | High |
| Offline Support | Good | Medium | Excellent |
| Network Efficiency | Medium | Very Good | Good |
| Precision | Excellent | Good | Excellent |

## 🎯 Success Metrics (All Plans)

Any chosen architecture MUST achieve:
- < 200ms audio start latency
- Zero audible gaps for 30-minute sessions
- 55-60 fps consistent performance
- ≤ 100MB heap usage on mobile
- Perfect sentence-level synchronization

## 📝 Documentation Requirements

If pivoting to Plan B or C:
1. Document pivot decision in `ARCHITECTURE_DECISIONS.md`
2. Update `IMPLEMENTATION_CHECKLIST.md` with new workflow
3. Create migration guide from current approach
4. Update all test pages to use new architecture

---

*Last updated: [Current Date]*
*GPT-5 Review: Complete*
*Status: Ready for implementation if primary plan fails*