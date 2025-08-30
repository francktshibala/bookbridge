'use client';

import React, { useState, useEffect } from 'react';
import { RotateCw, CheckCircle, AlertCircle, Clock, Pause } from 'lucide-react';

interface SyncStatus {
  status: 'syncing' | 'synced' | 'pending' | 'error' | 'paused';
  lastSyncTime?: Date;
  pendingChanges?: number;
  errorMessage?: string;
  syncProgress?: number; // 0-100
}

interface SyncStatusIndicatorProps {
  syncStatus: SyncStatus;
  variant?: 'minimal' | 'detailed';
  className?: string;
  onRetry?: () => void;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  syncStatus,
  variant = 'minimal',
  className = '',
  onRetry
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getSyncInfo = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return {
          icon: <RotateCw className="w-3 h-3 animate-spin" aria-hidden="true" />,
          text: 'Syncing...',
          bgColor: 'bg-blue-500/20 border-blue-500/30',
          textColor: 'text-blue-300',
          showProgress: true
        };
      
      case 'synced':
        return {
          icon: <CheckCircle className="w-3 h-3" aria-hidden="true" />,
          text: 'Synced',
          bgColor: 'bg-green-500/20 border-green-500/30',
          textColor: 'text-green-300',
          showProgress: false
        };
      
      case 'pending':
        return {
          icon: <Clock className="w-3 h-3" aria-hidden="true" />,
          text: `${syncStatus.pendingChanges || 0} pending`,
          bgColor: 'bg-yellow-500/20 border-yellow-500/30',
          textColor: 'text-yellow-300',
          showProgress: false
        };
      
      case 'error':
        return {
          icon: <AlertCircle className="w-3 h-3" aria-hidden="true" />,
          text: 'Sync Error',
          bgColor: 'bg-red-500/20 border-red-500/30',
          textColor: 'text-red-300',
          showProgress: false
        };
      
      case 'paused':
        return {
          icon: <Pause className="w-3 h-3" aria-hidden="true" />,
          text: 'Sync Paused',
          bgColor: 'bg-gray-500/20 border-gray-500/30',
          textColor: 'text-gray-300',
          showProgress: false
        };
      
      default:
        return {
          icon: <Clock className="w-3 h-3" aria-hidden="true" />,
          text: 'Unknown',
          bgColor: 'bg-gray-500/20 border-gray-500/30',
          textColor: 'text-gray-300',
          showProgress: false
        };
    }
  };

  const syncInfo = getSyncInfo();

  if (variant === 'minimal') {
    return (
      <button
        onClick={() => syncStatus.status === 'error' && onRetry ? onRetry() : setShowDetails(!showDetails)}
        className={`
          inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs
          border ${syncInfo.bgColor} ${syncInfo.textColor} ${className}
          transition-all duration-200 hover:opacity-80
          ${syncStatus.status === 'error' && onRetry ? 'cursor-pointer' : 'cursor-default'}
        `}
        role="status"
        aria-label={`Sync status: ${syncInfo.text}`}
        title={syncStatus.lastSyncTime ? `Last sync: ${syncStatus.lastSyncTime.toLocaleString()}` : syncInfo.text}
      >
        {syncInfo.icon}
        <span>{syncInfo.text}</span>
        
        {syncInfo.showProgress && syncStatus.syncProgress !== undefined && (
          <span className="text-xs opacity-75">
            {syncStatus.syncProgress}%
          </span>
        )}
      </button>
    );
  }

  return (
    <div 
      className={`p-3 rounded-lg border ${syncInfo.bgColor} ${syncInfo.textColor} ${className}`}
      role="status"
      aria-label={`Sync status: ${syncInfo.text}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {syncInfo.icon}
          <span className="font-medium text-sm">{syncInfo.text}</span>
        </div>
        
        {syncStatus.status === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="text-xs hover:opacity-75 transition-opacity px-2 py-1 rounded border border-current"
          >
            Retry
          </button>
        )}
      </div>
      
      {syncInfo.showProgress && syncStatus.syncProgress !== undefined && (
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs opacity-80">Progress</span>
            <span className="text-xs opacity-80">{syncStatus.syncProgress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${syncStatus.syncProgress}%` }}
            />
          </div>
        </div>
      )}
      
      {syncStatus.pendingChanges !== undefined && syncStatus.pendingChanges > 0 && (
        <div className="text-xs opacity-80 mb-1">
          {syncStatus.pendingChanges} changes waiting to sync
        </div>
      )}
      
      {syncStatus.errorMessage && (
        <div className="text-xs opacity-80 mb-1">
          Error: {syncStatus.errorMessage}
        </div>
      )}
      
      {syncStatus.lastSyncTime && (
        <div className="text-xs opacity-80">
          Last sync: {syncStatus.lastSyncTime.toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;