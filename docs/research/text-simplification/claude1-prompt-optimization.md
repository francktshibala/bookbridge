# Prompt Engineering & CEFR Alignment Optimization
**Agent 1 Deliverable: Prompt Optimization for A1/A2 Text Simplification**

## Executive Summary

After comprehensive analysis of the current implementation, I've identified critical issues with A1/A2 simplification failures:

1. **Overly Conservative Prompts**: Current A1/A2 prompts for archaic text preserve too much original structure
2. **Fixed Low Temperature**: Temperature stuck at 0.3 for all levels (should vary by CEFR level)
3. **Contradictory Retry Logic**: Retries become MORE conservative, worsening the problem
4. **Insufficient Vocabulary Enforcement**: Prompts don't aggressively enforce CEFR word limits

## Current Issues Analysis

### Problem 1: Conservative Archaic Text Handling
Current A1 prompt for Shakespeare:
```
"Gently update this early-modern text...
- Change only the most archaic words
- Keep most of the original sentence structure
- PRESERVE the poetic flow and rhythm"
```
**Issue**: "Gently" and "PRESERVE" instructions prevent necessary simplification for A1 learners.

### Problem 2: Temperature Strategy
- Current: Fixed 0.3 for all levels and retries
- Research shows: 0.2-0.35 recommended, but should START higher for creative rewriting
- Missing: Dynamic temperature based on CEFR level and retry attempt

### Problem 3: Retry Logic Contradiction
Current retry adds:
```
"Be MORE CONSERVATIVE this time:
- Make smaller changes to vocabulary
- Keep more of the original sentence structure"
```
**Issue**: If initial attempt failed similarity check, being MORE conservative won't help!

## Optimized Prompt Templates

### A1 - Beginner (500-1000 words)

#### Standard Text
```
Transform this text for A1 beginner English learners (500-1000 word vocabulary):

REQUIREMENTS:
- Use ONLY the 500 most common English words
- Replace ALL difficult words - no exceptions
- Maximum 5-8 words per sentence
- Use only present tense
- Remove ALL complex grammar

AGGRESSIVE SIMPLIFICATION:
- Completely rewrite if needed for clarity
- Break every long sentence into 2-3 short ones
- Replace abstract concepts with concrete examples
- Remove metaphors - use literal language only

Text: "{text}"

Output only the simplified text.
```

#### Archaic Text (Shakespeare, etc.)
```
COMPLETELY MODERNIZE this {era} text for A1 beginners:

MANDATORY CHANGES:
- Replace ALL archaic words immediately:
  thou/thee/thy → you/your
  art/hast/doth → are/have/does
  wherefore → why, whither → where
- Convert ALL old grammar to modern English
- Break EVERY sentence to 5-8 words maximum
- Use ONLY present tense

AGGRESSIVE REWRITING:
- Don't preserve poetic structure - clarity is priority
- Rewrite entire passages if needed
- Use only 500 most common English words
- Make it sound like modern everyday English

PRESERVE ONLY:
- Character names
- Basic plot events
- Core meaning

Text: "{text}"

Output the completely modernized, simple text.
```

### A2 - Elementary (1000-2750 words)

#### Standard Text
```
Simplify this text for A2 elementary learners (1000-2750 word vocabulary):

STRICT REQUIREMENTS:
- Use only the 1000-2750 most common words
- Sentences: 8-12 words maximum
- Use only simple present and past tense
- Basic connectors only: and, but, because, so

SIMPLIFICATION RULES:
- Replace every difficult word with common alternatives
- Break all complex sentences
- Remove idioms and metaphors
- Explain essential context briefly in-text

Text: "{text}"

Output only simplified text.
```

#### Archaic Text
```
MODERNIZE this {era} text for A2 elementary learners:

REQUIRED MODERNIZATION:
- Update ALL archaic vocabulary:
  ye/thou/thee → you
  dost/doth/hath → do/does/has
  'tis/'twas → it is/it was
- Convert ALL old grammar patterns
- Maximum 8-12 words per sentence

VOCABULARY LIMITS:
- Use only 1000-2750 most common English words
- Replace ALL difficult or archaic terms
- Simplify or remove complex metaphors

KEEP:
- Main story events
- Character relationships
- Essential meaning

Text: "{text}"

Output modernized, simplified text.
```

### B1 - Intermediate (2750-3250 words)

```
Adapt this text for B1 intermediate learners:

VOCABULARY: 2750-3250 word range
- Replace specialized/archaic terms with common equivalents
- Keep common idioms but explain if needed

GRAMMAR:
- Use common tenses (present, past, future, present perfect)
- Break sentences over 15 words
- Clear subject-verb-object structure

{ERA_SPECIFIC_INSTRUCTIONS}

PRESERVE:
- Story details and plot development
- Character emotions and relationships
- Important cultural context (explained simply)

Text: "{text}"

Output adapted text only.
```

### B2 - Upper-Intermediate (3250-5000 words)

```
Refine this text for B2 upper-intermediate learners:

VOCABULARY: 3250-5000 word range
- Clarify technical or archaic terms
- Keep sophisticated vocabulary if within range

STRUCTURE:
- Simplify overly complex sentences
- Maintain paragraph coherence
- Keep literary devices but ensure clarity

{ERA_SPECIFIC_INSTRUCTIONS}

MAINTAIN:
- Author's tone and style
- All plot details
- Cultural and historical references

Text: "{text}"

Output refined text only.
```

### C1/C2 - Advanced (4000+ words)

```
Polish this text for C1/C2 advanced learners:

GOALS:
- Enhance clarity without losing sophistication
- Modernize only severely archaic expressions
- Improve flow and coherence

PRESERVE:
- All nuance and complexity
- Literary devices and style
- Original tone and voice

Text: "{text}"

Output polished text only.
```

## Temperature Strategy

### Dynamic Temperature by Level and Attempt

| CEFR Level | Initial Temp | Retry 1 | Retry 2 | Rationale |
|------------|-------------|---------|---------|-----------|
| A1 | 0.45 | 0.40 | 0.35 | Need creative rewriting for archaic text |
| A2 | 0.40 | 0.35 | 0.30 | Moderate creativity for simplification |
| B1 | 0.35 | 0.30 | 0.25 | Balance preservation and clarity |
| B2 | 0.30 | 0.25 | 0.20 | More conservative for upper levels |
| C1 | 0.25 | 0.20 | 0.15 | Minimal changes needed |
| C2 | 0.20 | 0.15 | 0.10 | Very conservative refinement |

### Implementation Code
```typescript
const getTemperature = (level: CEFRLevel, attempt: number): number => {
  const temps = {
    A1: [0.45, 0.40, 0.35],
    A2: [0.40, 0.35, 0.30],
    B1: [0.35, 0.30, 0.25],
    B2: [0.30, 0.25, 0.20],
    C1: [0.25, 0.20, 0.15],
    C2: [0.20, 0.15, 0.10]
  }
  return temps[level][Math.min(attempt, 2)]
}
```

## Retry Logic Optimization

### Current Problem
Retries become MORE conservative, which is counterproductive when the issue is insufficient simplification.

### New Retry Strategy

#### Retry 1: More Aggressive
```
RETRY ATTEMPT 1 - MORE AGGRESSIVE SIMPLIFICATION:
The previous attempt didn't simplify enough. This time:
- Make BIGGER changes to vocabulary
- COMPLETELY rewrite complex sentences
- Prioritize clarity over preservation
- Use simpler words from the allowed vocabulary
```

#### Retry 2: Different Approach
```
RETRY ATTEMPT 2 - ALTERNATIVE APPROACH:
Previous attempts struggled with this text. Try a different strategy:
- Focus on conveying the CORE MESSAGE only
- Remove non-essential details if needed
- Use the SIMPLEST possible language
- It's OK to lose some nuance for clarity
```

## Era-Specific Instructions

### Early Modern (Shakespeare, Marlowe)
```
ERA: Early Modern English
MANDATORY UPDATES:
- ALL pronouns: thou→you, thee→you, thy→your, thine→yours
- ALL verbs: art→are, hast→have, doth→does, hath→has
- ALL contractions: 'tis→it is, o'er→over, e'en→even
- Fix ALL inverted word order to modern SVO
```

### Victorian (Austen, Dickens, Brontë)
```
ERA: Victorian English
UPDATES NEEDED:
- Break ALL periodic sentences at clause boundaries
- Modernize formal terms: "propriety"→"proper behavior"
- Simplify social conventions with brief explanations
- Update archaic expressions to modern equivalents
```

### 19th-Century American (Twain, Hawthorne)
```
ERA: 19th-Century American
MODERNIZATION:
- Standardize dialect: ain't→isn't, reckon→think
- Update regional terms to modern equivalents
- Clarify historical references briefly
- Simplify elaborate descriptions
```

## Validation Examples

### Example 1: Shakespeare (A1)

**Original:**
"To be, or not to be, that is the question:
Whether 'tis nobler in the mind to suffer
The slings and arrows of outrageous fortune,
Or to take arms against a sea of troubles,
And by opposing end them?"

**Expected A1 Output:**
"Should I live or die? That is my question.
Is it better to accept bad things that happen?
Or should I fight against my problems?
If I fight, maybe I can end them."

**Key Changes:**
- Metaphors removed ("slings and arrows" → "bad things")
- Abstract concepts simplified ("nobler" → "better")
- Sentence length: 5-8 words
- Vocabulary: ~500 most common words

### Example 2: Austen (A2)

**Original:**
"It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife."

**Expected A2 Output:**
"Everyone believes this is true. If a man is single and rich, he must want to get married."

**Key Changes:**
- Period sentence split into two
- Formal language simplified
- Kept the ironic meaning
- Vocabulary: ~1000 words

### Example 3: Dickens (B1)

**Original:**
"It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness..."

**Expected B1 Output:**
"It was both the best time and the worst time. It was a period when people were both wise and foolish..."

**Key Changes:**
- Parallel structure simplified but maintained
- Repetition reduced
- Core contrasts preserved
- Vocabulary: ~1500 words

## Implementation Recommendations

### 1. Immediate Changes Required
```typescript
// In route.ts, update temperature handling:
const temperature = getTemperature(cefrLevel, attempt)

// Update retry logic:
const retryInstructions = attempt > 0 ? 
  getRetryInstructions(attempt, cefrLevel) : ''

// Use assertive prompts for A1/A2:
const prompt = cefrLevel === 'A1' || cefrLevel === 'A2' ?
  getAssertivePrompt(cefrLevel, era, text) :
  getStandardPrompt(cefrLevel, era, text)
```

### 2. Similarity Threshold Adjustments
For A1/A2 with archaic text, consider:
- A1: Accept 0.45+ similarity (currently 0.488)
- A2: Accept 0.50+ similarity (currently 0.520)
- Rationale: Greater transformation needed = lower similarity expected

### 3. Vocabulary Enforcement
Add explicit vocabulary checking:
```typescript
const checkVocabulary = (text: string, level: CEFRLevel): boolean => {
  const limits = {
    A1: 1000,
    A2: 2750,
    B1: 3250,
    B2: 5000,
    C1: 6000,
    C2: 10000
  }
  // Implementation to verify vocabulary complexity
  return vocabularyComplexity <= limits[level]
}
```

## Success Metrics

### Target Performance by Level

| Level | Similarity Target | Vocabulary Limit | Success Rate |
|-------|------------------|------------------|--------------|
| A1 | 0.45-0.60 | 500-1000 | 95% |
| A2 | 0.50-0.65 | 1000-2750 | 95% |
| B1 | 0.60-0.75 | 2750-3250 | 90% |
| B2 | 0.70-0.85 | 3250-5000 | 90% |
| C1 | 0.80-0.95 | 4000-6000 | 85% |
| C2 | 0.85-0.98 | 6000+ | 85% |

### Quality Indicators
- **Excellent**: Similarity within target range, vocabulary compliant
- **Good**: Slightly outside range but readable
- **Acceptable**: Readable but needs improvement
- **Failed**: Below minimum thresholds

## Conclusion

The current implementation's conservative approach is fundamentally incompatible with A1/A2 learner needs. These learners require aggressive simplification that prioritizes comprehension over preservation. By implementing:

1. More assertive prompts that mandate transformation
2. Dynamic temperature starting higher for lower levels
3. Progressive retry strategies (more aggressive, not conservative)
4. Explicit vocabulary enforcement
5. Realistic similarity expectations

We can achieve reliable text simplification that actually serves beginner and elementary English learners while maintaining the core narrative and meaning of classic texts.

## Next Steps

1. Implement new prompt templates immediately
2. Update temperature strategy in claude-service.ts
3. Revise retry logic to be progressive, not regressive
4. Add vocabulary validation layer
5. Adjust similarity thresholds for A1/A2
6. Test with Shakespeare, Austen, and Dickens excerpts
7. Monitor success rates and adjust based on user feedback