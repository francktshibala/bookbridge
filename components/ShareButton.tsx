'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  files?: File[];
  className?: string;
  children?: React.ReactNode;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ 
  title, 
  text, 
  url, 
  files,
  className = '',
  children 
}) => {
  const [isSharing, setIsSharing] = React.useState(false);
  const [shareStatus, setShareStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [canShare, setCanShare] = React.useState(false);

  React.useEffect(() => {
    // Check if Web Share API is available
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  const handleShare = async () => {
    setIsSharing(true);
    setShareStatus('idle');

    try {
      // Check if we're in Capacitor environment
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        
        // Capacitor share
        await Share.share({
          title,
          text: text || '',
          url: url || window.location.href,
          dialogTitle: 'Share with...',
        });
        
        setShareStatus('success');
        console.log('📤 Shared via Capacitor');
      } else if (typeof navigator !== 'undefined' && navigator.share) {
        // Web Share API
        const shareData: ShareData = {
          title,
          text,
          url: url || window.location.href,
        };
        
        if (files && files.length > 0) {
          shareData.files = files;
        }
        
        await navigator.share(shareData);
        setShareStatus('success');
        console.log('📤 Shared via Web Share API');
      } else {
        // Fallback: Copy to clipboard
        const shareText = `${title}${text ? `\n${text}` : ''}${url ? `\n${url}` : ''}`;
        await navigator.clipboard.writeText(shareText);
        setShareStatus('success');
        console.log('📋 Copied to clipboard as fallback');
        
        // Show temporary notification
        setTimeout(() => {
          setShareStatus('idle');
        }, 2000);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        // User cancelled share
        console.log('Share cancelled');
      } else {
        console.error('Share failed:', error);
        setShareStatus('error');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const defaultContent = (
    <>
      <svg 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
      <span className="ml-2">Share</span>
    </>
  );

  return (
    <motion.button
      onClick={handleShare}
      disabled={isSharing}
      className={`
        inline-flex items-center justify-center px-4 py-2 
        bg-blue-600 hover:bg-blue-700 text-white rounded-lg
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${className}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {isSharing ? (
        <span className="inline-flex items-center">
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Sharing...
        </span>
      ) : shareStatus === 'success' ? (
        <span className="inline-flex items-center">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path 
              fillRule="evenodd" 
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
              clipRule="evenodd" 
            />
          </svg>
          {canShare ? 'Shared!' : 'Copied!'}
        </span>
      ) : (
        children || defaultContent
      )}
    </motion.button>
  );
};