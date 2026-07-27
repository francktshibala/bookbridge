# Teacher Dashboard v2 — Research Plan

## Overview

Teacher Dashboard v1 (classes, join-code enrollment, roster with books-read + last-active) is live in production. Before extending it, we want research — not more first-principles guessing — on what makes it genuinely valuable, user-friendly, and something teachers open daily rather than once.

**Timeline**: focused pass, not the full 5-day cycle — scoped to 3 specific questions, not a from-scratch feature investigation.
**Goal**: a concrete, evidence-based spec for Teacher Dashboard v2 that closes real gaps (not imagined ones) and is built to scale from day one.

## Research Objectives

1. Identify what makes comparable teacher-facing dashboards habit-forming (or not), grounded in real competitor patterns, not assumption.
2. Determine which additional data points are genuine teacher value vs. clutter, reconciled against what's already implemented and what the original teacher survey asked for.
3. Determine the right technical approach (query/caching/aggregation strategy) so "comprehensive" doesn't mean "slow" as more metrics and more classes get added.

## Agent Research Division

### Agent 1: UX & Retention Research
**Focus**: Competitive analysis of teacher-facing dashboards — what creates daily-return habit vs. one-time novelty.
**Deliverable**: `docs/research/Agent1_Teacher_Dashboard_UX_Findings.md`

### Agent 2: Data & Value Requirements
**Focus**: Reconcile existing data (`ReadingSession`, `BookAssignment` schema hook), the original survey ask, and known gaps against real teacher value — separate signal from noise.
**Deliverable**: `docs/research/Agent2_Teacher_Dashboard_Data_Findings.md`

### Agent 3: Technical Architecture & Scalability
**Focus**: Query/caching/aggregation strategy for a dashboard that will show more metrics across more classes over time, building on the existing 2-query roster pattern.
**Deliverable**: `docs/research/Agent3_Teacher_Dashboard_Technical_Findings.md`

## Context for all agents

- BookBridge: live ESL reading platform, Next.js/Prisma/Supabase, hosted on Render.
- Existing Teacher Dashboard (v1): `Class`/`Enrollment` models, roster showing `booksRead` (distinct count) + `lastActivity` (last session start), computed via `lib/classes/get-class-roster.ts` — 2 queries total regardless of roster size, not per-student.
- Existing unused data on `ReadingSession`: `comprehensionScore`, `sessionStart`/`sessionEnd`, `timeOnSimplified`/`timeOnOriginal` (seconds), `wordsRead`, `avgReadingSpeed`.
- Designed but not built: `BookAssignment` model (Class + Book + optional `dueDate`).
- Original ask (`docs/implementation/TEACHER_FEATURES_FEASIBILITY.md`): "reading progress, time spent, completed books, comprehension results."
- Known gaps already identified: no comprehension skill-type breakdown (single aggregate score only), no school/org-level view (single-teacher-owns-class model), no lightweight student login (full email/password account required), no assignment due-date/completion tracking.

## Final Deliverables

1. Three agent findings files (above)
2. Synthesis into an updated `docs/implementation/TEACHER_DASHBOARD_IMPLEMENTATION_PLAN.md` (v2 addendum) — done after research, not part of this plan
