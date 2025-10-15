# 3-Agent Investigation Plan for Sentence Jumping Implementation

## Agent 1: Current Architecture Analysis

### **Mission**
Analyze current AudioBookPlayer and BundleAudioManager architecture to understand how to implement professional-grade sentence jumping.

### **Context**
- **Goal:** Speechify-style instant sentence jumping - click any sentence, voice starts immediately
- **Challenge:** Audio files are bundled (4 sentences per bundle), not individual sentences
- **Current State:** Perfect highlighting, need cross-bundle jumping capability

### **Files to Analyze**
- `/lib/audio/AudioBookPlayer.ts` - Global sentence mapping and orchestration
- `/lib/audio/BundleAudioManager.ts` - Audio element management and bundle loading
- `/app/featured-books/page.tsx` - Current jump implementation and UI integration

### **Research Questions**
1. **Current Jump Logic:** How does the existing `jumpToSentence()` function work? Does it handle cross-bundle jumps?
2. **Bundle Loading:** How are bundles currently loaded? Is there any preloading logic?
3. **State Coordination:** How do AudioBookPlayer and BundleAudioManager coordinate during bundle switches?
4. **Sentence Mapping:** Is there a global sentence → bundle mapping? How is it structured?

### **Specific Analysis Tasks**
- Map current jump flow from UI click to audio playback
- Identify gaps in cross-bundle jumping capability
- Document bundle loading and caching patterns
- Analyze state coordination points and potential race conditions

### **Save Findings To**
Create file: `/docs/agent1-current-architecture.md` with detailed analysis of existing jumping capability and gaps to fill.

---

## Agent 2: Preloading Strategy Research

### **Mission**
Research optimal preloading strategies and bundle management for fast cross-bundle sentence jumping.

### **Context**
- **Constraint:** Must work with existing bundle system (can't switch to individual sentences)
- **Target:** <250ms perceived jump time across 902 bundles
- **Challenge:** Balance preloading performance vs memory/bandwidth usage

### **Research Areas**
1. **Web Audio Preloading Patterns**
   - HTMLAudioElement preload strategies
   - Browser caching vs blob storage
   - AbortController for canceling stale preloads

2. **Optimal Preload Windows**
   - Current ±1 bundles vs wider ranges
   - Dynamic radius based on usage patterns
   - Memory-aware preloading on low-end devices

3. **Bundle Loading Performance**
   - Supabase storage optimization
   - Preconnect and DNS prefetching
   - Progressive loading strategies

4. **Industry Best Practices**
   - How do audiobook apps handle large libraries?
   - Streaming vs preload trade-offs
   - User behavior patterns for reading navigation

### **Research Questions**
- What's the optimal preload window size for 902 bundles?
- How to implement adaptive preloading based on device capabilities?
- What are proven patterns for bundle caching and eviction?
- How to minimize perceived latency during cross-bundle jumps?

### **Save Findings To**
Create file: `/docs/agent2-preloading-strategy.md` with recommended preloading architecture and implementation patterns.

---

## Agent 3: Jump Flow Implementation

### **Mission**
Design the detailed jump flow implementation for same-bundle and cross-bundle sentence jumping with proper state coordination.

### **Context**
- **GPT-5 Recommendation:** Orchestrator-first design with AudioBookPlayer as single authority
- **Requirements:** Atomic transitions, operation tokens, hysteresis windows
- **SLA:** <250ms perceived latency, zero sentence skips, <100ms highlight drift

### **Files to Analyze**
- `/lib/audio/AudioBookPlayer.ts` - Orchestration patterns
- `/lib/audio/BundleAudioManager.ts` - Audio element control
- Current sentence highlighting and monitoring logic

### **Research Questions**
1. **Operation Tokens:** How to implement switchToken pattern to handle concurrent jumps?
2. **Atomic Transitions:** What's the safest way to switch between bundles without audio gaps?
3. **Suppression Windows:** How to coordinate the 120-200ms suppression with existing code?
4. **Error Handling:** How to handle failed bundle loads during jumps?

### **Specific Analysis Tasks**
- Design same-bundle vs cross-bundle jump flows
- Plan operation token implementation for concurrency safety
- Design atomic bundle switching with prepare→commit phases
- Map integration points with existing highlighting system

### **Investigation Focus**
- Analyze current pause/resume timing patterns for lessons
- Document exact state coordination requirements
- Design rollback strategies for failed jumps
- Plan metrics collection for jump performance

### **Save Findings To**
Create file: `/docs/agent3-jump-flow-design.md` with detailed implementation plan and state coordination patterns.

---

## **Instructions for Each Agent**

1. **Read all specified files completely**
2. **Focus on your specific research questions**
3. **Reference GPT-5's architecture recommendations** in your analysis
4. **Provide concrete technical implementation plans**
5. **Include specific code integration points and line references**
6. **Consider the existing bundle timing fix we just implemented**
7. **Design for 902 bundles scale and <250ms jump targets**
8. **Save findings to the specified markdown file in `/docs/` directory**

## **After All Agents Report Back**

We'll implement GPT-5's recommended solution:
1. **Global sentence mapping** with bundle index coordination
2. **Adaptive preloading** with ±1 bundles default
3. **Atomic jump transitions** with operation tokens
4. **Sub-250ms perceived latency** with optimistic UI updates
5. **Integration with existing highlighting** and timing systems

This will give us Speechify-level sentence jumping while maintaining our bundle architecture.