/**
 * Media Session Hook
 * Provides lock screen controls and metadata for audio playback
 */

import { useEffect } from 'react';

interface MediaSessionOptions {
  title: string;
  artist?: string;
  album?: string;
  artwork?: Array<{
    src: string;
    sizes?: string;
    type?: string;
  }>;
  onPlay?: () => void;
  onPause?: () => void;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
}

export function useMediaSession(
  isPlaying: boolean,
  options: MediaSessionOptions
) {
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      console.log('Media Session API not supported');
      return;
    }

    // Set metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: options.title,
      artist: options.artist || 'BookBridge',
      album: options.album || 'Audiobook',
      artwork: options.artwork || [
        {
          src: '/book-cover-96.png',
          sizes: '96x96',
          type: 'image/png',
        },
        {
          src: '/book-cover-128.png',
          sizes: '128x128',
          type: 'image/png',
        },
        {
          src: '/book-cover-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/book-cover-256.png',
          sizes: '256x256',
          type: 'image/png',
        },
        {
          src: '/book-cover-384.png',
          sizes: '384x384',
          type: 'image/png',
        },
        {
          src: '/book-cover-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    });

    // Update playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    // Set up action handlers
    const actionHandlers: Array<[MediaSessionAction, MediaSessionActionHandler | null]> = [
      ['play', options.onPlay || null],
      ['pause', options.onPause || null],
      ['seekbackward', options.onSeekBackward || null],
      ['seekforward', options.onSeekForward || null],
      ['previoustrack', options.onPreviousTrack || null],
      ['nexttrack', options.onNextTrack || null],
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        if (handler) {
          navigator.mediaSession.setActionHandler(action, handler);
        }
      } catch (error) {
        console.log(`Failed to set "${action}" action handler:`, error);
      }
    }

    // Cleanup
    return () => {
      try {
        // Clear action handlers
        for (const [action] of actionHandlers) {
          navigator.mediaSession.setActionHandler(action, null);
        }
      } catch (error) {
        console.log('Failed to clear action handlers:', error);
      }
    };
  }, [isPlaying, options]);
}