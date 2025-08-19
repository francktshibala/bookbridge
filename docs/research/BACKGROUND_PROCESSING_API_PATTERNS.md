# Background Processing & API Integration Patterns in BookBridge

## Research Summary

This document analyzes the background processing system and API integration patterns in BookBridge, focusing on how successful API calls are made across different contexts and environments.

## Key Findings

### 1. '/api/openai/tts' Usage Patterns

**Found 17 instances across the codebase:**

- **Client-side usage** (most common):
  - `lib/voice-service.ts:804` - Direct fetch from voice service
  - `lib/progressive-audio-service.ts:385` - Real-time audio generation
  - `components/audio/InstantAudioPlayer.tsx:246` - Progressive fallback
  - Pattern: `fetch('/api/openai/tts', { method: 'POST', ... })`

- **Server-side usage** (background processing):
  - `lib/audio-pregeneration-service.ts:268` - Pre-generation worker
  - Pattern: Uses full URL construction with base URL

- **API Route Implementation**:
  - `app/api/openai/tts/route.ts` - Server-side handler
  - Validates API key, handles errors, returns audio buffer

### 2. Background Workers & Services Analysis

**Successful API Call Patterns:**

1. **Audio Pre-generation Service** (`lib/audio-pregeneration-service.ts`):
   - **Server-side pattern**: Uses `process.env.NEXTAUTH_URL` or hardcoded localhost for base URL
   - **Line 399-400**: `const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'`
   - **Line 400**: `fetch(\`\${baseUrl}/api/books/\${bookId}/cached-simplification?level=\${cefrLevel}&chunk=\${chunkIndex}\`)`
   - **Key insight**: Background services construct full URLs when running server-side

2. **Audio Prefetch Service** (`lib/audio-prefetch-service.ts`):
   - **Client-side pattern**: Uses relative URLs when running in browser
   - **Line 210**: `fetch(\`/api/books/\${options.bookId}/content-fast\`)`
   - **Key insight**: Services adapt URL construction based on execution context

3. **Progressive Audio Service** (`lib/progressive-audio-service.ts`):
   - **Client-side pattern**: Direct relative API calls
   - **Line 385**: `fetch('/api/openai/tts', { method: 'POST', ... })`
   - **Key insight**: Real-time services use relative URLs for immediate response

### 3. Client-side vs Server-side API Call Differences

**Client-side calls:**
```typescript
// Relative URLs work fine in browser context
fetch('/api/openai/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, voice, speed })
})
```

**Server-side calls:**
```typescript
// Need full URLs when not in browser context
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
fetch(`${baseUrl}/api/books/${bookId}/cached-simplification?level=${cefrLevel}&chunk=${chunkIndex}`)
```

**Critical difference**: Server-side background processes cannot use relative URLs and must construct absolute URLs.

### 4. URL Construction Utilities & Helpers

**Current patterns found:**

1. **Environment-based URL construction**:
   ```typescript
   // audio-pregeneration-service.ts:399
   const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
   ```

2. **No centralized URL helper utility found** - this is a gap in the codebase

3. **Test scripts pattern**:
   ```javascript
   // scripts/test-books-api.js:45
   const response = await fetch('http://localhost:3000/api/books', {...})
   ```

### 5. Environment Handling (Dev/Prod)

**Environment variables used:**

1. **NEXTAUTH_URL**: Primary environment variable for determining base URL
   - Used in: `audio-pregeneration-service.ts`
   - Fallback: `http://localhost:3001` for development

2. **Test environments**: 
   - Scripts use hardcoded `localhost:3000` or `localhost:3001`
   - No consistent environment detection

3. **API routes**: 
   - Server-side routes use `request.nextUrl.origin` when available
   - Example: `app/api/books/[id]/cached-simplification/route.ts:50`

## Best Practices for Background Jobs

### 1. URL Construction Pattern

**Recommended approach** (based on successful patterns):

```typescript
function getApiBaseUrl(): string {
  // Server-side: use environment variable with fallback
  if (typeof window === 'undefined') {
    return process.env.NEXTAUTH_URL || 'http://localhost:3001';
  }
  // Client-side: use relative URLs
  return '';
}

function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${endpoint}`;
}
```

### 2. Successful API Call Pattern

**For background processing** (server-side):

```typescript
const response = await fetch(buildApiUrl('/api/openai/tts'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: cleanText,
    voice: voiceId,
    speed: 1.0
  })
});
```

### 3. Error Handling Patterns

**Successful implementations include**:

1. **Timeout handling**: 30-second timeouts for TTS calls
2. **Retry logic**: Background services retry failed operations
3. **Fallback strategies**: Progressive degradation when APIs fail
4. **Status tracking**: Services track progress and completion

### 4. Environment Detection

**Current successful pattern**:

```typescript
// Detect if running server-side
const isServerSide = typeof window === 'undefined';

// Use appropriate URL construction
const apiUrl = isServerSide 
  ? `${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/endpoint`
  : '/api/endpoint';
```

## Recommendations for Progressive Voice Background Processing

### 1. Create URL Construction Utility

```typescript
// lib/utils/api-urls.ts
export function getApiUrl(endpoint: string): string {
  if (typeof window === 'undefined') {
    // Server-side: use full URL
    const baseUrl = process.env.NEXTAUTH_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   'http://localhost:3001';
    return `${baseUrl}${endpoint}`;
  }
  // Client-side: use relative URL
  return endpoint;
}
```

### 2. Background Service Pattern

```typescript
// For audio pre-generation background jobs
export class BackgroundTTSService {
  private async callTTSAPI(text: string, voiceId: string): Promise<ArrayBuffer> {
    const response = await fetch(getApiUrl('/api/openai/tts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: voiceId, speed: 1.0 })
    });
    
    if (!response.ok) {
      throw new Error(`TTS API failed: ${response.statusText}`);
    }
    
    return await response.arrayBuffer();
  }
}
```

### 3. Environment Configuration

**Add to environment variables**:
```env
# For production
NEXTAUTH_URL=https://your-domain.com

# For development (already exists)
NEXTAUTH_URL=http://localhost:3001
```

## Key Success Factors

1. **Absolute URLs for server-side**: Background jobs need full URLs
2. **Relative URLs for client-side**: Browser context works with relative paths
3. **Environment detection**: Check `typeof window === 'undefined'`
4. **Proper error handling**: Timeouts, retries, and fallbacks
5. **Consistent base URL**: Use `NEXTAUTH_URL` environment variable

## Implementation Priority

1. **High**: Create centralized URL construction utility
2. **High**: Update background services to use proper URL construction
3. **Medium**: Standardize environment variable usage
4. **Medium**: Add proper error handling for all API calls
5. **Low**: Create test utilities for API integration testing

This research provides the foundation for implementing reliable background processing in the Progressive Voice system.