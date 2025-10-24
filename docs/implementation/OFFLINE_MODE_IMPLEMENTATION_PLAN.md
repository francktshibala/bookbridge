# Offline Mode Implementation Plan - Feature 3

## 📋 Current State Analysis

### What Already Exists ✅

BookBridge already has **substantial offline infrastructure** in place:

#### 1. **OfflineContext** (`contexts/OfflineContext.tsx`)
- Global offline state management
- Connection status tracking (online/offline events)
- Download progress tracking
- Storage management (bytes used, formatted display)
- Complete CRUD operations for offline books

#### 2. **Offline Library** (`lib/offline/`)
- `download-manager.ts` - Download orchestration
- `indexeddb.ts` - Large file storage (audio, content)
- `offline-audio-provider.ts` - Offline audio playback
- `service-worker-enhanced.js` - SW enhancements

#### 3. **UI Components** (`components/offline/`)
- `DownloadButton.tsx` - Download initiation
- `OfflineLibrary.tsx` - Offline book browser
- `OfflineIndicator.tsx` - Connection status
- `SyncStatusIndicator.tsx` - Sync state
- `ContentAvailabilityBadge.tsx` - "Available Offline" badges
- `OfflineBanner.tsx` - Notifications

#### 4. **Pages**
- `/app/offline-library/page.tsx` - Dedicated offline library
- `/app/offline/page.tsx` - Offline experience validator

### What's Missing/Needs Enhancement ❌

1. **Service Worker Integration** - `public/sw.js` caching strategies
2. **OfflineProvider in Layout** - Not wrapped in root layout
3. **Download UI Integration** - Not added to book cards in main pages
4. **Quota Management** - 80% warning system not implemented
5. **Background Sync** - Progress sync when back online
6. **Complete Testing** - End-to-end offline flow validation
7. **Error Handling** - Quota exceeded, failed downloads recovery

---

## 🎯 Implementation Strategy

### Phase 1: Foundation (Core Integration)
**Goal**: Wire up existing infrastructure to work app-wide

1. Add `OfflineProvider` to `app/layout.tsx`
2. Enhance `public/sw.js` with caching strategies
3. Add download buttons to book cards
4. Test basic download → offline read flow

### Phase 2: User Experience (UI/UX Polish)
**Goal**: Make offline mode discoverable and intuitive

1. Add "Available Offline" badges to all book cards
2. Implement quota warning at 80% storage
3. Add download progress indicators
4. Create storage management UI
5. Add offline indicator in header

### Phase 3: Resilience (Error Handling)
**Goal**: Handle edge cases and failures gracefully

1. Implement download retry logic
2. Handle quota exceeded errors
3. Add cleanup for partial downloads
4. Implement background sync for progress

### Phase 4: Testing & Documentation
**Goal**: Verify everything works and document thoroughly

1. Test offline reading with audio
2. Test download → offline → back online sync
3. Test storage limits
4. Document implementation

---

## ⚠️ Critical Mistakes to Avoid

### 1. **❌ Breaking the Bundle Architecture**
**Problem**: The existing bundle system is optimized for streaming. Offline mode must preserve this.

**What to Avoid**:
- Don't create a separate "offline bundle" format
- Don't duplicate bundle logic
- Don't bypass BundleAudioManager

**Correct Approach**:
- Use the same bundle format for offline
- Intercept bundle requests and serve from IndexedDB when offline
- Let BundleAudioManager handle playback regardless of source

**Code Pattern**:
```typescript
// ❌ BAD - Creating separate offline audio system
if (offline) {
  offlinePlayer.play(book);
} else {
  bundleAudioManager.play(book);
}

// ✅ GOOD - Transparent source switching
const audioProvider = offline
  ? offlineAudioProvider
  : onlineAudioProvider;

bundleAudioManager.play(book, { provider: audioProvider });
```

### 2. **❌ Not Handling Storage Quota Gracefully**
**Problem**: IndexedDB can fill up quickly with audio files, causing silent failures.

**What to Avoid**:
- Don't download without checking available space first
- Don't fail silently when quota exceeded
- Don't let users download more than device supports

**Correct Approach**:
- Check quota before starting download
- Warn at 80% capacity
- Show clear error message at 100%
- Implement cleanup/deletion workflow

**Code Pattern**:
```typescript
// ❌ BAD - No quota check
async function downloadBook(bookId: string) {
  await downloadManager.download(bookId);
}

// ✅ GOOD - Check quota first
async function downloadBook(bookId: string) {
  const estimate = await navigator.storage.estimate();
  const available = (estimate.quota || 0) - (estimate.usage || 0);
  const bookSize = await getBookSize(bookId);

  if (bookSize > available) {
    throw new Error('Insufficient storage. Please delete some books first.');
  }

  const percentUsed = ((estimate.usage || 0) / (estimate.quota || 1)) * 100;
  if (percentUsed > 80) {
    showWarning('Storage nearly full. Consider deleting old downloads.');
  }

  await downloadManager.download(bookId);
}
```

### 3. **❌ Not Syncing Progress When Back Online**
**Problem**: Users read offline, but progress is lost when they reconnect.

**What to Avoid**:
- Don't only save to localStorage offline
- Don't lose track of offline reading sessions
- Don't duplicate progress entries

**Correct Approach**:
- Save to localStorage immediately (fast)
- Queue API sync when offline
- Use Background Sync API for resilient syncing
- Merge progress correctly (take latest timestamp)

**Code Pattern**:
```typescript
// ❌ BAD - Only localStorage, no sync
async function saveProgress(bookId: string, position: number) {
  localStorage.setItem(`progress-${bookId}`, JSON.stringify({ position }));
}

// ✅ GOOD - Queue for sync
async function saveProgress(bookId: string, position: number) {
  const progress = { bookId, position, timestamp: Date.now() };

  // Save immediately to localStorage
  localStorage.setItem(`progress-${bookId}`, JSON.stringify(progress));

  // Try to sync to server
  if (navigator.onLine) {
    try {
      await api.saveProgress(progress);
    } catch (error) {
      // Queue for background sync
      await queueProgressSync(progress);
    }
  } else {
    // Offline - queue for later
    await queueProgressSync(progress);
  }
}
```

### 4. **❌ Service Worker Cache Conflicts**
**Problem**: Multiple caching strategies can conflict, serving stale data.

**What to Avoid**:
- Don't use same cache name for different strategies
- Don't cache API responses indefinitely
- Don't forget to version caches

**Correct Approach**:
- Use cache versioning (`v1-audio`, `v2-audio`)
- Different strategies for different resources
- Implement cache cleanup on SW update

**Code Pattern**:
```javascript
// ❌ BAD - One cache for everything
const CACHE_NAME = 'bookbridge-cache';

// ✅ GOOD - Separate versioned caches
const CACHE_VERSION = 'v1';
const CACHES = {
  audio: `audio-${CACHE_VERSION}`,
  content: `content-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
  static: `static-${CACHE_VERSION}`,
};

// Clean up old caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => !Object.values(CACHES).includes(name))
          .map(name => caches.delete(name))
      );
    })
  );
});
```

### 5. **❌ Memory Leaks from Large Audio Files**
**Problem**: Loading entire audio files into memory causes crashes on mobile.

**What to Avoid**:
- Don't load entire audio file as Blob in memory
- Don't create object URLs that aren't revoked
- Don't keep multiple audio instances

**Correct Approach**:
- Stream audio from IndexedDB using Blob URLs
- Revoke object URLs after use
- Reuse single audio element (like GlobalAudioContext does)

**Code Pattern**:
```typescript
// ❌ BAD - Loading entire file
async function playOfflineAudio(bundleId: string) {
  const audioData = await offlineDB.getAudioBundle(bundleId);
  const blob = new Blob([audioData]); // All in memory!
  const url = URL.createObjectURL(blob);
  audio.src = url; // URL never revoked
}

// ✅ GOOD - Stream and cleanup
async function playOfflineAudio(bundleId: string) {
  // Get blob reference (doesn't load all data)
  const blob = await offlineDB.getAudioBlob(bundleId);
  const url = URL.createObjectURL(blob);

  audio.src = url;

  // Revoke URL after audio loads
  audio.addEventListener('loadeddata', () => {
    URL.revokeObjectURL(url);
  }, { once: true });
}
```

### 6. **❌ Not Testing on Real Mobile Devices**
**Problem**: DevTools offline mode doesn't match real device behavior.

**What to Avoid**:
- Don't only test in Chrome DevTools
- Don't assume IndexedDB works same on all browsers
- Don't trust desktop storage quotas

**Correct Approach**:
- Test on actual Android/iOS devices
- Test with limited storage (2GB device)
- Test on slow 3G connection
- Test background/foreground transitions

### 7. **❌ Poor Download UX**
**Problem**: Downloads happen silently, users don't know what's happening.

**What to Avoid**:
- Don't start downloads without confirmation on mobile data
- Don't fail to show progress
- Don't let failed downloads sit without retry option

**Correct Approach**:
- Confirm before large downloads on cellular
- Show clear progress indicators
- Allow pause/resume/cancel
- Auto-retry on network error (with exponential backoff)

---

## 🏆 Best Practices

### 1. **Progressive Enhancement Mindset**
Offline mode should enhance, not replace, the online experience.

```typescript
// Design pattern: Transparent offline/online switching
class BookProvider {
  async getBook(bookId: string) {
    // Try offline first if available
    if (!navigator.onLine) {
      const offlineBook = await offlineDB.getBook(bookId);
      if (offlineBook) return offlineBook;
    }

    // Fall back to online
    return await api.fetchBook(bookId);
  }
}
```

### 2. **Storage Budget Management**
Help users understand and manage their storage.

```typescript
// Show storage in meaningful units
function formatStorage(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb > 1) return `${gb.toFixed(2)} GB`;

  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

// Estimate before download
async function estimateBookSize(bookId: string, level: string): Promise<number> {
  const bundles = await api.getBundles(bookId, level);
  // Audio is ~50KB per bundle (4 sentences)
  const audioSize = bundles.length * 50 * 1024;
  // Text is ~2KB per bundle
  const textSize = bundles.length * 2 * 1024;
  return audioSize + textSize;
}
```

### 3. **Resilient Download Strategy**
Handle network interruptions gracefully.

```typescript
class DownloadManager {
  async downloadBook(bookId: string, level: string) {
    const bundles = await this.getBundleList(bookId, level);

    for (let i = 0; i < bundles.length; i++) {
      let retries = 0;
      let success = false;

      while (!success && retries < 3) {
        try {
          await this.downloadBundle(bundles[i]);
          success = true;
        } catch (error) {
          retries++;
          if (retries < 3) {
            // Exponential backoff: 1s, 2s, 4s
            await this.delay(1000 * Math.pow(2, retries - 1));
          } else {
            throw new Error(`Failed to download bundle ${i} after 3 retries`);
          }
        }
      }

      this.onProgress({ current: i + 1, total: bundles.length });
    }
  }
}
```

### 4. **IndexedDB Best Practices**
Proper database design prevents issues.

```typescript
// Schema design
interface OfflineBookSchema {
  books: {
    key: string; // bookId
    value: {
      bookId: string;
      title: string;
      author: string;
      level: string;
      downloadedAt: number;
      lastAccessedAt: number;
      sizeBytes: number;
    };
  };
  bundles: {
    key: string; // `${bookId}-${bundleIndex}`
    value: {
      bookId: string;
      bundleIndex: number;
      audioBlob: Blob;
      textData: any;
      duration: number;
      sentences: any[];
    };
    indexes: {
      byBook: string; // Index by bookId for fast lookup
    };
  };
  progress: {
    key: string; // bookId
    value: {
      bookId: string;
      position: number;
      timestamp: number;
      synced: boolean; // false = needs upload
    };
  };
}

// Always use transactions
async function saveBundle(bookId: string, bundle: any) {
  const tx = db.transaction(['bundles'], 'readwrite');
  const store = tx.objectStore('bundles');
  await store.put(bundle, `${bookId}-${bundle.bundleIndex}`);
  await tx.done;
}
```

### 5. **Service Worker Patterns**
Implement correct caching strategies per resource type.

```javascript
// Service Worker: public/sw.js
const STRATEGIES = {
  // Audio: Cache-first, long cache (audio never changes)
  audio: {
    strategy: 'cache-first',
    cacheName: 'audio-v1',
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
  },

  // Book content: Cache-first, medium cache
  content: {
    strategy: 'cache-first',
    cacheName: 'content-v1',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
  },

  // API: Network-first, short cache (fallback only)
  api: {
    strategy: 'network-first',
    cacheName: 'api-v1',
    maxAge: 5 * 60 * 1000, // 5 minutes
  },

  // Static assets: Cache-first with version check
  static: {
    strategy: 'stale-while-revalidate',
    cacheName: 'static-v1',
  },
};

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Determine strategy based on URL pattern
  if (url.pathname.includes('/audio/')) {
    event.respondWith(handleAudioRequest(event.request));
  } else if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(event.request));
  }
  // ... etc
});
```

### 6. **User Feedback & Communication**
Keep users informed throughout the offline experience.

```typescript
// Toast notifications for key events
const offlineToasts = {
  downloadStart: (bookTitle: string) =>
    toast.info(`Downloading "${bookTitle}" for offline reading...`),

  downloadComplete: (bookTitle: string) =>
    toast.success(`"${bookTitle}" is now available offline!`),

  downloadFailed: (bookTitle: string, error: string) =>
    toast.error(`Failed to download "${bookTitle}": ${error}`),

  goingOffline: () =>
    toast.info('You\'re offline. Showing downloaded books only.'),

  backOnline: () =>
    toast.success('Back online! Syncing your progress...'),

  storageWarning: (percentUsed: number) =>
    toast.warning(`Storage ${percentUsed}% full. Consider deleting old downloads.`),

  storageFullError: () =>
    toast.error('Storage full! Delete some books to download more.'),
};
```

### 7. **Performance Optimization**
Lazy load offline features to minimize initial bundle size.

```typescript
// Lazy load IndexedDB operations
const getOfflineDB = () => import('@/lib/offline/indexeddb');

// Lazy load download manager
const getDownloadManager = () => import('@/lib/offline/download-manager');

// Only load when user clicks "Download"
async function handleDownloadClick(bookId: string) {
  const { downloadManager } = await getDownloadManager();
  await downloadManager.downloadBook(bookId);
}
```

---

## 📦 Integration Checklist

### Step 1: Add OfflineProvider to Layout
```typescript
// app/layout.tsx
import { OfflineProvider } from '@/contexts/OfflineContext';

export default function RootLayout({ children }) {
  return (
    <OfflineProvider>
      <GlobalAudioProvider>
        {/* existing providers */}
        {children}
      </GlobalAudioProvider>
    </OfflineProvider>
  );
}
```

### Step 2: Enhance Service Worker
Add caching strategies to `public/sw.js`:
- Audio bundles: cache-first (1 year)
- Book content: cache-first (1 week)
- API calls: network-first (5 min fallback)
- Static assets: stale-while-revalidate

### Step 3: Add Download Buttons
Update book cards in:
- `/app/enhanced-collection/page.tsx`
- `/app/featured-books/page.tsx`
- `/app/library/page.tsx`

```typescript
import { DownloadButton } from '@/components/offline/DownloadButton';

<BookCard>
  <DownloadButton bookId={book.id} level={selectedLevel} />
</BookCard>
```

### Step 4: Add Offline Indicators
```typescript
// app/layout.tsx - Add to header
import { OfflineIndicator } from '@/components/offline/OfflineIndicator';

<Navigation>
  <OfflineIndicator />
</Navigation>
```

### Step 5: Implement Quota Management
```typescript
// In OfflineContext or new hook
function useStorageQuota() {
  const [quota, setQuota] = useState({ used: 0, available: 0, percent: 0 });

  useEffect(() => {
    const checkQuota = async () => {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const available = estimate.quota || 0;
      const percent = (used / available) * 100;

      setQuota({ used, available, percent });

      if (percent > 80) {
        showStorageWarning(percent);
      }
    };

    checkQuota();
    const interval = setInterval(checkQuota, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return quota;
}
```

---

## 🧪 Testing Strategy

### Manual Testing Checklist
1. **Download Flow**
   - [ ] Click download button on book card
   - [ ] Confirm download prompt appears (on mobile data)
   - [ ] Progress indicator shows real progress
   - [ ] Can pause/resume download
   - [ ] Can cancel download
   - [ ] Download completes successfully

2. **Offline Reading**
   - [ ] Turn off network (airplane mode)
   - [ ] Navigate to offline library
   - [ ] Downloaded books show up
   - [ ] Can open and read book
   - [ ] Audio plays correctly
   - [ ] Highlighting works
   - [ ] Progress saves locally

3. **Back Online Sync**
   - [ ] Turn network back on
   - [ ] Progress syncs automatically
   - [ ] Sync status indicator shows progress
   - [ ] Reading position restored on other device

4. **Storage Management**
   - [ ] Storage used displays correctly
   - [ ] Warning shows at 80% capacity
   - [ ] Can delete downloaded books
   - [ ] Storage updates after deletion
   - [ ] Error prevents download when full

5. **Edge Cases**
   - [ ] Network interrupted during download
   - [ ] App closed during download
   - [ ] Low storage warning before download
   - [ ] Multiple books downloading simultaneously
   - [ ] Very large book (100+ bundles)

### Automated Testing
```typescript
// __tests__/offline-mode.test.ts
describe('Offline Mode', () => {
  it('should download book successfully', async () => {
    const { downloadBook } = renderWithOfflineProvider();
    await downloadBook('test-book-id', 'A1');

    const offlineBook = await offlineDB.getBook('test-book-id');
    expect(offlineBook).toBeDefined();
  });

  it('should play audio offline', async () => {
    // Mock navigator.onLine = false
    Object.defineProperty(navigator, 'onLine', { value: false });

    const audioProvider = offlineAudioProvider;
    const audioUrl = await audioProvider.getAudioUrl('bundle-1');
    expect(audioUrl).toContain('blob:');
  });

  it('should sync progress when back online', async () => {
    // Save progress offline
    await saveProgressOffline('book-1', { position: 50 });

    // Go back online
    Object.defineProperty(navigator, 'onLine', { value: true });
    window.dispatchEvent(new Event('online'));

    // Wait for sync
    await waitFor(() => {
      expect(mockAPI.saveProgress).toHaveBeenCalledWith({
        bookId: 'book-1',
        position: 50,
      });
    });
  });
});
```

---

## 🔐 Security Considerations

1. **No Sensitive Data in IndexedDB**
   - Don't store authentication tokens
   - Don't cache personal user data unnecessarily
   - Clear downloads on logout

2. **Service Worker Security**
   - Only cache same-origin resources
   - Validate cached responses
   - Don't cache authenticated API calls

3. **Quota Attacks**
   - Limit max books per user
   - Implement server-side download limits
   - Track download frequency

---

## 📊 Success Metrics

After implementation, verify:
- [ ] Users can download at least 5 books on average device (2GB storage)
- [ ] Download completes in <2 minutes on 4G (average book = 20 bundles)
- [ ] Offline playback works with same quality as online
- [ ] Progress syncs within 5 seconds of reconnection
- [ ] <3% failure rate on downloads
- [ ] Storage UI accurately reflects disk usage
- [ ] Zero memory leaks after 10+ downloads

---

## 🎓 Key Takeaways

1. **Reuse Existing Infrastructure** - 80% of offline mode is already built
2. **Bundle Architecture is Sacred** - Don't create parallel systems
3. **Storage is Limited** - Plan for 2GB devices, not desktop
4. **Network is Unreliable** - Implement retry and resume
5. **User Communication is Critical** - Show progress, explain errors
6. **Test on Real Devices** - DevTools lies about storage/network
7. **Progressive Enhancement** - Online experience is primary

---

## 📚 Reference Documentation

- **Existing Code**:
  - `/contexts/OfflineContext.tsx` - Main context
  - `/lib/offline/download-manager.ts` - Download orchestration
  - `/lib/offline/indexeddb.ts` - Storage layer
  - `/components/offline/` - UI components

- **External Resources**:
  - [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
  - [Service Worker Cookbook](https://serviceworke.rs/)
  - [Storage Quota Management](https://web.dev/storage-for-the-web/)
  - [Background Sync API](https://developer.chrome.com/blog/background-sync/)

---

## 🚀 Ready to Implement?

With this plan, you have:
- ✅ Understanding of existing infrastructure
- ✅ Clear phased implementation strategy
- ✅ List of critical mistakes to avoid
- ✅ Best practices and patterns
- ✅ Testing strategy
- ✅ Success metrics

**Next Steps**:
1. Create feature branch: `git checkout -b feature/offline-mode-enhancements`
2. Start with Phase 1: Wire up OfflineProvider to layout
3. Implement service worker caching strategies
4. Add download buttons to book cards
5. Test basic download → offline read flow
6. Document as you go

Let's build an amazing offline experience! 🎉
