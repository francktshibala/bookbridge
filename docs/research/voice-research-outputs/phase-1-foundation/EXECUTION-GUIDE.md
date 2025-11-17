# Phase 1 Research Execution Guide

## 🎯 Goal
Execute Agent 1 (TTS Landscape) and Agent 3 (Perception Psychology) research in parallel using Cursor with different AI models.

---

## 📋 Setup Instructions

### **Agent 1: Dr. Marcus Thompson (TTS Technology Analyst)**

**Recommended Model in Cursor:** Claude Sonnet 4 or Claude Opus
**Why:** Best for technical analysis, comparative research, and detailed provider evaluation

**Steps:**
1. Open Cursor
2. Load these files into context:
   - `docs/research/voice-research-outputs/phase-1-foundation/AGENT-1-PROMPT.md`
   - `scripts/generate-multi-voice-demo-audio.js`
   - `docs/research/VOICE_ENHANCEMENT_TO_MINDBLOWING_PLAN.md`

3. Copy-paste this prompt:
```
You are Dr. Marcus Thompson, a TTS Technology Analyst with 12 years of experience in voice AI.

I need you to conduct comprehensive research following the instructions in AGENT-1-PROMPT.md.

Read the full prompt carefully, understand the context files, and conduct deep research on ALL TTS providers as of January 2025.

Your goal: Create a detailed research report that ranks TTS providers by "mind-blowing human-like quality" for audiobook narration, with clear recommendations.

Output format: Create the report following the structure specified in the prompt.

Take your time, be thorough, cite sources, and prioritize QUALITY over speed.

Ready to begin?
```

4. Let the AI work through the research
5. Save output to: `docs/research/voice-research-outputs/phase-1-foundation/agent-1-tts-landscape.md`

---

### **Agent 3: Dr. Sarah Chen (Audio Neuroscience Researcher)**

**Recommended Model in Cursor:** GPT-4o or Claude Opus
**Why:** Excellent for scientific research synthesis, psychology, and neuroscience

**Steps:**
1. Open NEW Cursor window/tab (keep Agent 1 separate)
2. Load these files into context:
   - `docs/research/voice-research-outputs/phase-1-foundation/AGENT-3-PROMPT.md`
   - `docs/research/VOICE_ENHANCEMENT_TO_MINDBLOWING_PLAN.md`
   - `scripts/generate-multi-voice-demo-audio.js`

3. Copy-paste this prompt:
```
You are Dr. Sarah Chen, an Audio Neuroscience Researcher with a PhD from MIT Media Lab and 15 years studying voice perception.

I need you to conduct comprehensive research following the instructions in AGENT-3-PROMPT.md.

Read the full prompt carefully and conduct deep research on:
- Neuroscience of voice authenticity detection
- What makes voices sound "human" vs "AI"
- Quantified acoustic targets for "mind-blowing" quality
- ESL-specific considerations

Your goal: Create a scientific foundation with QUANTIFIED targets (pitch variation in semitones, pause durations in ms, etc.) that audio engineers can implement.

Output format: Create the report following the structure specified in the prompt.

Cite peer-reviewed research, provide specific numbers, and translate neuroscience into practical targets.

Ready to begin?
```

4. Let the AI work through the research
5. Save output to: `docs/research/voice-research-outputs/phase-1-foundation/agent-3-perception-psychology.md`

---

## ⏱️ Timeline

**Expected Duration:** 2-4 hours for both agents (can run in parallel)

**Agent 1:** Deep TTS provider research with demos/comparisons (2-3 hours)
**Agent 3:** Scientific literature review and analysis (2-3 hours)

---

## ✅ Quality Checks

### **Agent 1 Report Should Include:**
- [ ] Comprehensive survey of 10+ TTS providers
- [ ] 8-10 examples of "mind-blowing" TTS quality with links
- [ ] Comparison matrix with weighted scoring
- [ ] Clear top recommendation with justification
- [ ] ElevenLabs model deep dive (if staying with them)
- [ ] Cost analysis for our scale (~84 files)
- [ ] Risks and alternatives identified

### **Agent 3 Report Should Include:**
- [ ] Neuroscience explanation of voice authenticity detection
- [ ] Quantified targets for all 4 criteria (Liveness, Emotional Range, Pacing, Warmth)
- [ ] Professional narrator analysis (top Audible narrators)
- [ ] ESL-specific recommendations by CEFR level
- [ ] Testing methodology for validation
- [ ] Complete "Perfect Audiobook Voice Profile" specification
- [ ] All claims cited with research sources

---

## 🔄 After Completion

Once BOTH agents complete their research:

1. **Review Findings:**
   - Read both reports thoroughly
   - Note any contradictions or overlaps
   - Identify key insights

2. **Decision Gate:**
   - Should we switch from ElevenLabs? (Agent 1 recommendation)
   - What are the quantified targets? (Agent 3 specifications)
   - Are findings aligned?

3. **Next Steps:**
   - Proceed to Phase 2 (Audio Production + Provider Optimization)
   - OR: Pivot based on findings (if better alternative discovered)

---

## 💡 Tips for Best Results

### **For Agent 1 (TTS Landscape):**
- Encourage the AI to actually test providers via web demos if possible
- Ask for specific links to demo audio
- Push for skepticism - verify marketing claims
- Request cost calculations for our specific scale

### **For Agent 3 (Perception Psychology):**
- Ask for specific semitone ranges, Hz frequencies, dB levels
- Request citations for every major claim
- Push for practical engineering targets, not just theory
- Emphasize ESL learner needs

### **General:**
- If a report seems shallow, ask the AI to go deeper
- Request sources and citations
- Ask for specific examples
- Don't accept vague statements - push for numbers

---

## 📞 If You Get Stuck

**Agent doesn't understand the persona:**
- Re-paste the full prompt from the AGENT-X-PROMPT.md file
- Emphasize: "Stay in character as Dr. [Name]"

**Research seems incomplete:**
- Ask: "Have you addressed all research questions in the prompt?"
- Request: "Please expand section X with more depth"

**Too generic/not specific enough:**
- Push back: "I need specific numbers, not general statements"
- Request: "Cite peer-reviewed sources for this claim"

---

## 🎬 Ready to Execute

You now have everything needed to run Phase 1 research:
- ✅ Master plan documented
- ✅ Detailed agent prompts with personas
- ✅ Context files identified
- ✅ Execution instructions clear
- ✅ Quality criteria defined

**Recommendation:** Start both agents in parallel (separate Cursor windows) and let them work simultaneously. Review both reports when complete before proceeding to Phase 2.

**Good luck! The quality of this research will determine the success of our entire voice enhancement strategy.**
