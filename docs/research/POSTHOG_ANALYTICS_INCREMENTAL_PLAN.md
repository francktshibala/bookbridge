# POSTHOG Analytics Incremental Plan

## 🧭 Overview
Each increment delivers shippable value within 2-3 days, enabling rapid feedback while steadily layering the full PostHog analytics stack. Increments assume one full-stack engineer plus part-time product analyst support. All work happens behind a feature flag (`PH_ANALYTICS_ENABLED`) until acceptance.

---

### Increment 1: Analytics Foundation (Days 1-2)
- **Goals**: Install SDKs, wire `PostHogProvider`, verify environment configuration.
- **Deliverables**:
  - `posthog-js` + `@posthog/nextjs` installed, `PostHogProvider` mounted in `app/layout.tsx`.
  - `.env.local` populated with PostHog keys (placeholder values in 1Password).
  - Feature flag toggles analytics per environment.
- **Ship**: Provider deployed with `$pageview` capture limited to internal testers.
- **Test**: Validate initialization in DevTools, confirm no SSR warnings, ensure bundle delta <50KB.
- **Definition of Done**:
  - [ ] Provider present on every route.
  - [ ] QA checklist signed (Agent 1 recommendations).
  - [ ] Monitoring alert for init failures (Sentry log).
  - [ ] Documentation updated (`docs/analytics/setup.md`).

### Increment 2: Identity + Gate 1 Events (Days 3-4)
- **Goals**: Tie Supabase auth to PostHog identity and cover signup funnel events.
- **Deliverables**:
  - Updated `AuthProvider` with `posthog.identify` and `posthog.reset`.
  - Event helpers: `trackSignupStarted`, `trackUserSignedUp`, `trackEmailVerified`, `trackSignupAbandoned`.
  - Conversion Funnel dashboard (Gate 1→2 placeholder) created.
- **Ship**: Gate 1 events live for all users, dashboard shared with product.
- **Test**: Simulate signup/abandon flows, confirm events appear within PostHog in <1 min, verify property schema matches taxonomy doc.
- **Definition of Done**:
  - [ ] Distinct IDs map 1:1 with Supabase user IDs.
  - [ ] GA dual-tracking active for parity.
  - [ ] Dashboard widget shows data from at least 5 test signups.
  - [ ] Privacy policy draft updated to mention analytics.

### Increment 3: Gate 2 Activation Telemetry (Days 5-6)
- **Goals**: Capture first-use behaviors (book browse/open, onboarding completion).
- **Deliverables**:
  - Events: `first_book_opened`, `first_chapter_started`, `onboarding_completed`, `book_browsed`, `reading_level_selected`.
  - `time_since_signup` computed client-side and sent with relevant events.
  - Automated QA script that replays activation flow and asserts events via PostHog API.
- **Ship**: Activation metrics visible in Funnel dashboard (Signup→First Use).
- **Test**: Run QA script, ensure median `time_since_signup` populates; break down funnel by `signup_source` to confirm property ingestion.
- **Definition of Done**:
  - [ ] ≥90% of signups emit at least one Gate 2 event within 24h.
  - [ ] Funnel step 2 accuracy validated against Supabase query.
  - [ ] Docs updated with owner for each Gate 2 event.
  - [ ] Feature flag allows quick disable if regressions detected.

### Increment 4: Gate 3 Feature & Wow Moment Tracking (Days 7-8)
- **Goals**: Instrument AI/reading features and define the wow moment cohort.
- **Deliverables**:
  - Events: `chapter_completed`, `text_simplified`, `audio_played`, `audio_completed`, `ai_tutor_opened`, `ai_tutor_question_asked`, `dictionary_used`, `bookmark_added`.
  - Derived cohort in PostHog representing wow moment (chapter complete + feature combo).
  - 10% sampled session replays enabled with masking for qualitative review.
- **Ship**: Feature adoption metrics available; wow-moment cohort accessible to stakeholders.
- **Test**: Watch 5 masked session replays, confirm selectors hide sensitive data; verify derived cohort membership matches manual calculations.
- **Definition of Done**:
  - [ ] Feature usage broken down by CEFR level in Feature Adoption dashboard.
  - [ ] Session replay sampling script documented.
  - [ ] Less than 1% of events missing `book_id`.
  - [ ] Engineering + product sign off on wow cohort definition.

### Increment 5: Gate 4 Retention & Engagement (Days 9-10)
- **Goals**: Track retention events and surface WAU/MAU plus D2/D7/D30 dashboards.
- **Deliverables**:
  - Events: `session_started`, `daily_return`, `weekly_return`, `book_continued`, `book_finished`, `subscription_upgraded`.
  - Retention & Engagement dashboard (cohort table, WAU/MAU ratio, at-risk list).
  - Basic engagement score calculation (client-side) stored as user property.
- **Ship**: Retention dashboard available to leadership; automated alert when D7 retention <25%.
- **Test**: Create synthetic cohort to ensure retention table accuracy; confirm WAU/MAU ratio matches Supabase query within ±5%.
- **Definition of Done**:
  - [ ] Day 2 and Day 7 retention widgets populated with live data.
  - [ ] At-risk cohort exported to CSV for lifecycle marketing.
  - [ ] Engagement score present on ≥95% of active users.
  - [ ] Alerting wired via PostHog Slack integration.

### Increment 6: Surveys & Feedback Loop (Days 11-12)
- **Goals**: Launch contextual PostHog Surveys with BookBridge branding.
- **Deliverables**:
  - Four surveys configured (post-chapter, feature discovery, weekly active, churn return) with targeting rules.
  - Custom CSS applied for emoji buttons, mobile bottom sheet, accessibility states.
  - Survey response ingestion added to Feedback Summary dashboard.
- **Ship**: Surveys enabled for 20% traffic via feature flag; qualitative responses start flowing.
- **Test**: Trigger each survey manually using PostHog preview mode; verify response metadata includes `book_id` or `feature_name` when relevant.
- **Definition of Done**:
  - [ ] Response rate ≥30% in internal pilot.
  - [ ] Cooldown windows (30/60 days) verified.
  - [ ] Survey data linked to user profiles for follow-up.
  - [ ] Legal review acknowledges new feedback collection.

### Increment 7: Automation & Engagement Scoring (Days 13-14)
- **Goals**: Operationalize analytics output and deepen insight quality.
- **Deliverables**:
  - Scheduled weekly PDF/email digest combining key dashboard widgets.
  - Nightly Supabase edge function to recompute engagement score + segment and push to PostHog via API.
  - Correlation analysis saved as report for funnel optimization.
- **Ship**: Stakeholders receive automated reports; engagement segments power lifecycle campaigns.
- **Test**: Run edge function dry-run, validate API throughput limits; confirm digest email renders on mobile.
- **Definition of Done**:
  - [ ] Engagement segments (power, engaged, casual, at-risk, churned) visible as PostHog cohorts.
  - [ ] Digest cadence documented with escalation path if delivery fails.
  - [ ] Correlation insights produce at least 3 backlog tickets.
  - [ ] Data warehouse (if any) notes for future expansion captured.

### Increment 8: Proxy, Optimization & GA Sunset (Days 15-16)
- **Goals**: Harden infrastructure, improve data completeness, and deprecate redundant tracking.
- **Deliverables**:
  - Reverse proxy route `/api/posthog/[...path]` deployed with auth headers.
  - Performance snapshot proving <50ms overhead and 20-30% uplift in tracked users with ad blockers.
  - GA dual-tracking disabled (or reduced) once PostHog parity confirmed.
- **Ship**: Full analytics stack live for 100% of users, GA only retained for marketing as needed.
- **Test**: Load-test proxy under 10 RPS, confirm retries/backoff; compare GA vs PostHog totals over 3-day window before shutdown.
- **Definition of Done**:
  - [ ] Proxy health monitored (Fastly/Next logs).
  - [ ] Analytics runbook updated with rollback steps.
  - [ ] Stakeholders sign off on GA sunset decision.
  - [ ] Retrospective scheduled to capture learnings.

---

## 📌 Governance & Review Cadence
- **Daily**: Engineer posts increment status + blockers in #analytics Slack.
- **Twice Weekly**: 15-min sync with product analyst to review dashboards.
- **Weekly**: Ship → Measure → Learn review using funnel + survey data, adjust upcoming increments if KPIs lag.
- **Exit Criteria**: All increments “completed”, success metrics on track, and optimization backlog prioritized from new insights.

