## Mobile App Technical Comparison: Fix PWA vs Capacitor/Ionic vs React Native

Audience: Engineering and product leadership
Save to: `/docs/mobile/research/MOBILE_APP_TECHNICAL_COMPARISON.md`
Date: {auto-updated by commit date}

### Context and Constraints
- Reference: `/docs/mobile/research/PWA_IMPLEMENTATION_RESEARCH.md` (current PWA issues and plans)
- Observed issue: Service worker functions but does not always auto-register across devices/browsers.
- Timeline/budget: Target 2–4 weeks for a production-ready solution.
- Must maintain existing features: audio playback, offline reading, and word highlighting without regressions.

### Current State Summary (from codebase)
- PWA stack already integrated via `next-pwa` with Workbox in `next.config.js` (gated by `ENABLE_PWA`).
- Generated `public/sw.js` exists (Workbox bundle) when built with PWA enabled.
- `public/manifest.json` present; `app/layout.tsx` declares `manifest` metadata and mobile web app meta tags.
- Install prompt UX present via `components/InstallPrompt.tsx` and analytics in `components/PWAAnalyticsProvider.tsx`.
- Multiple diagnostics/testing pages (`app/test-pwa-books`, `app/test-offline-validation`) and validators in `lib` show instrumentation for SW presence, background sync, and install prompts.
- Known issue: inconsistent auto SW registration and unreliable install prompt across devices; PWA is feature-flagged and may be disabled in some environments.

Implication: Significant PWA plumbing exists. Issues appear to be configuration/registration and platform nuances, not greenfield.

---

### Option A: Fix and finalize the existing PWA

Overview
- Continue with Next.js App Router + `next-pwa` + Workbox.
- Ensure deterministic registration, correct scoping, and offline-first caching tailored for 2G/3G.

Reuse of existing code
- Reuse ~85–95% of the Next.js codebase as-is (UI, routes, API, auth, analytics, onboarding, audio features).
- Keep `InstallPrompt`, `PWAAnalyticsProvider`, offline indicators, validators, and test pages.

Key tasks to productionize
1) Stabilize registration and environment gating
   - Ensure `ENABLE_PWA=true` in production builds and logs confirm enablement.
   - Keep `register: true`, `skipWaiting: true`; add explicit `navigator.serviceWorker.getRegistration()` logging on first client mount for diagnostics.
   - Confirm HTTPS and correct scope; verify no path mismatches.
2) Runtime caching tuned for low bandwidth
   - Explicit strategies for images, fonts, static assets; network-only for `/api/*` (already configured).
   - Add content/audio caching with stale-while-revalidate and IndexedDB for large audio where applicable.
3) Install prompt reliability
   - Respect browser policies: show prompt only after engagement; keep iOS fallback instructions (no auto prompt on iOS Safari).
   - Track event funnel in existing analytics; A/B copy, delay, and CTA placement.
4) Offline UX polish
   - Offline indicator, retry flows, offline fallback views tested on 2G/3G simulation.

Pros
- Highest code reuse; fastest path to shipping.
- Single codebase; web deploy cadence maintained.
- Works across Android and iOS (with iOS PWA caveats).

Cons
- iOS PWA limitations: no push, background tasks are limited; install flow is manual (Share → Add to Home Screen).
- Browser variance can still affect install prompt visibility.

Estimated effort
- 2–4 days to stabilize registration, caching, and UX, given existing groundwork and tooling.

Best fit
- When time-to-value and bandwidth constraints are critical, and push/background services are not must-haves.

---

### Acceptance Criteria (common across options)
- Audio playback, offline reading, and word highlighting continue to work reliably on mid/low-end Android and iOS devices.
- Deterministic startup: no hangs when offline; clear offline indicator and retry flows.
- Install experience: Android shows eligible prompt; iOS has clear “Add to Home Screen” guidance.
- Measurable: Service worker registration success rate ≥ 98% on tested Android devices; offline-read success rate ≥ 95% for cached content.

---

### Option B: Capacitor (with Ionic UI optional)

Overview
- Wrap the existing Next.js app as a native container using Capacitor.
- Optionally add Ionic components for native-feel UI where needed.

Reuse of existing code
- Frontend UI/business logic: 70–85% reusable (served from a local web bundle in the app or remote).
- Routing and most components remain; minor adjustments for in-app browser contexts.

Key tasks
1) Capacitor project init (iOS + Android), configure WebView and local asset hosting.
2) Build Next.js to static export for embedding, or serve via embedded server; set deep links.
3) Bridge native capabilities as needed (file system for offline storage, background tasks, share sheet, audio session).
4) Implement offline storage using native FS/SQLite/IndexedDB (WebView) depending on data size and reliability goals.

Pros
- Access to native APIs (background tasks within platform limits, better file handling, native share, etc.).
- Distribution via app stores; install flow is first-class.

Cons
- Adds native projects to maintain (Xcode/Android Studio, CI, signing, app store ops).
- WebView performance variance on low-end Android; careful optimization needed for 2G/3G and RAM constraints.

Estimated effort
- 2–3 weeks initial integration and store readiness (per platform), assuming minimal native plugins.

Best fit
- When store distribution, modest native features, and improved install UX matter, but full native performance is not required.

---

### Option C: React Native

Overview
- Rebuild UI in React Native; reuse business/domain logic where decoupled from the DOM.

Reuse of existing code
- Direct UI reuse: low. Logic reuse: medium if abstracted (state machines, services, API clients).
- Server-side APIs unaffected.

Key tasks
1) Re-implement screens/components in RN; establish navigation, theming, accessibility.
2) Port audio pipeline and offline storage using native modules.
3) Integrate auth, analytics, and background sync natively.

Pros
- Best native UX and performance path; richer background capabilities and platform features.

Cons
- Highest rebuild cost; parallel codebases to maintain.
- Longer QA cycle, accessibility parity work needed.

Estimated effort
- 2–3 months MVP to reach feature parity; more for polish and accessibility equivalence.

Best fit
- When native performance/features are must-have and budget/timeline allow.

---

### Offline for 2G/3G: Capability Comparison
- PWA: Workbox + IndexedDB can deliver strong offline for content/audio with careful cache budgets and prefetch policies; constrained background work.
- Capacitor: Can leverage native FS and background tasks better than pure PWA; still WebView for rendering.
- React Native: Full native control over storage/background; best reliability for large media sync.

---

### Maintenance Implications
- PWA: Single codebase; minimal overhead; browser quirks remain.
- Capacitor: Web app + two native shells; store ops and native tooling overhead.
- React Native: Separate app; substantial ongoing divergence from web.

---

### Recommendation
Given the current near-complete PWA and the target users on constrained networks:
- Short term: Fix and ship the existing PWA. Focus on deterministic SW registration, low-bandwidth caching, and clear iOS install education. Expect 2–4 days to production-grade.
- Medium term: Evaluate Capacitor wrapper if store presence or native FS/background affordances become necessary. Prototype in 1–2 weeks.
- Long term: Consider React Native only if product requires capabilities that exceed WebView/PWA limits.

---

### Concrete Next Steps (if choosing PWA fix)
1) Enable PWA in production builds (set `ENABLE_PWA=true`), confirm build logs and `public/sw.js` generation.
2) Add explicit SW registration verification (and fallback registration) in a client bootstrap to surface errors and mitigate auto-registration gaps.
3) Expand Workbox runtimeCaching to include critical content/audio strategies; cap cache sizes for low-storage devices.
4) Validate install prompt flows on Chrome/Edge/Android WebView; document iOS flow in UI.
5) Run offline tests using `app/test-offline-validation` and real 2G/3G device tests; iterate.

---

### 2–4 Week Execution Plan Aligned to Constraints
- Week 1: PWA stabilization
  - Force-verify SW registration on first client render; add diagnostics and retry logic.
  - Finalize runtimeCaching for content/audio; size caps for constrained devices.
  - Validate install flows (Android prompt, iOS guidance) and analytics funnel.
- Week 2: Offline robustness + soak testing
  - 2G/3G field tests on target devices; fix edge cases in offline reading and audio resume.
  - Accessibility checks for offline/installation flows; finalize copy.
- Week 3 (optional): Capacitor feasibility spike
  - Wrap web bundle; verify audio/offline/highlighting parity; measure startup and memory.
  - Decide whether to proceed with store submission track.
- Week 4 (buffer): Hardening + store ops (if Capacitor) or production roll-out (PWA-only)
  - Address residual bugs; complete docs/runbooks; prepare release notes.


