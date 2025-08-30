'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface SpotlightStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    text: string;
    onClick: () => void;
  };
}

interface FeatureSpotlightProps {
  steps: SpotlightStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  isVisible: boolean;
}

export default function FeatureSpotlight({ 
  steps, 
  onComplete, 
  onSkip, 
  isVisible 
}: FeatureSpotlightProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (!isVisible || !currentStepData) return;

    // Find the target element
    const element = document.querySelector(currentStepData.targetSelector) as HTMLElement;
    if (element) {
      setTargetElement(element);
      setSpotlightRect(element.getBoundingClientRect());
      
      // Scroll element into view if needed
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
    } else {
      console.warn(`FeatureSpotlight: Target element not found: ${currentStepData.targetSelector}`);
    }
  }, [currentStep, currentStepData, isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    // Update spotlight position on scroll/resize
    const updatePosition = () => {
      if (targetElement) {
        setSpotlightRect(targetElement.getBoundingClientRect());
      }
    };

    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [targetElement, isVisible]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
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
    onComplete?.();
  };

  const handleSkip = () => {
    onSkip?.();
  };

  const getTooltipPosition = () => {
    if (!spotlightRect || !tooltipRef.current) return {};

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 20;

    let top = 0;
    let left = 0;

    switch (currentStepData.position) {
      case 'top':
        top = spotlightRect.top - tooltipRect.height - padding;
        left = spotlightRect.left + (spotlightRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = spotlightRect.bottom + padding;
        left = spotlightRect.left + (spotlightRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = spotlightRect.top + (spotlightRect.height - tooltipRect.height) / 2;
        left = spotlightRect.left - tooltipRect.width - padding;
        break;
      case 'right':
        top = spotlightRect.top + (spotlightRect.height - tooltipRect.height) / 2;
        left = spotlightRect.right + padding;
        break;
      case 'center':
      default:
        top = window.innerHeight / 2 - tooltipRect.height / 2;
        left = window.innerWidth / 2 - tooltipRect.width / 2;
        break;
    }

    // Keep tooltip within viewport
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

    return { top: `${top}px`, left: `${left}px` };
  };

  const getArrowDirection = () => {
    switch (currentStepData.position) {
      case 'top': return <ArrowDown className="w-4 h-4 text-blue-400" />;
      case 'bottom': return <ArrowUp className="w-4 h-4 text-blue-400" />;
      case 'left': return <ArrowRight className="w-4 h-4 text-blue-400" />;
      case 'right': return <ArrowLeft className="w-4 h-4 text-blue-400" />;
      default: return null;
    }
  };

  if (!isVisible || !currentStepData) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm">
        {/* Spotlight cutout */}
        {spotlightRect && (
          <div
            className="absolute border-2 border-blue-400 rounded-lg shadow-lg"
            style={{
              top: `${spotlightRect.top - 4}px`,
              left: `${spotlightRect.left - 4}px`,
              width: `${spotlightRect.width + 8}px`,
              height: `${spotlightRect.height + 8}px`,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              animation: 'pulse 2s infinite'
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 max-w-sm bg-slate-900 rounded-lg shadow-xl border border-slate-700/50 p-4"
        style={getTooltipPosition()}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Close spotlight"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Arrow indicator */}
        {currentStepData.position !== 'center' && (
          <div className="flex items-center gap-2 mb-2">
            {getArrowDirection()}
            <span className="text-xs text-slate-400 uppercase tracking-wide">Look here</span>
          </div>
        )}

        {/* Content */}
        <div className="mb-4">
          <h3 className="font-bold text-white mb-2">{currentStepData.title}</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            {currentStepData.description}
          </p>
        </div>

        {/* Action button */}
        {currentStepData.action && (
          <button
            onClick={() => {
              currentStepData.action?.onClick();
              handleNext();
            }}
            className="w-full mb-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            {currentStepData.action.text}
          </button>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-3 py-1 text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
          </div>

          <div className="text-slate-400">
            {currentStep + 1} of {steps.length}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="px-3 py-1 text-slate-400 hover:text-white transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
            >
              {currentStep === steps.length - 1 ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </>
  );
}

// Common spotlight configurations for BookBridge
export const BOOKBRIDGE_SPOTLIGHT_TOURS = {
  // First-time reading page tour
  readingPageTour: [
    {
      id: 'audio-controls',
      targetSelector: '.audio-controls',
      title: 'Audio Controls',
      description: 'Control audio playback with play/pause, speed adjustment, and chapter navigation.',
      position: 'bottom' as const
    },
    {
      id: 'text-content',
      targetSelector: '.book-content',
      title: 'Interactive Reading',
      description: 'Words highlight as they\'re spoken. Click any word to jump to that position in the audio.',
      position: 'center' as const
    },
    {
      id: 'cefr-selector',
      targetSelector: '.cefr-selector',
      title: 'Difficulty Levels',
      description: 'Switch between different text simplification levels (A1-C2) to match your reading ability.',
      position: 'top' as const
    },
    {
      id: 'voice-selector',
      targetSelector: '.voice-selector',
      title: 'Voice Options',
      description: 'Choose from different AI voices to find the one that works best for you.',
      position: 'top' as const
    }
  ],

  // PWA features tour
  pwaFeaturesTour: [
    {
      id: 'offline-indicator',
      targetSelector: '.offline-indicator',
      title: 'Offline Status',
      description: 'This shows your connection status and what content is available offline.',
      position: 'bottom' as const
    },
    {
      id: 'install-prompt',
      targetSelector: '.install-prompt',
      title: 'Install BookBridge',
      description: 'Install BookBridge as an app for faster access and offline reading.',
      position: 'bottom' as const,
      action: {
        text: 'Install Now',
        onClick: () => {
          const installEvent = (window as any).__bookbridge_install_prompt;
          if (installEvent) {
            installEvent.prompt();
          }
        }
      }
    }
  ],

  // Library page tour
  libraryTour: [
    {
      id: 'book-cards',
      targetSelector: '.book-card:first-child',
      title: 'Your Books',
      description: 'Each book shows its download status. Books with the green badge are available offline.',
      position: 'top' as const
    },
    {
      id: 'search-bar',
      targetSelector: '.search-bar',
      title: 'Find Books',
      description: 'Search your library or discover new books from our collection.',
      position: 'bottom' as const
    }
  ]
};