# Capacitor Offline & Audio Research

Research on implementing offline functionality and maintaining audio performance in a Capacitor-wrapped BookBridge app.

## Executive Summary

**Key Finding**: While Capacitor supports the current BookBridge audio system, significant architectural changes are needed for optimal offline functionality and 2G/3G performance in emerging markets.

**Recommendation**: Hybrid approach combining native audio plugins for background playback with optimized caching strategies for emerging market networks.

## 1. Offline Storage: Capacitor vs Current IndexedDB

### Current Implementation Analysis
BookBridge currently uses:
- **IndexedDB** via `audio-cache-db.ts` for audio file caching
- **Network-adaptive cache sizes**: 50MB (2G) to 1GB (WiFi) 
- **Quality profiles**: Opus 24-192kbps based on network type
- **Priority-based eviction** system for cache management

### Capacitor Compatibility Assessment

#### ✅ IndexedDB Still Works
- **Full compatibility**: IndexedDB available in Capacitor WebViews
- **Zero migration needed**: Current `InstantAudioPlayer.tsx` and `audio-cache-db.ts` work unchanged
- **Web API support**: Capacitor preserves all browser storage APIs

#### ⚠️ Critical Reliability Issues
```typescript
// Current implementation at risk in Capacitor
interface ReliabilityRisks {
  dataEviction: "OS may reclaim IndexedDB storage when device low on space";
  persistence: "No 100% guarantee - especially problematic on iOS";
  performance: "IndexedDB slower than native alternatives";
  batteryOptimization: "Android may aggressively kill background processes";
}
```

#### 🔄 Recommended Hybrid Architecture
```typescript
// Recommended storage strategy
const storageStrategy = {
  metadata: "SQLite via @capacitor/sqlite", // Persistent, fast
  audioFiles: "Filesystem API with blob URLs", // Large file optimization
  preferences: "Capacitor Preferences API", // Settings, user state
  cache: "IndexedDB (keep current) + native backup" // Progressive enhancement
};
```

### Migration Path
1. **Phase 1**: Keep current IndexedDB system (zero risk)
2. **Phase 2**: Add SQLite metadata layer for reliability
3. **Phase 3**: Implement filesystem-based audio storage for large files

## 2. Audio Performance in Capacitor WebView (<2s Loading)

### Current Performance Baseline
- **InstantAudioPlayer**: Achieves <2s loading via pre-generated audio cache
- **Progressive fallback**: OpenAI TTS generation when cache miss
- **Word-level sync**: Real-time highlighting with 100ms offset compensation

### Capacitor WebView Performance Analysis

#### ✅ Maintains Current Performance
- **HTML5 Audio preserved**: `<audio>` elements work identically
- **Fetch API intact**: Current blob-based loading continues working
- **Real-time sync supported**: `requestAnimationFrame` and `AudioContext` available

#### 📊 Performance Characteristics
```typescript
interface CapacitorAudioPerformance {
  loadTime: "<2s maintained for cached content";
  webViewOverhead: "~50-100ms additional latency vs native";
  memoryUsage: "Higher than native but acceptable for 100MB cache";
  batteryImpact: "Moderate - WebView + audio processing";
}
```

#### 🚀 Optimization Opportunities
```typescript
// Enhanced performance strategy
const optimizations = {
  preloading: "Use Capacitor background tasks for audio pre-generation",
  nativeAudio: "@capacitor-community/native-audio for instant playback",
  hybridSystem: "WebView for UI + native for background audio",
  caching: "Filesystem API for large audio files (avoid base64)"
};
```

### Recommended Architecture
```typescript
interface HybridAudioSystem {
  foreground: "HTML5 Audio in WebView (current system)";
  background: "@jofr/capacitor-media-session for background playback"; 
  preloading: "@capacitor-community/native-audio for instant response";
  fallback: "Current progressive TTS when cache miss";
}
```

## 3. Large Audio File Caching (100MB+) in Capacitor

### Current System Analysis
- **Cache limit**: 1GB max (WiFi), 50MB (2G networks)
- **File sizes**: Individual audio chunks ~1-5MB, accumulated to 100MB+ per book
- **Eviction**: Priority-based (current book > favorites > recently played)

### Capacitor Large File Challenges

#### ⚠️ Critical Limitations Identified
```typescript
interface LargeFileChallenges {
  memoryErrors: "OutOfMemoryError on Android with 100MB+ files";
  base64Limits: "Browser ~256MB string limit affects large files";
  webViewRestrictions: "OS may reclaim storage aggressively";
  platformVariations: "Android internal storage limits vary by device";
}
```

#### 🔧 Recommended Solutions
```typescript
// Large file handling strategy
const largeFileStrategy = {
  // Avoid base64 - use blob URLs instead
  loadingMethod: "fetch() API with blob responses",
  
  // Use Capacitor Filesystem for files >10MB  
  storage: `
    - Small files (<10MB): IndexedDB (current system)
    - Large files (>10MB): Filesystem API
    - Metadata: SQLite for fast queries
  `,
  
  // Prevent memory issues
  chunkingStrategy: "Stream large files in chunks to avoid memory spikes",
  
  // Background downloads
  downloadManager: "@capacitor/file-transfer for reliable large file downloads"
};
```

### Implementation Approach
```typescript
// Enhanced audio cache architecture
class CapacitorAudioCache extends AudioCacheDB {
  async storeAudioSentence(blob: Blob, metadata: AudioMetadata) {
    if (blob.size > 10 * 1024 * 1024) { // >10MB
      // Use Filesystem API
      return await this.storeToFilesystem(blob, metadata);
    } else {
      // Use current IndexedDB system
      return await super.storeAudioSentence(blob, metadata);
    }
  }
  
  private async storeToFilesystem(blob: Blob, metadata: AudioMetadata) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const path = `audio_cache/${metadata.id}.mp3`;
    
    // Store file
    await Filesystem.writeFile({
      path,
      data: await this.blobToBase64(blob),
      directory: Directory.Data
    });
    
    // Store metadata in SQLite
    await this.storeMetadata(metadata, path);
  }
}
```

## 4. Background Audio Playback and Word Highlighting Sync

### Current System Capabilities
- **Foreground playback**: Full word-level sync with visual highlighting
- **Real-time tracking**: `requestAnimationFrame` for 60fps highlight updates
- **Audio pipeline**: Multiple `<audio>` elements for seamless sentence transitions

### Capacitor Background Audio Challenges

#### ❌ WebView Background Limitations
```typescript
interface BackgroundLimitations {
  androidIssue: "WebView audio unreliable in background - app sleep kills playback";
  iOSTimeout: "iOS terminates background apps after X minutes";
  highlightingLost: "Visual highlighting stops when app backgrounded";
  memoryManagement: "OS may aggressively kill background WebView processes";
}
```

#### ✅ Native Plugin Solutions
```typescript
// Required plugins for background functionality
const backgroundAudioStack = {
  mediaSession: "@jofr/capacitor-media-session", // OS media controls integration
  nativeAudio: "@capacitor-community/native-audio", // Memory-optimized playback  
  backgroundTask: "@capacitor/background-runner", // Keep processing alive
  notifications: "@capacitor/local-notifications" // User interaction when backgrounded
};
```

### Recommended Architecture
```typescript
interface BackgroundAudioSystem {
  // Foreground (current system)
  foregroundPlayback: {
    engine: "HTML5 Audio + InstantAudioPlayer.tsx";
    features: "Full word highlighting, visual sync, UI controls";
    performance: "Excellent - current 2s load time maintained";
  };
  
  // Background (new native layer)
  backgroundPlayback: {
    engine: "@jofr/capacitor-media-session";
    features: "OS media controls, lock screen controls, notification";
    wordSync: "Position tracking via setPositionState() API";
    audioSource: "Same pre-cached files as foreground";
  };
  
  // Synchronization bridge
  syncBridge: {
    stateSync: "Share playback state between WebView and native";
    positionSync: "Real-time position updates for word highlighting";
    qualitySync: "Same audio quality/source selection logic";
  };
}
```

### Implementation Strategy
```typescript
// Background audio integration
class CapacitorAudioController extends InstantAudioPlayer {
  private mediaSession = CapacitorMediaSession;
  
  async startPlayback() {
    // Start foreground HTML5 audio (existing system)
    await super.startPlayback();
    
    // Initialize background media session
    await this.mediaSession.setMetadata({
      title: this.bookTitle,
      artist: this.voiceId,
      duration: this.totalDuration
    });
    
    await this.mediaSession.setPlaybackState('playing');
    
    // Sync position for word highlighting
    this.setupPositionSync();
  }
  
  private setupPositionSync() {
    const updatePosition = () => {
      const currentTime = this.currentAudioRef.current?.currentTime || 0;
      
      // Update native media session
      this.mediaSession.setPositionState({
        position: currentTime,
        duration: this.totalDuration,
        playbackRate: 1.0
      });
      
      // Continue word highlighting in foreground
      this.updateWordHighlight(currentTime);
    };
    
    this.positionInterval = setInterval(updatePosition, 100);
  }
}
```

## 5. Required Capacitor Plugins

### Audio & Offline Functionality Stack

#### Core Audio Plugins
```typescript
const requiredPlugins = {
  // Background audio (CRITICAL)
  "@jofr/capacitor-media-session": {
    purpose: "Background playback, OS media controls, notifications",
    features: "MediaSession API, foreground service, lock screen controls",
    priority: "HIGH - Required for 2G/3G markets where apps get backgrounded"
  },
  
  // Native audio optimization (RECOMMENDED) 
  "@capacitor-community/native-audio": {
    purpose: "Memory-optimized audio, instant playback",
    features: "Pre-load into memory, low latency, background support",
    priority: "MEDIUM - Performance enhancement"
  },
  
  // Large file handling (CRITICAL for 100MB cache)
  "@capacitor/filesystem": {
    purpose: "Large audio file storage, blob URL generation",
    features: "Avoid base64 limits, efficient file management",
    priority: "HIGH - Required for 100MB+ caching"
  },
  
  // Reliable downloads (RECOMMENDED)
  "@capacitor/file-transfer": {
    purpose: "Download large audio files reliably",
    features: "Background downloads, progress tracking, retry logic",
    priority: "MEDIUM - User experience improvement"
  }
};
```

#### Storage & Offline Plugins  
```typescript
const storagePlugins = {
  // Enhanced persistence (RECOMMENDED)
  "@capacitor/sqlite": {
    purpose: "Reliable metadata storage, fast queries",
    features: "Persistent storage, SQL queries, transaction support", 
    priority: "MEDIUM - Reliability enhancement over IndexedDB"
  },
  
  // Settings storage (OPTIONAL)
  "@capacitor/preferences": {
    purpose: "User preferences, app state",
    features: "OS-level persistence, small data storage",
    priority: "LOW - Nice to have"
  },
  
  // Background processing (CONDITIONAL)
  "@capacitor/background-runner": {
    purpose: "Pre-generation, cache management in background",
    features: "Background JavaScript execution",
    priority: "LOW - Only if background pre-generation needed"
  }
};
```

#### Network & Quality Plugins
```typescript
const networkPlugins = {
  // Network monitoring (CRITICAL for 2G/3G adaptation)
  "@capacitor/network": {
    purpose: "Detect network changes, adaptive quality",
    features: "Real-time network status, connection type detection",
    priority: "HIGH - Essential for emerging market networks"
  },
  
  // Device info (HELPFUL)
  "@capacitor/device": {
    purpose: "Device capabilities, storage optimization",
    features: "Device specs, platform info, memory status",
    priority: "LOW - Optimization data"
  }
};
```

### Plugin Configuration Examples
```typescript
// capacitor.config.ts
export default {
  plugins: {
    CapacitorMediaSession: {
      // Enable foreground service on Android
      enableForegroundService: true
    },
    
    CapacitorFileTransfer: {
      // Configure for large audio files
      maxRetries: 3,
      timeoutDuration: 30000
    },
    
    CapacitorNetwork: {
      // Monitor connection changes for quality adaptation
      monitorConnectionType: true
    }
  }
};
```

## 6. Network Detection and Adaptive Audio Quality

### Current Implementation Strengths
BookBridge already implements sophisticated network adaptation:

```typescript
// From audio-cache-db.ts - Current network detection
private readonly QUALITY_PROFILES = {
  [NetworkType.SLOW_2G]: { quality: AudioQuality.LOW, codec: AudioCodec.OPUS, bitrate: 24 },
  [NetworkType.TWOG]: { quality: AudioQuality.LOW, codec: AudioCodec.OPUS, bitrate: 32 },
  [NetworkType.THREEG]: { quality: AudioQuality.MEDIUM, codec: AudioCodec.OPUS, bitrate: 64 },
  [NetworkType.FOURG]: { quality: AudioQuality.HIGH, codec: AudioCodec.AAC, bitrate: 128 },
  [NetworkType.WIFI]: { quality: AudioQuality.HD, codec: AudioCodec.AAC, bitrate: 192 }
};
```

### Capacitor Network API Integration

#### Enhanced Network Detection
```typescript
// Capacitor-enhanced network monitoring
class CapacitorNetworkManager extends AudioCacheDB {
  private capacitorNetwork = Network;
  
  async initialize() {
    await super.initialize();
    
    // Enhanced network monitoring
    await this.capacitorNetwork.addListener('networkStatusChange', (status) => {
      this.handleNetworkChange(status);
    });
    
    // Get initial status
    const status = await this.capacitorNetwork.getStatus();
    this.updateNetworkProfile(status);
  }
  
  private handleNetworkChange(status: ConnectionStatus) {
    // Combine browser and Capacitor network info
    const browserInfo = this.detectNetworkType(); // Current implementation
    const capacitorInfo = status.connectionType; // 'wifi' | 'cellular' | 'none'
    
    // Enhanced detection logic
    const enhancedNetworkType = this.combineNetworkInfo(browserInfo, capacitorInfo, status.connected);
    
    // Update quality profile
    this.updateQualityProfile(enhancedNetworkType);
    
    // Trigger cache management
    if (!status.connected) {
      this.enterOfflineMode();
    } else {
      this.exitOfflineMode(enhancedNetworkType);
    }
  }
}
```

#### Adaptive Quality Enhancements
```typescript
interface EnhancedQualityManagement {
  // Current system (keep)
  browserAPI: "navigator.connection for effectiveType detection";
  
  // Capacitor additions  
  capacitorAPI: "@capacitor/network for connection status and type";
  realTimeUpdates: "Event-based network change handling";
  
  // Enhanced features
  offlineMode: "Detect offline state and queue actions";
  batteryOptimization: "Reduce quality on low battery";
  dataUsageTracking: "Monitor cellular data usage";
}
```

### Recommended Implementation
```typescript
// Enhanced network-adaptive audio system
class CapacitorAdaptiveAudio {
  private networkProfiles = {
    // Existing profiles + enhanced offline handling
    offline: { 
      quality: AudioQuality.CACHED_ONLY,
      behavior: "Disable downloads, play cached content only"
    },
    
    // Cellular data management
    cellular: {
      quality: AudioQuality.LOW,
      warnings: "Warn user about data usage",
      preloading: "Disabled to save data"
    }
  };
  
  async adaptToNetwork(networkInfo: NetworkInfo) {
    const profile = this.networkProfiles[networkInfo.type];
    
    // Adjust cache size
    await this.adjustCacheSize(profile.maxCacheSize);
    
    // Update audio quality
    this.setPreferredQuality(profile.quality);
    
    // Manage background downloads
    if (networkInfo.type === 'cellular') {
      this.pauseBackgroundDownloads();
    } else {
      this.resumeBackgroundDownloads();
    }
    
    // User notifications
    if (networkInfo.connectionCost === 'metered') {
      this.showDataUsageWarning();
    }
  }
}
```

## 7. Storage Limitations and Permissions

### Platform-Specific Storage Constraints

#### Android Storage Limitations
```typescript
interface AndroidStorageConstraints {
  internalStorage: "Device manufacturers can limit to as low as 100MB shared among all apps";
  compatibility: "Android 2.3+ requires 150MB minimum in /data partition";
  permissions: `
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  `;
  backgroundRestrictions: "Aggressive battery optimization may kill background processes";
}
```

#### iOS Storage Considerations
```typescript
interface iOSStorageConstraints {
  appSandbox: "Strict sandboxing - only app's container accessible";
  iCloudBackup: "App data included in iCloud backup (user's storage quota)";
  backgroundExecution: "Limited background execution time for downloads";
  storageReclamation: "OS may reclaim storage when device full";
}
```

### Recommended Storage Strategy
```typescript
// Multi-tier storage approach
class CapacitorStorageManager {
  private readonly STORAGE_TIERS = {
    // Tier 1: Critical data (always persistent)
    critical: {
      api: "Capacitor Preferences",
      data: "User settings, book progress, sync state",
      size: "< 1MB",
      persistence: "100% guaranteed"
    },
    
    // Tier 2: Important cache (high persistence)
    important: {
      api: "SQLite + Filesystem",
      data: "Current book audio, favorites metadata",
      size: "50-200MB",
      persistence: "95% reliable"
    },
    
    // Tier 3: General cache (evictable)
    cache: {
      api: "IndexedDB (current system)",
      data: "Recently played audio, word timings",
      size: "100MB-1GB depending on network",
      persistence: "May be evicted by OS"
    }
  };
  
  async initializeStorage() {
    // Request persistent storage where available
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const persistent = await navigator.storage.persist();
      console.log(`Persistent storage granted: ${persistent}`);
    }
    
    // Configure Capacitor storage
    await this.configureCapacitorStorage();
    
    // Initialize fallback strategy
    await this.setupStorageFallback();
  }
}
```

### Permission Configuration
```xml
<!-- Android permissions (android/app/src/main/AndroidManifest.xml) -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

<!-- For audio background playback -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
```

```xml
<!-- iOS permissions (ios/App/App/Info.plist) -->
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
    <string>background-fetch</string>
</array>
```

## Implementation Roadmap

### Phase 1: Minimal Risk Migration (1-2 weeks)
- ✅ Current system works unchanged in Capacitor
- Add `@capacitor/network` for enhanced network detection
- Add `@jofr/capacitor-media-session` for background playback
- Test on target devices (2G/3G networks in Kenya, Nigeria, India)

### Phase 2: Enhanced Reliability (3-4 weeks)  
- Add `@capacitor/filesystem` for large file handling
- Implement SQLite metadata layer with `@capacitor/sqlite`
- Add storage tier system (critical/important/cache)
- Implement background download management

### Phase 3: Performance Optimization (2-3 weeks)
- Add `@capacitor-community/native-audio` for instant playback
- Optimize memory usage for 100MB+ caches
- Implement adaptive quality based on device capabilities
- Add comprehensive offline mode support

## Conclusion

**Verdict**: Capacitor can successfully maintain BookBridge's current Speechify-level audio performance while adding native mobile capabilities needed for emerging markets.

**Key Success Factors**:
1. **Keep current system**: IndexedDB + HTML5 Audio continues working
2. **Add native layer**: Background audio via MediaSession plugin
3. **Enhance reliability**: SQLite + Filesystem for critical data
4. **Optimize for 2G/3G**: Current adaptive system works, enhance with Capacitor Network API

**Risk Assessment**: **LOW** - Current system preserved, enhancements additive
**Performance Impact**: **MINIMAL** - <2s loading maintained, background capabilities added
**Development Effort**: **MODERATE** - Mainly plugin integration, not system rebuild