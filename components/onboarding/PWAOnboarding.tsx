'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Download, 
  BookOpen, 
  Volume2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Check
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  actionText?: string;
  skipText?: string;
}

interface PWAOnboardingProps {
  onComplete?: () => void;
  onSkip?: () => void;
  autoShow?: boolean;
  isVisible?: boolean;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to BookBridge PWA',
    description: 'Experience BookBridge like a native app with enhanced features designed for seamless reading.',
    icon: <Smartphone className="w-12 h-12 text-blue-400" />,
    features: [
      'Install on your device like a native app',
      'Read books offline without internet',
      'Automatic progress sync across devices',
      'Enhanced performance and speed'
    ],
    actionText: 'Get Started'
  },
  {
    id: 'offline',
    title: 'Read Offline Anytime',
    description: 'Download books and continue reading even without an internet connection.',
    icon: <WifiOff className="w-12 h-12 text-green-400" />,
    features: [
      'Books download automatically as you read',
      'Audio continues to work offline',
      'Clear indicators show what\'s available offline',
      'Smart caching prioritizes your favorite books'
    ],
    actionText: 'Learn More'
  },
  {
    id: 'sync',
    title: 'Automatic Progress Sync',
    description: 'Your reading progress, bookmarks, and preferences sync seamlessly when you\'re back online.',
    icon: <RefreshCw className="w-12 h-12 text-purple-400" />,
    features: [
      'Reading progress saved in real-time',
      'Bookmarks and highlights preserved',
      'Audio positions remembered',
      'Works across all your devices'
    ],
    actionText: 'Continue'
  },
  {
    id: 'audio',
    title: 'Enhanced Audio Experience',
    description: 'Enjoy adaptive audio quality that adjusts to your network conditions.',
    icon: <Volume2 className="w-12 h-12 text-orange-400" />,
    features: [
      'Instant playback with smart pre-loading',
      'Network-adaptive quality (2G to WiFi)',
      'Background audio with precise highlighting',
      'Seamless chapter transitions'
    ],
    actionText: 'Almost Done'
  },
  {
    id: 'install',
    title: 'Install BookBridge',
    description: 'Add BookBridge to your home screen for the best reading experience.',
    icon: <Download className="w-12 h-12 text-indigo-400" />,
    features: [
      'One-tap access from your home screen',
      'Full-screen reading without browser UI',
      'Faster loading and better performance',
      'Works like any other app on your device'
    ],
    actionText: 'Install Now',
    skipText: 'Maybe Later'
  }
];

export default function PWAOnboarding({ 
  onComplete, 
  onSkip, 
  autoShow = true, 
  isVisible: controlledVisible 
}: PWAOnboardingProps) {
  const [internalVisible, setInternalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Use controlled visibility if provided, otherwise use internal state
  const isVisible = controlledVisible !== undefined ? controlledVisible : internalVisible;

  useEffect(() => {
    // Check if user has already seen onboarding
    const seenOnboarding = localStorage.getItem('bookbridge-pwa-onboarding-completed');
    if (seenOnboarding === 'true') {
      setHasSeenOnboarding(true);
      return;
    }

    if (autoShow && controlledVisible === undefined) {
      // Show onboarding after a brief delay on first visit
      const timer = setTimeout(() => {
        setInternalVisible(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [autoShow, controlledVisible]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('bookbridge-pwa-onboarding-completed', 'true');
    setInternalVisible(false);
    setHasSeenOnboarding(true);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem('bookbridge-pwa-onboarding-completed', 'true');
    setInternalVisible(false);
    setHasSeenOnboarding(true);
    onSkip?.();
  };

  const handleInstallClick = () => {
    // Trigger install prompt if available
    const installPromptEvent = (window as any).__bookbridge_install_prompt;
    if (installPromptEvent) {
      installPromptEvent.prompt();
      installPromptEvent.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('PWAOnboarding: User accepted install prompt');
        }
        (window as any).__bookbridge_install_prompt = null;
      });
    }
    handleComplete();
  };

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  if (!isVisible || hasSeenOnboarding) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close Button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors z-10"
          aria-label="Close onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex space-x-2">
              {ONBOARDING_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep 
                      ? 'bg-blue-400' 
                      : index < currentStep 
                        ? 'bg-green-400' 
                        : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-slate-800/50">
              {currentStepData.icon}
            </div>
          </div>

          {/* Title and Description */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-3">
              {currentStepData.title}
            </h2>
            <p className="text-slate-300 leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-3 mb-8">
            {currentStepData.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-400/20 flex items-center justify-center mt-0.5">
                  <Check className="w-3 h-3 text-green-400" />
                </div>
                <span className="text-sm text-slate-300">{feature}</span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            
            <div className="flex-1" />

            {currentStepData.skipText && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                {currentStepData.skipText}
              </button>
            )}

            <button
              onClick={currentStepData.id === 'install' ? handleInstallClick : handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
            >
              {currentStepData.actionText}
              {currentStepData.id !== 'install' && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Step {currentStep + 1} of {ONBOARDING_STEPS.length}</span>
            <span>Swipe or use arrow keys</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for manually triggering onboarding
export const usePWAOnboarding = () => {
  const [visible, setVisible] = useState(false);

  const showOnboarding = () => {
    // Reset onboarding state to allow showing again
    localStorage.removeItem('bookbridge-pwa-onboarding-completed');
    setVisible(true);
  };

  const hideOnboarding = () => {
    setVisible(false);
  };

  return { showOnboarding, hideOnboarding, isVisible: visible };
};