# 🔧 BookBridge Service Worker & Offline Architecture Research

## Executive Summary

This document provides comprehensive research on implementing service workers and offline functionality for BookBridge's PWA. Based on analysis of the codebase and Next.js 15 best practices, I recommend a hybrid approach using Workbox with Next.js for optimal offline performance while maintaining the current <2 second audio loading times.

## Current Architecture Analysis

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Audio Service**: Progressive audio loading with word-level highlighting
- **Content Delivery**: CDN-hosted audio files (public/audio/)
- **Database**: Supabase for book metadata and user data
- **PWA Support**: Basic manifest.json already configured

### Key Components
1. **Reading Page**: `/app/library/[id]/read/page.tsx` - Main reading interface
2. **Audio Service**: `/lib/progressive-audio-service.ts` - Handles audio playback and caching
3. **Manifest**: `/public/manifest.json` - Basic PWA manifest configured

### Current PWA Readiness
✅ Manifest.json configured with icons  
✅ Mobile viewport meta tags  
✅ HTTPS enabled  
⚠️ No service worker implementation  
⚠️ No offline functionality  
⚠️ Limited caching strategy  

## Next.js 15 Service Worker Best Practices

### 1. **Recommended Approach: next-pwa with Workbox**

Next.js 15 doesn't include built-in service worker support, but the community-standard approach is using `next-pwa` which wraps Google's Workbox.

```bash
npm install next-pwa
```

**Configuration in next.config.js:**
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:.*\/audio\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'audio-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    }
  ]
});

module.exports = withPWA(nextConfig);
```

### 2. **Alternative: Custom Service Worker**

For more control, implement a custom service worker:

```javascript
// public/sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('bookbridge-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/library',
        '/offline.html'
      ]);
    })
  );
});
```

### 3. **App Router Considerations**

With Next.js 15's App Router:
- Service workers must be placed in `public/` directory
- Registration should happen in client components
- Use `navigator.serviceWorker` API for registration

## Offline-First Architecture Design

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
├─────────────────────────────────────────────────────────┤
│                   Service Worker                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │Network First│  │ Cache First  │  │ Stale While   │ │
│  │   (API)     │  │   (Audio)    │  │ Revalidate    │ │
│  └─────────────┘  └──────────────┘  └───────────────┘ │
├─────────────────────────────────────────────────────────┤
│                    Cache Storage                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Static      │  │ Audio Files  │  │ Book Content  │ │
│  │ Assets      │  │ (IndexedDB)  │  │ (IndexedDB)   │ │
│  └─────────────┘  └──────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Caching Strategies by Resource Type

1. **Static Assets** (JS, CSS, images)
   - Strategy: Cache First with Network Fallback
   - Update: On service worker update
   - Storage: Cache API

2. **Audio Files**
   - Strategy: Cache First with background refresh
   - Storage: IndexedDB for large files
   - Pre-cache: Current chapter + next 2 chapters
   - Eviction: LRU with 500MB limit

3. **Book Content & Metadata**
   - Strategy: Network First with Cache Fallback
   - Storage: IndexedDB
   - Sync: Background sync when online

4. **API Responses**
   - Strategy: Network First with 24-hour cache
   - Storage: Cache API
   - Offline: Return cached data with indicator

### Service Worker Implementation

```javascript
// Core service worker with offline support
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Audio caching strategy
registerRoute(
  ({ url }) => url.pathname.includes('/audio/'),
  new CacheFirst({
    cacheName: 'audio-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Book content strategy
registerRoute(
  ({ url }) => url.pathname.includes('/api/books/'),
  new NetworkFirst({
    cacheName: 'book-content',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// Offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
  }
});
```

## Dynamic Content Updates & Versioning

### Content Versioning Strategy

1. **Service Worker Versioning**
   ```javascript
   const SW_VERSION = '1.0.0';
   const CACHE_NAME = `bookbridge-v${SW_VERSION}`;
   ```

2. **Audio File Versioning**
   - Use content hash in filenames: `chunk_0_a3f8b2c.mp3`
   - Update manifest when audio regenerated
   - Background sync to check for updates

3. **Book Content Updates**
   ```javascript
   // Check for content updates
   async function checkForUpdates(bookId) {
     const response = await fetch(`/api/books/${bookId}/version`);
     const { version } = await response.json();
     const cachedVersion = await getCachedVersion(bookId);
     
     if (version > cachedVersion) {
       await updateBookContent(bookId);
     }
   }
   ```

### Update Notification System

```javascript
// Notify users of updates
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// In the app
function promptForUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification('Update Available', {
        body: 'New content is available. Tap to refresh.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'update-notification',
        requireInteraction: true,
        actions: [
          { action: 'refresh', title: 'Refresh' },
          { action: 'dismiss', title: 'Later' }
        ]
      });
    });
  }
}
```

## Graceful Degradation for Offline Mode

### Offline UI States

1. **Full Offline Mode**
   - Show offline banner
   - Disable features requiring network
   - Enable cached content only

2. **Partial Offline (Slow Network)**
   - Progressive enhancement
   - Prioritize critical resources
   - Queue non-critical requests

3. **Network Recovery**
   - Sync queued actions
   - Update stale content
   - Refresh UI seamlessly

### Implementation Example

```typescript
// Offline state management
export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncPending, setSyncPending] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (syncPending) {
        syncOfflineData();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPending]);

  if (isOnline) return null;

  return (
    <div className="offline-banner">
      <span>You're offline - showing cached content</span>
      {syncPending && <span>Changes will sync when online</span>}
    </div>
  );
};
```

### Feature Availability Matrix

| Feature | Online | Offline | Degradation Strategy |
|---------|--------|---------|---------------------|
| Read Books | ✅ | ✅ | Use cached chapters |
| Audio Playback | ✅ | ✅ | Pre-cached audio only |
| Simplification | ✅ | ⚠️ | Show cached or original |
| Progress Sync | ✅ | ⚠️ | Queue for later sync |
| New Books | ✅ | ❌ | Show "Go online" message |
| Voice Selection | ✅ | ⚠️ | Limited to cached voices |

## Integration with Existing Audio Service

### Modifications to progressive-audio-service.ts

```typescript
// Add offline support to existing audio service
export class ProgressiveAudioService {
  private async getCachedAudio(
    bookId: string,
    chunkIndex: number,
    cefrLevel: string,
    voiceId: string
  ): Promise<SentenceAudio[] | null> {
    // First check IndexedDB for offline cache
    if (!navigator.onLine) {
      return await this.getOfflineAudio(bookId, chunkIndex);
    }
    
    // Existing cache check logic...
  }

  private async getOfflineAudio(
    bookId: string,
    chunkIndex: number
  ): Promise<SentenceAudio[] | null> {
    const db = await openDB('bookbridge-offline', 1);
    const tx = db.transaction('audio', 'readonly');
    const store = tx.objectStore('audio');
    const key = `${bookId}-${chunkIndex}`;
    return await store.get(key);
  }

  // Pre-cache next chapters for offline
  public async prefetchForOffline(
    bookId: string,
    currentChunk: number,
    voiceId: string
  ): Promise<void> {
    const chunksToCache = [currentChunk + 1, currentChunk + 2];
    
    for (const chunk of chunksToCache) {
      if (await this.isChunkCached(bookId, chunk)) continue;
      
      // Generate and cache audio
      await this.generateAndCacheChunk(bookId, chunk, voiceId);
    }
  }
}
```

## Performance Optimization

### Critical Performance Metrics

1. **Time to First Audio**: <2 seconds (maintain current)
2. **Service Worker Boot**: <100ms
3. **Cache Response Time**: <50ms
4. **Offline Detection**: <200ms

### Optimization Strategies

1. **Lazy Registration**
   ```javascript
   // Register SW after page load
   if ('serviceWorker' in navigator) {
     window.addEventListener('load', () => {
       navigator.serviceWorker.register('/sw.js');
     });
   }
   ```

2. **Strategic Prefetching**
   ```javascript
   // Prefetch during idle time
   if ('requestIdleCallback' in window) {
     requestIdleCallback(() => {
       prefetchNextChapters();
     });
   }
   ```

3. **Cache Size Management**
   ```javascript
   // Monitor and manage cache size
   async function manageCacheSize() {
     const estimate = await navigator.storage.estimate();
     const percentUsed = (estimate.usage / estimate.quota) * 100;
     
     if (percentUsed > 80) {
       await evictLeastRecentlyUsed();
     }
   }
   ```

## Security Considerations

1. **Content Integrity**
   - Verify cached content hashes
   - Implement cache poisoning protection
   - Use HTTPS for all resources

2. **User Privacy**
   - Encrypt sensitive data in IndexedDB
   - Clear cache on logout
   - Respect user privacy settings

3. **Update Security**
   - Verify service worker updates
   - Implement rollback mechanism
   - Monitor for suspicious activity

## Implementation Roadmap

### Phase 1: Basic Service Worker (Week 1)
- [ ] Install next-pwa
- [ ] Configure basic caching
- [ ] Implement offline page
- [ ] Test on target devices

### Phase 2: Audio Offline Support (Week 2)
- [ ] Implement IndexedDB for audio
- [ ] Add prefetching logic
- [ ] Integrate with audio service
- [ ] Test offline playback

### Phase 3: Full Offline Experience (Week 3)
- [ ] Add offline UI indicators
- [ ] Implement background sync
- [ ] Add update notifications
- [ ] Complete offline feature set

### Phase 4: Optimization & Testing (Week 4)
- [ ] Performance optimization
- [ ] Security hardening
- [ ] User acceptance testing
- [ ] Production deployment

## Recommendations

1. **Start with next-pwa** for faster implementation and community support
2. **Prioritize audio caching** as it's the most critical feature
3. **Implement progressive enhancement** to ensure graceful degradation
4. **Use IndexedDB for large files** (audio) and Cache API for smaller assets
5. **Add offline indicators** early to set user expectations
6. **Test extensively on 2G/3G networks** in target markets

## Conclusion

Implementing a robust service worker architecture for BookBridge is achievable within the 4-week timeline. The recommended approach using next-pwa with custom caching strategies will provide excellent offline support while maintaining the current performance standards. The key to success is progressive implementation, starting with basic offline support and gradually adding advanced features.

*Research completed: August 30, 2025*  
*Author: Agent 1 - Service Worker & Offline Architecture Specialist*