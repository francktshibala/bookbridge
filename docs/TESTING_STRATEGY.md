# BookBridge ESL Testing Strategy

## Executive Summary

This comprehensive testing strategy ensures the ESL redesign delivers **reliable, accessible, and high-performance** reading experiences while preventing the most common bugs that plague TTS-enabled educational apps. Our approach prioritizes **simplicity over complexity** and focuses on testing the critical user journeys that matter most for ESL learners.

**Key Goals:**
- Catch bugs before production through automated testing  
- Validate ESL features with real book content
- Ensure TTS works reliably across all providers
- Maintain WCAG 2.1 AA accessibility compliance  
- Guarantee mobile responsiveness for global ESL users
- Test semantic similarity gates and cultural context features

**Coverage Targets:**
- Unit Tests: 90%+ for critical ESL/TTS logic
- Integration Tests: 80%+ for user workflows
- E2E Tests: 100% for core ESL learner journey

## Overview

BookBridge implements a comprehensive testing strategy with accessibility compliance and ESL-specific features at its core. Our target is 80% code coverage with 100% WCAG 2.1 AA compliance verification, plus specialized testing for simplification accuracy and TTS continuity.

## Testing Pyramid

```
E2E Testing (10%)
├── Critical ESL user journeys
├── TTS continuity across chunks
├── Accessibility compliance
└── Mobile responsiveness

Integration Testing (20%)  
├── ESL simplification API tests
├── TTS provider reliability
├── Vocabulary system integration
└── Database SRS queries

Unit Testing (70%)
├── CEFR level validation  
├── Semantic similarity gates
├── Text tokenization & chunking
├── Component accessibility
└── Cultural context processing
```

## ESL-Specific Test Infrastructure

### Enhanced Jest Configuration

```typescript
// Enhanced jest.config.js for ESL testing
const customJestConfig = {
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js', 
    '<rootDir>/test-utils/esl-test-setup.js'
  ],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    // Mock audio APIs for TTS testing
    'web-speech-api': '<rootDir>/__mocks__/web-speech-api.js',
    'elevenlabs-websocket': '<rootDir>/__mocks__/elevenlabs-websocket.js'
  },
  testEnvironment: 'jest-environment-jsdom',
  globalSetup: '<rootDir>/test-utils/global-setup.js',
  globalTeardown: '<rootDir>/test-utils/global-teardown.js',
  // ESL-specific test timeout for TTS operations
  testTimeout: 15000
}
```

### Real Book Content Fixtures

```typescript
// test-utils/esl-fixtures.ts
export const ESL_TEST_CONTENT = {
  levels: {
    A1: {
      appropriate: 'The cat is big. It sits on the chair. The chair is red.',
      challenging: 'The magnificent feline positioned itself regally upon the ornate furniture.',
      vocabulary: ['big', 'sits', 'red', 'chair', 'cat'],
      maxWords: 8,
      avgSentenceLength: 8
    },
    B1: {
      appropriate: 'Elizabeth walked through the garden thinking about her conversation with Mr. Darcy.',
      challenging: 'Elizabeth perambulated through the botanical environs, contemplating her discourse with the gentleman.',
      vocabulary: ['conversation', 'thinking', 'through', 'garden', 'walked'],
      maxWords: 15,
      avgSentenceLength: 18
    }
  },
  
  culturalReferences: {
    victorian: {
      'drawing-room': 'A formal living room in wealthy homes where guests were received',
      'entailment': 'A legal restriction on inheritance, usually to male heirs',
      'living': 'A church position that provided income to a clergyman'
    }
  },
  
  realBooks: {
    'pride-prejudice': {
      id: 'gutenberg-1342',
      challengingPassages: [
        { 
          chapter: 1, 
          text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
          difficulty: 'B2',
          culturalContext: ['universal truth', 'fortune', 'want of']
        }
      ]
    }
  }
}

// Custom Jest matchers for ESL testing
expect.extend({
  toMatchCEFRLevel(received: string, expectedLevel: string) {
    const analysis = analyzeCEFRComplexity(received, expectedLevel)
    return {
      pass: analysis.passesLevelConstraints,
      message: () => `Expected text to match ${expectedLevel} level constraints. 
        Issues: ${analysis.violations.join(', ')}`
    }
  },
  
  toHaveValidESLTokens(tokens: WordToken[], level: string) {
    const maxWords = ESL_TEST_CONTENT.levels[level]?.maxWords || 20
    const newWords = tokens.filter(t => !isKnownWord(t.text, level))
    
    return {
      pass: newWords.length <= maxWords,
      message: () => `Expected max ${maxWords} new words for ${level}, got ${newWords.length}`
    }
  },

  toHaveValidTiming(audioResult: TTSResult) {
    const hasWordTimings = audioResult.wordTimings?.length > 0
    const hasReasonableDuration = audioResult.totalDuration > 0 && audioResult.totalDuration < 300
    
    return {
      pass: hasWordTimings && hasReasonableDuration,
      message: () => `Expected valid TTS timing data with word boundaries and reasonable duration`
    }
  }
})
```

## Critical ESL Test Categories

### 1. CEFR Simplification Testing

```typescript
// __tests__/esl/simplification-accuracy.test.ts
describe('CEFR Simplification Accuracy', () => {
  const testCases = [
    { level: 'A1', maxWords: 8, avgSentenceLength: 8 },
    { level: 'A2', maxWords: 12, avgSentenceLength: 12 },
    { level: 'B1', maxWords: 18, avgSentenceLength: 18 },
    { level: 'B2', maxWords: 25, avgSentenceLength: 25 }
  ]

  testCases.forEach(({ level, maxWords, avgSentenceLength }) => {
    describe(`${level} level constraints`, () => {
      it('maintains vocabulary limits per chunk', async () => {
        const complexText = ESL_TEST_CONTENT.realBooks['pride-prejudice'].challengingPassages[0].text
        const simplified = await eslSimplifier.simplify(complexText, level)
        
        expect(simplified.content).toMatchCEFRLevel(level)
        
        const analysis = await cefrAnalyzer.analyze(simplified.content, level)
        expect(analysis.newWordsPerChunk).toBeLessThanOrEqual(maxWords)
        expect(analysis.averageSentenceLength).toBeLessThanOrEqual(avgSentenceLength)
      })

      it('preserves semantic meaning above 0.82 threshold', async () => {
        const originalText = 'The protagonist exhibited remarkable resilience despite overwhelming adversity.'
        const simplified = await eslSimplifier.simplify(originalText, level)
        
        const similarity = await semanticSimilarity(originalText, simplified.content)
        expect(similarity).toBeGreaterThanOrEqual(0.82)
      })

      it('adds appropriate cultural annotations', async () => {
        const victorianText = 'They spent the evening in the drawing-room discussing the entailment.'
        const result = await eslSimplifier.simplify(victorianText, level)
        
        expect(result.culturalAnnotations).toContainEqual({
          term: 'drawing-room',
          explanation: expect.stringContaining('living room')
        })
      })

      it('falls back gracefully when similarity fails', async () => {
        // Mock similarity check to fail
        jest.spyOn(semanticSimilarity, 'calculate').mockResolvedValue(0.75)
        
        const result = await eslSimplifier.simplify('Complex technical jargon', level)
        expect(result.usedFallback).toBe(true)
        expect(result.content).toBe('Complex technical jargon') // Returns original
        expect(result.fallbackReason).toBe('similarity-below-threshold')
      })
    })
  })

  it('processes real book content correctly for B1 level', async () => {
    const bookContent = await bookProcessor.getChunk('gutenberg-1342', 0)
    const simplified = await eslSimplifier.simplify(bookContent, 'B1')
    
    // Verify cultural annotations are added for Pride & Prejudice
    expect(simplified.culturalAnnotations).toContainEqual({
      term: 'entailment',
      explanation: expect.stringContaining('inheritance')
    })
    
    // Verify vocabulary is appropriate for B1
    const difficultWords = vocabularyAnalyzer.findDifficultWords(simplified.content, 'B1')
    expect(difficultWords.length).toBeLessThan(15) // Max 15 new words per chunk for B1
  })
})
```

### 2. TTS Provider Reliability Testing

```typescript
// __tests__/tts/provider-reliability.test.ts
describe('TTS Provider Reliability', () => {
  const providers = ['web-speech', 'openai', 'elevenlabs'] as const

  providers.forEach(provider => {
    describe(`${provider} provider`, () => {
      it('handles long text without breaking', async () => {
        const longText = Array.from({ length: 50 }, () => 
          'The quick brown fox jumps over the lazy dog.'
        ).join(' ')
        
        const service = new VoiceService(provider)
        const result = await service.speak(longText)
        
        expect(result.success).toBe(true)
        expect(result).toHaveValidTiming()
        expect(result.totalDuration).toBeGreaterThan(0)
      })

      it('provides word-level timing for highlighting', async () => {
        const testText = 'Hello world testing synchronization'
        const service = new VoiceService(provider)
        const result = await service.speak(testText)
        
        expect(result.wordTimings).toHaveLength(4)
        result.wordTimings.forEach((timing, index) => {
          expect(timing.word).toBeTruthy()
          expect(timing.startTime).toBeGreaterThanOrEqual(0)
          expect(timing.endTime).toBeGreaterThan(timing.startTime)
          
          // Verify timing sequence
          if (index > 0) {
            expect(timing.startTime).toBeGreaterThanOrEqual(
              result.wordTimings[index - 1].endTime
            )
          }
        })
      })

      it('maintains <100ms gaps between chunks', async () => {
        const chunks = [
          'First chunk of audio content for testing.',
          'Second chunk should follow smoothly.',
          'Third chunk completes the sequence.'
        ]
        
        const service = new VoiceService(provider)
        const gaps = await service.measureChunkTransitions(chunks)
        
        gaps.forEach(gap => {
          expect(gap).toBeLessThan(100) // <100ms requirement
        })
      })

      it('recovers gracefully from errors', async () => {
        const service = new VoiceService(provider)
        
        // Mock provider error
        jest.spyOn(service, 'callProvider').mockRejectedValueOnce(
          new Error('Network timeout')
        )
        
        const result = await service.speak('Test text with error handling')
        
        // Should fallback to Web Speech
        expect(result.provider).toBe('web-speech')
        expect(result.fallbackReason).toBe('provider-error')
        expect(result.success).toBe(true)
      })

      it('meets time-to-first-audio targets', async () => {
        const service = new VoiceService(provider)
        
        const startTime = Date.now()
        const result = await service.speak('Quick test for audio latency')
        const timeToAudio = Date.now() - startTime
        
        if (provider === 'web-speech') {
          expect(timeToAudio).toBeLessThan(1000) // Web Speech should be fast
        } else {
          expect(timeToAudio).toBeLessThan(3000) // API providers within 3s
        }
        
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Cross-provider continuity', () => {
    it('maintains highlight sync during provider fallback', async () => {
      const text = 'Testing fallback highlighting synchronization'
      
      // Start with ElevenLabs, force fallback to Web Speech
      const service = new VoiceService('elevenlabs')
      jest.spyOn(service, 'callProvider').mockImplementation((text, provider) => {
        if (provider === 'elevenlabs') {
          throw new Error('API Error')
        }
        return service.callProvider(text, 'web-speech')
      })
      
      const result = await service.speak(text)
      
      expect(result.provider).toBe('web-speech')
      expect(result.wordTimings).toBeDefined()
      expect(result.wordTimings.length).toBeGreaterThan(0)
    })

    it('handles chunk boundary transitions smoothly', async () => {
      const service = new VoiceService('elevenlabs')
      
      // Simulate chunk boundary at sentence end
      const chunk1 = 'Elizabeth walked through the garden.'
      const chunk2 = 'She thought about her conversation with Mr. Darcy.'
      
      const result1 = await service.speak(chunk1)
      const result2 = await service.speak(chunk2, { 
        previousChunk: result1,
        seamlessTransition: true 
      })
      
      // Verify smooth handoff
      const gap = result2.startTime - result1.endTime
      expect(gap).toBeLessThan(250) // <250ms crossfade requirement
    })
  })
})
```

### 3. ESL Reading Modes Integration Testing

```typescript
// __tests__/integration/esl-reading-modes.test.tsx
describe('ESL Reading Modes Integration', () => {
  it('switches seamlessly between Original/Simplified modes', async () => {
    const user = userEvent.setup()
    
    render(
      <BookReader 
        bookId="pride-prejudice" 
        userLevel="B1"
        initialMode="simplified" 
      />
    )
    
    // Start in Simplified mode (default for ESL users)
    expect(screen.getByTestId('reading-mode')).toHaveAttribute('data-mode', 'simplified')
    expect(screen.getByText(/elizabeth walked/i)).toBeInTheDocument() // Simplified text
    
    // Switch to Original mode
    await user.click(screen.getByRole('button', { name: /original/i }))
    expect(screen.getByTestId('reading-mode')).toHaveAttribute('data-mode', 'original')
    expect(screen.getByText(/it is a truth universally/i)).toBeInTheDocument() // Original text
    
    // Verify mode persistence
    expect(localStorage.getItem('bookMode-pride-prejudice')).toBe('original')
  })

  it('maintains TTS playback during mode switching', async () => {
    const user = userEvent.setup()
    
    render(<BookReader bookId="pride-prejudice" userLevel="B1" />)
    
    // Start TTS in simplified mode
    await user.click(screen.getByRole('button', { name: /play/i }))
    expect(screen.getByTestId('audio-player')).toHaveAttribute('data-state', 'playing')
    
    // Switch modes during playback - should pause first
    await user.click(screen.getByRole('button', { name: /original/i }))
    
    // Verify graceful handling
    expect(screen.getByTestId('audio-player')).toHaveAttribute('data-state', 'paused')
    expect(screen.getByTestId('reading-mode')).toHaveAttribute('data-mode', 'original')
  })

  it('surfaces vocabulary appropriately by CEFR level', async () => {
    const user = userEvent.setup()
    
    render(<BookReader bookId="pride-prejudice" userLevel="B1" />)
    
    // B2-level words should have subtle highlighting for B1 users
    const difficultWord = screen.getByText('acknowledged')
    expect(difficultWord).toHaveClass('vocabulary-highlight')
    expect(difficultWord).toHaveAttribute('data-difficulty', 'B2')
    
    // Click to see definition
    await user.click(difficultWord)
    expect(screen.getByRole('tooltip')).toContainText('accepted as true')
    
    // Verify tooltip accessibility
    expect(screen.getByRole('tooltip')).toHaveAttribute('aria-live', 'polite')
  })

  it('handles compare mode correctly', async () => {
    const user = userEvent.setup()
    
    render(<BookReader bookId="pride-prejudice" userLevel="B1" />)
    
    // Enable compare mode
    await user.click(screen.getByRole('button', { name: /compare/i }))
    expect(screen.getByTestId('split-view')).toBeVisible()
    
    // Verify both panes are present
    const originalPane = screen.getByTestId('original-pane')
    const simplifiedPane = screen.getByTestId('simplified-pane')
    expect(originalPane).toBeInTheDocument()
    expect(simplifiedPane).toBeInTheDocument()
    
    // Test synchronized scrolling
    fireEvent.scroll(originalPane, { target: { scrollTop: 100 } })
    await waitFor(() => {
      expect(simplifiedPane.scrollTop).toBe(100)
    })
    
    // Test escape to close
    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('split-view')).not.toBeInTheDocument()
  })
})
```

### 4. Vocabulary System Testing

```typescript
// __tests__/esl/vocabulary-system.test.ts
describe('Vocabulary Learning System', () => {
  beforeEach(async () => {
    await setupTestUser({ 
      eslLevel: 'B1',
      nativeLanguage: 'es',
      vocabularyProgress: mockVocabularyData 
    })
  })

  it('tracks vocabulary encounters correctly', async () => {
    const word = 'magnificent'
    const context = 'The magnificent castle stood on the hill.'
    
    const result = await vocabularyService.recordEncounter({
      userId: 'test-user',
      word,
      context,
      userLevel: 'B1'
    })
    
    expect(result.encounters).toBe(1)
    expect(result.difficulty).toBe('B2')
    expect(result.isNewWord).toBe(true)
    expect(result.nextReview).toBeDefined()
  })

  it('implements SM-2 spacing algorithm correctly', async () => {
    // Create vocabulary item with some history
    await vocabularyService.create({
      userId: 'test-user',
      word: 'resilient',
      encounters: 3,
      mastery_level: 2,
      ease_factor: 2.5,
      repetitions: 1,
      srs_interval: 1
    })
    
    // Record successful review (quality 4)
    const result = await vocabularyService.recordReview({
      userId: 'test-user',
      word: 'resilient',
      quality: 4, // Good response
      responseTime: 2500
    })
    
    // Verify SM-2 calculations
    expect(result.ease_factor).toBeGreaterThan(2.5) // Should increase
    expect(result.srs_interval).toBeGreaterThan(1) // Should increase interval
    expect(result.repetitions).toBe(2)
    expect(result.next_review).toBeAfter(new Date())
  })

  it('provides CEFR-appropriate definitions', async () => {
    const response = await vocabularyService.getDefinition({
      word: 'magnificent',
      context: 'The magnificent castle towered above.',
      userLevel: 'B1',
      userId: 'test-user'
    })
    
    expect(response.definition).toMatchCEFRLevel('B1')
    expect(response.examples).toHaveLength.greaterThan(0)
    expect(response.pronunciation).toMatch(/ˈmæg/) // IPA notation
    expect(response.difficulty).toBe('B2')
    
    // Verify cultural context for historical words
    if (response.culturalNote) {
      expect(response.culturalNote).toMatchCEFRLevel('B1')
    }
  })

  it('surfaces due vocabulary during reading', async () => {
    // Create overdue vocabulary items
    await vocabularyService.createBatch([
      {
        userId: 'test-user',
        word: 'elegant',
        next_review: new Date(Date.now() - 86400000), // 1 day overdue
        mastery_level: 2
      },
      {
        userId: 'test-user',
        word: 'splendid',
        next_review: new Date(Date.now() - 3600000), // 1 hour overdue  
        mastery_level: 1
      }
    ])
    
    render(<BookReader bookId="pride-prejudice" userId="test-user" />)
    
    // Due words should have review highlighting
    const elegantWord = screen.getByText('elegant')
    const splendidWord = screen.getByText('splendid')
    
    expect(elegantWord).toHaveClass('vocabulary-review')
    expect(splendidWord).toHaveClass('vocabulary-review')
    
    // More urgent reviews should have stronger highlighting
    expect(splendidWord).toHaveClass('urgent-review')
  })
})

## Accessibility Testing Framework

### Automated Accessibility Testing

```typescript
// jest.setup.ts
import { configureAxe } from 'jest-axe';
import '@testing-library/jest-dom';

// Configure axe for WCAG 2.1 AA compliance
const axe = configureAxe({
  rules: {
    // Level AA requirements
    'color-contrast': { enabled: true },
    'color-contrast-enhanced': { enabled: false }, // AAA only
    'focus-order-semantics': { enabled: true },
    'hidden-content': { enabled: true },
    'label': { enabled: true },
    'label-title-only': { enabled: true },
    'landmark-banner-is-top-level': { enabled: true },
    'landmark-complementary-is-top-level': { enabled: true },
    'landmark-contentinfo-is-top-level': { enabled: true },
    'landmark-main-is-top-level': { enabled: true },
    'landmark-no-duplicate-banner': { enabled: true },
    'landmark-no-duplicate-contentinfo': { enabled: true },
    'landmark-one-main': { enabled: true },
    'link-name': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'meta-refresh': { enabled: true },
    'meta-viewport': { enabled: true },
    'region': { enabled: true },
    'scope-attr-valid': { enabled: true },
    'server-side-image-map': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    'valid-lang': { enabled: true },
    'video-caption': { enabled: true }
  },
  tags: ['wcag2a', 'wcag2aa']
});

global.axe = axe;
```

### Accessibility Test Utilities

```typescript
// utils/accessibility-testing.ts
import { render, RenderResult } from '@testing-library/react';
import { axe, AxeResults } from 'jest-axe';
import userEvent from '@testing-library/user-event';

export interface AccessibilityTestResult {
  violations: AxeResults['violations'];
  passes: AxeResults['passes'];
  incomplete: AxeResults['incomplete'];
}

// Core accessibility testing function
export const testAccessibility = async (
  component: React.ReactElement
): Promise<AccessibilityTestResult> => {
  const { container } = render(component);
  const results = await axe(container);
  
  expect(results).toHaveNoViolations();
  
  return {
    violations: results.violations,
    passes: results.passes,
    incomplete: results.incomplete
  };
};

// Keyboard navigation testing
export const testKeyboardNavigation = async (
  component: React.ReactElement
): Promise<void> => {
  const { container } = render(component);
  const user = userEvent.setup();
  
  // Get all focusable elements
  const focusableElements = container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
  );
  
  expect(focusableElements.length).toBeGreaterThan(0);
  
  // Test tab navigation through all elements
  for (let i = 0; i < focusableElements.length; i++) {
    await user.tab();
    expect(document.activeElement).toBe(focusableElements[i]);
  }
  
  // Test focus indicators
  focusableElements.forEach(element => {
    (element as HTMLElement).focus();
    const styles = window.getComputedStyle(element);
    expect(styles.outline).not.toBe('none');
    expect(styles.outlineWidth).not.toBe('0px');
  });
};

// Screen reader announcement testing
export const testScreenReaderAnnouncements = async (
  component: React.ReactElement,
  expectedAnnouncements: string[]
): Promise<void> => {
  const { container } = render(component);
  
  // Mock live region
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('id', 'live-region');
  document.body.appendChild(liveRegion);
  
  const announcements: string[] = [];
  
  // Monitor changes to live region
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const content = liveRegion.textContent;
        if (content && content.trim()) {
          announcements.push(content.trim());
        }
      }
    });
  });
  
  observer.observe(liveRegion, {
    childList: true,
    characterData: true,
    subtree: true
  });
  
  // Trigger component interactions that should create announcements
  // This would be specific to each component test
  
  // Wait for announcements
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verify expected announcements
  expectedAnnouncements.forEach(expected => {
    expect(announcements).toContain(expected);
  });
  
  observer.disconnect();
  document.body.removeChild(liveRegion);
};

// Color contrast testing
export const testColorContrast = async (
  component: React.ReactElement
): Promise<void> => {
  const { container } = render(component);
  const results = await axe(container, {
    rules: {
      'color-contrast': { enabled: true }
    }
  });
  
  expect(results.violations.filter(v => v.id === 'color-contrast')).toHaveLength(0);
};

// Touch target size testing (mobile accessibility)
export const testTouchTargets = (component: React.ReactElement): void => {
  const { container } = render(component);
  
  const interactiveElements = container.querySelectorAll(
    'button, [role="button"], a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  interactiveElements.forEach(element => {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    const width = rect.width || parseInt(computedStyle.width);
    const height = rect.height || parseInt(computedStyle.height);
    
    // WCAG minimum touch target size is 44x44px
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  });
};
```

## Component Testing

### Accessible Component Tests

```typescript
// components/__tests__/AccessibleButton.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibleButton } from '../AccessibleButton';
import { testAccessibility, testKeyboardNavigation } from '../../utils/accessibility-testing';

describe('AccessibleButton', () => {
  it('passes accessibility audit', async () => {
    await testAccessibility(
      <AccessibleButton>Click me</AccessibleButton>
    );
  });

  it('supports keyboard navigation', async () => {
    await testKeyboardNavigation(
      <AccessibleButton>Click me</AccessibleButton>
    );
  });

  it('has proper ARIA attributes', () => {
    render(
      <AccessibleButton 
        ariaLabel="Custom label"
        ariaDescribedBy="description"
      >
        Click me
      </AccessibleButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
    expect(button).toHaveAttribute('aria-describedby', 'description');
  });

  it('has minimum touch target size', () => {
    render(<AccessibleButton>Click me</AccessibleButton>);
    const button = screen.getByRole('button');
    
    const styles = window.getComputedStyle(button);
    expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44);
  });

  it('has visible focus indicator', () => {
    render(<AccessibleButton>Click me</AccessibleButton>);
    const button = screen.getByRole('button');
    
    button.focus();
    const styles = window.getComputedStyle(button);
    expect(styles.outline).not.toBe('none');
    expect(styles.outlineWidth).not.toBe('0px');
  });
});

// components/__tests__/AIChat.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIChat } from '../AIChat';
import { testAccessibility, testScreenReaderAnnouncements } from '../../utils/accessibility-testing';

describe('AIChat', () => {
  it('passes accessibility audit', async () => {
    await testAccessibility(<AIChat />);
  });

  it('announces AI responses to screen readers', async () => {
    const user = userEvent.setup();
    
    render(<AIChat />);
    
    const input = screen.getByLabelText('Ask a question');
    await user.type(input, 'What is the theme of this book?');
    await user.keyboard('{Enter}');

    await testScreenReaderAnnouncements(
      <AIChat />,
      [
        'Processing your question...',
        'Response complete. Use arrow keys to navigate the answer.'
      ]
    );
  });

  it('supports keyboard navigation for messages', async () => {
    const user = userEvent.setup();
    
    render(<AIChat initialMessages={mockMessages} />);
    
    // Test arrow key navigation through messages
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('article', { name: /message 1/i })).toHaveFocus();
    
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('article', { name: /message 2/i })).toHaveFocus();
  });

  it('has proper ARIA structure for chat log', () => {
    render(<AIChat initialMessages={mockMessages} />);
    
    const chatLog = screen.getByRole('log');
    expect(chatLog).toHaveAttribute('aria-live', 'polite');
    expect(chatLog).toHaveAttribute('aria-label', 'AI conversation');
    
    const messages = screen.getAllByRole('article');
    messages.forEach((message, index) => {
      expect(message).toHaveAttribute('aria-setsize', messages.length.toString());
      expect(message).toHaveAttribute('aria-posinset', (index + 1).toString());
    });
  });
});
```

## AI Integration Testing

### AI Service Tests

```typescript
// services/__tests__/ai-service.test.ts
import { AIService } from '../ai-service';
import { CacheManager } from '../cache-manager';
import { CostMonitor } from '../cost-monitor';

// Mock external dependencies
jest.mock('openai');
jest.mock('../cache-manager');
jest.mock('../cost-monitor');

describe('AIService', () => {
  let aiService: AIService;
  let mockCacheManager: jest.Mocked<CacheManager>;
  let mockCostMonitor: jest.Mocked<CostMonitor>;

  beforeEach(() => {
    mockCacheManager = new CacheManager() as jest.Mocked<CacheManager>;
    mockCostMonitor = new CostMonitor() as jest.Mocked<CostMonitor>;
    aiService = new AIService(mockCacheManager, mockCostMonitor);
  });

  it('uses cache for repeated questions', async () => {
    const question = 'What is the main theme?';
    const cachedResponse = 'Love and loss';
    
    mockCacheManager.getCachedResponse.mockResolvedValue(cachedResponse);
    
    const result = await aiService.query(question);
    
    expect(result).toBe(cachedResponse);
    expect(mockCacheManager.getCachedResponse).toHaveBeenCalledWith(
      expect.any(String),
      question
    );
  });

  it('selects appropriate model based on question complexity', async () => {
    const simpleQuestion = 'Who is the author?';
    const complexQuestion = 'Analyze the symbolism in chapter 3';
    
    mockCacheManager.getCachedResponse.mockResolvedValue(null);
    
    await aiService.query(simpleQuestion);
    expect(aiService.getLastModelUsed()).toBe('gpt-3.5-turbo');
    
    await aiService.query(complexQuestion);
    expect(aiService.getLastModelUsed()).toBe('gpt-4o');
  });

  it('tracks costs properly', async () => {
    const question = 'Test question';
    mockCacheManager.getCachedResponse.mockResolvedValue(null);
    
    await aiService.query(question, { userId: 'user123' });
    
    expect(mockCostMonitor.trackUsage).toHaveBeenCalledWith(
      'user123',
      expect.objectContaining({
        tokens: expect.any(Number),
        model: expect.any(String),
        cost: expect.any(Number)
      })
    );
  });

  it('respects rate limits', async () => {
    mockCacheManager.getCachedResponse.mockResolvedValue(null);
    
    // Make multiple rapid requests
    const promises = Array(10).fill(0).map(() => 
      aiService.query('Test question', { userId: 'user123' })
    );
    
    await expect(Promise.all(promises)).rejects.toThrow('Rate limit exceeded');
  });

  it('handles API errors gracefully', async () => {
    mockCacheManager.getCachedResponse.mockResolvedValue(null);
    
    // Mock OpenAI API error
    const mockOpenAI = require('openai');
    mockOpenAI.OpenAI.prototype.chat.completions.create.mockRejectedValue(
      new Error('API Error')
    );
    
    await expect(aiService.query('Test question')).rejects.toThrow('AI service temporarily unavailable');
  });
});
```

## Integration Testing

### API Integration Tests

```typescript
// __tests__/integration/api.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/ai/query';
import { prisma } from '../../lib/prisma';

describe('/api/ai/query', () => {
  beforeEach(async () => {
    await prisma.$reset();
  });

  it('processes AI query successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: 'What is the main theme?',
        bookId: 'book123',
        userId: 'user123'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('response');
    expect(data.response).toBeTruthy();
  });

  it('enforces daily usage limits', async () => {
    // Create user with high usage
    await prisma.usage.create({
      data: {
        userId: 'user123',
        date: new Date(),
        cost: 15, // Above $10 daily limit
        queries: 100,
        tokens: 10000
      }
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: 'Test question',
        userId: 'user123'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(429);
    
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Daily usage limit exceeded');
  });

  it('enforces global daily budget', async () => {
    // Mock high global usage
    jest.spyOn(require('../../lib/cost-monitor'), 'getGlobalDailyUsage')
      .mockResolvedValue(200); // Above $150 limit

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: 'Test question',
        userId: 'user123'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(503);
    
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Service temporarily unavailable');
  });
});
```

## End-to-End Testing

### Critical User Journey Tests

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility E2E Tests', () => {
  test('passes accessibility audit on all pages', async ({ page }) => {
    // Home page
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);

    // Book reader page
    await page.goto('/books/sample-book');
    const readerScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(readerScanResults.violations).toEqual([]);

    // AI chat interface
    await page.click('[data-testid="ai-chat-button"]');
    const chatScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(chatScanResults.violations).toEqual([]);
  });

  test('supports keyboard-only navigation', async ({ page }) => {
    await page.goto('/');
    
    // Navigate through skip links
    await page.keyboard.press('Tab');
    expect(await page.locator(':focus').textContent()).toBe('Skip to main content');
    
    await page.keyboard.press('Enter');
    expect(await page.locator(':focus').getAttribute('id')).toBe('main-content');
    
    // Test application shortcuts
    await page.keyboard.press('Alt+q');
    expect(await page.locator(':focus').getAttribute('id')).toBe('ai-query-input');
  });

  test('works with screen reader simulation', async ({ page }) => {
    await page.goto('/books/sample-book');
    
    // Start AI query
    await page.fill('[data-testid="ai-query-input"]', 'What is the main theme?');
    await page.keyboard.press('Enter');
    
    // Check for screen reader announcements
    await expect(page.locator('#live-region')).toContainText('Processing your question...');
    
    // Wait for response
    await page.waitForSelector('[data-testid="ai-response"]');
    await expect(page.locator('#live-region')).toContainText('Response complete');
  });

  test('supports voice navigation', async ({ page }) => {
    // Note: This would require additional setup for voice recognition testing
    await page.goto('/');
    
    // Enable voice navigation
    await page.click('[data-testid="voice-navigation-toggle"]');
    
    // Simulate voice command (this would integrate with speech recognition in real implementation)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('voice-command', {
        detail: { command: 'open book reader' }
      }));
    });
    
    await expect(page).toHaveURL(/\/books/);
  });
});

// e2e/user-journey.spec.ts
test.describe('Complete User Journey', () => {
  test('new user can sign up, upload book, and ask questions', async ({ page }) => {
    // Sign up process
    await page.goto('/signup');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'securepassword123');
    await page.click('[data-testid="signup-button"]');
    
    // Verify accessibility preferences setup
    await expect(page.locator('[data-testid="accessibility-preferences"]')).toBeVisible();
    
    // Upload a book
    await page.goto('/books/upload');
    await page.setInputFiles('[data-testid="book-upload"]', 'test-files/sample-book.txt');
    await page.fill('[data-testid="book-title"]', 'Sample Book');
    await page.fill('[data-testid="book-author"]', 'Test Author');
    await page.click('[data-testid="upload-button"]');
    
    // Ask AI question
    await page.goto('/books/sample-book');
    await page.fill('[data-testid="ai-query-input"]', 'Who is the main character?');
    await page.keyboard.press('Enter');
    
    // Verify response
    await page.waitForSelector('[data-testid="ai-response"]');
    const response = await page.locator('[data-testid="ai-response"]').textContent();
    expect(response).toBeTruthy();
    expect(response.length).toBeGreaterThan(10);
  });

  test('premium upgrade flow is accessible', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Hit free tier limit
    await page.goto('/books/book1');
    // Simulate having used 3 books this month
    await page.evaluate(() => {
      localStorage.setItem('monthly-book-count', '3');
    });
    
    await page.fill('[data-testid="ai-query-input"]', 'Test question');
    await page.keyboard.press('Enter');
    
    // Should show upgrade prompt
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible();
    
    // Test accessible payment flow
    await page.click('[data-testid="upgrade-button"]');
    await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();
    
    // Verify payment form accessibility
    const paymentScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(paymentScanResults.violations).toEqual([]);
  });
});
```

## Performance Testing

### Load Testing with Accessibility

```typescript
// __tests__/performance/load.test.ts
import { performance } from 'perf_hooks';
import { chromium } from 'playwright';

describe('Performance with Accessibility Features', () => {
  test('page load time with screen reader support', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    const startTime = performance.now();
    await page.goto('/books/sample-book');
    
    // Wait for all accessibility features to load
    await page.waitForSelector('[data-testid="accessibility-loaded"]');
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    // Should load within 2 seconds even with accessibility features
    expect(loadTime).toBeLessThan(2000);
    
    await browser.close();
  });

  test('AI response time with accessibility announcements', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.goto('/books/sample-book');
    
    const startTime = performance.now();
    await page.fill('[data-testid="ai-query-input"]', 'What is the theme?');
    await page.keyboard.press('Enter');
    
    // Wait for both AI response and accessibility announcement
    await page.waitForSelector('[data-testid="ai-response"]');
    await page.waitForFunction(
      () => document.getElementById('live-region')?.textContent?.includes('Response complete')
    );
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Should respond within 3 seconds including accessibility features
    expect(responseTime).toBeLessThan(3000);
    
    await browser.close();
  });
});
```

## Test Coverage Requirements

### Coverage Targets

```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Higher coverage for critical accessibility components
    './components/accessibility/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // High coverage for AI service
    './services/ai-service.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']
};
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run accessibility tests
        run: npm run test:accessibility
      
      - name: Run WCAG compliance check
        run: npm run test:wcag
      
      - name: Upload accessibility report
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-report
          path: accessibility-report.html

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload E2E report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Testing Scripts

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:accessibility": "jest --testPathPattern=accessibility",
    "test:wcag": "axe-cli --tags wcag2a,wcag2aa http://localhost:3000",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:performance": "jest --testPathPattern=performance",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e && npm run test:accessibility"
  }
}
```

## Critical ESL E2E Testing

### Complete ESL Learner Journey

```typescript
// e2e/__tests__/esl-user-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('ESL Learner Complete Journey', () => {
  test('completes full reading session with learning features', async ({ page }) => {
    // Setup: ESL user logs in
    await page.goto('/login')
    await loginAsESLUser('B1')
    
    // Step 1: Navigate to book and verify ESL defaults
    await page.goto('/library/pride-prejudice')
    await expect(page.locator('[data-testid="reading-mode"]')).toHaveAttribute('data-mode', 'simplified')
    
    // Step 2: Start TTS and verify highlighting
    await page.click('button[aria-label="Play"]')
    await expect(page.locator('.word-highlight')).toBeVisible()
    
    // Step 3: Interact with vocabulary
    await page.click('span[data-difficulty="B2"]:first-child')
    await expect(page.locator('role=tooltip')).toBeVisible()
    
    // Step 4: Switch to compare mode
    await page.click('button[aria-label="Compare"]')
    await expect(page.locator('[data-testid="split-view"]')).toBeVisible()
    
    // Step 5: Verify accessibility
    const axeResults = await injectAxe(page)
    expect(axeResults.violations).toHaveLength(0)
    
    // Step 6: Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('.esl-controls')).toHaveClass(/mobile-compact/)
  })

  test('handles TTS continuity across page boundaries', async ({ page }) => {
    await page.goto('/library/pride-prejudice/read')
    
    // Start TTS near end of page
    await page.click('button[aria-label="Play"]')
    await page.waitForSelector('[data-highlighted="true"]')
    
    // Fast forward to near page end
    await simulateAudioProgress(0.95)
    
    // Verify auto-advance to next page
    await expect(page.locator('[data-page-index="1"]')).toBeVisible()
    await expect(page.locator('[data-highlighted="true"]')).toBeVisible()
    
    // Verify no audio gap >250ms
    const audioGaps = await measureAudioContinuity()
    expect(Math.max(...audioGaps)).toBeLessThan(250)
  })
})
```

## Performance & Bug Prevention Testing  

### TTS-Specific Bug Prevention

```typescript
// __tests__/bug-prevention/tts-bugs.test.ts
describe('Common TTS Bug Prevention', () => {
  it('prevents audio context suspension on mobile Safari', async () => {
    // Simulate mobile Safari
    mockUserAgent('iPhone Safari')
    
    const player = new AudioPlayerWithHighlighting()
    
    // Simulate user interaction required for audio context
    await user.click(screen.getByRole('button', { name: /play/i }))
    
    expect(player.getAudioContext().state).toBe('running')
  })

  it('handles rapid play/pause/play sequences', async () => {
    const player = new AudioPlayerWithHighlighting()
    
    // Rapid sequence that commonly causes issues
    await player.play()
    await player.pause()
    await player.play()
    await player.pause()
    await player.play()
    
    // Should not crash or produce audio artifacts
    expect(player.getCurrentState()).toBe('playing')
    expect(player.hasErrors()).toBe(false)
  })

  it('recovers from WebSocket disconnections', async () => {
    const websocketService = new ElevenLabsWebSocketService()
    await websocketService.connect()
    
    // Simulate connection drop
    websocketService.simulateDisconnection()
    
    // Should attempt reconnection
    await waitFor(() => {
      expect(websocketService.isConnected()).toBe(true)
    }, { timeout: 5000 })
  })

  it('prevents highlighting desync during chunk transitions', async () => {
    const content = createMultiChunkContent(3)
    const player = new AudioPlayerWithHighlighting()
    
    await player.loadContent(content)
    await player.play()
    
    // Monitor highlighting through chunk boundaries
    const highlightHistory: string[] = []
    player.on('word-highlight', (word) => {
      highlightHistory.push(word)
    })
    
    // Simulate chunk transitions
    await simulateChunkTransition(0, 1)
    await simulateChunkTransition(1, 2)
    
    // Should have continuous highlighting
    const gaps = findHighlightingGaps(highlightHistory)
    expect(gaps).toHaveLength(0)
  })
})
```

## Test Execution Strategy

### Package.json Test Scripts (Enhanced)

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=__tests__/unit",
    "test:integration": "jest --testPathPattern=__tests__/integration", 
    "test:e2e": "playwright test",
    "test:a11y": "jest --testPathPattern=accessibility",
    "test:performance": "jest --testPathPattern=performance",
    "test:esl": "jest --testPathPattern=esl",
    "test:tts": "jest --testPathPattern=tts",
    "test:mobile": "jest --testPathPattern=mobile",
    "test:real-books": "TEST_REAL_BOOKS=true jest --testPathPattern=real-content",
    "test:similarity": "jest --testPathPattern=similarity",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:esl-full": "npm run test:esl && npm run test:tts && npm run test:real-books"
  }
}
```

### CI/CD Pipeline (Enhanced)

```yaml
# .github/workflows/esl-test-strategy.yml
name: ESL Testing Strategy
on: [push, pull_request]

jobs:
  esl-unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:esl
      - run: npm run test:similarity
      
  tts-provider-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        provider: [web-speech, openai, elevenlabs]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:tts -- --testNamePattern="${{ matrix.provider }}"
      
  real-book-content-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:real-books
        env:
          TEST_REAL_BOOKS: true
          OPENAI_API_KEY: ${{ secrets.TEST_OPENAI_KEY }}
          
  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:performance
      - name: Check memory usage
        run: node --max-old-space-size=512 npm run test:performance
        
  mobile-responsiveness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:mobile
      - run: npx playwright test --project=mobile
```

## Success Metrics & Monitoring

### Performance Benchmarks
- **Time-to-first-simplified**: <2s cached, <5s generated
- **TTS continuity**: <100ms gaps between chunks (target: 95%+ sessions)
- **Cache hit rate**: 85%+ for book simplifications, 95%+ for vocabulary lookups
- **Similarity gate accuracy**: % of simplifications passing 0.82 threshold
- **Memory efficiency**: <50MB per ESL reading session

### Quality Metrics
- **CEFR accuracy**: 100% of simplifications match target level constraints
- **Vocabulary appropriateness**: Max new words per chunk not exceeded
- **Cultural context**: 90%+ of historical references properly annotated
- **Accessibility**: Zero WCAG 2.1 AA violations
- **Mobile usability**: All touch targets ≥44px, responsive breakpoints tested

### Pre-deployment Checklist

Before each ESL feature deployment:

1. **Core ESL Journey Test**
   ```bash
   npm run test:e2e -- --grep "ESL Learner Complete Journey"
   ```

2. **TTS Provider Reliability**
   ```bash
   npm run test:tts -- --testNamePattern="provider reliability"
   ```

3. **Real Book Content Processing**
   ```bash
   npm run test:real-books
   ```

4. **Accessibility Compliance**
   ```bash
   npm run test:a11y
   ```

5. **Performance Validation**
   ```bash
   npm run test:performance
   ```

This comprehensive ESL testing strategy ensures:

- **Reliable text simplification** with semantic similarity gates
- **Consistent TTS experience** across all providers with <100ms gaps
- **Accurate CEFR level matching** for appropriate difficulty
- **Cultural context preservation** for historical texts
- **Seamless vocabulary learning** integration with SRS system
- **Mobile-first accessibility** for global ESL learners
- **Real book content validation** with actual Gutenberg/StandardEbooks texts
- **Performance targets** for responsive user experience

The strategy catches critical ESL-specific bugs before they impact learners while ensuring the application remains accessible, performant, and pedagogically sound.