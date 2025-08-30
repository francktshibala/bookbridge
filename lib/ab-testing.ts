// A/B Testing Framework for PWA Install Prompts
// Tracks user engagement and tests different prompt variations

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number; // 0-100, percentage of users to show this variant
  config: {
    timing: 'immediate' | 'after_chapter' | 'after_sessions' | 'after_time';
    sessionThreshold?: number; // for 'after_sessions'
    timeThreshold?: number; // for 'after_time' (in seconds)
    copy: {
      title: string;
      description: string;
      primaryButton: string;
      secondaryButton: string;
    };
    style: 'banner' | 'modal' | 'slide-up' | 'notification';
    urgency: 'low' | 'medium' | 'high';
  };
}

export const INSTALL_PROMPT_VARIANTS: ABTestVariant[] = [
  {
    id: 'control',
    name: 'Control - After Chapter',
    weight: 25,
    config: {
      timing: 'after_chapter',
      copy: {
        title: 'Install BookBridge',
        description: 'Get the app for faster reading and offline access',
        primaryButton: 'Install App',
        secondaryButton: 'Maybe Later'
      },
      style: 'banner',
      urgency: 'low'
    }
  },
  {
    id: 'social_proof',
    name: 'Social Proof Variant',
    weight: 25,
    config: {
      timing: 'after_chapter',
      copy: {
        title: 'Join 10,000+ Readers',
        description: 'Install the app to read offline like thousands of others',
        primaryButton: 'Install Now',
        secondaryButton: 'Not Now'
      },
      style: 'modal',
      urgency: 'medium'
    }
  },
  {
    id: 'benefit_focused',
    name: 'Benefit-Focused Variant',
    weight: 25,
    config: {
      timing: 'after_sessions',
      sessionThreshold: 2,
      copy: {
        title: 'Read Anywhere, Anytime',
        description: 'Download books for offline reading and faster loading',
        primaryButton: 'Get Offline Access',
        secondaryButton: 'Continue in Browser'
      },
      style: 'slide-up',
      urgency: 'medium'
    }
  },
  {
    id: 'urgency_variant',
    name: 'Urgency Variant',
    weight: 25,
    config: {
      timing: 'after_time',
      timeThreshold: 300, // 5 minutes
      copy: {
        title: 'Don\'t Lose Your Progress!',
        description: 'Install the app to save your reading progress across devices',
        primaryButton: 'Secure My Progress',
        secondaryButton: 'Risk It'
      },
      style: 'notification',
      urgency: 'high'
    }
  }
];

export interface UserEngagement {
  sessionCount: number;
  totalReadingTime: number; // in seconds
  chaptersCompleted: number;
  firstVisit: number; // timestamp
  lastActivity: number; // timestamp
  hasBookmarked: boolean;
  hasUsedAudio: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export interface ABTestResult {
  variantId: string;
  userId: string;
  timestamp: number;
  engagement: UserEngagement;
  action: 'shown' | 'accepted' | 'dismissed' | 'closed';
  context: {
    page: string;
    bookId?: string;
    chapterIndex?: number;
  };
}

export class ABTestManager {
  private static instance: ABTestManager;
  private userId: string;
  private currentVariant: ABTestVariant | null = null;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  static getInstance(userId: string): ABTestManager {
    if (!ABTestManager.instance) {
      ABTestManager.instance = new ABTestManager(userId);
    }
    return ABTestManager.instance;
  }
  
  // Get assigned variant for user
  getVariant(): ABTestVariant {
    if (this.currentVariant) {
      return this.currentVariant;
    }
    
    // Check if user already has assigned variant
    const storedVariant = localStorage.getItem(`ab_test_variant_${this.userId}`);
    if (storedVariant) {
      this.currentVariant = INSTALL_PROMPT_VARIANTS.find(v => v.id === storedVariant) || INSTALL_PROMPT_VARIANTS[0];
      return this.currentVariant;
    }
    
    // Assign new variant based on weights
    const random = Math.random() * 100;
    let cumulativeWeight = 0;
    
    for (const variant of INSTALL_PROMPT_VARIANTS) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        this.currentVariant = variant;
        localStorage.setItem(`ab_test_variant_${this.userId}`, variant.id);
        return variant;
      }
    }
    
    // Fallback to control
    this.currentVariant = INSTALL_PROMPT_VARIANTS[0];
    return this.currentVariant;
  }
  
  // Check if prompt should be shown based on engagement
  shouldShowPrompt(engagement: UserEngagement): boolean {
    const variant = this.getVariant();
    const { timing, sessionThreshold, timeThreshold } = variant.config;
    
    // Don't show if already dismissed recently
    const lastDismissed = localStorage.getItem(`install_prompt_dismissed_${this.userId}`);
    if (lastDismissed) {
      const dismissedTime = parseInt(lastDismissed);
      const daysSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 7) { // Wait 7 days after dismissal
        return false;
      }
    }
    
    switch (timing) {
      case 'immediate':
        return engagement.sessionCount > 0;
        
      case 'after_chapter':
        return engagement.chaptersCompleted > 0;
        
      case 'after_sessions':
        return engagement.sessionCount >= (sessionThreshold || 2);
        
      case 'after_time':
        return engagement.totalReadingTime >= (timeThreshold || 300);
        
      default:
        return false;
    }
  }
  
  // Track A/B test event
  trackEvent(action: ABTestResult['action'], context: ABTestResult['context'], engagement: UserEngagement) {
    const result: ABTestResult = {
      variantId: this.getVariant().id,
      userId: this.userId,
      timestamp: Date.now(),
      engagement,
      action,
      context
    };
    
    // Store in localStorage for now (in production, send to analytics)
    const results = this.getStoredResults();
    results.push(result);
    localStorage.setItem('ab_test_results', JSON.stringify(results));
    
    // Mark as dismissed if user dismissed
    if (action === 'dismissed' || action === 'closed') {
      localStorage.setItem(`install_prompt_dismissed_${this.userId}`, Date.now().toString());
    }
    
    console.log('AB Test Event:', result);
  }
  
  // Get stored test results
  private getStoredResults(): ABTestResult[] {
    try {
      const stored = localStorage.getItem('ab_test_results');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  // Get test results for analysis
  getResults(): ABTestResult[] {
    return this.getStoredResults();
  }
  
  // Calculate conversion rates by variant
  getConversionRates(): Record<string, { shown: number; accepted: number; rate: number }> {
    const results = this.getStoredResults();
    const stats: Record<string, { shown: number; accepted: number; rate: number }> = {};
    
    for (const variant of INSTALL_PROMPT_VARIANTS) {
      const variantResults = results.filter(r => r.variantId === variant.id);
      const shown = variantResults.filter(r => r.action === 'shown').length;
      const accepted = variantResults.filter(r => r.action === 'accepted').length;
      
      stats[variant.id] = {
        shown,
        accepted,
        rate: shown > 0 ? (accepted / shown) * 100 : 0
      };
    }
    
    return stats;
  }
  
  // Export results for analysis
  exportResults(): string {
    const results = this.getStoredResults();
    const conversionRates = this.getConversionRates();
    
    let report = '# Install Prompt A/B Test Results\n\n';
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Total Events: ${results.length}\n\n`;
    
    // Conversion rates by variant
    report += '## Conversion Rates by Variant\n\n';
    for (const [variantId, stats] of Object.entries(conversionRates)) {
      const variant = INSTALL_PROMPT_VARIANTS.find(v => v.id === variantId);
      report += `### ${variant?.name || variantId}\n`;
      report += `- Shown: ${stats.shown}\n`;
      report += `- Accepted: ${stats.accepted}\n`;
      report += `- Conversion Rate: ${stats.rate.toFixed(1)}%\n\n`;
    }
    
    // Detailed events
    report += '## Detailed Events\n\n';
    results.forEach((result, index) => {
      report += `${index + 1}. **${result.action.toUpperCase()}** - ${result.variantId}\n`;
      report += `   - Time: ${new Date(result.timestamp).toISOString()}\n`;
      report += `   - Sessions: ${result.engagement.sessionCount}\n`;
      report += `   - Chapters: ${result.engagement.chaptersCompleted}\n`;
      report += `   - Reading Time: ${Math.round(result.engagement.totalReadingTime / 60)}min\n\n`;
    });
    
    return report;
  }
}

import { useState, useEffect } from 'react';

// Hook for tracking reading engagement
export function useReadingEngagement() {
  const [engagement, setEngagement] = useState<UserEngagement>({
    sessionCount: 0,
    totalReadingTime: 0,
    chaptersCompleted: 0,
    firstVisit: Date.now(),
    lastActivity: Date.now(),
    hasBookmarked: false,
    hasUsedAudio: false,
    deviceType: 'desktop'
  });
  
  useEffect(() => {
    // Load existing engagement data
    const stored = localStorage.getItem('reading_engagement');
    if (stored) {
      setEngagement(JSON.parse(stored));
    } else {
      // Initialize new session
      const newEngagement = {
        ...engagement,
        sessionCount: 1,
        firstVisit: Date.now(),
        deviceType: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop'
      } as UserEngagement;
      setEngagement(newEngagement);
      localStorage.setItem('reading_engagement', JSON.stringify(newEngagement));
    }
  }, []);
  
  // Track reading time
  const trackReadingTime = (seconds: number) => {
    const updated = {
      ...engagement,
      totalReadingTime: engagement.totalReadingTime + seconds,
      lastActivity: Date.now()
    };
    setEngagement(updated);
    localStorage.setItem('reading_engagement', JSON.stringify(updated));
  };
  
  // Track chapter completion
  const trackChapterCompletion = () => {
    const updated = {
      ...engagement,
      chaptersCompleted: engagement.chaptersCompleted + 1,
      lastActivity: Date.now()
    };
    setEngagement(updated);
    localStorage.setItem('reading_engagement', JSON.stringify(updated));
  };
  
  // Track bookmark action
  const trackBookmark = () => {
    const updated = {
      ...engagement,
      hasBookmarked: true,
      lastActivity: Date.now()
    };
    setEngagement(updated);
    localStorage.setItem('reading_engagement', JSON.stringify(updated));
  };
  
  // Track audio usage
  const trackAudioUsage = () => {
    const updated = {
      ...engagement,
      hasUsedAudio: true,
      lastActivity: Date.now()
    };
    setEngagement(updated);
    localStorage.setItem('reading_engagement', JSON.stringify(updated));
  };
  
  return {
    engagement,
    trackReadingTime,
    trackChapterCompletion,
    trackBookmark,
    trackAudioUsage
  };
}