# Voice Integration Troubleshooting Plan

## Problem Statement
Voice features (OpenAI, ElevenLabs) work perfectly in test pages but fail or are slow when integrated into the main book reading page at `/library/[id]/read`.

## Root Cause Analysis

### 1. **Text Content Issues**
- **Problem**: Book content may contain special characters, formatting, or be too long
- **Test**: 
  ```bash
  # Check if text length is causing issues
  # OpenAI has 4000 char limit, ElevenLabs has different limits
  ```
- **Solution**: Implement text chunking and sanitization

### 2. **Component Lifecycle Timing**
- **Problem**: Multiple async operations compete during page load
  - Auth check
  - Book content fetch
  - Voice service initialization
  - State updates
- **Test**: Add console timing logs to track initialization order
- **Solution**: Ensure voice service only initializes after content is loaded

### 3. **Memory/Performance Issues**
- **Problem**: Large book content may cause performance degradation
- **Test**: Monitor browser memory usage and network requests
- **Solution**: Implement lazy loading and cleanup

### 4. **API Request Failures**
- **Problem**: API calls may fail silently or timeout
- **Test**: Check browser network tab for failed requests
- **Solution**: Add better error handling and retry logic

## Immediate Action Plan

### Step 1: Add Debug Logging
```typescript
// In AudioPlayerWithHighlighting component
useEffect(() => {
  console.log('[VOICE DEBUG] Component mounted');
  console.log('[VOICE DEBUG] Text length:', text?.length);
  console.log('[VOICE DEBUG] Text preview:', text?.substring(0, 100));
  return () => {
    console.log('[VOICE DEBUG] Component unmounting - cleanup');
  };
}, [text]);
```

### Step 2: Text Validation & Sanitization
```typescript
// Add text validation before voice synthesis
const sanitizeTextForTTS = (text: string): string => {
  // Remove special characters that might break TTS
  let sanitized = text
    .replace(/[^\w\s.,!?;:'"()-]/g, ' ')  // Keep only safe chars
    .replace(/\s+/g, ' ')                   // Normalize whitespace
    .trim();
  
  // Truncate if too long
  const MAX_LENGTH = 3000; // Safe limit for all providers
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH) + '...';
    console.warn('[VOICE DEBUG] Text truncated from', text.length, 'to', MAX_LENGTH);
  }
  
  return sanitized;
};
```

### Step 3: Ensure Proper Initialization Order
```typescript
// In the main page component
const [isContentReady, setIsContentReady] = useState(false);

useEffect(() => {
  async function loadContent() {
    // ... existing content loading ...
    setIsContentReady(true);
  }
}, []);

// Only render AudioPlayer when content is ready
{isContentReady && (
  <AudioPlayerWithHighlighting 
    text={sanitizedText}
    // ... other props
  />
)}
```

### Step 4: Add Network Request Monitoring
```typescript
// In voice-service.ts
const makeAPIRequest = async (url: string, options: RequestInit) => {
  const startTime = Date.now();
  console.log(`[VOICE API] Starting request to ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(30000) // 30s timeout
    });
    
    const duration = Date.now() - startTime;
    console.log(`[VOICE API] Request completed in ${duration}ms`);
    
    if (!response.ok) {
      console.error(`[VOICE API] Request failed:`, response.status, response.statusText);
    }
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[VOICE API] Request failed after ${duration}ms:`, error);
    throw error;
  }
};
```

### Step 5: Memory Management
```typescript
// Clean up audio resources properly
useEffect(() => {
  return () => {
    // Stop any playing audio
    voiceService.stop();
    
    // Revoke object URLs to free memory
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      if (audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }
    });
  };
}, []);
```

## Testing Protocol

1. **Test with Debug Page**:
   ```bash
   npm run dev
   # Navigate to http://localhost:3000/debug-voice-integration
   ```

2. **Test with Different Content**:
   - Short text (< 100 chars)
   - Medium text (500-1000 chars)  
   - Long text (3000+ chars)
   - Text with special characters

3. **Monitor Performance**:
   - Open Chrome DevTools
   - Check Network tab for API requests
   - Check Console for error messages
   - Monitor Memory usage in Performance tab

4. **Test Each Provider**:
   - Standard Web Speech (should always work)
   - OpenAI (check API limits)
   - ElevenLabs (check credits)
   - ElevenLabs WebSocket (known issues)

## Success Criteria

- ✅ All voice providers work within 3 seconds of clicking play
- ✅ No console errors during playback
- ✅ Highlighting syncs correctly with audio
- ✅ Memory usage remains stable
- ✅ Works with book content of any reasonable length

## Fallback Strategy

If issues persist:
1. Default to Web Speech for reliability
2. Show clear error messages to users
3. Add a "Report Issue" button that captures debug info
4. Consider server-side audio generation for long texts