import { useState, useCallback, useRef, useEffect } from 'react';

// Configuration
const LONG_PRESS_DURATION = 500; // 0.5 seconds
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
  const isLongPressRef = useRef(false);

  // Clean up selection when component unmounts
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
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

  // Helper: Find character at click position using binary search
  const findCharacterAtPosition = (textNode: Text, clientX: number, clientY: number): number => {
    const text = textNode.textContent || '';
    let left = 0;
    let right = text.length;
    let closestIndex = -1;
    let closestDistance = Infinity;

    const range = document.createRange();

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      range.setStart(textNode, mid);
      range.setEnd(textNode, Math.min(mid + 1, text.length));

      const rect = range.getBoundingClientRect();
      const distance = Math.abs(clientX - rect.left) + Math.abs(clientY - rect.top);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = mid;
      }

      if (rect.left < clientX) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return closestIndex;
  };

  // Helper: Find word boundaries around character index
  const findWordBoundaries = (text: string, charIndex: number): { start: number; end: number } | null => {
    if (charIndex < 0 || charIndex >= text.length) return null;

    // Word boundary regex - letters, numbers, apostrophes, hyphens
    const wordChar = /[a-zA-Z0-9'''-]/;

    // If we're not on a word character, return null
    if (!wordChar.test(text[charIndex])) return null;

    // Find start of word
    let start = charIndex;
    while (start > 0 && wordChar.test(text[start - 1])) {
      start--;
    }

    // Find end of word
    let end = charIndex;
    while (end < text.length - 1 && wordChar.test(text[end + 1])) {
      end++;
    }

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
    startLongPress(target, e.clientX, e.clientY);
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    cancelLongPress();

    // If it wasn't a long press, don't prevent the default click behavior
    // This allows normal sentence clicking to still work
    if (!isLongPressRef.current) {
      // Let the original onClick handler work
      return;
    }

    // Stop propagation only if we handled it as a dictionary lookup
    e.stopPropagation();
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