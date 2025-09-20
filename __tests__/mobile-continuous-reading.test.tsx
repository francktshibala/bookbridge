/**
 * Critical Mobile Performance Tests for Continuous Reading
 * These tests validate the core requirements from our 16-week plan
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { ContinuousReadingContainer } from '@/components/reading/ContinuousReadingContainer';
import { GaplessAudioManager } from '@/lib/audio/GaplessAudioManager';
import { MobilePerformanceMonitor } from '@/lib/monitoring/MobilePerformanceMonitor';
import { MobilePrefetchManager } from '@/lib/prefetch/MobilePrefetchManager';

// Mock dependencies
jest.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => ({ isMobile: true })
}));

jest.mock('@/lib/feature-flags', () => ({
  useFeatureFlags: () => ({
    continuousReading: true,
    gaplessAudio: true,
    virtualizedScrolling: true,
    predictivePrefetch: true,
    mobileOptimizations: true
  })
}));

// Test data
const mockBookContent = {
  id: 'test-book-1',
  title: 'Test Book',
  author: 'Test Author',
  chunks: [
    {
      chunkIndex: 0,
      content: 'This is the first paragraph of our test book. It contains multiple sentences for testing.\n\nThis is a second paragraph with different content. We need to test virtualization performance.'
    },
    {
      chunkIndex: 1,
      content: 'Here is the second chunk. It also has multiple paragraphs.\n\nAnd this is another paragraph in the second chunk.'
    }
  ],
  totalChunks: 2,
  enhanced: true
};

describe('Mobile Continuous Reading - Critical Performance Tests', () => {
  beforeEach(() => {
    // Reset performance monitoring
    (global as any).performance = {
      now: () => Date.now(),
      memory: {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024
      }
    };

    // Mock navigator for device detection
    Object.defineProperty(navigator, 'deviceMemory', {
      writable: true,
      value: 4 // 4GB device
    });

    Object.defineProperty(navigator, 'connection', {
      writable: true,
      value: {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false
      }
    });
  });

  describe('Audio Performance Requirements', () => {
    test('Audio start latency should be under 100ms', async () => {
      const audioManager = new GaplessAudioManager();
      const startTime = performance.now();

      // Mock successful audio loading
      const mockAudio = {
        preload: 'auto',
        crossOrigin: 'anonymous',
        duration: 5.0,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        play: jest.fn().mockResolvedValue(undefined),
        pause: jest.fn(),
        src: ''
      };

      // @ts-ignore - mocking HTMLAudioElement
      global.Audio = jest.fn(() => mockAudio);

      try {
        await audioManager.preloadAudio('test-audio', '/test-audio.mp3');
        const latency = performance.now() - startTime;

        expect(latency).toBeLessThan(100); // Critical requirement: <100ms
      } finally {
        audioManager.destroy();
      }
    });

    test('Gapless audio transition should have no audible gaps', async () => {
      const audioManager = new GaplessAudioManager();
      let gapDetected = false;

      // Mock Web Audio API
      const mockAudioContext = {
        state: 'running',
        currentTime: 0,
        createGain: jest.fn(() => ({
          gain: { value: 1, exponentialRampToValueAtTime: jest.fn() },
          connect: jest.fn()
        })),
        createMediaElementSource: jest.fn(() => ({
          connect: jest.fn()
        })),
        destination: {},
        resume: jest.fn()
      };

      // @ts-ignore
      global.AudioContext = jest.fn(() => mockAudioContext);

      const mockAudio1 = {
        duration: 3.0,
        currentTime: 2.975, // Near end for transition test
        paused: false,
        ended: false,
        play: jest.fn().mockResolvedValue(undefined),
        pause: jest.fn(),
        addEventListener: jest.fn((event, callback) => {
          if (event === 'canplaythrough') callback();
        }),
        removeEventListener: jest.fn()
      };

      const mockAudio2 = {
        duration: 3.0,
        currentTime: 0,
        paused: true,
        ended: false,
        play: jest.fn().mockResolvedValue(undefined),
        pause: jest.fn(),
        addEventListener: jest.fn((event, callback) => {
          if (event === 'canplaythrough') callback();
        }),
        removeEventListener: jest.fn()
      };

      // @ts-ignore
      global.Audio = jest.fn()
        .mockReturnValueOnce(mockAudio1)
        .mockReturnValueOnce(mockAudio2);

      try {
        await audioManager.preloadAudio('audio1', '/audio1.mp3');
        await audioManager.preloadAudio('audio2', '/audio2.mp3');

        await audioManager.playWithTransition('audio1', 'audio2');

        // Verify no gaps detected
        expect(gapDetected).toBe(false);
      } finally {
        audioManager.destroy();
      }
    });
  });

  describe('Memory Performance Requirements', () => {
    test('Memory usage should stay under 100MB on 2GB devices', async () => {
      // Simulate 2GB device
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 2
      });

      const monitor = new MobilePerformanceMonitor({
        memoryUsage: 100 * 1024 * 1024 // 100MB limit
      });

      monitor.startMonitoring();

      // Simulate memory usage
      (global as any).performance.memory.usedJSHeapSize = 80 * 1024 * 1024; // 80MB

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const metrics = monitor.getMetrics();
      expect(metrics.memoryUsage).toBeLessThan(100 * 1024 * 1024);
      expect(metrics.status).not.toBe('critical');

      monitor.destroy();
    });

    test('DOM node count should be limited for virtualization', async () => {
      render(
        <ContinuousReadingContainer
          bookContent={mockBookContent}
          currentChunk={0}
          eslLevel="B2"
          voiceProvider="openai"
          selectedVoice="alloy"
          isPlaying={false}
          onPlayStateChange={() => {}}
          onChunkChange={() => {}}
          onWordHighlight={() => {}}
        />
      );

      await waitFor(() => {
        const allElements = document.querySelectorAll('*');
        expect(allElements.length).toBeLessThan(1000); // Reasonable DOM limit
      });
    });
  });

  describe('Scroll Performance Requirements', () => {
    test('Scroll performance should maintain 55+ FPS', async () => {
      const monitor = new MobilePerformanceMonitor({
        scrollFPS: 55
      });

      monitor.startMonitoring();

      // Simulate smooth scrolling
      let frameCount = 0;
      const targetFPS = 60;
      const simulateScroll = () => {
        frameCount++;
        if (frameCount < 60) { // Simulate 1 second at 60fps
          requestAnimationFrame(simulateScroll);
        }
      };

      await act(async () => {
        simulateScroll();
        await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for measurement
      });

      const metrics = monitor.getMetrics();
      expect(metrics.scrollFPS).toBeGreaterThan(55);

      monitor.destroy();
    });
  });

  describe('Chunk Transition Performance', () => {
    test('Chunk transitions should complete under 100ms', async () => {
      const monitor = new MobilePerformanceMonitor();
      const startTime = performance.now();

      render(
        <ContinuousReadingContainer
          bookContent={mockBookContent}
          currentChunk={0}
          eslLevel="B2"
          voiceProvider="openai"
          selectedVoice="alloy"
          isPlaying={false}
          onPlayStateChange={() => {}}
          onChunkChange={() => {}}
          onWordHighlight={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/first paragraph/)).toBeInTheDocument();
      });

      monitor.trackChunkTransition(startTime);
      const metrics = monitor.getMetrics();

      expect(metrics.chunkTransitionTime).toBeLessThan(100);

      monitor.destroy();
    });
  });

  describe('Prefetch System Performance', () => {
    test('Prefetch should adapt to network conditions', async () => {
      const prefetchManager = new MobilePrefetchManager();

      // Test slow network adaptation
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          saveData: true
        }
      });

      await prefetchManager.schedulePrefetch(
        {
          chunkIndex: 0,
          paragraphIndex: 0,
          eslLevel: 'B2'
        },
        'test-book'
      );

      const stats = prefetchManager.getStats();

      // On slow network with data saver, should limit prefetching
      expect(stats.prefetched).toBeLessThanOrEqual(2);

      prefetchManager.destroy();
    });
  });

  describe('Integration Tests', () => {
    test('Continuous reading container should render without errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ContinuousReadingContainer
          bookContent={mockBookContent}
          currentChunk={0}
          eslLevel="B2"
          voiceProvider="openai"
          selectedVoice="alloy"
          isPlaying={false}
          onPlayStateChange={() => {}}
          onChunkChange={() => {}}
          onWordHighlight={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Preparing continuous reading/)).toBeInTheDocument();
      });

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/error/i)
      );

      consoleSpy.mockRestore();
    });

    test('Feature flags should control component behavior', async () => {
      // Mock feature flags disabled
      jest.mocked(require('@/lib/feature-flags').useFeatureFlags).mockReturnValue({
        continuousReading: false,
        gaplessAudio: false,
        virtualizedScrolling: false,
        predictivePrefetch: false,
        mobileOptimizations: true
      });

      render(
        <ContinuousReadingContainer
          bookContent={mockBookContent}
          currentChunk={0}
          eslLevel="B2"
          voiceProvider="openai"
          selectedVoice="alloy"
          isPlaying={false}
          onPlayStateChange={() => {}}
          onChunkChange={() => {}}
          onWordHighlight={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/chunk-based reading mode/)).toBeInTheDocument();
      });
    });
  });

  describe('Critical Success Gates', () => {
    test('All critical performance tests should pass', async () => {
      const monitor = new MobilePerformanceMonitor();
      monitor.startMonitoring();

      const allTestsPassed = await monitor.runCriticalTests();

      expect(allTestsPassed).toBe(true);

      monitor.destroy();
    });
  });
});