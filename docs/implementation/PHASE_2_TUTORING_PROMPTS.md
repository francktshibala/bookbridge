# Phase 2: Tutoring Prompts Implementation

## Overview
Replace essay-style academic prompts with conversational tutoring templates that encourage dialogue and discovery.

## Priority: CRITICAL (Week 5)
Essential for transforming responses from Wikipedia-style to engaging tutoring.

## Technical Requirements

### 1. Prompt Template System

```typescript
// lib/ai/prompts/tutoring-templates.ts
export const TUTORING_TEMPLATES = {
  initial: {
    base: `You are a warm, encouraging literature tutor having a one-on-one conversation with a student.

CONVERSATION STYLE:
- Speak naturally, like a friendly teacher
- Use "I" and "you" to create personal connection
- Maximum 2-3 paragraphs per response
- End with ONE thought-provoking question

AVOID:
- Academic essays or lectures
- Multiple paragraph explanations
- Listing multiple points
- Formal academic language

Current question: {query}
Book context: {bookContext}`,
    
    withMemory: `Previous discussion:
{conversationContext}

Now the student asks: {query}

Build naturally on what you've discussed. Reference specific points from earlier.`
  },
  
  socratic: {
    base: `Guide the student to discover the answer themselves.

APPROACH:
1. Acknowledge their question warmly
2. Ask ONE clarifying question to understand their thinking
3. Provide a small insight or hint
4. End with a question that leads them toward the answer

Never give the full answer directly in the first response.

Student's question: {query}`
  },
  
  followUp: {
    base: `The student is continuing our discussion. They just said: "{query}"

This might be:
- An answer to your previous question
- A follow-up thought
- A request for clarification

Respond naturally as their tutor, building on the conversation flow.`
  }
};
```

### 2. Prompt Selection Logic

```typescript
// lib/ai/prompts/prompt-selector.ts
export class PromptSelector {
  selectTemplate(
    query: string,
    conversationHistory: Message[],
    userProfile: UserProfile
  ): PromptTemplate {
    // Detect query type
    const queryType = this.detectQueryType(query);
    const isFollowUp = this.isFollowUpQuery(query, conversationHistory);
    
    if (isFollowUp) {
      return TUTORING_TEMPLATES.followUp;
    }
    
    if (queryType === 'analytical' && userProfile.readingLevel !== 'beginner') {
      return TUTORING_TEMPLATES.socratic;
    }
    
    return TUTORING_TEMPLATES.initial;
  }
  
  private isFollowUpQuery(query: string, history: Message[]): boolean {
    if (history.length === 0) return false;
    
    // Short responses often indicate follow-up
    if (query.split(' ').length < 10) return true;
    
    // Check for continuation words
    const continuationPatterns = /^(yes|no|maybe|but|and|so|well|okay|sure|hmm)/i;
    return continuationPatterns.test(query);
  }
}
```

### 3. Update Claude Service

```typescript
// Modify lib/ai/claude-service.ts
private optimizePrompt(
  prompt: string, 
  bookContext?: string, 
  conversationContext?: ConversationContext,
  responseMode: 'brief' | 'detailed' = 'detailed'
): string {
  const selector = new PromptSelector();
  const template = selector.selectTemplate(
    prompt,
    conversationContext?.messages || [],
    conversationContext?.userProfile || {}
  );
  
  // Replace template variables
  let optimized = template.base
    .replace('{query}', prompt)
    .replace('{bookContext}', bookContext || '')
    .replace('{conversationContext}', this.formatConversationHistory(conversationContext));
  
  // Add response length guidance
  if (responseMode === 'brief') {
    optimized += '\n\nKeep your response to 1-2 short paragraphs.';
  }
  
  return optimized;
}
```

## Success Criteria

1. **Response Length**: Average response 150-300 words (down from 800+)
2. **Engagement**: 70% of responses end with questions
3. **Conversation Flow**: Natural dialogue feel in 90% of exchanges
4. **User Satisfaction**: "Feels like talking to a tutor" feedback

## Time Estimate: 1 Week

- Day 1-2: Create comprehensive prompt templates
- Day 3: Implement prompt selection logic
- Day 4-5: Integrate with Claude service
- Day 6-7: Testing and refinement

## Dependencies

- Conversation memory (to detect follow-ups)
- User profiles (for adaptation)

---

**NOTE: Implementation continues with remaining phases in next session due to time constraints.**

## IMPLEMENTATION ROADMAP SUMMARY

### Completed Documentation:
✅ PHASE_1_CONVERSATION_MEMORY.md
✅ PHASE_1_STORY_ONBOARDING.md
✅ PHASE_1_HOVER_DEFINITIONS.md
✅ PHASE_2_SPACED_REPETITION.md
✅ PHASE_2_SEMANTIC_SEARCH.md
✅ PHASE_2_TUTORING_PROMPTS.md

### To Be Documented Next Session:
- PHASE_3_CONTEXT_AWARENESS.md (Reading context detection)
- PHASE_3_SOCRATIC_PROGRESSION.md (Bloom's taxonomy questioning)
- PHASE_3_EMOTIONAL_TRACKING.md (Literary soul mapping)
- PHASE_3_LEARNING_PATHS.md (Personalized book sequences)
- PHASE_3_REALTIME_ADAPTATION.md (Learning from user feedback)

### Additional Features to Document:
- Character relationship mapping
- Cross-book theme connections
- Reading achievement system
- Mobile-specific optimizations
- Privacy-first architecture

Each phase builds on previous ones, creating a comprehensive AI tutoring system that transforms BookBridge from generic Q&A to personalized literary education.