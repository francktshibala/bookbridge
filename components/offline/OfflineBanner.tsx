'use client';

import { useState, useEffect } from 'react';
import { WifiOff, X } from 'lucide-react';
import { useOffline } from '@/contexts/OfflineContext';

export function OfflineBanner() {
  const { isOnline } = useOffline();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset dismissed state when connection is restored
  useEffect(() => {
    if (isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  if (!mounted || isOnline || dismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500 text-yellow-900 px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <WifiOff className="w-5 h-5" />
          <div className="flex-1">
            <p className="font-medium text-sm">
              You're offline
            </p>
            <p className="text-xs text-yellow-800">
              You can still read downloaded books
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-yellow-600/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
