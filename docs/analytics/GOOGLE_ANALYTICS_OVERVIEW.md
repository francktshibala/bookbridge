# Google Analytics Implementation & User Data Overview

**Purpose:** Track user behavior, engagement patterns, and geographic reach to improve BookBridge and gather feedback from early adopters

**Implementation Date:** October 2025
**Analytics Platform:** Google Analytics 4 (GA4)
**Tracking ID:** G-R209NKPNVN

---

## 📊 Implementation Overview

### What We Track

**Core Metrics:**
- Active users (daily, weekly, monthly)
- New vs returning users
- Session duration and engagement time
- Event count (clicks, scrolls, interactions)
- Engagement rate (% of users actively using features)
- Geographic location (city-level)
- Traffic sources (how users find us)
- Page views and navigation patterns

**Code Location:**
- **Analytics Script:** `/app/layout.tsx:75-86` (Google Analytics gtag.js)
- **Analytics Service:** `/lib/services/analytics-service.ts` (Pure function tracking with feature flags)
- **Tracking ID:** G-R209NKPNVN
- **Configuration:** Automatic page view tracking, event tracking
- **Feature Flag:** `NEXT_PUBLIC_ENABLE_ANALYTICS=true` (enabled in production)

**Implementation:**
```typescript
// Google Analytics (app/layout.tsx)
<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-R209NKPNVN"
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-R209NKPNVN');
  `}
</Script>
```

**Advanced Analytics (Phase 5 - January 2025):**
- **13 custom events** tracking CEFR progression, dictionary usage, AI tutor engagement, performance metrics
- **Pure function pattern:** No state, no side effects (follows Phase 4 service layer architecture)
- **DRY helper:** `withCommon()` for timestamp, session ID, context enrichment
- **Documentation:** See `/docs/implementation/ARCHITECTURE_OVERVIEW.md:2007-2234` for detailed implementation

**Cross-Reference:**
For technical implementation details and analytics service architecture, see:
- **Architecture Overview:** `/docs/implementation/ARCHITECTURE_OVERVIEW.md` (Phase 5: Usage Analytics, lines 2007-2234)
- **Analytics Implementation Plan:** `/docs/implementation/USAGE_ANALYTICS_IMPLEMENTATION_PLAN.md` (GPT-5 validated, 11 feature categories)
- **Analytics Service Code:** `/lib/services/analytics-service.ts` (Pure functions, 224 lines)

---

## 📈 Historical Data (October 31, 2025)

### Morning Report (Oct 1-30, 2025)
**Date Range:** October 1-30, 2025
**Status:** Early pilot phase, minimal traffic

| Metric | Value | Notes |
|--------|-------|-------|
| **Active Users** | 5 | All new users |
| **New Users** | 5 | 100% first-time visitors |
| **Event Count** | 351 | Good interaction rate |
| **Avg Engagement Time** | 2m 35s | Strong engagement per user |
| **Engagement Rate** | N/A | (Not measured in morning report) |
| **Total Sessions** | 5 | Each user visited once |

**Geographic Distribution (Morning):**
1. **Riverton** - 1 user (USA - likely Riverton, Utah or Wyoming)
2. **Warsaw** - 1 user (Poland - international ESL learner!)
3. **3 Unknown Cities** - 3 users (location not identified)

**Traffic Sources (Morning):**
- **Direct traffic:** 5 users (typed URL or bookmark)
- **AI/Siri search:** 1 user (organic discovery via Siri)

**Top Page (Morning):**
- Homepage: 30 views, 333 events, **20% bounce rate** (80% explored beyond landing!)

---

### Evening Report (Oct 4-31, 2025)
**Date Range:** October 4-31, 2025 (Last 28 days)
**Status:** Growth accelerating - 5x increase!

| Metric | Value | Change vs Morning | Notes |
|--------|-------|-------------------|-------|
| **Active Users** | 25 | **+20 (5x)** 🚀 | Massive growth in one day |
| **New Users** | 25 | **+20 (5x)** | All first-time visitors |
| **Event Count** | 570 | **+219 (+62%)** | Users actively exploring |
| **Avg Engagement Time** | 1m 05s | **-1m 30s** | More users, varied engagement |
| **Engagement Rate** | 43.33% | **N/A** | Strong - above 40% is excellent |
| **Engaged Sessions** | 13 | **+8** | Users actively using features |
| **Sessions per Active User** | 0.52 | **N/A** | Most users = single visit so far |

**Geographic Distribution (Evening - 15+ Cities):**

| # | City | Active Users | New Users | Engaged Sessions | Engagement Rate | Avg Time | Event Count | % of Total Events |
|---|------|-------------|-----------|------------------|-----------------|----------|-------------|-------------------|
| 1 | **(not set)** | 3 (12%) | 3 | 0 | 0% | 0s | 18 | 3.16% |
| 2 | **San Jose, CA** (USA) | 3 (12%) | 3 | 2 | 66.67% | 22s | 24 | 4.21% |
| 3 | **Sandy** (USA - likely Utah) | 3 (12%) | 3 | 5 | **100%** | **7m 38s** ⭐ | 363 | **63.68%** |
| 4 | **Warsaw** (Poland) 🇵🇱 | 3 (12%) | 3 | 0 | 0% | 0s | 15 | 2.63% |
| 5 | **London** (UK) 🇬🇧 | 2 (8%) | 2 | 0 | 0% | 0s | 12 | 2.11% |
| 6 | **Murray** (USA - likely Utah) | 2 (8%) | 2 | 1 | 33.33% | 44s | 23 | 4.04% |
| 7 | **Clinton** (USA) | 1 (4%) | 1 | 1 | **100%** | 39s | 7 | 1.23% |
| 8 | **Denver, CO** (USA) | 1 (4%) | 1 | 1 | **100%** | 0s | 14 | 2.46% |
| 9 | **Frankfurt am Main** (Germany) 🇩🇪 | 1 (4%) | 1 | 0 | 0% | 0s | 6 | 1.05% |
| 10 | **Kinshasa** (Congo) 🇨🇩 | 1 (4%) | 1 | 0 | 0% | 4s | 12 | 2.11% |
| 11 | **Loveland, CO** (USA) | 1 (4%) | 1 | 1 | **100%** | 48s | 17 | 2.98% |
| 12 | **Philadelphia, PA** (USA) | 1 (4%) | 1 | 1 | **100%** | 20s | 7 | 1.23% |
| 13 | **Riverton** (USA) | 1 (4%) | 1 | 1 | **100%** | 0s | 38 | 6.67% |
| 14 | **San Diego, CA** (USA) | 1 (4%) | 1 | 0 | 0% | 0s | 8 | 1.4% |
| 15 | **Strasbourg** (France) 🇫🇷 | 1 (4%) | 1 | 0 | 0% | 0s | 6 | 1.05% |

**Geographic Insights:**
- **USA Dominance:** 18 users (72%) from USA - mostly Western states (Utah, Colorado, California)
- **International Reach:** 7 users (28%) from 5 countries (Poland, UK, Germany, France, Congo)
- **ESL Market Validation:** Users from Poland, Congo, and non-English countries = target audience!
- **Top Engaged City:** Sandy, Utah (7m 38s, 363 events, 100% engagement) - potential super user!

---

## 🎯 Key Findings & Insights

### Growth Patterns

**5x User Growth (Oct 1-31):**
- Oct 1-30: 5 users
- Oct 31 alone: 25 users
- **Daily growth rate:** 400% increase
- **Viral discovery:** No paid ads, organic traffic only

**Engagement Quality:**
- **43.33% engagement rate** - Strong (industry average: 20-30%)
- **80% explore beyond landing** (20% bounce rate) - Excellent retention
- **1m 05s average time** - Good for first-time visitors exploring features

**Geographic Validation:**
- **International users** (28%) prove ESL market demand
- **USA users** (72%) could be educators, ESL teachers, or English learners
- **5 countries represented** in single day - product-market fit signal

### Super User Identification

**Sandy, Utah User:**
- **7m 38s engagement** (7x average!)
- **363 events** (64% of all events!)
- **100% engagement rate**
- **Potential:** Early adopter, power user, or educator testing for students
- **Action:** Track this user for future feedback/beta testing

**High Engagement Cities:**
- Sandy, UT: 7m 38s
- Loveland, CO: 48s
- Murray, UT: 44s
- Clinton: 39s

**Action Items:**
- Add user surveys for engaged users (>1 min session)
- Reach out to Sandy, UT user for feedback interview
- Track returning users from these cities

---

## 🌍 Traffic Source Analysis

**Current Sources (Oct 31):**
- **Direct traffic:** Majority (typed URL, bookmarks)
- **AI/Siri search:** 1 user (organic discovery)
- **Unknown sources:** Need to implement UTM tracking

**Missing Data:**
- No referral traffic yet (no shares from social media, blogs, etc.)
- No search engine traffic (Google, Bing)
- No paid ad traffic (expected - pilot phase)

**Recommendations:**
- Add UTM parameters to Donna's Facebook post links
- Track which marketing channels drive engaged users
- Monitor organic search performance

---

## 📋 User Behavior Patterns

### Session Patterns

**Quick Visitors (0s engagement):**
- **8 users** (32%) - 0s engagement time
- **Behavior:** Landed, looked, left immediately
- **Possible Reasons:** Wrong audience, mobile load issues, unclear value proposition
- **Action:** A/B test hero section, add clearer CTA

**Explorers (1-60s):**
- **12 users** (48%) - Short exploration
- **Behavior:** Checked 1-2 features, clicked around
- **Possible Reasons:** Testing features, comparing to competitors
- **Action:** Add onboarding tour, highlight key features

**Power Users (>1m):**
- **5 users** (20%) - Deep engagement
- **Behavior:** Reading books, using AI chat, exploring library
- **Signal:** These are your target users!
- **Action:** Survey these users, offer beta tester program

### Event Distribution

**High Event Cities (Engaged Users):**
1. **Sandy, UT:** 363 events (63.68%) - SUPER USER
2. **Riverton:** 38 events (6.67%)
3. **San Jose:** 24 events (4.21%)
4. **Murray, UT:** 23 events (4.04%)

**What Events Mean:**
- **<10 events:** Browsed homepage
- **10-50 events:** Explored 2-3 pages, clicked features
- **50+ events:** Deep usage (reading books, AI chat, navigation)
- **300+ events:** Power user (Sandy, UT - reading full books!)

---

## 🎓 Target Audience Validation

### ESL Learner Signals

**International Users (28%):**
- **Poland (Warsaw):** 3 users - Strong ESL market in Eastern Europe
- **Congo (Kinshasa):** 1 user - Francophone Africa ESL learner
- **Germany (Frankfurt):** 1 user - European ESL student
- **France (Strasbourg):** 1 user - French ESL learner
- **UK (London):** 2 users - Could be ESL teachers or immigrants

**USA Users (72%):**
- **Potential Profiles:**
  - ESL teachers testing for students (Utah has large ESL programs)
  - Immigrants improving English
  - Students preparing for TOEFL/IELTS
  - Educators evaluating for school adoption

### Geographic Market Insights

**Utah Concentration (6 users, 24%):**
- Sandy: 3 users (super engaged)
- Murray: 2 users
- Riverton: 1 user
- **Why Utah?** Large ESL/refugee programs, educator networks
- **Action:** Target Utah school districts for B2B partnerships

**International Markets:**
- **Poland:** Proven ESL demand (3 users)
- **Africa (Congo):** Underserved market, high mobile usage
- **Europe (Germany, France, UK):** Competitive ESL markets

---

## 🔍 Recommendations for User Feedback

### Immediate Actions (Next 7 Days)

1. **Reach Out to Super User (Sandy, UT):**
   - Send in-app message or email survey
   - Offer beta tester role / early access benefits
   - Ask: "What features did you use?" "What would you improve?"

2. **Track Returning Users:**
   - Monitor if any of the 25 come back within 7 days
   - Returning users = product stickiness validation
   - If <20% return, investigate retention issues

3. **Implement Exit Surveys:**
   - Pop-up for users leaving after <10s: "Why are you leaving?"
   - Options: Too complex, Not what I expected, Just browsing, etc.

4. **Add Feature Usage Tracking:**
   - Track which features are used (AI chat, dictionary, audio playback)
   - Identify most popular vs. ignored features
   - Prioritize improvements based on data

### Medium-Term (Next 30 Days)

1. **User Interviews (Engaged Users):**
   - Target: Users with >1 min engagement
   - Questions:
     - What brought you to BookBridge?
     - What features did you try?
     - What would make you come back?
     - Would you pay $5.99/month? Why or why not?

2. **Geographic Expansion:**
   - Share with Polish ESL communities (3 users = signal of demand)
   - Target Utah educators (6 users = localized traction)
   - Test messaging in Congo/Africa (1 user = early signal)

3. **Retention Analysis:**
   - Track weekly active users (WAU)
   - Measure 7-day retention rate
   - Goal: >20% of new users return within 7 days

4. **Traffic Source Optimization:**
   - Add UTM tracking to all marketing links
   - Test which channels drive engaged users
   - Double down on highest-engagement sources

---

## 📊 Success Metrics to Monitor

### Daily Metrics
- **Active users** (target: +10% week-over-week)
- **Engagement rate** (maintain >40%)
- **Average engagement time** (target: >1 min)

### Weekly Metrics
- **Returning users** (target: >20% of new users return)
- **Geographic diversity** (target: 10+ countries by end of month)
- **Feature usage** (track AI chat, dictionary, audio playback adoption)

### Monthly Metrics
- **Total active users** (target: 100 users by end of pilot)
- **Engagement rate trend** (maintain or increase)
- **Traffic source breakdown** (diversify beyond direct traffic)
- **User feedback collected** (target: 20+ survey responses)

---

## 📝 Feedback Collection Implementation Plan

**Status:** PLANNED - Not yet implemented
**Priority:** HIGH - Critical for pilot phase validation
**Target:** Collect contact info from engaged users for feedback interviews

---

### Method 1: "Leave Feedback" Navigation Tab

**What:** Add a new navigation link in the header alongside Home, Enhanced Books, etc.

**Design:**
- **Label:** "Leave Feedback" or "Share Feedback"
- **Location:** Navigation bar (desktop + mobile hamburger menu)
- **Styling:** Standard nav link (not premium-styled like "Support Us")
- **Icon:** 💬 or ✍️ (optional, for visual distinction)

**Destination Page:** `/feedback`

**Page Contents:**
```
Title: "Help Shape BookBridge"
Subtitle: "Your feedback helps us build the best ESL learning experience"

Form Fields:
1. Name (optional)
2. Email (required) - "We'll follow up with you directly"
3. How did you find BookBridge? (dropdown)
   - Google Search
   - Social Media (Facebook, Twitter, etc.)
   - Friend/Colleague
   - ESL Teacher
   - Other
4. What brought you to BookBridge? (multiple choice)
   - Learning English
   - Teaching ESL
   - Preparing for TOEFL/IELTS
   - Reading classic literature
   - Other
5. What features did you try? (checkboxes)
   - Audio-text synchronization
   - CEFR level switching
   - AI dictionary
   - AI chat tutor
   - Reading position memory
6. What would you improve? (text area)
7. Would you recommend BookBridge to others? (1-10 scale)
8. May we contact you for a 15-min feedback interview? (Yes/No)

CTA Button: "Submit Feedback"
Thank You Message: "Thanks! We'll reach out within 3 days if you opted in for an interview."
```

**Technical Implementation:**
- **Component:** `/app/feedback/page.tsx` (create new)
- **API Route:** `/app/api/feedback/route.ts` (save to database + send email notification)
- **Database:** Create `Feedback` table (Prisma schema)
- **Email:** Send to admin email when new feedback submitted
- **Analytics:** Track `feedback_submitted` event with GA4

**Database Schema:**
```typescript
model Feedback {
  id            String   @id @default(cuid())
  name          String?
  email         String
  source        String   // How they found us
  purpose       String[] // Why they came
  featuresUsed  String[] // Which features tried
  improvement   String   // What to improve
  npsScore      Int      // 1-10 recommendation score
  wantsInterview Boolean @default(false)
  createdAt     DateTime @default(now())
  userId        String?  // If logged in
}
```

**Benefits:**
- Always available (not intrusive)
- Captures users actively seeking to give feedback
- Structured data for analysis
- Email capture for follow-up

**Drawbacks:**
- Only captures highly motivated users
- Most users won't click (low conversion)
- Requires navigation away from main experience

---

### Method 2: In-App Feedback Banner (Engaged Users)

**What:** Non-intrusive banner that appears after 1+ minute of engagement

**Trigger Logic:**
```typescript
// Trigger conditions:
- User has been active for 60+ seconds
- User has NOT already submitted feedback (check localStorage)
- User has NOT dismissed banner in this session
- Only show once per 7 days (localStorage timestamp)
```

**Design:**
- **Location:** Bottom-right corner (mobile) or top banner (desktop)
- **Style:** Subtle, non-blocking (not a modal popup)
- **Animation:** Slide in after 60 seconds
- **Dismissible:** X button to close (stores in localStorage)

**Banner Content:**
```
Icon: ⭐
Title: "Enjoying BookBridge?"
Message: "Help us improve! Share quick feedback (2 min)"
CTA: [Share Feedback] button → Opens modal or redirects to /feedback
Secondary: [Maybe Later] button → Dismisses for 7 days
```

**Modal Form (If Inline):**
```
Quick Feedback Form (embedded in modal):
1. Email (required) - "For follow-up only"
2. What do you like? (text area, 100 char limit)
3. What would you improve? (text area, 100 char limit)
4. May we contact you for a 15-min interview? (Yes/No)

CTA: [Submit] → Saves to database
Thank You: "Thanks! We'll reach out if you opted in."
```

**Technical Implementation:**
- **Component:** `/components/FeedbackBanner.tsx` (create new)
- **Hook:** `useFeedbackBanner()` - Tracks time, localStorage checks
- **Placement:** Add to `/app/layout.tsx` or page-specific layouts
- **Storage:** `localStorage.setItem('feedback-banner-dismissed', timestamp)`
- **API:** Reuse `/app/api/feedback/route.ts`
- **Analytics:** Track `feedback_banner_shown`, `feedback_banner_dismissed`, `feedback_banner_submitted`

**Display Logic:**
```typescript
// useFeedbackBanner.tsx
const [showBanner, setShowBanner] = useState(false);

useEffect(() => {
  const dismissed = localStorage.getItem('feedback-banner-dismissed');
  const lastShown = dismissed ? parseInt(dismissed) : 0;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  if (Date.now() - lastShown < sevenDays) return; // Don't show if dismissed <7 days ago

  const timer = setTimeout(() => {
    setShowBanner(true);
    // Track analytics
    gtag('event', 'feedback_banner_shown');
  }, 60000); // 60 seconds

  return () => clearTimeout(timer);
}, []);
```

**Benefits:**
- Captures engaged users (high-quality feedback)
- Minimal friction (appears when already invested)
- Non-intrusive (bottom corner, dismissible)
- Timing-based (only after engagement proof)

**Drawbacks:**
- May annoy some users if not well-timed
- Easy to dismiss without reading
- Requires careful UX to not feel spammy

---

### Combined Strategy: Feedback Tab + Banner

**Recommended Approach:**
1. **Implement "Leave Feedback" tab first** (Week 1)
   - Low-hanging fruit
   - Always available
   - Captures motivated users
   - No UX risk

2. **Add in-app banner later** (Week 2-3)
   - Test timing (30s vs 60s vs 2min)
   - A/B test messaging
   - Monitor dismissal rates
   - Only show to engaged users (1+ min session)

3. **Segment by Engagement:**
   - **Quick visitors (<30s):** No banner (let them leave)
   - **Explorers (30s-2min):** Show banner at end of session
   - **Engaged users (>2min):** Show banner mid-session OR on return visit
   - **Power users (>5min):** Prioritize for personal outreach (email directly)

---

### Success Metrics

**Target Collection Goals:**
- **Week 1:** 5+ feedback submissions from "Leave Feedback" tab
- **Week 2:** 10+ total submissions (tab + banner combined)
- **Week 4:** 20+ submissions, 5+ interview opt-ins

**Quality Metrics:**
- **Email collection rate:** >80% (required field)
- **Interview opt-in rate:** Target 25% (5 out of 20)
- **NPS score:** Track average recommendation score
- **Response rate:** >50% respond when contacted

**Analytics Events to Track:**
```typescript
// Page views
'page_view' → '/feedback'

// Banner interactions
'feedback_banner_shown' → Triggered after 60s
'feedback_banner_dismissed' → User clicked X
'feedback_banner_cta_clicked' → User clicked "Share Feedback"

// Form interactions
'feedback_form_started' → User began typing
'feedback_form_submitted' → Successful submission
'feedback_interview_optIn' → User said yes to interview

// Engagement context
Context data: session_duration, pages_viewed, features_used
```

---

### Implementation Timeline

**Week 1 (Nov 1-7):**
- [ ] Create `/app/feedback/page.tsx` (feedback form page)
- [ ] Create `/app/api/feedback/route.ts` (API endpoint)
- [ ] Add "Leave Feedback" link to navigation
- [ ] Create Prisma `Feedback` model, run migration
- [ ] Test form submission locally

**Week 2 (Nov 8-14):**
- [ ] Deploy feedback page to production
- [ ] Add email notification on new feedback (Resend/SendGrid)
- [ ] Monitor submissions (target: 5+)

**Week 3 (Nov 15-21):**
- [ ] Create `FeedbackBanner` component
- [ ] Implement timing logic (60s trigger)
- [ ] Test dismissal behavior
- [ ] A/B test banner messaging

**Week 4 (Nov 22-30):**
- [ ] Deploy banner to production
- [ ] Monitor banner analytics (show rate, dismiss rate, conversion)
- [ ] Conduct first round of feedback interviews (5+ users)

---

### Future Enhancements

1. **NPS Survey Integration:**
   - Add Net Promoter Score tracking
   - "How likely are you to recommend BookBridge?" (0-10)
   - Segment detractors (0-6), passives (7-8), promoters (9-10)

2. **Feature-Specific Feedback:**
   - After using AI chat: "How was the AI tutor?"
   - After finishing book: "Rate this reading experience"
   - After switching levels: "Did this level work for you?"

3. **Exit Intent Survey:**
   - Detect when user closing tab
   - Quick 1-question survey: "What brought you here today?"
   - Email capture + dropdown

4. **Beta Tester Program Page:**
   - Dedicated `/beta` page
   - Benefits: Early access, vote on features, direct feedback line
   - Application form with deeper questions
   - Exclusive Slack/Discord community

---

## 🎯 Next Steps

### Week 1 (Nov 1-7, 2025)
- [ ] Contact Sandy, UT super user for feedback interview
- [ ] **Implement "Leave Feedback" navigation tab** (see Feedback Collection Plan above)
- [ ] Add feature usage event tracking (AI chat, dictionary, audio)
- [ ] Share analytics report with Donna for Facebook audience

### Week 2 (Nov 8-14, 2025)
- [ ] Analyze 7-day retention rate (how many of 25 users returned?)
- [ ] **Deploy feedback page to production** (see Feedback Collection Plan)
- [ ] Add UTM tracking to all external links
- [ ] Target Polish ESL communities (3 users = demand signal)

### Week 3 (Nov 15-21, 2025)
- [ ] **Implement in-app feedback banner** (see Feedback Collection Plan)
- [ ] Conduct 5+ user interviews (engaged users from feedback submissions)
- [ ] Compile feedback themes (feature requests, pain points)
- [ ] Test Utah educator outreach (6 users = localized traction)

### Week 4 (Nov 22-30, 2025)
- [ ] Review monthly analytics (goal: 100+ users)
- [ ] Implement top 3 feature improvements from feedback
- [ ] Prepare for public launch (if >20% retention + positive feedback)

---

## 📝 Data Privacy & Compliance

**User Privacy:**
- Google Analytics anonymizes IP addresses
- No personally identifiable information (PII) collected
- Compliant with GDPR, CCPA
- Users can opt out via browser settings

**Data Usage:**
- Analytics data used ONLY for product improvement
- No selling of user data
- No third-party marketing use
- Transparent privacy policy at `/privacy`

---

## 🔗 Related Documentation

- **Competitive Analysis:** `/docs/BOOKBRIDGE_COMPETITIVE_ADVANTAGE.md`
- **Architecture Overview:** `/docs/implementation/ARCHITECTURE_OVERVIEW.md`
- **Usage Analytics Plan:** `/docs/implementation/USAGE_ANALYTICS_IMPLEMENTATION_PLAN.md`
- **Billion Dollar Roadmap:** `/docs/BILLION_DOLLAR_ROADMAP.md`

---

## 📊 Analytics Dashboard Access

**Platform:** Google Analytics 4 (GA4)
**URL:** https://analytics.google.com/analytics/web/#/a373521284p511162648/reports/explorer
**Property:** BookBridge (G-R209NKPNVN)

**Key Reports:**
- **Reports Snapshot:** Overview of users, events, engagement
- **Demographic Details > City:** Geographic user distribution
- **User Attributes:** User behavior patterns
- **Events:** Feature usage tracking
- **Pages and Screens:** Most viewed pages

---

**Document Version:** 1.0
**Created:** November 1, 2025
**Last Updated:** November 1, 2025
**Next Review:** November 8, 2025 (weekly updates during pilot)

**Changelog:**
- v1.0 (Nov 1, 2025): Initial documentation with Oct 31 morning/evening data
