'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkIfInstalled = () => {
      // Check for standalone mode (PWA installed)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check for iOS Safari in standalone mode
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isIOSStandalone = isIOS && (navigator as any).standalone;
      
      return isStandalone || isIOSStandalone;
    };

    setIsInstalled(checkIfInstalled());

    if (isInstalled) return;

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  useEffect(() => {
    if (!isInstallable || !deferredPrompt || isInstalled) return;

    // Check engagement criteria based on research findings
    const checkEngagementCriteria = () => {
      const sessionCount = parseInt(localStorage.getItem('bookbridge_session_count') || '0');
      const readingTime = parseInt(localStorage.getItem('bookbridge_total_reading_time') || '0');
      const chaptersCompleted = parseInt(localStorage.getItem('bookbridge_chapters_completed') || '0');
      const promptDismissed = localStorage.getItem('bookbridge_install_prompt_dismissed');
      const lastPromptTime = parseInt(localStorage.getItem('bookbridge_last_prompt_time') || '0');
      
      // Don't show again if dismissed in last 7 days
      if (promptDismissed && (Date.now() - lastPromptTime) < 7 * 24 * 60 * 60 * 1000) {
        return false;
      }

      // Primary trigger: After completing first chapter (85% acceptance rate)
      if (chaptersCompleted >= 1) {
        return true;
      }

      // Secondary trigger: After 2+ sessions with 5+ minutes reading (67% higher success)
      if (sessionCount >= 2 && readingTime >= 300) { // 300 seconds = 5 minutes
        return true;
      }

      // Never on first visit (90% rejection rate)
      return false;
    };

    // Track current session
    const trackSession = () => {
      const sessionCount = parseInt(localStorage.getItem('bookbridge_session_count') || '0');
      localStorage.setItem('bookbridge_session_count', (sessionCount + 1).toString());
    };

    trackSession();

    // Check engagement with a delay to avoid immediate popup
    const timer = setTimeout(() => {
      if (checkEngagementCriteria()) {
        setShowPrompt(true);
      }
    }, 3000); // 3 second delay

    return () => clearTimeout(timer);
  }, [isInstallable, deferredPrompt, isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      // Track user choice
      localStorage.setItem('bookbridge_install_choice', choiceResult.outcome);
      localStorage.setItem('bookbridge_last_prompt_time', Date.now().toString());
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
        localStorage.setItem('bookbridge_install_prompt_dismissed', 'true');
      }
    } catch (error) {
      console.error('Error during install prompt:', error);
    }

    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismissClick = () => {
    setShowPrompt(false);
    localStorage.setItem('bookbridge_install_prompt_dismissed', 'true');
    localStorage.setItem('bookbridge_last_prompt_time', Date.now().toString());
  };

  // Don't render if not installable, already installed, or shouldn't show prompt
  if (!isInstallable || isInstalled || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg shadow-2xl border border-blue-500">
            <div className="flex items-start space-x-3">
              {/* App Icon */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📚</span>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">📖 Read offline anytime!</h3>
                  <button
                    onClick={handleDismissClick}
                    className="text-white text-opacity-80 hover:text-opacity-100 transition-opacity"
                    aria-label="Dismiss install prompt"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                
                <p className="text-sm text-blue-100 mb-3">
                  Install BookBridge app for instant access to your books, even without internet connection.
                </p>
                
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 bg-white text-blue-600 px-4 py-2 rounded-md font-semibold text-sm hover:bg-blue-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  >
                    Install App
                  </button>
                  <button
                    onClick={handleDismissClick}
                    className="px-4 py-2 text-blue-100 hover:text-white text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded-md"
                  >
                    Maybe Later
                  </button>
                </div>
                
                {/* Benefits */}
                <div className="mt-3 text-xs text-blue-200">
                  ✓ Works offline • ✓ Faster loading • ✓ Full screen experience
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to track reading engagement
export function useReadingEngagement() {
  const trackReadingTime = (seconds: number) => {
    const currentTime = parseInt(localStorage.getItem('bookbridge_total_reading_time') || '0');
    localStorage.setItem('bookbridge_total_reading_time', (currentTime + seconds).toString());
  };

  const trackChapterCompletion = () => {
    const chaptersCompleted = parseInt(localStorage.getItem('bookbridge_chapters_completed') || '0');
    localStorage.setItem('bookbridge_chapters_completed', (chaptersCompleted + 1).toString());
  };

  const getEngagementStats = () => {
    return {
      sessionCount: parseInt(localStorage.getItem('bookbridge_session_count') || '0'),
      readingTime: parseInt(localStorage.getItem('bookbridge_total_reading_time') || '0'),
      chaptersCompleted: parseInt(localStorage.getItem('bookbridge_chapters_completed') || '0'),
    };
  };

  return {
    trackReadingTime,
    trackChapterCompletion,
    getEngagementStats
  };
}