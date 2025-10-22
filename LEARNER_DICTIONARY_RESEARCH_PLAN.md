# ESL Learner Dictionary Research Plan

## 📚 Overview
Research plan for implementing a tap-to-define learner dictionary feature for BookBridge ESL audiobook platform.

**Timeline**: 3-5 days research sprint
**Goal**: Validate UX patterns, data sources, and technical architecture for ESL-optimized dictionary

## 🎯 Research Objectives

### Primary Goals
1. Identify the best mobile UI pattern for displaying definitions during reading
2. Find quality ESL-appropriate definition sources with licensing clarity
3. Design performant architecture that doesn't block audio playback
4. Validate that definitions load in <150ms (cached) and <400ms (uncached)

### Success Criteria
- Mobile-friendly UI that works with one thumb
- Simple English definitions with CEFR level indicators
- Works offline for common words
- Never interrupts audio playback
- Maintains <3s page load times

## 👥 Agent Research Division

### Agent 1: UX & Accessibility Research
**Focus**: Mobile interaction patterns and accessibility
**Deliverable**: `docs/research/Agent1_UX_Findings.md`

### Agent 2: Data & Licensing Research
**Focus**: Dictionary data sources and ESL quality
**Deliverable**: `docs/research/Agent2_Data_Findings.md`

### Agent 3: Backend & Infrastructure Research
**Focus**: Technical architecture and performance
**Deliverable**: `docs/research/Agent3_Backend_Findings.md`

## 📊 Expected Outcomes

### From UX Research
- Recommended UI component (bottom sheet vs modal vs tooltip)
- Interaction patterns (tap vs long-press)
- Mobile gesture considerations
- Accessibility requirements

### From Data Research
- Best data source for ESL definitions
- Licensing costs and restrictions
- Offline pack composition (which 2000 words)
- CEFR mapping quality

### From Backend Research
- Caching strategy (client + server)
- API endpoint design
- Lemmatization approach
- Performance benchmarks

## 🚀 Quick Wins to Implement During Research

1. **Tap Handler**: Add event listener to word spans
2. **Bottom Sheet Component**: Create empty UI shell
3. **API Endpoint**: Create `/api/dictionary` stub
4. **Basic Cache**: Implement in-memory LRU cache
5. **Telemetry**: Add lookup tracking

## 📅 Timeline

### Day 1-2: Initial Research
- Agents conduct independent research
- Document findings in respective files

### Day 3: Synthesis
- Review all findings
- Identify conflicts or gaps
- Request clarifications if needed

### Day 4: Implementation Plan
- Create detailed implementation plan
- Define technical specifications
- Estimate development timeline

### Day 5: Review & Approval
- Present plan for approval
- Address any concerns
- Finalize approach

## 🎯 Final Deliverables

1. **Individual Research Files**: 3 agent finding documents
2. **Implementation Plan**: `LEARNER_DICTIONARY_IMPLEMENTATION_PLAN.md`
3. **Technical Specification**: API design, schema, performance targets
4. **Timeline & Budget**: Development timeline and cost estimates

## 📝 Research Questions by Agent

### Agent 1 Questions (UX)
- How do competitors handle dictionary in reading apps?
- What's the optimal UI for one-handed mobile use?
- How to handle definition display during audio playback?
- What information to show (definition, CEFR, example, pronunciation)?

### Agent 2 Questions (Data)
- Which dictionary APIs offer ESL-appropriate content?
- What are the licensing costs for commercial use?
- Which 2000 words should be in the offline pack?
- How to handle phrases and idioms?

### Agent 3 Questions (Backend)
- How to implement non-blocking lookups?
- Where to cache (IndexedDB, localStorage, memory)?
- How to handle lemmatization efficiently?
- What's the optimal Edge API architecture?

## 🔗 References

### Existing Architecture
- Bundle audio architecture: `/docs/audiobook-pipeline-complete.md`
- Current reading experience: `/docs/CONTINUOUS_READING_EXPERIENCE_ARCHITECTURE.md`
- Performance requirements: Maintain <3s load, <100MB memory

### Constraints
- 70% mobile users
- Budget-conscious implementation
- Must work with existing word highlighting
- Cannot interrupt audio playback

## ✅ Success Metrics

### Performance
- First tap: <150ms (cached), <400ms (uncached)
- Memory: <10MB additional overhead
- Cache hit rate: >60% after 1 minute

### User Experience
- Works offline for common words
- Simple, ESL-appropriate language
- One-thumb mobile operation
- No audio interruption

---

**Next Step**: Distribute agent-specific instructions and begin research sprint.