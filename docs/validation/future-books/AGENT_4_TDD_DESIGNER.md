# Agent 4: TDD Test Suite Designer Instructions

## Your Mission
Design comprehensive test specifications that will guarantee the continuous scroll system meets all performance, sync, and reliability requirements.

## Context
**Why TDD**: Tests will be written BEFORE implementation to ensure we build exactly what's needed and catch issues early.

**Critical Success Metrics**:
- Audio startup <100ms
- Perfect sentence boundary matching
- 60fps scroll performance
- <200MB memory usage
- Zero audio gaps
- 99% word highlighting accuracy

## Files You Must Review
1. `/docs/research/FUTURE_BOOKS_ARCHITECTURE_RESEARCH.md` - Success criteria
2. `/hooks/useAutoAdvance.ts` - Current timing logic to test against
3. `/lib/highlighting-manager.ts` - Highlighting accuracy requirements
4. Current test examples in codebase (if any)

## Test Categories to Design

### 1. Performance Tests
```javascript
// Example format you should follow
describe('Audio Performance', () => {
  test('audio starts within 100ms of click', async () => {
    // Your test specification here
  });
});
```

Required tests:
- Audio startup time from click
- Scroll performance (FPS measurement)
- Memory usage monitoring
- Network latency handling
- CPU usage during playback

### 2. Synchronization Tests
- Sentence boundary consistency
- Audio-text alignment accuracy
- Highlighting precision
- Drift detection over time
- CEFR level switching sync

### 3. Reliability Tests
- 30-minute continuous playback
- Network interruption recovery
- Memory leak detection
- Browser compatibility
- Mobile performance

### 4. Data Integrity Tests
- Migration accuracy
- Sentence tokenization consistency
- Path collision prevention
- Progress preservation
- Rollback verification

### 5. Edge Case Tests
- Books with 1M+ words
- Rapid clicking between sentences
- Offline mode transitions
- Low memory scenarios
- Slow network conditions

## Test Implementation Strategy
For each test, specify:
1. **Setup**: What needs to be mocked/prepared
2. **Execution**: Exact steps to perform
3. **Assertion**: What constitutes pass/fail
4. **Cleanup**: Resources to release

## Performance Benchmarks
Research and define:
- Industry standard benchmarks
- Competitor performance numbers
- Acceptable variance ranges
- Failure thresholds

## Your Output Format
Create: `/docs/validation/future-books/AGENT_4_FINDINGS.md`

Structure your findings as:
```markdown
# TDD Test Suite Specifications

## 🎯 Critical Path Tests (Must Pass)
```javascript
// 1. Audio Startup Test
test('audio starts within 100ms', async () => {
  // Arrange
  const sentence = await renderSentence(5);

  // Act
  const startTime = performance.now();
  await sentence.click();
  await waitForAudioStart();

  // Assert
  expect(performance.now() - startTime).toBeLessThan(100);
});

// 2. [Next critical test]
```

## 📊 Performance Benchmark Tests
```javascript
// Tests with specific numbers
```

## 🔄 Integration Tests
```javascript
// End-to-end flows
```

## 🧪 Stress Tests
```javascript
// Edge cases and limits
```

## 📋 Test Execution Plan
| Phase | Tests | When to Run | Pass Criteria |
|-------|--------|------------|---------------|
| Pre-implementation | Critical path | Before coding | 100% designed |
| During development | Unit tests | Every commit | 100% pass |
| Pre-production | All tests | Before deploy | 95% pass |

## 🚨 Failure Triggers
If these tests fail, STOP deployment:
1. [Test name]: [Why critical]

## 📈 Success Metrics
- Test coverage target: X%
- Performance regression threshold: X%
- Acceptable failure rate: X%

## Test Confidence Score: X/100
[Will these tests guarantee success?]
```

## Time Limit: 30 minutes