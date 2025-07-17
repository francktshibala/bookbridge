# BookBridge Testing Strategy

## Overview

BookBridge implements a comprehensive testing strategy with accessibility compliance at its core. Our target is 80% code coverage with 100% WCAG 2.1 AA compliance verification.

## Testing Pyramid

```
E2E Testing (10%)
├── Critical user journeys
├── Accessibility compliance
└── Cross-browser testing

Integration Testing (20%)
├── API integration tests
├── Database integration
└── AI service integration

Unit Testing (70%)
├── Component testing
├── Utility function testing
└── Business logic testing
```

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

This comprehensive testing strategy ensures:
- **100% WCAG 2.1 AA compliance** verification
- **80% code coverage** with higher targets for critical components
- **Automated accessibility testing** in CI/CD pipeline
- **Real user journey testing** with assistive technologies
- **Performance testing** with accessibility features enabled
- **AI service reliability** and cost control testing

The testing framework catches accessibility issues early and ensures our app truly serves all users effectively.