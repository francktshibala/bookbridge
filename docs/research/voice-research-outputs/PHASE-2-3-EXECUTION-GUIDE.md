# Phase 2 & 3 Research Execution Guide

## 🎯 Overview

Execute the remaining 3 research agents to complete our voice enhancement research:
- **Phase 2:** Agent 2 (Audio Production) + Agent 4 (ElevenLabs Optimization)
- **Phase 3:** Agent 5 (Sync Preservation & Testing)

---

## 📋 Agent Launch Instructions

### **AGENT 2 (Audio Production Engineer) - Use in Cursor:**

**Model:** Claude Sonnet 4 or GPT-4o

**Add to context:**
- `docs/research/voice-research-outputs/phase-2-optimization/AGENT-2-PROMPT.md`
- `docs/research/voice-research-outputs/phase-1-foundation/agent-3-perception-psychology.md`
- `docs/research/VOICE_ENHANCEMENT_TO_MINDBLOWING_PLAN.md`
- `scripts/generate-multi-voice-demo-audio.js`

**Paste this:**
```
You are Jake Martinez, Audio Production Engineer (20 years, 5x Grammy-nominated audiobook mastering specialist).

Read AGENT-2-PROMPT.md carefully - it contains your complete research mission, persona, and all research questions.

Execute the research exactly as specified. Your goal: Design production-ready FFmpeg mastering chains (male/female optimized) that create "$500/hour studio quality" while preserving audio duration.

When complete, output your findings as a markdown report following the structure in the prompt.

Begin research now.
```

**Expected Output:** `docs/research/voice-research-outputs/phase-2-optimization/agent-2-audio-production.md`

---

### **AGENT 4 (ElevenLabs Optimization) - Use in Cursor:**

**Model:** Claude Sonnet 4 or GPT-4o

**Add to context:**
- `docs/research/voice-research-outputs/phase-2-optimization/AGENT-4-PROMPT.md`
- `docs/research/voice-research-outputs/phase-1-foundation/agent-1-tts-landscape.md`
- `docs/research/voice-research-outputs/phase-1-foundation/PHASE-1-SYNTHESIS.md`
- `docs/research/VOICE_CASTING_GUIDE.md`
- `scripts/generate-multi-voice-demo-audio.js`

**Paste this:**
```
You are Dr. Lisa Chen, ElevenLabs Power User & Optimization Specialist (8 years optimizing ElevenLabs, top Discord contributor).

Read AGENT-4-PROMPT.md carefully - it contains your complete research mission, persona, and all research questions.

Execute the research exactly as specified. Your goal: Optimize ElevenLabs Multilingual v2 parameters for our 14 specific voices, validate community best practices, and ensure timing safety.

When complete, output your findings as a markdown report following the structure in the prompt.

Begin research now.
```

**Expected Output:** `docs/research/voice-research-outputs/phase-2-optimization/agent-4-elevenlabs-optimization.md`

---

### **AGENT 5 (Sync Preservation & Testing) - Use in Cursor:**

**Model:** Claude Sonnet 4 (best for technical precision)

**Add to context:**
- `docs/research/voice-research-outputs/phase-3-safety/AGENT-5-PROMPT.md`
- `docs/research/voice-research-outputs/phase-1-foundation/PHASE-1-SYNTHESIS.md`
- `docs/AUDIO_SYNC_IMPLEMENTATION_GUIDE.md`
- `docs/MASTER_MISTAKES_PREVENTION.md`
- `scripts/generate-multi-voice-demo-audio.js`

**Paste this:**
```
You are Dr. Emily Rodriguez, Synchronization Systems Engineer (PhD, 10 years in audio-video sync, former Netflix/YouTube engineer).

Read AGENT-5-PROMPT.md carefully - it contains your complete research mission, persona, and all research questions.

Execute the research exactly as specified. Your goal: Design comprehensive testing framework to ensure <5% drift requirement while validating "mind-blowing" quality improvements.

When complete, output your findings as a markdown report following the structure in the prompt.

Begin research now.
```

**Expected Output:** `docs/research/voice-research-outputs/phase-3-safety/agent-5-sync-preservation.md`

---

## 🔄 Execution Strategy

### **Option 1: Sequential (Recommended for Thoroughness)**

**Week 1:**
1. Run Agent 2 (Audio Production) - 2-3 hours
2. Review findings
3. Run Agent 4 (ElevenLabs Optimization) - 2-3 hours
4. Review findings

**Week 2:**
1. Run Agent 5 (Sync Preservation) - 2-3 hours
2. Review findings
3. Proceed to Phase 4 (Final Synthesis)

**Benefit:** Each agent can build on previous findings, deeper integration

---

### **Option 2: Parallel Phase 2 (Faster)**

**Day 1:**
- Run Agent 2 and Agent 4 in parallel (separate Cursor windows)
- Both research independently for 2-3 hours

**Day 2:**
- Review both Agent 2 and Agent 4 reports
- Cross-reference findings

**Day 3:**
- Run Agent 5 (needs Agents 2 & 4 complete)

**Benefit:** Faster completion (3 days vs 1-2 weeks)

---

## ✅ Quality Checks

### **Agent 2 Report Should Include:**
- [ ] Complete FFmpeg chains (male and female optimized)
- [ ] All effects verified as duration-preserving
- [ ] Exact frequency targets (Hz, dB, Q factors)
- [ ] Professional studio workflow comparison
- [ ] A/B testing methodology
- [ ] "Warmth blueprint" with harmonic enhancement details

### **Agent 4 Report Should Include:**
- [ ] Optimal parameters for all 14 voices
- [ ] Community-validated "sweet spot" ranges
- [ ] SSML enhancement guide (safe tags only)
- [ ] Timing predictability analysis (v2 vs v1)
- [ ] Cost-quality trade-off analysis
- [ ] Troubleshooting playbook

### **Agent 5 Report Should Include:**
- [ ] Risk assessment matrix for all enhancements
- [ ] Incremental testing protocol with gates
- [ ] Statistical validation framework
- [ ] Automated validation tools specification
- [ ] A/B testing protocol (perceptual validation)
- [ ] Rollback procedures
- [ ] Success metrics with targets

---

## 🎬 After All 3 Agents Complete

**Next Steps:**
1. Read all three reports thoroughly
2. Cross-reference findings for conflicts/synergies
3. Proceed to Phase 4: Final Synthesis (Agent 6)
4. Create definitive implementation roadmap

**Key Questions to Answer:**
- Do Agent 2's FFmpeg chains align with Agent 3's neuroscience targets?
- Do Agent 4's parameters work with Agent 2's post-processing?
- Does Agent 5's testing framework validate all enhancements safely?
- Are there any conflicts between agents' recommendations?

---

## 💡 Tips for Best Results

### **For Agent 2 (Audio Production):**
- Push for exact FFmpeg commands (not conceptual)
- Request before/after frequency analysis examples
- Ask for duration-preservation verification for each effect
- Ensure gender-specific optimization is detailed

### **For Agent 4 (ElevenLabs Optimization):**
- Request voice-by-voice parameter tables
- Push for community source citations (Discord/Reddit links)
- Ask for timing drift validation methodology
- Ensure SSML recommendations are timing-safe

### **For Agent 5 (Sync Preservation):**
- Request statistical confidence levels for all tests
- Push for specific sample sizes (not "several tests")
- Ask for automated script specifications
- Ensure rollback procedures are detailed

---

## 📊 Progress Tracking

```
Phase 1: ✅ COMPLETE
├── Agent 1 (TTS Landscape): ✅ Complete
└── Agent 3 (Perception Psychology): ✅ Complete

Phase 2: ⏳ PENDING
├── Agent 2 (Audio Production): ⏳ To Do
└── Agent 4 (ElevenLabs Optimization): ⏳ To Do

Phase 3: ⏳ PENDING
└── Agent 5 (Sync Preservation): ⏳ To Do

Phase 4: ⏳ PENDING
└── Agent 6 (Final Synthesis): ⏳ To Do
```

---

**Ready to execute! Choose your strategy (sequential vs parallel) and launch the agents. All prompt files are ready.**
