# Agent 2: UX & Product Analytics Strategy Research Instructions

**Research Date**: December 2025  
**Your Persona**: Product Analytics Specialist with expertise in conversion funnels, user behavior tracking, and feedback systems  
**Research Focus**: Event strategy, funnel design, feedback widget UX, dashboard design, and product insights

---

## Your Mission

Research PostHog product analytics strategy for BookBridge, focusing on event tracking design, funnel visualization, feedback widget UX, and dashboard creation to track the 4 conversion gates. Your goal is to design a complete product analytics system that helps BookBridge understand user behavior and improve retention.

---

## Context

**BookBridge Overview**:
- AI-powered reading platform for ESL learners
- Features: Text simplification (A1-C2), audio narration, AI tutoring
- Current users: 259 active users
- Tech stack: Next.js, React, TypeScript, Supabase
- Current analytics: Google Analytics (basic traffic only)

**Business Goals**:
- Track 4 conversion gates (Signup → First Use → Wow Moment → Retention)
- Understand where users struggle
- Improve retention and engagement
- Prove traction to investors/partners

**Stakeholder Requirements**:
- Michael Cody Marcus (co-founder of Cody Reading) recommended PostHog
- Need to watch user sessions (session replays)
- Need contextual feedback widget (not static button)
- Need to track individual user journeys (not just anonymous sessions)

---

## Research Tasks

### **Task 1: 4 Conversion Gates Event Design** (2 hours)

**Objective**: Design complete event taxonomy for tracking all 4 conversion gates.

**Research Areas**:

1. **Gate 1: Signup Events**
   - What events indicate signup completion?
   - How to track signup source (ESL program, social media, referral)?
   - What user properties to capture at signup?
   - How to identify users with email?

2. **Gate 2: First Use Events**
   - What events indicate "first meaningful action"?
   - How to measure time from signup to first use?
   - What counts as "using the platform"?
   - How to track first book opened, first chapter started?

3. **Gate 3: Wow Moment Events**
   - What events indicate the "wow moment"?
   - How to track chapter completion?
   - How to track AI simplification usage?
   - How to track audio narration usage?
   - How to track AI tutor interactions?
   - What combination of events = "wow moment"?

4. **Gate 4: Retention Events**
   - What events indicate return visits?
   - How to track day 2, day 7, day 30 retention?
   - How to track weekly active users?
   - What features bring users back?

**Deliverable**: Complete event taxonomy with:
- Event names (e.g., `user_signed_up`, `first_book_opened`)
- Event properties (e.g., `source`, `book_id`, `cefr_level`)
- User properties (e.g., `signup_date`, `books_read`)
- Event triggers (when/where to fire events)

---

### **Task 2: Funnel Visualization** (1.5 hours)

**Objective**: Design funnel visualization for 4 conversion gates with drop-off analysis.

**Research Areas**:

1. **Funnel Structure**
   - How to structure the 4-gate funnel in PostHog?
   - What are the conversion steps?
   - How to visualize drop-off points?

2. **Conversion Targets**
   - What are realistic conversion rates for each gate?
   - What benchmarks exist for ESL learning platforms?
   - What's considered "good" vs "needs improvement"?

3. **Drop-Off Analysis**
   - How to identify where users drop off?
   - What insights to extract from funnel data?
   - How to use funnel data for product improvements?

**Deliverable**: Funnel design with:
- Funnel steps and conversion events
- Target conversion rates
- Drop-off analysis approach
- Actionable insights framework

---

### **Task 3: Feedback Widget UX Design** (2 hours)

**Objective**: Design contextual feedback widget UX/UI to replace static button.

**Research Areas**:

1. **PostHog Surveys vs Custom Widget**
   - Should we use PostHog Surveys feature or build custom?
   - What are the pros/cons of each approach?
   - Which provides better UX?

2. **Trigger Logic Design**
   - When should feedback widget appear?
   - What engagement thresholds trigger it?
   - How to avoid being intrusive?
   - Examples: After scrolling through book, after using feature, after completing chapter

3. **Question Flow Design**
   - First question: "Do you like this?" with emoji options (😍 👍 😐 👎)
   - Second question (optional): "What do you wish it could do?" (open text)
   - How to make it feel natural and non-intrusive?
   - What's the optimal question length and wording?

4. **UX/UI Design**
   - Where should widget appear? (bottom-right corner, inline, modal?)
   - What's the visual design? (size, colors, animations)
   - How to make it mobile-friendly?
   - How to handle dismiss/close?

**Deliverable**: Complete feedback widget design with:
- Trigger logic specification
- Question flow design
- UX/UI mockup/wireframe (text description or code)
- Implementation approach (PostHog Surveys vs custom)

---

### **Task 4: Dashboard Design** (1.5 hours)

**Objective**: Design PostHog dashboards for product insights and decision-making.

**Research Areas**:

1. **Funnel Dashboard**
   - How to visualize 4-gate funnel?
   - What metrics to show?
   - How to show conversion rates and drop-offs?

2. **Feature Adoption Dashboard**
   - Which features are used most?
   - Which features are ignored?
   - How to visualize feature usage?

3. **Retention Cohort Dashboard**
   - How to show week-over-week retention?
   - How to visualize retention by signup date?
   - What retention metrics matter most?

4. **User Paths Dashboard**
   - How to visualize common user journeys?
   - What paths lead to success?
   - What paths lead to drop-off?

5. **Feedback Summary Dashboard**
   - How to aggregate feedback ratings?
   - How to visualize feature requests?
   - How to prioritize feedback?

**Deliverable**: Dashboard specifications with:
- Dashboard names and purposes
- Key metrics to display
- Visualization types (charts, tables, funnels)
- Update frequency and refresh strategy

---

### **Task 5: User Journey Mapping** (1 hour)

**Objective**: Map common user journeys through BookBridge app.

**Research Areas**:

1. **Common Paths**
   - What are the most common user paths?
   - What paths lead to "wow moment"?
   - What paths lead to drop-off?

2. **Decision Points**
   - Where do users make key decisions?
   - What choices do they face?
   - How to track decision points?

3. **Journey Analysis**
   - How to use PostHog to analyze user journeys?
   - What insights to extract?
   - How to improve journeys based on data?

**Deliverable**: User journey maps with:
- Common paths through app
- Key decision points
- Success vs failure paths
- Journey tracking strategy

---

### **Task 6: Retention & Engagement Metrics** (1 hour)

**Objective**: Define retention and engagement metrics for BookBridge.

**Research Areas**:

1. **Retention Metrics**
   - Day 2 retention (users who return within 2 days)
   - Day 7 retention (users who return within 7 days)
   - Day 30 retention (users who return within 30 days)
   - How to calculate and track these?

2. **Engagement Metrics**
   - Weekly active users (WAU)
   - Monthly active users (MAU)
   - Session duration
   - Actions per session
   - How to define "active"?

3. **Engagement Scoring**
   - How to score user engagement?
   - What makes a "power user"?
   - How to segment users by engagement?

**Deliverable**: Retention and engagement metrics with:
- Metric definitions
- Calculation formulas
- Tracking approach
- Benchmark targets

---

## Deliverables

**Save your findings in**: `docs/research/Agent2_Product_PostHog_Findings.md`

**Include**:
- Complete event taxonomy for all 4 gates
- Funnel design with conversion targets
- Feedback widget UX/UI design
- Dashboard specifications (5+ dashboards)
- User journey maps
- Retention and engagement metrics
- Product insights framework

**Format**: Use the standard findings template (see Research Process Template)

---

## Success Criteria

- [ ] All 4 gates have complete event tracking design
- [ ] Funnel visualization designed with conversion targets
- [ ] Feedback widget UX fully specified (trigger logic + questions + design)
- [ ] 5+ dashboard designs documented
- [ ] User journey maps created
- [ ] Retention metrics defined (day 2, 7, 30)
- [ ] Engagement scoring system designed

---

## Research Quality Guidelines

### **Evidence Requirements**
- Include PostHog dashboard examples and screenshots (if possible)
- Cite PostHog documentation for features
- Reference best practices from similar products
- Quantify conversion targets (based on industry benchmarks)
- Show trade-offs (PostHog Surveys vs custom widget)

### **Quality Checklist**
- [ ] Specific recommendations with clear reasoning
- [ ] Multiple options evaluated (PostHog Surveys vs custom widget)
- [ ] Risks and mitigation strategies identified
- [ ] Implementation complexity assessed
- [ ] User experience considered (non-intrusive, contextual)
- [ ] Mobile-friendly designs included

---

## Key Resources

### **PostHog Documentation**
- PostHog Funnels: https://posthog.com/docs/user-guides/funnels
- PostHog Surveys: https://posthog.com/docs/surveys
- PostHog Dashboards: https://posthog.com/docs/user-guides/dashboards
- PostHog User Paths: https://posthog.com/docs/user-guides/paths
- PostHog Retention: https://posthog.com/docs/user-guides/retention

### **BookBridge Context**
- Current user base: 259 active users
- Target: 1.5B ESL learners globally
- Key features: Text simplification, audio narration, AI tutoring
- Reading experience: Chapter-based, CEFR levels (A1-C2)

### **Stakeholder Requirements**
- **4 Gates**: Signup → First Use → Wow Moment → Retention
- **Feedback Widget**: Contextual, emoji rating, optional text
- **Session Replays**: Watch real user sessions
- **User Identification**: Track individual journeys (not anonymous)

---

## Research Approach

1. **Start with PostHog Documentation**: Understand PostHog's capabilities for funnels, surveys, dashboards
2. **Design Event Taxonomy**: Map user actions to events for each gate
3. **Design Funnel**: Create visual funnel structure with conversion steps
4. **Design Feedback Widget**: Research PostHog Surveys vs custom, design UX
5. **Design Dashboards**: Create dashboard specifications for key insights
6. **Map User Journeys**: Identify common paths and decision points
7. **Define Metrics**: Specify retention and engagement calculations

---

## Important Notes

- **Focus on Product Analytics**: Not marketing analytics (that's Google Analytics)
- **User-Centric**: Design for understanding user behavior, not just traffic
- **Actionable Insights**: Every metric should lead to actionable improvements
- **ESL Context**: Consider ESL learner needs and behaviors
- **Mobile-First**: All designs must work on mobile devices

---

**Research Timeline**: 1-2 days  
**Expected Output**: Comprehensive product analytics strategy document  
**Next Step**: After your research, a third agent (GPT-5) will synthesize both research findings and provide final recommendations

Good luck with your research! 🚀

