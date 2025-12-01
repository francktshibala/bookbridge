import { useState, useCallback, useRef, useEffect } from 'react';

// Configuration
const LONG_PRESS_DURATION = 500; // 0.5 seconds
const CLICK_TIMEOUT = 300; // 300ms for distinguishing click vs drag (increased from 200ms)
const DRAG_THRESHOLD = 10; // 10px threshold for drag detection (increased from 5px)
const SCROLL_COOLDOWN = 300; // 300ms cooldown after scroll ends before allowing dictionary
const HIGHLIGHT_CLASS = 'dictionary-word-selected';

interface DictionaryInteractionResult {
  selectedWord: string | null;
  selectedElement: HTMLElement | null;
  handleMouseDown: (e: React.MouseEvent<HTMLSpanElement>) => void;
  handleMouseUp: (e: React.MouseEvent<HTMLSpanElement>) => void;
  handleTouchStart: (e: React.TouchEvent<HTMLSpanElement>) => void;
  handleTouchEnd: (e: React.TouchEvent<HTMLSpanElement>) => void;
  clearSelection: () => void;
}

export function useDictionaryInteraction(): DictionaryInteractionResult {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const mouseDownTimeRef = useRef<number>(0);
  const isLongPressRef = useRef(false);
  const isDraggingRef = useRef(false);
  
  // Scroll detection state (Option 1: Scroll Detection + Cooldown)
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef<number>(0);

  // Scroll detection effect (Option 1: Scroll Detection + Cooldown)
  useEffect(() => {
    const handleScroll = () => {
      isScrollingRef.current = true;
      lastScrollTimeRef.current = Date.now();
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Set cooldown period after scroll ends
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        console.log('📖 Dictionary: Scroll cooldown ended, dictionary enabled');
      }, SCROLL_COOLDOWN);
    };

    // Listen for scroll events (wheel for desktop, touchmove for mobile)
    window.addEventListener('wheel', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Clean up selection when component unmounts
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      clearSelection();
    };
  }, []);

  const clearSelection = useCallback(() => {
    // Remove highlight from previously selected element
    if (selectedElement) {
      selectedElement.classList.remove(HIGHLIGHT_CLASS);
    }
    setSelectedWord(null);
    setSelectedElement(null);
    isLongPressRef.current = false;
  }, [selectedElement]);

  const extractWordFromElement = (element: HTMLElement, clientX?: number, clientY?: number): string | null => {
    const text = element.textContent || '';
    if (!text.trim()) return null;

    // If we don't have click coordinates, return first word (fallback)
    if (clientX === undefined || clientY === undefined) {
      const words = text.trim().split(/\s+/).filter(word => word.length > 1);
      return cleanWord(words[0]) || null;
    }

    // Create a range to find word at click position
    try {
      const range = document.createRange();
      const textNode = getTextNode(element);
      if (!textNode) return null;

      // Binary search to find the character at click position
      const charIndex = findCharacterAtPosition(textNode, clientX, clientY);
      if (charIndex === -1) return null;

      // Find word boundaries around the character
      const wordBounds = findWordBoundaries(text, charIndex);
      if (!wordBounds) return null;

      const word = text.substring(wordBounds.start, wordBounds.end);
      return cleanWord(word);
    } catch (error) {
      console.log('📖 Dictionary: Using fallback word extraction');
      // Fallback to first word
      const words = text.trim().split(/\s+/).filter(word => word.length > 1);
      return cleanWord(words[0]) || null;
    }
  };

  // Helper: Get the text node from element
  const getTextNode = (element: HTMLElement): Text | null => {
    for (let i = 0; i < element.childNodes.length; i++) {
      const node = element.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        return node as Text;
      }
    }
    return null;
  };

  // Helper: Find character at click position using improved algorithm
  const findCharacterAtPosition = (textNode: Text, clientX: number, clientY: number): number => {
    const text = textNode.textContent || '';
    const range = document.createRange();
    let bestIndex = -1;
    let bestDistance = Infinity;

    // Strategy: Check each character position to find the closest one
    for (let i = 0; i <= text.length; i++) {
      try {
        range.setStart(textNode, i);
        range.setEnd(textNode, Math.min(i + 1, text.length));

        const rect = range.getBoundingClientRect();

        // Skip empty rects (whitespace characters)
        if (rect.width === 0 && rect.height === 0) continue;

        // Calculate distance from click point to character center
        const charCenterX = rect.left + rect.width / 2;
        const charCenterY = rect.top + rect.height / 2;
        const distance = Math.sqrt(
          Math.pow(clientX - charCenterX, 2) +
          Math.pow(clientY - charCenterY, 2)
        );

        // Prefer characters on the same line (prioritize Y distance)
        const lineDistance = Math.abs(clientY - charCenterY);
        const horizontalDistance = Math.abs(clientX - charCenterX);

        // If on different lines, heavily penalize
        const adjustedDistance = lineDistance > 10 ? distance + 1000 : distance;

        if (adjustedDistance < bestDistance) {
          bestDistance = adjustedDistance;
          bestIndex = i;
        }
      } catch (error) {
        // Skip invalid ranges
        continue;
      }
    }

    console.log('📍 Dictionary: Found character at index', bestIndex, 'with distance', bestDistance);
    return bestIndex;
  };

  // Helper: Find word boundaries around character index
  const findWordBoundaries = (text: string, charIndex: number): { start: number; end: number } | null => {
    if (charIndex < 0 || charIndex >= text.length) return null;

    // Enhanced word boundary regex - includes letters, numbers, apostrophes, hyphens
    const wordChar = /[a-zA-Z0-9'''-]/;

    // If we're not on a word character, look for nearby word characters
    let targetIndex = charIndex;
    if (!wordChar.test(text[charIndex])) {
      // Look left and right for nearest word character (within 3 characters)
      let foundNearby = false;
      for (let offset = 1; offset <= 3 && !foundNearby; offset++) {
        // Check right
        if (charIndex + offset < text.length && wordChar.test(text[charIndex + offset])) {
          targetIndex = charIndex + offset;
          foundNearby = true;
        }
        // Check left
        if (!foundNearby && charIndex - offset >= 0 && wordChar.test(text[charIndex - offset])) {
          targetIndex = charIndex - offset;
          foundNearby = true;
        }
      }

      if (!foundNearby) {
        console.log('📍 Dictionary: No word character found near index', charIndex);
        return null;
      }
    }

    // Find start of word
    let start = targetIndex;
    while (start > 0 && wordChar.test(text[start - 1])) {
      start--;
    }

    // Find end of word
    let end = targetIndex;
    while (end < text.length - 1 && wordChar.test(text[end + 1])) {
      end++;
    }

    const word = text.substring(start, end + 1);
    console.log('📍 Dictionary: Found word boundaries:', { word, start, end: end + 1, charIndex, targetIndex });

    return { start, end: end + 1 };
  };

  // Helper: Clean word of punctuation and normalize
  const cleanWord = (word: string): string | null => {
    if (!word) return null;

    // Remove leading/trailing punctuation but keep internal apostrophes and hyphens
    const cleaned = word.replace(/^[^\w'''-]+|[^\w'''-]+$/g, '').toLowerCase();

    // Filter out very short words and common articles/prepositions
    if (cleaned.length < 2) return null;
    if (['a', 'an', 'the', 'is', 'it', 'in', 'on', 'at', 'to', 'of', 'or', 'and'].includes(cleaned)) {
      return null;
    }

    return cleaned;
  };

  const triggerHapticFeedback = () => {
    // Trigger haptic feedback if available (mobile devices)
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration
    }
  };

  const highlightWord = (element: HTMLElement, clientX?: number, clientY?: number) => {
    // Clear previous selection
    clearSelection();

    // Add highlight class to new element
    element.classList.add(HIGHLIGHT_CLASS);
    setSelectedElement(element);

    // Extract word from element using click coordinates
    const word = extractWordFromElement(element, clientX, clientY);
    if (word) {
      setSelectedWord(word);
      triggerHapticFeedback();
      console.log('📖 Dictionary: Selected word:', word, 'at position:', clientX, clientY);
    } else {
      // If no valid word found, clear selection
      clearSelection();
    }
  };

  const startLongPress = (element: HTMLElement, clientX?: number, clientY?: number) => {
    isLongPressRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      highlightWord(element, clientX, clientY);
    }, LONG_PRESS_DURATION);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPressRef.current = false;
  };

  // Mouse event handlers (desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    const target = e.currentTarget;
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    mouseDownTimeRef.current = Date.now();
    isDraggingRef.current = false;
    startLongPress(target, e.clientX, e.clientY);
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    cancelLongPress();

    // Option 1: Block dictionary if scrolling (with cooldown)
    if (isScrollingRef.current) {
      console.log('📖 Dictionary: Blocked - user is scrolling');
      mouseDownPos.current = null;
      mouseDownTimeRef.current = 0;
      return;
    }

    // Check if scroll just ended (within cooldown period)
    const timeSinceScroll = Date.now() - lastScrollTimeRef.current;
    if (timeSinceScroll < SCROLL_COOLDOWN) {
      console.log('📖 Dictionary: Blocked - scroll cooldown active');
      mouseDownPos.current = null;
      mouseDownTimeRef.current = 0;
      return;
    }

    const mouseUpTime = Date.now();
    const clickDuration = mouseUpTime - mouseDownTimeRef.current;
    const mouseDown = mouseDownPos.current;

    // Option 2: Check if mouse moved (dragging) with increased threshold
    if (mouseDown) {
      const dragDistance = Math.sqrt(
        Math.pow(e.clientX - mouseDown.x, 2) +
        Math.pow(e.clientY - mouseDown.y, 2)
      );
      isDraggingRef.current = dragDistance > DRAG_THRESHOLD; // 10px threshold (increased from 5px)
    }

    // Handle as dictionary lookup if:
    // 1. It was a long press, OR
    // 2. It was a quick click (not drag) under 300ms (increased from 200ms)
    const isQuickClick = clickDuration < CLICK_TIMEOUT && !isDraggingRef.current;
    const shouldTriggerDictionary = isLongPressRef.current || isQuickClick;

    if (shouldTriggerDictionary && !isLongPressRef.current) {
      // Handle quick click - trigger word lookup
      const target = e.currentTarget;
      highlightWord(target, e.clientX, e.clientY);
      e.stopPropagation();
    } else if (isLongPressRef.current) {
      // Long press already handled, just stop propagation
      e.stopPropagation();
    }

    // Reset states
    mouseDownPos.current = null;
    mouseDownTimeRef.current = 0;
  }, []);

  // Touch event handlers (mobile)
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLSpanElement>) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    const target = e.currentTarget;
    startLongPress(target, touch.clientX, touch.clientY);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLSpanElement>) => {
    cancelLongPress();

    // Option 1: Block dictionary if scrolling (with cooldown)
    if (isScrollingRef.current) {
      console.log('📖 Dictionary: Blocked - user is scrolling (touch)');
      return;
    }

    // Check if scroll just ended (within cooldown period)
    const timeSinceScroll = Date.now() - lastScrollTimeRef.current;
    if (timeSinceScroll < SCROLL_COOLDOWN) {
      console.log('📖 Dictionary: Blocked - scroll cooldown active (touch)');
      return;
    }

    // Check if it was a long press
    if (!isLongPressRef.current) {
      // Let the original onClick handler work for regular taps
      return;
    }

    // Prevent default and stop propagation for dictionary lookup
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return {
    selectedWord,
    selectedElement,
    handleMouseDown,
    handleMouseUp,
    handleTouchStart,
    handleTouchEnd,
    clearSelection
  };
}