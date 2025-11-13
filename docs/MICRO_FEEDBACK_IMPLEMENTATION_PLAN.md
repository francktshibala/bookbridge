# 💬 Micro-Feedback System Implementation Plan

**Date:** January 2025
**Goal:** Capture feedback from silent users (LA, other cities) without annoying them or conflicting with existing feedback system
**Status:** ✅ Plan approved by GPT-5 | ⏸️ Implementation pending
**Branch:** `feature/micro-feedback`
**Estimated Time:** 3 days (6 incremental commits)

---

## 📋 Executive Summary

### What This Is

**Lightweight, contextual feedback system** that captures data from users who never visit `/feedback` page.

**Trigger:** After 2-3 minutes of reading, show subtle slide-in banner when user **pauses audio**

**What We Ask:**
1. **NPS Score** (1-10 buttons) OR **3-Emoji Sentiment** (😞 😐 😊)
2. **Optional 1-line text:** "One thing to improve?" (12-40 chars max)
3. **Optional email:** "Get 2 book recommendations"

**What We DON'T Ask:**
- ❌ City dropdown (use server-side geolocation instead - less friction)
- ❌ Multiple fields (keeps it ultra-light, 1 tap minimum)

**How It's Different from `/feedback` Page:**

| Feature | `/feedback` Page | Micro-Feedback Banner |
|---------|------------------|----------------------|
| **Trigger** | Manual click | Automatic (pause moment) |
| **Frequency** | Once ever | Once per 60 days |
| **Fields** | 10+ fields | 1-3 fields |
| **Depth** | Comprehensive | Quick signal |
| **Target** | Engaged users (20%) | Silent majority (80%) |
| **localStorage** | `feedback_submitted` | `micro_feedback_last_shown` |

---

### Why This Won't Break Things

**✅ Follows BookBridge Architecture Patterns:**
- **Service Layer:** Pure functions in `lib/services/feedback-micro.ts` (Phase 4 pattern)
- **Hook Layer:** `hooks/usePauseMomentSurvey.ts` listens to AudioContext, keeps state separate
- **Component Layer:** `components/feedback/PauseMomentBanner.tsx` (presentational, explicit props)
- **API Layer:** `app/api/feedback/micro/route.ts` (thin, Node.js runtime)

**✅ Keeps Complexity OUT of Featured-Books Page:**
- Hook listens to AudioContext's `isPlaying` state
- ALL survey logic lives in hook + component (not in 2,506-line page)
- Page just renders `<PauseMomentSurvey />` component at layout level

**✅ Feature Flag for Safe Rollout:**
- `NEXT_PUBLIC_ENABLE_MICRO_FEEDBACK=true`
- Start with 10-20% of users
- Monitor response/dismissal rates
- Roll back if >70% dismissal rate

---

### GPT-5 Validation Summary

**✅ Approved with Key Adjustments:**

1. **Trigger earlier:** 2-3 min (not 3-5) to catch users before they leave
2. **Remove city dropdown:** Use server-side geolocation (less friction, better UX)
3. **Simpler UI:** 1 tap (NPS or emoji), then optional 1-line text
4. **Adjust cooldowns:** 60 days if responded, 45-60 days if dismissed
5. **Realistic targets:** 15-25% response rate (not 30-40%), <60% dismissal acceptable
6. **Architecture:** Hook-based, decoupled from monolith page
7. **Rollout:** Feature flag, 10-20% first, track metrics

**Go/No-Go:** ✅ **GO** - Low risk, high ROI, improves ESL pacing

---

## 🎯 Problem Statement

**Current Situation:**
- 20+ feedback submissions from engaged users via `/feedback` page
- Google Analytics shows high usage in Los Angeles and other cities
- **Gap:** Many active users never visit `/feedback` page, we don't have their contact info or opinions

**User Concerns:**
- Will new micro-surveys annoy users?
- Will it conflict with existing 2-step feedback form?
- Will it add complexity to already-large featured-books page (2,506 lines)?

**Answer:** No - hook-based architecture keeps complexity separate, strict cooldowns prevent annoyance, complementary to existing system.

---

## ✅ Architecture Compatibility Analysis

### Existing Feedback System (Baseline)

**Current Implementation:**
- **Location:** `/app/feedback/page.tsx` + `/components/feedback/FeedbackForm.tsx`
- **Type:** Dedicated page with full 2-step form
- **Triggers:** User navigates to "Leave Feedback" link (manual)
- **Data Collected:** Email, NPS (1-10), source, features used, improvement suggestions, interview opt-in
- **Frequency:** Once per user (tracked via `localStorage.getItem('feedback_submitted')`)
- **Pattern:** Service layer (feedback-service.ts) → API route → Supabase → Email notification
- **Philosophy:** Comprehensive, voluntary, detailed feedback from engaged users

**Strengths:**
✅ Rich qualitative data
✅ Email capture for follow-up
✅ Interview opt-in pipeline
✅ Neo-Classic UI design
✅ Follows Phase 4 service layer pattern

**Limitations:**
❌ Requires user to navigate to `/feedback` manually
❌ Only captures ~20% of active users (40% of pilot users)
❌ Doesn't capture city data (missing in form fields)
❌ Silent majority never visits the page

---

### New Micro-Feedback System (Complement, Not Replace)

**Purpose:** Lightweight, contextual feedback to capture data from users who won't visit `/feedback` page

**Key Principle:** **Complement existing system, don't duplicate or conflict**

**How They Work Together:**

| Feature | Existing `/feedback` Page | New Micro-Feedback |
|---------|---------------------------|---------------------|
| **Trigger** | User clicks "Leave Feedback" link | Appears during pause (2-3 min reading) |
| **Frequency** | Once per user (voluntary) | Once per 60 days (limited) |
| **Data Depth** | Comprehensive (10+ fields) | Minimal (1-3 fields) |
| **User Type** | Engaged users (20% of actives) | Silent majority (80% of users) |
| **Email Required?** | Yes (required field) | Optional (incentivized) |
| **Interview Opt-In?** | Yes | No |
| **Goal** | Deep insights from advocates | Broad trends from everyone |
| **localStorage Key** | `feedback_submitted` | `micro_feedback_last_shown` |
| **City Capture** | Manual (missing) | Automatic (geolocation) |

**Architecture Compatibility:**

✅ **No Conflict:** Different localStorage keys, different API endpoints
✅ **Follows Phase 4 Pattern:** New service layer functions in `lib/services/feedback-micro.ts`
✅ **Follows Phase 3 Pattern:** Extracted component (`PauseMomentBanner.tsx`)
✅ **Follows Phase 1 Pattern:** Uses existing AudioContext for timing triggers (SSoT)
✅ **Hook-Based:** Keeps complexity OUT of featured-books page (2,506 lines)
✅ **Non-Intrusive:** Dismissible banner, frequency-limited, doesn't block reading

---

## 🚫 Anti-Annoyance Strategy (GPT-5 Validated)

### Problem: Survey Fatigue

**Risk:** Users see too many feedback prompts → close them reflexively → ignore all feedback

**Mitigation:**

#### 1. Frequency Limits (localStorage Tracking)

```typescript
const MICRO_FEEDBACK_COOLDOWN_DAYS = 60; // Once per 2 months (GPT-5: was 30, now 60)

const shouldShowMicroFeedback = () => {
  const lastShown = localStorage.getItem('micro_feedback_last_shown');
  if (!lastShown) return true;

  const daysSinceShown = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
  return daysSinceShown >= MICRO_FEEDBACK_COOLDOWN_DAYS;
};
```

#### 2. Mutual Exclusion with Main Feedback

```typescript
// Don't show micro-feedback if user already submitted full feedback recently
const fullFeedbackSubmitted = localStorage.getItem('feedback_submitted');
const fullFeedbackDate = localStorage.getItem('feedback_submitted_date');

if (fullFeedbackSubmitted === 'true' && fullFeedbackDate) {
  const daysSinceFullFeedback = (Date.now() - parseInt(fullFeedbackDate)) / (1000 * 60 * 60 * 24);
  if (daysSinceFullFeedback < 90) {
    return null; // User gave detailed feedback recently, skip micro-feedback
  }
}
```

#### 3. Engagement Threshold (GPT-5: 2-3 min, not 10)

```typescript
// Only show to users who've read for 2-3 minutes (engaged but not too long)
const sessionDuration = getSessionDuration();
if (sessionDuration < 120) return null; // 2 minutes minimum
if (sessionDuration > 180) return null; // 3 minutes maximum (catch early)
```

**Rationale (GPT-5):** Trigger earlier (2-3 min) to capture users before they leave. Don't wait 10 min (too late, miss early exits).

#### 4. One Modal at a Time

```typescript
// Don't show if other modals are open (Dictionary, AI Chat, Settings)
if (isDictionaryOpen || isAIChatOpen || isSettingsOpen || isContinueModalOpen) {
  return null;
}
```

#### 5. Dismissal Tracking (GPT-5: 45-60 days, not 90)

```typescript
// If user dismisses without responding, don't ask again for 45-60 days
const handleDismiss = () => {
  localStorage.setItem('micro_feedback_dismissed', Date.now().toString());
  localStorage.setItem('micro_feedback_last_shown', Date.now().toString());

  // Analytics
  trackEvent('micro_feedback_dismissed', {
    session_duration: getSessionDuration(),
    trigger_type: 'pause_moment',
  });

  onClose();
};
```

**Rationale (GPT-5):** 90 days too long - lose chance to catch improved sentiment. 45-60 days balances annoyance vs fresh signal.

#### 6. Auto-Dismiss (20-30 seconds)

```typescript
// Auto-dismiss if user ignores for 30 seconds (don't leave banner lingering)
useEffect(() => {
  const timer = setTimeout(() => {
    if (isVisible && !hasInteracted) {
      handleAutoDismiss();
    }
  }, 30000); // 30 seconds

  return () => clearTimeout(timer);
}, [isVisible, hasInteracted]);
```

#### 7. Pause-Moment Trigger (Non-Intrusive)

```typescript
// Only show when user PAUSES (natural break), never during active reading
if (isPlaying) return null; // Never interrupt active reading
if (!hasPlayedForMinimum) return null; // Must have engaged first
```

**Rationale (GPT-5):** Pause = natural break, good moment to ask. Never interrupt mid-playback (ESL learners need focus).

---

## 📊 Implementation Plan: Incremental Steps

### Development Workflow (Following Architecture Patterns)

**Branch:** `feature/micro-feedback`

**Pattern:** Service → Hook → Component → API → Integration → Testing

**Commits:** 6 small commits, each buildable and testable

**Feature Flag:** `NEXT_PUBLIC_ENABLE_MICRO_FEEDBACK=true`

---

### Step 1: Database Schema + Service Layer (Day 1, Morning)

**Goal:** Add database table and pure functions for micro-feedback

**Files to Create:**

#### 1.1. Database Schema

**Edit:** `/prisma/schema.prisma`

```prisma
model MicroFeedback {
  id              String   @id @default(uuid())
  type            String   // 'pause_moment' (could add 'completion' later)
  npsScore        Int?     // 1-10 (null if emoji used)
  sentiment       String?  // 'negative', 'neutral', 'positive' (null if NPS used)
  feedbackText    String?  // Optional 1-line improvement (12-40 chars)
  email           String?  // Optional email for book recommendations

  // Server-side captured metadata
  city            String?  // From IP geolocation
  region          String?  // State/province
  country         String?  // Country code
  deviceType      String?  // 'desktop', 'mobile', 'tablet'
  sessionDuration Int?     // Seconds of reading before shown
  lastBookId      String?  // Book they were reading
  lastLevel       String?  // CEFR level (A1-C2 or 'original')

  dismissed       Boolean  @default(false) // True if dismissed without responding
  createdAt       DateTime @default(now())

  @@map("micro_feedback")
  @@index([createdAt])
  @@index([city])
}
```

**Run Migration:**
```bash
npx prisma migrate dev --name add_micro_feedback
```

#### 1.2. Service Layer (Pure Functions)

**Create:** `/lib/services/feedback-micro.ts`

```typescript
/**
 * Micro-Feedback Service
 *
 * Pure functions for micro-feedback operations.
 * Follows Phase 4 pattern: dumb data handlers, no state.
 */

import { prisma } from '@/lib/prisma';

export interface MicroFeedbackData {
  type: 'pause_moment' | 'completion';
  npsScore?: number; // 1-10
  sentiment?: 'negative' | 'neutral' | 'positive';
  feedbackText?: string;
  email?: string;

  // Server-captured metadata
  city?: string;
  region?: string;
  country?: string;
  deviceType?: string;
  sessionDuration?: number;
  lastBookId?: string;
  lastLevel?: string;

  dismissed?: boolean;
}

/**
 * Create micro-feedback entry in database
 */
export async function createMicroFeedback(data: MicroFeedbackData) {
  return await prisma.microFeedback.create({
    data: {
      type: data.type,
      npsScore: data.npsScore || null,
      sentiment: data.sentiment || null,
      feedbackText: data.feedbackText || null,
      email: data.email || null,
      city: data.city || null,
      region: data.region || null,
      country: data.country || null,
      deviceType: data.deviceType || null,
      sessionDuration: data.sessionDuration || null,
      lastBookId: data.lastBookId || null,
      lastLevel: data.lastLevel || null,
      dismissed: data.dismissed || false,
    },
  });
}

/**
 * Get geolocation from IP address (server-side only)
 */
export async function getGeolocationFromIP(ip: string): Promise<{
  city?: string;
  region?: string;
  country?: string;
}> {
  // Use ipapi.co (free tier: 30k requests/month)
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!response.ok) return {};

    const data = await response.json();
    return {
      city: data.city || undefined,
      region: data.region || undefined,
      country: data.country_code || undefined,
    };
  } catch (error) {
    console.error('[MicroFeedback] Geolocation failed:', error);
    return {};
  }
}

/**
 * Send micro-feedback email notification to admin
 */
export async function sendMicroFeedbackNotification(data: {
  id: string;
  type: string;
  npsScore?: number;
  sentiment?: string;
  feedbackText?: string;
  email?: string;
  city?: string;
}) {
  // Skip if no API key
  if (!process.env.RESEND_API_KEY) {
    console.warn('[EmailService] RESEND_API_KEY not configured - skipping email');
    return { skipped: true };
  }

  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const ADMIN_EMAIL = 'bookbridgegap@gmail.com';

  const scoreLabel = data.npsScore
    ? (data.npsScore >= 9 ? '🟢 Promoter' : data.npsScore >= 7 ? '🟡 Passive' : '🔴 Detractor')
    : '';

  const sentimentLabel = data.sentiment
    ? (data.sentiment === 'positive' ? '😊 Positive' : data.sentiment === 'neutral' ? '😐 Neutral' : '😞 Negative')
    : '';

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.6; color: #2C1810; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #F4F1EB; }
          .header { background: #002147; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #FFFFFF; padding: 20px; border-radius: 0 0 8px 8px; }
          .badge { display: inline-block; padding: 6px 14px; border-radius: 6px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">💬 Quick Feedback Received</h1>
            <p style="margin: 5px 0 0 0;">BookBridge Micro-Feedback System</p>
          </div>
          <div class="content">
            <p><strong>Type:</strong> ${data.type === 'pause_moment' ? '⏸️ Pause Moment' : '🎉 Completion'}</p>
            ${data.npsScore ? `<p><strong>NPS Score:</strong> <span class="badge">${data.npsScore}/10 - ${scoreLabel}</span></p>` : ''}
            ${data.sentiment ? `<p><strong>Sentiment:</strong> ${sentimentLabel}</p>` : ''}
            ${data.feedbackText ? `<p><strong>Feedback:</strong> "${data.feedbackText}"</p>` : ''}
            ${data.city ? `<p><strong>City:</strong> 📍 ${data.city}</p>` : ''}
            ${data.email ? `<p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>` : ''}
            <hr style="margin: 20px 0; border: 0; border-top: 1px solid #E5DDD4;">
            <p><strong>Next Steps:</strong></p>
            <ul>
              ${data.email ? `<li>Add to email list: ${data.email}</li>` : ''}
              ${data.city ? `<li>Track city trends: ${data.city}</li>` : ''}
              <li>View in Supabase: micro_feedback → ${data.id}</li>
            </ul>
          </div>
        </div>
      </body>
    </html>
  `;

  return await resend.emails.send({
    from: 'BookBridge <onboarding@resend.dev>',
    to: ADMIN_EMAIL,
    subject: `💬 Micro-Feedback: ${scoreLabel || sentimentLabel} ${data.city ? `from ${data.city}` : ''}`,
    html: htmlBody,
  });
}
```

**Commit:** `git commit -m "feat(micro-feedback): Add database schema and service layer"`

**Push to GitHub:** `git push origin feature/micro-feedback`

---

### Step 2: Custom Hook (Day 1, Afternoon)

**Goal:** Create hook to manage survey timing, trigger logic, and state

**Create:** `/hooks/usePauseMomentSurvey.ts`

```typescript
/**
 * usePauseMomentSurvey Hook
 *
 * Manages micro-feedback survey timing and trigger logic.
 * Listens to AudioContext but keeps all state local to avoid polluting context.
 *
 * Follows Phase 1 pattern: Read from context, manage local state.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAudioContext } from '@/contexts/AudioContext';

interface UsePauseMomentSurveyOptions {
  enabled?: boolean; // Feature flag control
  minSessionDuration?: number; // Minimum seconds before showing (default: 120 = 2 min)
  maxSessionDuration?: number; // Maximum seconds before showing (default: 180 = 3 min)
  cooldownDays?: number; // Days between shows (default: 60)
  dismissalCooldownDays?: number; // Days after dismissal (default: 60)
}

export function usePauseMomentSurvey(options: UsePauseMomentSurveyOptions = {}) {
  const {
    enabled = true,
    minSessionDuration = 120, // 2 minutes (GPT-5: catch early)
    maxSessionDuration = 180, // 3 minutes (GPT-5: before they leave)
    cooldownDays = 60, // 2 months (GPT-5 adjusted from 30)
    dismissalCooldownDays = 60, // 2 months (GPT-5 adjusted from 90)
  } = options;

  const { isPlaying, selectedBook, cefrLevel } = useAudioContext();

  const [shouldShow, setShouldShow] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    // Feature flag check
    if (!enabled) return;

    // Don't trigger if already shown in this session
    if (hasTriggeredRef.current) return;

    // Only trigger when user PAUSES (not during active playback)
    if (isPlaying) return;

    // Calculate session duration
    const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);

    // Check if within trigger window (2-3 minutes)
    if (sessionDuration < minSessionDuration) return;
    if (sessionDuration > maxSessionDuration) return;

    // Check all cooldown rules
    if (!shouldShowBasedOnCooldowns(cooldownDays, dismissalCooldownDays)) return;

    // All conditions met - show survey
    setShouldShow(true);
    hasTriggeredRef.current = true;

    // Track trigger
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'micro_feedback_triggered', {
        session_duration: sessionDuration,
        trigger_type: 'pause_moment',
      });
    }
  }, [isPlaying, sessionStartTime, minSessionDuration, maxSessionDuration, cooldownDays, dismissalCooldownDays, enabled]);

  const handleClose = () => {
    setShouldShow(false);
  };

  const handleSubmit = () => {
    // Mark as shown
    localStorage.setItem('micro_feedback_last_shown', Date.now().toString());
    localStorage.setItem('micro_feedback_submitted', 'true');
    setShouldShow(false);
  };

  const handleDismiss = () => {
    // Mark as dismissed (longer cooldown)
    localStorage.setItem('micro_feedback_dismissed', Date.now().toString());
    localStorage.setItem('micro_feedback_last_shown', Date.now().toString());

    // Analytics
    const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'micro_feedback_dismissed', {
        session_duration: sessionDuration,
        trigger_type: 'pause_moment',
      });
    }

    setShouldShow(false);
  };

  return {
    shouldShow,
    sessionDuration: Math.floor((Date.now() - sessionStartTime) / 1000),
    currentBook: selectedBook,
    currentLevel: cefrLevel,
    handleClose,
    handleSubmit,
    handleDismiss,
  };
}

/**
 * Check if survey should show based on cooldown rules
 */
function shouldShowBasedOnCooldowns(
  cooldownDays: number,
  dismissalCooldownDays: number
): boolean {
  // Rule 1: Don't show if user already submitted full feedback recently
  const fullFeedbackSubmitted = localStorage.getItem('feedback_submitted');
  const fullFeedbackDate = localStorage.getItem('feedback_submitted_date');

  if (fullFeedbackSubmitted === 'true' && fullFeedbackDate) {
    const daysSinceFullFeedback = (Date.now() - parseInt(fullFeedbackDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceFullFeedback < 90) {
      return false; // User gave detailed feedback recently
    }
  }

  // Rule 2: Don't show if dismissed recently
  const dismissed = localStorage.getItem('micro_feedback_dismissed');
  if (dismissed) {
    const daysSinceDismissed = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissed < dismissalCooldownDays) return false;
  }

  // Rule 3: Don't show if shown recently
  const lastShown = localStorage.getItem('micro_feedback_last_shown');
  if (lastShown) {
    const daysSinceShown = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
    if (daysSinceShown < cooldownDays) return false;
  }

  // Rule 4: Don't show if already submitted micro-feedback
  if (localStorage.getItem('micro_feedback_submitted') === 'true') {
    return false;
  }

  return true;
}
```

**Commit:** `git commit -m "feat(micro-feedback): Add usePauseMomentSurvey hook"`

**Push to GitHub:** `git push origin feature/micro-feedback`

---

### Step 3: UI Component (Day 2, Morning)

**Goal:** Create presentational component for the survey banner

**Create:** `/components/feedback/PauseMomentBanner.tsx`

```typescript
/**
 * PauseMomentBanner Component
 *
 * Lightweight slide-in banner for micro-feedback.
 * Appears at bottom of screen during pause moment.
 *
 * Follows Phase 3 pattern: Presentational component with explicit props.
 */

'use client';

import { useState, useEffect } from 'react';

interface PauseMomentBannerProps {
  isVisible: boolean;
  sessionDuration: number;
  bookTitle?: string;
  onSubmit: (data: {
    npsScore?: number;
    sentiment?: 'negative' | 'neutral' | 'positive';
    feedbackText?: string;
    email?: string;
  }) => void;
  onDismiss: () => void;
  onClose: () => void;
}

export default function PauseMomentBanner({
  isVisible,
  sessionDuration,
  bookTitle,
  onSubmit,
  onDismiss,
  onClose,
}: PauseMomentBannerProps) {
  const [step, setStep] = useState<'score' | 'details'>('score');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [sentiment, setSentiment] = useState<'negative' | 'neutral' | 'positive' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);

  // Auto-dismiss after 30 seconds if no interaction
  useEffect(() => {
    if (!isVisible || hasInteracted) return;

    const timer = setTimeout(() => {
      // Analytics: auto-dismissed
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'micro_feedback_autodismissed', {
          session_duration: sessionDuration,
          trigger_type: 'pause_moment',
        });
      }
      onClose();
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [isVisible, hasInteracted, sessionDuration, onClose]);

  const handleNpsClick = (score: number) => {
    setNpsScore(score);
    setHasInteracted(true);
    setStep('details');
  };

  const handleSentimentClick = (sent: 'negative' | 'neutral' | 'positive') => {
    setSentiment(sent);
    setHasInteracted(true);
    setStep('details');
  };

  const handleSubmitClick = () => {
    onSubmit({
      npsScore: npsScore || undefined,
      sentiment: sentiment || undefined,
      feedbackText: feedbackText || undefined,
      email: email || undefined,
    });
  };

  const handleDismissClick = () => {
    setHasInteracted(true);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[9998]"
      style={{
        animation: 'slideUp 0.3s ease-out',
        maxWidth: '90%',
        width: '600px',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from {
            transform: translate(-50%, 100px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>

      <div
        className="bg-[var(--bg-secondary)] rounded-lg shadow-2xl p-4 border-2"
        style={{
          borderColor: 'var(--accent-primary)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleDismissClick}
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="Dismiss"
        >
          ×
        </button>

        {step === 'score' && (
          <div>
            <h3
              className="text-lg font-semibold mb-3"
              style={{
                fontFamily: 'Playfair Display, serif',
                color: 'var(--text-primary)',
              }}
            >
              How's BookBridge so far? (Quick tap!)
            </h3>

            {/* NPS Buttons */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  onClick={() => handleNpsClick(score)}
                  className="w-10 h-10 rounded-lg font-bold transition-all"
                  style={{
                    backgroundColor: npsScore === score ? 'var(--accent-primary)' : 'var(--bg-primary)',
                    color: npsScore === score ? 'var(--bg-primary)' : 'var(--text-primary)',
                    border: `2px solid ${npsScore === score ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                  }}
                >
                  {score}
                </button>
              ))}
            </div>

            {/* OR Emoji Sentiment */}
            <p className="text-center text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              or tap an emoji:
            </p>
            <div className="flex gap-4 justify-center mb-3">
              {[
                { sentiment: 'negative' as const, emoji: '😞', label: 'Not great' },
                { sentiment: 'neutral' as const, emoji: '😐', label: 'Okay' },
                { sentiment: 'positive' as const, emoji: '😊', label: 'Great!' },
              ].map((option) => (
                <button
                  key={option.sentiment}
                  onClick={() => handleSentimentClick(option.sentiment)}
                  className="flex flex-col items-center p-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: sentiment === option.sentiment ? 'var(--accent-primary)' : 'transparent',
                    border: `2px solid ${sentiment === option.sentiment ? 'var(--accent-primary)' : 'transparent'}`,
                  }}
                >
                  <span className="text-3xl mb-1">{option.emoji}</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
              Auto-dismisses in 30 seconds
            </p>
          </div>
        )}

        {step === 'details' && (
          <div>
            <h3
              className="text-lg font-semibold mb-3"
              style={{
                fontFamily: 'Playfair Display, serif',
                color: 'var(--text-primary)',
              }}
            >
              Thanks! One thing to improve? (Optional)
            </h3>

            {/* Feedback Text (12-40 chars, GPT-5 recommendation) */}
            <input
              type="text"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g., more modern books"
              maxLength={40}
              className="w-full px-3 py-2 rounded-lg border mb-3"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)',
              }}
            />
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              {feedbackText.length}/40 characters
            </p>

            {/* Email (Optional, GPT-5: incentivize with "Get 2 book suggestions") */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com (optional)"
              className="w-full px-3 py-2 rounded-lg border mb-2"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)',
              }}
            />
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              📧 Get 2 personalized book recommendations
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleDismissClick}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)',
                }}
              >
                Skip
              </button>
              <button
                onClick={handleSubmitClick}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--bg-primary)',
                }}
              >
                Submit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Commit:** `git commit -m "feat(micro-feedback): Add PauseMomentBanner component"`

**Push to GitHub:** `git push origin feature/micro-feedback`

---

### Step 4: API Route (Day 2, Afternoon)

**Goal:** Create API endpoint with geolocation capture

**Create:** `/app/api/feedback/micro/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createMicroFeedback, getGeolocationFromIP, sendMicroFeedbackNotification } from '@/lib/services/feedback-micro';

export const runtime = 'nodejs'; // Resend requires Node

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate at least one input (NPS or sentiment)
    if (!body.npsScore && !body.sentiment) {
      return NextResponse.json(
        { error: 'NPS score or sentiment required' },
        { status: 400 }
      );
    }

    // Get IP address for geolocation
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Get geolocation from IP (server-side, GPT-5 recommendation)
    const geolocation = ip !== 'unknown' ? await getGeolocationFromIP(ip) : {};

    // Get device type from user-agent
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const deviceType = /mobile/i.test(userAgent) ? 'mobile' :
                       /tablet/i.test(userAgent) ? 'tablet' : 'desktop';

    // Create micro-feedback record
    const microFeedback = await createMicroFeedback({
      type: body.type || 'pause_moment',
      npsScore: body.npsScore || undefined,
      sentiment: body.sentiment || undefined,
      feedbackText: body.feedbackText || undefined,
      email: body.email || undefined,
      city: geolocation.city,
      region: geolocation.region,
      country: geolocation.country,
      deviceType,
      sessionDuration: body.sessionDuration || undefined,
      lastBookId: body.lastBookId || undefined,
      lastLevel: body.lastLevel || undefined,
      dismissed: false,
    });

    // Send email notification (non-blocking)
    try {
      await sendMicroFeedbackNotification({
        id: microFeedback.id,
        type: body.type || 'pause_moment',
        npsScore: body.npsScore,
        sentiment: body.sentiment,
        feedbackText: body.feedbackText,
        email: body.email,
        city: geolocation.city,
      });
    } catch (emailError) {
      console.error('[API /feedback/micro] Email failed:', emailError);
      // Don't fail request if email fails
    }

    return NextResponse.json({ success: true, id: microFeedback.id }, { status: 201 });

  } catch (error) {
    console.error('[API /feedback/micro] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit micro-feedback' },
      { status: 500 }
    );
  }
}
```

**Commit:** `git commit -m "feat(micro-feedback): Add API route with geolocation"`

**Push to GitHub:** `git push origin feature/micro-feedback`

---

### Step 5: Integration (Day 3, Morning)

**Goal:** Integrate hook and component into app

**Edit:** `/app/featured-books/page.tsx` (ADD at end, before final export)

```typescript
import { usePauseMomentSurvey } from '@/hooks/usePauseMomentSurvey';
import PauseMomentBanner from '@/components/feedback/PauseMomentBanner';

// Inside FeaturedBooksContent component, before return statement:

  // Micro-feedback survey (feature-flagged)
  const microFeedbackEnabled = process.env.NEXT_PUBLIC_ENABLE_MICRO_FEEDBACK === 'true';

  const {
    shouldShow: showMicroFeedback,
    sessionDuration: microSessionDuration,
    currentBook,
    currentLevel,
    handleClose: closeMicroFeedback,
    handleSubmit: submitMicroFeedback,
    handleDismiss: dismissMicroFeedback,
  } = usePauseMomentSurvey({ enabled: microFeedbackEnabled });

  const handleMicroFeedbackSubmit = async (data: {
    npsScore?: number;
    sentiment?: 'negative' | 'neutral' | 'positive';
    feedbackText?: string;
    email?: string;
  }) => {
    try {
      await fetch('/api/feedback/micro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pause_moment',
          ...data,
          sessionDuration: microSessionDuration,
          lastBookId: currentBook?.id,
          lastLevel: currentLevel,
        }),
      });

      // Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'micro_feedback_submitted', {
          nps_score: data.npsScore,
          sentiment: data.sentiment,
          has_text: !!data.feedbackText,
          has_email: !!data.email,
          session_duration: microSessionDuration,
        });
      }

      submitMicroFeedback();
    } catch (error) {
      console.error('[MicroFeedback] Submit failed:', error);
    }
  };

// In JSX return, add before closing div:

      {/* Micro-Feedback Survey */}
      <PauseMomentBanner
        isVisible={showMicroFeedback}
        sessionDuration={microSessionDuration}
        bookTitle={currentBook?.title}
        onSubmit={handleMicroFeedbackSubmit}
        onDismiss={dismissMicroFeedback}
        onClose={closeMicroFeedback}
      />
```

**Commit:** `git commit -m "feat(micro-feedback): Integrate survey into featured-books page"`

**Push to GitHub:** `git push origin feature/micro-feedback`

---

### Step 6: Testing & Feature Flag (Day 3, Afternoon)

**Goal:** Test locally, then deploy with feature flag

#### 6.1. Local Testing Checklist

**Test Scenarios:**

- [ ] Banner appears after 2-3 min of reading when user pauses
- [ ] NPS buttons work (1-10)
- [ ] Emoji buttons work (😞 😐 😊)
- [ ] Step 2 shows after selecting NPS or emoji
- [ ] Feedback text field (max 40 chars)
- [ ] Email field (optional)
- [ ] Submit button saves to database
- [ ] Dismiss button triggers 60-day cooldown
- [ ] Auto-dismiss after 30 seconds
- [ ] Doesn't show if full feedback submitted recently
- [ ] Doesn't show if micro-feedback already submitted
- [ ] Email notification arrives at bookbridgegap@gmail.com
- [ ] Geolocation captured (check database for city/region/country)
- [ ] Mobile responsive
- [ ] Neo-Classic theme works (light/dark/sepia)

#### 6.2. Feature Flag Setup

**Add to `.env.local`:**
```bash
NEXT_PUBLIC_ENABLE_MICRO_FEEDBACK=false  # Start disabled
```

**For Staging/Production:**
```bash
# Render Environment Variables
NEXT_PUBLIC_ENABLE_MICRO_FEEDBACK=true  # Enable for 10-20% rollout
```

#### 6.3. Gradual Rollout (Optional)

**Edit:** `/hooks/usePauseMomentSurvey.ts`

```typescript
// Add percentage-based rollout
const ROLLOUT_PERCENTAGE = 20; // 20% of users

useEffect(() => {
  if (!enabled) return;

  // Random rollout (10-20% of users)
  const userId = getUserId(); // Get from localStorage or session
  const hash = simpleHash(userId);
  const bucket = hash % 100;

  if (bucket >= ROLLOUT_PERCENTAGE) {
    return; // User not in rollout group
  }

  // Rest of trigger logic...
}, [enabled, /* other deps */]);

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
```

**Commit:** `git commit -m "feat(micro-feedback): Add testing checklist and feature flag"`

**Push to GitHub:** `git push origin feature/micro-feedback`

---

## 📊 Success Metrics & Monitoring

### Week 1-2 Metrics (Track Daily)

**Primary Metrics:**

1. **Trigger Rate:**
   - How many users see the banner?
   - Target: 30-40% of active users (2-3 min engagement threshold)

2. **Response Rate:**
   - How many users submit feedback?
   - Target: 15-25% of those who see banner (GPT-5 realistic estimate)

3. **Dismissal Rate:**
   - How many users dismiss without responding?
   - Alert threshold: >60% = too annoying, disable feature

4. **Auto-Dismiss Rate:**
   - How many banners auto-dismiss after 30 seconds?
   - High rate = users not noticing, adjust visibility

5. **NPS Distribution:**
   - Promoters (9-10): Target >30%
   - Passives (7-8): Target <50%
   - Detractors (1-6): Target <20%

6. **Email Capture Rate:**
   - How many provide email?
   - Target: 40-50% (incentivized by book recommendations)

7. **City Distribution:**
   - Confirm: Los Angeles is top city
   - Discover: Other high-usage cities

**Analytics Events to Track:**

```typescript
// Google Analytics 4 events
gtag('event', 'micro_feedback_triggered', { session_duration, trigger_type });
gtag('event', 'micro_feedback_submitted', { nps_score, sentiment, has_text, has_email });
gtag('event', 'micro_feedback_dismissed', { session_duration, trigger_type });
gtag('event', 'micro_feedback_autodismissed', { session_duration, trigger_type });
```

---

### Go/No-Go Decision (After Week 2)

**Keep Feature If:**
✅ Response rate ≥15%
✅ Dismissal rate <60%
✅ Email capture ≥40%
✅ City data captured successfully
✅ No user complaints about annoyance

**Disable Feature If:**
❌ Response rate <10%
❌ Dismissal rate >70%
❌ Multiple user complaints
❌ Geolocation fails consistently

**Iterate If:**
⚠️ Response rate 10-15% (marginal) - try different copy
⚠️ Dismissal rate 60-70% - adjust timing or frequency
⚠️ Low email capture - test different incentive

---

## 🔄 Rollback Plan

**If users complain or metrics fail:**

1. **Immediate:** Set `NEXT_PUBLIC_ENABLE_MICRO_FEEDBACK=false` on Render
2. **Deploy:** Redeploy to disable feature (no code changes needed)
3. **Communicate:** Email apology to affected users
4. **Analyze:** Review what went wrong (timing? frequency? copy?)
5. **Alternative:** Focus on email outreach to existing 20 feedback submitters

---

## 🎯 Summary

**What We're Building:**
- Lightweight pause-moment micro-survey (2-3 min trigger)
- 1 tap (NPS or emoji) + optional text/email
- Server-side geolocation (no dropdown friction)
- Strict cooldowns (60 days, mutual exclusion)
- Hook-based architecture (keeps complexity OUT of featured-books page)

**Why It's Safe:**
- Feature flag rollout (10-20% first)
- Follows Phase 1-4 architecture patterns
- Independent from main feedback system
- GPT-5 validated approach

**Timeline:** 3 days, 6 commits

---

## ⚠️ DEBUGGING: Survey Not Triggering (Nov 13, 2025)

### Issue Status

**Implementation:** ✅ Complete (all 6 steps committed and pushed)
**Testing:** ❌ Not working - survey doesn't appear when expected

### Problem Description

Survey does not appear when user pauses audio after the specified duration (tested with both 2-3 min and 10-60 sec windows).

**Expected Flow:**
1. User navigates to `/featured-books`
2. Selects and plays a book
3. Audio plays for 10+ seconds (testing mode)
4. User clicks pause button
5. Survey banner should slide up from bottom

**Actual Behavior:**
- No survey appears
- No errors in browser console
- No network requests to `/api/feedback/micro`

### Debugging Checklist

**Confirmed Working:**
- ✅ Feature flag enabled: `NEXT_PUBLIC_ENABLE_MICRO_FEEDBACK=true` in `.env.local`
- ✅ No cooldown blocking: `localStorage.getItem('micro_feedback_last_shown')` returns `null`
- ✅ Timing lowered to 10 seconds minimum for testing (line 752 in featured-books/page.tsx)
- ✅ Build successful (npm run build passes)
- ✅ All files created and integrated correctly

**Unknown:**
- ⚠️ Dev server restart status after enabling feature flag
- ⚠️ Whether `microFeedbackEnabled` evaluates to `true` at runtime
- ⚠️ Whether `checkTriggerConditions()` is being called from useEffect
- ⚠️ Whether `isPlaying` state transitions are being detected
- ⚠️ Whether hook's internal state is updating correctly

### Root Cause Hypotheses

**1. Environment Variable Not Loaded (Most Likely)**
- Dev server not restarted after `.env.local` change
- Next.js caches environment variables at server startup
- Solution: Kill and restart `npm run dev`

**2. Pause Detection Logic Issue**
- Hook detects transition from `isPlaying: true → false`
- If audio never truly started playing, transition won't trigger
- Solution: Add console.logs to verify `isPlaying` state changes

**3. Timing Calculation Issue**
- Session timer starts when page loads, not when audio starts
- If user loads page and immediately plays, session duration might not meet minimum
- Solution: Verify timer logic in `usePauseMomentSurvey.ts:127`

**4. useEffect Dependency Issue**
- `checkTriggerConditions` function might not be in dependency array
- React might not be calling the effect when `isPlaying` changes
- Solution: Check useEffect dependencies at line 1358-1370 in featured-books/page.tsx

**5. Hook Not Initializing**
- `microFeedbackEnabled` might be evaluating to false despite flag being true
- Process.env might not be exposing `NEXT_PUBLIC_*` variables correctly
- Solution: Add console.log to verify flag value at runtime

### Recommended Debugging Steps (In Order)

**Step 1: Verify Environment Variable**
```tsx
// Add to featured-books/page.tsx line 749
console.log('[MicroFeedback] Flag status:', {
  env: process.env.NEXT_PUBLIC_ENABLE_MICRO_FEEDBACK,
  enabled: microFeedbackEnabled,
});
```

**Step 2: Verify Hook Initialization**
```tsx
// Add to usePauseMomentSurvey.ts after line 74
console.log('[usePauseMomentSurvey] Hook initialized:', {
  enabled,
  shouldShow,
  minDuration: minSessionDuration,
  maxDuration: maxSessionDuration,
});
```

**Step 3: Verify Trigger Function Called**
```tsx
// Add to checkTriggerConditions() at line 121 in usePauseMomentSurvey.ts
console.log('[usePauseMomentSurvey] checkTriggerConditions called:', {
  isPlaying,
  duration,
  wasPlaying: lastPlayStateRef.current,
  shouldShow,
  hasInteracted: hasInteractedRef.current,
});
```

**Step 4: Verify Pause Detection**
```tsx
// Add to checkTriggerConditions() at line 134
console.log('[usePauseMomentSurvey] Pause detected?', {
  wasPlaying,
  nowPaused,
  transition: wasPlaying && nowPaused,
});
```

**Step 5: Use React DevTools**
- Open React DevTools in browser
- Find `FeaturedBooksPage` component
- Inspect `microFeedback` hook state
- Watch `shouldShow` value as you play/pause

### Quick Fix to Test

If debugging shows hook isn't triggering, try **manual trigger** for testing:

```tsx
// Add button to featured-books page (temporary)
<button onClick={() => {
  microFeedback.checkTriggerConditions(false, selectedBook, cefrLevel);
}}>
  [DEBUG] Trigger Survey
</button>
```

This bypasses timing logic to test if UI/API flow works.

### Files to Check

1. `/app/featured-books/page.tsx:749-755` - Hook initialization
2. `/app/featured-books/page.tsx:1358-1370` - useEffect trigger
3. `/hooks/usePauseMomentSurvey.ts:121-163` - checkTriggerConditions logic
4. `.env.local:79` - Feature flag value
5. Browser console - Runtime logs
6. Browser DevTools → Application → Local Storage - Cooldown check

### Success Criteria

Survey will be working when:
1. Console shows `[usePauseMomentSurvey] ✅ Trigger conditions met`
2. Survey banner slides up from bottom after pause
3. Browser localStorage sets `micro_feedback_last_shown` timestamp
4. Submission creates row in `micro_feedback` table
5. Email notification received at bookbridgegap@gmail.com

### Next Steps After Fix

Once trigger logic is fixed:
1. Test full flow (submission + dismissal)
2. Verify email notifications
3. Check database records in Supabase
4. Restore timing to 2-3 minutes (production values)
5. Test on mobile devices
6. Merge to main branch

---

**Status:** Implementation complete, debugging in progress
**Last Updated:** November 13, 2025
**Assigned To:** User (continuing after AI session)

**Next Step:** Get approval, create branch `feature/micro-feedback`, start Step 1 (database + service layer)
