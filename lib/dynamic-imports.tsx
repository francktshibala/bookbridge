import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import React from 'react';

// Loading component for lazy-loaded components
const LoadingComponent = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Audio Components - Lazy loaded as they're heavy and not always needed
export const InstantAudioPlayer = dynamic(
  () => import('@/components/audio/InstantAudioPlayer').then(mod => ({ default: mod.InstantAudioPlayer })),
  { 
    loading: LoadingComponent,
    ssr: false // Audio players don't need SSR
  }
) as ComponentType<any>;

export const ProgressiveAudioPlayer = dynamic(
  () => import('@/components/audio/ProgressiveAudioPlayer').then(mod => ({ default: mod.ProgressiveAudioPlayer })),
  { 
    loading: LoadingComponent,
    ssr: false
  }
) as ComponentType<any>;

export const SmartAudioPlayer = dynamic(
  () => import('@/components/SmartAudioPlayer').then(mod => ({ default: mod.SmartAudioPlayer })),
  { 
    loading: LoadingComponent,
    ssr: false
  }
) as ComponentType<any>;

// AI Components - Heavy due to dependencies
export const AIChat = dynamic(
  () => import('@/components/AIChat').then(mod => ({ default: mod.AIChat })),
  { 
    loading: LoadingComponent,
    ssr: false
  }
) as ComponentType<any>;

export const AIBookChatModal = dynamic(
  () => import('@/components/ai/AIBookChatModal').then(mod => ({ default: mod.AIBookChatModal })),
  { 
    loading: LoadingComponent,
    ssr: false
  }
) as ComponentType<{
  isOpen: boolean;
  book: any;
  onClose: () => void;
  onSendMessage?: (message: string) => Promise<string>;
}>;

// Admin Components - Only loaded when accessing admin routes
export const PerformanceMonitor = dynamic(
  () => import('@/components/admin/PerformanceMonitor').then(mod => ({ default: mod.PerformanceMonitor })),
  { 
    loading: LoadingComponent,
    ssr: false
  }
) as ComponentType<any>;


// Utility function to preload components
export const preloadComponent = (component: ComponentType<any>) => {
  if ('preload' in component && typeof component.preload === 'function') {
    component.preload();
  }
};