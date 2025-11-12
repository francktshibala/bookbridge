# Modern Books Licensing & Acquisition Plan

**Date:** January 2025
**Goal:** Add 22 modern books to reach 50 total books in library
**Budget:** $2,200-4,400
**Timeline:** 2-3 months

---

## Current State

**Existing Library:** 28 books (all public domain)
- 10 Featured Books (bundle architecture with audio)
- 4 Enhanced Collection (chunk architecture, text-only)
- 14 Classic Literature titles

**User Feedback:** Requesting modern books, more variety in genres (romance, mystery, sci-fi, contemporary)

---

## Licensing Options

### Option 1: Indie/Self-Published Authors

**Cost:** $100-500 per book (one-time or annual license)

**Target:** 15 modern novels

**Total Budget:** $1,500-7,500

**Approach:**
- Direct outreach to indie authors on platforms:
  - Draft2Digital
  - Smashwords
  - BookFunnel
  - r/selfpublish
- Offer revenue share: 10-15% of subscription revenue
- Focus on ESL-friendly books (clear language, engaging plots)

**Genres to Target:**
- Contemporary Romance (5 books)
- Mystery/Thriller (5 books)
- Sci-Fi/Fantasy (3 books)
- Contemporary Fiction (2 books)

**Benefits:**
- Modern, relatable content
- Exclusive partnerships possible
- Authors willing to negotiate for exposure

---

### Option 2: Commissioned ESL Content

**Cost:** $100-200 per book (commissioned original content)

**Target:** 7 ESL-optimized stories

**Total Budget:** $700-1,400

**Approach:**
- Hire ESL content writers on:
  - Upwork (ESL textbook writers)
  - Fiverr (creative writers with ESL experience)
  - Reedsy (professional editors/writers)
- Specifications:
  - 3,000-5,000 words per story
  - A2-B1 CEFR level (university ESL sweet spot)
  - Contemporary themes (technology, travel, relationships)
  - Culturally diverse characters

**Story Types:**
- Short novels (10 stories × 4,000 words)
- Serialized content (5 chapters × 800 words)

**Benefits:**
- Full copyright ownership
- Optimized for ESL learners
- Can request specific themes based on user feedback

---

### Option 3: Creative Commons/Open License

**Cost:** $0 (free)

**Target:** 20-30 books

**Sources:**
- Project Gutenberg Canada (life+50 years = books from 1975 and earlier)
- Internet Archive (public domain and Creative Commons)
- Standard Ebooks (high-quality public domain formatting)
- Open Library

**Benefits:**
- Zero licensing cost
- High-quality formatting
- Legally safe

**Limitations:**
- Older books (pre-1975)
- Limited modern content
- Overlap with existing public domain library

---

## Recommended Strategy

### Phase 1: Foundation (Month 1-2)

**Total Books Added:** 22 books
**Total Budget:** $2,200-4,400

**Breakdown:**

1. **15 Indie Modern Novels** ($1,500-3,000)
   - Contemporary Romance: 5 books ($500-1,000)
   - Mystery/Thriller: 5 books ($500-1,000)
   - Sci-Fi/Fantasy: 3 books ($300-600)
   - Contemporary Fiction: 2 books ($200-400)

2. **7 Commissioned ESL Stories** ($700-1,400)
   - Technology themes: 2 stories
   - Travel/Adventure: 2 stories
   - Relationships/Life: 3 stories

**Result:** 50 total books in library (28 existing + 22 new)

---

### Phase 2: Genre Expansion (Month 3-4)

**Based on user feedback and completion rates from Phase 1**

**Additional Target:** 25 more books to reach 75 total

**Budget:** $3,000-6,000

**Focus:**
- Double down on high-performing genres from Phase 1
- Add user-requested authors/titles (collect via feedback form)
- Explore international authors (global diversity)

---

## Acquisition Workflow

### Step 1: Author Outreach (Week 1-2)

**Template Email:**
```
Subject: Partnership Opportunity - BookBridge ESL Reading Platform

Hi [Author Name],

I'm building BookBridge, an ESL reading platform that helps English learners
read classic and modern literature with audio synchronization and adaptive
simplification.

We have 59 active users across 43 cities and are launching classroom pilots
at BYU, Salt Lake Community College, and INX Academy in January 2026.

I'd love to license [Book Title] for our platform. We offer:
- One-time fee: $[amount] OR revenue share: 10-15% of subscriptions
- Audio narration with professional voice (ElevenLabs TTS)
- Exposure to ESL learners worldwide
- Usage analytics and user feedback

Are you interested? I'd be happy to discuss terms.

Best,
Franck Tshibala
Founder, BookBridge
```

**Target Authors:**
- 50+ self-published authors on Amazon/Draft2Digital
- Focus on books with 4+ star ratings, 100+ reviews
- Recent releases (2020-2024)

---

### Step 2: Contract Negotiation (Week 3-4)

**Key Terms to Negotiate:**
- **License Duration:** 1-year renewable vs perpetual
- **Territory:** Worldwide vs US-only
- **Exclusivity:** Non-exclusive (author keeps other distribution)
- **Payment:** One-time vs revenue share vs hybrid
- **Derivative Rights:** Right to simplify text for ESL (A1-C2 levels)
- **Audio Rights:** Right to generate TTS narration

**Template License Agreement:**
- Use Simple Book Licensing Agreement template (modify for ESL)
- Include CEFR simplification clause
- Specify audio generation rights (TTS only, not human narration)

---

### Step 3: Content Processing (Week 5-8)

**For Each Licensed Book:**

1. **Import to Database:**
   - Upload EPUB/TXT to Supabase storage
   - Parse into sentences
   - Generate metadata (title, author, genre, reading time)

2. **CEFR Simplification:**
   - Generate A2 level first (primary target)
   - Cost: $5-15 per book (Claude API)
   - Quality check: Manual review of first 3 chapters

3. **Audio Generation:**
   - Generate bundles (4 sentences per bundle)
   - Cost: $20-40 per book (ElevenLabs TTS)
   - Voice selection: Test 3 voices, pick best fit

4. **Catalog Entry:**
   - Add to catalog database
   - Tag genres, moods, themes
   - Set popularity score (50 default, adjust based on usage)

**Total Processing Time:** 2-3 days per book
**Total Processing Cost:** $25-55 per book (simplification + audio)

---

## Budget Summary

### Phase 1 (50 Total Books)

| Item | Quantity | Unit Cost | Total Cost |
|------|----------|-----------|------------|
| Indie Novels (Romance) | 5 | $100-200 | $500-1,000 |
| Indie Novels (Mystery) | 5 | $100-200 | $500-1,000 |
| Indie Novels (Sci-Fi) | 3 | $100-200 | $300-600 |
| Indie Novels (Contemporary) | 2 | $100-200 | $200-400 |
| Commissioned ESL Stories | 7 | $100-200 | $700-1,400 |
| **Licensing Subtotal** | **22** | - | **$2,200-4,400** |
| | | | |
| CEFR Simplification (A2) | 22 | $5-15 | $110-330 |
| Audio Generation | 22 | $20-40 | $440-880 |
| **Processing Subtotal** | **22** | - | **$550-1,210** |
| | | | |
| **TOTAL COST** | | | **$2,750-5,610** |

**Conservative Estimate:** $3,500 for 22 modern books (licensing + processing)

---

## Revenue Impact

**Current Users:** 59 active users

**Projected Growth with Modern Books:**
- +40% user retention (modern books = more relatable)
- +25% new user acquisition (variety attracts broader audience)

**Subscription Model (Future):**
- $5.99/month subscription
- Target: 100 paying users by March 2026
- Monthly Revenue: $599
- **ROI Timeline:** 6 months to recoup $3,500 investment

---

## Risk Mitigation

### Legal Risks

**Issue:** Copyright infringement if license terms unclear

**Mitigation:**
- Use written license agreements for every book
- Include CEFR simplification clause explicitly
- Get legal review ($200-500 one-time)

### Financial Risks

**Issue:** Books don't resonate with users, low completion rates

**Mitigation:**
- Start with 5 books (pilot batch) = $500-1,000
- Track completion rates for 2 weeks
- Only proceed with full 22 books if pilot shows >50% completion

### Operational Risks

**Issue:** Processing 22 books takes longer than expected

**Mitigation:**
- Batch processing: 5 books per week
- Use automation scripts for CEFR + audio generation
- Hire VA for manual quality checks ($15/hr, 2 hours per book)

---

## Success Metrics

**Track for Each Licensed Book:**

1. **Completion Rate:** % of users who finish the book
   - Target: >50% for modern books (vs 35% for classics)

2. **Average Rating:** User feedback score
   - Target: >4.0/5.0

3. **Engagement Time:** Average reading session duration
   - Target: >15 minutes per session

4. **Repeat Reads:** Users who re-read the same book
   - Target: >10% (indicates high quality)

5. **Referral Rate:** Users who share the book
   - Target: >5% (measure via share button clicks)

---

## Alternative: Subscription to Book Licensing Platforms

### Scribd API / OverDrive Integration

**Cost:** $200-500/month for API access

**Benefits:**
- Access to 1,000+ modern books
- No per-book licensing needed
- Automatic updates to catalog

**Drawbacks:**
- Monthly recurring cost
- Limited customization (can't simplify text without permission)
- May not allow audio generation

**Verdict:** Skip for now - too expensive for early stage

---

## Next Steps

### Immediate Actions (This Week)

1. ✅ **Create outreach list:** Research 50 indie authors on Amazon
2. ⏸️ **Draft license agreement:** Modify standard template for ESL rights
3. ⏸️ **Set up tracking:** Add "source" field to Book model (indie, commissioned, public domain)

### Week 1-2: Pilot Batch

1. Contact 20 romance authors (target: 5 licenses)
2. Budget: $500-1,000 for pilot
3. Process first 5 books (simplify + audio)
4. Deploy to catalog

### Week 3-4: Measure & Iterate

1. Track completion rates for pilot batch
2. Survey users: "Which genres do you want more of?"
3. Decide: proceed with full 22 books or pivot

### Month 2-3: Full Rollout

1. License remaining 17 books (based on pilot success)
2. Commission 7 ESL stories from Upwork
3. Process all 22 books
4. Launch "New Modern Books" marketing campaign

---

## Appendix A: Target Indie Authors

**Romance:**
- [TBD after research - authors with 4+ stars, 100+ reviews, recent releases]

**Mystery/Thriller:**
- [TBD after research]

**Sci-Fi/Fantasy:**
- [TBD after research]

**Contemporary Fiction:**
- [TBD after research]

---

## Appendix B: ESL Story Themes (User-Requested)

Based on feedback form submissions:

1. **Technology & Social Media** (3 stories)
   - "The Instagram Dilemma" - A2 level
   - "Coding Dreams" - B1 level
   - "The TikTok Challenge" - A2 level

2. **Travel & Adventure** (2 stories)
   - "Lost in Tokyo" - A2 level
   - "The Backpacker's Secret" - B1 level

3. **Relationships & Life** (2 stories)
   - "First Apartment" - A2 level
   - "The Coffee Shop Connection" - B1 level

---

**Document Status:** ✅ Plan complete, ready for implementation
**Next Review:** After pilot batch results (Week 3)
