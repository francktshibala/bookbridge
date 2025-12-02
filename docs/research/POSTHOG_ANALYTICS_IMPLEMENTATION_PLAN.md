# POSTHOG Analytics Implementation Plan

## 📚 Executive Summary
BookBridge will adopt PostHog as the unified product analytics spine by combining Agent 1’s Next.js/Supabase-centric integration plan with Agent 2’s 4-gate product instrumentation strategy. The plan prioritizes a privacy-safe `PostHogProvider`, explicit event helpers for every conversion gate, contextual surveys, and five decision-ready dashboards. By sequencing work into one-week macro phases (and finer 2-3 day increments described in the incremental plan), the team can deliver measurable value every few days, validate funnel lift quickly, and scale toward 400 WAU with minimal engineering overhead.

## 🤝 Synthesis Highlights
| Theme | Alignment | Conflict / Gap | Resolution |
| --- | --- | --- | --- |
| SDK Integration | Both recommend PostHog Cloud with session replay | Product plan assumed auto pageview capture; technical plan disables it to avoid routing bugs | Use `@posthog/nextjs` provider with manual `$pageview` capture so events stay accurate in App Router |
| Event Taxonomy | Both focus on 4 conversion gates and ~30 core events | Agent 1 lacked full taxonomy; Agent 2 lacked code ownership mapping | Map every Gate event to concrete helper in `lib/analytics/posthog.ts` plus ownership table (below) |
| Identity & Properties | Both stress Supabase user data enrichment | Agent 2 enumerated more properties (CEFR, feature counts) than Agent 1’s examples | Extend `identify` payload + nightly backfill job so analytics mirrors product segments |
| Feedback Loop | Product plan mandates PostHog Surveys; technical plan hadn’t covered UX | Integrate surveys requires `opt_in_site_apps` and CSS overrides | Enable surveys inside provider, host CSS in `globals.css`, manage targeting via PostHog UI |
| Dashboards | Product plan defines 5 dashboards; technical plan called for “see Agent 2” | Need data freshness and ownership | Assign dashboard owners, automate refresh cadence, and gate advanced paths until data volume sufficient |

## 🧱 Final Recommended Architecture

### 1. Application Instrumentation
- Install `posthog-js` and `@posthog/nextjs`; create `PostHogProvider` client component loaded in `app/layout.tsx`.
- Initialize with `person_profiles: 'identified_only'`, `capture_pageview: false`, `session_recording.maskAllInputs = true`, `opt_in_site_apps: true` (required for surveys), and `api_host` pointed to `/api/posthog` once the reverse proxy ships.
- Add a lightweight analytics utility (`lib/analytics/posthog.ts`) that:
  - Wraps `posthog.capture` with schema validation.
  - Exposes typed helpers for every Gate event plus feature-level actions (dictionary, bookmarks, AI tutor, etc.).
  - Dual-logs to GA via `window.gtag` during migration.

### 2. Identity & User Properties
- Hook into `supabase.auth.onAuthStateChange` to call `posthog.identify` on `SIGNED_IN`, `posthog.reset()` on `SIGNED_OUT`.
- Capture core properties: `email`, `signup_date`, `signup_source`, `language_preference`, `native_language`, `cefr_level`, `books_read`, `chapters_completed`, `engagement_score`, `engagement_segment`.
- Schedule a nightly edge function to recalculate engagement scores from Supabase/PostHog exports and upsert via PostHog API to keep cohorts accurate.

### 3. Event Taxonomy & Gate Ownership
| Gate | Event Helpers (examples) | Owner | Notes |
| --- | --- | --- | --- |
| Gate 1 – Signup | `trackSignupStarted`, `trackUserSignedUp`, `trackEmailVerified`, `trackSignupAbandoned` | Growth eng | Fire on form load/submit; include `signup_method`, `signup_source`, `referral_code` |
| Gate 2 – First Use | `trackFirstBookOpened`, `trackFirstChapterStarted`, `trackOnboardingCompleted`, `trackReadingLevelSelected` | Core app eng | Include `time_since_signup`, `cefr_level`, `book_category` |
| Gate 3 – Wow Moment | `trackChapterCompleted`, `trackTextSimplified`, `trackAudioPlayed`, `trackAiTutorQuestion`, `trackDictionaryUsed`, `trackBookmarkAdded` | Learning experience eng | Derived `wow_moment` cohort = chapter_completed + (simplified OR audio) + ai tutor |
| Gate 4 – Retention | `trackSessionStarted`, `trackDailyReturn`, `trackWeeklyReturn`, `trackBookContinued`, `trackBookFinished`, `trackSubscriptionUpgraded` | Lifecycle team | Add computed props: `days_since_signup`, `days_since_last_session` |

### 4. Feedback & Surveys
- Enable PostHog Surveys for four contexts (post-chapter, feature discovery, weekly active, churn return) with triggers tied to the events above.
- Store custom CSS snippets locally and inject via PostHog UI to ensure visual alignment.
- Use feature flags to canary surveys to 20% of users before 100% rollout; monitor response rate >30%.

### 5. Dashboards & Analytics Operations
- Build five dashboards (Conversion Funnel, Feature Adoption, Retention & Engagement, User Journey, Feedback Summary) exactly as Agent 2 outlined.
- Assign owners: PM (Funnel, Feedback), Lifecycle Analyst (Retention), UX Researcher (User Journey), Product Engineer (Feature Adoption).
- Refresh cadence: Funnel/Feedback real-time; Retention/Feature daily; User Journey weekly due to compute cost.
- Automate weekly PDF/email digests for leadership using PostHog scheduled reports.

### 6. Infrastructure, Privacy & Performance
- Event pipeline: Browser SDK → optional reverse proxy (`/api/posthog`) → PostHog Cloud EU.
- Environment variables: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, optional `POSTHOG_PROJECT_API_KEY`.
- Performance controls: lazy-load session replay (10% sampling to start), guard provider with dynamic import, monitor Core Web Vitals for <50ms delta.
- Privacy: `maskAllInputs`, `maskTextSelector: '[data-sensitive]'`, `respect_dnt: true`, documented opt-out toggle in settings. Update privacy policy to mention PostHog + surveys.

## 🗓️ Implementation Timeline (Macro Phases)
| Phase | Duration | Key Outcomes | Dependencies |
| --- | --- | --- | --- |
| Phase 1 – Foundation & Gate 1 (Week 1) | Days 1-5 | SDK installed, provider wired, Supabase identity + Gate 1 events live, initial Conversion Funnel dashboard ready | PostHog project + env vars |
| Phase 2 – Gates 2 & 3 + Wow Cohort (Week 2) | Days 6-10 | Reading + feature events instrumented, wow moment cohort defined, Feature Adoption dashboard live, QA of event payloads | Phase 1 events validated |
| Phase 3 – Retention & Feedback Loop (Week 3) | Days 11-15 | Gate 4 events, WAU/MAU + Retention dashboard, surveys enabled for 20% traffic, engagement score backfill job running | Prior gates emitting data |
| Phase 4 – Optimization & Automation (Week 4) | Days 16-20 | Reverse proxy optional, full survey rollout, automation of reports, correlation analyses feeding backlog, GA dual-tracking retired if targets met | Stable analytics data |

*Detailed 2-3 day increments appear in `POSTHOG_ANALYTICS_INCREMENTAL_PLAN.md`.*

## 💰 Cost & Resource Plan
- **Engineering**: 1 senior full-stack engineer (~4 weeks, 0.5 FTE) + 1 product analyst (~0.25 FTE) for dashboards/reporting.
- **PostHog Licensing**: Cloud free tier (1M events/month, 7-day replay). Budget $250/month contingency for overage once WAU >400.
- **Opportunity Cost**: <2 day interruption to core roadmap thanks to incremental delivery; each increment is shippable and testable.

## 🚨 Risk Mitigation
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Performance regression | Medium | Lazy-load session recording, monitor bundle diff, roll back replays if p95 >100ms |
| Privacy / GDPR issues | Medium | EU data hosting, masking selectors, explicit opt-out toggle, privacy policy update |
| Ad blocker data loss | Medium | Implement reverse proxy in Phase 4; fall back to direct host if proxy fails |
| Survey fatigue / low response | Medium | Emoji-first surveys, cooldown windows (30-60 days), start with 20% audience, incentivize responses |
| Event drift / schema sprawl | High | Central event helper file with unit tests, schema review checklist in PR template, weekly analytics QA |
| Insufficient data for correlations | Low | Focus on Gate 1-2 first, run qualitative session replay reviews until volume grows |

## 📏 Success Metrics
- **Funnel Targets**: Signup→First Use 70%, First Use→Wow 55%, Wow→D7 retention 50%, overall Signup→D7 ≥19%.
- **Engagement**: WAU 400 in 3 months, WAU/MAU ≥45%, Avg engagement score ≥50, AI Tutor adoption ≥50%.
- **Data Quality**: <1% malformed events per week, <50ms added to LCP, survey response rate ≥30%.
- **Operational**: Dashboards refreshed on schedule, weekly digest emailed, <24h turnaround on analytics questions.

## 🚀 Expected Impact & Next Steps
- **User Value**: Faster onboarding insights, contextual surveys that surface blockers, tailored re-engagement.
- **Business Value**: Visibility into revenue-critical gates, ability to prove retention lift for investors/partners, roadmap guided by qualitative + quantitative signals.
- **Next Steps**: Kick off Increment 1 (foundation), finalize survey copy with UX, schedule weekly analytics review, and begin dual-tracking GA/PostHog comparisons after Phase 1.

