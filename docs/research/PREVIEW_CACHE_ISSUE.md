# Preview Cache Issue - Power of Vulnerability (A2/B1)

**Date**: November 30, 2025
**Status**: UNRESOLVED (To be tested in production)

## Issue Description

Preview sections for A2 and B1 levels of "The Power of Vulnerability" are not displaying in development environment, despite:
- Preview files existing in cache
- APIs returning preview data correctly (verified via curl)
- A1 level showing preview correctly

## Root Cause

**Multiple layers of caching** prevent preview from appearing after it was added post-bundle generation:

1. **Server-side API cache**: `export const revalidate = 3600` in API routes
2. **Client-side fetch cache**: `next: { revalidate: 3600 }` in book-loader.ts
3. **Browser service worker cache**: PWA service worker caching responses
4. **Next.js build cache**: `.next` directory caching

When A2/B1 bundles were first generated, preview didn't exist yet. The first API calls were cached without preview data. Even after:
- Adding preview files to cache
- Updating APIs to return preview
- Clearing .next directory
- Unregistering service workers
- Hard refreshing browser

...the preview still doesn't appear in dev environment.

## What We Tried

1. ✅ Verified preview files exist:
   - `cache/power-of-vulnerability-A1-preview.txt` (350B)
   - `cache/power-of-vulnerability-A1-preview-audio.json` (336B)
   - `cache/power-of-vulnerability-A2-preview.txt` (379B)
   - `cache/power-of-vulnerability-A2-preview-audio.json` (338B)
   - `cache/power-of-vulnerability-B1-preview.txt` (639B)
   - `cache/power-of-vulnerability-B1-preview-audio.json` (338B)

2. ✅ Verified APIs return preview correctly:
   ```bash
   curl "http://localhost:3000/api/power-of-vulnerability-a1/bundles?bookId=power-of-vulnerability&level=A1"
   # Returns: { "preview": "...", "previewAudio": { "audioUrl": "...", "duration": 24.352268 } }
   ```

3. ❌ Disabled all caching temporarily (`revalidate: 0`)
4. ❌ Cleared .next directory and restarted dev server
5. ❌ Unregistered service workers
6. ❌ Hard refresh (Cmd+Shift+R)

## Hypothesis

Development environment may have deeper caching issues. Production build with fresh cache might resolve this.

## Frontend Code

Preview is rendered in `/app/featured-books/page.tsx` (lines 1877-1899):

```typescript
{(bundleData as any).preview && (
  <div className="px-4 py-6 mb-6 mx-4 md:mx-8 rounded-lg border-2 border-[var(--accent-primary)]/20 bg-[var(--bg-primary)]">
    <p className="text-[var(--text-primary)] leading-relaxed mb-4">
      {(bundleData as any).preview}
    </p>

    {(bundleData as any).previewAudio?.audioUrl && (
      <PreviewAudioPlayer
        audioUrl={(bundleData as any).previewAudio.audioUrl}
        duration={(bundleData as any).previewAudio.duration}
      />
    )}
  </div>
)}
```

## Next Steps

1. Restore cache settings to production values (`revalidate: 3600`)
2. Build production version
3. Deploy and test on production environment
4. If still doesn't work, investigate browser DevTools Network tab for actual API responses

## Implementation Guide Update Needed

Add to MODERN_VOICES_IMPLEMENTATION_GUIDE.md:

**⚠️ CRITICAL**: Preview generation (Phase 7.5) MUST happen BEFORE first API deployment. If bundles are deployed without preview, cache issues may prevent preview from appearing even after adding it later.

**Recommended workflow**:
1. Generate simplified text
2. Generate preview (text + audio) ← DO THIS EARLY
3. Generate bundles
4. Integrate database
5. Create API endpoint
6. Deploy (first deployment includes preview)
