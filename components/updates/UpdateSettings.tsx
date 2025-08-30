'use client';

import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Clock, Download, Wifi, WifiOff } from 'lucide-react';
import { useUpdateManager } from './UpdateManager';

interface UpdateSettingsProps {
  className?: string;
}

export default function UpdateSettings({ className = '' }: UpdateSettingsProps) {
  const updateManager = useUpdateManager();
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);
  const [checkInterval, setCheckInterval] = useState(30); // minutes
  const [isCheckingNow, setIsCheckingNow] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedAutoCheck = localStorage.getItem('bookbridge-auto-update-check');
    const savedInterval = localStorage.getItem('bookbridge-update-check-interval');
    
    if (savedAutoCheck !== null) {
      setAutoCheckEnabled(JSON.parse(savedAutoCheck));
    }
    
    if (savedInterval !== null) {
      setCheckInterval(parseInt(savedInterval));
    }
  }, []);

  const handleAutoCheckToggle = (enabled: boolean) => {
    setAutoCheckEnabled(enabled);
    localStorage.setItem('bookbridge-auto-update-check', JSON.stringify(enabled));
    
    // You could emit an event or call a function to update the UpdateManager
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bookbridge-update-settings-changed', {
        detail: { autoCheck: enabled, interval: checkInterval }
      }));
    }
  };

  const handleIntervalChange = (minutes: number) => {
    setCheckInterval(minutes);
    localStorage.setItem('bookbridge-update-check-interval', minutes.toString());
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bookbridge-update-settings-changed', {
        detail: { autoCheck: autoCheckEnabled, interval: minutes }
      }));
    }
  };

  const handleCheckNow = async () => {
    if (isCheckingNow) return;
    
    setIsCheckingNow(true);
    try {
      const hasUpdate = await updateManager.checkForUpdatesNow();
      
      if (!hasUpdate) {
        // Show a temporary message that no updates are available
        const message = document.createElement('div');
        message.textContent = 'You have the latest version!';
        message.className = 'fixed top-4 right-4 bg-green-500/20 text-green-300 px-4 py-2 rounded-md z-50';
        document.body.appendChild(message);
        
        setTimeout(() => {
          document.body.removeChild(message);
        }, 3000);
      }
    } catch (error) {
      console.error('UpdateSettings: Manual check failed:', error);
    } finally {
      setIsCheckingNow(false);
    }
  };

  const formatLastCheck = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-medium text-white">Update Settings</h3>
      </div>

      {/* Current Status */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-300">Current Status</span>
          <div className="flex items-center gap-2">
            {navigator.onLine ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm text-slate-400">
              {navigator.onLine ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Update Available:</span>
            <span className={updateManager.updateState.available ? 'text-orange-400' : 'text-green-400'}>
              {updateManager.updateState.available ? 'Yes' : 'No'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-400">Version:</span>
            <span className="text-slate-300">
              {updateManager.updateState.version || 'Current'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-400">Last Check:</span>
            <span className="text-slate-300">
              {formatLastCheck(updateManager.updateState.lastCheck)}
            </span>
          </div>
        </div>
      </div>

      {/* Auto-Check Settings */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-medium text-white">Automatic Updates</div>
            <div className="text-sm text-slate-400">
              Check for updates automatically
            </div>
          </div>
          <button
            onClick={() => handleAutoCheckToggle(!autoCheckEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoCheckEnabled ? 'bg-blue-600' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoCheckEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {autoCheckEnabled && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Check Interval
            </label>
            <select
              value={checkInterval}
              onChange={(e) => handleIntervalChange(Number(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>Every 5 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every hour</option>
              <option value={240}>Every 4 hours</option>
              <option value={1440}>Daily</option>
            </select>
          </div>
        )}
      </div>

      {/* Manual Check */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
        <button
          onClick={handleCheckNow}
          disabled={isCheckingNow || !navigator.onLine}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors"
        >
          {isCheckingNow ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Check for Updates Now
            </>
          )}
        </button>
        
        {!navigator.onLine && (
          <p className="text-sm text-slate-400 text-center mt-2">
            Update checks require an internet connection
          </p>
        )}
      </div>

      {/* Available Update Actions */}
      {updateManager.updateState.available && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-5 h-5 text-orange-400" />
            <span className="font-medium text-orange-400">Update Available</span>
          </div>
          
          <p className="text-sm text-orange-300 mb-4">
            A new version is ready to install. The update will take effect after reloading the page.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={updateManager.applyUpdate}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
            >
              Install Update
            </button>
            
            <button
              onClick={updateManager.dismissUpdate}
              className="px-4 py-2 border border-orange-500/30 text-orange-300 hover:bg-orange-500/10 rounded-md transition-colors text-sm"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {updateManager.updateState.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="text-sm text-red-300">
            <strong>Update Error:</strong> {updateManager.updateState.error}
          </div>
        </div>
      )}
    </div>
  );
}