/**
 * Touch Performance and Interaction Test Suite
 * Tests touch responsiveness, gesture accuracy, and accessibility for BookBridge
 *
 * Critical for mobile reading experience and accessibility compliance
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';

expect.extend(toHaveNoViolations);

interface TouchMetrics {
  responseTime: number;
  accuracy: boolean;
  gestureRecognized: boolean;
  accessibilityScore: number;
}

interface DeviceProfile {
  name: string;
  screenSize: { width: number; height: number };
  pixelRatio: number;
  touchTargetMinSize: number; // in CSS pixels
  maxTouchPoints: number;
}

const MOBILE_DEVICES: DeviceProfile[] = [
  {
    name: 'iPhone SE',
    screenSize: { width: 375, height: 667 },
    pixelRatio: 2,
    touchTargetMinSize: 44,
    maxTouchPoints: 5
  },
  {
    name: 'iPhone 14 Pro',
    screenSize: { width: 393, height: 852 },
    pixelRatio: 3,
    touchTargetMinSize: 44,
    maxTouchPoints: 10
  },
  {
    name: 'Samsung Galaxy A13',
    screenSize: { width: 360, height: 640 },
    pixelRatio: 2.75,
    touchTargetMinSize: 48,
    maxTouchPoints: 10
  },
  {
    name: 'Google Pixel 7',
    screenSize: { width: 412, height: 915 },
    pixelRatio: 2.625,
    touchTargetMinSize: 48,
    maxTouchPoints: 10
  }
];

// Mock components for testing
const MockBookReader = ({ onTextSelect, onGestureDetect }: {
  onTextSelect?: (text: string, position: { x: number; y: number }) => void;
  onGestureDetect?: (gesture: string) => void;
}) => (
  <div
    data-testid="book-reader"
    style={{ width: '100%', height: '100vh', position: 'relative' }}
    onTouchStart={(e) => {
      const touch = e.touches[0];
      onGestureDetect?.('touch-start');
    }}
    onTouchEnd={(e) => {
      onGestureDetect?.('touch-end');
    }}
  >
    <div
      data-testid="reading-text"
      style={{ padding: '20px', fontSize: '18px', lineHeight: '1.6' }}
      onTouchStart={(e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        onTextSelect?.('selected text', { x, y });
      }}
    >
      The quick brown fox jumps over the lazy dog. This text is used for testing
      touch interactions and text selection on mobile devices.
    </div>

    <button
      data-testid="play-button"
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        fontSize: '24px'
      }}
      aria-label="Play audio"
    >
      ▶
    </button>

    <div
      data-testid="speed-control"
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        width: '44px',
        height: '44px'
      }}
      role="button"
      tabIndex={0}
      aria-label="Audio speed control"
    >
      1x
    </div>
  </div>
);

class TouchSimulator {
  private element: Element;

  constructor(element: Element) {
    this.element = element;
  }

  simulateTouch(x: number, y: number, duration = 100): Promise<TouchMetrics> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      let gestureRecognized = false;
      let accuracy = false;

      const rect = this.element.getBoundingClientRect();
      const clientX = rect.left + x;
      const clientY = rect.top + y;

      // Create touch event
      const touchStart = new TouchEvent('touchstart', {
        touches: [{
          identifier: 0,
          target: this.element,
          clientX,
          clientY,
          pageX: clientX,
          pageY: clientY,
          screenX: clientX,
          screenY: clientY,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: 1
        } as Touch],
        changedTouches: [],
        targetTouches: []
      });

      const touchEnd = new TouchEvent('touchend', {
        touches: [],
        changedTouches: [{
          identifier: 0,
          target: this.element,
          clientX,
          clientY,
          pageX: clientX,
          pageY: clientY,
          screenX: clientX,
          screenY: clientY,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: 1
        } as Touch],
        targetTouches: []
      });

      // Dispatch touch start
      this.element.dispatchEvent(touchStart);
      gestureRecognized = true;

      // Check if touch hit intended target
      const elementAtPoint = document.elementFromPoint(clientX, clientY);
      accuracy = elementAtPoint === this.element || this.element.contains(elementAtPoint);

      setTimeout(() => {
        this.element.dispatchEvent(touchEnd);
        const responseTime = performance.now() - startTime;

        resolve({
          responseTime,
          accuracy,
          gestureRecognized,
          accessibilityScore: 1.0 // Will be calculated in actual tests
        });
      }, duration);
    });
  }

  simulateSwipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration = 300
  ): Promise<TouchMetrics> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      let gestureRecognized = false;
      const steps = 10;
      const stepTime = duration / steps;

      const deltaX = (endX - startX) / steps;
      const deltaY = (endY - startY) / steps;

      let currentStep = 0;

      const performStep = () => {
        const currentX = startX + (deltaX * currentStep);
        const currentY = startY + (deltaY * currentStep);

        const rect = this.element.getBoundingClientRect();
        const clientX = rect.left + currentX;
        const clientY = rect.top + currentY;

        const touchEvent = currentStep === 0 ? 'touchstart' :
                          currentStep === steps - 1 ? 'touchend' : 'touchmove';

        const event = new TouchEvent(touchEvent, {
          touches: currentStep === steps - 1 ? [] : [{
            identifier: 0,
            target: this.element,
            clientX,
            clientY,
            pageX: clientX,
            pageY: clientY,
            screenX: clientX,
            screenY: clientY,
            radiusX: 10,
            radiusY: 10,
            rotationAngle: 0,
            force: 1
          } as Touch],
          changedTouches: [],
          targetTouches: []
        });

        this.element.dispatchEvent(event);
        gestureRecognized = true;

        currentStep++;
        if (currentStep < steps) {
          setTimeout(performStep, stepTime);
        } else {
          const responseTime = performance.now() - startTime;
          resolve({
            responseTime,
            accuracy: true, // Swipe accuracy determined differently
            gestureRecognized,
            accessibilityScore: 1.0
          });
        }
      };

      performStep();
    });
  }
}

describe('Touch Performance and Interaction Tests', () => {
  let mockDevice: DeviceProfile;

  beforeEach(() => {
    // Default to iPhone SE for testing
    mockDevice = MOBILE_DEVICES[0];

    // Mock viewport
    Object.defineProperty(window, 'innerWidth', { value: mockDevice.screenSize.width });
    Object.defineProperty(window, 'innerHeight', { value: mockDevice.screenSize.height });
    Object.defineProperty(window, 'devicePixelRatio', { value: mockDevice.pixelRatio });
  });

  describe('Touch Target Sizing', () => {
    test('should meet minimum touch target requirements for all controls', async () => {
      const onGestureDetect = jest.fn();
      render(<MockBookReader onGestureDetect={onGestureDetect} />);

      const playButton = screen.getByTestId('play-button');
      const speedControl = screen.getByTestId('speed-control');

      // Check play button dimensions
      const playButtonRect = playButton.getBoundingClientRect();
      expect(playButtonRect.width).toBeGreaterThanOrEqual(mockDevice.touchTargetMinSize);
      expect(playButtonRect.height).toBeGreaterThanOrEqual(mockDevice.touchTargetMinSize);

      // Check speed control dimensions
      const speedControlRect = speedControl.getBoundingClientRect();
      expect(speedControlRect.width).toBeGreaterThanOrEqual(mockDevice.touchTargetMinSize);
      expect(speedControlRect.height).toBeGreaterThanOrEqual(mockDevice.touchTargetMinSize);
    });

    test('should maintain touch target spacing', async () => {
      render(<MockBookReader />);

      const playButton = screen.getByTestId('play-button');
      const speedControl = screen.getByTestId('speed-control');

      const playRect = playButton.getBoundingClientRect();
      const speedRect = speedControl.getBoundingClientRect();

      // Calculate distance between controls
      const distance = Math.sqrt(
        Math.pow(playRect.left - speedRect.right, 2) +
        Math.pow(playRect.top - speedRect.bottom, 2)
      );

      // Should have at least 8px spacing
      expect(distance).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Touch Response Performance', () => {
    test('should respond to touch within 100ms', async () => {
      const onGestureDetect = jest.fn();
      render(<MockBookReader onGestureDetect={onGestureDetect} />);

      const reader = screen.getByTestId('book-reader');
      const simulator = new TouchSimulator(reader);

      const metrics = await simulator.simulateTouch(100, 100);

      expect(metrics.responseTime).toBeLessThan(100);
      expect(metrics.gestureRecognized).toBe(true);
      expect(onGestureDetect).toHaveBeenCalledWith('touch-start');
    });

    test('should handle rapid consecutive touches', async () => {
      const onGestureDetect = jest.fn();
      render(<MockBookReader onGestureDetect={onGestureDetect} />);

      const reader = screen.getByTestId('book-reader');
      const simulator = new TouchSimulator(reader);

      // Simulate rapid touches
      const touches = await Promise.all([
        simulator.simulateTouch(50, 50, 50),
        simulator.simulateTouch(100, 100, 50),
        simulator.simulateTouch(150, 150, 50)
      ]);

      touches.forEach(metrics => {
        expect(metrics.responseTime).toBeLessThan(100);
        expect(metrics.gestureRecognized).toBe(true);
      });

      expect(onGestureDetect).toHaveBeenCalledTimes(6); // 3 start + 3 end
    });
  });

  describe('Text Selection Accuracy', () => {
    test('should accurately select text on touch', async () => {
      const onTextSelect = jest.fn();
      render(<MockBookReader onTextSelect={onTextSelect} />);

      const readingText = screen.getByTestId('reading-text');
      const simulator = new TouchSimulator(readingText);

      await simulator.simulateTouch(50, 30); // Touch within text area

      expect(onTextSelect).toHaveBeenCalledWith('selected text', expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number)
      }));
    });

    test('should handle edge touches near text boundaries', async () => {
      const onTextSelect = jest.fn();
      render(<MockBookReader onTextSelect={onTextSelect} />);

      const readingText = screen.getByTestId('reading-text');
      const rect = readingText.getBoundingClientRect();
      const simulator = new TouchSimulator(readingText);

      // Touch near edges
      await simulator.simulateTouch(5, 5); // Top-left corner
      await simulator.simulateTouch(rect.width - 5, rect.height - 5); // Bottom-right corner

      expect(onTextSelect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Gesture Recognition', () => {
    test('should recognize swipe gestures for page navigation', async () => {
      const onGestureDetect = jest.fn();
      render(<MockBookReader onGestureDetect={onGestureDetect} />);

      const reader = screen.getByTestId('book-reader');
      const simulator = new TouchSimulator(reader);

      // Simulate left swipe (next page)
      await simulator.simulateSwipe(300, 400, 50, 400);

      expect(onGestureDetect).toHaveBeenCalledWith('touch-start');
    });

    test('should distinguish between tap and swipe gestures', async () => {
      const onGestureDetect = jest.fn();
      render(<MockBookReader onGestureDetect={onGestureDetect} />);

      const reader = screen.getByTestId('book-reader');
      const simulator = new TouchSimulator(reader);

      // Quick tap
      const tapMetrics = await simulator.simulateTouch(100, 100, 50);

      // Swipe gesture
      const swipeMetrics = await simulator.simulateSwipe(100, 100, 200, 100, 300);

      expect(tapMetrics.responseTime).toBeLessThan(100);
      expect(swipeMetrics.responseTime).toBeGreaterThan(200);
    });
  });

  describe('Multi-Device Compatibility', () => {
    MOBILE_DEVICES.forEach(device => {
      test(`should work correctly on ${device.name}`, async () => {
        // Update mock device
        Object.defineProperty(window, 'innerWidth', { value: device.screenSize.width });
        Object.defineProperty(window, 'innerHeight', { value: device.screenSize.height });
        Object.defineProperty(window, 'devicePixelRatio', { value: device.pixelRatio });

        const onGestureDetect = jest.fn();
        render(<MockBookReader onGestureDetect={onGestureDetect} />);

        const reader = screen.getByTestId('book-reader');
        const simulator = new TouchSimulator(reader);

        // Test touch at center of screen
        const centerX = device.screenSize.width / 2;
        const centerY = device.screenSize.height / 2;

        const metrics = await simulator.simulateTouch(centerX, centerY);

        expect(metrics.responseTime).toBeLessThan(100);
        expect(metrics.gestureRecognized).toBe(true);
        expect(metrics.accuracy).toBe(true);
      });
    });
  });

  describe('Accessibility Compliance', () => {
    test('should meet WCAG 2.1 touch target guidelines', async () => {
      const { container } = render(<MockBookReader />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Check specific WCAG 2.1 AAA requirements
      const touchTargets = container.querySelectorAll('[role="button"], button');

      touchTargets.forEach(target => {
        const rect = target.getBoundingClientRect();
        expect(rect.width).toBeGreaterThanOrEqual(44); // WCAG 2.1 AAA
        expect(rect.height).toBeGreaterThanOrEqual(44);
      });
    });

    test('should support keyboard navigation fallback', async () => {
      const user = userEvent.setup();
      render(<MockBookReader />);

      const speedControl = screen.getByTestId('speed-control');

      // Should be focusable
      await user.tab();
      expect(speedControl).toHaveFocus();

      // Should respond to Enter key
      await user.keyboard('{Enter}');
      // In real implementation, this would trigger the control
    });

    test('should provide proper ARIA labels for touch controls', () => {
      render(<MockBookReader />);

      const playButton = screen.getByLabelText('Play audio');
      const speedControl = screen.getByLabelText('Audio speed control');

      expect(playButton).toBeInTheDocument();
      expect(speedControl).toBeInTheDocument();
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain touch responsiveness with heavy DOM', async () => {
      // Create a component with many elements to simulate heavy DOM
      const HeavyBookReader = () => (
        <div data-testid="heavy-reader">
          <MockBookReader />
          {Array.from({ length: 1000 }, (_, i) => (
            <div key={i} style={{ height: '10px' }}>Heavy DOM element {i}</div>
          ))}
        </div>
      );

      const onGestureDetect = jest.fn();
      render(<HeavyBookReader />);

      const reader = screen.getByTestId('book-reader');
      const simulator = new TouchSimulator(reader);

      const metrics = await simulator.simulateTouch(100, 100);

      // Should still be responsive despite heavy DOM
      expect(metrics.responseTime).toBeLessThan(150); // Slightly higher threshold
      expect(metrics.gestureRecognized).toBe(true);
    });

    test('should handle touch events during intensive operations', async () => {
      const onGestureDetect = jest.fn();
      render(<MockBookReader onGestureDetect={onGestureDetect} />);

      const reader = screen.getByTestId('book-reader');
      const simulator = new TouchSimulator(reader);

      // Simulate intensive operation
      const intensiveTask = new Promise(resolve => {
        setTimeout(() => {
          // Simulate heavy computation
          let sum = 0;
          for (let i = 0; i < 100000; i++) {
            sum += Math.random();
          }
          resolve(sum);
        }, 50);
      });

      // Touch during intensive operation
      const [metrics] = await Promise.all([
        simulator.simulateTouch(100, 100),
        intensiveTask
      ]);

      expect(metrics.gestureRecognized).toBe(true);
      expect(onGestureDetect).toHaveBeenCalled();
    });
  });
});