# Usage Analytics Implementation Plan

> **Purpose**: This document provides a complete strategy for implementing usage analytics to measure how BookBridge is being used. Created to answer critical business questions: Are users using audio? Which books are popular? Do users progress through CEFR levels? What engagement patterns exist?

---

## 📋 Executive Summary

**What This File Is:**
A step-by-step implementation roadmap for 6 high-impact analytics features that fit seamlessly with BookBridge's existing AudioContext + Service Layer architecture (post-Phase 4 refactor). Each feature is designed as pure functions with minimal state changes, following established patterns.

**When to Use This File:**
- Before implementing any analytics feature
- When answering business/product questions about user behavior
- When preparing investor metrics or growth reports
- When deciding which books to add more CEFR levels for

**Quick Status Check:**
- **Current Analytics**: Hero demo only (9 events for voice preference testing)
- **Target State**: Full-app usage tracking (book popularity, level progression, audio usage, engagement)
- **Implementation Status**: Not started (as of October 2025)
- **Estimated Effort**: 1-2 days for all 6 features

---

## 🎯 Business Context

### Why These Analytics Matter

**Current Problem:**
- We don't know which books users actually read (vs just click)
- We don't know if users use audio playback or just read silently
- We don't know if CEFR progression works (do A1 users move to A2?)
- We don't know engagement patterns (session length, drop-off points)
- We can't prove value to investors ("users engage for X minutes, progress Y levels in Z weeks")

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

4. **Teacher Plans Feature** (Enables Tier 1 Priority from Billion Dollar Roadmap)
   - Track which levels teachers assign most
   - Measure completion rates for classroom use
   - Proves value before building $49/month teacher product

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

// Usage in component
trackDemoEvent('play_clicked', {
  voice_id: selectedVoice.id,
  voice_name: selectedVoice.name,
  gender: selectedVoice.gender,
  level: currentLevel
});
```

**Key Principles:**
1. **Feature Flag**: `NEXT_PUBLIC_ENABLE_ANALYTICS` environment variable
2. **Console + Production**: Logs to console (dev) + gtag (production)
3. **Structured Data**: All events include context (book, level, user state)
4. **Non-Blocking**: Never throws errors, never blocks UI

---

## 📊 6 Analytics Features (Prioritized)

### Overview

| Feature | Business Value | Implementation Effort | ROI |
|---------|---------------|----------------------|-----|
| 1. Book Popularity & Drop-off | High (content strategy) | Low (1 line per event) | ⭐⭐⭐⭐⭐ |
| 2. CEFR Level Progression | High (learning outcomes) | Low (1 line per event) | ⭐⭐⭐⭐⭐ |
| 3. Audio vs Text Usage | High (TTS ROI validation) | Low (1 line per event) | ⭐⭐⭐⭐⭐ |
| 4. Session Length & Bundle Completion | Medium (engagement) | Medium (timer logic) | ⭐⭐⭐⭐ |
| 5. Resume Behavior & Retention | High (retention metrics) | Low (existing resume logic) | ⭐⭐⭐⭐⭐ |
| 6. Speed & Theme Preferences | Low (UX optimization) | Low (1 line per event) | ⭐⭐⭐ |

**Recommended Order** (by ROI + ease):
1. Feature 2 (CEFR Level Progression) - Highest value, easiest to implement
2. Feature 3 (Audio vs Text Usage) - Validates TTS investment
3. Feature 1 (Book Popularity) - Content strategy decisions
4. Feature 5 (Resume Behavior) - Retention proof
5. Feature 4 (Session Length) - Requires timer logic
6. Feature 6 (Speed/Theme) - Nice-to-have

---

## 🛠️ Implementation Plan

### Phase 1: Analytics Service Foundation (30 minutes) ⚡ FOUNDATION

**Goal**: Create reusable analytics service following Phase 4 service layer pattern.

#### Task 1.1: Create Analytics Service (Pure Functions) ✅

**What**: Create `lib/services/analytics-service.ts` as pure tracking functions

**Why**: Centralize all tracking logic, follow service layer pattern from Phase 4

**Files to Create:**
```typescript
// lib/services/analytics-service.ts (NEW)
export type AnalyticsEvent =
  | 'book_selected'
  | 'book_load_completed'
  | 'chapter_started'
  | 'chapter_completed'
  | 'level_switched'
  | 'audio_played'
  | 'audio_paused'
  | 'audio_completed'
  | 'bundle_completed'
  | 'session_start'
  | 'session_end'
  | 'resume_clicked'
  | 'speed_changed'
  | 'theme_changed';

export interface AnalyticsEventData {
  // Common fields (always included)
  timestamp: number;
  session_id: string;

  // Book context (when applicable)
  book_id?: string;
  book_title?: string;
  level?: CEFRLevel | 'original';
  content_mode?: 'simplified' | 'original';

  // Position context (when applicable)
  chapter?: number;
  bundle_index?: number;
  sentence_index?: number;

  // Audio context (when applicable)
  is_playing?: boolean;
  playback_speed?: number;
  audio_time?: number;

  // Engagement metrics (when applicable)
  session_duration_seconds?: number;
  bundles_completed?: number;

  // Custom fields (event-specific)
  [key: string]: any;
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
 *
 * @example
 * trackEvent('book_selected', {
 *   book_id: 'pride-prejudice',
 *   level: 'A1',
 *   session_id: sessionId
 * });
 */
export function trackEvent(
  eventName: AnalyticsEvent,
  eventData: AnalyticsEventData
): void {
  // Feature flag check
  const ENABLE_ANALYTICS =
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

  if (!ENABLE_ANALYTICS) return;

  // Add timestamp if not provided
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
export function calculateSessionDuration(
  sessionStartTime: number
): number {
  return Math.floor((Date.now() - sessionStartTime) / 1000);
}
```

**Programming Principles:**
- ✅ **Pure Functions**: No state mutations, just console/gtag side effects
- ✅ **Single Responsibility**: Only handles event tracking
- ✅ **Type Safety**: TypeScript types for all events and data
- ✅ **Feature Flagged**: Respects NEXT_PUBLIC_ENABLE_ANALYTICS
- ✅ **Non-Blocking**: Never throws, never awaits

**Testing:**
```typescript
// Manual test in browser console
import { trackEvent, getOrCreateSessionId } from '@/lib/services/analytics-service';

const sessionId = getOrCreateSessionId();
trackEvent('book_selected', {
  book_id: 'test',
  level: 'A1',
  session_id: sessionId
});

// Check console output
// Check Google Analytics Real-Time events
```

---

### Phase 2: Feature 2 - CEFR Level Progression (15 minutes) ⚡ HIGHEST VALUE

**Goal**: Track when users switch CEFR levels to measure learning progression.

**Business Value:**
- Proves users progress from A1 → A2 → B1 (learning outcomes)
- Shows if users experiment with levels (validates CEFR UX)
- Investor metric: "Users progress 2 levels in 90 days on average"

#### Task 2.1: Add Level Switch Tracking to AudioContext

**What**: Add `trackEvent('level_switched', ...)` to `AudioContext.switchLevel()` method

**Files to Modify:**
- `contexts/AudioContext.tsx` (existing file)

**Implementation:**
```typescript
// contexts/AudioContext.tsx

import { trackEvent, getOrCreateSessionId } from '@/lib/services/analytics-service';

// Inside AudioContext component
const sessionIdRef = useRef<string>(getOrCreateSessionId());

// Inside switchLevel method (around line 450)
const switchLevel = async (newLevel: CEFRLevel) => {
  const oldLevel = cefrLevel;

  // Track level switch BEFORE state change
  trackEvent('level_switched', {
    session_id: sessionIdRef.current,
    book_id: selectedBook?.id,
    book_title: selectedBook?.title,
    from_level: oldLevel,
    to_level: newLevel,
    content_mode: contentMode,
    is_playing: isPlaying
  });

  // Existing logic continues...
  setCefrLevel(newLevel);
  // ... rest of method
};
```

**Expected Output (Console):**
```
[Analytics] level_switched {
  session_id: "session_1234567890_abc123",
  book_id: "pride-prejudice",
  book_title: "Pride and Prejudice",
  from_level: "A1",
  to_level: "A2",
  content_mode: "simplified",
  is_playing: false,
  timestamp: 1698765432100
}
```

**Business Questions Answered:**
- Which levels do users prefer? (A1 most common, or C2?)
- Do users progress sequentially (A1 → A2 → B1) or jump around?
- How long before users switch levels? (track timestamp deltas)

**Testing:**
- Manual: Load book at A1, switch to A2 → check console + Google Analytics
- Verify: Event fires BEFORE state change (captures correct from_level)

---

### Phase 3: Feature 3 - Audio vs Text Usage (15 minutes) ⚡ HIGH VALUE

**Goal**: Track audio playback to validate $200-320 TTS investment.

**Business Value:**
- If 80%+ users play audio → TTS investment justified
- If <20% play audio → rethink TTS-first strategy
- Identify "audio-first" vs "text-only" user segments

#### Task 3.1: Add Audio Playback Tracking

**Files to Modify:**
- `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Inside AudioContext.tsx

// Inside play() method
const play = async (sentenceIndex?: number) => {
  trackEvent('audio_played', {
    session_id: sessionIdRef.current,
    book_id: selectedBook?.id,
    book_title: selectedBook?.title,
    level: cefrLevel,
    content_mode: contentMode,
    chapter: currentChapter,
    bundle_index: currentBundle,
    sentence_index: sentenceIndex ?? currentSentenceIndex,
    playback_speed: playbackSpeed
  });

  // Existing logic...
  setIsPlaying(true);
  // ... rest of method
};

// Inside pause() method
const pause = () => {
  trackEvent('audio_paused', {
    session_id: sessionIdRef.current,
    book_id: selectedBook?.id,
    book_title: selectedBook?.title,
    level: cefrLevel,
    chapter: currentChapter,
    audio_time: audioManager?.getCurrentTime() || 0
  });

  // Existing logic...
  setIsPlaying(false);
  // ... rest
};

// Inside audioManager.onAudioEnded callback (around line 820)
audioManager.onAudioEnded = () => {
  trackEvent('audio_completed', {
    session_id: sessionIdRef.current,
    book_id: selectedBook?.id,
    level: cefrLevel,
    chapter: currentChapter,
    bundle_index: currentBundle
  });

  // Existing logic...
};
```

**Business Questions Answered:**
- What % of users play audio? (audio_played events / book_selected events)
- How long do users listen? (audio_paused.audio_time)
- Do users complete audio? (audio_completed events)
- Which speeds are most popular? (playback_speed distribution)

**Testing:**
- Manual: Select book, click play → check audio_played event
- Manual: Pause → check audio_paused event with audio_time
- Manual: Let audio finish → check audio_completed event

---

### Phase 4: Feature 1 - Book Popularity & Drop-off (20 minutes) 📚 CONTENT STRATEGY

**Goal**: Track which books users select and which chapters they read.

**Business Value:**
- Prioritize popular books for more CEFR levels
- Identify drop-off chapters (content quality issues?)
- Deprioritize low-engagement books (save TTS costs)

#### Task 4.1: Add Book Selection Tracking

**Files to Modify:**
- `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Inside selectBook() method (around line 380)
const selectBook = async (book: FeaturedBook, initialLevel?: CEFRLevel) => {
  trackEvent('book_selected', {
    session_id: sessionIdRef.current,
    book_id: book.id,
    book_title: book.title,
    level: initialLevel || cefrLevel,
    content_mode: contentMode
  });

  // Existing logic...
  setSelectedBook(book);
  // ... loadBookData() call

  // After successful load (inside loadBookData success)
  trackEvent('book_load_completed', {
    session_id: sessionIdRef.current,
    book_id: book.id,
    book_title: book.title,
    level: finalLevel,
    total_bundles: bundleData.totalBundles,
    load_duration_ms: Date.now() - startTime
  });
};
```

#### Task 4.2: Add Chapter Navigation Tracking

**Files to Modify:**
- `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Inside nextChapter() method
const nextChapter = () => {
  const newChapter = currentChapter + 1;

  trackEvent('chapter_started', {
    session_id: sessionIdRef.current,
    book_id: selectedBook?.id,
    book_title: selectedBook?.title,
    level: cefrLevel,
    chapter: newChapter
  });

  // Existing logic...
  setCurrentChapter(newChapter);
};

// Inside jumpToChapter() method
const jumpToChapter = (chapter: number) => {
  trackEvent('chapter_started', {
    session_id: sessionIdRef.current,
    book_id: selectedBook?.id,
    book_title: selectedBook?.title,
    level: cefrLevel,
    chapter: chapter,
    from_chapter: currentChapter
  });

  // Existing logic...
};
```

**Business Questions Answered:**
- Which books get clicked most? (book_selected count by book_id)
- Which books get abandoned at Chapter 1? (book_selected but no chapter_started for Ch 2)
- Which chapters have drop-off? (chapter_started[N] >> chapter_started[N+1])
- How long do books take to load? (load_duration_ms average)

**Example Analysis:**
```sql
-- Top 5 most popular books
SELECT book_title, COUNT(*) as selections
FROM analytics_events
WHERE event_name = 'book_selected'
GROUP BY book_title
ORDER BY selections DESC
LIMIT 5;

-- Drop-off rate by chapter (Pride & Prejudice)
SELECT chapter, COUNT(*) as starts
FROM analytics_events
WHERE event_name = 'chapter_started'
  AND book_id = 'pride-prejudice'
GROUP BY chapter
ORDER BY chapter;
```

**Testing:**
- Manual: Select book → check book_selected + book_load_completed
- Manual: Navigate to Chapter 2 → check chapter_started
- Manual: Jump to Chapter 5 → check from_chapter in event

---

### Phase 5: Feature 5 - Resume Behavior & Retention (15 minutes) 🔁 RETENTION PROOF

**Goal**: Track when users resume reading to prove sticky product.

**Business Value:**
- Key metric: "70% of users resume within 24 hours"
- Proves habit formation (users come back)
- Validates reading position persistence feature

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

    trackEvent('resume_available', {
      session_id: sessionIdRef.current,
      book_id: bookId,
      level: resumeInfo.level,
      chapter: resumeInfo.chapter,
      hours_since_last_read: hoursSinceLastRead,
      within_24_hours: hoursSinceLastRead < 24
    });
  }

  return resumeInfo;
};

// Inside Continue Reading modal "Continue" button click
const handleResumeClick = () => {
  trackEvent('resume_clicked', {
    session_id: sessionIdRef.current,
    book_id: selectedBook?.id,
    book_title: selectedBook?.title,
    level: cefrLevel,
    chapter: resumeInfo?.chapter,
    bundle_index: resumeInfo?.bundleIndex,
    sentence_index: resumeInfo?.sentenceIndex
  });

  // Existing resume logic...
};
```

**Business Questions Answered:**
- What % of users resume? (resume_clicked / book_selected)
- How quickly do users return? (hours_since_last_read distribution)
- Do resumed sessions last longer? (compare session_duration for resumed vs new)

**Investor Pitch:**
- "70% of users resume reading within 24 hours (sticky product)"
- "Average time to return: 8 hours (habit formation)"

**Testing:**
- Manual: Read book, close tab, return → check resume_available event
- Manual: Click Continue Reading → check resume_clicked event
- Verify: hours_since_last_read is accurate

---

### Phase 6: Feature 4 - Session Length & Bundle Completion (30 minutes) ⏱️ ENGAGEMENT

**Goal**: Measure how long users engage and how much content they consume.

**Business Value:**
- Engagement metric: "Average session: 15 minutes"
- Content consumption: "Users complete 10 bundles per session"
- Identify engaged vs casual users

#### Task 6.1: Add Session Start/End Tracking

**Files to Modify:**
- `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Inside AudioContext component
const sessionStartTimeRef = useRef<number | null>(null);

// On mount (session start)
useEffect(() => {
  sessionStartTimeRef.current = Date.now();

  trackEvent('session_start', {
    session_id: sessionIdRef.current,
    referrer: document.referrer
  });

  // On unmount (session end)
  return () => {
    if (sessionStartTimeRef.current) {
      const durationSeconds = calculateSessionDuration(sessionStartTimeRef.current);

      trackEvent('session_end', {
        session_id: sessionIdRef.current,
        session_duration_seconds: durationSeconds,
        book_id: selectedBook?.id,
        level: cefrLevel,
        chapter: currentChapter,
        bundles_completed: bundlesCompletedRef.current
      });
    }
  };
}, []);
```

#### Task 6.2: Add Bundle Completion Tracking

**Files to Modify:**
- `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Track bundles completed in ref
const bundlesCompletedRef = useRef<number>(0);

// Inside bundle transition logic (when moving to next bundle)
const onBundleComplete = (bundleIndex: number) => {
  bundlesCompletedRef.current += 1;

  trackEvent('bundle_completed', {
    session_id: sessionIdRef.current,
    book_id: selectedBook?.id,
    level: cefrLevel,
    chapter: currentChapter,
    bundle_index: bundleIndex,
    bundles_completed_total: bundlesCompletedRef.current
  });
};
```

**Business Questions Answered:**
- Average session duration? (session_duration_seconds mean)
- Content consumption rate? (bundles_completed per session)
- Do longer sessions = more learning? (correlate with level progression)

**Testing:**
- Manual: Open app, wait 5 minutes, close → check session_end with duration ~300s
- Manual: Complete 3 bundles → check bundle_completed events

---

### Phase 7: Feature 6 - Speed & Theme Preferences (10 minutes) 🎨 UX OPTIMIZATION

**Goal**: Track playback speed and theme preferences.

**Business Value:**
- If 80% use Dark mode → make it default
- If users speed up audio → optimize for faster playback
- Validate default settings

#### Task 7.1: Add Speed Change Tracking

**Files to Modify:**
- `contexts/AudioContext.tsx`

**Implementation:**
```typescript
// Inside setSpeed() method
const setSpeed = (speed: number) => {
  trackEvent('speed_changed', {
    session_id: sessionIdRef.current,
    book_id: selectedBook?.id,
    level: cefrLevel,
    from_speed: playbackSpeed,
    to_speed: speed
  });

  // Existing logic...
  setPlaybackSpeed(speed);
};
```

#### Task 7.2: Add Theme Change Tracking

**Files to Modify:**
- `contexts/ThemeContext.tsx` (existing file)

**Implementation:**
```typescript
// Inside ThemeContext.tsx

import { trackEvent, getOrCreateSessionId } from '@/lib/services/analytics-service';

// Inside setTheme() method
const setTheme = (newTheme: 'light' | 'dark' | 'sepia') => {
  const sessionId = getOrCreateSessionId();

  trackEvent('theme_changed', {
    session_id: sessionId,
    from_theme: theme,
    to_theme: newTheme
  });

  // Existing logic...
  setThemeState(newTheme);
};
```

**Business Questions Answered:**
- Most popular theme? (theme_changed.to_theme distribution)
- Most popular speed? (speed_changed.to_speed distribution)
- Should we change defaults? (if 80% use 1.5x, make that default)

**Testing:**
- Manual: Change speed from 1x to 1.5x → check speed_changed event
- Manual: Change theme from Light to Dark → check theme_changed event

---

## ✅ Success Criteria

### Technical Quality
- [ ] All tracking uses `analytics-service.ts` (no duplicate logic)
- [ ] Feature flag works (NEXT_PUBLIC_ENABLE_ANALYTICS=false disables all tracking)
- [ ] No console errors from analytics code
- [ ] Analytics never blocks UI (non-blocking, no awaits)
- [ ] TypeScript types for all events and data

### Business Value
- [ ] Can answer: "Which books are most popular?"
- [ ] Can answer: "Do users play audio or just read?"
- [ ] Can answer: "Do users progress through CEFR levels?"
- [ ] Can answer: "What % of users resume reading?"
- [ ] Can answer: "Average session duration?"
- [ ] Can answer: "Most popular theme/speed settings?"

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
  ↓
Service Layer (pure functions)
  ├─ book-loader.ts
  ├─ availability.ts
  ├─ level-persistence.ts
  ├─ audio-transforms.ts
  └─ analytics-service.ts ✨ NEW (pure tracking functions)
      └─ trackEvent(), getOrCreateSessionId(), calculateSessionDuration()
```

**Key Improvements:**
- ✅ Context stays clean (one trackEvent() call per lifecycle event)
- ✅ Service layer stays pure (analytics-service is pure functions)
- ✅ No new state (sessionId in ref, not state)
- ✅ Feature-flagged (can disable entirely)
- ✅ Follows hero demo pattern (proven approach)

---

## 📋 Task Breakdown (Ordered by Priority)

### Week 1: Foundation + Highest Value Features (4-5 hours)

**Day 1 Morning (1.5 hours):**
- [ ] Task 1.1: Create analytics-service.ts (30 min)
- [ ] Task 2.1: Add level switch tracking (15 min)
- [ ] Task 3.1: Add audio playback tracking (30 min)
- [ ] Testing: Verify all events fire correctly (15 min)

**Day 1 Afternoon (2 hours):**
- [ ] Task 4.1: Add book selection tracking (30 min)
- [ ] Task 4.2: Add chapter navigation tracking (30 min)
- [ ] Task 5.1: Add resume behavior tracking (30 min)
- [ ] Testing: End-to-end user journey (30 min)

**Day 2 (Optional - Polish):**
- [ ] Task 6.1: Add session tracking (30 min)
- [ ] Task 6.2: Add bundle completion tracking (15 min)
- [ ] Task 7.1: Add speed tracking (10 min)
- [ ] Task 7.2: Add theme tracking (10 min)
- [ ] Documentation: Update ARCHITECTURE_OVERVIEW.md (30 min)

**Total Estimated Time**: 4-5 hours for all 6 features

---

## 🔍 Testing Strategy

### Manual Testing Checklist

**Feature 2 (Level Progression):**
- [ ] Load Pride & Prejudice at A1
- [ ] Switch to A2 → Check console for level_switched event
- [ ] Verify: from_level="A1", to_level="A2"
- [ ] Check Google Analytics Real-Time → See event appear

**Feature 3 (Audio Usage):**
- [ ] Select book
- [ ] Click play → Check audio_played event
- [ ] Pause → Check audio_paused event with audio_time
- [ ] Let audio finish → Check audio_completed event

**Feature 1 (Book Popularity):**
- [ ] Select 3 different books → Check 3 book_selected events
- [ ] For one book, navigate to Chapter 2 → Check chapter_started
- [ ] For one book, abandon at Chapter 1 → Verify no chapter_started for Ch 2

**Feature 5 (Resume):**
- [ ] Read book, close tab
- [ ] Return after 1 hour → Check resume_available event
- [ ] Click Continue Reading → Check resume_clicked event
- [ ] Verify: hours_since_last_read ~1

**Feature 4 (Session Length):**
- [ ] Open app, read for 5 minutes
- [ ] Complete 2 bundles → Check 2 bundle_completed events
- [ ] Close tab → Check session_end with duration ~300s

**Feature 6 (Speed/Theme):**
- [ ] Change speed to 1.5x → Check speed_changed event
- [ ] Change theme to Dark → Check theme_changed event

### Integration Testing

```bash
# Enable analytics
export NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Start dev server
npm run dev

# Run through user journey:
# 1. Select book (Pride & Prejudice A1)
# 2. Play audio
# 3. Switch to A2
# 4. Navigate to Chapter 2
# 5. Pause
# 6. Close tab and return (resume)
# 7. Change speed to 1.5x
# 8. Change theme to Dark

# Check console for all events
# Check Google Analytics Real-Time dashboard
```

### Production Validation

**After Deployment:**
1. Check Google Analytics Real-Time events (first 24 hours)
2. Verify event counts match expected usage
3. Check for any tracking errors in Sentry/logs
4. Validate session IDs are unique and persistent

---

## 📊 Analytics Dashboard (Future Enhancement)

### Google Analytics Custom Reports

**Report 1: Book Popularity**
- Dimensions: book_title, level
- Metrics: book_selected (count), book_load_completed (count)
- Filters: event_name = "book_selected"

**Report 2: Audio Usage**
- Dimensions: book_title, level
- Metrics: audio_played (count), audio_completed (count)
- Calculated: completion_rate = audio_completed / audio_played

**Report 3: CEFR Progression**
- Dimensions: from_level, to_level
- Metrics: level_switched (count)
- Filters: event_name = "level_switched"

**Report 4: Retention**
- Dimensions: within_24_hours (true/false)
- Metrics: resume_clicked (count)
- Calculated: retention_rate = resume_clicked / book_selected

### Potential Future Integrations

**PostHog** (Open-source analytics):
- Session replays (see how users navigate)
- Funnel analysis (book selection → audio play → completion)
- Retention cohorts (Week 1 vs Week 4 engagement)

**Mixpanel** (Advanced analytics):
- User profiles (track individual learning progress)
- A/B testing (test different default speeds)
- Predictive analytics (which users will churn?)

**Custom Dashboard** (Phase 7 - Future):
- Real-time usage metrics
- Teacher dashboard (classroom analytics)
- Content strategy dashboard (book prioritization)

---

## 🔗 Related Documentation

### Read Before Implementation

1. **FEATURED_BOOKS_REFACTOR_PLAN.md** (this file's foundation)
   - Service layer pattern (Phase 4)
   - AudioContext architecture (Phase 1)
   - Pure functions principle

2. **ARCHITECTURE_OVERVIEW.md**
   - Hero demo analytics pattern (lines 296-357)
   - AudioContext state machine (lines 390-431)
   - Service layer overview (lines 1619-1881)

3. **components/hero/InteractiveReadingDemo.tsx**
   - Existing analytics implementation (lines 52-74)
   - trackDemoEvent pattern to replicate

### Update After Implementation

**When Phase 1 Complete:**
- [ ] Add analytics-service to ARCHITECTURE_OVERVIEW.md Service Layer section
- [ ] Document trackEvent() API
- [ ] Add code anchors for analytics calls in AudioContext

**When All Features Complete:**
- [ ] Update ARCHITECTURE_OVERVIEW.md with analytics architecture diagram
- [ ] Document all 14 tracked events
- [ ] Create analytics dashboard guide (how to read Google Analytics)

---

## 🚀 Quick Start Guide

### For Developers

**To implement analytics:**

1. **Read this document** (you're doing this now ✓)
2. **Create analytics-service.ts** (Task 1.1 - 30 min)
3. **Add tracking to AudioContext** (Tasks 2-5 - 2 hours)
4. **Test manually** (30 min)
5. **Deploy and validate** (check Google Analytics)

**Commands:**
```bash
# Enable analytics in development
echo "NEXT_PUBLIC_ENABLE_ANALYTICS=true" >> .env.local

# Start dev server
npm run dev

# Run through test scenarios (see Testing Strategy)

# Push to production
git add .
git commit -m "feat(analytics): Add 6 usage analytics features"
git push origin main
```

### For Product/Business

**To view analytics:**

1. **Google Analytics Dashboard** → Real-Time → Events
2. **Filter by**: event_category = "book_reading"
3. **View metrics**:
   - book_selected → Most popular books
   - level_switched → CEFR progression patterns
   - audio_played → Audio usage %
   - resume_clicked → Retention rate
   - session_end → Average session duration

**Example Queries:**
- "Which books are most popular?" → Sort book_selected by book_title
- "What % use audio?" → (audio_played / book_selected) × 100
- "Do users progress levels?" → level_switched where to_level > from_level

---

## 💡 Programming Principles Applied

### From Phase 4 Refactor

1. **Services as Pure Functions** ✅
   - `analytics-service.ts` has no state, just tracking functions
   - Input: event name + data → Output: console log + gtag call
   - No React dependencies, can be used anywhere

2. **Context as Orchestrator** ✅
   - AudioContext calls trackEvent() at lifecycle points
   - Context owns session_id (in ref, not state)
   - No analytics logic in components

3. **Single Responsibility** ✅
   - analytics-service.ts: Only handles event tracking
   - AudioContext: Only adds trackEvent() calls (one per action)
   - Components: Zero analytics code (all in context)

4. **Feature Flagged** ✅
   - NEXT_PUBLIC_ENABLE_ANALYTICS controls all tracking
   - Can disable entirely for development
   - No performance impact when disabled

5. **Type Safe** ✅
   - TypeScript types for all events
   - AnalyticsEvent enum prevents typos
   - AnalyticsEventData interface ensures consistency

6. **Non-Blocking** ✅
   - Never throws errors (wrapped in try/catch if needed)
   - Never awaits (synchronous logging)
   - Never blocks UI rendering

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

---

## 🎯 Definition of Done

### Analytics Implementation Complete When:

- [ ] analytics-service.ts created with all utility functions
- [ ] All 6 features implemented (14 total events tracked)
- [ ] Feature flag works (NEXT_PUBLIC_ENABLE_ANALYTICS)
- [ ] All events appear in console (development mode)
- [ ] All events appear in Google Analytics (production mode)
- [ ] Zero TypeScript errors
- [ ] Zero console errors from analytics code
- [ ] Manual testing completed for all features
- [ ] ARCHITECTURE_OVERVIEW.md updated with analytics section
- [ ] Can answer all 6 business questions listed above

### Production Validation Complete When:

- [ ] Events appear in Google Analytics Real-Time (first 24 hours)
- [ ] Session IDs are unique and persistent
- [ ] Event counts match expected usage patterns
- [ ] No tracking errors in logs/Sentry
- [ ] Performance: Zero impact on page load time

---

**Document Version**: 1.0
**Created**: October 2025
**Status**: Ready to implement
**Estimated Effort**: 1-2 days for all 6 features
**Prerequisites**: Phase 4 refactor complete (AudioContext + Service Layer)

**Next Action**: Create `lib/services/analytics-service.ts` (Task 1.1)
