# Modern Story Sources - Incremental Implementation Plan

**Date:** December 2024  
**Purpose:** Break down pilot phase into 2-3 day actionable increments  
**Reference:** Consolidated Implementation Plan + Agent Findings

---

## Overview

This plan breaks the 5 pilot stories into 2-3 day increments, allowing for continuous feedback and course correction. Each increment delivers value and can be tested independently.

**Pilot Phase Total:** 6-8 weeks (5 stories)  
**Increment Size:** 2-3 days per increment  
**Total Increments:** 15 increments across 5 stories

---

## Story 1: "Teen Translating for Parents Through Hospital Chaos"

### Increment 1: Research & Theme Extraction (Days 1-2)
**Goal:** Gather sources and extract themes/emotional moments

**Tasks:**
- [ ] Access Vox First Person article (manual scrape)
- [ ] Find 2-3 additional sources (news articles, interviews)
- [ ] Read/watch all sources
- [ ] Extract themes: language barrier, medical emergency, teen advocacy, confidence building
- [ ] Document 7 emotional moments
- [ ] Cross-reference facts across sources
- [ ] Verify legal compliance (multiple sources, themes only)

**Deliverables:**
- Source list (3-5 sources)
- Theme extraction document
- Emotional moments list (7 moments)
- Legal compliance checklist ✅

**Definition of Done:**
- [ ] 3-5 sources identified and accessed
- [ ] Themes extracted (not text copied)
- [ ] 7 emotional moments documented
- [ ] Legal compliance verified
- [ ] Ready for narrative creation

**Ship:** Research complete, themes extracted  
**Test:** Verify themes are extracted (not text), verify multiple sources used

---

### Increment 2: Narrative Creation (Days 3-4)
**Goal:** Write original narrative based on themes

**Tasks:**
- [ ] Write background context (30-50 words)
- [ ] Write emotional hook (50-100 words)
- [ ] Write main story (original narrative based on themes)
- [ ] Structure into coherent arc: struggle → crisis → breakthrough → confidence
- [ ] Ensure 15-20 minute length (A2 level target)
- [ ] Verify original structure (not mimicking source)

**Deliverables:**
- Background context text
- Emotional hook text
- Main story text (original narrative)
- Narrative structure document

**Definition of Done:**
- [ ] Background context written (30-50 words)
- [ ] Emotional hook written (50-100 words)
- [ ] Main story written (original narrative, not copied)
- [ ] Length verified (15-20 minutes)
- [ ] Plagiarism check passed (no text matches)
- [ ] Ready for processing

**Ship:** Complete narrative ready for simplification  
**Test:** Run plagiarism checker, verify no text matches sources

---

### Increment 3: Processing & Integration (Days 5-6)
**Goal:** Simplify, generate audio, integrate into BookBridge

**Tasks:**
- [ ] Simplify to A2 level (follow existing workflow)
- [ ] Generate preview text (50-75 words marketing copy)
- [ ] Generate preview audio (Jane voice)
- [ ] Generate bundle audio (follow existing workflow)
- [ ] Database seeding (FeaturedBook, BookCollection, BookCollectionMembership)
- [ ] Create API endpoint (`app/api/teen-translating-a2/bundles/route.ts`)
- [ ] Update frontend config (`lib/config/books.ts`)
- [ ] Test reading route

**Deliverables:**
- A2 simplified text
- Preview text and audio
- Bundle audio files
- Database records
- API endpoint
- Frontend integration

**Definition of Done:**
- [ ] A2 simplified text complete
- [ ] Preview text and audio generated
- [ ] Bundle audio generated and uploaded
- [ ] Database seeded correctly
- [ ] API endpoint working
- [ ] Frontend integration complete
- [ ] Reading route tested
- [ ] Background context and hook display correctly

**Ship:** Story 1 complete and live in BookBridge  
**Test:** Full reading experience, audio playback, highlighting sync

---

## Story 2: "Undocumented Student Becomes Lawyer Helping Others"

### Increment 4: Research & Theme Extraction (Days 7-8)
**Goal:** Gather sources and extract themes/emotional moments

**Tasks:**
- [ ] Access WaPo/NYT articles (manual scrape)
- [ ] Find 2-3 additional sources (interviews, profiles)
- [ ] Read all sources
- [ ] Extract themes: undocumented barriers, law school journey, bar exam, service to others
- [ ] Document 7 emotional moments
- [ ] Cross-reference facts
- [ ] Verify legal compliance

**Deliverables:**
- Source list (3-5 sources)
- Theme extraction document
- Emotional moments list (7 moments)
- Legal compliance checklist ✅

**Definition of Done:**
- [ ] 3-5 sources identified and accessed
- [ ] Themes extracted (not text)
- [ ] 7 emotional moments documented
- [ ] Legal compliance verified
- [ ] Ready for narrative creation

**Ship:** Research complete  
**Test:** Verify themes extracted, multiple sources used

---

### Increment 5: Narrative Creation (Days 9-10)
**Goal:** Write original narrative based on themes

**Tasks:**
- [ ] Write background context (30-50 words)
- [ ] Write emotional hook (50-100 words)
- [ ] Write main story (original narrative)
- [ ] Structure: fear → education → breakthrough → service
- [ ] Ensure 30-35 minute length (B1 level target)
- [ ] Verify original structure

**Deliverables:**
- Background context text
- Emotional hook text
- Main story text (original narrative)

**Definition of Done:**
- [ ] Background context written
- [ ] Emotional hook written
- [ ] Main story written (original, not copied)
- [ ] Length verified (30-35 minutes)
- [ ] Plagiarism check passed
- [ ] Ready for processing

**Ship:** Complete narrative ready  
**Test:** Plagiarism check, verify no text matches

---

### Increment 6: Processing & Integration (Days 11-12)
**Goal:** Simplify, generate audio, integrate

**Tasks:**
- [ ] Simplify to B1 level
- [ ] Generate preview text and audio
- [ ] Generate bundle audio
- [ ] Database seeding
- [ ] Create API endpoint
- [ ] Update frontend config
- [ ] Test reading route

**Deliverables:**
- B1 simplified text
- Preview and bundle audio
- Database records
- API endpoint
- Frontend integration

**Definition of Done:**
- [ ] B1 simplified text complete
- [ ] Preview and bundle audio generated
- [ ] Database seeded
- [ ] API endpoint working
- [ ] Frontend integration complete
- [ ] Reading route tested

**Ship:** Story 2 complete and live  
**Test:** Full reading experience

---

## Story 3: "First-Gen Student Teaching Dad to Read"

### Increment 7: Research & Theme Extraction (Days 13-14)
**Goal:** Gather sources and extract themes

**Tasks:**
- [ ] Access Reddit r/TwoXChromosomes (Reddit API)
- [ ] Find 1-2 related sources (similar stories)
- [ ] Extract themes: family literacy, teaching, intergenerational connection
- [ ] Document 7 emotional moments
- [ ] Verify legal compliance (heavily paraphrase Reddit content)

**Deliverables:**
- Source list
- Theme extraction document
- Emotional moments list
- Legal compliance checklist ✅

**Definition of Done:**
- [ ] Sources identified
- [ ] Themes extracted (heavily paraphrased from Reddit)
- [ ] 7 emotional moments documented
- [ ] Legal compliance verified
- [ ] Ready for narrative creation

**Ship:** Research complete  
**Test:** Verify heavy paraphrasing, no text copying

---

### Increment 8: Narrative Creation (Days 15-16)
**Goal:** Write original narrative

**Tasks:**
- [ ] Write background context
- [ ] Write emotional hook
- [ ] Write main story (heavily paraphrased from Reddit)
- [ ] Structure: discovery → teaching → struggle → breakthrough
- [ ] Ensure 15-20 minute length (A1 level target)
- [ ] Verify original structure

**Deliverables:**
- Background context text
- Emotional hook text
- Main story text (original narrative)

**Definition of Done:**
- [ ] Background context written
- [ ] Emotional hook written
- [ ] Main story written (original, heavily paraphrased)
- [ ] Length verified (15-20 minutes)
- [ ] Plagiarism check passed
- [ ] Ready for processing

**Ship:** Complete narrative ready  
**Test:** Plagiarism check, verify heavy paraphrasing

---

### Increment 9: Processing & Integration (Days 17-18)
**Goal:** Simplify, generate audio, integrate

**Tasks:**
- [ ] Simplify to A1 level
- [ ] Generate preview text and audio
- [ ] Generate bundle audio
- [ ] Database seeding
- [ ] Create API endpoint
- [ ] Update frontend config
- [ ] Test reading route

**Deliverables:**
- A1 simplified text
- Preview and bundle audio
- Database records
- API endpoint
- Frontend integration

**Definition of Done:**
- [ ] A1 simplified text complete
- [ ] Preview and bundle audio generated
- [ ] Database seeded
- [ ] API endpoint working
- [ ] Frontend integration complete
- [ ] Reading route tested

**Ship:** Story 3 complete and live  
**Test:** Full reading experience

---

## Story 4: "Migrant Farmworker's Daughter Earns PhD"

### Increment 10: Research & Theme Extraction (Days 19-20)
**Goal:** Gather sources and extract themes

**Tasks:**
- [ ] Access NPR/Latino USA podcast (podcast feed/transcript)
- [ ] Find 2-3 additional sources (news articles, profiles)
- [ ] Extract themes: farmworker childhood, education journey, PhD achievement
- [ ] Document 7 emotional moments
- [ ] Verify legal compliance

**Deliverables:**
- Source list
- Theme extraction document
- Emotional moments list
- Legal compliance checklist ✅

**Definition of Done:**
- [ ] Sources identified
- [ ] Themes extracted
- [ ] 7 emotional moments documented
- [ ] Legal compliance verified
- [ ] Ready for narrative creation

**Ship:** Research complete  
**Test:** Verify themes extracted, multiple sources used

---

### Increment 11: Narrative Creation (Days 21-22)
**Goal:** Write original narrative

**Tasks:**
- [ ] Write background context
- [ ] Write emotional hook
- [ ] Write main story (original narrative)
- [ ] Structure: childhood → education → struggles → PhD
- [ ] Ensure 30-35 minute length (B1 level target)
- [ ] Verify original structure

**Deliverables:**
- Background context text
- Emotional hook text
- Main story text (original narrative)

**Definition of Done:**
- [ ] Background context written
- [ ] Emotional hook written
- [ ] Main story written (original, not copied)
- [ ] Length verified (30-35 minutes)
- [ ] Plagiarism check passed
- [ ] Ready for processing

**Ship:** Complete narrative ready  
**Test:** Plagiarism check

---

### Increment 12: Processing & Integration (Days 23-24)
**Goal:** Simplify, generate audio, integrate

**Tasks:**
- [ ] Simplify to B1 level
- [ ] Generate preview text and audio
- [ ] Generate bundle audio
- [ ] Database seeding
- [ ] Create API endpoint
- [ ] Update frontend config
- [ ] Test reading route

**Deliverables:**
- B1 simplified text
- Preview and bundle audio
- Database records
- API endpoint
- Frontend integration

**Definition of Done:**
- [ ] B1 simplified text complete
- [ ] Preview and bundle audio generated
- [ ] Database seeded
- [ ] API endpoint working
- [ ] Frontend integration complete
- [ ] Reading route tested

**Ship:** Story 4 complete and live  
**Test:** Full reading experience

---

## Story 5: "Asylum Seeker Becomes ICU Nurse"

### Increment 13: Research & Theme Extraction (Days 25-26)
**Goal:** Gather sources and extract themes

**Tasks:**
- [ ] Access WaPo/STAT articles (manual scrape)
- [ ] Find 2-3 additional sources (interviews, profiles)
- [ ] Extract themes: refugee journey, nursing school, language barriers, ICU service
- [ ] Document 7 emotional moments
- [ ] Verify legal compliance

**Deliverables:**
- Source list
- Theme extraction document
- Emotional moments list
- Legal compliance checklist ✅

**Definition of Done:**
- [ ] Sources identified
- [ ] Themes extracted
- [ ] 7 emotional moments documented
- [ ] Legal compliance verified
- [ ] Ready for narrative creation

**Ship:** Research complete  
**Test:** Verify themes extracted, multiple sources used

---

### Increment 14: Narrative Creation (Days 27-28)
**Goal:** Write original narrative

**Tasks:**
- [ ] Write background context
- [ ] Write emotional hook
- [ ] Write main story (original narrative)
- [ ] Structure: camp → education → graduation → service
- [ ] Ensure 25-30 minute length (B1 level target)
- [ ] Verify original structure

**Deliverables:**
- Background context text
- Emotional hook text
- Main story text (original narrative)

**Definition of Done:**
- [ ] Background context written
- [ ] Emotional hook written
- [ ] Main story written (original, not copied)
- [ ] Length verified (25-30 minutes)
- [ ] Plagiarism check passed
- [ ] Ready for processing

**Ship:** Complete narrative ready  
**Test:** Plagiarism check

---

### Increment 15: Processing & Integration (Days 29-30)
**Goal:** Simplify, generate audio, integrate

**Tasks:**
- [ ] Simplify to B1 level
- [ ] Generate preview text and audio
- [ ] Generate bundle audio
- [ ] Database seeding
- [ ] Create API endpoint
- [ ] Update frontend config
- [ ] Test reading route

**Deliverables:**
- B1 simplified text
- Preview and bundle audio
- Database records
- API endpoint
- Frontend integration

**Definition of Done:**
- [ ] B1 simplified text complete
- [ ] Preview and bundle audio generated
- [ ] Database seeded
- [ ] API endpoint working
- [ ] Frontend integration complete
- [ ] Reading route tested

**Ship:** Story 5 complete and live  
**Test:** Full reading experience

---

## Pilot Phase Summary

**Total Increments:** 15 (3 per story × 5 stories)  
**Total Time:** ~43 hours (6-8 weeks)  
**Increment Size:** 2-3 days per increment  
**Deliverables:** 5 complete stories live in BookBridge

**Success Pattern:** Ship → Measure → Learn → Adjust

**Decision Points:** Review after each story (5 reviews total) to validate direction and gather feedback.

---

## Post-Pilot Actions

### After Story 1 (Increment 3)
- [ ] Gather user feedback
- [ ] Measure engagement metrics
- [ ] Refine extraction workflow if needed
- [ ] Document learnings

### After Story 2 (Increment 6)
- [ ] Compare feedback between stories
- [ ] Identify patterns
- [ ] Refine narrative creation process
- [ ] Document best practices

### After Story 3 (Increment 9)
- [ ] Assess theme diversity
- [ ] Evaluate quality consistency
- [ ] Refine processing workflow
- [ ] Update documentation

### After Story 4 (Increment 12)
- [ ] Review overall quality
- [ ] Assess user engagement trends
- [ ] Refine integration process
- [ ] Prepare for expansion phase

### After Story 5 (Increment 15)
- [ ] Complete pilot phase review
- [ ] Document all learnings
- [ ] Create expansion phase plan
- [ ] Begin expansion phase (20 stories)

---

## Key Principles

**Increment Size:** 2-3 days maximum (quick feedback)  
**Value Delivery:** Each increment delivers independently testable value  
**Quality Gates:** Plagiarism check, legal compliance, quality validation at each stage  
**Continuous Improvement:** Learn from each increment, adjust process

**Success Pattern:** Ship → Measure → Learn → Adjust

---

**Document Status:** ✅ Complete  
**Ready for Execution:** ✅ YES  
**Next Step:** Begin Increment 1 (Research & Theme Extraction for Story 1)

