'use client';

import React, { useEffect } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface KeyboardShortcut {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  description: string;
  action: () => void;
}

const shortcuts: KeyboardShortcut[] = [
  {
    key: 'q',
    altKey: true,
    description: 'Focus question input',
    action: () => {
      const element = document.getElementById('ai-query-input');
      if (element) {
        element.focus();
        announceToScreenReader('Focused on question input');
      }
    }
  },
  {
    key: 'r',
    altKey: true,
    description: 'Focus book reader',
    action: () => {
      const element = document.getElementById('book-reader');
      if (element) {
        element.focus();
        announceToScreenReader('Focused on book reader');
      }
    }
  },
  {
    key: 'h',
    altKey: true,
    description: 'Show keyboard help',
    action: () => {
      showKeyboardHelp();
    }
  },
  {
    key: 's',
    altKey: true,
    description: 'Go to settings',
    action: () => {
      window.location.href = '/settings';
    }
  }
];

let announceToScreenReader: (message: string) => void = () => {};

const showKeyboardHelp = () => {
  const helpText = shortcuts
    .map(s => `Alt + ${s.key.toUpperCase()}: ${s.description}`)
    .join('. ');
  announceToScreenReader(`Keyboard shortcuts: ${helpText}`);
};

export const KeyboardNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const { announceToScreenReader: announce } = useAccessibility();
  announceToScreenReader = announce;

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Skip if user is typing in input
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Check for matching shortcuts
      const shortcut = shortcuts.find(s => 
        s.key.toLowerCase() === e.key.toLowerCase() &&
        !!s.altKey === e.altKey &&
        (s.ctrlKey === undefined || s.ctrlKey === e.ctrlKey) &&
        (s.shiftKey === undefined || s.shiftKey === e.shiftKey)
      );

      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }

      // Navigation within content
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const focusableElements = Array.from(document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )) as HTMLElement[];

        const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
        if (currentIndex !== -1) {
          const nextIndex = e.key === 'ArrowDown' 
            ? Math.min(currentIndex + 1, focusableElements.length - 1)
            : Math.max(currentIndex - 1, 0);
          
          focusableElements[nextIndex]?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  return <>{children}</>;
};