'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, Clock } from 'lucide-react';

interface UpdateInfo {
  available: boolean;
  version?: string;
  releaseNotes?: string[];
  isCritical?: boolean;
  downloadSize?: string;
}

interface UpdateNotificationBannerProps {
  className?: string;
  onUpdateAccepted?: () => void;
  onUpdateDismissed?: () => void;
  showReleaseNotes?: boolean;
}

export default function UpdateNotificationBanner({
  className = '',
  onUpdateAccepted,
  onUpdateDismissed,
  showReleaseNotes = false
}: UpdateNotificationBannerProps) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ available: false });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const checkForUpdates = async () => {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          // Listen for waiting service worker (update available)
          if (registration.waiting) {
            setUpdateInfo({
              available: true,
              version: 'Latest',
              downloadSize: '< 1 MB',
              releaseNotes: [
                'Improved offline reading experience',
                'Enhanced audio playback performance',
                'Bug fixes and stability improvements'
              ]
            });
          }

          // Listen for service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is waiting
                  setUpdateInfo({
                    available: true,
                    version: 'Latest',
                    downloadSize: '< 1 MB',
                    releaseNotes: [
                      'Improved offline reading experience',
                      'Enhanced audio playback performance',
                      'Bug fixes and stability improvements'
                    ]
                  });
                }
              });
            }
          });

          // Check for updates on page load
          registration.update();

        } catch (error) {
          console.error('UpdateNotification: Failed to check for updates:', error);
        }
      };

      // Initial check
      checkForUpdates();

      // Set up periodic update checks (every 30 minutes)
      const updateCheckInterval = setInterval(checkForUpdates, 30 * 60 * 1000);

      return () => clearInterval(updateCheckInterval);
    }
  }, []);

  const handleUpdateAccept = async () => {
    setIsUpdating(true);

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        if (registration.waiting) {
          // Tell the waiting service worker to skip waiting and become active
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Listen for the new service worker to take control
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            // Reload the page to use the new service worker
            window.location.reload();
          });
        }
      }

      onUpdateAccepted?.();
    } catch (error) {
      console.error('UpdateNotification: Failed to apply update:', error);
      setIsUpdating(false);
    }
  };

  const handleUpdateDismiss = () => {
    setIsDismissed(true);
    setUpdateInfo({ available: false });
    onUpdateDismissed?.();
  };

  const handleShowNotes = () => {
    setShowNotes(!showNotes);
  };

  // Don't show if no update available or dismissed
  if (!updateInfo.available || isDismissed) {
    return null;
  }

  const bannerStyle = updateInfo.isCritical
    ? 'bg-red-500/10 border-red-500/20 text-red-300'
    : 'bg-blue-500/10 border-blue-500/20 text-blue-300';

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      <div className={`border-b ${bannerStyle} px-4 py-3 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            {/* Update Icon & Message */}
            <div className="flex items-center gap-3 min-w-0">
              {isUpdating ? (
                <RefreshCw className="w-5 h-5 animate-spin flex-shrink-0" />
              ) : (
                <Download className="w-5 h-5 flex-shrink-0" />
              )}
              
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">
                    {isUpdating ? 'Updating BookBridge...' : 'New version available'}
                  </span>
                  {updateInfo.version && (
                    <span className="text-sm opacity-80">
                      v{updateInfo.version}
                    </span>
                  )}
                  {updateInfo.downloadSize && (
                    <span className="text-sm opacity-80">
                      ({updateInfo.downloadSize})
                    </span>
                  )}
                </div>
                
                {isUpdating && (
                  <div className="text-sm opacity-80 mt-1">
                    Please wait while we apply the latest improvements...
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {!isUpdating && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {showReleaseNotes && updateInfo.releaseNotes && (
                  <button
                    onClick={handleShowNotes}
                    className="px-3 py-1.5 text-sm border border-current/20 rounded-md hover:bg-current/10 transition-colors"
                  >
                    What's New
                  </button>
                )}
                
                <button
                  onClick={handleUpdateAccept}
                  className="px-4 py-1.5 bg-current/20 text-current font-medium rounded-md hover:bg-current/30 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Update Now
                </button>
                
                <button
                  onClick={handleUpdateDismiss}
                  className="px-3 py-1.5 text-sm hover:bg-current/10 rounded-md transition-colors flex items-center gap-1"
                >
                  <Clock className="w-4 h-4" />
                  Later
                </button>
                
                <button
                  onClick={handleUpdateDismiss}
                  className="p-1.5 hover:bg-current/10 rounded-md transition-colors"
                  aria-label="Dismiss update notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Release Notes Expansion */}
          {showNotes && updateInfo.releaseNotes && (
            <div className="mt-3 pt-3 border-t border-current/20">
              <h4 className="font-medium mb-2">What's New:</h4>
              <ul className="text-sm opacity-90 space-y-1">
                {updateInfo.releaseNotes.map((note, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-current mt-2 flex-shrink-0" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Critical Update Warning */}
          {updateInfo.isCritical && !isUpdating && (
            <div className="mt-2 p-2 bg-red-500/20 rounded-md">
              <div className="flex items-start gap-2">
                <span className="text-red-400 text-xs font-medium">CRITICAL UPDATE</span>
                <span className="text-sm text-red-300">
                  This update contains important security fixes and should be applied immediately.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for using update notifications
export const useUpdateNotification = () => {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const checkForUpdates = async () => {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          if (registration.waiting) {
            setHasUpdate(true);
          }

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setHasUpdate(true);
                }
              });
            }
          });
        } catch (error) {
          console.error('useUpdateNotification: Error:', error);
        }
      };

      checkForUpdates();
    }
  }, []);

  const applyUpdate = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      }
    }
  };

  return { hasUpdate, applyUpdate };
};