# ESL Redesign Synthesis (Template)

Use this document to merge findings from multiple agents (architecture, UX, accessibility, ESL pedagogy, performance) into a single, actionable plan. Keep sections concise and decision‑oriented.

## 0) How to use this template
- Paste each agent’s key findings into the relevant sections below.
- Resolve conflicts in “Decisions” blocks.
- Convert open questions into action items for the roadmap.

---

## 1) Executive Summary (1–2 paragraphs)
- Problem statement and goals
- What changes we will ship in the next two sprints

### Decisions
- [ ] …

---

## 2) Architecture Overview
- High‑level system diagram changes (services, flows)
- Chunking model for reading, TTS, and simplification
- Reliability/observability strategy

### Decisions
- [ ] Chunking boundaries (sentence/paragraph/page)
- [ ] Similarity gating thresholds (e.g., cosine ≥ 0.88)

---

## 3) CEFR Simplification Pipeline
- Input → pre‑processing → sentence/phrase simplification → cultural notes → post‑checks
- Meaning preservation check (semantic similarity, heuristic checks)
- Cache strategy per (bookId, level, chunkIndex)

### Decisions
- [ ] Model selection per CEFR level
- [ ] Gate and fallback behavior when similarity < threshold
- [ ] Precompute policy for top N titles

---

## 4) TTS Auto‑Advance & Highlighting Continuity
- Auto‑advance at end of chunk and prefetch policy (~90% progress)
- Word‑level highlighting continuity across chunk boundaries
- Recovery behavior on network/stream errors

### Decisions
- [ ] Prefetch window and heuristics
- [ ] Cross‑page highlighting handoff

---

## 5) Reading UI: Modes & Controls
- Modes: Original, Simplified, Compare (split)
- Compact floating ESL/TTS bar (level, simplify toggle, play/pause, speed, auto‑advance)
- Micro‑hints and failure states (non‑blocking)

### Decisions
- [ ] What’s on the bar vs in the overflow menu
- [ ] Default mode by user type (ESL vs non‑ESL)

---

## 6) Design System (Tokens & Primitives)
- Tokens: color, spacing, typography, radii, shadows
- Primitives: Button, Toggle, Tabs, Pager, Tooltip, Sheet, Progress, Toast

### Decisions
- [ ] Finalize tokens
- [ ] Component API contracts

---

## 7) Caching & Precomputation
- Levels: CDN, app cache, DB cache
- Invalidation/versioning rules when models or prompts change

### Decisions
- [ ] Version key format (e.g., model+prompt+level)
- [ ] TTL vs permanent caches for simplifications

---

## 8) API Contracts
- Simplification: request/response shapes, error codes
- TTS metadata: per‑word timings, boundaries
- Vocabulary: lookup, SRS events

### Decisions
- [ ] Final JSON schemas

---

## 9) Database Schema Updates
- Tables/columns for simplifications, sessions, vocab progress, cultural notes
- Indices for hot paths

### Decisions
- [ ] DDL changes approved

---

## 10) Accessibility & Internationalization
- WCAG 2.1 AA requirements for reading and TTS
- ARIA and focus management during playback
- Locale and right‑to‑left considerations

### Decisions
- [ ] Live regions and announcements
- [ ] Keyboard shortcuts and gestures

---

## 11) Metrics & Instrumentation
- KPIs: time‑to‑first‑simplified‑page, TTS continuation rate, vocab retention, confusion rate
- Event schema and dashboards

### Decisions
- [ ] Event names and payloads

---

## 12) Risks & Mitigations
- Model variability, latency, cache staleness, pagination mismatch, user confusion

### Decisions
- [ ] Mitigation playbook and thresholds

---

## 13) Two‑Sprint Roadmap (Implementation Plan)
- Sprint 1: Design system, Reading UI shell, Simplification reliability (gates), basic auto‑advance
- Sprint 2: Cross‑page highlighting, SRS integration, precompute pipeline, polish & a11y passes

### Sprint 1 Backlog
- [ ] …

### Sprint 2 Backlog
- [ ] …

---

## 14) Open Questions & Dependencies
- … 