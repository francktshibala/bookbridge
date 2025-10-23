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

  const extractWordFromElement = (element: HTMLElement): string | null => {
    const text = element.textContent || '';

    // Get the click/touch position relative to the element
    // For now, we'll select the whole sentence and later can refine to individual words
    // This is a simplified version - in production, we'd use more sophisticated word detection

    // Remove extra whitespace and punctuation for word extraction
    const cleanText = text.trim();

    // For MVP, return the first substantive word in the sentence for testing
    // Later we'll implement proper word-at-position detection
    const words = cleanText.split(/\s+/).filter(word => word.length > 2);
    return words[0] || null;
  };

  const triggerHapticFeedback = () => {
    // Trigger haptic feedback if available (mobile devices)
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration
    }
  };

  const highlightWord = (element: HTMLElement) => {
    // Clear previous selection
    clearSelection();

    // Add highlight class to new element
    element.classList.add(HIGHLIGHT_CLASS);
    setSelectedElement(element);

    // Extract word from element
    const word = extractWordFromElement(element);
    if (word) {
      setSelectedWord(word);
      triggerHapticFeedback();
      console.log('📖 Dictionary: Selected word:', word);
    }
  };

  const startLongPress = (element: HTMLElement) => {
    isLongPressRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      highlightWord(element);
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
    startLongPress(target);
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
    startLongPress(target);
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