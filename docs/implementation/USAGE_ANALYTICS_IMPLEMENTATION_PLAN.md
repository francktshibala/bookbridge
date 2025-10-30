# Usage Analytics Implementation Plan - GPT-5 Validated

> **Purpose**: This document provides a complete strategy for implementing usage analytics to measure how BookBridge is being used. Created to answer critical business questions: Are users using audio? Which books are popular? Do users progress through CEFR levels? What engagement patterns exist? Are performance optimizations working?

---

## 📋 Executive Summary

**What This File Is:**
A step-by-step implementation roadmap for **11 high-impact analytics features** (6 business metrics + 5 performance/quality metrics) that fit seamlessly with BookBridge's existing AudioContext + Service Layer architecture (post-Phase 4 refactor). Each feature is designed as pure functions with minimal state changes, following established patterns.

**GPT-5 Validation Status:** ✅ **APPROVED WITH MINOR CHANGES** (Final Review Complete)
- Original plan (6 features) approved for business/content strategy
- Added 5 critical performance/quality features recommended by GPT-5
- Reordered by priority: Performance validation → Business metrics → UX optimization
- **Final review (Oct 30, 2025)**: Implementation approach validated, specific tracking points confirmed

**When to Use This File:**
- Before implementing any analytics feature
- When answering business/product questions about user behavior
- When preparing investor metrics or growth reports
- When deciding which books to add more CEFR levels for
- **When validating Phase 5 performance optimizations** (TTFA, caching, level-switch latency)

**Quick Status Check:**
- **Current Analytics**: Hero demo only (9 events for voice preference testing)
- **Target State**: Full-app usage tracking (performance, business, quality, engagement)
- **Implementation Status**: Not started (as of October 2025)
- **Estimated Effort**: 2 days for all 11 features (GPT-5 validated)

---

## 🎯 End Result: What We'll Achieve

### Business Impact

**Content Strategy Decisions** ($50K+ saved annually):
- Know which books to add CEFR levels for (focus on popular titles with high engagement)
- Identify drop-off chapters to improve content quality
- Deprioritize low-engagement books (save TTS generation costs)

**Technical ROI Validation** ($200-320 TTS investment):
- Prove audio usage justifies TTS costs (target: 60%+ users play audio)
- Validate Enhanced Timing v3 investment (perfect sync = longer sessions)
- **Validate Phase 5 performance wins** (prove 15x speed improvement with data)

**Investor Metrics** (Fundraising ready):
- "70% of users resume within 24 hours" = sticky product
- "Users progress from A1 to B2 in 90 days" = proven learning outcomes
- "Average session: 15 minutes" = high engagement
- "Book loads in <500ms, 15x faster than before" = world-class UX

**Quality Assurance** (Prevent churn):
- Catch playback stalls/errors before users churn
- Monitor dictionary AI coverage and fallback rates
- Track offline usage for international expansion

### Technical Outcomes

**11 Analytics Features Implemented:**
1. ✅ Load funnel + TTFA (proves Phase 5 performance)
2. ✅ CEFR Level Progression (learning outcomes)
3. ✅ Audio vs Text Usage (TTS ROI)
4. ✅ Book Popularity & Drop-off (content strategy)
5. ✅ Resume Behavior (retention proof)
6. ✅ Session Length & Engagement (usage depth)
7. ✅ Dictionary Coverage/Speed (AI quality)
8. ✅ Playback Stability (catch errors)
9. ✅ Level-Switch Latency (Phase 5 validation)
10. ✅ Speed/Theme Preferences (UX defaults)
11. ✅ AI Tutor Engagement (differentiator proof)

**Architecture Quality:**
- Pure functions in `analytics-service.ts` (no side effects)
- Single tracking point (AudioContext lifecycle methods)
- Feature-flagged (can disable for development)
- Type-safe (TypeScript enums for all events)
- Non-blocking (zero performance impact)

---

## 🏗️ Architecture Foundation (Post-Phase 4 Refactor)

### Current Architecture Strengths

**Why Analytics Fits Perfectly:**

Our Phase 4 refactor created the ideal foundation for analytics:

```typescript
// Current Architecture (Phase 4 Complete)
AudioContext (orchestrator)
  ├─ State Machine (book, level, bundles, isPlaying, position)
  ├─ Lifecycle Events (selectBook, switchLevel, play, pause, seek)
  └─ Guards (requestId pattern, AbortController)
  ↓
Service Layer (pure functions)
  ├─ book-loader.ts (bundle data fetching)
  ├─ availability.ts (level availability checking)
  ├─ level-persistence.ts (localStorage operations)
  └─ audio-transforms.ts (pure data transformations)
  ↓
Components (read-only, dispatch actions)
  └─ No state, just props + context method calls
```

**Perfect for Analytics:**
- ✅ All user actions flow through AudioContext methods (single tracking point)
- ✅ Service layer can log without side effects
- ✅ Components already dispatch actions (easy to add tracking)
- ✅ Hero demo already tracks 9 events (pattern to follow)

### Hero Demo Analytics Pattern (Already Implemented)

**Reference**: `components/hero/InteractiveReadingDemo.tsx:52-74`

```typescript
// Existing pattern we'll replicate
const trackDemoEvent = (
  eventName: string,
  eventData?: Record<string, any>
) => {
  if (!ENABLE_ANALYTICS) return; // Feature flag

  // 1. Console logs for development
  console.log(`[Hero Demo Analytics] ${eventName}`, eventData);

  // 2. Google Analytics for production
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, {
      event_category: 'hero_demo',
      ...eventData
    });
  }
};
```

**Key Principles:**
1. **Feature Flag**: `NEXT_PUBLIC_ENABLE_ANALYTICS` environment variable
2. **Console + Production**: Logs to console (dev) + gtag (production)
3. **Structured Data**: All events include context (book, level, user state)
4. **Non-Blocking**: Never throws errors, never blocks UI

---

## 📊 11 Analytics Features (GPT-5 Prioritized)

### Overview

| # | Feature | Business Value | Effort | ROI | Priority |
|---|---------|---------------|--------|-----|----------|
| 0 | **Load Funnel + TTFA** | **CRITICAL** (Phase 5 validation) | Medium | ⭐⭐⭐⭐⭐ | **1** |
| 2 | CEFR Level Progression | High (learning outcomes) | Low | ⭐⭐⭐⭐⭐ | **2** |
| 3 | Audio vs Text Usage | High (TTS ROI) | Low | ⭐⭐⭐⭐⭐ | **3** |
| 1 | Book Popularity & Drop-off | High (content strategy) | Low | ⭐⭐⭐⭐⭐ | **4** |
| 5 | Resume Behavior | High (retention) | Low | ⭐⭐⭐⭐⭐ | **5** |
| 4 | Session Length & Engagement | Medium (usage depth) | Medium | ⭐⭐⭐⭐ | **6** |
| 7 | Dictionary Coverage/Speed | High (AI quality) | Medium | ⭐⭐⭐⭐ | **7** |
| 8 | Playback Stability | **CRITICAL** (churn prevention) | Medium | ⭐⭐⭐⭐⭐ | **8** |
| 10 | Level-Switch Latency | High (Phase 5 validation) | Low | ⭐⭐⭐⭐ | **9** |
| 6 | Speed/Theme Preferences | Low (UX defaults) | Low | ⭐⭐⭐ | **10** |
| 11 | AI Tutor Engagement | Medium (differentiator) | Medium | ⭐⭐⭐ | **11** |

**Implementation Order** (GPT-5 Recommended):
- **Day 1 AM**: Foundation + Level-switch latency + Audio usage
- **Day 1 PM**: Load funnel + TTFA + Book popularity
- **Day 2 AM**: Resume + Playback stalls + CEFR progression
- **Day 2 PM**: Session/bundles + Speed/Theme + Dictionary + Cache-hit tagging

**Phase 2** (future): AI Tutor + Offline usage (when PWA re-enabled)

---

## 🎯 Business Context

### Why These Analytics Matter

**Current Problem:**
- We don't know which books users actually read (vs just click)
- We don't know if users use audio playback or just read silently
- We don't know if CEFR progression works (do A1 users move to A2?)
- We don't know engagement patterns (session length, drop-off points)
- We can't prove value to investors ("users engage for X minutes, progress Y levels in Z weeks")
- **We can't validate Phase 5 performance wins** (is book loading actually 15x faster?)
- **We're blind to playback errors** (CDN/device issues causing churn)
- **We don't know dictionary AI quality** (coverage, fallback rates, cost)

**Strategic Value:**

1. **Product Decisions** ($50K+ saved on content creation)
   - Which books to add more CEFR levels for (focus on popular titles)
   - Which books to deprioritize (low engagement = don't waste TTS costs)
   - Example: If Pride & Prejudice has 10x more engagement than Sleepy Hollow, prioritize P&P for all 6 levels

2. **Technical ROI** (Validate $200-320 TTS investment)
   - If 80% of users never play audio → rethink TTS-first strategy
   - If audio users have 5x longer sessions → double down on audio quality
   - Proves Enhanced Timing v3 investment was worth it

3. **Investor Pitch** (Metrics for fundraising)
   - "70% of users resume reading within 24 hours" = sticky product
   - "Users progress from A1 to B2 in 90 days" = proven learning outcomes
   - "Average session length: 15 minutes" = high engagement
   - **"Book loads in <500ms, 15x faster"** = world-class UX

4. **Teacher Plans Feature** (Enables Tier 1 Priority from Billion Dollar Roadmap)
   - Track which levels teachers assign most
   - Measure completion rates for classroom use
   - Proves value before building $49/month teacher product

5. **Phase 5 Performance Validation** (GPT-5 Critical Addition)
   - Prove server-side caching works (cache-hit rates)
   - Validate availability fast-path (zero-network for single-level books)
   - Measure time-to-first-audio (TTFA) improvements
   - Track level-switch latency (should be <100ms with caching)

6. **Quality Assurance** (Prevent churn)
   - Catch playback stalls before users complain
   - Monitor dictionary AI fallback rates (cost control)
   - Track error rates by device/network (international UX)

---

## 🛠️ Implementation Plan

### Phase 1: Analytics Service Foundation (30 minutes) ⚡ FOUNDATION

**Goal**: Create reusable analytics service following Phase 4 service layer pattern.

**End Result**: Centralized, type-safe tracking that works across all contexts (Audio, Theme, Dictionary)

#### Task 1.1: Create Analytics Service (Pure Functions)

**What**: Create `lib/services/analytics-service.ts` with pure tracking functions + helper

**Why**: Centralize all tracking logic, follow service layer pattern from Phase 4, DRY common fields

**Files to Create:**
```typescript
// lib/services/analytics-service.ts (NEW)
export type AnalyticsEvent =
  // Performance & Load Funnel
  | 'load_started'
  | 'load_completed'
  | 'load_failed'
  | 'first_audio_ready'
  // Book & Content
  | 'book_selected'
  | 'chapter_started'
  | 'chapter_completed'
  // CEFR & Level
  | 'level_switched'
  | 'level_switch_started'
  | 'level_switch_ready'
  | 'level_switch_aborted'
  // Audio Playback
  | 'audio_played'
  | 'audio_paused'
  | 'audio_completed'
  | 'audio_stall'
  | 'audio_error'
  | 'audio_retry'
  // Dictionary
  | 'dict_lookup_started'
  | 'dict_success'
  | 'dict_fallback'
  | 'dict_error'
  // Session & Engagement
  | 'bundle_completed'
  | 'session_start'
  | 'session_end'
  | 'resume_available'
  | 'resume_clicked'
  // UX Preferences
  | 'speed_changed'
  | 'theme_changed'
  // AI Tutor
  | 'tutor_opened'
  | 'tutor_message_sent'
  | 'tutor_stream_completed';

export interface AnalyticsEventData {
  // Common fields (always included by withCommon helper)
  timestamp?: number;
  session_id?: string;
  book_id?: string;
  book_title?: string;
  level?: CEFRLevel | 'original';
  content_mode?: 'simplified' | 'original';

  // Performance context
  request_id?: string;
  ms_load?: number;
  ms_first_audio?: number;
  ms_switch?: number;
  cache_hit?: boolean;
  fast_path?: boolean;
  page_size?: number;

  // Position context
  chapter?: number;
  bundle_index?: number;
  sentence_index?: number;

  // Audio context
  is_playing?: boolean;
  playback_speed?: number;
  audio_time?: number;
  network_type?: string;
  device?: string;

  // Dictionary context
  word?: string;
  pos_hint?: string;
  source?: 'ai' | 'wiktionary' | 'free';
  examples_count?: number;
  cached?: boolean;

  // Engagement metrics
  session_duration_seconds?: number;
  bundles_completed?: number;
  hours_since_last_read?: number;
  within_24_hours?: boolean;

  // Level switching
  from_level?: CEFRLevel | 'original';
  to_level?: CEFRLevel | 'original';
  from_speed?: number;
  to_speed?: number;
  from_theme?: string;
  to_theme?: string;
  from_chapter?: number;

  // AI Tutor
  chars_in?: number;
  chars_out?: number;
  ms_stream?: number;
  turns?: number;

  // Error context
  error_message?: string;
  error_code?: string;

  // Custom fields
  [key: string]: any;
}

/**
 * Helper to enrich event data with common fields
 * GPT-5 Recommendation: DRY timestamp/session/book/level context
 */
export function withCommon(
  eventData: AnalyticsEventData,
  context?: {
    sessionId?: string;
    bookId?: string;
    bookTitle?: string;
    level?: CEFRLevel | 'original';
    contentMode?: 'simplified' | 'original';
  }
): AnalyticsEventData {
  return {
    timestamp: Date.now(),
    session_id: context?.sessionId || getOrCreateSessionId(),
    book_id: context?.bookId,
    book_title: context?.bookTitle,
    level: context?.level,
    content_mode: context?.contentMode,
    ...eventData
  };
}

/**
 * Pure function to track analytics event
 *
 * @param eventName - Event identifier (see AnalyticsEvent type)
 * @param eventData - Structured event data
 *
 * @design
 * - Pure function (no state, no side effects beyond console/gtag)
 * - Non-blocking (never throws, never awaits)
 * - Feature-flagged (NEXT_PUBLIC_ENABLE_ANALYTICS)
 * - GPT-5 validated pattern
 *
 * @example
 * trackEvent('book_selected', withCommon({
 *   book_id: 'pride-prejudice',
 *   level: 'A1'
 * }, { sessionId }));
 */
export function trackEvent(
  eventName: AnalyticsEvent,
  eventData: AnalyticsEventData
): void {
  // Feature flag check
  const ENABLE_ANALYTICS =
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

  if (!ENABLE_ANALYTICS) return;

  // Ensure timestamp
  const enrichedData = {
    timestamp: Date.now(),
    ...eventData
  };

  // Console logging (development)
  console.log(`[Analytics] ${eventName}`, enrichedData);

  // Google Analytics (production)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, {
      event_category: 'book_reading',
      ...enrichedData
    });
  }
}

/**
 * Generate session ID for analytics grouping
 * Stored in sessionStorage (persists during tab session)
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server-side';

  const STORAGE_KEY = 'bookbridge_session_id';
  let sessionId = sessionStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Calculate session duration (for session_end event)
 */
export function calculateSessionDuration(sessionStartTime: number): number {
  return Math.floor((Date.now() - sessionStartTime) / 1000);
}
```

**Programming Principles:**
- ✅ **Pure Functions**: No state mutations, just console/gtag side effects
- ✅ **Single Responsibility**: Only handles event tracking
- ✅ **Type Safety**: TypeScript types for all events and data
- ✅ **Feature Flagged**: Respects NEXT_PUBLIC_ENABLE_ANALYTICS
- ✅ **Non-Blocking**: Never throws, never awaits
- ✅ **DRY**: `withCommon()` helper reduces duplication (GPT-5 recommendation)

---

### Feature 0: Load Funnel + TTFA (30 minutes) ⚡ **CRITICAL - GPT-5 #1 PRIORITY**

**Goal**: Track load performance to validate Phase 5 optimizations (15x speed improvement)

**End Result**: Prove book loads in <500ms (vs 4-5 sec before), validate caching works, measure TTFA

**Business Value:**
- **Investor metric**: "Book loads 15x faster than competitors"
- **Validates Phase 5**: $200K+ time investment in caching/optimization
- **Identifies regressions**: Catch performance degradation immediately
- **Funnel analysis**: See where users drop (load → first audio → engagement)

#### Task 0.1: Add Load Funnel Tracking to AudioContext

**What**: Track load start/complete/fail events with performance metrics

**Files to Modify:**
- `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Inside AudioContext.tsx

import { trackEvent, withCommon, getOrCreateSessionId } from '@/lib/services/analytics-service';

const sessionIdRef = useRef<string>(getOrCreateSessionId());
const loadStartTimeRef = useRef<number | null>(null);

// Inside loadBookData() method - START
const loadBookData = async (bookId: string, level: CEFRLevel) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  loadStartTimeRef.current = startTime;

  trackEvent('load_started', withCommon({
    request_id: requestId,
    book_id: bookId,
    level: level
  }, { sessionId: sessionIdRef.current }));

  try {
    // Existing load logic...
    const bundleData = await loadBookBundles(bookId, level, contentMode, signal);

    // After successful load
    trackEvent('load_completed', withCommon({
      request_id: requestId,
      book_id: bookId,
      level: level,
      ms_load: Date.now() - startTime,
      page_size: bundleData.totalBundles,
      cache_hit: /* detect from response headers or timing */
    }, { sessionId: sessionIdRef.current }));

  } catch (error) {
    trackEvent('load_failed', withCommon({
      request_id: requestId,
      book_id: bookId,
      level: level,
      ms_load: Date.now() - startTime,
      error_message: error.message
    }, { sessionId: sessionIdRef.current }));
  }
};

// Inside play() method or audioManager ready callback
const onFirstAudioReady = () => {
  if (loadStartTimeRef.current) {
    trackEvent('first_audio_ready', withCommon({
      book_id: selectedBook?.id,
      level: cefrLevel,
      ms_first_audio: Date.now() - loadStartTimeRef.current
    }, { sessionId: sessionIdRef.current }));

    loadStartTimeRef.current = null; // Only track once per load
  }
};
```

**Business Questions Answered:**
- What's average load time? (ms_load mean)
- What % of loads use cache? (cache_hit true/false distribution)
- What's TTFA (Time-To-First-Audio)? (ms_first_audio mean)
- Where do users drop? (load_started vs load_completed vs first_audio_ready funnel)

**Testing:**
- Select book → Check load_started, load_completed, first_audio_ready
- Verify ms_load <500ms on repeat loads (cached)
- Verify ms_first_audio <1000ms

---

### Feature 2: CEFR Level Progression (15 minutes) ⚡ GPT-5 #2 PRIORITY

**Goal**: Track when users switch CEFR levels to measure learning progression.

**End Result**: Prove "users progress from A1 to B2 in 90 days" (investor metric)

**Business Value:**
- Proves users progress from A1 → A2 → B1 (learning outcomes)
- Shows if users experiment with levels (validates CEFR UX)
- Investor metric: "Users progress 2 levels in 90 days on average"
- Teacher Plans validation: Track which levels are assigned most

#### Task 2.1: Add Level Switch Tracking

**Files to Modify:**
- `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Inside switchLevel method
const switchLevel = async (newLevel: CEFRLevel) => {
  const oldLevel = cefrLevel;

  trackEvent('level_switched', withCommon({
    from_level: oldLevel,
    to_level: newLevel,
    is_playing: isPlaying
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    bookTitle: selectedBook?.title,
    level: newLevel
  }));

  // Existing logic...
  setCefrLevel(newLevel);
};
```

**Business Questions Answered:**
- Which levels do users prefer? (to_level distribution)
- Do users progress sequentially? (from_level → to_level paths)
- How long before switching? (timestamp deltas)

**Testing:**
- Load book at A1, switch to A2 → check level_switched event
- Verify from_level="A1", to_level="A2"

---

### Feature 3: Audio vs Text Usage (15 minutes) ⚡ GPT-5 #3 PRIORITY

**Goal**: Track audio playback to validate $200-320 TTS investment.

**End Result**: Prove "60%+ users play audio" → TTS investment justified

**Business Value:**
- If 80%+ users play audio → TTS investment justified, double down on audio quality
- If <20% play audio → rethink TTS-first strategy
- Identify "audio-first" vs "text-only" user segments
- Correlate audio usage with session length (does audio increase engagement?)

#### Task 3.1: Add Audio Playback Tracking

**Files to Modify:**
- `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Inside play() method
const play = async (sentenceIndex?: number) => {
  trackEvent('audio_played', withCommon({
    chapter: currentChapter,
    bundle_index: currentBundle,
    sentence_index: sentenceIndex ?? currentSentenceIndex,
    playback_speed: playbackSpeed
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    bookTitle: selectedBook?.title,
    level: cefrLevel
  }));

  // Existing logic...
};

// Inside pause() method
const pause = () => {
  trackEvent('audio_paused', withCommon({
    chapter: currentChapter,
    audio_time: audioManager?.getCurrentTime() || 0
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    level: cefrLevel
  }));

  // Existing logic...
};

// Inside audioManager.onAudioEnded callback
audioManager.onAudioEnded = () => {
  trackEvent('audio_completed', withCommon({
    chapter: currentChapter,
    bundle_index: currentBundle
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    level: cefrLevel
  }));
};
```

**Business Questions Answered:**
- What % of users play audio? (audio_played / book_selected)
- How long do users listen? (audio_paused.audio_time mean)
- Do users complete audio? (audio_completed / audio_played)
- Which speeds are popular? (playback_speed distribution)

**Testing:**
- Select book, click play → check audio_played
- Pause → check audio_paused with audio_time
- Let finish → check audio_completed

---

### Feature 1: Book Popularity & Drop-off (20 minutes) 📚 GPT-5 #4 PRIORITY

**Goal**: Track which books users select and which chapters they read.

**End Result**: Know "Pride & Prejudice is 10x more popular than Sleepy Hollow" → prioritize P&P for all levels

**Business Value:**
- Prioritize popular books for more CEFR levels (save $50K+ on low-engagement books)
- Identify drop-off chapters (content quality issues?)
- Deprioritize low-engagement books (save TTS costs)
- Content strategy: Add more books like top performers

#### Task 1.1: Add Book Selection Tracking

**Files to Modify:**
- `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Inside selectBook() method
const selectBook = async (book: FeaturedBook, initialLevel?: CEFRLevel) => {
  trackEvent('book_selected', withCommon({
    book_id: book.id,
    book_title: book.title,
    level: initialLevel || cefrLevel
  }, { sessionId: sessionIdRef.current }));

  // Existing logic...
};
```

#### Task 1.2: Add Chapter Navigation Tracking

**Implementation:**
```typescript
// Inside nextChapter() method
const nextChapter = () => {
  const newChapter = currentChapter + 1;

  trackEvent('chapter_started', withCommon({
    chapter: newChapter
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    bookTitle: selectedBook?.title,
    level: cefrLevel
  }));

  // Existing logic...
};

// Inside jumpToChapter() method
const jumpToChapter = (chapter: number) => {
  trackEvent('chapter_started', withCommon({
    chapter: chapter,
    from_chapter: currentChapter
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    bookTitle: selectedBook?.title,
    level: cefrLevel
  }));

  // Existing logic...
};
```

**Business Questions Answered:**
- Which books get clicked most? (book_selected count by book_id)
- Which books get abandoned at Chapter 1? (book_selected but no chapter_started[2])
- Which chapters have drop-off? (chapter_started[N] >> chapter_started[N+1])

**Testing:**
- Select 3 books → check 3 book_selected events
- Navigate to Chapter 2 → check chapter_started
- Jump to Chapter 5 → check from_chapter in event

---

### Feature 5: Resume Behavior & Retention (15 minutes) 🔁 GPT-5 #5 PRIORITY

**Goal**: Track when users resume reading to prove sticky product.

**End Result**: Prove "70% of users resume within 24 hours" (investor pitch)

**Business Value:**
- Key investor metric: "70% resume within 24 hours" = sticky product
- Proves habit formation (users come back)
- Validates reading position persistence feature
- Correlate resume rate with long-term retention

#### Task 5.1: Add Resume Tracking

**Files to Modify:**
- `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Inside loadResumeInfo() or when Continue Reading modal appears
const loadResumeInfo = async (bookId: string) => {
  const resumeInfo = await readingPositionService.loadPosition(bookId);

  if (resumeInfo) {
    const hoursSinceLastRead = calculateHoursSinceLastRead(resumeInfo.lastReadAt);

    trackEvent('resume_available', withCommon({
      book_id: bookId,
      level: resumeInfo.level,
      chapter: resumeInfo.chapter,
      hours_since_last_read: hoursSinceLastRead,
      within_24_hours: hoursSinceLastRead < 24
    }, { sessionId: sessionIdRef.current }));
  }

  return resumeInfo;
};

// Inside Continue Reading modal "Continue" button
const handleResumeClick = () => {
  trackEvent('resume_clicked', withCommon({
    chapter: resumeInfo?.chapter,
    bundle_index: resumeInfo?.bundleIndex,
    sentence_index: resumeInfo?.sentenceIndex
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    bookTitle: selectedBook?.title,
    level: cefrLevel
  }));

  // Existing resume logic...
};
```

**Business Questions Answered:**
- What % resume? (resume_clicked / book_selected)
- How quickly do users return? (hours_since_last_read distribution)
- Do resumed sessions last longer? (compare session_duration)

**Investor Pitch:**
- "70% of users resume within 24 hours"
- "Average time to return: 8 hours"

**Testing:**
- Read book, close tab, return after 1 hour
- Check resume_available event
- Click Continue Reading → check resume_clicked

---

### Feature 4: Session Length & Bundle Completion (30 minutes) ⏱️ GPT-5 #6 PRIORITY

**Goal**: Measure how long users engage and how much content they consume.

**End Result**: Prove "Average session: 15 minutes" + "Users complete 10 bundles per session"

**Business Value:**
- Engagement metric: "Average session: 15 minutes" (investor pitch)
- Content consumption: "Users complete 10 bundles per session"
- Identify engaged vs casual users
- Correlate with learning outcomes

#### Task 4.1: Add Session Start/End Tracking

**Files to Modify:**
- `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Inside AudioContext component
const sessionStartTimeRef = useRef<number | null>(null);
const bundlesCompletedRef = useRef<number>(0);

// On mount (session start)
useEffect(() => {
  sessionStartTimeRef.current = Date.now();

  trackEvent('session_start', {
    session_id: sessionIdRef.current,
    timestamp: Date.now(),
    referrer: document.referrer
  });

  // On unmount (session end)
  return () => {
    if (sessionStartTimeRef.current) {
      const durationSeconds = calculateSessionDuration(sessionStartTimeRef.current);

      trackEvent('session_end', withCommon({
        session_duration_seconds: durationSeconds,
        bundles_completed: bundlesCompletedRef.current
      }, {
        sessionId: sessionIdRef.current,
        bookId: selectedBook?.id,
        level: cefrLevel
      }));
    }
  };
}, []);
```

#### Task 4.2: Add Bundle Completion Tracking

**Implementation:**
```typescript
// Inside bundle transition logic
const onBundleComplete = (bundleIndex: number) => {
  bundlesCompletedRef.current += 1;

  trackEvent('bundle_completed', withCommon({
    bundle_index: bundleIndex,
    bundles_completed_total: bundlesCompletedRef.current
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    level: cefrLevel,
    contentMode
  }));
};
```

**Business Questions Answered:**
- Average session duration? (session_duration_seconds mean)
- Content consumption rate? (bundles_completed mean)
- Correlation with learning? (session length vs level progression)

**Testing:**
- Open app, wait 5 minutes, close
- Check session_end with duration ~300s
- Complete 3 bundles → check 3 bundle_completed events

---

### Feature 7: Dictionary Coverage/Speed (20 minutes) 📖 **GPT-5 NEW - CRITICAL**

**Goal**: Track dictionary AI quality, coverage, fallback rates, and speed

**End Result**: Prove "AI dictionary covers 95% of words" + "Average lookup: <500ms"

**Business Value:**
- **ESL value proof**: "95% AI coverage, 3% Wiktionary fallback, 2% fail"
- **Cost control**: Monitor AI API usage vs fallback usage
- **Quality assurance**: Catch AI degradation (sudden spike in fallbacks)
- **Speed validation**: Ensure lookups feel instant (<500ms)
- **Investor metric**: "Dictionary is 10x better than competitors"

#### Task 7.1: Add Dictionary Tracking

**Files to Modify:**
- `app/api/dictionary/resolve/route.ts` (server-side)
- Dictionary component (client-side)

**Implementation (API):**
```typescript
// Inside /api/dictionary/resolve/route.ts

import { trackEvent } from '@/lib/services/analytics-service';

export async function POST(req: Request) {
  const { word, posHint } = await req.json();
  const startTime = Date.now();

  trackEvent('dict_lookup_started', {
    word,
    pos_hint: posHint,
    timestamp: Date.now()
  });

  try {
    // Existing AI lookup logic...
    const result = await AIUniversalLookup(word, posHint);

    trackEvent('dict_success', {
      word,
      pos_hint: posHint,
      ms_total: Date.now() - startTime,
      source: result.source, // 'ai' | 'wiktionary' | 'free'
      examples_count: result.examples?.length || 0,
      cached: result.fromCache || false
    });

    return Response.json(result);

  } catch (error) {
    if (error.message.includes('fallback')) {
      trackEvent('dict_fallback', {
        word,
        pos_hint: posHint,
        ms_total: Date.now() - startTime,
        source: 'wiktionary',
        error_message: error.message
      });
    } else {
      trackEvent('dict_error', {
        word,
        pos_hint: posHint,
        ms_total: Date.now() - startTime,
        error_message: error.message,
        error_code: error.code
      });
    }

    throw error;
  }
}
```

**Business Questions Answered:**
- What's AI coverage? (dict_success where source='ai' / total lookups)
- What's fallback rate? (dict_fallback / total lookups)
- What's average speed? (ms_total mean)
- Which words fail? (dict_error.word list)
- What's cache hit rate? (dict_success where cached=true / total)

**Testing:**
- Look up "happy" → check dict_success with source='ai', ms_total <500ms
- Look up obscure word → might check dict_fallback or dict_error
- Repeat lookup → check cached=true

---

### Feature 8: Playback Stability (25 minutes) 🎵 **GPT-5 NEW - CRITICAL**

**Goal**: Track audio stalls, errors, and retries to prevent churn

**End Result**: Catch playback issues before users churn (early warning system)

**Business Value:**
- **Churn prevention**: "Catch 90% of playback errors before user complaints"
- **Device/network insights**: Identify problematic devices or networks
- **CDN monitoring**: Detect CDN issues immediately
- **International UX**: Track errors by geography (slow networks)
- **Quality assurance**: Alert if error rate spikes

#### Task 8.1: Add Playback Error Tracking

**Files to Modify:**
- `lib/audio/BundleAudioManager.ts` or `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Inside BundleAudioManager or AudioContext

// Add audio element event listeners
const audioElement = audioManager.getAudioElement();

audioElement.addEventListener('stalled', () => {
  trackEvent('audio_stall', withCommon({
    chapter: currentChapter,
    bundle_index: currentBundle,
    audio_time: audioElement.currentTime,
    network_type: navigator.connection?.effectiveType || 'unknown',
    device: navigator.userAgent
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    level: cefrLevel
  }));
});

audioElement.addEventListener('error', (e) => {
  trackEvent('audio_error', withCommon({
    chapter: currentChapter,
    bundle_index: currentBundle,
    error_message: e.message || 'Unknown audio error',
    error_code: audioElement.error?.code?.toString() || 'unknown',
    network_type: navigator.connection?.effectiveType || 'unknown',
    device: navigator.userAgent
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    level: cefrLevel
  }));
});

// If you implement retry logic
const retryPlayback = () => {
  trackEvent('audio_retry', withCommon({
    chapter: currentChapter,
    bundle_index: currentBundle
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    level: cefrLevel
  }));

  // Existing retry logic...
};
```

**Business Questions Answered:**
- What's error rate? (audio_error / audio_played)
- What's stall rate? (audio_stall / audio_played)
- Which devices have issues? (error by device)
- Which networks are slow? (stall by network_type)
- Do retries work? (audio_retry → audio_played success rate)

**Testing:**
- Simulate slow network (Chrome DevTools) → should see audio_stall
- Simulate CDN failure → should see audio_error
- Verify device and network_type captured

---

### Feature 10: Level-Switch Latency (15 minutes) ⚡ **GPT-5 NEW - Phase 5 Validation**

**Goal**: Measure level-switch speed to validate Phase 5 caching

**End Result**: Prove "Level switches in <100ms (cached)" vs "2-3 sec (uncached before Phase 5)"

**Business Value:**
- **Phase 5 validation**: Prove availability fast-path works (zero-network for single-level)
- **UX metric**: "Level switches feel instant (<100ms)"
- **Cache validation**: Confirm caching reduces switch time by 20x
- **Regression detection**: Alert if switch latency spikes

#### Task 10.1: Add Level-Switch Latency Tracking

**Files to Modify:**
- `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Inside switchLevel method
const switchLevel = async (newLevel: CEFRLevel) => {
  const startTime = Date.now();

  trackEvent('level_switch_started', withCommon({
    from_level: cefrLevel,
    to_level: newLevel
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id
  }));

  try {
    // Existing level switch logic...
    await loadBookData(selectedBook.id, newLevel);

    trackEvent('level_switch_ready', withCommon({
      from_level: cefrLevel,
      to_level: newLevel,
      ms_switch: Date.now() - startTime,
      cache_hit: /* detect from load metrics */,
      fast_path: /* true if single-level book, no API call needed */
    }, {
      sessionId: sessionIdRef.current,
      bookId: selectedBook?.id,
      level: newLevel
    }));

  } catch (error) {
    trackEvent('level_switch_aborted', withCommon({
      from_level: cefrLevel,
      to_level: newLevel,
      ms_switch: Date.now() - startTime,
      error_message: error.message
    }, {
      sessionId: sessionIdRef.current,
      bookId: selectedBook?.id
    }));
  }
};
```

**Business Questions Answered:**
- What's average switch time? (ms_switch mean)
- What % use fast-path? (fast_path=true distribution)
- What % are cached? (cache_hit=true distribution)
- How much faster is cached? (ms_switch cached vs uncached)

**Testing:**
- Switch from A1 to A2 (first time) → check ms_switch ~2-3 sec
- Switch from A2 to A1 (cached) → check ms_switch <100ms, cache_hit=true
- Single-level book → check fast_path=true, ms_switch ~0ms

---

### Feature 6: Speed & Theme Preferences (10 minutes) 🎨 GPT-5 #10 PRIORITY

**Goal**: Track playback speed and theme preferences.

**End Result**: Know "80% use Dark mode" → make it default

**Business Value:**
- If 80% use Dark mode → make it default (better first impression)
- If users speed up audio → optimize for faster playback
- Validate default settings (1x speed, Light theme)
- UX personalization insights

#### Task 6.1: Add Speed Change Tracking

**Files to Modify:**
- `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Inside setSpeed() method
const setSpeed = (speed: number) => {
  trackEvent('speed_changed', withCommon({
    from_speed: playbackSpeed,
    to_speed: speed
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    level: cefrLevel
  }));

  // Existing logic...
  setPlaybackSpeed(speed);
};
```

#### Task 6.2: Add Theme Change Tracking

**Files to Modify:**
- `contexts/ThemeContext.tsx`

**Implementation:**
```typescript
// Inside ThemeContext.tsx

import { trackEvent, getOrCreateSessionId } from '@/lib/services/analytics-service';

const setTheme = (newTheme: 'light' | 'dark' | 'sepia') => {
  const sessionId = getOrCreateSessionId();

  trackEvent('theme_changed', {
    session_id: sessionId,
    from_theme: theme,
    to_theme: newTheme,
    timestamp: Date.now()
  });

  // Existing logic...
  setThemeState(newTheme);
};
```

**Business Questions Answered:**
- Most popular theme? (to_theme distribution)
- Most popular speed? (to_speed distribution)
- Should we change defaults? (if 80% use 1.5x → make default)

**Testing:**
- Change speed 1x → 1.5x → check speed_changed
- Change theme Light → Dark → check theme_changed

---

### Feature 11: AI Tutor Engagement (25 minutes) 🤖 **GPT-5 NEW - Phase 2**

**Goal**: Track AI tutor usage to prove differentiator value

**End Result**: Prove "40% of users use AI tutor" + "Average 5 messages per session"

**Business Value:**
- **Differentiator proof**: "AI tutor increases session length by 2x"
- **Feature validation**: Justify AI tutor development cost
- **Usage patterns**: Understand how users interact with tutor
- **Cost monitoring**: Track AI API usage for budgeting
- **Growth metric**: Tutor users have higher retention

#### Task 11.1: Add AI Tutor Tracking

**Files to Modify:**
- AI tutor modal component
- `/app/api/ai/stream/route.ts`

**Implementation (Component):**
```typescript
// Inside AI Tutor modal

const handleOpenTutor = () => {
  trackEvent('tutor_opened', withCommon({
    chapter: currentChapter
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    level: cefrLevel
  }));

  // Existing open logic...
};

const handleSendMessage = async (message: string) => {
  trackEvent('tutor_message_sent', withCommon({
    chars_in: message.length,
    turns: conversationTurns
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    level: cefrLevel
  }));

  // Existing send logic...
};

// On stream complete
const onStreamComplete = (response: string, streamTimeMs: number) => {
  trackEvent('tutor_stream_completed', withCommon({
    chars_out: response.length,
    ms_stream: streamTimeMs,
    turns: conversationTurns
  }, {
    sessionId: sessionIdRef.current,
    bookId: selectedBook?.id,
    level: cefrLevel
  }));
};
```

**Business Questions Answered:**
- What % use tutor? (tutor_opened / session_start)
- How many messages per session? (tutor_message_sent / tutor_opened)
- Does tutor increase engagement? (session_duration for tutor users vs non-users)
- What's streaming speed? (ms_stream mean)

**Testing:**
- Open AI tutor → check tutor_opened
- Send message → check tutor_message_sent
- Receive response → check tutor_stream_completed

**Note**: Implement in Phase 2 (not Day 1-2) due to lower priority

---

## ✅ Success Criteria

### Technical Quality
- [ ] All tracking uses `analytics-service.ts` (no duplicate logic)
- [ ] Feature flag works (NEXT_PUBLIC_ENABLE_ANALYTICS=false disables all)
- [ ] No console errors from analytics code
- [ ] Analytics never blocks UI (non-blocking, no awaits)
- [ ] TypeScript types for all events and data
- [ ] `withCommon()` helper used consistently (DRY)
- [ ] Post-guard logs (only emit after requestId check passes)

### Business Value (Can Answer These Questions)
- [ ] "Which books are most popular?" → book_selected count by book_id
- [ ] "Do users play audio or just read?" → (audio_played / book_selected) %
- [ ] "Do users progress through CEFR levels?" → level_switched paths
- [ ] "What % of users resume?" → (resume_clicked / book_selected) %
- [ ] "Average session duration?" → session_duration_seconds mean
- [ ] "Most popular theme/speed?" → theme/speed distributions
- [ ] **"Did Phase 5 improve load time?"** → ms_load before/after (GPT-5)
- [ ] **"What's TTFA?"** → ms_first_audio mean (GPT-5)
- [ ] **"What's dictionary AI coverage?"** → (dict_success where source='ai') / total (GPT-5)
- [ ] **"Are there playback errors?"** → audio_error rate by device/network (GPT-5)
- [ ] **"Is level-switch fast?"** → ms_switch mean, cache_hit % (GPT-5)

### User Experience
- [ ] Zero performance impact (analytics is async, non-blocking)
- [ ] No privacy violations (no PII tracked, just usage patterns)
- [ ] Users don't notice analytics (silent, background)

---

## 🎯 Architecture Impact

### Before Analytics Implementation

```typescript
AudioContext (orchestrator)
  ├─ State Machine (book, level, bundles, isPlaying)
  ├─ Lifecycle Events (selectBook, switchLevel, play, pause)
  └─ Guards (requestId, AbortController)
  ↓
Service Layer (pure functions)
  ├─ book-loader.ts
  ├─ availability.ts
  ├─ level-persistence.ts
  └─ audio-transforms.ts
```

### After Analytics Implementation

```typescript
AudioContext (orchestrator + analytics)
  ├─ State Machine (book, level, bundles, isPlaying)
  ├─ Lifecycle Events (selectBook, switchLevel, play, pause)
  │   └─ Each event calls: trackEvent() ✨ NEW
  └─ Guards (requestId, AbortController)
      └─ Post-guard analytics (only log after requestId validated) ✨ GPT-5
  ↓
Service Layer (pure functions)
  ├─ book-loader.ts
  ├─ availability.ts
  ├─ level-persistence.ts
  ├─ audio-transforms.ts
  └─ analytics-service.ts ✨ NEW
      ├─ trackEvent() - Pure tracking function
      ├─ withCommon() - DRY helper (GPT-5 recommendation)
      ├─ getOrCreateSessionId() - Session management
      └─ calculateSessionDuration() - Time utilities
```

**Key Improvements:**
- ✅ Context stays clean (one trackEvent() call per lifecycle event)
- ✅ Service layer stays pure (analytics-service is pure functions)
- ✅ No new state (sessionId in ref, not state)
- ✅ Feature-flagged (can disable entirely)
- ✅ Follows hero demo pattern (proven approach)
- ✅ DRY with `withCommon()` helper (GPT-5 recommendation)
- ✅ Post-guard logging (prevents stale data, GPT-5 recommendation)

---

## 📋 Task Breakdown (GPT-5 Prioritized)

### Day 1 AM: Foundation + Performance (2.5 hours)

**9:00-9:30** (30 min):
- [ ] Task 1.1: Create analytics-service.ts with `withCommon()` helper

**9:30-9:45** (15 min):
- [ ] Feature 10: Level-switch latency tracking

**9:45-10:00** (15 min):
- [ ] Feature 3: Audio playback tracking (play/pause/complete)

**10:00-10:30** (30 min):
- [ ] Feature 0: Load funnel + TTFA tracking

**10:30-11:30** (1 hour):
- [ ] Testing: Verify foundation + performance events work

---

### Day 1 PM: Business Metrics (2.5 hours)

**1:00-1:20** (20 min):
- [ ] Feature 1: Book popularity & chapter drop-off

**1:20-1:35** (15 min):
- [ ] Feature 2: CEFR level progression

**1:35-1:50** (15 min):
- [ ] Feature 5: Resume behavior tracking

**1:50-2:20** (30 min):
- [ ] Feature 4: Session length & bundle completion

**2:20-3:00** (40 min):
- [ ] Testing: End-to-end user journey validation

---

### Day 2 AM: Quality Metrics (2.5 hours)

**9:00-9:25** (25 min):
- [ ] Feature 8: Playback stability (stalls/errors)

**9:25-9:45** (20 min):
- [ ] Feature 7: Dictionary coverage/speed

**9:45-10:15** (30 min):
- [ ] Cache-hit tagging (add to load events)

**10:15-11:30** (1 hour 15 min):
- [ ] Testing: Simulate errors, slow networks, dictionary lookups

---

### Day 2 PM: UX + Documentation (2 hours)

**1:00-1:10** (10 min):
- [ ] Feature 6: Speed/theme preferences

**1:10-1:40** (30 min):
- [ ] Update ARCHITECTURE_OVERVIEW.md with analytics section

**1:40-2:30** (50 min):
- [ ] Production validation: Deploy, check Google Analytics Real-Time

**2:30-3:00** (30 min):
- [ ] Documentation: Analytics dashboard guide

---

### Phase 2 (Future): AI Tutor + Offline

- [ ] Feature 11: AI Tutor engagement (25 min)
- [ ] Offline usage/cache hits (when PWA re-enabled)

**Total Estimated Time**: 2 days (9.5 hours) for 11 features

---

## 🔍 Testing Strategy

### Manual Testing Checklist

**Foundation:**
- [ ] Feature flag works (disable NEXT_PUBLIC_ENABLE_ANALYTICS → no events)
- [ ] `withCommon()` adds timestamp, session_id, book context automatically
- [ ] Console shows all events during development
- [ ] Google Analytics receives events in production

**Feature 0 (Load Funnel + TTFA):**
- [ ] Select book → Check load_started, load_completed
- [ ] Verify ms_load <500ms on cached loads
- [ ] Verify first_audio_ready fires when audio ready
- [ ] Check cache_hit=true on repeat loads

**Feature 2 (CEFR Progression):**
- [ ] Switch A1 → A2 → Check level_switched with from_level/to_level
- [ ] Verify timestamp captured for progression analysis

**Feature 3 (Audio Usage):**
- [ ] Play → Check audio_played with playback_speed
- [ ] Pause → Check audio_paused with audio_time
- [ ] Complete → Check audio_completed

**Feature 1 (Book Popularity):**
- [ ] Select 3 books → Check 3 book_selected events
- [ ] Navigate Chapter 2 → Check chapter_started
- [ ] Jump to Chapter 5 → Check from_chapter captured

**Feature 5 (Resume):**
- [ ] Close tab, return after 1 hour → Check resume_available
- [ ] Click Continue Reading → Check resume_clicked
- [ ] Verify hours_since_last_read ~1

**Feature 4 (Session Length):**
- [ ] Open app, wait 5 min, close → Check session_end with duration ~300s
- [ ] Complete 3 bundles → Check 3 bundle_completed events

**Feature 7 (Dictionary):**
- [ ] Look up "happy" → Check dict_success with source='ai', ms_total <500ms
- [ ] Repeat lookup → Check cached=true
- [ ] Look up obscure word → Check dict_fallback or dict_error

**Feature 8 (Playback Stability):**
- [ ] Simulate slow network → Check audio_stall fires
- [ ] Simulate CDN failure → Check audio_error with error_code
- [ ] Verify device and network_type captured

**Feature 10 (Level-Switch Latency):**
- [ ] Switch A1 → A2 (first time) → Check ms_switch ~2-3 sec
- [ ] Switch A2 → A1 (cached) → Check ms_switch <100ms, cache_hit=true
- [ ] Single-level book → Check fast_path=true

**Feature 6 (Speed/Theme):**
- [ ] Change speed 1x → 1.5x → Check speed_changed
- [ ] Change theme Light → Dark → Check theme_changed

### Integration Testing

```bash
# Enable analytics
export NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Start dev server
npm run dev

# Run complete user journey:
# 1. Select Pride & Prejudice A1 (book_selected, load_started, load_completed, first_audio_ready)
# 2. Play audio (audio_played)
# 3. Switch to A2 (level_switch_started, level_switch_ready)
# 4. Navigate Chapter 2 (chapter_started)
# 5. Pause (audio_paused)
# 6. Close tab, return (session_end, session_start, resume_available)
# 7. Continue reading (resume_clicked)
# 8. Change speed to 1.5x (speed_changed)
# 9. Change theme to Dark (theme_changed)
# 10. Look up word "happy" (dict_lookup_started, dict_success)
# 11. Complete bundle (bundle_completed)

# Check console for all 20+ events
# Check Google Analytics Real-Time dashboard
```

### Production Validation

**After Deployment:**
1. Check Google Analytics Real-Time → Events (first 24 hours)
2. Verify event counts match expected usage patterns
3. Check for any tracking errors in logs/Sentry
4. Validate session IDs are unique and persistent
5. **Phase 5 validation**: Confirm ms_load <500ms, cache_hit rates, TTFA <1000ms

---

## 📝 Environment Variables

### Required Setup

```bash
# .env.local (development)
NEXT_PUBLIC_ENABLE_ANALYTICS=true  # Enable analytics tracking

# .env.production (production)
NEXT_PUBLIC_ENABLE_ANALYTICS=true  # Enable analytics in production
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX  # Google Analytics 4 tracking ID
```

### Google Analytics Setup

1. Create Google Analytics 4 property
2. Get tracking ID (format: `G-XXXXXXXXXX`)
3. Add to `app/layout.tsx` (already done in hero demo)
4. Verify events appear in Real-Time dashboard
5. Create custom reports for business questions (see Analytics Dashboard section)

---

## 🎯 Definition of Done

### Analytics Implementation Complete When:

**Technical:**
- [ ] analytics-service.ts created with all utility functions + `withCommon()` helper
- [ ] All 11 features implemented (30+ events tracked)
- [ ] Feature flag works (NEXT_PUBLIC_ENABLE_ANALYTICS)
- [ ] All events appear in console (development mode)
- [ ] All events appear in Google Analytics (production mode)
- [ ] Zero TypeScript errors
- [ ] Zero console errors from analytics code
- [ ] Post-guard logging implemented (prevents stale data)
- [ ] Manual testing completed for all features

**Business:**
- [ ] Can answer all 11 business questions listed in Success Criteria
- [ ] **Phase 5 validation complete** (load times, cache hits, TTFA measured)
- [ ] Google Analytics custom reports created for key metrics
- [ ] ARCHITECTURE_OVERVIEW.md updated with analytics section

### Production Validation Complete When:

- [ ] Events appear in Google Analytics Real-Time (first 24 hours)
- [ ] Session IDs are unique and persistent
- [ ] Event counts match expected usage patterns
- [ ] No tracking errors in logs/Sentry
- [ ] Performance: Zero impact on page load time
- [ ] **Phase 5 metrics confirmed**: ms_load <500ms, cache_hit >70%, TTFA <1000ms

---

## 📚 GPT-5 Validation Summary

**Verdict**: ⚠️ **APPROVED WITH CHANGES**

**What GPT-5 Validated:**
- ✅ Architecture approach (analytics-service.ts as pure functions)
- ✅ AudioContext lifecycle hooks (correct placement)
- ✅ Business metrics (book popularity, CEFR progression, audio usage, resume)
- ✅ Type safety and feature flagging

**What GPT-5 Added:**
1. **Feature 0: Load Funnel + TTFA** (CRITICAL for Phase 5 validation)
2. **Feature 7: Dictionary coverage/speed** (AI quality & cost monitoring)
3. **Feature 8: Playback stability** (churn prevention)
4. **Feature 10: Level-switch latency** (Phase 5 fast-path validation)
5. **Feature 11: AI Tutor engagement** (differentiator proof)

**GPT-5 Implementation Improvements:**
- `withCommon()` helper to DRY timestamp/session/book/level context
- Post-guard logs (only emit after requestId check passes)
- Cache-hit tagging on load events
- Error tracking for playback, dictionary, load failures
- Performance metrics (TTFA, latency, cache hits)

**Priority Reordering:**
- Original: Business → Engagement → UX
- GPT-5: **Performance → Business → Quality → Engagement → UX**
- Rationale: Validate Phase 5 wins first, then business metrics, then quality assurance

---

## 🎯 GPT-5 Final Implementation Review (Oct 30, 2025)

**Verdict**: ✅ **APPROVED WITH MINOR CHANGES**

GPT-5 reviewed the complete implementation plan and confirmed the architecture approach is correct. They provided specific implementation guidance for the 5 critical features:

### Feature 0: Load Funnel + TTFA
**Implementation Location**: `AudioContext.loadBookData()` around requestId guards

**Required Events**:
- `load_started` - When book load begins
- `load_completed` - When bundles successfully loaded
- `load_failed` - When load fails (with error details)
- `first_audio_ready` - When first audio bundle playable

**Required Fields**:
- `request_id` - For funnel analysis
- `cache_hit` - Boolean, from response headers/timing
- `page_size` - Number of bundles loaded
- `ms_load` - Load duration

### Feature 7: Dictionary Coverage/Speed
**Implementation Location**: Both client AND API

**Client tracking** (`components/DictionaryPanel.tsx` or similar):
- `dict_lookup_started` - When user clicks word
- `dict_success` - When definition received
- `dict_fallback` - When AI falls back to Wiktionary/Free
- `dict_error` - When lookup fails

**API tracking** (`app/api/dictionary/resolve/route.ts`):
- Same events from server perspective
- Track `ms_total`, `source` (ai/wiktionary/free), `examples_count`, `cached`

### Feature 8: Playback Stability
**Implementation Location**: Audio element listeners in `AudioContext`

**Add event listeners**:
```typescript
audioElement.addEventListener('stalled', () => trackEvent('audio_stall', ...));
audioElement.addEventListener('waiting', () => trackEvent('audio_stall', ...));
audioElement.addEventListener('error', () => trackEvent('audio_error', ...));
```

**Required Fields**:
- `network_type` - From `navigator.connection.effectiveType`
- `device` - User agent or device category
- `error_message` - For error events
- `audio_time` - Playback position when stalled

### Feature 10: Level-Switch Latency
**Implementation Location**: `AudioContext.switchLevel()` method

**Required Events**:
- `level_switch_started` - When user clicks level
- `level_switch_ready` - When new level bundles loaded and playable
- `level_switch_aborted` - If user cancels or requestId changes

**Required Fields**:
- `from_level` - Previous level
- `to_level` - New level
- `ms_switch` - Time from started to ready
- `cache_hit` - Boolean, was data cached?
- `fast_path` - Boolean, used availability fast-path?

### Feature 11: AI Tutor Engagement
**Implementation Location**: AI Tutor modal component

**Required Events**:
- `tutor_opened` - When modal opens
- `tutor_message_sent` - When user sends message
- `tutor_stream_completed` - When AI response finishes

**Required Fields**:
- `chars_in` - User message length
- `chars_out` - AI response length
- `ms_stream` - Streaming duration
- `turns` - Conversation turn count

### Confirmed Patterns
✅ **Phase 4 architecture**: Pure functions in `analytics-service.ts`
✅ **withCommon() helper**: DRY session_id, book_id, level context
✅ **Post-guard logging**: Only log after requestId validation
✅ **Priority order**: Performance (TTFA) → Business (Audio, Books, Resume) → Quality (Stalls) → Engagement (Tutor) → UX (Speed/Theme)

**Status**: Ready to implement with these specific tracking points.

---

## 🔗 Related Documentation

### Read Before Implementation

1. **FEATURED_BOOKS_REFACTOR_PLAN.md** (Phase 4 patterns)
   - Service layer pattern (pure functions)
   - AudioContext architecture (SSoT)
   - Rules & Guardrails for safe features

2. **ARCHITECTURE_OVERVIEW.md**
   - Hero demo analytics (lines 296-357)
   - AudioContext state machine (lines 390-431)
   - Service layer overview (lines 1619-1881)

3. **components/hero/InteractiveReadingDemo.tsx**
   - Existing analytics (lines 52-74)
   - trackDemoEvent pattern to replicate

### Update After Implementation

**When Foundation Complete:**
- [ ] Add analytics-service to ARCHITECTURE_OVERVIEW.md Service Layer section
- [ ] Document trackEvent() and withCommon() APIs
- [ ] Add code anchors for analytics calls in AudioContext

**When All Features Complete:**
- [ ] Update ARCHITECTURE_OVERVIEW.md with analytics architecture diagram
- [ ] Document all 30+ tracked events
- [ ] Create analytics dashboard guide (how to read Google Analytics)
- [ ] Add Phase 5 performance metrics to validation reports

---

**Document Version**: 2.1 (GPT-5 Final Review Complete)
**Created**: October 2025
**Last Updated**: October 30, 2025 (GPT-5 final implementation review)
**Status**: ✅ Ready to implement (GPT-5 approved)
**Estimated Effort**: 2 days for 11 features (GPT-5 validated)
**Prerequisites**: Phase 4 refactor complete (AudioContext + Service Layer)

**Next Action**: Create `lib/services/analytics-service.ts` (Task 1.1 - 30 min)

**Changelog:**
- v2.1: GPT-5 final review complete, added specific implementation locations and required fields for 5 critical features
- v2.0: Integrated GPT-5 validation, added 5 performance/quality features, reordered by priority
- v1.0: Initial plan with 6 business/engagement features
