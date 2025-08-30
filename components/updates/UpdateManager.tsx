'use client';

import React, { useState, useEffect } from 'react';
import UpdateNotificationBanner from './UpdateNotificationBanner';

interface UpdateManagerProps {
  enableAutoCheck?: boolean;
  checkInterval?: number; // in milliseconds
  showBanner?: boolean;
  onUpdateDetected?: (version: string) => void;
  onUpdateApplied?: () => void;
}

interface UpdateState {
  available: boolean;
  version: string | null;
  isApplying: boolean;
  lastCheck: number | null;
  error: string | null;
}

export default function UpdateManager({
  enableAutoCheck = true,
  checkInterval = 30 * 60 * 1000, // 30 minutes
  showBanner = true,
  onUpdateDetected,
  onUpdateApplied
}: UpdateManagerProps) {
  const [updateState, setUpdateState] = useState<UpdateState>({
    available: false,
    version: null,
    isApplying: false,
    lastCheck: null,
    error: null
  });

  // Service Worker Registration and Update Detection
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const setupServiceWorkerUpdates = async () => {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          // Check for existing waiting service worker
          if (registration.waiting) {
            handleUpdateDetected(registration.waiting);
          }

          // Listen for new service worker installations
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  handleUpdateDetected(newWorker);
                }
              });
            }
          });

          // Handle service worker messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
              handleUpdateDetected(registration.waiting);
            }
          });

        } catch (error) {
          console.error('UpdateManager: Failed to setup service worker updates:', error);
          setUpdateState(prev => ({ ...prev, error: 'Failed to setup updates' }));
        }
      };

      setupServiceWorkerUpdates();
    }
  }, []);

  // Auto-check for updates
  useEffect(() => {
    if (!enableAutoCheck) return;

    const checkForUpdates = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.update();
          
          setUpdateState(prev => ({ ...prev, lastCheck: Date.now(), error: null }));
        } catch (error) {
          console.error('UpdateManager: Auto-check failed:', error);
          setUpdateState(prev => ({ ...prev, error: 'Update check failed' }));
        }
      }
    };

    // Initial check
    checkForUpdates();

    // Set up interval
    const intervalId = setInterval(checkForUpdates, checkInterval);

    return () => clearInterval(intervalId);
  }, [enableAutoCheck, checkInterval]);

  const handleUpdateDetected = (serviceWorker: ServiceWorker | null) => {
    if (serviceWorker) {
      const version = 'Latest'; // In a real app, you might extract this from the service worker
      
      setUpdateState(prev => ({
        ...prev,
        available: true,
        version,
        error: null
      }));

      onUpdateDetected?.(version);
      console.log('UpdateManager: New version detected:', version);
    }
  };

  const handleUpdateAccepted = async () => {
    setUpdateState(prev => ({ ...prev, isApplying: true }));

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        if (registration.waiting) {
          // Tell the waiting service worker to skip waiting
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Set up listener for controller change
          const controllerChangePromise = new Promise<void>((resolve) => {
            const onControllerChange = () => {
              navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
              resolve();
            };
            navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
          });

          // Wait for the new service worker to take control
          await controllerChangePromise;
          
          onUpdateApplied?.();
          
          // Reload the page to use the new service worker
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('UpdateManager: Failed to apply update:', error);
      setUpdateState(prev => ({
        ...prev,
        isApplying: false,
        error: 'Failed to apply update'
      }));
    }
  };

  const handleUpdateDismissed = () => {
    setUpdateState(prev => ({
      ...prev,
      available: false,
      version: null
    }));
  };

  // Manual update check
  const checkForUpdatesNow = async (): Promise<boolean> => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        
        setUpdateState(prev => ({ ...prev, lastCheck: Date.now(), error: null }));
        
        // Return whether an update is available
        return !!(registration.waiting || registration.installing);
      } catch (error) {
        console.error('UpdateManager: Manual check failed:', error);
        setUpdateState(prev => ({ ...prev, error: 'Manual check failed' }));
        return false;
      }
    }
    return false;
  };

  // Expose update manager API through a custom hook
  const updateManagerAPI = {
    updateState,
    checkForUpdatesNow,
    applyUpdate: handleUpdateAccepted,
    dismissUpdate: handleUpdateDismissed
  };

  // Store in global ref for external access
  useEffect(() => {
    (window as any).__bookbridge_update_manager = updateManagerAPI;
    
    return () => {
      delete (window as any).__bookbridge_update_manager;
    };
  }, [updateState]);

  return (
    <>
      {showBanner && (
        <UpdateNotificationBanner
          onUpdateAccepted={handleUpdateAccepted}
          onUpdateDismissed={handleUpdateDismissed}
          showReleaseNotes={true}
        />
      )}
      
      {/* Development/Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 p-3 bg-gray-900 text-white text-xs rounded-md font-mono">
          <div>Update Available: {updateState.available ? 'Yes' : 'No'}</div>
          <div>Version: {updateState.version || 'N/A'}</div>
          <div>Last Check: {updateState.lastCheck ? new Date(updateState.lastCheck).toLocaleTimeString() : 'Never'}</div>
          <div>Applying: {updateState.isApplying ? 'Yes' : 'No'}</div>
          {updateState.error && <div className="text-red-400">Error: {updateState.error}</div>}
        </div>
      )}
    </>
  );
}

// Hook for using the update manager from other components
export const useUpdateManager = () => {
  const [updateManager, setUpdateManager] = useState<any>(null);

  useEffect(() => {
    // Get the global update manager instance
    const manager = (window as any).__bookbridge_update_manager;
    setUpdateManager(manager);

    // Listen for changes
    const checkForManager = () => {
      const currentManager = (window as any).__bookbridge_update_manager;
      if (currentManager !== updateManager) {
        setUpdateManager(currentManager);
      }
    };

    const interval = setInterval(checkForManager, 1000);
    return () => clearInterval(interval);
  }, [updateManager]);

  return updateManager || {
    updateState: { available: false, version: null, isApplying: false, lastCheck: null, error: null },
    checkForUpdatesNow: async () => false,
    applyUpdate: async () => {},
    dismissUpdate: () => {}
  };
};