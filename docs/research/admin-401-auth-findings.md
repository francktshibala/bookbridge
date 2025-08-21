# Admin Dashboard 401 Authorization Issue - Research Findings

## Problem Summary
The admin dashboard pre-generation queue shows 200 pending jobs stuck at 0% progress due to 401 Unauthorized errors when the worker tries to call the simplify endpoint.

## Context from Wireframes
- **Pre-generation Queue** (Screenshot 10.34.50 AM): Shows 200 pending jobs for gutenberg-1513 at C2 level, all at 0% progress
- **Book Management** (Screenshot 10.35.19 AM): Shows "Generate Audio" buttons for books like Emma, Pride & Prejudice, Frankenstein
- **Dashboard** (Screenshot 10.34.38 AM): Shows 6,644 jobs in queue, $0.00 monthly TTS costs (indicating no successful processing)

## Research Findings

### GPT-5 Agent Findings

1) Root Cause

- The worker posts to `POST /api/books/{id}/simplify` with `x-internal-token`, but the simplify `POST` delegates to `GET(request, { params })` without constructing a new `Request`. In Next.js App Router, reusing the original `request` object while changing URL search params is unreliable for custom header access inside the delegated handler. As implemented, the internal bypass check in `GET` reads `request.headers.get('x-internal-token')`, which is sometimes absent in this code path, causing the code to fall back to Supabase auth and return 401 when no user session is present.

- Additionally, the worker transforms book IDs by stripping the `gutenberg-` prefix when constructing the simplify URL, resulting in `/api/books/${bookId.replace('gutenberg-', '')}/simplify`. The simplify route expects the unmodified book ID (e.g., `gutenberg-1342`) for external/Gutenberg bypass logic and downstream lookups. This mismatch can lead to treating the book as an internal ID, triggering stricter auth and contributing to 401s or content lookup failures.

2) Code References

- Simplify internal bypass in `GET` and delegation in `POST`:
```471:821:app/api/books/[id]/simplify/route.ts
// ...
if (!isExternalBook) {
  const internalToken = request.headers.get('x-internal-token')
  const validInternal = internalToken && internalToken === process.env.INTERNAL_SERVICE_TOKEN
  if (!validInternal) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }
}
// ...
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // ...
  // Redirect to GET with parameters
  const url = new URL(request.url)
  url.searchParams.set('level', level)
  url.searchParams.set('chunk', chunkIndex.toString())
  
  return GET(request, { params })
}
```

- Worker calling simplify with stripped ID and header:
```1:341:lib/precompute/book-processor.ts
// ...
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
const response = await fetch(`${baseUrl}/api/books/${bookId.replace('gutenberg-', '')}/simplify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '' },
  body: JSON.stringify({ level: cefrLevel, chunkIndex })
})
```

3) Why headers are lost

- App Router handlers are simple functions; when `POST` reuses the original `request` (which already has a different URL) and then `GET` reads `request.headers`, behavior can diverge under edge/runtime optimizations, and any middleware or body parsing can also consume state. The safer pattern is to create a fresh `Request` with the intended URL and explicitly pass the original headers so custom headers like `x-internal-token` are preserved deterministically.

4) Solution Options

- Option A (recommended, minimal risk): In `POST` of `simplify/route.ts`, construct a new `Request` targeting the `GET` URL with copied headers and call `GET(newRequest, { params: { id } })` instead of reusing the original `request`. Example sketch:
  - Build `const getUrl = new URL(request.url); getUrl.searchParams.set('level', level); getUrl.searchParams.set('chunk', String(chunkIndex));`
  - Create `const forwarded = new Request(getUrl.toString(), { headers: request.headers, method: 'GET' });`
  - Invoke `return GET(forwarded, { params: Promise.resolve({ id }) })`.

- Option B: Perform the simplify logic in a shared function and call it from both `GET` and `POST`, avoiding handler-to-handler delegation entirely. `POST` would pass primitives; `GET` would parse from URL. This sidesteps header forwarding issues.

- Option C: In `GET`, check the internal token from both `request.headers` and a fallback (e.g., query param) for internal calls. Less ideal from a security perspective but workable for internal-only environments.

5) Additional Fixes

- Keep the full book ID in worker calls. Replace `${bookId.replace('gutenberg-', '')}` with `${bookId}` so external book detection and Gutenberg overrides function correctly and auth bypass for external IDs is honored.

6) Recommended Fix

- Implement Option A in `app/api/books/[id]/simplify/route.ts` `POST` and correct the worker URL to use the unmodified `bookId`. This ensures the `x-internal-token` is reliably available to the `GET` handler and that external book logic applies. Low surface area change, minimal risk.

7) Risks and Considerations

- Ensure `INTERNAL_SERVICE_TOKEN` is set in the runtime environment used by the worker.
- Verify `request.headers` is cloneable in the runtime; if not, manually reconstruct a `Headers` object.
- After the change, validate that `content-fast` still enforces auth for internal IDs and that Gutenberg IDs remain treated as external when appropriate.

### Claude Code Agent Findings

1) Root Cause Analysis

I've identified TWO critical issues causing the 401 errors:

**Issue 1: Book ID Stripping Bug**
- The worker at `/lib/precompute/book-processor.ts:275` strips the 'gutenberg-' prefix when calling the API
- This transforms `gutenberg-1513` → `1513` in the URL
- The simplify route uses `id.includes('-')` to detect external books
- Without the hyphen, `1513` is treated as an internal book requiring authentication

**Issue 2: Header Forwarding in POST→GET Delegation**
- The POST handler delegates to GET by calling `return GET(request, { params })`
- This reuses the original request object without properly constructing a new one
- Headers like `x-internal-token` may not be reliably forwarded in this pattern

2) Code Evidence

**Book ID Stripping** (`/lib/precompute/book-processor.ts:275`):
```typescript
const response = await fetch(`${baseUrl}/api/books/${bookId.replace('gutenberg-', '')}/simplify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '' },
```

**External Book Detection** (`/app/api/books/[id]/simplify/route.ts:480`):
```typescript
const isExternalBook = id.includes('-') && !id.match(/^[0-9a-f-]{36}$/)
```

**POST→GET Delegation** (`/app/api/books/[id]/simplify/route.ts:813`):
```typescript
return GET(request, { params })
```

3) Verification Through Test Scripts

Test scripts like `/scripts/test-simplification-direct.js` use the correct pattern with full bookId:
```javascript
`${baseUrl}/api/books/${bookId}/simplify?level=${level}&chunkIndex=${chunkIndex}&useAI=true`
```

4) Why Both Issues Cause 401s

- When bookId becomes just `1513`, it's not detected as external
- The auth check runs and looks for either `x-internal-token` or a logged-in user
- Even though the worker sets `x-internal-token`, the POST→GET delegation may lose it
- Result: 401 Unauthorized error

## Proposed Solutions

### Solution 1: Quick Fix (Immediate Relief)
Fix the book ID stripping issue in `/lib/precompute/book-processor.ts:275`:
```typescript
// Change from:
const response = await fetch(`${baseUrl}/api/books/${bookId.replace('gutenberg-', '')}/simplify`, {

// To:
const response = await fetch(`${baseUrl}/api/books/${bookId}/simplify`, {
```

This single-line change will ensure Gutenberg books are properly detected as external and bypass authentication.

### Solution 2: Robust Fix (Header Preservation)
Fix both the book ID issue AND the header forwarding in `/app/api/books/[id]/simplify/route.ts`:

```typescript
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { level, chunkIndex, regenerate = false } = body

    if (regenerate) {
      // Clear cached version logic...
    }

    // Create a new Request with proper headers
    const url = new URL(request.url)
    url.searchParams.set('level', level)
    url.searchParams.set('chunk', chunkIndex.toString())
    
    // Forward all headers including x-internal-token
    const newRequest = new Request(url.toString(), {
      method: 'GET',
      headers: request.headers
    })
    
    return GET(newRequest, { params })
  } catch (error) {
    // Error handling...
  }
}
```

### Solution 3: Refactor to Shared Logic
Extract the simplification logic into a shared function called by both GET and POST:

```typescript
async function handleSimplification(
  id: string,
  level: CEFRLevel,
  chunkIndex: number,
  userId: string,
  useAI: boolean,
  regenerate?: boolean
) {
  // All the simplification logic here
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Parse params and auth
  // Call handleSimplification
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Parse body and auth
  // Call handleSimplification
}
```

## Recommended Implementation

**For Immediate Fix**: Implement Solution 1 only. This is a one-line change that will resolve the 401 errors for the admin dashboard queue processing.

**For Long-term Stability**: Implement Solution 2, which fixes both issues and ensures reliable header forwarding.

### Implementation Steps:

1. **Apply Solution 1** (5 minutes):
   - Edit `/lib/precompute/book-processor.ts:275`
   - Remove `.replace('gutenberg-', '')`
   - Test with a single queue job

2. **Verify Fix**:
   - Check that queue jobs for `gutenberg-1513` now process without 401 errors
   - Monitor the Pre-generation Queue dashboard to see progress > 0%

3. **Apply Solution 2** (15 minutes) if needed:
   - Update the POST handler in simplify route
   - Add logging to verify header forwarding
   - Test both direct API calls and worker calls

4. **Add Integration Tests**:
   - Create a test that simulates the worker calling the API
   - Verify both authentication paths work correctly

The immediate fix (Solution 1) should unblock the 200 pending jobs and allow the pre-generation queue to start processing successfully.