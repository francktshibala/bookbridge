# Teacher-Facing Features — Feasibility Assessment (July 2026)

## Context

BookBridge is live in production at bookbridge.app — 259 active students across three schools, zero downtime over six months. This is not a prototype; every change here ships to real users. The eight features below come directly from a teacher feedback survey and are scoped for implementation in priority order.

**Stack**: React, Next.js, TypeScript, Node.js, PostgreSQL, Supabase, with Claude AI, ElevenLabs, Stripe, and PostHog integrated.

## Feasibility

**Yes — all eight features are genuinely doable on the current stack. No rewrite is needed.**

One real caution: **role-based signup (#6) touches the live Supabase authentication system.** Auth is the one place in this app where a small mistake can lock people out or break login entirely for all 259 active students — unlike a dashboard bug or a content-pipeline bug, which fails visibly and locally without taking down access to the app itself.

**Recommendation**: Build and test the role-selection signup flow somewhere safe — a separate branch against a non-production Supabase project (or local Supabase), with explicit regression testing of existing login/signup for current users — before it ever touches production auth or production data. Do not iterate on this piece directly against the live app the way the other seven features can be.

The other seven features (dashboard reads, content ingestion, question-type selector, vocabulary list, book assignment, shared reading lists) don't touch the authentication path and carry materially lower risk — normal feature-branch + review workflow is sufficient for those.

## Priority Order

1. **Fix CEFR level-switching bug** — teacher-reported, cannot change reading level in settings. Low risk, isolated bug fix.
2. **Teacher Dashboard** — reading progress, time spent, completed books, comprehension results. Read-only aggregation, low risk.
3. **Content pipeline** — ingest BC Reads (opentextbc.ca, CC BY 4.0, attribution to Shantel Ivits) and VOA Learning English (public domain, credit VOA) into the existing book library. Additive, low risk to existing content.
4. **Question-type selector** — let teachers/students pick comprehension skill practiced per reading (main idea, vocabulary, inference, etc.), not just one generic quiz. Extends existing quiz system, low risk.
5. **Student vocabulary list** — save words from the existing tap-to-define dictionary, review later. Additive, low risk.
6. **Role-based signup** ⚠️ — Teacher/Student choice at signup with differentiated experience. **Touches live Supabase auth.** Build and test in isolation (non-production Supabase project/branch) before touching production. Do not break login for existing users.
7. **One-click book assignment** — teacher assigns a book to a student or class. Additive, low risk once teacher/student roles exist.
8. **Shared reading lists** — teachers build and share custom book collections with other teacher accounts. Additive, low risk.
