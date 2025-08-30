'use client';

import React from 'react';
import { Download, Wifi, Clock, CheckCircle } from 'lucide-react';

export interface ContentAvailability {
  isDownloaded: boolean;
  isPartiallyDownloaded?: boolean;
  downloadProgress?: number; // 0-100
  downloadSize?: string;
  lastUpdated?: Date;
  audioQuality?: 'low' | 'medium' | 'high' | 'hd';
  requiresNetwork?: boolean;
}

interface ContentAvailabilityBadgeProps {
  availability: ContentAvailability;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export const ContentAvailabilityBadge: React.FC<ContentAvailabilityBadgeProps> = ({
  availability,
  variant = 'default',
  className = ''
}) => {
  const getBadgeInfo = () => {
    if (availability.isDownloaded) {
      return {
        icon: <CheckCircle className="w-3 h-3" aria-hidden="true" />,
        text: variant === 'compact' ? 'Offline' : 'Available Offline',
        bgColor: 'bg-green-500/20 border-green-500/30',
        textColor: 'text-green-300',
        status: 'downloaded' as const
      };
    }

    if (availability.isPartiallyDownloaded && availability.downloadProgress) {
      return {
        icon: <Download className="w-3 h-3" aria-hidden="true" />,
        text: variant === 'compact' ? `${availability.downloadProgress}%` : `Downloading ${availability.downloadProgress}%`,
        bgColor: 'bg-blue-500/20 border-blue-500/30',
        textColor: 'text-blue-300',
        status: 'downloading' as const
      };
    }

    if (availability.requiresNetwork === false) {
      return {
        icon: <Clock className="w-3 h-3" aria-hidden="true" />,
        text: variant === 'compact' ? 'Cached' : 'Recently Cached',
        bgColor: 'bg-yellow-500/20 border-yellow-500/30',
        textColor: 'text-yellow-300',
        status: 'cached' as const
      };
    }

    return {
      icon: <Wifi className="w-3 h-3" aria-hidden="true" />,
      text: variant === 'compact' ? 'Online' : 'Requires Connection',
      bgColor: 'bg-slate-500/20 border-slate-500/30',
      textColor: 'text-slate-300',
      status: 'online-only' as const
    };
  };

  const badgeInfo = getBadgeInfo();

  const getQualityText = () => {
    if (!availability.audioQuality) return '';
    
    const qualityMap = {
      low: '32kbps',
      medium: '64kbps', 
      high: '128kbps',
      hd: '192kbps+'
    };
    
    return qualityMap[availability.audioQuality];
  };

  if (variant === 'compact') {
    return (
      <span 
        className={`
          inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs 
          border ${badgeInfo.bgColor} ${badgeInfo.textColor} ${className}
        `}
        title={`Content status: ${badgeInfo.text}`}
        role="status"
        aria-label={`Content status: ${badgeInfo.text}`}
      >
        {badgeInfo.icon}
        <span>{badgeInfo.text}</span>
      </span>
    );
  }

  if (variant === 'detailed') {
    return (
      <div 
        className={`
          p-3 rounded-lg border ${badgeInfo.bgColor} ${badgeInfo.textColor} ${className}
        `}
        role="status"
        aria-label={`Content availability: ${badgeInfo.text}`}
      >
        <div className="flex items-center gap-2 mb-2">
          {badgeInfo.icon}
          <span className="font-medium text-sm">{badgeInfo.text}</span>
        </div>
        
        {availability.downloadSize && (
          <div className="text-xs opacity-80 mb-1">
            Size: {availability.downloadSize}
          </div>
        )}
        
        {availability.audioQuality && (
          <div className="text-xs opacity-80 mb-1">
            Quality: {getQualityText()}
          </div>
        )}
        
        {availability.lastUpdated && (
          <div className="text-xs opacity-80">
            Updated: {availability.lastUpdated.toLocaleDateString()}
          </div>
        )}
        
        {availability.isPartiallyDownloaded && availability.downloadProgress && (
          <div className="mt-2">
            <div className="w-full bg-slate-700 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${availability.downloadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm 
        border ${badgeInfo.bgColor} ${badgeInfo.textColor} ${className}
      `}
      role="status"
      aria-label={`Content availability: ${badgeInfo.text}`}
    >
      {badgeInfo.icon}
      <span>{badgeInfo.text}</span>
      
      {availability.audioQuality && variant === 'default' && (
        <span className="text-xs opacity-75">
          ({getQualityText()})
        </span>
      )}
    </div>
  );
};

export default ContentAvailabilityBadge;