'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { InstantAudioPlayer } from './InstantAudioPlayer';
import { CapacitorStorage } from '../../lib/capacitor-storage';

interface CapacitorAudioPlayerProps {
  bookId: string;
  chunkIndex: number;
  text: string;
  cefrLevel: string;
  voiceId: string;
  isEnhanced: boolean;
  onWordHighlight?: (wordIndex: number) => void;
  onChunkComplete?: () => void;
  onProgressUpdate?: (progress: any) => void;
  onAutoScroll?: (scrollProgress: number) => void;
  className?: string;
  isPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

export const CapacitorAudioPlayer: React.FC<CapacitorAudioPlayerProps> = ({
  bookId,
  chunkIndex,
  ...props
}) => {
  const [cachedAudioUrl, setCachedAudioUrl] = useState<string | null>(null);

  // Check for cached audio on mount
  useEffect(() => {
    const checkCachedAudio = async () => {
      const cachedUrl = await CapacitorStorage.getAudioFile(bookId, chunkIndex);
      if (cachedUrl) {
        setCachedAudioUrl(cachedUrl);
        console.log(`📱 Using cached audio: ${bookId}_${chunkIndex}`);
      }
    };
    
    checkCachedAudio();
  }, [bookId, chunkIndex]);

  // Enhanced caching for Capacitor native platform
  const cacheAudioNatively = useCallback(async (audioUrl: string, metadata: any) => {
    try {
      // Only use native caching when in Capacitor environment
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        // Download audio file
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        
        // Store using CapacitorStorage utility
        await CapacitorStorage.storeAudioFile(bookId, chunkIndex, blob);
        
        // Update cached URL for immediate use
        const newCachedUrl = await CapacitorStorage.getAudioFile(bookId, chunkIndex);
        if (newCachedUrl) {
          setCachedAudioUrl(newCachedUrl);
        }
        
        console.log(`📱 Cached audio natively: ${bookId}_${chunkIndex}`);
      }
    } catch (error) {
      // Gracefully fallback to web caching
      console.log('Native caching unavailable, using web cache:', error);
    }
  }, [bookId, chunkIndex]);

  // Monitor network status for adaptive audio quality
  useEffect(() => {
    const initializeNetworkMonitoring = async () => {
      try {
        const { Network } = await import('@capacitor/network');
        const { Capacitor } = await import('@capacitor/core');
        
        if (Capacitor.isNativePlatform()) {
          // Get initial network status
          const status = await Network.getStatus();
          console.log(`📶 Network status: ${status.connectionType}, Connected: ${status.connected}`);
          
          // Listen for network changes
          Network.addListener('networkStatusChange', status => {
            console.log(`📶 Network changed: ${status.connectionType}`);
            // Could trigger audio quality adjustment here
          });
        }
      } catch (error) {
        console.log('Network monitoring unavailable in web mode');
      }
    };

    initializeNetworkMonitoring();
  }, []);

  // Utility function to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return (
    <InstantAudioPlayer
      bookId={bookId}
      chunkIndex={chunkIndex}
      {...props}
      cachedAudioUrl={cachedAudioUrl}
      onAudioCache={cacheAudioNatively}
    />
  );
};