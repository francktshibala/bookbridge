# Text Simplification Evaluation & Similarity Gate Analysis

## Executive Summary
This research explores solutions to improve the similarity validation system for classic literature simplification, addressing the current challenges with archaic text validation while maintaining meaning preservation. The goal is to reduce false rejections while ensuring simplified text maintains the original meaning, with a focus on Victorian/Regency/19th-century American literature.

## Current System Analysis
- Similarity gate threshold: 0.82 (too strict for archaic texts)
- Performance on archaic texts: ~0.478 (failing)
- Latency requirement: <500ms
- Scope: Victorian/Regency/19th-century American literature
- Implementation: Simple threshold-based validation

## Metric Evaluation

### 1. Embedding Models Analysis

#### OpenAI text-embedding-3-large
- Pros:
  - State-of-the-art semantic understanding
  - Strong performance on modern English
  - Fast inference (<100ms)
  - Good at capturing contextual meaning
- Cons:
  - May struggle with archaic language nuances
  - Cost considerations for high volume
  - API dependency
- Recommendation: Use as primary embedding model with era-specific calibration

#### BERTScore
- Pros:
  - Token-level granularity
  - Strong correlation with human judgment
  - Open source, no API costs
  - Good for catching subtle meaning changes
- Cons:
  - Higher latency (potential >500ms)
  - Resource intensive
  - Requires GPU for optimal performance
- Recommendation: Use for offline validation and threshold calibration

#### Universal Sentence Encoder (USE)
- Pros:
  - Lightweight and fast (<50ms)
  - Good multilingual support
  - Local deployment possible
  - Consistent performance
- Cons:
  - Less nuanced than newer models
  - Fixed model size trade-offs
  - Limited archaic language understanding
- Recommendation: Use as fallback for high-throughput scenarios

### 2. Proposed Hybrid Approach

#### Primary Validation Pipeline
1. Fast Pre-check (USE)
   - Threshold: 0.65 for archaic texts
   - Purpose: Quick filter for obvious failures
   - Latency: ~30ms

2. Main Validation (text-embedding-3-large)
   - Era-specific thresholds:
     - Victorian/Regency: 0.70
     - 19th-century American: 0.75
     - Modern English: 0.82
   - Latency: ~80ms

3. Fallback Rules
   - Core noun preservation check
   - Negation preservation check
   - Named entity matching
   - Latency: ~20ms

Total Pipeline Latency: ~130ms

### 3. Era-Specific Thresholds

#### Victorian/Regency Era (1811-1901)
- Base threshold: 0.70
- Adjustments:
  - Formal dialogue: -0.05
  - Complex periodic sentences: -0.08
  - Social commentary passages: -0.03

#### 19th Century American (1800-1900)
- Base threshold: 0.75
- Adjustments:
  - Dialectal passages: -0.10
  - Colloquial speech: -0.07
  - Narrative prose: -0.02

#### Modern English (Post-1900)
- Base threshold: 0.82
- No adjustments needed

### 4. Fast Validator Design

```typescript
interface ValidationResult {
  isValid: boolean;
  score: number;
  failureReason?: string;
  metrics: {
    useScore: number;
    embeddingScore: number;
    ruleChecks: {
      nouns: boolean;
      negation: boolean;
      entities: boolean;
    };
  };
}

class FastValidator {
  private static readonly ERA_THRESHOLDS = {
    victorian: 0.70,
    american_19th: 0.75,
    modern: 0.82
  };

  async validate(
    original: string,
    simplified: string,
    era: 'victorian' | 'american_19th' | 'modern'
  ): Promise<ValidationResult> {
    // Parallel execution for speed
    const [useScore, embeddingScore, ruleChecks] = await Promise.all([
      this.getUSEScore(original, simplified),
      this.getEmbeddingScore(original, simplified),
      this.performRuleChecks(original, simplified)
    ]);

    const threshold = this.ERA_THRESHOLDS[era];
    const finalScore = this.calculateFinalScore(useScore, embeddingScore, ruleChecks);

    return {
      isValid: finalScore >= threshold,
      score: finalScore,
      metrics: {
        useScore,
        embeddingScore,
        ruleChecks
      }
    };
  }
}
```

### 5. Failure Prevention Rules

1. Core Noun Preservation
   - Extract and compare key nouns
   - Allow synonyms from era-specific dictionary
   - Weight: 30% of final score

2. Negation Integrity
   - Track negative constructions
   - Ensure logical equivalence
   - Weight: 25% of final score

3. Named Entity Consistency
   - Compare named entities
   - Allow standardized variations
   - Weight: 20% of final score

4. Semantic Structure
   - Compare dependency trees
   - Ensure logical flow preservation
   - Weight: 25% of final score

### 6. Test Harness & Acceptance Criteria

#### Test Categories
1. Era-specific passages (20 samples each)
2. Mixed complexity levels
3. Edge cases (dialect, archaic terms)
4. Known failure patterns

#### Acceptance Criteria
- Latency: P95 < 500ms
- False rejection rate: < 5%
- False acceptance rate: < 1%
- Memory usage: < 512MB
- CPU usage: < 50% single core

### 7. KPI Definitions

#### Primary Metrics
1. Semantic Preservation Score (SPS)
   - Formula: 0.4 * embedding_score + 0.3 * use_score + 0.3 * rule_checks
   - Target: > 0.85

2. Processing Speed
   - P95 Latency: < 500ms
   - P99 Latency: < 1000ms

3. Accuracy Rates
   - False Rejection Rate: < 5%
   - False Acceptance Rate: < 1%
   - Era-specific Accuracy: > 90%

#### Secondary Metrics
1. Resource Utilization
   - Memory: < 512MB
   - CPU: < 50% single core
   - API Costs: < $0.01 per validation

2. Quality Metrics
   - Human Evaluation Correlation: > 0.9
   - Style Preservation Score: > 0.8
   - Readability Delta: +/- 2 grade levels

## Next Steps

1. Implementation Priority
   - Deploy USE-based pre-check
   - Implement era-specific thresholds
   - Add core noun preservation check
   - Integrate embedding-based main validation

2. Validation & Testing
   - Create test corpus by era
   - Benchmark performance metrics
   - Conduct A/B testing

3. Monitoring & Optimization
   - Set up metric tracking
   - Implement automatic threshold adjustment
   - Create error analysis pipeline

4. Documentation & Training
   - Document threshold adjustment process
   - Create debugging guide
   - Establish monitoring procedures 