'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { VoiceNavigation } from '@/components/VoiceNavigation';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface VoiceNavigationWrapperProps {
  children: React.ReactNode;
}

export const VoiceNavigationWrapper: React.FC<VoiceNavigationWrapperProps> = ({ children }) => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [textSize, setTextSize] = useState(16); // Default text size in px
  const router = useRouter();
  const pathname = usePathname();
  const { announceToScreenReader } = useAccessibility();

  // Handle keyboard shortcut (V key) to toggle voice navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle voice navigation with 'V' key (when not in input field)
      if (
        event.key?.toLowerCase() === 'v' && 
        !event.ctrlKey && 
        !event.metaKey && 
        !event.altKey &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !((event.target as HTMLElement)?.isContentEditable)
      ) {
        event.preventDefault();
        setIsVoiceEnabled(prev => {
          const newState = !prev;
          announceToScreenReader(
            newState ? 'Voice navigation enabled' : 'Voice navigation disabled',
            'assertive'
          );
          return newState;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [announceToScreenReader]);

  // Apply text size changes to document root
  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${textSize}px`);
  }, [textSize]);

  // Handle voice commands
  const handleVoiceCommand = useCallback((action: string, transcript: string) => {
    switch (action) {
      case 'navigate-home':
        router.push('/');
        announceToScreenReader('Navigating to home page', 'assertive');
        break;
        
      case 'navigate-library':
        router.push('/library');
        announceToScreenReader('Navigating to library', 'assertive');
        break;
        
      case 'start-reading':
        // Find the first book and navigate to it
        if (pathname === '/library') {
          announceToScreenReader('Looking for first book to start reading', 'assertive');
          // This would be implemented based on the current library state
        } else {
          announceToScreenReader('Please go to library first to select a book', 'assertive');
        }
        break;
        
      case 'open-chat':
        // Scroll to or focus the chat interface if present
        const chatElement = document.querySelector('[aria-labelledby="ai-chat-heading"]');
        if (chatElement) {
          chatElement.scrollIntoView({ behavior: 'smooth' });
          // Focus the input field
          const inputElement = chatElement.querySelector('input[type="text"]') as HTMLInputElement;
          if (inputElement) {
            inputElement.focus();
            announceToScreenReader('AI chat focused and ready for your question', 'assertive');
          }
        } else {
          announceToScreenReader('AI chat not available on this page', 'assertive');
        }
        break;
        
      case 'next-page':
        // Implement page navigation logic
        const nextButton = document.querySelector('[aria-label*="next" i], [aria-label*="forward" i]');
        if (nextButton instanceof HTMLButtonElement) {
          nextButton.click();
          announceToScreenReader('Going to next page', 'assertive');
        } else {
          announceToScreenReader('Next page not available', 'assertive');
        }
        break;
        
      case 'prev-page':
        // Implement page navigation logic
        const prevButton = document.querySelector('[aria-label*="previous" i], [aria-label*="back" i]');
        if (prevButton instanceof HTMLButtonElement) {
          prevButton.click();
          announceToScreenReader('Going to previous page', 'assertive');
        } else {
          announceToScreenReader('Previous page not available', 'assertive');
        }
        break;
        
      case 'text-larger':
        setTextSize(prev => {
          const newSize = Math.min(prev + 2, 24); // Max 24px
          announceToScreenReader(`Text size increased to ${newSize} pixels`, 'assertive');
          return newSize;
        });
        break;
        
      case 'text-smaller':
        setTextSize(prev => {
          const newSize = Math.max(prev - 2, 12); // Min 12px
          announceToScreenReader(`Text size decreased to ${newSize} pixels`, 'assertive');
          return newSize;
        });
        break;
        
      case 'toggle-contrast':
        // Toggle high contrast mode
        const body = document.body;
        const isHighContrast = body.classList.contains('high-contrast');
        
        if (isHighContrast) {
          body.classList.remove('high-contrast');
          announceToScreenReader('High contrast mode disabled', 'assertive');
        } else {
          body.classList.add('high-contrast');
          announceToScreenReader('High contrast mode enabled', 'assertive');
        }
        break;
        
      case 'stop-voice':
        setIsVoiceEnabled(false);
        announceToScreenReader('Voice navigation stopped', 'assertive');
        break;
        
      default:
        announceToScreenReader(`Unknown command: ${action}`, 'assertive');
        break;
    }
  }, [router, pathname, announceToScreenReader]);

  return (
    <>
      {children}
      
      {/* Voice Navigation Component */}
      <VoiceNavigation
        onVoiceCommand={handleVoiceCommand}
        disabled={!isVoiceEnabled}
        className="voice-navigation"
      />
      
      {/* Add global CSS for text sizing and high contrast */}
      <style jsx global>{`
        :root {
          --base-font-size: ${textSize}px;
        }
        
        /* Apply custom text size to main content areas */
        main p, main div, main span, main li {
          font-size: var(--base-font-size) !important;
        }
        
        /* High contrast mode styles */
        body.high-contrast {
          filter: contrast(1.5) !important;
          background: #000000 !important;
          color: #ffffff !important;
        }
        
        body.high-contrast * {
          background-color: #000000 !important;
          color: #ffffff !important;
          border-color: #ffffff !important;
        }
        
        body.high-contrast a {
          color: #ffff00 !important;
        }
        
        body.high-contrast button {
          background-color: #ffffff !important;
          color: #000000 !important;
          border: 2px solid #ffffff !important;
        }
        
        body.high-contrast input, body.high-contrast textarea {
          background-color: #000000 !important;
          color: #ffffff !important;
          border: 2px solid #ffffff !important;
        }
        
        /* Ensure gradients are visible in high contrast */
        body.high-contrast [style*="gradient"] {
          background: #333333 !important;
        }
      `}</style>
    </>
  );
};