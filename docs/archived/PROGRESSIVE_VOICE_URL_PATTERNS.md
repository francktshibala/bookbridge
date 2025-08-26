# Progressive Voice URL Patterns Analysis

## Executive Summary

The BookBridge audio pre-generation service has a critical architectural flaw where background processing uses relative URLs that fail in server contexts. The main issue occurs at `lib/audio-pregeneration-service.ts:268` where internal TTS API calls use relative paths without proper base URL construction.

## URL Construction Patterns Found

### 1. Audio Pre-Generation Service (lib/audio-pregeneration-service.ts)

**Problematic Relative URLs:**
- Line 143: `/api/audio/pregenerated?cacheKey=${cacheKey}` 
- Line 268: `/api/openai/tts` ⚠️ **FAILS IN BACKGROUND**
- Line 294: `/api/elevenlabs/tts` ⚠️ **FAILS IN BACKGROUND**

**Successful Absolute URL:**
- Lines 399-400: Uses `process.env.NEXTAUTH_URL` properly
```typescript
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
const response = await fetch(`${baseUrl}/api/books/${bookId}/cached-simplification?level=${cefrLevel}&chunk=${chunkIndex}`);
```

### 2. Progressive Audio Service (lib/progressive-audio-service.ts)

**Working Relative URLs (Client-Side Only):**
- Line 357: `/api/elevenlabs/tts`
- Line 385: `/api/openai/tts` 
- Line 543: `/api/audio/cache?bookId=${bookId}&chunkIndex=${chunkIndex}&cefrLevel=${cefrLevel}&voiceId=${voiceId}`

*These work because they execute in browser context with implicit base URL.*

## Root Cause Analysis

### The Critical Issue at Line 268

```typescript
// PROBLEMATIC CODE
const response = await fetch('/api/openai/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: text,
    voice: voiceId,
    speed: 1.0
  })
});
```

**Why This Fails:**
1. **Context Mismatch**: Background processing lacks browser's implicit base URL resolution
2. **Missing Environment Variables**: No base URL construction unlike successful pattern at lines 399-400
3. **Server-Side Execution**: `fetch('/api/openai/tts')` resolves to invalid URL in Node.js context

## Environment Variable Patterns

### Current Configuration
```bash
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="https://xsolwqqdbsuydwmmwtsl.supabase.co"
```

### Usage Inconsistencies
- ✅ **Correct Usage (Line 399)**: `process.env.NEXTAUTH_URL || 'http://localhost:3001'`
- ❌ **Missing Usage (Lines 268, 294)**: No environment variable usage
- ⚠️ **Port Mismatch**: `.env` shows port 3000, code defaults to 3001

## Successful Background Job Patterns

### 1. Test Scripts (test-tts-generation.js)
```javascript
const testUrl = `http://localhost:3002/api/precompute/tts?bookId=${testBook.id}&cefrLevel=B2&chunkIndex=0&voiceId=alloy`;
const response = await fetch(testUrl);
```
**Pattern**: Hardcoded absolute URLs with explicit ports

### 2. External API Calls
```typescript
const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
```
**Pattern**: Full absolute URLs for external services

## Recommended Solutions

### Immediate Fix

Replace relative URLs in `audio-pregeneration-service.ts`:

```typescript
// CREATE UTILITY FUNCTION
private getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
}

// FIX LINE 268
const response = await fetch(`${this.getBaseUrl()}/api/openai/tts`, {

// FIX LINE 294  
const response = await fetch(`${this.getBaseUrl()}/api/elevenlabs/tts`, {

// FIX LINE 143
const response = await fetch(`${this.getBaseUrl()}/api/audio/pregenerated?cacheKey=${cacheKey}`);
```

### Comprehensive Solution

**1. Create Centralized URL Helper** (`lib/utils/url-helper.ts`):
```typescript
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
}

export function getInternalApiUrl(path: string): string {
  return `${getBaseUrl()}${path}`;
}
```

**2. Update All Internal API Calls**:
- Import helper in both audio services
- Replace all relative internal URLs with `getInternalApiUrl()`
- Keep external URLs (ElevenLabs API) as absolute

**3. Environment Variable Standardization**:
```bash
# Development
NEXTAUTH_URL="http://localhost:3000"

# Production  
NEXTAUTH_URL="https://your-domain.com"
VERCEL_URL="your-vercel-domain.vercel.app"
```

## Production Deployment Considerations

### Current Risks
- Hard-coded localhost URLs will fail in production
- No `VERCEL_URL` support for Vercel deployments  
- Background jobs cannot reach internal APIs with relative URLs

### Production-Ready Pattern
```typescript
const getApiBaseUrl = () => {
  // Production: Use VERCEL_URL or explicit production URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Development: Use NEXTAUTH_URL or localhost
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
};
```

## Implementation Priority

1. **HIGH**: Fix lines 268 and 294 in `audio-pregeneration-service.ts`
2. **MEDIUM**: Create centralized URL helper utility
3. **MEDIUM**: Standardize environment variable usage
4. **LOW**: Update progressive audio service for consistency

## Testing Verification

After implementing fixes, verify:
1. Background audio pre-generation completes successfully
2. TTS API calls resolve to correct URLs in server context
3. Client-side progressive audio continues working
4. Production deployment uses correct base URLs

---

*Analysis completed: 2025-08-19*
*Files analyzed: lib/audio-pregeneration-service.ts, lib/progressive-audio-service.ts, test scripts*