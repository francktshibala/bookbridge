'use client';

import React from 'react';
import { 
  BookOpen, 
  PlayCircle, 
  Smartphone,
  RotateCcw,
  HelpCircle,
  CheckCircle
} from 'lucide-react';
import { useOnboarding } from './OnboardingManager';

interface OnboardingSettingsProps {
  className?: string;
}

export default function OnboardingSettings({ className = '' }: OnboardingSettingsProps) {
  const onboardingAPI = useOnboarding();

  const handleShowPWAOnboarding = () => {
    onboardingAPI.showPWAOnboarding();
  };

  const handleShowReadingTour = () => {
    onboardingAPI.startTour('readingPage');
  };

  const handleShowLibraryTour = () => {
    onboardingAPI.startTour('library');
  };

  const handleShowPWAFeaturesTour = () => {
    onboardingAPI.startTour('pwaFeatures');
  };

  const handleResetAll = () => {
    const confirmed = window.confirm(
      'This will reset all onboarding progress and show tutorials again. Are you sure?'
    );
    if (confirmed) {
      onboardingAPI.resetOnboarding();
      
      // Show success message
      const message = document.createElement('div');
      message.textContent = 'Onboarding reset successfully!';
      message.className = 'fixed top-4 right-4 bg-green-500/20 text-green-300 px-4 py-2 rounded-md z-50';
      document.body.appendChild(message);
      
      setTimeout(() => {
        if (document.body.contains(message)) {
          document.body.removeChild(message);
        }
      }, 3000);
    }
  };

  const state = onboardingAPI.getState();
  const completedTours = state?.completedTours || [];
  const hasSeenPWAOnboarding = state?.hasSeenPWAOnboarding || false;

  const tours = [
    {
      id: 'pwa',
      title: 'PWA Introduction',
      description: 'Learn about BookBridge\'s app-like features and offline capabilities',
      icon: <Smartphone className="w-5 h-5" />,
      completed: hasSeenPWAOnboarding,
      action: handleShowPWAOnboarding,
      available: true
    },
    {
      id: 'library',
      title: 'Library Tour',
      description: 'Discover how to navigate your book collection and find new books',
      icon: <BookOpen className="w-5 h-5" />,
      completed: completedTours.includes('library'),
      action: handleShowLibraryTour,
      available: window.location.pathname.includes('/library')
    },
    {
      id: 'readingPage',
      title: 'Reading Experience',
      description: 'Learn about audio controls, text highlighting, and reading features',
      icon: <PlayCircle className="w-5 h-5" />,
      completed: completedTours.includes('readingPage'),
      action: handleShowReadingTour,
      available: window.location.pathname.includes('/read')
    },
    {
      id: 'pwaFeatures',
      title: 'PWA Features',
      description: 'Explore offline indicators, install prompts, and app features',
      icon: <HelpCircle className="w-5 h-5" />,
      completed: completedTours.includes('pwaFeatures'),
      action: handleShowPWAFeaturesTour,
      available: true
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-medium text-white">Onboarding & Tours</h3>
      </div>

      <p className="text-sm text-slate-400 mb-6">
        Take guided tours to learn about BookBridge's features. You can replay any tour at any time.
      </p>

      {/* Available Tours */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-slate-300 mb-3">Available Tours</h4>
        
        {tours.map((tour) => (
          <div 
            key={tour.id} 
            className={`bg-slate-800/50 rounded-lg p-4 border ${
              tour.available 
                ? 'border-slate-700/50 hover:border-slate-600/50' 
                : 'border-slate-700/30 opacity-60'
            } transition-colors`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${
                tour.completed 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-slate-700/50 text-slate-400'
              }`}>
                {tour.completed ? <CheckCircle className="w-5 h-5" /> : tour.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-medium text-white">{tour.title}</h5>
                  {tour.completed && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                      Completed
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-slate-400 mb-3">
                  {tour.description}
                </p>
                
                {tour.available ? (
                  <button
                    onClick={tour.action}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors"
                  >
                    {tour.completed ? 'Replay Tour' : 'Start Tour'}
                  </button>
                ) : (
                  <div className="text-xs text-slate-500">
                    Navigate to the relevant page to start this tour
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Summary */}
      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
        <h4 className="text-sm font-medium text-slate-300 mb-3">Progress Summary</h4>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="text-slate-400">
            Tours Completed: <span className="text-white font-medium">
              {tours.filter(t => t.completed).length} / {tours.length}
            </span>
          </div>
          
          <div className="flex-1" />
          
          <button
            onClick={handleResetAll}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
            style={{ 
              width: `${(tours.filter(t => t.completed).length / tours.length) * 100}%` 
            }}
          />
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="text-blue-300 font-medium mb-1">Pro Tips</div>
            <ul className="text-blue-200/80 space-y-1 text-xs">
              <li>• Tours adapt to your current page for relevant guidance</li>
              <li>• You can skip or replay any tour at any time</li>
              <li>• New features will automatically get tour highlights</li>
              <li>• Tours remember your progress across devices</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}