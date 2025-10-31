# AI Chat Hedging - Implementation Status

**Date:** 2025-10-31
**Branch:** `feature/ai-chat-hedging`
**Status:** 🟡 Partially Working (Needs Review)

## 📋 Summary

Implemented dual-provider AI hedging (OpenAI + Anthropic) with Promise.race strategy. **2 of 3 pages working**, but significant issues remain.

---

## ✅ What's Implemented

### Core Hedging Logic (`/lib/ai/hedged-query.ts`)
- **Dual-provider racing:** OpenAI + Anthropic in parallel via `Promise.race()`
- **Global timeout budgets:** 25s for chat, 6s TTFT for streaming
- **Validation window:** 150ms to prefer first provider
- **Micro-retry:** Retry with temperature 0.1 on failure
- **Cost guards:** `DISABLE_OPENAI` / `DISABLE_ANTHROPIC` env toggles
- **Budget-aware timeouts:** Derive provider timeouts from remaining global budget

### Provider Wrappers
- `/lib/ai/providers/openai.ts` - OpenAI wrapper with timeout + abort
- `/lib/ai/providers/anthropic.ts` - Claude wrapper with streaming support
- `/lib/ai/providers/types.ts` - Unified response interface

### Testing
- ✅ **8/8 tests passing** (`__tests__/lib/ai/hedged-query.test.ts`)
- ✅ **Build succeeds** (TypeScript compilation)

### Supporting Changes
- Multi-agent disabled by default (routes through hedging)
- Query alias handling (accepts `query`, `message`, or `prompt`)
- Enhanced error logging in providers

---

## ❌ Issues Found

### 1. **Authentication Middleware Disabled**
**Root Cause:** `/middleware.ts` was completely disabled, breaking Supabase session refresh.

**Fix Applied:** Restored proper Supabase SSR middleware with automatic session refresh.

**Status:** ✅ Fixed in commit `0864c6a`

### 2. **Testing Blocked by Auth**
**Issue:** AI API requires authentication (`getUser()` check at line 69), but users are getting logged out.

**Current Behavior:**
- Auth middleware restored but sessions still failing
- Some pages work, some don't (inconsistent)
- Error: `Auth session missing! (401)`

**Recommendation:** Either fix auth properly OR temporarily remove auth requirement for testing.

### 3. **Poor AI Response Quality** ⚠️
**Issue:** User reports "the answer that are being given are not great"

**Possible Causes:**
- Hedging picks fastest provider, not best quality
- OpenAI/Claude using default models (may not be optimal)
- Temperature/prompt engineering needs tuning
- Context not being passed correctly

**Needs Investigation:**
- Compare response quality: hedging vs. single-provider
- Check which provider is winning the race (OpenAI likely faster but lower quality)
- Consider quality-first strategy instead of speed-first
- May need to route different query types to different providers

### 4. **Partial Page Failures**
**Status:** 2 of 3 pages working, 1 failing

**Pages:**
- ✅ Library (`/`) - Working
- ✅ Featured Books (`/featured-books`) - Working
- ❌ Enhanced Collection (`/enhanced-collection`) - **FAILING**

**Not Investigated:** Unknown if failure is hedging-specific or page-specific bug.

### 5. **Claude Model Availability**
**Issue:** User's Anthropic API key lacks access to Claude 3.5 and Claude 3 Sonnet models.

**Workaround:** Multi-agent service disabled entirely (uses only hedging).

**Future Fix:** Add model resolver with fallback chain: Sonnet → Haiku → OpenAI

---

## 🔧 Configuration

### Environment Variables

**Required:**
```bash
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
```

**Optional Cost Guards:**
```bash
DISABLE_OPENAI=true    # Disable OpenAI provider
DISABLE_ANTHROPIC=true # Disable Anthropic provider
```

**Multi-Agent (Disabled by Default):**
```bash
ENABLE_MULTI_AGENT=true # Route complex queries to multi-agent system
```

### Timeout Configuration

Defined in `/lib/ai/hedged-query.ts`:
```typescript
const GLOBAL_TIMEOUT = 25000;        // 25s for non-streaming
const STREAMING_TTFT_TIMEOUT = 6000; // 6s time-to-first-token
const VALIDATION_WINDOW = 150;       // 150ms to prefer first provider
```

---

## 📊 Test Results

```bash
npm test -- hedged-query.test.ts
```

**Results:** ✅ **8/8 tests passing**

1. ✅ Returns first successful response
2. ✅ Falls back to second provider on first failure
3. ✅ Micro-retries with lower temperature
4. ✅ Respects global timeout
5. ✅ Budget-aware provider timeouts
6. ✅ Validation window prefers first provider
7. ✅ Handles streaming responses
8. ✅ Respects cost guard toggles

---

## 🚧 Known Limitations

1. **No quality routing** - Always picks fastest, not best quality
2. **No cost optimization** - Doesn't prefer cheaper provider
3. **No provider health tracking** - Doesn't learn from failures
4. **No telemetry dashboard** - Can't see which provider is winning
5. **No A/B testing** - Can't compare hedging vs. single-provider
6. **No graceful degradation** - If both fail, user sees error (no fallback to simpler model)

---

## 📝 Next Steps (When Resuming)

### Priority 1: Fix Authentication
- [ ] Debug why sessions still failing after middleware fix
- [ ] Consider removing auth requirement for beta/demo
- [ ] Or implement IP-based rate limiting instead

### Priority 2: Fix Enhanced Collection Page
- [ ] Identify why 1 of 3 pages failing
- [ ] Check if page sends different payload structure
- [ ] Verify hedging works consistently across all pages

### Priority 3: Investigate Response Quality
- [ ] Log which provider wins each race (OpenAI vs. Claude)
- [ ] Compare response quality manually (hedged vs. single-provider)
- [ ] Consider quality-first strategy:
  ```typescript
  // Wait for both responses, pick best quality instead of fastest
  const responses = await Promise.all([openai, claude]);
  return selectBestQuality(responses);
  ```
- [ ] Or route by query type (complex → Claude, simple → OpenAI)

### Priority 4: Add Telemetry
- [ ] Track which provider wins each race
- [ ] Measure latency differences
- [ ] Track cost per provider
- [ ] Build admin dashboard

### Priority 5: Production Readiness
- [ ] Add feature flag (`ENABLE_AI_HEDGING=true`)
- [ ] Test with real users (A/B test hedging vs. control)
- [ ] Monitor costs (dual requests = 2x cost until one wins)
- [ ] Add circuit breaker for failing providers

---

## 🔗 Related Files

### Core Implementation
- `/lib/ai/hedged-query.ts` - Main hedging logic
- `/lib/ai/providers/openai.ts` - OpenAI provider wrapper
- `/lib/ai/providers/anthropic.ts` - Anthropic provider wrapper
- `/lib/ai/providers/types.ts` - Unified types

### API Integration
- `/app/api/ai/route.ts` - Main AI API endpoint (lines 128-245)
- `/middleware.ts` - Supabase auth middleware (FIXED)

### Tests
- `/__tests__/lib/ai/hedged-query.test.ts` - Hedging tests (8/8 passing)

### Configuration
- `.env.local` - Environment variables (API keys, toggles)

---

## 💡 Alternative Approaches (If Starting Over)

### 1. **Quality-First (vs. Speed-First)**
Wait for both responses, pick highest quality:
```typescript
const [openai, claude] = await Promise.all([...]);
return selectBestQuality(openai, claude);
```
**Pros:** Better responses
**Cons:** Slower (waits for both), 2x cost always

### 2. **Smart Routing (vs. Racing)**
Route by query type instead of racing:
```typescript
if (isComplex(query)) return callClaude();
else return callOpenAI();
```
**Pros:** Only 1 request = lower cost
**Cons:** No redundancy if chosen provider fails

### 3. **Sequential Fallback (vs. Parallel Racing)**
Try OpenAI first, fallback to Claude only if it fails:
```typescript
try {
  return await callOpenAI();
} catch {
  return await callClaude();
}
```
**Pros:** Lower cost (usually only 1 request)
**Cons:** Slower on OpenAI failures

### 4. **Hybrid Strategy**
Race for first response, but continue both and learn which gives better quality:
```typescript
const winner = await Promise.race([openai, claude]);
// Use winner immediately, but log both for quality comparison
Promise.all([openai, claude]).then(logQualityMetrics);
return winner;
```
**Pros:** Fast response + quality learning
**Cons:** Always 2x cost

---

## 📚 References

- **Implementation Plan:** `/docs/ai-hedging-plan.md`
- **GPT-5 Recommendations:** See commits for inline GPT-5 guidance
- **Supabase SSR Docs:** https://supabase.com/docs/guides/auth/server-side/nextjs

---

## ⚠️ Deployment Notes

**DO NOT merge to main until:**
1. ✅ Authentication working consistently
2. ✅ All 3 pages tested successfully
3. ✅ Response quality validated
4. ✅ Feature flag added (`ENABLE_AI_HEDGING=false` default)
5. ✅ Cost monitoring in place

**Current Recommendation:** Keep on feature branch, test more thoroughly before production.

---

**Questions? See commit history or contact implementer.**
