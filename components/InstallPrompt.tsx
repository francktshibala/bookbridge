'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ABTestManager, UserEngagement, useReadingEngagement as useABTestEngagement } from '@/lib/ab-testing';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { engagement } = useABTestEngagement();
  const [abTestManager, setAbTestManager] = useState<ABTestManager | null>(null);

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

  // Initialize A/B test manager
  useEffect(() => {
    const userId = localStorage.getItem('user_id') || 'anonymous_' + Math.random().toString(36).substr(2, 9);
    if (!localStorage.getItem('user_id')) {
      localStorage.setItem('user_id', userId);
    }
    setAbTestManager(ABTestManager.getInstance(userId));
  }, []);

  useEffect(() => {
    if (!isInstallable || !deferredPrompt || isInstalled || !abTestManager) return;

    // Check if should show prompt based on A/B test variant
    const timer = setTimeout(() => {
      if (abTestManager.shouldShowPrompt(engagement)) {
        setShowPrompt(true);
        // Track that prompt was shown
        abTestManager.trackEvent('shown', { page: window.location.pathname }, engagement);
      }
    }, 3000); // 3 second delay

    return () => clearTimeout(timer);
  }, [isInstallable, deferredPrompt, isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt || !abTestManager) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      // Track A/B test result
      const action = choiceResult.outcome === 'accepted' ? 'accepted' : 'dismissed';
      abTestManager.trackEvent(action, { page: window.location.pathname }, engagement);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
    } catch (error) {
      console.error('Error during install prompt:', error);
    }

    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismissClick = () => {
    if (abTestManager) {
      abTestManager.trackEvent('dismissed', { page: window.location.pathname }, engagement);
    }
    setShowPrompt(false);
  };

  // Don't render if not installable, already installed, or shouldn't show prompt
  if (!isInstallable || isInstalled || !showPrompt || !abTestManager) {
    return null;
  }

  const variant = abTestManager.getVariant();

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
                  <h3 className="text-lg font-semibold">{variant.config.copy.title}</h3>
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
                  {variant.config.copy.description}
                </p>
                
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 bg-white text-blue-600 px-4 py-2 rounded-md font-semibold text-sm hover:bg-blue-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  >
                    {variant.config.copy.primaryButton}
                  </button>
                  <button
                    onClick={handleDismissClick}
                    className="px-4 py-2 text-blue-100 hover:text-white text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded-md"
                  >
                    {variant.config.copy.secondaryButton}
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