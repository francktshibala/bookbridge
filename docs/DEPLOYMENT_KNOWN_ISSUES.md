# Deployment Known Issues (Vercel)

Target: `bookbridge-six.vercel.app` — see live site: [BookBridge on Vercel](https://bookbridge-six.vercel.app)

## 1) Favicon / App Icon not visible ("logo")
- Symptom: Browser tab/app icon (“logo”) not shown on Vercel.
- Findings:
  - `public/icon-192.png` and `public/icon-512.png` were 0‑byte files originally.
  - Added `app/icon.svg` and explicit metadata icons in `app/layout.tsx`; added `public/favicon.ico`.
  - Navigation uses text logo (📚 BookBridge), not an image; if a graphical navbar logo is expected, it isn’t implemented yet.
- Impact: No visible favicon/PWA icon; navbar still shows text.
- Fix later:
  - Replace placeholder PNGs with real 192×192 and 512×512 assets.
  - Keep `app/icon.svg` or add a `/logo.(svg|png)` and render with `<Image>` in `Navigation`.
  - Hard refresh after deploy (browser cache).

## 2) Redis not configured in production
- Symptom: Build logs show “Redis URL not found, skipping Redis initialization”.
- Findings: `REDIS_URL` missing on Vercel.
- Impact: Caching/session features that rely on Redis are disabled; possible slower responses.
- Fix later: Set `REDIS_URL` in Vercel env (or keep disabled if not needed).

## 3) Stripe webhook secret likely missing
- Symptom: Webhook processing may no‑op without `STRIPE_WEBHOOK_SECRET`.
- Findings: Project docs note it’s optional but required for auto subscription updates.
- Impact: Successful checkouts might not auto‑update subscription status.
- Fix later: Add `STRIPE_WEBHOOK_SECRET` in Vercel and Stripe webhook to `/api/stripe/webhook`.

## 4) Environment parity risks
- Symptom: Works locally but not in prod for some features.
- Findings: Production depends on envs: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `PINECONE_API_KEY`, etc.
- Impact: Missing/incorrect envs can break AI, vector search, auth, or uploads.
- Fix later: Run `vercel env pull .env.local` and ensure all required vars are set in Vercel.

## 5) Next.js 15 param usage warnings (non‑blocking)
- Symptom: Potential warnings about `params` needing `await` in some API routes.
- Findings: Mentioned in ESL docs; not observed breaking build.
- Impact: Console noise; not a blocker.
- Fix later: Update route handlers to `({ params }: { params: Promise<...> })` and `await params`.

## 6) ESL simplification engine status (scope to confirm)
- Symptom: Docs indicate placeholder behavior.
- Findings: ESL features work locally; needs quality review for production.
- Impact: Quality of simplification may vary.
- Fix later: Replace placeholder logic with full CEFR simplifier and tests.

---

Deferred Action Checklist
- Provide real `public/icon-192.png` and `public/icon-512.png`; keep `app/icon.svg`.
- (Optional) Implement graphical navbar logo `<Image src="/logo.svg" ... />`.
- Set `REDIS_URL` if caching is desired in prod.
- Configure `STRIPE_WEBHOOK_SECRET` and verify webhook events.
- Verify all Vercel env vars with `vercel env pull .env.local`.
- Address any Next.js 15 param warnings in API routes. 