'use client';

import { useState, useEffect, useCallback } from 'react';

export interface NetworkInfo {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface NetworkStatusHook {
  networkInfo: NetworkInfo;
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  refreshNetworkStatus: () => void;
}

export const useNetworkStatus = (): NetworkStatusHook => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    isOnline: true,
    isSlowConnection: false,
    connectionType: 'unknown'
  });

  const getConnectionInfo = useCallback((): NetworkInfo => {
    const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;

    const info: NetworkInfo = {
      isOnline: navigator.onLine,
      isSlowConnection: false,
      connectionType: 'unknown'
    };

    if (connection) {
      info.effectiveType = connection.effectiveType;
      info.connectionType = connection.effectiveType || connection.type || 'unknown';
      info.downlink = connection.downlink;
      info.rtt = connection.rtt;
      info.saveData = connection.saveData;
      
      // Determine if connection is slow
      info.isSlowConnection = ['slow-2g', '2g'].includes(connection.effectiveType) ||
                             (connection.downlink && connection.downlink < 0.5) ||
                             (connection.rtt && connection.rtt > 1000);
    }

    return info;
  }, []);

  const refreshNetworkStatus = useCallback(() => {
    const info = getConnectionInfo();
    setNetworkInfo(info);
    
    // Announce status change to screen readers
    const announcement = info.isOnline 
      ? (info.isSlowConnection ? 'Slow internet connection detected' : 'Internet connection restored')
      : 'Internet connection lost - working offline';
    
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
      liveRegion.textContent = announcement;
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }, [getConnectionInfo]);

  useEffect(() => {
    // Initial status check
    refreshNetworkStatus();

    // Listen for online/offline events
    const handleOnline = () => refreshNetworkStatus();
    const handleOffline = () => refreshNetworkStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes if supported
    const connection = (navigator as any).connection;
    if (connection && connection.addEventListener) {
      connection.addEventListener('change', refreshNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection && connection.removeEventListener) {
        connection.removeEventListener('change', refreshNetworkStatus);
      }
    };
  }, [refreshNetworkStatus]);

  return {
    networkInfo,
    isOnline: networkInfo.isOnline,
    isSlowConnection: networkInfo.isSlowConnection,
    connectionType: networkInfo.connectionType,
    refreshNetworkStatus
  };
};

export default useNetworkStatus;