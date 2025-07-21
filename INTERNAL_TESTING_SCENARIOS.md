# BookBridge AI Internal Testing Scenarios

## Testing Overview
This document outlines test scenarios to validate the multi-agent AI system vs standard AI responses.

## Multi-Agent System Triggers
**Triggers:** Questions containing these keywords:
- analyze, compare, explain, significance, meaning, mean, interpret, discuss, theme
- OR when `ENABLE_MULTI_AGENT=true` in environment

**Expected Features:**
- 🧠 Multi-Agent badge in responses
- 4 specialized agents: Research, Analysis, Citation, Synthesis
- Academic-level responses with proper citations
- Quote highlighting with golden backgrounds
- Page references and sources

## Test Categories

### Category 1: Analytical Questions (Should Trigger Multi-Agent)

#### Test 1A: Theme Analysis
**Question:** "Analyze the theme of corruption in this book"
**Expected:** Multi-agent response with research findings, thematic analysis, citations
**Success Criteria:** 
- Shows 🧠 Multi-Agent badge
- Includes quoted passages with citations
- Provides deep thematic analysis
- Response length: 300-500 words

#### Test 1B: Character Analysis  
**Question:** "Explain the significance of the main character's transformation"
**Expected:** Multi-agent with character development insights
**Success Criteria:**
- Character arc analysis
- Quotes showing character development
- Literary technique discussion

#### Test 1C: Comparative Analysis
**Question:** "Compare the writing style in this chapter to earlier sections"
**Expected:** Multi-agent with comparative insights
**Success Criteria:**
- Side-by-side analysis
- Specific textual examples
- Literary style discussion

### Category 2: Simple Questions (Should Use Standard AI)

#### Test 2A: Basic Information
**Question:** "What is this book about?"
**Expected:** Standard AI response, concise summary
**Success Criteria:**
- No multi-agent badge
- Quick, informative response
- Response length: 100-200 words

#### Test 2B: Factual Questions
**Question:** "Who is the author of this book?"
**Expected:** Standard AI, direct answer
**Success Criteria:**
- Immediate factual response
- No complex analysis
- Response length: 1-2 sentences

#### Test 2C: Simple Navigation
**Question:** "How do I bookmark this page?"
**Expected:** Standard AI, helpful instructions
**Success Criteria:**
- Clear, actionable steps
- No literary analysis
- Practical guidance

### Category 3: Edge Cases

#### Test 3A: Borderline Analytical
**Question:** "What does this passage mean?"
**Expected:** Multi-agent due to "mean" keyword
**Success Criteria:**
- Triggers multi-agent system
- Provides interpretation with context

#### Test 3B: Complex but Non-Literary
**Question:** "Analyze my reading speed"
**Expected:** Should trigger multi-agent but focus on reading metrics
**Success Criteria:**
- Multi-agent response
- Data-focused rather than literary analysis

## Voice Features Testing

### Test 4A: Voice Navigation
**Action:** Press 'V' key and say "go to library"
**Expected:** Voice navigation works
**Success Criteria:**
- Speech recognition activates
- Navigation command executed
- Voice feedback provided

### Test 4B: Text-to-Speech Quality
**Action:** Click audio player button on AI response
**Expected:** Professional voice quality
**Success Criteria:**
- Natural speech (not robotic)
- Speed controls work (0.5x-2.0x)
- Progress bar shows correctly
- Voice selection works

### Test 4C: Microphone Input
**Action:** Click microphone button in chat
**Expected:** Speech-to-text input
**Success Criteria:**
- Microphone activates
- Speech converts to text accurately
- Text appears in input field

## Response Quality Metrics

### Multi-Agent Response Quality Checklist
- [ ] Academic-level depth and insight
- [ ] Proper citations with page references
- [ ] Quote highlighting with golden backgrounds
- [ ] 4-agent collaboration visible in depth
- [ ] Structured, well-organized response
- [ ] Educational tone with follow-up value
- [ ] Accurate attribution of quotes
- [ ] Meaningful cross-references

### Standard AI Response Quality Checklist
- [ ] Quick, efficient answers
- [ ] Appropriate brevity for simple questions
- [ ] Helpful and accurate information
- [ ] Clear, accessible language
- [ ] Task-appropriate depth
- [ ] No unnecessary complexity

## Performance Metrics

### Response Time Expectations
- **Multi-Agent:** 8-15 seconds (4 AI calls in parallel)
- **Standard AI:** 2-5 seconds (single AI call)
- **Cached Content:** 1-3 seconds faster

### Cost Expectations
- **Multi-Agent:** ~4x cost of standard AI (4 agents)
- **Standard AI:** Baseline cost
- **Daily Budget:** Should stay under $150/day limit

## Test Results Template

### Test Results: [Date]

#### Multi-Agent Tests
| Test | Triggered Multi-Agent? | Response Quality (1-5) | Citations Present? | Response Time | Notes |
|------|----------------------|----------------------|-------------------|---------------|-------|
| 1A   | ✅/❌                | 1-5                  | ✅/❌             | X seconds     |       |
| 1B   | ✅/❌                | 1-5                  | ✅/❌             | X seconds     |       |
| 1C   | ✅/❌                | 1-5                  | ✅/❌             | X seconds     |       |

#### Standard AI Tests
| Test | Used Standard AI? | Response Quality (1-5) | Response Time | Notes |
|------|------------------|----------------------|---------------|-------|
| 2A   | ✅/❌             | 1-5                  | X seconds     |       |
| 2B   | ✅/❌             | 1-5                  | X seconds     |       |
| 2C   | ✅/❌             | 1-5                  | X seconds     |       |

#### Voice Feature Tests
| Test | Feature Working? | Quality (1-5) | Notes |
|------|-----------------|---------------|-------|
| 4A   | ✅/❌            | 1-5           |       |
| 4B   | ✅/❌            | 1-5           |       |
| 4C   | ✅/❌            | 1-5           |       |

## Success Criteria Summary

**Multi-Agent System Success:**
- 100% trigger rate for analytical keywords
- 4+ star average response quality
- Proper citations in 90%+ of responses
- Response time under 15 seconds

**Standard AI Success:**
- 100% usage for simple questions
- 4+ star average response quality  
- Response time under 5 seconds

**Voice Features Success:**
- 90%+ speech recognition accuracy
- Natural voice quality (not robotic)
- All controls functional

## Next Steps After Internal Testing
1. Document all bugs and issues found
2. Fix critical problems before user testing
3. Optimize performance based on timing results
4. Prepare user testing scenarios based on successful internal tests