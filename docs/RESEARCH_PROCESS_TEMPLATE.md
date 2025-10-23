# Research Process Template

## 📚 Overview

This document provides a proven template for conducting comprehensive feature research using specialized agents. Based on the successful ESL Learner Dictionary research, this process ensures thorough investigation across UX, data, and technical domains.

**Proven Results**: Used for ESL Dictionary research - delivered actionable $14K implementation plan in 5 days.

---

## 🎯 When to Use This Process

### **Use This Template For:**
- ✅ Complex features requiring multi-domain expertise (UX + Data + Technical)
- ✅ Features with unknown implementation complexity
- ✅ Features affecting core user experience
- ✅ Features requiring external data sources or APIs
- ✅ Features with budget implications >$5K
- ✅ Features with timeline uncertainty

### **Don't Use This Template For:**
- ❌ Simple UI changes or bug fixes
- ❌ Features with well-known implementation patterns
- ❌ Emergency fixes or hotfixes
- ❌ Minor feature enhancements
- ❌ Research that can be completed in <1 day

---

## 🏗️ Research Framework Structure

### **Phase 1: Planning (Day 0)**
1. Create research plan document
2. Define 3 specialized research areas
3. Write agent-specific instructions
4. Set timeline and deliverables

### **Phase 2: Research Execution (Day 1-3)**
1. Agents conduct independent research
2. Document findings in structured format
3. Save results in dedicated files

### **Phase 3: Synthesis (Day 4-5)**
1. Review all findings
2. Identify conflicts and gaps
3. Create comprehensive implementation plan
4. **Break implementation into incremental steps**
5. Document lessons learned

---

## 📋 Step-by-Step Process

### **Step 1: Create Research Plan File**

**Template File**: `[FEATURE_NAME]_RESEARCH_PLAN.md`

```markdown
# [Feature Name] Research Plan

## 📚 Overview
[Brief description of the feature and research objectives]

**Timeline**: X days research sprint
**Goal**: [Specific research goals]

## 🎯 Research Objectives
### Primary Goals
1. [Goal 1]
2. [Goal 2]
3. [Goal 3]

### Success Criteria
- [Criteria 1]
- [Criteria 2]

## 👥 Agent Research Division

### Agent 1: [Domain 1] Research
**Focus**: [Specific focus area]
**Deliverable**: `docs/research/Agent1_[Domain]_Findings.md`

### Agent 2: [Domain 2] Research
**Focus**: [Specific focus area]
**Deliverable**: `docs/research/Agent2_[Domain]_Findings.md`

### Agent 3: [Domain 3] Research
**Focus**: [Specific focus area]
**Deliverable**: `docs/research/Agent3_[Domain]_Findings.md`

## 📊 Expected Outcomes
[What each research area should deliver]

## 🚨 Guardrails & Constraints
### Performance Budgets
- p95 latency: [target ms]
- Mobile memory cap: [target MB]
- Bundle size limit: [target MB]

### Kill/Scope-Cut Criteria
- **Kill if**: [conditions that stop the project]
- **Scope cut if**: [conditions that reduce scope]
- **Proceed if**: [minimum viable criteria]

## 🎯 Research Hypotheses
1. **Hypothesis 1**: [Testable statement about user behavior/technical feasibility]
2. **Hypothesis 2**: [Testable statement about market/competitive advantage]
3. **Hypothesis 3**: [Testable statement about implementation approach]

## 🚀 Quick Wins to Implement During Research
[Items that can be built while researching]

## 📅 Timeline
### Day 1-2: Initial Research
### Day 3: Synthesis
### Day 4: Implementation Plan
### Day 5: Review & Approval

## 🎯 Final Deliverables
1. Individual Research Files: 3 agent findings
2. Implementation Plan: `[FEATURE_NAME]_IMPLEMENTATION_PLAN.md`
3. **Incremental Plan: `[FEATURE_NAME]_INCREMENTAL_PLAN.md`**
4. **Risk Register**: Top 5 risks with owners and mitigation
5. **Decision Log**: Key decisions with rationale
6. Technical Specification
7. Timeline & Budget

## 📝 Research Questions by Agent
[Specific questions for each agent]

## 🔗 References
[Existing architecture, constraints, requirements]

## ✅ Success Metrics
[How to measure research success]
```

### **Step 2: Define Three Research Domains**

**Choose 3 specialized areas based on feature complexity:**

#### **Option A: Technical Feature**
- **Agent 1**: UX & User Experience
- **Agent 2**: Technical Architecture
- **Agent 3**: Data & Integration

#### **Option B: Data-Heavy Feature**
- **Agent 1**: UX & Accessibility
- **Agent 2**: Data Sources & Licensing
- **Agent 3**: Backend & Performance

#### **Option C: Platform Feature**
- **Agent 1**: User Research & Design
- **Agent 2**: Business & Market Analysis
- **Agent 3**: Technical Feasibility

#### **Option D: Mobile Feature**
- **Agent 1**: Mobile UX & Interaction Design
- **Agent 2**: Performance & Optimization
- **Agent 3**: Cross-Platform Compatibility

### **Option E: Security/Compliance Feature**
- **Agent 1**: UX & Checkout Flow
- **Agent 2**: Compliance & Security
- **Agent 3**: Billing & Infrastructure

### **Option F: Pedagogical Feature**
- **Agent 1**: UX & Learning Science
- **Agent 2**: Curriculum & Pedagogy
- **Agent 3**: Tech & Content Tools

### **Step 3: Write Agent Instructions**

**For each agent, provide structured instructions:**

```markdown
## 📋 Agent [Number]: [Domain] Research Instructions

### Your Mission
[Clear, specific research mission]

### Context
[Background information about the project/feature]

### Research Tasks
1. **Task 1** (X hours)
   - [Specific instructions]
   - [What to analyze]
   - [Expected outputs]

2. **Task 2** (X hours)
   - [Specific instructions]

[Continue for all tasks]

### Deliverables
Save your findings in: `docs/research/Agent[N]_[Domain]_Findings.md`

Include:
- Recommended approach with justification
- Detailed analysis organized by task
- Risk assessment
- Next steps required
- Code examples or mockups (if applicable)

### Success Criteria
[How to measure successful research completion]
```

### **Step 4: Agent Findings Template**

**Standardized format for all agent reports:**

```markdown
# Agent [Number]: [Domain] Research Findings

## Executive Summary
[2-3 sentences of key findings and recommendations]

## Recommendations
1. **Primary recommendation**: [Main approach]
2. **Backup option**: [Alternative approach]
3. **Quick win**: [Immediate implementation possibility]

## Detailed Findings

### [Research Area 1]
[Comprehensive analysis]

### [Research Area 2]
[Comprehensive analysis]

[Continue for all research areas]

## Risks & Concerns
[Identified risks and mitigation strategies]

## Next Steps
[Actionable next steps for implementation]

## Appendix
[Supporting data, screenshots, code examples]
```

---

## 🔍 Research Quality Guidelines

### **For All Agents:**

#### **Research Depth Standards**
- **Shallow Research** (1-2 hours): Basic competitive analysis, obvious solutions
- **Medium Research** (4-6 hours): Detailed analysis, multiple options, trade-offs
- **Deep Research** (8+ hours): Comprehensive investigation, prototyping, validation

#### **Evidence Requirements**
- **Include Examples**: Screenshots, code snippets, API documentation
- **Cite Sources**: Links to documentation, competitor analysis, technical specs
- **Quantify Impact**: Performance metrics, cost estimates, timeline projections
- **Show Trade-offs**: Pros/cons tables, comparison matrices

#### **Quality Checklist**
- [ ] Specific recommendations with clear reasoning
- [ ] Multiple options evaluated (not just one solution)
- [ ] Risks and mitigation strategies identified
- [ ] Implementation complexity assessed
- [ ] Cost/time estimates provided
- [ ] Integration with existing architecture considered

---

## 📊 Synthesis Process

### **Step 1: Review All Findings**
1. Read all three agent reports completely
2. Identify common themes and conflicts
3. Note gaps in research coverage
4. Assess recommendation quality

### **Step 2: Create Unified Implementation Plan**

**Template**: `[FEATURE_NAME]_IMPLEMENTATION_PLAN.md`

```markdown
# [Feature Name] Implementation Plan

## 📚 Executive Summary
[Synthesis of all research with final recommendation]

## 🎯 Final Recommended Architecture
[Combined approach from all three research areas]

## 🏗️ Implementation Timeline
### Phase 1: [Timeframe]
### Phase 2: [Timeframe]
### Phase 3: [Timeframe]

## 📊 Cost Analysis
### Development Investment
### Operational Costs
### Revenue Impact

## 🚨 Risk Mitigation
[Comprehensive risk analysis from all domains]

## ✅ Success Metrics
[How to measure implementation success]

## 🚀 Expected Impact
[Business and user impact projections]
```

### **Step 3: Break Into Incremental Implementation**

**CRITICAL**: After completing the implementation plan, immediately create an incremental breakdown.

**Template**: `[FEATURE_NAME]_INCREMENTAL_PLAN.md`

#### **Why Break Into Increments?**

**Risk Reduction**:
- Detect problems early (design, technical, user acceptance)
- Avoid 8-week investment in wrong direction
- Enable course correction based on real feedback

**Faster Value Delivery**:
- Users get benefits throughout development, not just at the end
- Each increment provides immediate value
- Build momentum and stakeholder confidence

**Better Resource Management**:
- Predictable 2-3 day delivery cycles
- Easier to estimate and track progress
- Allows parallel work on different aspects

**Quality Improvement**:
- Continuous testing and feedback integration
- Polish each feature before adding complexity
- Reduce technical debt accumulation

#### **Incremental Planning Guidelines**

**Increment Size**: 2-3 days maximum
- Small enough for quick feedback
- Large enough to be independently valuable
- Complete enough to test with real users

**Increment Structure**:
```markdown
### Increment X: [Feature Name] (Days Y-Z)
- [ ] Specific deliverable 1
- [ ] Specific deliverable 2
- **Ship**: What users will experience
- **Test**: What feedback to gather
- **Definition of Done**:
  - [ ] Demoable working feature
  - [ ] Metrics/telemetry logged
  - [ ] Behind feature flag
  - [ ] Does not regress p95 latency/memory
  - [ ] Documentation updated
```

**Success Pattern**: Ship → Measure → Learn → Adjust

**Decision Points**: Plan go/no-go reviews every 2 weeks to validate direction

#### **Breaking Down Complex Features**

**Week 1-2**: Foundation and Core Functionality
- Basic feature working end-to-end
- Essential user value delivered

**Week 3-4**: Enhancement and Edge Cases
- Additional functionality
- Error handling and polish

**Week 5-6**: Performance and Integration
- Optimization for scale
- Integration with existing features

**Week 7-8**: Polish and Production Readiness
- Accessibility and UX refinement
- Monitoring and analytics

### **Step 4: Validate Against Constraints**

**Check implementation plan against:**
- [ ] Existing technical architecture
- [ ] Budget constraints
- [ ] Timeline requirements
- [ ] Team capabilities
- [ ] Business priorities
- [ ] User needs

---

## 🎯 Common Research Patterns

### **Pattern 1: Technical Feature Research**
**Example**: New API integration, performance optimization
- **Agent 1**: Implementation architecture and scalability
- **Agent 2**: Alternative solutions and vendor analysis
- **Agent 3**: Integration complexity and testing requirements

### **Pattern 2: User Feature Research**
**Example**: New UI component, user workflow
- **Agent 1**: User experience and interaction design
- **Agent 2**: Accessibility and mobile optimization
- **Agent 3**: Technical implementation and performance

### **Pattern 3: Data Feature Research**
**Example**: Analytics dashboard, data visualization
- **Agent 1**: Data requirements and sources
- **Agent 2**: Visualization and user interface design
- **Agent 3**: Storage, processing, and API architecture

### **Pattern 4: Business Feature Research**
**Example**: Subscription model, payment integration
- **Agent 1**: Market analysis and competitive research
- **Agent 2**: User experience and conversion optimization
- **Agent 3**: Technical implementation and security

---

## ✅ Success Indicators

### **Research Process Success**
- All three agents deliver comprehensive findings
- No major gaps in research coverage
- Clear recommendations with supporting evidence
- Implementation plan addresses all key concerns

### **Research Quality Success**
- Multiple viable options identified
- Trade-offs clearly documented
- Risks and mitigation strategies defined
- Timeline and budget estimates provided

### **Research Impact Success**
- Implementation plan gets stakeholder approval
- Development proceeds without major surprises
- Feature delivers expected business/user value
- Research insights inform future features

---

## 📁 File Organization

### **Research Project Structure**
```
/docs/research/
├── [FEATURE_NAME]_RESEARCH_PLAN.md
├── Agent1_[Domain]_Findings.md
├── Agent2_[Domain]_Findings.md
├── Agent3_[Domain]_Findings.md
├── [FEATURE_NAME]_IMPLEMENTATION_PLAN.md
└── [FEATURE_NAME]_INCREMENTAL_PLAN.md
```

### **Archive Completed Research**
After implementation completion:
```
/docs/research/completed/
├── [FEATURE_NAME]/
│   ├── research_plan.md
│   ├── agent_findings/
│   ├── implementation_plan.md
│   ├── incremental_plan.md
│   └── lessons_learned.md
```

---

## 🔄 Process Improvements

### **After Each Research Project**

#### **Conduct Research Retrospective**
1. **What worked well?**
   - Research quality and depth
   - Agent coordination and communication
   - Timeline adherence

2. **What could be improved?**
   - Research scope definition
   - Agent instruction clarity
   - Synthesis process efficiency

3. **Lessons for next time**
   - Process refinements
   - Template improvements
   - Tool recommendations

#### **Update This Template**
- Add new research patterns discovered
- Refine agent instruction templates
- Update quality guidelines based on learnings
- Include new success metrics

---

## 🎉 Template Benefits

### **For Project Management**
- **Predictable Timeline**: Standard 5-day research cycle
- **Quality Assurance**: Structured approach ensures comprehensive coverage
- **Risk Reduction**: Multi-domain analysis identifies issues early
- **Budget Accuracy**: Research provides reliable implementation estimates

### **For Development Teams**
- **Clear Requirements**: Research delivers specific, actionable requirements
- **Technical Clarity**: Architecture decisions made with full context
- **Reduced Surprises**: Thorough research prevents mid-development pivots
- **Quality Foundation**: Implementation built on solid research foundation

### **For Business Stakeholders**
- **Informed Decisions**: Comprehensive analysis supports strategic choices
- **Cost Transparency**: Clear understanding of investment required
- **Risk Awareness**: Proactive identification of potential issues
- **Value Validation**: Research confirms feature value before investment

---

## 🚀 Getting Started

### **Quick Start Checklist**
1. [ ] Copy this template for your feature research
2. [ ] Define your three research domains
3. [ ] Write specific agent instructions
4. [ ] Set timeline and deliverable expectations
5. [ ] Launch research with all three agents
6. [ ] Schedule synthesis review meeting
7. [ ] Document lessons learned for next time

**Success Pattern**: Follow this template exactly for the first 2-3 research projects, then adapt based on your specific needs and learnings.

---

*This research process template is based on the successful ESL Learner Dictionary research that delivered a comprehensive $14K implementation plan in 5 days. Use this framework to ensure thorough, efficient research for all major feature development.*