/**
 * Wake Lock Hook
 * Prevents screen from turning off during audio playback
 */

import { useEffect, useRef } from 'react';

export function useWakeLock(isPlaying: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator)) {
        console.log('Wake Lock API not supported');
        return;
      }

      try {
        if (isPlaying && !wakeLockRef.current) {
          // Request wake lock when starting playback
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('🔒 Wake lock acquired - screen will stay on');

          // Re-acquire lock if page becomes visible again
          const handleVisibilityChange = async () => {
            if (wakeLockRef.current && document.visibilityState === 'visible') {
              try {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
                console.log('🔒 Wake lock re-acquired');
              } catch (err) {
                console.log('Failed to re-acquire wake lock:', err);
              }
            }
          };

          document.addEventListener('visibilitychange', handleVisibilityChange);

          // Cleanup
          return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
          };
        } else if (!isPlaying && wakeLockRef.current) {
          // Release wake lock when stopping playback
          wakeLockRef.current.release();
          wakeLockRef.current = null;
          console.log('🔓 Wake lock released - screen can turn off');
        }
      } catch (err) {
        console.log('Wake lock request failed:', err);
      }
    };

    requestWakeLock();

    // Cleanup on unmount
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [isPlaying]);
}