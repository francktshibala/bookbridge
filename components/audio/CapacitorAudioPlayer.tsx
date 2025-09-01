'use client';

import React, { useEffect, useCallback } from 'react';
import { InstantAudioPlayer } from './InstantAudioPlayer';

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
  // Enhanced caching for Capacitor native platform
  const cacheAudioNatively = useCallback(async (audioUrl: string, metadata: any) => {
    try {
      // Only use native caching when in Capacitor environment
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        
        // Download audio file
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        
        // Convert to base64 for Capacitor storage
        const base64Data = await blobToBase64(blob);
        
        // Store in native filesystem
        await Filesystem.writeFile({
          path: `audio/${bookId}_${chunkIndex}.mp3`,
          data: base64Data,
          directory: Directory.Data,
        });
        
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
    />
  );
};