'use client';

import React, { useState, useEffect } from 'react';
import FeatureSpotlight from './FeatureSpotlight';
import { BOOKBRIDGE_SPOTLIGHT_TOURS } from './FeatureSpotlight';

interface OnboardingState {
  showFeatureSpotlight: boolean;
  currentTour: string | null;
  completedTours: string[];
}

interface OnboardingManagerProps {
  enableAutoOnboarding?: boolean;
  children?: React.ReactNode;
}

export default function OnboardingManager({ 
  enableAutoOnboarding = true,
  children 
}: OnboardingManagerProps) {
  const [state, setState] = useState<OnboardingState>({
    showFeatureSpotlight: false,
    currentTour: null,
    completedTours: []
  });

  useEffect(() => {
    // Load onboarding state from localStorage
    const loadOnboardingState = () => {
      const completedToursStr = localStorage.getItem('bookbridge-completed-tours');
      const completedTours = completedToursStr ? JSON.parse(completedToursStr) : [];

      setState(prev => ({
        ...prev,
        completedTours
      }));
    };

    loadOnboardingState();
  }, [enableAutoOnboarding]);

  // Listen for page navigation to trigger contextual tours
  useEffect(() => {
    const handleRouteChange = () => {
      const pathname = window.location.pathname;

      // Check if we should show a contextual tour based on the current page
      if (pathname.includes('/library') && !state.completedTours.includes('library')) {
        setTimeout(() => {
          startTour('library');
        }, 1500);
      } else if (pathname.includes('/read') && !state.completedTours.includes('readingPage')) {
        setTimeout(() => {
          startTour('readingPage');
        }, 2000);
      }
    };

    // Check initial route
    handleRouteChange();

    // Listen for browser navigation
    window.addEventListener('popstate', handleRouteChange);
    
    // Listen for programmatic navigation (Next.js router)
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(handleRouteChange, 100);
    };

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      history.pushState = originalPushState;
    };
  }, [state.completedTours]);

  const startTour = (tourName: string) => {
    // Prevent multiple tours from showing simultaneously
    if (state.showFeatureSpotlight) {
      return;
    }

    setState(prev => ({
      ...prev,
      showFeatureSpotlight: true,
      currentTour: tourName
    }));
  };

  const handleSpotlightComplete = () => {
    const tourName = state.currentTour;
    if (tourName) {
      // Mark tour as completed
      const newCompletedTours = [...state.completedTours, tourName];
      localStorage.setItem('bookbridge-completed-tours', JSON.stringify(newCompletedTours));
      
      setState(prev => ({
        ...prev,
        showFeatureSpotlight: false,
        currentTour: null,
        completedTours: newCompletedTours
      }));
    }
  };

  const handleSpotlightSkip = () => {
    const tourName = state.currentTour;
    if (tourName) {
      // Mark tour as skipped (completed)
      const newCompletedTours = [...state.completedTours, tourName];
      localStorage.setItem('bookbridge-completed-tours', JSON.stringify(newCompletedTours));
      
      setState(prev => ({
        ...prev,
        showFeatureSpotlight: false,
        currentTour: null,
        completedTours: newCompletedTours
      }));
    }
  };

  const getCurrentTourSteps = () => {
    switch (state.currentTour) {
      case 'readingPage':
        return BOOKBRIDGE_SPOTLIGHT_TOURS.readingPageTour;
      case 'library':
        return BOOKBRIDGE_SPOTLIGHT_TOURS.libraryTour;
      default:
        return [];
    }
  };

  // Public API for manual tour triggering
  useEffect(() => {
    const onboardingAPI = {
      startTour: (tourName: string) => {
        startTour(tourName);
      },
      resetOnboarding: () => {
        localStorage.removeItem('bookbridge-completed-tours');
        setState({
          showFeatureSpotlight: false,
          currentTour: null,
          completedTours: []
        });
      },
      getState: () => state
    };

    (window as any).__bookbridge_onboarding = onboardingAPI;

    return () => {
      delete (window as any).__bookbridge_onboarding;
    };
  }, [state]);

  return (
    <>
      {children}
      
      {/* Feature Spotlight Tours */}
      {state.showFeatureSpotlight && state.currentTour && (
        <FeatureSpotlight
          steps={getCurrentTourSteps()}
          isVisible={state.showFeatureSpotlight}
          onComplete={handleSpotlightComplete}
          onSkip={handleSpotlightSkip}
        />
      )}
    </>
  );
}

// Hook for accessing onboarding functionality from components
export const useOnboarding = () => {
  const [api, setApi] = useState<any>(null);

  useEffect(() => {
    const checkForAPI = () => {
      const onboardingAPI = (window as any).__bookbridge_onboarding;
      if (onboardingAPI) {
        setApi(onboardingAPI);
      }
    };

    checkForAPI();
    const interval = setInterval(checkForAPI, 100);

    return () => clearInterval(interval);
  }, []);

  return api || {
    startTour: () => console.warn('Onboarding API not ready'),
    resetOnboarding: () => console.warn('Onboarding API not ready'),
    getState: () => null
  };
};