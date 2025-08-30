'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Download, AlertTriangle } from 'lucide-react';

interface OfflineIndicatorProps {
  className?: string;
}

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  downlink?: number;
  effectiveType?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  className = '' 
}) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: true,
    isSlowConnection: false,
    connectionType: 'unknown'
  });
  const [showBanner, setShowBanner] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      const status: NetworkStatus = {
        isOnline: navigator.onLine,
        isSlowConnection: false,
        connectionType: 'unknown'
      };

      if (connection) {
        status.connectionType = connection.effectiveType || connection.type || 'unknown';
        status.downlink = connection.downlink;
        status.effectiveType = connection.effectiveType;
        
        // Consider 2G or slow-2g as slow connections
        status.isSlowConnection = ['slow-2g', '2g'].includes(connection.effectiveType);
      }

      setNetworkStatus(status);
      
      // Show banner when going offline or on slow connection
      if (!status.isOnline || status.isSlowConnection) {
        setShowBanner(true);
        if (!status.isOnline) {
          setLastOnlineTime(new Date());
        }
      } else {
        // Hide banner after a delay when back online
        setTimeout(() => setShowBanner(false), 3000);
      }
    };

    // Initial check
    updateNetworkStatus();

    // Listen for network changes
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Listen for connection changes if supported
    const connection = (navigator as any).connection;
    if (connection && connection.addEventListener) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      
      if (connection && connection.removeEventListener) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  // Don't show indicator if online with good connection
  if (networkStatus.isOnline && !networkStatus.isSlowConnection) {
    return null;
  }

  const getStatusInfo = () => {
    if (!networkStatus.isOnline) {
      return {
        icon: <WifiOff className="w-4 h-4" aria-hidden="true" />,
        message: 'You\'re offline',
        submessage: 'Showing downloaded content only',
        bgColor: 'bg-red-500/10 border-red-500/20',
        textColor: 'text-red-300',
        severity: 'offline' as const
      };
    }
    
    if (networkStatus.isSlowConnection) {
      return {
        icon: <AlertTriangle className="w-4 h-4" aria-hidden="true" />,
        message: 'Slow connection detected',
        submessage: `Connected via ${networkStatus.connectionType.toUpperCase()} - using cached content`,
        bgColor: 'bg-yellow-500/10 border-yellow-500/20',
        textColor: 'text-yellow-300',
        severity: 'slow' as const
      };
    }

    return {
      icon: <Wifi className="w-4 h-4" aria-hidden="true" />,
      message: 'Connected',
      submessage: '',
      bgColor: 'bg-green-500/10 border-green-500/20',
      textColor: 'text-green-300',
      severity: 'online' as const
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-50 ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div 
        className={`
          border-b px-4 py-2 backdrop-blur-sm transition-all duration-300
          ${statusInfo.bgColor} ${statusInfo.textColor}
          ${showBanner ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
        `}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {statusInfo.icon}
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="font-medium text-sm">
                {statusInfo.message}
              </span>
              {statusInfo.submessage && (
                <span className="text-xs opacity-90">
                  {statusInfo.submessage}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!networkStatus.isOnline && lastOnlineTime && (
              <span className="text-xs opacity-75 hidden sm:block">
                Last online: {lastOnlineTime.toLocaleTimeString()}
              </span>
            )}
            
            <button
              onClick={() => setShowBanner(false)}
              className="text-xs hover:opacity-75 transition-opacity p-1"
              aria-label="Dismiss network status notification"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineIndicator;