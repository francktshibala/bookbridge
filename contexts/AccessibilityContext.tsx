'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface AccessibilityPreferences {
  fontSize: number; // 16-24px range
  contrast: 'normal' | 'high' | 'ultra-high';
  reducedMotion: boolean;
  screenReaderMode: boolean;
  dyslexiaFont: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  voiceNavigation: boolean;
  readingSpeed: number; // 1.0-3.0x for text-to-speech
}

interface AccessibilityContextType {
  preferences: AccessibilityPreferences;
  updatePreference: <K extends keyof AccessibilityPreferences>(
    key: K, 
    value: AccessibilityPreferences[K]
  ) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
}

const defaultPreferences: AccessibilityPreferences = {
  fontSize: 18,
  contrast: 'normal',
  reducedMotion: false,
  screenReaderMode: false,
  dyslexiaFont: false,
  colorBlindMode: 'none',
  voiceNavigation: false,
  readingSpeed: 1.0,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('bookbridge-accessibility');
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load accessibility preferences:', e);
      }
    }

    // Check system preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPreferences(prev => ({ ...prev, reducedMotion: true }));
    }
  }, []);

  const updatePreference = useCallback(<K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('bookbridge-accessibility', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }, []);

  // Apply font size to document
  useEffect(() => {
    document.documentElement.style.fontSize = `${preferences.fontSize}px`;
  }, [preferences.fontSize]);

  // Apply contrast mode
  useEffect(() => {
    document.documentElement.setAttribute('data-contrast', preferences.contrast);
  }, [preferences.contrast]);

  // Apply dyslexia font
  useEffect(() => {
    if (preferences.dyslexiaFont) {
      document.body.classList.add('font-dyslexia');
    } else {
      document.body.classList.remove('font-dyslexia');
    }
  }, [preferences.dyslexiaFont]);

  return (
    <AccessibilityContext.Provider value={{ preferences, updatePreference, announceToScreenReader }}>
      {children}
    </AccessibilityContext.Provider>
  );
};