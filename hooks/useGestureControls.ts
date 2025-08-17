'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface GestureEvent {
  type: 'swipe-up' | 'swipe-down' | 'swipe-left' | 'swipe-right' | 'double-tap' | 'long-press' | 'pinch-zoom';
  target: EventTarget | null;
  data?: {
    distance?: number;
    direction?: string;
    scale?: number;
    duration?: number;
  };
}

interface GestureHandler {
  (event: GestureEvent): void;
}

interface GestureConfig {
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  pinchThreshold?: number;
  enableHapticFeedback?: boolean;
}

interface UseGestureControlsProps {
  onSwipeUp?: GestureHandler;
  onSwipeDown?: GestureHandler;
  onSwipeLeft?: GestureHandler;
  onSwipeRight?: GestureHandler;
  onDoubleTap?: GestureHandler;
  onLongPress?: GestureHandler;
  onPinchZoom?: GestureHandler;
  config?: GestureConfig;
  disabled?: boolean;
}

export const useGestureControls = ({
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  onDoubleTap,
  onLongPress,
  onPinchZoom,
  config = {},
  disabled = false
}: UseGestureControlsProps) => {
  const { announceToScreenReader, preferences } = useAccessibility();
  const elementRef = useRef<HTMLElement | null>(null);
  
  // Gesture state
  const [isGestureActive, setIsGestureActive] = useState(false);
  const gestureStateRef = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0,
    tapCount: 0,
    isLongPressing: false,
    longPressTimer: null as NodeJS.Timeout | null,
    initialPinchDistance: 0,
    lastScale: 1
  });

  // Default configuration
  const defaultConfig: Required<GestureConfig> = {
    swipeThreshold: 50,
    longPressDelay: 500,
    doubleTapDelay: 300,
    pinchThreshold: 20,
    enableHapticFeedback: true,
    ...config
  };

  // Haptic feedback (if supported and enabled)
  const triggerHapticFeedback = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!defaultConfig.enableHapticFeedback || preferences.reducedMotion) return;
    
    if ('vibrate' in navigator) {
      const vibrationPattern = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(vibrationPattern[intensity]);
    }
  }, [defaultConfig.enableHapticFeedback, preferences.reducedMotion]);

  // Get distance between two points
  const getDistance = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }, []);

  // Get distance between two touch points (for pinch)
  const getPinchDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return getDistance(touch1.clientX, touch1.clientY, touch2.clientX, touch2.clientY);
  }, [getDistance]);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || preferences.reducedMotion) return;
    
    const touch = e.touches[0];
    const state = gestureStateRef.current;
    
    setIsGestureActive(true);
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.startTime = Date.now();
    state.isLongPressing = false;

    // Handle pinch start
    if (e.touches.length === 2) {
      state.initialPinchDistance = getPinchDistance(e.touches);
      state.lastScale = 1;
    }

    // Clear existing long press timer
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
    }

    // Start long press timer
    if (onLongPress) {
      state.longPressTimer = setTimeout(() => {
        state.isLongPressing = true;
        triggerHapticFeedback('medium');
        announceToScreenReader('Long press detected');
        
        onLongPress({
          type: 'long-press',
          target: e.target,
          data: { duration: Date.now() - state.startTime }
        });
      }, defaultConfig.longPressDelay);
    }

    // Handle potential double tap
    const currentTime = Date.now();
    if (currentTime - state.lastTapTime < defaultConfig.doubleTapDelay) {
      state.tapCount++;
    } else {
      state.tapCount = 1;
    }
    state.lastTapTime = currentTime;
    
  }, [disabled, preferences.reducedMotion, onLongPress, defaultConfig.longPressDelay, defaultConfig.doubleTapDelay, getPinchDistance, triggerHapticFeedback, announceToScreenReader]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || preferences.reducedMotion) return;
    
    const state = gestureStateRef.current;

    // Handle pinch gesture
    if (e.touches.length === 2 && onPinchZoom) {
      const currentDistance = getPinchDistance(e.touches);
      if (state.initialPinchDistance > 0) {
        const scale = currentDistance / state.initialPinchDistance;
        const scaleDifference = Math.abs(scale - state.lastScale);
        
        if (scaleDifference > 0.1) { // Threshold to avoid too many events
          state.lastScale = scale;
          
          onPinchZoom({
            type: 'pinch-zoom',
            target: e.target,
            data: { scale }
          });
        }
      }
      return;
    }

    // Cancel long press if finger moves too much
    if (state.longPressTimer) {
      const touch = e.touches[0];
      const moveDistance = getDistance(state.startX, state.startY, touch.clientX, touch.clientY);
      
      if (moveDistance > 10) { // 10px threshold
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }
    }
  }, [disabled, preferences.reducedMotion, onPinchZoom, getPinchDistance, getDistance]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (disabled || preferences.reducedMotion) return;
    
    const state = gestureStateRef.current;
    setIsGestureActive(false);

    // Clear long press timer
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    // Don't process swipes if it was a long press
    if (state.isLongPressing) {
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;
    const distance = getDistance(state.startX, state.startY, touch.clientX, touch.clientY);
    const duration = Date.now() - state.startTime;

    // Handle double tap
    if (state.tapCount === 2 && duration < defaultConfig.doubleTapDelay && distance < 20 && onDoubleTap) {
      triggerHapticFeedback('light');
      announceToScreenReader('Double tap detected');
      
      onDoubleTap({
        type: 'double-tap',
        target: e.target,
        data: { duration }
      });
      
      state.tapCount = 0;
      return;
    }

    // Handle swipe gestures
    if (distance >= defaultConfig.swipeThreshold && duration < 1000) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      let gestureType: GestureEvent['type'] | null = null;
      let direction = '';
      
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0) {
          gestureType = 'swipe-right';
          direction = 'right';
        } else {
          gestureType = 'swipe-left';
          direction = 'left';
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          gestureType = 'swipe-down';
          direction = 'down';
        } else {
          gestureType = 'swipe-up';
          direction = 'up';
        }
      }

      if (gestureType) {
        triggerHapticFeedback('light');
        announceToScreenReader(`Swipe ${direction} detected`);
        
        const gestureEvent: GestureEvent = {
          type: gestureType,
          target: e.target,
          data: { distance, direction, duration }
        };

        // Call appropriate handler
        switch (gestureType) {
          case 'swipe-up':
            onSwipeUp?.(gestureEvent);
            break;
          case 'swipe-down':
            onSwipeDown?.(gestureEvent);
            break;
          case 'swipe-left':
            onSwipeLeft?.(gestureEvent);
            break;
          case 'swipe-right':
            onSwipeRight?.(gestureEvent);
            break;
        }
      }
    }
  }, [disabled, preferences.reducedMotion, getDistance, defaultConfig.swipeThreshold, defaultConfig.doubleTapDelay, triggerHapticFeedback, announceToScreenReader, onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight, onDoubleTap]);

  // Keyboard alternatives for gestures
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;

    // Alt + Arrow keys for swipe alternatives
    if (e.altKey) {
      let gestureEvent: GestureEvent | null = null;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          gestureEvent = {
            type: 'swipe-up',
            target: e.target,
            data: { direction: 'up' }
          };
          announceToScreenReader('Swipe up via keyboard');
          onSwipeUp?.(gestureEvent);
          break;
          
        case 'ArrowDown':
          e.preventDefault();
          gestureEvent = {
            type: 'swipe-down',
            target: e.target,
            data: { direction: 'down' }
          };
          announceToScreenReader('Swipe down via keyboard');
          onSwipeDown?.(gestureEvent);
          break;
          
        case 'ArrowLeft':
          e.preventDefault();
          gestureEvent = {
            type: 'swipe-left',
            target: e.target,
            data: { direction: 'left' }
          };
          announceToScreenReader('Swipe left via keyboard');
          onSwipeLeft?.(gestureEvent);
          break;
          
        case 'ArrowRight':
          e.preventDefault();
          gestureEvent = {
            type: 'swipe-right',
            target: e.target,
            data: { direction: 'right' }
          };
          announceToScreenReader('Swipe right via keyboard');
          onSwipeRight?.(gestureEvent);
          break;
      }
    }

    // Ctrl + Enter for double tap alternative
    if (e.ctrlKey && e.key === 'Enter' && onDoubleTap) {
      e.preventDefault();
      announceToScreenReader('Double tap via keyboard');
      onDoubleTap({
        type: 'double-tap',
        target: e.target
      });
    }

    // Shift + Enter for long press alternative
    if (e.shiftKey && e.key === 'Enter' && onLongPress) {
      e.preventDefault();
      announceToScreenReader('Long press via keyboard');
      onLongPress({
        type: 'long-press',
        target: e.target
      });
    }
  }, [disabled, announceToScreenReader, onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight, onDoubleTap, onLongPress]);

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    // Touch events
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Keyboard events
    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('keydown', handleKeyDown);
      
      // Clean up any remaining timer
      const state = gestureStateRef.current;
      if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
      }
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleKeyDown]);

  // Provide keyboard hints to users
  const getKeyboardHints = useCallback(() => {
    const hints: string[] = [];
    
    if (onSwipeUp || onSwipeDown || onSwipeLeft || onSwipeRight) {
      hints.push('Alt + Arrow keys for swipe gestures');
    }
    if (onDoubleTap) {
      hints.push('Ctrl + Enter for double tap');
    }
    if (onLongPress) {
      hints.push('Shift + Enter for long press');
    }
    
    return hints;
  }, [onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight, onDoubleTap, onLongPress]);

  return {
    gestureRef: elementRef,
    isGestureActive,
    keyboardHints: getKeyboardHints(),
    triggerHapticFeedback
  };
};